/* HSE Marine Dashboard — script.js v3.0 SECURE */
/* ✅ Password DIHAPUS dari sini — login via server (Code.gs) */
/* ✅ Setiap request data bawa token dari server              */
/* ✅ Token expired otomatis 8 jam                           */
/* ✅ Rate limiting: kunci setelah 5x salah                  */

// ============================================================
// ⚠️  GANTI URL INI DENGAN URL GOOGLE APPS SCRIPT ANDA
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbx3pYfV1hZw9zHy8L5LOPKQIJ5aAjJ6LQtPkuIjQnkl9onO61Ci6Xv2Mrknazb776JGJg/exec";

// ============================================================
// 🗄️  IndexedDB
// ============================================================
const IDB_NAME    = "ppn_ih_db";
const IDB_VERSION = 2;
let   idb         = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    if (idb) { resolve(idb); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pedoman"))     db.createObjectStore("pedoman",     { keyPath: "id" });
      if (!db.objectStoreNames.contains("dokumentasi")) db.createObjectStore("dokumentasi", { keyPath: "id" });
    };
    req.onsuccess = (e) => { idb = e.target.result; resolve(idb); };
    req.onerror   = (e) => reject(e.target.error);
  });
}
async function idbGetAll(store) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}
async function idbPut(store, obj) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function idbDelete(store, id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ============================================================
// 🔐 AUTH — Token disimpan di sessionStorage (hilang saat tab ditutup)
// ============================================================
function getToken()              { return sessionStorage.getItem("ppn_token"); }
function getSession()            { const s = sessionStorage.getItem("ppn_user"); return s ? JSON.parse(s) : null; }
function saveSession(data, token) {
  sessionStorage.setItem("ppn_token", token);
  sessionStorage.setItem("ppn_user",  JSON.stringify({ displayName: data.displayName, role: data.role }));
  sessionStorage.setItem("ppn_login_time", Date.now().toString());
}
function clearSession() {
  sessionStorage.removeItem("ppn_token");
  sessionStorage.removeItem("ppn_user");
  sessionStorage.removeItem("ppn_login_time");
}

// Cek apakah sesi masih valid (maks 8 jam)
function isSessionValid() {
  const token     = getToken();
  const loginTime = parseInt(sessionStorage.getItem("ppn_login_time") || "0");
  if (!token) return false;
  if (Date.now() - loginTime > 8 * 60 * 60 * 1000) {
    clearSession();
    return false;
  }
  return true;
}

function checkAuth() {
  if (isSessionValid()) {
    const user = getSession();
    document.getElementById("loginOverlay").classList.add("hidden");
    document.getElementById("sidebarUsername").textContent = user ? user.displayName : "User";
  } else {
    clearSession();
    document.getElementById("loginOverlay").classList.remove("hidden");
  }
}

// ============================================================
// 🔐 LOGIN — kirim ke server, terima token
// ============================================================
let loginAttempts = 0;
let loginLockedUntil = 0;

async function doLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn      = document.getElementById("btnLogin");

  // Cek rate limiting lokal (cadangan)
  if (Date.now() < loginLockedUntil) {
    const sisa = Math.ceil((loginLockedUntil - Date.now()) / 60000);
    showLoginError("Terlalu banyak percobaan. Tunggu " + sisa + " menit.");
    return;
  }

  if (!username || !password) { showLoginError("Username dan password tidak boleh kosong."); return; }

  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memverifikasi...';
  btn.disabled  = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password })
    });
    const data = await res.json();

    if (data.status === "ok") {
      // Login berhasil
      loginAttempts = 0;
      saveSession(data, data.token);
      document.getElementById("loginError").style.display = "none";
      document.getElementById("loginOverlay").classList.add("hidden");
      document.getElementById("sidebarUsername").textContent = data.displayName;
      btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Masuk';
      btn.disabled  = false;
      loadData();

    } else if (data.status === "locked") {
      loginLockedUntil = Date.now() + 15 * 60 * 1000;
      showLoginError(data.message || "Akun dikunci sementara.");
      shakeCard();

    } else {
      // Login gagal
      loginAttempts++;
      if (loginAttempts >= 5) loginLockedUntil = Date.now() + 15 * 60 * 1000;
      showLoginError(data.message || "Username atau password salah.");
      shakeCard();
    }

  } catch (err) {
    showLoginError("Tidak dapat terhubung ke server. Periksa koneksi internet.");
  }

  btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Masuk';
  btn.disabled  = false;
}

function shakeCard() {
  const card = document.querySelector(".login-card");
  card.style.animation = "shake .4s ease";
  setTimeout(() => { card.style.animation = ""; }, 400);
}

// ============================================================
// 🚪 LOGOUT — beritahu server & hapus sesi lokal
// ============================================================
async function doLogout() {
  if (!confirm("Yakin ingin logout?")) return;
  const token = getToken();
  // Beritahu server untuk hapus token (best-effort, tidak perlu tunggu)
  if (token) {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", token })
    }).catch(() => {});
  }
  clearSession();
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").style.display = "none";
  document.getElementById("loginOverlay").classList.remove("hidden");
}

function showLoginError(msg) {
  document.getElementById("loginErrorMsg").textContent = msg;
  document.getElementById("loginError").style.display = "flex";
}

function togglePassword() {
  const input = document.getElementById("loginPassword");
  const icon  = document.getElementById("togglePwIcon");
  if (input.type === "password") { input.type = "text"; icon.className = "fas fa-eye-slash"; }
  else { input.type = "password"; icon.className = "fas fa-eye"; }
}

// ============================================================
const TOTAL_KAPAL = 85;
const BULAN_ORDER = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

let rawHRA = [], rawDAT = [], rawPest = [];
let filteredHRA = [], filteredDAT = [], filteredPest = [];
let hraBarChart, hraDonutChart, datBarChart, datDonutChart;
let pestBarChart, pestDonutChart, pestTemuanChart, pestBiayaChart;
let hraSortCol = -1, hraSortDir = 1, datSortCol = -1, datSortDir = 1, pestSortCol = -1, pestSortDir = 1;
let hraChartType = 'bar', datChartType = 'bar', pestChartType = 'bar';

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  ["loginUsername","loginPassword"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") doLogin();
    });
  });

  checkAuth();
  setupNav();
  setupSidebar();
  openIDB();

  if (isSessionValid()) {
    loadData();
    setInterval(() => {
      // Auto-cek sesi tiap 5 menit
      if (!isSessionValid()) {
        alert("Sesi Anda telah habis (8 jam). Silakan login kembali.");
        clearSession();
        document.getElementById("loginOverlay").classList.remove("hidden");
        return;
      }
      loadData();
    }, 300000);
  }

  document.getElementById("btnRefresh").addEventListener("click", () => {
    if (isSessionValid()) loadData();
    else alert("Sesi habis. Silakan login kembali.");
  });

  document.querySelectorAll('.nav-item[data-menu="menu6"]').forEach(item => {
    item.addEventListener("click", () => setTimeout(renderPedomanList, 80));
  });
  document.querySelectorAll('.nav-item[data-menu="dokumentasi"]').forEach(item => {
    item.addEventListener("click", () => setTimeout(renderDokGallery, 80));
  });
});

// ====== NAV ======
function setupNav() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const menu  = item.dataset.menu;
      const title = item.dataset.title || menu;
      document.querySelectorAll(".page-content").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      const page = document.getElementById("page-" + menu);
      if (page) page.classList.add("active");
      item.classList.add("active");
      document.getElementById("pageTitle").textContent = title;
      closeSidebar();
    });
  });
}

function setupSidebar() {
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  overlay.id = "sidebarOverlay";
  overlay.addEventListener("click", closeSidebar);
  document.body.appendChild(overlay);
  document.getElementById("sidebarToggle").addEventListener("click", () => {
    const open = document.getElementById("sidebar").classList.toggle("open");
    overlay.classList.toggle("show", open);
  });
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
}

// ====== DATA LOAD — dengan token ======
async function loadData() {
  if (!isSessionValid()) {
    showError("Sesi habis. Silakan login kembali.");
    document.getElementById("loginOverlay").classList.remove("hidden");
    return;
  }
  showLoading(true); hideError();
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getData", sheet: "all", token: getToken() })
    });
    const data = await res.json();

    if (data.status === "unauthorized") {
      clearSession();
      showError("Sesi habis atau tidak valid. Silakan login kembali.");
      document.getElementById("loginOverlay").classList.remove("hidden");
      showLoading(false);
      return;
    }
    if (data.status !== "ok") throw new Error(data.message || "Error dari server");

    rawHRA  = data.hra  || [];
    rawDAT  = data.dat  || [];
    rawPest = data.pest || [];
    filteredHRA  = [...rawHRA];
    filteredDAT  = [...rawDAT];
    filteredPest = [...rawPest];
    const now = new Date();
    document.getElementById("lastUpdated").textContent =
      "Update: " + now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" });

  } catch(err) {
    console.error("API Error:", err);
    showError("Gagal memuat data: " + err.message);
    rawHRA=[]; rawDAT=[]; rawPest=[];
    filteredHRA=[]; filteredDAT=[]; filteredPest=[];
    document.getElementById("lastUpdated").textContent = "Gagal terhubung";
  }
  renderHRAPage();
  renderDATPage();
  renderPestPage();
  showLoading(false);
}

function showLoading(v) { document.getElementById("loadingOverlay").style.display = v ? "flex" : "none"; }
function showError(msg) { document.getElementById("errorBanner").style.display="flex"; document.getElementById("errorMsg").textContent=msg; }
function hideError() { document.getElementById("errorBanner").style.display="none"; }

// ====================================================
// HRA PAGE
// ====================================================
function renderHRAPage() {
  const data     = filteredHRA;
  const done     = new Set(data.filter(r=>(r["Status"]||"").toLowerCase()==="done").map(r=>r["Nama Kapal"])).size;
  const belum    = TOTAL_KAPAL - done;
  const budget   = data.reduce((s,r)=>s+parseFloat(r["Est Budget"]||0),0);
  const coverage = ((done/TOTAL_KAPAL)*100).toFixed(1);

  document.getElementById("hra-done").textContent     = done;
  document.getElementById("hra-belum").textContent    = belum;
  document.getElementById("hra-budget").textContent   = formatRupiah(budget);
  document.getElementById("hra-coverage").textContent = coverage + "%";

  renderHRABarChart(data);
  renderHRADonutChart(data);
  renderHRAHazard();
  renderHRATable(data);
}

function renderHRABarChart(data) {
  const counts = {};
  BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&counts[b]!==undefined)counts[b]++;});
  const ctx = document.getElementById("hraBarChart").getContext("2d");
  if (hraBarChart) hraBarChart.destroy();
  hraBarChart = new Chart(ctx, {
    type:hraChartType,
    data:{labels:BULAN_ORDER,datasets:[{label:"Monitoring",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:hraChartType==='line'?'rgba(21,101,192,0.12)':'#1976D2',borderColor:'#1565C0',borderWidth:hraChartType==='line'?2.5:1,borderRadius:hraChartType==='bar'?6:0,fill:hraChartType==='line',tension:0.4,pointBackgroundColor:'#1565C0',pointRadius:hraChartType==='line'?4:0}]},
    options:chartOpts()
  });
}

function renderHRADonutChart(data) {
  const fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
  data.forEach(r=>{const f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
  const ctx = document.getElementById("hraDonutChart").getContext("2d");
  if (hraDonutChart) hraDonutChart.destroy();
  hraDonutChart = new Chart(ctx,{type:"doughnut",data:{labels:Object.keys(fleets),datasets:[{data:Object.values(fleets),backgroundColor:['#1976D2','#43A047','#FB8C00','#8E24AA'],borderColor:'#fff',borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}

function toggleHRAChartType(btn,type){hraChartType=type;btn.closest('.pill-group').querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));btn.classList.add('active');renderHRABarChart(filteredHRA);}

function renderHRAHazard() {
  const bulan=document.getElementById("hra-hazard-bulan").value;
  const data=bulan?rawHRA.filter(r=>r["Bulan Pelaksanaan"]===bulan):rawHRA;
  const counts={};
  data.forEach(r=>{const h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(x=>x.trim()).filter(Boolean).forEach(hz=>{counts[hz]=(counts[hz]||0)+1;});});
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const el=document.getElementById("hazardList");
  if(!sorted.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada data hazard</div>';return;}
  el.innerHTML=sorted.map(([name,count],i)=>`<div class="hazard-item"><div class="hazard-rank r${i+1}">${i+1}</div><div class="hazard-name">${esc(name)}</div><div class="hazard-count">${count}x</div></div>`).join("");
}

function renderHRATable(data) {
  document.getElementById("hraTableBody").innerHTML=data.map(r=>`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"")}</td><td>${statusBadge(r["Status"])}</td><td style="font-weight:700">Rp ${fmtNum(parseFloat(r["Est Budget"]||0))}</td></tr>`).join("");
  document.getElementById("hraTableFooter").textContent=`Menampilkan ${data.length} dari ${rawHRA.length} entri kapal`;
}

function applyHRAFilters(){const b=document.getElementById("hra-filter-bulan").value;const f=document.getElementById("hra-filter-fleet").value;const k=document.getElementById("hra-filter-kapal").value.toLowerCase();filteredHRA=rawHRA.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderHRAPage();}
function clearHRAFilters(){["hra-filter-bulan","hra-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("hra-filter-kapal").value="";filteredHRA=[...rawHRA];renderHRAPage();}
function searchHRATable(){const q=document.getElementById("hra-search").value.toLowerCase();document.querySelectorAll("#hraTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortHRATable(col){if(hraSortCol===col)hraSortDir*=-1;else{hraSortCol=col;hraSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Status","Est Budget"];filteredHRA.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*hraSortDir);renderHRATable(filteredHRA);}

// ====================================================
// DAT PAGE
// ====================================================
function renderDATPage() {
  const data     = filteredDAT;
  const done     = new Set(data.map(r=>r["Nama Kapal"])).size;
  const belum    = TOTAL_KAPAL - done;
  const crew     = data.reduce((s,r)=>s+parseInt(r["Total Crew Diperiksa"]||0),0);
  const pos      = data.reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);
  const biaya    = data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);
  const coverage = ((done/TOTAL_KAPAL)*100).toFixed(1);

  document.getElementById("dat-done").textContent     = done;
  document.getElementById("dat-belum").textContent    = belum;
  document.getElementById("dat-crew").textContent     = fmtNum(crew);
  document.getElementById("dat-positif").textContent  = pos;
  document.getElementById("dat-biaya").textContent    = formatRupiah(biaya);
  document.getElementById("dat-coverage").textContent = coverage + "%";

  renderDATBarChart(data);
  renderDATDonutChart(data, crew, pos);
  renderDATTindakLanjut(data);
  renderDATTable(data);
}

function renderDATBarChart(data){const crews={};BULAN_ORDER.forEach(b=>crews[b]=0);data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&crews[b]!==undefined)crews[b]+=parseInt(r["Total Crew Diperiksa"]||0);});const ctx=document.getElementById("datBarChart").getContext("2d");if(datBarChart)datBarChart.destroy();datBarChart=new Chart(ctx,{type:datChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Crew Diperiksa",data:BULAN_ORDER.map(b=>crews[b]),backgroundColor:datChartType==='line'?'rgba(46,125,50,0.12)':'#43A047',borderColor:'#2E7D32',borderWidth:datChartType==='line'?2.5:1,borderRadius:datChartType==='bar'?6:0,fill:datChartType==='line',tension:0.4,pointBackgroundColor:'#2E7D32',pointRadius:datChartType==='line'?4:0}]},options:chartOpts()});}

function renderDATDonutChart(data,crew,pos){const neg=crew-pos;const ctx=document.getElementById("datDonutChart").getContext("2d");if(datDonutChart)datDonutChart.destroy();datDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:["Negatif","Positif"],datasets:[{data:[neg,pos],backgroundColor:['#43A047','#E53935'],borderColor:'#fff',borderWidth:3,hoverOffset:8}]},options:donutOpts()});}

function toggleDATChartType(btn,type){datChartType=type;btn.closest('.pill-group').querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));btn.classList.add('active');renderDATBarChart(filteredDAT);}

function renderDATTindakLanjut(data){const diturunkan=data.filter(r=>(r["Tindak Lanjut"]||"").toLowerCase().includes("turun")).reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);const total_tl=data.filter(r=>r["Tindak Lanjut"]).length;document.getElementById("datTindakLanjut").innerHTML=`<div class="stat-row"><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-arrow-down-from-line" style="color:#C62828;margin-right:5px"></i>Crew Diturunkan</div><div class="stat-label">Hasil positif ditindaklanjuti</div></div><div class="stat-val">${diturunkan}</div></div><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-file-medical" style="color:#E65100;margin-right:5px"></i>Entri Tindak Lanjut</div><div class="stat-label">Kapal dengan tindak lanjut</div></div><div class="stat-val" style="color:#E65100">${total_tl}</div></div></div>`;}

function renderDATTable(data){document.getElementById("datTableBody").innerHTML=data.map(r=>{const h=(r["Hasil"]||"").toLowerCase();const badge=h==="negatif"?'<span class="badge badge-neg">Negatif</span>':h==="positif"?'<span class="badge badge-pos">Positif</span>':esc(r["Hasil"]||"—");return`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"—")}</td><td style="text-align:right;font-weight:700">${fmtNum(parseInt(r["Total Crew Diperiksa"]||0))}</td><td>${badge}</td><td style="text-align:right;font-weight:700;color:#C62828">${r["Jumlah Crew Positif"]||0}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r["Tindak Lanjut"]||"—")}</td></tr>`;}).join("");document.getElementById("datTableFooter").textContent=`Menampilkan ${data.length} dari ${rawDAT.length} entri`;}

function applyDATFilters(){const b=document.getElementById("dat-filter-bulan").value;const f=document.getElementById("dat-filter-fleet").value;const k=document.getElementById("dat-filter-kapal").value.toLowerCase();filteredDAT=rawDAT.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderDATPage();}
function clearDATFilters(){["dat-filter-bulan","dat-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("dat-filter-kapal").value="";filteredDAT=[...rawDAT];renderDATPage();}
function searchDATTable(){const q=document.getElementById("dat-search").value.toLowerCase();document.querySelectorAll("#datTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortDATTable(col){if(datSortCol===col)datSortDir*=-1;else{datSortCol=col;datSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Hasil","Jumlah Crew Positif","Tindak Lanjut"];filteredDAT.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*datSortDir);renderDATTable(filteredDAT);}

// ====================================================
// PEST & RODENT PAGE
// ====================================================
function getPestTanggalDisplay(r){return r["Tanggal"]||r["Tanggal Pelaksanaan"]||r["Date"]||"";}
function getPestTL(r){return r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||r["Tindak Lanjut dan Rekomendasi"]||"";}

function renderPestPage() {
  const data            = filteredPest;
  const totalPelaksanaan= data.length;
  const lokSet          = new Set(data.map(r=>(r["Lokasi"]||"").trim()).filter(Boolean));
  const totalBiaya      = data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);
  const temuanAll       = data.map(r=>(r["Temuan / Keluhan"]||"").trim()).filter(Boolean);
  const hamaMap         = {};
  temuanAll.forEach(t=>{const low=t.toLowerCase();["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(h=>{if(low.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;});});
  const hamaDominan = Object.entries(hamaMap).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById("pest-total").textContent        = fmtNum(totalPelaksanaan);
  document.getElementById("pest-lokasi").textContent       = fmtNum(lokSet.size);
  document.getElementById("pest-temuan").textContent       = fmtNum(temuanAll.length);
  document.getElementById("pest-hama-dominan").textContent = hamaDominan?hamaDominan[0].charAt(0).toUpperCase()+hamaDominan[0].slice(1):"—";
  document.getElementById("pest-biaya").textContent        = formatRupiah(totalBiaya);

  const lokasiSel  = document.getElementById("pest-filter-lokasi");
  const currentLok = lokasiSel.value;
  const uniqueLok  = [...lokSet].sort();
  lokasiSel.innerHTML = '<option value="">Semua Lokasi</option>'+uniqueLok.map(l=>`<option${l===currentLok?' selected':''}>${esc(l)}</option>`).join("");

  renderPestBarChart(data);
  renderPestDonutChart(data);
  renderPestTemuanChart(data);
  renderPestBiayaChart(data);
  renderPestTindakLanjut(data);
  renderPestTable(data);
}

function renderPestBarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("pestBarChart").getContext("2d");if(pestBarChart)pestBarChart.destroy();const colors=BULAN_ORDER.map((_,i)=>`hsl(${210+i*5},70%,${50+i*1.5}%)`);pestBarChart=new Chart(ctx,{type:pestChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Pelaksanaan",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:pestChartType==='line'?'rgba(21,101,192,0.12)':colors,borderColor:'#1565C0',borderWidth:pestChartType==='line'?2.5:1,borderRadius:pestChartType==='bar'?6:0,fill:pestChartType==='line',tension:0.4,pointBackgroundColor:'#1565C0',pointRadius:pestChartType==='line'?4:0}]},options:chartOpts()});}

function renderPestDonutChart(data){const lokMap={};data.forEach(r=>{const l=(r["Lokasi"]||"").trim();if(l)lokMap[l]=(lokMap[l]||0)+1;});const sorted=Object.entries(lokMap).sort((a,b)=>b[1]-a[1]).slice(0,8);const ctx=document.getElementById("pestDonutChart").getContext("2d");if(pestDonutChart)pestDonutChart.destroy();const palette=['#1976D2','#43A047','#FB8C00','#8E24AA','#00838F','#E53935','#F9A825','#5E35B1'];pestDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:sorted.map(([k])=>k),datasets:[{data:sorted.map(([,v])=>v),backgroundColor:palette,borderColor:'#fff',borderWidth:3,hoverOffset:8}]},options:donutOpts()});}

function renderPestTemuanChart(data){const tMap={};data.forEach(r=>{const t=(r["Temuan / Keluhan"]||"").trim();if(t)tMap[t]=(tMap[t]||0)+1;});const sorted=Object.entries(tMap).sort((a,b)=>b[1]-a[1]).slice(0,6);const ctx=document.getElementById("pestTemuanChart").getContext("2d");if(pestTemuanChart)pestTemuanChart.destroy();pestTemuanChart=new Chart(ctx,{type:"bar",data:{labels:sorted.map(([k])=>k.length>30?k.slice(0,30)+"…":k),datasets:[{label:"Frekuensi",data:sorted.map(([,v])=>v),backgroundColor:'#8E24AA',borderRadius:6}]},options:{...chartOpts(),indexAxis:'y'}});}

function renderPestBiayaChart(data){const biayaMap={};BULAN_ORDER.forEach(b=>biayaMap[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&biayaMap[b]!==undefined)biayaMap[b]+=parseFloat(r["Est Biaya"]||0);});const ctx=document.getElementById("pestBiayaChart").getContext("2d");if(pestBiayaChart)pestBiayaChart.destroy();pestBiayaChart=new Chart(ctx,{type:"line",data:{labels:BULAN_ORDER,datasets:[{label:"Est. Biaya",data:BULAN_ORDER.map(b=>biayaMap[b]),backgroundColor:'rgba(142,36,170,0.1)',borderColor:'#8E24AA',borderWidth:2.5,fill:true,tension:0.4,pointBackgroundColor:'#8E24AA',pointRadius:4}]},options:chartOpts()});}

function renderPestTindakLanjut(data){const el=document.getElementById("pestTindakLanjutList");const items=data.map(r=>getPestTL(r)).filter(Boolean).slice(0,6);if(!items.length){el.innerHTML='<div class="hazard-empty">Tidak ada data tindak lanjut</div>';return;}el.innerHTML=items.map((t,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name" style="white-space:normal;line-height:1.4">${esc(t.length>80?t.slice(0,80)+"…":t)}</div></div>`).join("");}

function renderPestTable(data){document.getElementById("pestTableBody").innerHTML=data.map(r=>{const biaya=parseFloat(r["Est Biaya"]||0);const tglDisplay=getPestTanggalDisplay(r);const tindakLanjut=getPestTL(r)||"—";const temuan=(r["Temuan / Keluhan"]||r["Temuan"]||r["Keluhan"]||"—").trim();return`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Lokasi"]||"—")}</strong></td><td style="white-space:nowrap;font-weight:600">${esc(tglDisplay)}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${esc(temuan)}">${esc(temuan)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${esc(tindakLanjut)}">${esc(tindakLanjut)}</td><td style="text-align:right;font-weight:700;color:#6A1B9A">${biaya?formatRupiah(biaya):"—"}</td></tr>`;}).join("");document.getElementById("pestTableFooter").textContent=`Menampilkan ${data.length} dari ${rawPest.length} entri`;}

function applyPestFilters(){const b=document.getElementById("pest-filter-bulan").value;const l=document.getElementById("pest-filter-lokasi").value;const t=document.getElementById("pest-filter-temuan").value.toLowerCase();filteredPest=rawPest.filter(r=>(!b||r["Bulan"]===b)&&(!l||r["Lokasi"]===l)&&(!t||(r["Temuan / Keluhan"]||"").toLowerCase().includes(t)));renderPestPage();}
function clearPestFilters(){["pest-filter-bulan","pest-filter-lokasi"].forEach(id=>document.getElementById(id).value="");document.getElementById("pest-filter-temuan").value="";filteredPest=[...rawPest];renderPestPage();}
function searchPestTable(){const q=document.getElementById("pest-search").value.toLowerCase();document.querySelectorAll("#pestTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortPestTable(col){if(pestSortCol===col)pestSortDir*=-1;else{pestSortCol=col;pestSortDir=1;}const keys=["Lokasi","Tanggal","Temuan / Keluhan","Tindak Lanjut","Est Biaya"];filteredPest.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*pestSortDir);renderPestTable(filteredPest);}
function togglePestChartType(btn,type){pestChartType=type;btn.closest('.pill-group').querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));btn.classList.add('active');renderPestBarChart(filteredPest);}

// ====================================================
// CHART HELPERS
// ====================================================
function chartOpts(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1565C0',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.8)',padding:10,cornerRadius:8,displayColors:false}},scales:{x:{grid:{color:'#F0F4F8'},ticks:{color:'#90A4AE',font:{size:11,family:'Nunito'}}},y:{grid:{color:'#F0F4F8'},ticks:{color:'#90A4AE',font:{size:11,family:'Nunito'}},beginAtZero:true}}};}
function donutOpts(){return{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#607D8B',font:{size:12,family:'Nunito',weight:'700'},padding:14,boxWidth:12}},tooltip:{backgroundColor:'#1565C0',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.8)',padding:10,cornerRadius:8}}};}

// ====================================================
// HELPERS
// ====================================================
function fmtNum(n){return(n||0).toLocaleString("id-ID");}
function formatRupiah(n){if(n>=1e9)return(n/1e9).toFixed(1)+" M";if(n>=1e6)return(n/1e6).toFixed(1)+" Jt";return fmtNum(n);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function statusBadge(s){return(s||"").toLowerCase()==="done"?'<span class="badge badge-done">✓ Done</span>':'<span class="badge badge-belum">⏳ Belum</span>';}

// ====================================================
// PEDOMAN IH — IndexedDB (menggantikan localStorage)
// ====================================================

function handlePdfUpload(event) {
  const files = event.target.files;
  if (!files || !files.length) return;
  const file = files[0];
  if (file.type !== "application/pdf") { alert("Hanya file PDF yang diizinkan."); event.target.value=""; return; }
  if (file.size > 20 * 1024 * 1024) { alert("Ukuran file maksimal 20 MB."); event.target.value=""; return; }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const namaDoc = prompt("Nama dokumen / judul pedoman:", file.name.replace(".pdf",""));
    if (!namaDoc) { event.target.value=""; return; }
    const kategori = prompt("Kategori (Pedoman Umum / STK / Regulasi / Formulir / TKO):", "Pedoman Umum") || "Lainnya";

    const obj = {
      id:         Date.now(),
      nama:       namaDoc.trim(),
      kategori:   kategori.trim(),
      filename:   file.name,
      size:       file.size,
      uploadDate: new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}),
      data:       e.target.result,
      downloads:  0
    };
    try {
      await idbPut("pedoman", obj);
      event.target.value = "";
      renderPedomanList();
    } catch(err) {
      alert("Gagal menyimpan file. Coba hapus beberapa file lama terlebih dahulu.\n\n" + err);
    }
  };
  reader.readAsDataURL(file);
}

async function viewPedoman(id) {
  const files = await idbGetAll("pedoman");
  const f = files.find(x => x.id === id);
  if (!f) return;

  const existing = document.getElementById("pedomanViewModal");
  if (existing) { const oldI=existing.querySelector("iframe"); if(oldI&&oldI._blobUrl)URL.revokeObjectURL(oldI._blobUrl); existing.remove(); }

  let blobUrl = "";
  try {
    const base64 = f.data.split(",")[1];
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    const blob = new Blob([bytes],{type:"application/pdf"});
    blobUrl = URL.createObjectURL(blob);
  } catch(e) { alert("Gagal membuka file PDF."); return; }

  const modal = document.createElement("div");
  modal.id = "pedomanViewModal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:16px";
  modal.innerHTML = `<div style="background:#fff;border-radius:14px;width:100%;max-width:960px;height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden">
    <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;height:56px;background:var(--sidebar-bg,#1565C0);color:#fff;gap:12px">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden">
        <i class="fas fa-file-pdf" style="font-size:18px;color:#ff6b6b;flex-shrink:0"></i>
        <div style="min-width:0;overflow:hidden">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.nama)}</div>
          <div style="font-size:11px;opacity:.75">${esc(f.kategori)} &nbsp;·&nbsp; ${(f.size/1024/1024).toFixed(1)} MB &nbsp;·&nbsp; ${esc(f.uploadDate)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="downloadPedoman(${f.id})" style="background:rgba(255,255,255,.18);border:none;color:#fff;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;font-family:inherit"><i class="fas fa-download"></i> Download</button>
        <button id="pedomanViewClose" style="background:rgba(255,255,255,.18);border:none;color:#fff;padding:7px 13px;border-radius:8px;cursor:pointer;font-size:15px;font-weight:700;font-family:inherit" title="Tutup"><i class="fas fa-xmark"></i></button>
      </div>
    </div>
    <div style="flex:1;background:#525659;overflow:hidden">
      <iframe src="${blobUrl}" style="width:100%;height:100%;display:block;border:none;" title="${esc(f.nama)}"></iframe>
    </div>
  </div>`;
  const closeModal = () => { URL.revokeObjectURL(blobUrl); modal.remove(); };
  modal.addEventListener("click", ev=>{ if(ev.target===modal)closeModal(); });
  modal.querySelector("#pedomanViewClose").addEventListener("click", closeModal);
  document.body.appendChild(modal);
}

async function downloadPedoman(id) {
  const files = await idbGetAll("pedoman");
  const f = files.find(x => x.id === id);
  if (!f) return;
  f.downloads = (f.downloads||0)+1;
  await idbPut("pedoman", f);
  const link = document.createElement("a");
  link.href = f.data;
  link.download = f.filename || f.nama + ".pdf";
  link.click();
  renderPedomanList();
}

async function deletePedoman(id) {
  if (!confirm("Yakin ingin menghapus file ini?")) return;
  await idbDelete("pedoman", id);
  renderPedomanList();
}

async function renderPedomanList() {
  const q   = (document.getElementById("pedomanSearch")||{}).value||"";
  const kat = (document.getElementById("pedomanFilterKat")||{}).value||"";
  let allFiles = await idbGetAll("pedoman");
  allFiles.sort((a,b)=>b.id-a.id);

  let files = allFiles;
  if (q)   files = files.filter(f=>f.nama.toLowerCase().includes(q.toLowerCase())||f.kategori.toLowerCase().includes(q.toLowerCase()));
  if (kat) files = files.filter(f=>f.kategori===kat);

  const totalDownloads = allFiles.reduce((s,f)=>s+(f.downloads||0),0);
  document.getElementById("pedoman-count").textContent     = allFiles.length;
  document.getElementById("pedoman-downloads").textContent = fmtNum(totalDownloads);
  document.getElementById("pedoman-last").textContent      = allFiles.length ? allFiles[0].uploadDate : "—";

  const grid  = document.getElementById("pedomanGrid");
  const empty = document.getElementById("pedomanEmpty");
  grid.querySelectorAll(".pedoman-card").forEach(c=>c.remove());

  if (!files.length) { if(empty)empty.style.display="flex"; return; }
  if (empty) empty.style.display="none";

  files.forEach(f => {
    const card = document.createElement("div");
    card.className = "pedoman-card";
    card.innerHTML = `
      <div class="pedoman-card-top">
        <div class="pedoman-pdf-icon"><i class="fas fa-file-pdf"></i></div>
        <div class="pedoman-card-info">
          <div class="pedoman-card-name">${esc(f.nama)}</div>
          <span class="pedoman-kat-badge">${esc(f.kategori)}</span>
        </div>
      </div>
      <div class="pedoman-card-meta">
        <span><i class="fas fa-calendar fa-xs"></i> ${f.uploadDate}</span>
        <span><i class="fas fa-weight-hanging fa-xs"></i> ${(f.size/1024/1024).toFixed(1)} MB</span>
        <span><i class="fas fa-download fa-xs"></i> ${f.downloads||0}x</span>
      </div>
      <div class="pedoman-card-actions">
        <button class="btn-pedoman-view" onclick="viewPedoman(${f.id})"><i class="fas fa-eye"></i> View</button>
        <button class="btn-pedoman-dl" onclick="downloadPedoman(${f.id})"><i class="fas fa-download"></i> Download</button>
        <button class="btn-pedoman-del" onclick="deletePedoman(${f.id})" title="Hapus"><i class="fas fa-trash"></i></button>
      </div>`;
    grid.appendChild(card);
  });
}

// EXPORT / IMPORT PEDOMAN
async function exportPedomanBackup() {
  const files = await idbGetAll("pedoman");
  if (!files.length) { alert("Tidak ada file untuk di-export."); return; }
  const json = JSON.stringify({ type:"pedoman_backup", version:1, data:files, exportDate: new Date().toISOString() });
  const blob = new Blob([json], { type:"application/json" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "pedoman_ih_backup_"+Date.now()+".json"; link.click();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
  alert(`Berhasil export ${files.length} file pedoman.\n\nKirimkan file JSON ini ke device lain, lalu gunakan tombol "Import Backup".`);
}

async function importPedomanBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.type !== "pedoman_backup" || !Array.isArray(parsed.data)) { alert("File backup tidak valid."); return; }
      const confirm_import = confirm(`Ditemukan ${parsed.data.length} file pedoman dalam backup.\n\nImport akan MENAMBAHKAN file ke database (tidak menghapus yang sudah ada).\n\nLanjutkan?`);
      if (!confirm_import) { event.target.value=""; return; }
      let count = 0;
      for (const f of parsed.data) {
        // Beri ID baru jika sudah ada konflik
        const existing = await idbGetAll("pedoman");
        const idExists  = existing.some(x=>x.id===f.id);
        if (idExists) f.id = Date.now() + Math.random()*1000|0;
        await idbPut("pedoman", f);
        count++;
      }
      event.target.value="";
      renderPedomanList();
      alert(`Berhasil import ${count} file pedoman!`);
    } catch(err) { alert("Gagal membaca file backup: "+err.message); }
  };
  reader.readAsText(file);
}

// ====================================================
// DOKUMENTASI — Foto per Folder (IndexedDB)
// ====================================================
let currentDokFolder = "hra_ih";
const DOK_FOLDER_LABELS = { hra_ih:"HRA & IH", dat:"DAT", pest_rodent:"Pest & Rodent" };

function switchDokFolder(btn) {
  document.querySelectorAll(".dok-tab").forEach(t=>t.classList.remove("active"));
  btn.classList.add("active");
  currentDokFolder = btn.dataset.folder;
  document.getElementById("dok-folder-name").textContent = DOK_FOLDER_LABELS[currentDokFolder] || currentDokFolder;
  renderDokGallery();
}

async function handleDokUpload(event) {
  const files = event.target.files;
  if (!files || !files.length) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) { alert("Hanya file gambar yang diizinkan: "+file.name); continue; }
    if (file.size > 10 * 1024 * 1024)   { alert("File terlalu besar (maks 10 MB): "+file.name); continue; }

    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async function(e) {
        const keterangan = prompt(`Keterangan untuk foto:\n"${file.name}"\n\n(Boleh dikosongkan)`, "") || "";
        const obj = {
          id:          Date.now() + Math.random()*1000|0,
          folder:      currentDokFolder,
          filename:    file.name,
          size:        file.size,
          keterangan:  keterangan.trim(),
          uploadDate:  new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}),
          uploadTime:  new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}),
          data:        e.target.result
        };
        try { await idbPut("dokumentasi", obj); }
        catch(err) { alert("Gagal menyimpan foto: "+err); }
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }
  event.target.value = "";
  renderDokGallery();
}

async function renderDokGallery() {
  const allFotos = await idbGetAll("dokumentasi");
  const fotos    = allFotos.filter(f=>f.folder===currentDokFolder).sort((a,b)=>b.id-a.id);

  const lastItem = allFotos.filter(f=>f.folder===currentDokFolder).sort((a,b)=>b.id-a.id)[0];
  document.getElementById("dok-count").textContent       = fotos.length;
  document.getElementById("dok-folder-name").textContent = DOK_FOLDER_LABELS[currentDokFolder];
  document.getElementById("dok-last").textContent        = lastItem ? lastItem.uploadDate : "—";

  const grid  = document.getElementById("dokGrid");
  const empty = document.getElementById("dokEmpty");
  grid.querySelectorAll(".dok-card").forEach(c=>c.remove());

  if (!fotos.length) { empty.style.display="flex"; return; }
  empty.style.display = "none";

  fotos.forEach(f => {
    const card = document.createElement("div");
    card.className = "dok-card";
    card.innerHTML = `
      <div class="dok-card-img-wrap" onclick="viewDokFoto(${f.id})">
        <img src="${f.data}" alt="${esc(f.filename)}" class="dok-card-img" loading="lazy">
        <div class="dok-img-overlay"><i class="fas fa-expand"></i></div>
      </div>
      <div class="dok-card-body">
        <div class="dok-card-filename" title="${esc(f.filename)}">${esc(f.filename)}</div>
        <div class="dok-card-keterangan-wrap">
          <textarea class="dok-keterangan-input" id="ket-${f.id}" placeholder="Tambahkan keterangan...">${esc(f.keterangan||"")}</textarea>
          <button class="dok-save-ket" onclick="saveDokKeterangan(${f.id})" title="Simpan keterangan"><i class="fas fa-floppy-disk"></i></button>
        </div>
        <div class="dok-card-meta">
          <span><i class="fas fa-calendar fa-xs"></i> ${f.uploadDate}</span>
          <span><i class="fas fa-weight-hanging fa-xs"></i> ${(f.size/1024/1024).toFixed(1)} MB</span>
        </div>
        <div class="dok-card-actions">
          <button class="btn-pedoman-view" onclick="downloadDokFoto(${f.id})"><i class="fas fa-download"></i> Download</button>
          <button class="btn-pedoman-del"  onclick="deleteDokFoto(${f.id})" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function saveDokKeterangan(id) {
  const el  = document.getElementById("ket-"+id);
  if (!el) return;
  const val = el.value.trim();
  const all = await idbGetAll("dokumentasi");
  const f   = all.find(x=>x.id===id);
  if (!f) return;
  f.keterangan = val;
  await idbPut("dokumentasi", f);
  // Flash visual feedback
  el.style.borderColor = "#43A047";
  setTimeout(()=>{ el.style.borderColor=""; }, 1500);
}

async function viewDokFoto(id) {
  const all = await idbGetAll("dokumentasi");
  const f   = all.find(x=>x.id===id);
  if (!f) return;
  const existing = document.getElementById("dokFotoModal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "dokFotoModal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;flex-direction:column;gap:14px";
  modal.innerHTML = `
    <div style="max-width:90vw;max-height:80vh;position:relative">
      <img src="${f.data}" alt="${esc(f.filename)}" style="max-width:90vw;max-height:80vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.6)">
    </div>
    <div style="text-align:center;color:#fff">
      <div style="font-weight:700;font-size:14px">${esc(f.filename)}</div>
      ${f.keterangan?`<div style="font-size:13px;opacity:.8;margin-top:4px">${esc(f.keterangan)}</div>`:""}
      <div style="font-size:12px;opacity:.6;margin-top:4px">${f.uploadDate} ${f.uploadTime||""}</div>
    </div>
    <button onclick="document.getElementById('dokFotoModal').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:8px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700"><i class="fas fa-xmark"></i> Tutup</button>`;
  modal.addEventListener("click", ev=>{ if(ev.target===modal)modal.remove(); });
  document.body.appendChild(modal);
}

async function downloadDokFoto(id) {
  const all = await idbGetAll("dokumentasi");
  const f   = all.find(x=>x.id===id);
  if (!f) return;
  const link = document.createElement("a");
  link.href = f.data;
  link.download = f.filename;
  link.click();
}

async function deleteDokFoto(id) {
  if (!confirm("Yakin ingin menghapus foto ini?")) return;
  await idbDelete("dokumentasi", id);
  renderDokGallery();
}

// EXPORT / IMPORT DOKUMENTASI
async function exportDokumentasiBackup() {
  const all = await idbGetAll("dokumentasi");
  if (!all.length) { alert("Tidak ada foto untuk di-export."); return; }
  const json = JSON.stringify({ type:"dokumentasi_backup", version:1, data:all, exportDate: new Date().toISOString() });
  const blob = new Blob([json], { type:"application/json" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "dokumentasi_backup_"+Date.now()+".json"; link.click();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
  alert(`Berhasil export ${all.length} foto.\n\nKirimkan file JSON ini ke device lain, lalu gunakan tombol "Import Backup".`);
}

async function importDokumentasiBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.type !== "dokumentasi_backup" || !Array.isArray(parsed.data)) { alert("File backup tidak valid."); return; }
      const ok = confirm(`Ditemukan ${parsed.data.length} foto dalam backup.\n\nImport akan MENAMBAHKAN foto (tidak menghapus yang sudah ada).\n\nLanjutkan?`);
      if (!ok) { event.target.value=""; return; }
      let count = 0;
      for (const f of parsed.data) {
        const existing = await idbGetAll("dokumentasi");
        if (existing.some(x=>x.id===f.id)) f.id = Date.now() + Math.random()*1000|0;
        await idbPut("dokumentasi", f);
        count++;
      }
      event.target.value="";
      renderDokGallery();
      alert(`Berhasil import ${count} foto dokumentasi!`);
    } catch(err) { alert("Gagal membaca file backup: "+err.message); }
  };
  reader.readAsText(file);
}
