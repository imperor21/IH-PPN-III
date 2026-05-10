/* HSE Marine Dashboard — script.js v4.0 DRIVE INTEGRATION */
/* ✅ HRA, DAT, Pest tetap dari Google Sheets                         */
/* ✅ Pedoman PDF & Foto Dokumentasi → Google Drive (multi-device)    */
/* ✅ IndexedDB dihapus — data terpusat di GAS/Drive                  */

const API_URL = "https://script.google.com/macros/s/AKfycbzs7XKeqah4z9KgWYcoDhBnJ4E9jFK9spRgw_djQ-pRknxuGxO3VENLJj7CJbeMDPRvxw/exec";

async function gasPost(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 detik timeout
  try {
    const res = await fetch(API_URL, {
      method:"POST", redirect:"follow",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    // GAS kadang return HTML redirect jika session expired atau deploy error
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch(e) {
      console.error("GAS non-JSON response:", text.slice(0, 200));
      throw new Error("Server mengembalikan respons tidak valid. Cek deployment GAS.");
    }
  } catch(e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new Error("Request timeout (>30 detik). Server GAS tidak merespons.");
    }
    throw e;
  }
}

/* AUTH */
function getToken(){return sessionStorage.getItem("ppn_token");}
function getSession(){const s=sessionStorage.getItem("ppn_user");return s?JSON.parse(s):null;}
function getRole(){const u=getSession();return u?u.role:"";}
function isAdmin(){return getRole()==="admin";}
function saveSession(data,token){sessionStorage.setItem("ppn_token",token);sessionStorage.setItem("ppn_user",JSON.stringify({displayName:data.username||document.getElementById("loginUsername").value.trim(),role:data.role}));sessionStorage.setItem("ppn_login_time",Date.now().toString());}
function clearSession(){sessionStorage.removeItem("ppn_token");sessionStorage.removeItem("ppn_user");sessionStorage.removeItem("ppn_login_time");}
function isSessionValid(){const token=getToken();const loginTime=parseInt(sessionStorage.getItem("ppn_login_time")||"0");if(!token)return false;if(Date.now()-loginTime>8*60*60*1000){clearSession();return false;}return true;}
function checkAuth(){
  const overlay=document.getElementById("loginOverlay");
  const usernameEl=document.getElementById("sidebarUsername");
  if(!overlay)return;
  if(isSessionValid()){
    const user=getSession();
    overlay.classList.add("hidden");
    if(usernameEl)usernameEl.textContent=user?user.displayName:"User";
    applyRoleUI();
  }else{
    clearSession();
    overlay.classList.remove("hidden");
  }
}

/* LOGIN */
let loginAttempts=0;
function getLoginLockedUntil(){return parseInt(localStorage.getItem("ppn_locked_until")||"0");}
function setLoginLockedUntil(ts){localStorage.setItem("ppn_locked_until",ts.toString());}

async function doLogin(){
  const username=document.getElementById("loginUsername").value.trim();
  const password=document.getElementById("loginPassword").value;
  const btn=document.getElementById("btnLogin");
  const lockedUntil=getLoginLockedUntil();
  if(Date.now()<lockedUntil){const sisa=Math.ceil((lockedUntil-Date.now())/60000);showLoginError("Terlalu banyak percobaan. Tunggu "+sisa+" menit.");return;}
  if(!username||!password){showLoginError("Username dan password tidak boleh kosong.");return;}
  btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Memverifikasi...';btn.disabled=true;
  try{
    clearSession(); // bersihkan sesi lama sebelum login baru
    const data=await gasPost({action:"login",username,password});
    if(data.status==="ok"){loginAttempts=0;localStorage.removeItem("ppn_locked_until");saveSession(data,data.token);document.getElementById("loginError").style.display="none";document.getElementById("loginOverlay").classList.add("hidden");document.getElementById("sidebarUsername").textContent=document.getElementById("loginUsername").value.trim();applyRoleUI();loadData();}
    else if(data.status==="locked"){setLoginLockedUntil(Date.now()+15*60*1000);showLoginError(data.message||"Akun dikunci sementara.");shakeCard();}
    else{loginAttempts++;if(loginAttempts>=5){setLoginLockedUntil(Date.now()+15*60*1000);loginAttempts=0;}showLoginError(data.message||"Username atau password salah.");shakeCard();}
  }catch(err){showLoginError("Tidak dapat terhubung ke server: "+err.message);console.error("Login error:",err);}
  btn.innerHTML='<i class="fas fa-right-to-bracket"></i> Masuk';btn.disabled=false;
}
function shakeCard(){const card=document.querySelector(".login-card");card.style.animation="shake .4s ease";setTimeout(()=>{card.style.animation="";},400);}

/* LOGOUT */
async function doLogout(){if(!confirm("Yakin ingin logout?"))return;const token=getToken();if(token)gasPost({action:"logout",token}).catch(()=>{});clearSession();const unEl=document.getElementById("loginUsername");const pwEl=document.getElementById("loginPassword");const errEl=document.getElementById("loginError");const overlay=document.getElementById("loginOverlay");if(unEl)unEl.value="";if(pwEl)pwEl.value="";if(errEl)errEl.style.display="none";if(overlay)overlay.classList.remove("hidden");}
function showLoginError(msg){document.getElementById("loginErrorMsg").textContent=msg;document.getElementById("loginError").style.display="flex";}
function togglePassword(){const input=document.getElementById("loginPassword");const icon=document.getElementById("togglePwIcon");if(input.type==="password"){input.type="text";icon.className="fas fa-eye-slash";}else{input.type="password";icon.className="fas fa-eye";}}

/* ROLE UI */
function applyRoleUI(){
  const admin=isAdmin();
  // Admin-only: sembunyikan jika viewer, tampilkan jika admin
  document.querySelectorAll(".admin-only").forEach(el=>{
    if(admin){
      const tag=el.tagName.toLowerCase();
      el.style.display=(tag==="label"||tag==="button"||tag==="a")?"inline-flex":"flex";
    } else {
      el.style.display="none";
    }
  });
  // Viewer-only: kebalikannya
  document.querySelectorAll(".viewer-only").forEach(el=>{
    if(!admin){
      const tag=el.tagName.toLowerCase();
      el.style.display=(tag==="label"||tag==="button"||tag==="a")?"inline-flex":"flex";
    } else {
      el.style.display="none";
    }
  });
  // Badge role di sidebar
  const roleEl=document.querySelector(".user-role");
  if(roleEl)roleEl.textContent="";
}

/* VIEWER GUARD — blokir action write jika bukan admin */
function guardAdmin(msg){
  if(!isAdmin()){showToast(msg||"Akses ditolak. Hanya Admin yang dapat melakukan aksi ini.","error");return false;}
  return true;
}


const TOTAL_KAPAL=85;
const BULAN_ORDER=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
let rawHRA=[],rawDAT=[],rawPest=[],filteredHRA=[],filteredDAT=[],filteredPest=[];
let hraBarChart,hraDonutChart,datBarChart,datDonutChart,pestBarChart,pestDonutChart,pestTemuanChart,pestBiayaChart;
let hraSortCol=-1,hraSortDir=1,datSortCol=-1,datSortDir=1,pestSortCol=-1,pestSortDir=1;
let hraChartType="bar",datChartType="bar",pestChartType="bar";

/* INIT */
document.addEventListener("DOMContentLoaded",()=>{
  ["loginUsername","loginPassword"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});});
  checkAuth();setupNav();setupSidebar();
  if(isSessionValid()){loadData();let _autoRefreshing=false;setInterval(()=>{if(!isSessionValid()){alert("Sesi Anda telah habis (8 jam). Silakan login kembali.");clearSession();const overlay=document.getElementById("loginOverlay");if(overlay)overlay.classList.remove("hidden");return;}if(_autoRefreshing)return;_autoRefreshing=true;loadData().finally(()=>{_autoRefreshing=false;});},300000);}
  const btnRefresh=document.getElementById("btnRefresh");if(btnRefresh)btnRefresh.addEventListener("click",()=>{if(isSessionValid())loadData();else alert("Sesi habis. Silakan login kembali.");});
  document.querySelectorAll('.nav-item[data-menu="menu6"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderPedomanList,80));});
  document.querySelectorAll('.nav-item[data-menu="dokumentasi"]').forEach(item=>{item.addEventListener("click",()=>{currentDokFolder="hra_ih";setTimeout(renderDokGallery,80);});});
});

/* NAV */
function setupNav(){document.querySelectorAll(".nav-item").forEach(item=>{item.addEventListener("click",e=>{e.preventDefault();const menu=item.dataset.menu;const title=item.dataset.title||menu;document.querySelectorAll(".page-content").forEach(p=>p.classList.remove("active"));document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));const page=document.getElementById("page-"+menu);if(page)page.classList.add("active");item.classList.add("active");document.getElementById("pageTitle").textContent=title;closeSidebar();});});}
function setupSidebar(){const overlay=document.createElement("div");overlay.className="sidebar-overlay";overlay.id="sidebarOverlay";overlay.addEventListener("click",closeSidebar);document.body.appendChild(overlay);document.getElementById("sidebarToggle").addEventListener("click",()=>{const open=document.getElementById("sidebar").classList.toggle("open");overlay.classList.toggle("show",open);});}
function closeSidebar(){document.getElementById("sidebar").classList.remove("open");document.getElementById("sidebarOverlay").classList.remove("show");}

/* DATA LOAD */
async function loadData(){
  if(!isSessionValid()){
    showError("Sesi habis. Silakan login kembali.");
    const overlay=document.getElementById("loginOverlay");
    if(overlay)overlay.classList.remove("hidden");
    return;
  }
  showLoading(true);hideError();
  try{
    const data=await gasPost({action:"getData",sheet:"all",token:getToken()});
    if(data.status==="unauthorized"){
      clearSession();
      showError("Sesi habis atau tidak valid. Silakan login kembali.");
      const overlay=document.getElementById("loginOverlay");
      if(overlay)overlay.classList.remove("hidden");
      showLoading(false);return;
    }
    if(data.status!=="ok")throw new Error(data.message||"Error dari server");
    rawHRA=data.hra||[];rawDAT=data.dat||[];rawPest=data.pest||[];
    filteredHRA=[...rawHRA];filteredDAT=[...rawDAT];filteredPest=[...rawPest];
    const now=new Date();
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Update: "+now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
  }catch(err){
    console.error("API Error:",err);
    showError("Gagal memuat data: "+err.message);
    rawHRA=[];rawDAT=[];rawPest=[];
    filteredHRA=[];filteredDAT=[];filteredPest=[];
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Gagal terhubung";
  }
  renderHRAPage();renderDATPage();renderPestPage();showLoading(false);
}
function showLoading(v){document.getElementById("loadingOverlay").style.display=v?"flex":"none";}
function showError(msg){document.getElementById("errorBanner").style.display="flex";document.getElementById("errorMsg").textContent=msg;}
function hideError(){document.getElementById("errorBanner").style.display="none";}

/* HRA PAGE */
function renderHRAPage(){const data=filteredHRA;const done=new Set(data.filter(r=>(r["Status"]||"").toLowerCase()==="done").map(r=>r["Nama Kapal"])).size;const belum=TOTAL_KAPAL-done;const budget=data.reduce((s,r)=>s+parseFloat(r["Est Budget"]||0),0);const coverage=((done/TOTAL_KAPAL)*100).toFixed(1);document.getElementById("hra-done").textContent=done;document.getElementById("hra-belum").textContent=belum;document.getElementById("hra-budget").textContent=formatRupiah(budget);document.getElementById("hra-coverage").textContent=coverage+"%";renderHRABarChart(data);renderHRADonutChart(data);renderHRAHazard();renderHRATable(data);}
function renderHRABarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("hraBarChart").getContext("2d");if(hraBarChart)hraBarChart.destroy();hraBarChart=new Chart(ctx,{type:hraChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Monitoring",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:hraChartType==="line"?"rgba(21,101,192,0.12)":"#1976D2",borderColor:"#1565C0",borderWidth:hraChartType==="line"?2.5:1,borderRadius:hraChartType==="bar"?6:0,fill:hraChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:hraChartType==="line"?4:0}]},options:chartOpts()});}
function renderHRADonutChart(data){const fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};data.forEach(r=>{const f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});const ctx=document.getElementById("hraDonutChart").getContext("2d");if(hraDonutChart)hraDonutChart.destroy();hraDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:Object.keys(fleets),datasets:[{data:Object.values(fleets),backgroundColor:["#1976D2","#43A047","#FB8C00","#8E24AA"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function toggleHRAChartType(btn,type){hraChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderHRABarChart(filteredHRA);}
function renderHRAHazard(){const bulan=document.getElementById("hra-hazard-bulan").value;const data=bulan?rawHRA.filter(r=>r["Bulan Pelaksanaan"]===bulan):rawHRA;const counts={};data.forEach(r=>{const h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(x=>x.trim()).filter(Boolean).forEach(hz=>{counts[hz]=(counts[hz]||0)+1;});});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);const el=document.getElementById("hazardList");if(!sorted.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada data hazard</div>';return;}el.innerHTML=sorted.map(([name,count],i)=>`<div class="hazard-item"><div class="hazard-rank r${i+1}">${i+1}</div><div class="hazard-name">${esc(name)}</div><div class="hazard-count">${count}x</div></div>`).join("");}
function renderHRATable(data){document.getElementById("hraTableBody").innerHTML=data.map(r=>`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"")}</td><td>${statusBadge(r["Status"])}</td><td style="font-weight:700">Rp ${fmtNum(parseFloat(r["Est Budget"]||0))}</td></tr>`).join("");document.getElementById("hraTableFooter").textContent=`Menampilkan ${data.length} dari ${rawHRA.length} entri kapal`;}
function applyHRAFilters(){const b=document.getElementById("hra-filter-bulan").value;const f=document.getElementById("hra-filter-fleet").value;const k=document.getElementById("hra-filter-kapal").value.toLowerCase();filteredHRA=rawHRA.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderHRAPage();}
function clearHRAFilters(){["hra-filter-bulan","hra-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("hra-filter-kapal").value="";filteredHRA=[...rawHRA];renderHRAPage();}
function searchHRATable(){const q=document.getElementById("hra-search").value.toLowerCase();document.querySelectorAll("#hraTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortHRATable(col){if(hraSortCol===col)hraSortDir*=-1;else{hraSortCol=col;hraSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Status","Est Budget"];filteredHRA.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*hraSortDir);renderHRATable(filteredHRA);}

/* DAT PAGE */
function renderDATPage(){const data=filteredDAT;const done=new Set(data.map(r=>r["Nama Kapal"])).size;const belum=TOTAL_KAPAL-done;const crew=data.reduce((s,r)=>s+parseInt(r["Total Crew Diperiksa"]||0),0);const pos=data.reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);const biaya=data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);const coverage=((done/TOTAL_KAPAL)*100).toFixed(1);document.getElementById("dat-done").textContent=done;document.getElementById("dat-belum").textContent=belum;document.getElementById("dat-crew").textContent=fmtNum(crew);document.getElementById("dat-positif").textContent=pos;document.getElementById("dat-biaya").textContent=formatRupiah(biaya);document.getElementById("dat-coverage").textContent=coverage+"%";renderDATBarChart(data);renderDATDonutChart(data,crew,pos);renderDATTindakLanjut(data);renderDATTable(data);}
function renderDATBarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("datBarChart").getContext("2d");if(datBarChart)datBarChart.destroy();datBarChart=new Chart(ctx,{type:datChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Kapal DAT",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:datChartType==="line"?"rgba(67,160,71,0.12)":"#43A047",borderColor:"#2E7D32",borderWidth:datChartType==="line"?2.5:1,borderRadius:datChartType==="bar"?6:0,fill:datChartType==="line",tension:0.4,pointBackgroundColor:"#2E7D32",pointRadius:datChartType==="line"?4:0}]},options:chartOpts()});}
function renderDATDonutChart(data,crew,pos){const neg=crew-pos;const ctx=document.getElementById("datDonutChart").getContext("2d");if(datDonutChart)datDonutChart.destroy();datDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:["Negatif","Positif"],datasets:[{data:[Math.max(0,neg),pos],backgroundColor:["#43A047","#E53935"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function toggleDATChartType(btn,type){datChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderDATBarChart(filteredDAT);}
function renderDATTindakLanjut(data){const diturunkan=data.filter(r=>(r["Tindak Lanjut"]||"").toLowerCase().includes("turun")).reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);const total_tl=data.filter(r=>r["Tindak Lanjut"]).length;document.getElementById("datTindakLanjut").innerHTML=`<div class="stat-row"><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-arrow-down-from-line" style="color:#C62828;margin-right:5px"></i>Crew Diturunkan</div><div class="stat-label">Hasil positif ditindaklanjuti</div></div><div class="stat-val">${diturunkan}</div></div><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-file-medical" style="color:#E65100;margin-right:5px"></i>Entri Tindak Lanjut</div><div class="stat-label">Kapal dengan tindak lanjut</div></div><div class="stat-val" style="color:#E65100">${total_tl}</div></div></div>`;}
function renderDATTable(data){document.getElementById("datTableBody").innerHTML=data.map(r=>{const h=(r["Hasil"]||"").toLowerCase();const badge=h==="negatif"?'<span class="badge badge-neg">Negatif</span>':h==="positif"?'<span class="badge badge-pos">Positif</span>':esc(r["Hasil"]||"—");return`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"—")}</td><td style="text-align:right;font-weight:700">${fmtNum(parseInt(r["Total Crew Diperiksa"]||0))}</td><td>${badge}</td><td style="text-align:right;font-weight:700;color:#C62828">${r["Jumlah Crew Positif"]||0}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r["Tindak Lanjut"]||"—")}</td></tr>`;}).join("");document.getElementById("datTableFooter").textContent=`Menampilkan ${data.length} dari ${rawDAT.length} entri`;}
function applyDATFilters(){const b=document.getElementById("dat-filter-bulan").value;const f=document.getElementById("dat-filter-fleet").value;const k=document.getElementById("dat-filter-kapal").value.toLowerCase();filteredDAT=rawDAT.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderDATPage();}
function clearDATFilters(){["dat-filter-bulan","dat-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("dat-filter-kapal").value="";filteredDAT=[...rawDAT];renderDATPage();}
function searchDATTable(){const q=document.getElementById("dat-search").value.toLowerCase();document.querySelectorAll("#datTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortDATTable(col){if(datSortCol===col)datSortDir*=-1;else{datSortCol=col;datSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Total Crew Diperiksa","Hasil","Jumlah Crew Positif","Tindak Lanjut"];filteredDAT.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*datSortDir);renderDATTable(filteredDAT);}

/* PEST PAGE */
function getPestTanggalDisplay(r){return r["Tanggal"]||r["Tanggal Pelaksanaan"]||r["Date"]||"";}
function getPestTL(r){return r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||r["Tindak Lanjut dan Rekomendasi"]||"";}
function renderPestPage(){const data=filteredPest;const totalPelaksanaan=data.length;const lokSet=new Set(data.map(r=>(r["Lokasi"]||"").trim()).filter(Boolean));const totalBiaya=data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);const temuanAll=data.map(r=>(r["Temuan / Keluhan"]||"").trim()).filter(Boolean);const hamaMap={};temuanAll.forEach(t=>{const low=t.toLowerCase();["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(h=>{if(low.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;});});const hamaDominan=Object.entries(hamaMap).sort((a,b)=>b[1]-a[1])[0];document.getElementById("pest-total").textContent=fmtNum(totalPelaksanaan);document.getElementById("pest-lokasi").textContent=fmtNum(lokSet.size);document.getElementById("pest-temuan").textContent=fmtNum(temuanAll.length);document.getElementById("pest-hama-dominan").textContent=hamaDominan?hamaDominan[0].charAt(0).toUpperCase()+hamaDominan[0].slice(1):"—";document.getElementById("pest-biaya").textContent=formatRupiah(totalBiaya);const lokasiSel=document.getElementById("pest-filter-lokasi");const currentLok=lokasiSel.value;const uniqueLok=[...lokSet].sort();lokasiSel.innerHTML='<option value="">Semua Lokasi</option>'+uniqueLok.map(l=>`<option${l===currentLok?" selected":""}>${esc(l)}</option>`).join("");renderPestBarChart(data);renderPestDonutChart(data);renderPestTemuanChart(data);renderPestBiayaChart(data);renderPestTindakLanjut(data);renderPestTable(data);}
function renderPestBarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("pestBarChart").getContext("2d");if(pestBarChart)pestBarChart.destroy();const colors=BULAN_ORDER.map((_,i)=>`hsl(${210+i*5},70%,${50+i*1.5}%)`);pestBarChart=new Chart(ctx,{type:pestChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Pelaksanaan",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:pestChartType==="line"?"rgba(21,101,192,0.12)":colors,borderColor:"#1565C0",borderWidth:pestChartType==="line"?2.5:1,borderRadius:pestChartType==="bar"?6:0,fill:pestChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:pestChartType==="line"?4:0}]},options:chartOpts()});}
function renderPestDonutChart(data){const lokMap={};data.forEach(r=>{const l=(r["Lokasi"]||"").trim();if(l)lokMap[l]=(lokMap[l]||0)+1;});const sorted=Object.entries(lokMap).sort((a,b)=>b[1]-a[1]).slice(0,8);const ctx=document.getElementById("pestDonutChart").getContext("2d");if(pestDonutChart)pestDonutChart.destroy();const palette=["#1976D2","#43A047","#FB8C00","#8E24AA","#00838F","#E53935","#F9A825","#5E35B1"];pestDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:sorted.map(([k])=>k),datasets:[{data:sorted.map(([,v])=>v),backgroundColor:palette,borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function renderPestTemuanChart(data){const tMap={};data.forEach(r=>{const t=(r["Temuan / Keluhan"]||"").trim();if(t)tMap[t]=(tMap[t]||0)+1;});const sorted=Object.entries(tMap).sort((a,b)=>b[1]-a[1]).slice(0,6);const ctx=document.getElementById("pestTemuanChart").getContext("2d");if(pestTemuanChart)pestTemuanChart.destroy();pestTemuanChart=new Chart(ctx,{type:"bar",data:{labels:sorted.map(([k])=>k.length>30?k.slice(0,30)+"…":k),datasets:[{label:"Frekuensi",data:sorted.map(([,v])=>v),backgroundColor:"#8E24AA",borderRadius:6}]},options:{...chartOpts(),indexAxis:"y"}});}
function renderPestBiayaChart(data){const biayaMap={};BULAN_ORDER.forEach(b=>biayaMap[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&biayaMap[b]!==undefined)biayaMap[b]+=parseFloat(r["Est Biaya"]||0);});const ctx=document.getElementById("pestBiayaChart").getContext("2d");if(pestBiayaChart)pestBiayaChart.destroy();pestBiayaChart=new Chart(ctx,{type:"line",data:{labels:BULAN_ORDER,datasets:[{label:"Est. Biaya",data:BULAN_ORDER.map(b=>biayaMap[b]),backgroundColor:"rgba(142,36,170,0.1)",borderColor:"#8E24AA",borderWidth:2.5,fill:true,tension:0.4,pointBackgroundColor:"#8E24AA",pointRadius:4}]},options:chartOpts()});}
function renderPestTindakLanjut(data){const el=document.getElementById("pestTindakLanjutList");const items=data.map(r=>getPestTL(r)).filter(Boolean).slice(0,6);if(!items.length){el.innerHTML='<div class="hazard-empty">Tidak ada data tindak lanjut</div>';return;}el.innerHTML=items.map((t,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name" style="white-space:normal;line-height:1.4">${esc(t.length>80?t.slice(0,80)+"…":t)}</div></div>`).join("");}
function renderPestTable(data){document.getElementById("pestTableBody").innerHTML=data.map(r=>{const biaya=parseFloat(r["Est Biaya"]||0);const tglDisplay=getPestTanggalDisplay(r);const tindakLanjut=getPestTL(r)||"—";const temuan=(r["Temuan / Keluhan"]||r["Temuan"]||r["Keluhan"]||"—").trim();return`<tr><td><strong style="color:var(--sidebar-bg)">${esc(r["Lokasi"]||"—")}</strong></td><td style="white-space:nowrap;font-weight:600">${esc(tglDisplay)}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${esc(temuan)}">${esc(temuan)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${esc(tindakLanjut)}">${esc(tindakLanjut)}</td><td style="text-align:right;font-weight:700;color:#6A1B9A">${biaya?formatRupiah(biaya):"—"}</td></tr>`;}).join("");document.getElementById("pestTableFooter").textContent=`Menampilkan ${data.length} dari ${rawPest.length} entri`;}
function applyPestFilters(){const b=document.getElementById("pest-filter-bulan").value;const l=document.getElementById("pest-filter-lokasi").value;const t=document.getElementById("pest-filter-temuan").value.toLowerCase();filteredPest=rawPest.filter(r=>(!b||r["Bulan"]===b)&&(!l||r["Lokasi"]===l)&&(!t||(r["Temuan / Keluhan"]||"").toLowerCase().includes(t)));renderPestPage();}
function clearPestFilters(){["pest-filter-bulan","pest-filter-lokasi"].forEach(id=>document.getElementById(id).value="");document.getElementById("pest-filter-temuan").value="";filteredPest=[...rawPest];renderPestPage();}
function searchPestTable(){const q=document.getElementById("pest-search").value.toLowerCase();document.querySelectorAll("#pestTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortPestTable(col){if(pestSortCol===col)pestSortDir*=-1;else{pestSortCol=col;pestSortDir=1;}const keys=["Lokasi","Tanggal","Temuan / Keluhan","Tindak Lanjut","Est Biaya"];filteredPest.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*pestSortDir);renderPestTable(filteredPest);}
function togglePestChartType(btn,type){pestChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderPestBarChart(filteredPest);}

/* CHART HELPERS */
function chartOpts(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#1565C0",titleColor:"#fff",bodyColor:"rgba(255,255,255,0.8)",padding:10,cornerRadius:8,displayColors:false}},scales:{x:{grid:{color:"#F0F4F8"},ticks:{color:"#90A4AE",font:{size:11,family:"Plus Jakarta Sans"}}},y:{grid:{color:"#F0F4F8"},ticks:{color:"#90A4AE",font:{size:11,family:"Plus Jakarta Sans"}},beginAtZero:true}}};}
function donutOpts(){return{responsive:true,maintainAspectRatio:false,cutout:"65%",plugins:{legend:{position:"bottom",labels:{color:"#607D8B",font:{size:12,family:"Plus Jakarta Sans",weight:"700"},padding:14,boxWidth:12}},tooltip:{backgroundColor:"#1565C0",titleColor:"#fff",bodyColor:"rgba(255,255,255,0.8)",padding:10,cornerRadius:8}}};}

/* HELPERS */
function fmtNum(n){return(n||0).toLocaleString("id-ID");}
function formatRupiah(n){if(n>=1e9)return(n/1e9).toFixed(1)+" M";if(n>=1e6)return(n/1e6).toFixed(1)+" Jt";return fmtNum(n);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function statusBadge(s){return(s||"").toLowerCase()==="done"?'<span class="badge badge-done">✓ Done</span>':'<span class="badge badge-belum">⏳ Belum</span>';}

/* TOAST */
function showToast(msg,type){const existing=document.getElementById("driveToast");if(existing)existing.remove();const color=type==="success"?"#2E7D32":type==="error"?"#C62828":"#1565C0";const icon=type==="success"?"fa-circle-check":type==="error"?"fa-circle-xmark":"fa-circle-info";const toast=document.createElement("div");toast.id="driveToast";toast.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;background:${color};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,0.25);max-width:380px`;toast.innerHTML=`<i class="fas ${icon}" style="font-size:16px;flex-shrink:0"></i><span>${msg}</span>`;document.body.appendChild(toast);setTimeout(()=>{if(toast.parentNode)toast.remove();},4000);}

/* DRIVE PROGRESS */
function showDriveProgress(msg){const ex=document.getElementById("driveProgressOverlay");if(ex){ex.querySelector(".dp-msg").textContent=msg;return;}const el=document.createElement("div");el.id="driveProgressOverlay";el.style.cssText="position:fixed;inset:0;z-index:8888;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)";el.innerHTML=`<div style="background:#fff;border-radius:14px;padding:28px 36px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.3);min-width:260px"><i class="fas fa-cloud-arrow-up" style="font-size:36px;color:#1565C0;margin-bottom:12px;display:block"></i><div class="dp-msg" style="font-weight:700;font-size:14px;color:#1A2332;margin-bottom:6px">${msg}</div><div style="font-size:12px;color:#5E7390">Mohon tunggu, jangan tutup halaman ini...</div></div>`;document.body.appendChild(el);}
function hideDriveProgress(){const el=document.getElementById("driveProgressOverlay");if(el)el.remove();}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=e=>resolve(e.target.result.split(",")[1]);reader.onerror=()=>reject(new Error("Gagal membaca file"));reader.readAsDataURL(file);});}

/* PEDOMAN IH — Google Drive */
async function handlePdfUpload(event){
  if(!guardAdmin("Upload ditolak. Hanya Admin yang dapat mengupload file.")){event.target.value="";return;}
  const files=event.target.files;if(!files||!files.length)return;
  const file=files[0];
  if(file.type!=="application/pdf"){showToast("Hanya file PDF yang diizinkan.","error");event.target.value="";return;}
  if(file.size>20*1024*1024){showToast("Ukuran file maksimal 20 MB.","error");event.target.value="";return;}
  // ⚠️ GAS execution limit ~6 menit. File >8MB bisa timeout — beri peringatan
  if(file.size>8*1024*1024){
    const lanjut=confirm("File ini berukuran "+(file.size/1024/1024).toFixed(1)+" MB. Upload file besar mungkin memerlukan waktu lebih lama dan bisa timeout. Lanjutkan?");
    if(!lanjut){event.target.value="";return;}
  }
  const namaDoc=prompt("Nama dokumen / judul pedoman:",file.name.replace(".pdf",""));
  if(!namaDoc){event.target.value="";return;}
  const kategori=prompt("Kategori (Pedoman Umum / STK / Regulasi / Formulir / TKO):","Pedoman Umum")||"Lainnya";
  showDriveProgress("Mengupload ke Google Drive...");
  try{
    const base64=await fileToBase64(file);
    const res=await gasPost({action:"driveUpload",token:getToken(),module:"pedoman",filename:file.name,mimeType:"application/pdf",dataBase64:base64,meta:{nama:namaDoc.trim(),kategori:kategori.trim(),keterangan:""}});
    hideDriveProgress();
    if(res.status==="ok"){showToast("File berhasil diupload ke Google Drive!","success");renderPedomanList();}
    else{showToast("Upload gagal: "+(res.message||"Error"),"error");}
  }catch(err){hideDriveProgress();showToast("Upload gagal: "+err.message,"error");}
  finally{event.target.value="";}
}

async function renderPedomanList(){
  if(!isSessionValid())return;
  const q=(document.getElementById("pedomanSearch")||{}).value||"";
  const kat=(document.getElementById("pedomanFilterKat")||{}).value||"";
  const grid=document.getElementById("pedomanGrid");const empty=document.getElementById("pedomanEmpty");
  grid.querySelectorAll(".pedoman-card").forEach(c=>c.remove());if(empty)empty.style.display="none";
  try{
    const res=await gasPost({action:"driveList",token:getToken(),module:"pedoman"});
    if(res.status!=="ok"){showToast("Gagal memuat daftar pedoman.","error");return;}
    let files=res.files||[];
    const allFiles=[...files];
    if(q)files=files.filter(f=>f.nama.toLowerCase().includes(q.toLowerCase())||(f.kategori||"").toLowerCase().includes(q.toLowerCase()));
    if(kat)files=files.filter(f=>f.kategori===kat);
    const totalDl=allFiles.reduce((s,f)=>s+(Number(f.downloads)||0),0);
    document.getElementById("pedoman-count").textContent=allFiles.length;
    document.getElementById("pedoman-downloads").textContent=fmtNum(totalDl);
    document.getElementById("pedoman-last").textContent=allFiles.length?allFiles[0].uploadDate:"—";
    if(!files.length){if(empty)empty.style.display="flex";return;}
    if(empty)empty.style.display="none";
    files.forEach(f=>{
      const sizeMB=f.sizeBytes?(Number(f.sizeBytes)/1024/1024).toFixed(1):"?";
      const card=document.createElement("div");card.className="pedoman-card";
      const fIdEsc=String(f.id).replace(/'/g,"\\'");
      const prevEsc=(f.previewUrl||"").replace(/'/g,"\\'");
      const namaEsc=(f.nama||"").replace(/'/g,"\\'");
      const katEsc=(f.kategori||"").replace(/'/g,"\\'");
      const dtEsc=(f.uploadDate||"").replace(/'/g,"\\'");
      const dlUrl=f.downloadUrl||"#";
      const adminUI=isAdmin();
      card.innerHTML=`<div class="pedoman-card-top"><div class="pedoman-pdf-icon"><i class="fas fa-file-pdf"></i></div><div class="pedoman-card-info"><div class="pedoman-card-name">${esc(f.nama)}</div><span class="pedoman-kat-badge">${esc(f.kategori||"—")}</span></div></div><div class="pedoman-card-meta"><span><i class="fas fa-calendar fa-xs"></i> ${esc(f.uploadDate||"")}</span><span><i class="fas fa-weight-hanging fa-xs"></i> ${sizeMB} MB</span><span><i class="fas fa-download fa-xs"></i> ${Number(f.downloads)||0}x</span><span><i class="fas fa-user fa-xs"></i> ${esc(f.uploadedBy||"")}</span></div><div class="pedoman-card-actions"><button class="btn-pedoman-view" onclick="viewPedoman('${fIdEsc}','${prevEsc}','${namaEsc}','${katEsc}','${dtEsc}','${sizeMB}')"><i class="fas fa-eye"></i> View</button><a class="btn-pedoman-dl" href="${dlUrl}" target="_blank" style="text-decoration:none"><i class="fas fa-download"></i> Download</a>${adminUI?`<button class="btn-pedoman-del" onclick="deletePedoman('${fIdEsc}')" title="Hapus"><i class="fas fa-trash"></i></button>`:""}</div>`;
      grid.appendChild(card);
    });
  }catch(err){showToast("Gagal memuat pedoman: "+err.message,"error");}
}

function viewPedoman(fileId,previewUrl,nama,kategori,uploadDate,sizeMB){
  const existing=document.getElementById("pedomanViewModal");if(existing)existing.remove();
  const modal=document.createElement("div");modal.id="pedomanViewModal";
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:16px";
  modal.innerHTML=`<div style="background:#fff;border-radius:14px;width:100%;max-width:960px;height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden"><div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;height:56px;background:#0D2E5E;color:#fff;gap:12px"><div style="display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden"><i class="fas fa-file-pdf" style="font-size:18px;color:#ff6b6b;flex-shrink:0"></i><div style="min-width:0;overflow:hidden"><div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nama)}</div><div style="font-size:11px;opacity:.75">${esc(kategori)} · ${esc(sizeMB)} MB · ${esc(uploadDate)}</div></div></div><button id="pedomanViewClose" style="background:rgba(255,255,255,.18);border:none;color:#fff;padding:7px 13px;border-radius:8px;cursor:pointer;font-size:15px;font-weight:700;font-family:inherit"><i class="fas fa-xmark"></i></button></div><div style="flex:1;background:#525659;overflow:hidden"><iframe src="${esc(previewUrl)}" style="width:100%;height:100%;display:block;border:none;" title="${esc(nama)}" allow="autoplay"></iframe></div></div>`;
  modal.addEventListener("click",ev=>{if(ev.target===modal)modal.remove();});
  modal.querySelector("#pedomanViewClose").addEventListener("click",()=>modal.remove());
  document.body.appendChild(modal);
}

async function deletePedoman(fileId){
  if(!guardAdmin("Hapus ditolak. Hanya Admin yang dapat menghapus file."))return;
  if(!confirm("Yakin ingin menghapus file ini dari Google Drive?"))return;
  showDriveProgress("Menghapus file...");
  try{const res=await gasPost({action:"driveDelete",token:getToken(),fileId:fileId});hideDriveProgress();if(res.status==="ok"){showToast("File berhasil dihapus.","success");renderPedomanList();}else{showToast("Gagal menghapus: "+(res.message||"Error"),"error");}}catch(err){hideDriveProgress();showToast("Gagal menghapus: "+err.message,"error");}
}
async function exportPedomanBackup(){showToast("File pedoman tersimpan di Google Drive — bisa diakses dari device mana saja tanpa export.","info");}
async function importPedomanBackup(event){showToast("Import tidak diperlukan. Data sudah terpusat di Google Drive.","info");if(event&&event.target)event.target.value="";}

/* DOKUMENTASI FOTO — Google Drive */
let currentDokFolder="hra_ih";
const DOK_FOLDER_LABELS={hra_ih:"HRA & IH",dat:"DAT",pest_rodent:"Pest & Rodent"};
const DOK_MODULE_MAP={hra_ih:"dok_hra_ih",dat:"dok_dat",pest_rodent:"dok_pest"};

function switchDokFolder(btn){document.querySelectorAll(".dok-tab").forEach(t=>t.classList.remove("active"));btn.classList.add("active");currentDokFolder=btn.dataset.folder;document.getElementById("dok-folder-name").textContent=DOK_FOLDER_LABELS[currentDokFolder]||currentDokFolder;renderDokGallery();}

async function handleDokUpload(event){
  if(!guardAdmin("Upload ditolak. Hanya Admin yang dapat mengupload foto.")){event.target.value="";return;}
  const files=event.target.files;if(!files||!files.length)return;
  const validTypes=["image/jpeg","image/png","image/webp","image/gif"];
  const module=DOK_MODULE_MAP[currentDokFolder]||"dok_hra_ih";
  let uploadedCount=0;
  for(const file of files){
    if(!validTypes.includes(file.type)){showToast("Format tidak didukung: "+file.name,"error");continue;}
    if(file.size>10*1024*1024){showToast("File terlalu besar (maks 10 MB): "+file.name,"error");continue;}
    showDriveProgress("Mengupload "+file.name+"...");
    try{
      const base64=await fileToBase64(file);
      const res=await gasPost({action:"driveUpload",token:getToken(),module:module,filename:file.name,mimeType:file.type,dataBase64:base64,meta:{nama:file.name,kategori:DOK_FOLDER_LABELS[currentDokFolder],keterangan:""}});
      if(res.status==="ok")uploadedCount++;
      else showToast("Gagal upload "+file.name+": "+(res.message||"Error"),"error");
    }catch(err){showToast("Gagal upload "+file.name+": "+err.message,"error");}
  }
  hideDriveProgress();event.target.value="";
  if(uploadedCount>0){showToast(uploadedCount+" foto berhasil diupload ke Google Drive!","success");renderDokGallery();}
}

async function renderDokGallery(){
  if(!isSessionValid())return;
  const module=DOK_MODULE_MAP[currentDokFolder]||"dok_hra_ih";
  const grid=document.getElementById("dokGrid");const empty=document.getElementById("dokEmpty");
  grid.querySelectorAll(".dok-card").forEach(c=>c.remove());if(empty)empty.style.display="none";
  const loadEl=document.createElement("div");loadEl.id="dokLoadingEl";loadEl.style.cssText="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);font-weight:700";loadEl.innerHTML='<i class="fas fa-circle-notch fa-spin" style="font-size:28px;color:#1565C0;margin-bottom:12px;display:block"></i>Memuat foto dari Google Drive...';grid.appendChild(loadEl);
  try{
    const res=await gasPost({action:"driveList",token:getToken(),module:module});
    const le=document.getElementById("dokLoadingEl");if(le)le.remove();
    if(res.status!=="ok"){showToast("Gagal memuat galeri.","error");return;}
    const fotos=res.files||[];
    document.getElementById("dok-count").textContent=fotos.length;
    document.getElementById("dok-folder-name").textContent=DOK_FOLDER_LABELS[currentDokFolder];
    document.getElementById("dok-last").textContent=fotos.length?fotos[0].uploadDate:"—";
    if(!fotos.length){if(empty)empty.style.display="flex";return;}
    fotos.forEach(f=>{
      const card=document.createElement("div");card.className="dok-card";
      const thumbUrl=f.previewUrl||"";
      const downloadU=f.downloadUrl||f.viewUrl||"#";
      const viewU=f.viewUrl||"#";
      const sizeMB=f.sizeBytes?(Number(f.sizeBytes)/1024/1024).toFixed(1):"?";
      const fIdEsc=String(f.id).replace(/'/g,"\\'");
      const viewUEsc=viewU.replace(/'/g,"\\'");
      const namaEsc=(f.nama||"").replace(/'/g,"\\'");
      const ketEsc=(f.keterangan||"").replace(/'/g,"\\'");
      const dtEsc=(f.uploadDate||"").replace(/'/g,"\\'");
      const tmEsc=(f.uploadTime||"").replace(/'/g,"\\'");
      const adminUI=isAdmin();
      card.innerHTML=`<div class="dok-card-img-wrap" onclick="viewDokFoto('${fIdEsc}','${viewUEsc}','${namaEsc}','${ketEsc}','${dtEsc}','${tmEsc}')"><img src="${esc(thumbUrl)}" alt="${esc(f.nama)}" class="dok-card-img" loading="lazy" onerror="this.style.display='none';this.parentNode.querySelector('.dok-img-fallback').style.display='flex'"><div class="dok-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:#EEF2F7;flex-direction:column;gap:8px;color:var(--text-muted)"><i class="fas fa-image" style="font-size:32px;opacity:.3"></i><span style="font-size:11px;font-weight:700">Preview Drive</span></div><div class="dok-img-overlay"><i class="fas fa-expand"></i></div></div><div class="dok-card-body"><div class="dok-card-filename" title="${esc(f.filename)}">${esc(f.nama||f.filename)}</div><div class="dok-card-keterangan-wrap${adminUI?"":" viewer-readonly"}"><textarea class="dok-keterangan-input" id="ket-${fIdEsc}" placeholder="${adminUI?"Tambahkan keterangan...":"(keterangan)"}"${adminUI?"":" readonly"}>${esc(f.keterangan||"")}</textarea>${adminUI?`<button class="dok-save-ket" onclick="saveDokKeterangan('${fIdEsc}')" title="Simpan"><i class="fas fa-floppy-disk"></i></button>`:""}</div><div class="dok-card-meta"><span><i class="fas fa-calendar fa-xs"></i> ${esc(f.uploadDate||"")}</span><span><i class="fas fa-weight-hanging fa-xs"></i> ${sizeMB} MB</span><span><i class="fas fa-user fa-xs"></i> ${esc(f.uploadedBy||"")}</span></div><div class="dok-card-actions"><a class="btn-pedoman-view" href="${downloadU}" target="_blank" style="text-decoration:none"><i class="fas fa-download"></i> Download</a>${adminUI?`<button class="btn-pedoman-del" onclick="deleteDokFoto('${fIdEsc}')" title="Hapus"><i class="fas fa-trash"></i></button>`:""}</div></div>`;
      grid.appendChild(card);
    });
  }catch(err){const le=document.getElementById("dokLoadingEl");if(le)le.remove();showToast("Gagal memuat galeri: "+err.message,"error");if(empty)empty.style.display="flex";}
}

function viewDokFoto(fileId,viewUrl,nama,keterangan,uploadDate,uploadTime){
  const existing=document.getElementById("dokFotoModal");if(existing)existing.remove();
  const modal=document.createElement("div");modal.id="dokFotoModal";
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;flex-direction:column;gap:14px";
  modal.innerHTML=`<div style="max-width:90vw;max-height:78vh;display:flex;align-items:center;justify-content:center;background:#333;border-radius:10px;overflow:hidden;min-width:320px;min-height:200px"><iframe src="${esc(viewUrl)}" style="width:80vw;max-width:900px;height:70vh;border:none;display:block" title="${esc(nama)}"></iframe></div><div style="text-align:center;color:#fff"><div style="font-weight:700;font-size:14px">${esc(nama)}</div>${keterangan?`<div style="font-size:13px;opacity:.8;margin-top:4px">${esc(keterangan)}</div>`:""}<div style="font-size:12px;opacity:.6;margin-top:4px">${esc(uploadDate)} ${esc(uploadTime)}</div></div><button onclick="document.getElementById('dokFotoModal').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:8px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700"><i class="fas fa-xmark"></i> Tutup</button>`;
  modal.addEventListener("click",ev=>{if(ev.target===modal)modal.remove();});
  document.body.appendChild(modal);
}

async function saveDokKeterangan(fileId){
  if(!guardAdmin("Edit ditolak. Hanya Admin yang dapat menyimpan keterangan."))return;
  const el=document.getElementById("ket-"+fileId);if(!el)return;
  try{const res=await gasPost({action:"driveUpdateMeta",token:getToken(),fileId:fileId,meta:{keterangan:el.value.trim()}});if(res.status==="ok"){el.style.borderColor="#43A047";setTimeout(()=>{el.style.borderColor="";},1800);showToast("Keterangan disimpan.","success");}else{showToast("Gagal simpan keterangan.","error");}}catch(err){showToast("Gagal: "+err.message,"error");}
}

async function deleteDokFoto(fileId){
  if(!guardAdmin("Hapus ditolak. Hanya Admin yang dapat menghapus foto."))return;
  if(!confirm("Yakin ingin menghapus foto ini dari Google Drive?"))return;
  showDriveProgress("Menghapus foto...");
  try{const res=await gasPost({action:"driveDelete",token:getToken(),fileId:fileId});hideDriveProgress();if(res.status==="ok"){showToast("Foto berhasil dihapus.","success");renderDokGallery();}else{showToast("Gagal menghapus: "+(res.message||"Error"),"error");}}catch(err){hideDriveProgress();showToast("Gagal: "+err.message,"error");}
}
async function exportDokumentasiBackup(){showToast("Foto tersimpan terpusat di Google Drive — bisa diakses dari semua device.","info");}
async function importDokumentasiBackup(event){showToast("Import tidak diperlukan. Foto sudah tersimpan di Google Drive.","info");if(event&&event.target)event.target.value="";}
