/* HSE Marine Dashboard — script.js */

// ============================================================
// ⚠️  GANTI URL INI DENGAN URL GOOGLE APPS SCRIPT ANDA
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzqv37CKDtxFsypoDUqbPBzlWx41fKQo5q-kZ2iIe4f-GMtRVLLd_dXeuW70iTGmXOKeg/exec";
// ============================================================

// ============================================================
// 🔐 AKUN LOGIN — Tambah/ubah user di sini
// Format: { username: "...", password: "...", displayName: "..." }
// ============================================================
const USERS = [
  { username: "ppn3",    password: "ppn2026",   displayName: "IH Admin" },
  { username: "hsse",      password: "hsseppn3",  displayName: "IH Officer"  },
];
// ============================================================

// ====== LOGIN / LOGOUT ======
function checkAuth() {
  const session = sessionStorage.getItem("ppn_user");
  if (session) {
    const user = JSON.parse(session);
    document.getElementById("loginOverlay").classList.add("hidden");
    document.getElementById("sidebarUsername").textContent = user.displayName;
  } else {
    document.getElementById("loginOverlay").classList.remove("hidden");
  }
}

function doLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl    = document.getElementById("loginError");
  const btn      = document.getElementById("btnLogin");

  if (!username || !password) {
    showLoginError("Username dan password tidak boleh kosong.");
    return;
  }

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    showLoginError("Username atau password salah.");
    // Shake animation
    const card = document.querySelector(".login-card");
    card.style.animation = "shake .4s ease";
    setTimeout(() => { card.style.animation = ""; }, 400);
    return;
  }

  // Login sukses
  sessionStorage.setItem("ppn_user", JSON.stringify(user));
  errEl.style.display = "none";
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memuat...';
  btn.disabled = true;

  setTimeout(() => {
    document.getElementById("loginOverlay").classList.add("hidden");
    document.getElementById("sidebarUsername").textContent = user.displayName;
    btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Masuk';
    btn.disabled = false;
    loadData();
  }, 600);
}

function doLogout() {
  if (!confirm("Yakin ingin logout?")) return;
  sessionStorage.removeItem("ppn_user");
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").style.display = "none";
  document.getElementById("loginOverlay").classList.remove("hidden");
}

function showLoginError(msg) {
  const el = document.getElementById("loginError");
  document.getElementById("loginErrorMsg").textContent = msg;
  el.style.display = "flex";
}

function togglePassword() {
  const input = document.getElementById("loginPassword");
  const icon  = document.getElementById("togglePwIcon");
  if (input.type === "password") {
    input.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fas fa-eye";
  }
}

const TOTAL_KAPAL = 85;
const BULAN_ORDER = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

let rawHRA = [], rawDAT = [];
let filteredHRA = [], filteredDAT = [];
let hraBarChart, hraDonutChart, datBarChart, datDonutChart;
let hraSortCol = -1, hraSortDir = 1, datSortCol = -1, datSortDir = 1;
let hraChartType = 'bar', datChartType = 'bar';

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  // Enter key untuk login
  ["loginUsername","loginPassword"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") doLogin();
    });
  });

  checkAuth();
  setupNav();
  setupSidebar();

  // Hanya load data jika sudah login
  if (sessionStorage.getItem("ppn_user")) {
    loadData();
    setInterval(loadData, 300000);
  }
  document.getElementById("btnRefresh").addEventListener("click", () => {
    if (sessionStorage.getItem("ppn_user")) loadData();
  });
});

// ====== NAV ======
function setupNav() {
document.querySelectorAll(".nav-item").forEach(item => {
item.addEventListener("click", e => {
e.preventDefault();
const menu = item.dataset.menu;
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

// ====== SIDEBAR MOBILE ======
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

// ====== DATA LOAD ======
async function loadData() {
showLoading(true);
hideError();
try {
const res = await fetch(API_URL + "?t=" + Date.now());
if (!res.ok) throw new Error("HTTP " + res.status);
const data = await res.json();
rawHRA = data.hra || [];
rawDAT = data.dat || [];
filteredHRA = [...rawHRA];
filteredDAT = [...rawDAT];
const now = new Date();
document.getElementById("lastUpdated").textContent =
"Update: " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
} catch(err) {
console.error("API Error:", err);
showError("Gagal memuat data. Pastikan API_URL di script.js sudah benar dan Apps Script sudah di-deploy sebagai Web App (Anyone).");
// Tampilkan UI kosong agar layout tetap terlihat
rawHRA = []; rawDAT = [];
filteredHRA = []; filteredDAT = [];
document.getElementById("lastUpdated").textContent = "Gagal terhubung";
}
renderHRAPage();
renderDATPage();
showLoading(false);
}

function showLoading(v) { document.getElementById("loadingOverlay").style.display = v ? "flex" : "none"; }
function showError(msg) {
document.getElementById("errorBanner").style.display = "flex";
document.getElementById("errorMsg").textContent = msg;
}
function hideError() { document.getElementById("errorBanner").style.display = "none"; }

// ====================================================
// HRA PAGE
// ====================================================
function renderHRAPage() {
const data = filteredHRA;
const done = new Set(data.filter(r => (r["Status"]||"").toLowerCase()==="done").map(r=>r["Nama Kapal"])).size;
const belum = TOTAL_KAPAL - done;
const budget = data.reduce((s,r) => s + parseFloat(r["Est Budget"]||0), 0);
const coverage = ((done/TOTAL_KAPAL)*100).toFixed(1);

document.getElementById("hra-done").textContent = done;
document.getElementById("hra-belum").textContent = belum;
document.getElementById("hra-budget").textContent = formatRupiah(budget);
document.getElementById("hra-coverage").textContent = coverage + "%";

renderHRABarChart(data);
renderHRADonutChart(data);
renderHRAHazard();
renderHRATable(data);
}

function renderHRABarChart(data) {
const counts = {};
BULAN_ORDER.forEach(b => counts[b] = 0);
data.forEach(r => { const b = r["Bulan Pelaksanaan"]; if(b && counts[b]!==undefined) counts[b]++; });
const ctx = document.getElementById("hraBarChart").getContext("2d");
if (hraBarChart) hraBarChart.destroy();
hraBarChart = new Chart(ctx, {
type: hraChartType,
data: {
labels: BULAN_ORDER,
datasets: [{
label: "Monitoring",
data: BULAN_ORDER.map(b => counts[b]),
backgroundColor: hraChartType==='line' ? 'rgba(21,101,192,0.12)' : '#1976D2',
borderColor: '#1565C0',
borderWidth: hraChartType==='line' ? 2.5 : 1,
borderRadius: hraChartType==='bar' ? 6 : 0,
fill: hraChartType==='line',
tension: 0.4,
pointBackgroundColor: '#1565C0',
pointRadius: hraChartType==='line' ? 4 : 0,
}]
},
options: chartOpts()
});
}

function renderHRADonutChart(data) {
const fleets = {"FP I":0,"FP II":0,"FC":0,"FGP":0};
data.forEach(r => { const f=r["Jenis Fleet"]; if(f&&fleets[f]!==undefined) fleets[f]++; });
const ctx = document.getElementById("hraDonutChart").getContext("2d");
if (hraDonutChart) hraDonutChart.destroy();
hraDonutChart = new Chart(ctx, {
type: "doughnut",
data: {
labels: Object.keys(fleets),
datasets: [{
data: Object.values(fleets),
backgroundColor: ['#1976D2','#43A047','#FB8C00','#8E24AA'],
borderColor: '#fff', borderWidth: 3, hoverOffset: 8
}]
},
options: donutOpts()
});
}

function toggleHRAChartType(btn, type) {
hraChartType = type;
btn.closest('.pill-group').querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
btn.classList.add('active');
renderHRABarChart(filteredHRA);
}

function renderHRAHazard() {
const bulan = document.getElementById("hra-hazard-bulan").value;
const data = bulan ? rawHRA.filter(r=>r["Bulan Pelaksanaan"]===bulan) : rawHRA;
const counts = {};
data.forEach(r => {
const h = (r["Top 3 Hazard"]||"").trim();
if (!h) return;
h.split(/[,;]/).map(x=>x.trim()).filter(Boolean).forEach(hz => {
counts[hz] = (counts[hz]||0) + 1;
});
});
const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
const el = document.getElementById("hazardList");
if (!sorted.length) { el.innerHTML='<div class="hazard-empty"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada data hazard</div>'; return; }
el.innerHTML = sorted.map(([name,count],i) => `
  <div class="hazard-item">
    <div class="hazard-rank r${i+1}">${i+1}</div>
    <div class="hazard-name">${esc(name)}</div>
    <div class="hazard-count">${count}x</div>
  </div>`).join("");
}

function renderHRATable(data) {
document.getElementById("hraTableBody").innerHTML = data.map(r => `
  <tr>
    <td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td>
    <td>${esc(r["Bulan Pelaksanaan"]||"")}</td>
    <td>${esc(r["Vendor Pelaksana"]||"")}</td>
    <td>${statusBadge(r["Status"])}</td>
    <td style="font-weight:700">Rp ${fmtNum(parseFloat(r["Est Budget"]||0))}</td>
  </tr>`).join("");
document.getElementById("hraTableFooter").textContent = `Menampilkan ${data.length} dari ${rawHRA.length} entri kapal`;
}

function applyHRAFilters() {
const b = document.getElementById("hra-filter-bulan").value;
const f = document.getElementById("hra-filter-fleet").value;
const k = document.getElementById("hra-filter-kapal").value.toLowerCase();
filteredHRA = rawHRA.filter(r =>
(!b || r["Bulan Pelaksanaan"]===b) &&
(!f || r["Jenis Fleet"]===f) &&
(!k || (r["Nama Kapal"]||"").toLowerCase().includes(k))
);
renderHRAPage();
}
function clearHRAFilters() {
["hra-filter-bulan","hra-filter-fleet"].forEach(id => document.getElementById(id).value="");
document.getElementById("hra-filter-kapal").value="";
filteredHRA = [...rawHRA];
renderHRAPage();
}
function searchHRATable() {
const q = document.getElementById("hra-search").value.toLowerCase();
document.querySelectorAll("#hraTableBody tr").forEach(row => {
row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
});
}
function sortHRATable(col) {
if(hraSortCol===col) hraSortDir*=-1; else{hraSortCol=col;hraSortDir=1;}
const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Status","Est Budget"];
filteredHRA.sort((a,b) => String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*hraSortDir);
renderHRATable(filteredHRA);
}

// ====================================================
// DAT PAGE
// ====================================================
function renderDATPage() {
const data = filteredDAT;
const done = new Set(data.map(r=>r["Nama Kapal"])).size;
const belum = TOTAL_KAPAL - done;
const crew = data.reduce((s,r)=>s+parseInt(r["Total Crew Diperiksa"]||0),0);
const pos = data.reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);
const biaya = data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);
const coverage = ((done/TOTAL_KAPAL)*100).toFixed(1);

document.getElementById("dat-done").textContent = done;
document.getElementById("dat-belum").textContent = belum;
document.getElementById("dat-crew").textContent = fmtNum(crew);
document.getElementById("dat-positif").textContent = pos;
document.getElementById("dat-biaya").textContent = formatRupiah(biaya);
document.getElementById("dat-coverage").textContent = coverage + "%";

renderDATBarChart(data);
renderDATDonutChart(data, crew, pos);
renderDATTindakLanjut(data);
renderDATTable(data);
}

function renderDATBarChart(data) {
const crews = {};
BULAN_ORDER.forEach(b => crews[b]=0);
data.forEach(r => { const b=r["Bulan Pelaksanaan"]; if(b&&crews[b]!==undefined) crews[b]+=parseInt(r["Total Crew Diperiksa"]||0); });
const ctx = document.getElementById("datBarChart").getContext("2d");
if(datBarChart) datBarChart.destroy();
datBarChart = new Chart(ctx, {
type: datChartType,
data: {
labels: BULAN_ORDER,
datasets: [{
label: "Crew Diperiksa",
data: BULAN_ORDER.map(b=>crews[b]),
backgroundColor: datChartType==='line' ? 'rgba(46,125,50,0.12)' : '#43A047',
borderColor: '#2E7D32',
borderWidth: datChartType==='line' ? 2.5 : 1,
borderRadius: datChartType==='bar' ? 6 : 0,
fill: datChartType==='line',
tension: 0.4,
pointBackgroundColor: '#2E7D32',
pointRadius: datChartType==='line' ? 4 : 0,
}]
},
options: chartOpts()
});
}

function renderDATDonutChart(data, crew, pos) {
const neg = crew - pos;
const ctx = document.getElementById("datDonutChart").getContext("2d");
if(datDonutChart) datDonutChart.destroy();
datDonutChart = new Chart(ctx, {
type: "doughnut",
data: {
labels: ["Negatif","Positif"],
datasets: [{
data: [neg, pos],
backgroundColor: ['#43A047','#E53935'],
borderColor: '#fff', borderWidth: 3, hoverOffset: 8
}]
},
options: donutOpts()
});
}

function toggleDATChartType(btn, type) {
datChartType = type;
btn.closest('.pill-group').querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));
btn.classList.add('active');
renderDATBarChart(filteredDAT);
}

function renderDATTindakLanjut(data) {
const diturunkan = data.filter(r=>(r["Tindak Lanjut"]||"").toLowerCase().includes("turun"))
.reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);
const total_tl = data.filter(r=>r["Tindak Lanjut"]).length;
document.getElementById("datTindakLanjut").innerHTML = `
  <div class="stat-row">
    <div class="stat-item">
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px">
          <i class="fas fa-arrow-down-from-line" style="color:#C62828;margin-right:5px"></i>
          Crew Diturunkan
        </div>
        <div class="stat-label">Hasil positif ditindaklanjuti</div>
      </div>
      <div class="stat-val">${diturunkan}</div>
    </div>
    <div class="stat-item">
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px">
          <i class="fas fa-file-medical" style="color:#E65100;margin-right:5px"></i>
          Entri Tindak Lanjut
        </div>
        <div class="stat-label">Kapal dengan tindak lanjut</div>
      </div>
      <div class="stat-val" style="color:#E65100">${total_tl}</div>
    </div>
  </div>`;
}

function renderDATTable(data) {
document.getElementById("datTableBody").innerHTML = data.map(r => {
const h = (r["Hasil"]||"").toLowerCase();
const badge = h==="negatif" ? '<span class="badge badge-neg">Negatif</span>'
: h==="positif" ? '<span class="badge badge-pos">Positif</span>'
: esc(r["Hasil"]||"—");
return `<tr>
    <td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td>
    <td>${esc(r["Bulan Pelaksanaan"]||"")}</td>
    <td style="text-align:right;font-weight:700">${fmtNum(parseInt(r["Vendor Pelaksana"]||"—"))}</td>
    <td>${badge}</td>
    <td style="text-align:right;font-weight:700;color:#C62828">${r["Jumlah Crew Positif"]||0}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r["Tindak Lanjut"]||"—")}</td>
  </tr>`;
}).join("");
document.getElementById("datTableFooter").textContent = `Menampilkan ${data.length} dari ${rawDAT.length} entri`;
}

function applyDATFilters() {
const b=document.getElementById("dat-filter-bulan").value;
const f=document.getElementById("dat-filter-fleet").value;
const k=document.getElementById("dat-filter-kapal").value.toLowerCase();
filteredDAT = rawDAT.filter(r =>
(!b||r["Bulan Pelaksanaan"]===b)&&
(!f||r["Jenis Fleet"]===f)&&
(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k))
);
renderDATPage();
}
function clearDATFilters() {
["dat-filter-bulan","dat-filter-fleet"].forEach(id=>document.getElementById(id).value="");
document.getElementById("dat-filter-kapal").value="";
filteredDAT=[...rawDAT];
renderDATPage();
}
function searchDATTable() {
const q=document.getElementById("dat-search").value.toLowerCase();
document.querySelectorAll("#datTableBody tr").forEach(row=>{
row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";
});
}
function sortDATTable(col) {
if(datSortCol===col) datSortDir*=-1; else{datSortCol=col;datSortDir=1;}
const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Hasil","Jumlah Crew Positif","Tindak Lanjut"];
filteredDAT.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*datSortDir);
renderDATTable(filteredDAT);
}

// ====================================================
// CHART OPTIONS
// ====================================================
function chartOpts() {
return {
responsive:true, maintainAspectRatio:false,
plugins:{
legend:{display:false},
tooltip:{
backgroundColor:'#1565C0', titleColor:'#fff', bodyColor:'rgba(255,255,255,0.8)',
padding:10, cornerRadius:8, displayColors:false
}
},
scales:{
x:{grid:{color:'#F0F4F8'}, ticks:{color:'#90A4AE',font:{size:11,family:'Nunito'}}},
y:{grid:{color:'#F0F4F8'}, ticks:{color:'#90A4AE',font:{size:11,family:'Nunito'}}, beginAtZero:true}
}
};
}
function donutOpts() {
return {
responsive:true, maintainAspectRatio:false, cutout:'65%',
plugins:{
legend:{
position:'bottom',
labels:{color:'#607D8B',font:{size:12,family:'Nunito',weight:'700'},padding:14,boxWidth:12}
},
tooltip:{
backgroundColor:'#1565C0', titleColor:'#fff', bodyColor:'rgba(255,255,255,0.8)',
padding:10, cornerRadius:8
}
}
};
}

// ====================================================
// HELPERS
// ====================================================
function fmtNum(n) { return (n||0).toLocaleString("id-ID"); }
function formatRupiah(n) {
if (n >= 1e9) return (n/1e9).toFixed(1) + " M";
if (n >= 1e6) return (n/1e6).toFixed(1) + " Jt";
return fmtNum(n);
}
function esc(s) {
return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function statusBadge(s) {
return (s||"").toLowerCase()==="done"
? '<span class="badge badge-done">✓ Done</span>'
: '<span class="badge badge-belum">⏳ Belum</span>';
}
