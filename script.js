/* HSE Marine Dashboard — script.js v4.0 DRIVE INTEGRATION */
/* ✅ HRA, DAT, Pest tetap dari Google Sheets                         */
/* ✅ Pedoman PDF & Foto Dokumentasi → Google Drive (multi-device)    */
/* ✅ IndexedDB dihapus — data terpusat di GAS/Drive                  */

const API_URL = "https://script.google.com/macros/s/AKfycbwnnGVhP8TfR6aYQQIDoSCu7TruvlBe319S9zm45ZXTeGamP-RXEv2unvnSlzdob8o7cw/exec";

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
function saveSession(data,token){sessionStorage.setItem("ppn_token",token);sessionStorage.setItem("ppn_user",JSON.stringify({displayName:data.displayName,role:data.role}));sessionStorage.setItem("ppn_login_time",Date.now().toString());}
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
    if(data.status==="ok"){loginAttempts=0;localStorage.removeItem("ppn_locked_until");saveSession(data,data.token);document.getElementById("loginError").style.display="none";document.getElementById("loginOverlay").classList.add("hidden");document.getElementById("sidebarUsername").textContent=data.displayName;applyRoleUI();loadData();}
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
  if(roleEl)roleEl.textContent=admin?"Admin":"Viewer";
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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Barlow+Condensed:wght@500;600;700;800&display=swap');

:root {
  --sidebar-w: 248px;
  --topbar-h: 62px;
  --primary:       #0D47A1;
  --primary-mid:   #1565C0;
  --primary-light: #1976D2;
  --primary-glow:  #1E88E5;
  --accent:        #E53935;
  --accent2:       #FF6F00;
  --sidebar-bg:    #0D2E5E;
  --sidebar-dark:  #071E45;
  --sidebar-active:#1565C0;
  --sidebar-hover: rgba(255,255,255,0.08);
  --bg:            #EEF2F7;
  --bg-card:       #FFFFFF;
  --text:          #1A2332;
  --text-muted:    #5E7390;
  --border:        #DDE3EC;
  --font:          'Plus Jakarta Sans', sans-serif;
  --font2:         'Barlow Condensed', sans-serif;
  --radius:        12px;
  --radius-sm:     8px;
  --shadow:        0 4px 20px rgba(13,46,94,0.12);
  --shadow-card:   0 2px 10px rgba(0,0,0,0.06);
  --card-blue:     linear-gradient(135deg,#0D47A1 0%,#1976D2 100%);
  --card-orange:   linear-gradient(135deg,#BF360C 0%,#F4511E 100%);
  --card-green:    linear-gradient(135deg,#1B5E20 0%,#388E3C 100%);
  --card-red:      linear-gradient(135deg,#B71C1C 0%,#E53935 100%);
  --card-teal:     linear-gradient(135deg,#004D40 0%,#00897B 100%);
  --card-purple:   linear-gradient(135deg,#4A148C 0%,#7B1FA2 100%);
  --card-indigo:   linear-gradient(135deg,#1A237E 0%,#3949AB 100%);
}

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html, body { height:100%; font-family:var(--font); background:var(--bg); color:var(--text); font-size:14px; }
::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-thumb { background:#C5CFD6; border-radius:99px; }
::-webkit-scrollbar-track { background:transparent; }

/* ══════════════════════════════════════
   LOGIN PAGE — Maritime Hero Split
══════════════════════════════════════ */
.login-overlay {
  position:fixed; inset:0; z-index:999;
  display:flex; overflow:hidden;
}
.login-overlay.hidden { display:none; }

/* Animated waves background */
.login-bg-waves {
  position:absolute; inset:0; pointer-events:none; overflow:hidden;
}
.wave {
  position:absolute; bottom:0; left:0; width:200%; height:200px;
  background:rgba(255,255,255,0.04);
  border-radius:50% 50% 0 0;
  animation:waveAnim 8s ease-in-out infinite;
}
.wave2 { animation-delay:2s; animation-duration:10s; height:160px; background:rgba(255,255,255,0.03); }
.wave3 { animation-delay:4s; animation-duration:7s; height:120px; background:rgba(255,255,255,0.02); }
@keyframes waveAnim {
  0%,100% { transform:translateX(0) scaleY(1); }
  50%      { transform:translateX(-5%) scaleY(1.15); }
}

/* Left hero panel */
.login-left {
  flex:1; min-width:0;
  background:linear-gradient(160deg, #071E45 0%, #0D2E5E 40%, #1565C0 100%);
  display:flex; align-items:center; justify-content:center;
  padding:48px; position:relative; overflow:hidden;
}

.login-bg-photo {
  position:absolute; inset:0; z-index:0;
  width:100%; height:100%; object-fit:cover; object-position:center;
  display:block;
}
.login-bg-overlay {
  position:absolute; inset:0; z-index:1;
  background:linear-gradient(160deg, rgba(7,30,69,0.80) 0%, rgba(13,46,94,0.75) 40%, rgba(21,101,192,0.68) 100%);
}



.login-hero-content { position:relative; z-index:3; max-width:440px; }

.login-logo-top {
  display:flex; align-items:center; gap:16px; margin-bottom:52px;
}
.login-anchor-icon {
  width:52px; height:52px; border-radius:14px;
  background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2);
  display:flex; align-items:center; justify-content:center;
  font-size:22px; color:#fff; flex-shrink:0;
  backdrop-filter:blur(4px);
}
.tagline-main { display:block; font-size:12px; font-weight:700; color:rgba(255,255,255,0.9); letter-spacing:1.5px; }
.tagline-sub  { display:block; font-size:11px; color:rgba(255,255,255,0.5); margin-top:2px; letter-spacing:.5px; }

.login-hero-title {
  font-family:var(--font2);
  font-size:62px; font-weight:800; line-height:.95;
  color:#fff; letter-spacing:-1px;
  text-shadow:0 4px 24px rgba(0,0,0,0.3);
  margin-bottom:20px;
}
.login-hero-desc {
  font-size:14px; color:rgba(255,255,255,0.65);
  line-height:1.7; max-width:360px; margin-bottom:48px;
}

.login-stats-row { display:flex; align-items:center; gap:0; }
.login-stat { text-align:center; padding:0 28px; }
.login-stat:first-child { padding-left:0; }
.ls-num { display:block; font-family:var(--font2); font-size:36px; font-weight:800; color:#fff; line-height:1; }
.ls-lbl { display:block; font-size:11px; color:rgba(255,255,255,0.5); margin-top:4px; letter-spacing:.5px; text-transform:uppercase; }
.login-stat-div { width:1px; height:36px; background:rgba(255,255,255,0.15); }

/* Right login form */
.login-right {
  width:460px; flex-shrink:0;
  background:#fff; display:flex; align-items:center; justify-content:center;
  padding:40px;
  box-shadow:-8px 0 40px rgba(0,0,0,0.15);
}
.login-card { width:100%; max-width:380px; }

.login-card-header {
  display:flex; align-items:center; gap:14px;
  padding-bottom:24px; border-bottom:1px solid var(--border);
  margin-bottom:28px;
}
.login-card-icon {
  width:46px; height:46px; border-radius:12px;
  background:linear-gradient(135deg,#0D47A1,#1976D2);
  display:flex; align-items:center; justify-content:center;
  font-size:20px; color:#fff; flex-shrink:0;
  box-shadow:0 4px 14px rgba(13,71,161,0.35);
}
.login-brand-title { font-size:15px; font-weight:800; color:var(--text); }
.login-brand-sub   { font-size:11px; color:var(--text-muted); margin-top:2px; }

.login-body { }
.login-heading { font-size:22px; font-weight:800; color:var(--text); margin-bottom:4px; }
.login-sub     { font-size:13px; color:var(--text-muted); margin-bottom:24px; }

.login-error {
  display:flex; align-items:center; gap:8px;
  background:#FFEBEE; border:1px solid #FFCDD2; color:#C62828;
  padding:10px 14px; border-radius:var(--radius-sm);
  font-size:13px; font-weight:600; margin-bottom:18px;
}
.login-field { margin-bottom:18px; }
.login-field label {
  display:block; font-size:11px; font-weight:700; letter-spacing:.8px;
  color:var(--text-muted); text-transform:uppercase; margin-bottom:7px;
}
.login-input-wrap { position:relative; display:flex; align-items:center; }
.login-input-wrap > i { position:absolute; left:13px; color:var(--text-muted); font-size:14px; pointer-events:none; }
.login-input-wrap input {
  width:100%; padding:12px 44px 12px 40px;
  border:1.5px solid var(--border); border-radius:var(--radius-sm);
  font-family:var(--font); font-size:14px; color:var(--text);
  background:#F7F9FC; transition:border-color .15s, box-shadow .15s;
}
.login-input-wrap input:focus {
  outline:none; border-color:var(--primary-light);
  box-shadow:0 0 0 3px rgba(21,101,192,0.1); background:#fff;
}
.toggle-pw {
  position:absolute; right:10px;
  background:none; border:none; cursor:pointer;
  color:var(--text-muted); font-size:14px; padding:4px; transition:color .15s;
}
.toggle-pw:hover { color:var(--primary-light); }

.btn-login {
  width:100%; padding:13px;
  background:linear-gradient(135deg,#0D47A1,#1976D2); color:#fff;
  border:none; border-radius:var(--radius-sm);
  font-family:var(--font); font-size:14px; font-weight:700;
  cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
  transition:all .2s; margin-top:6px;
  box-shadow:0 4px 16px rgba(13,71,161,0.35);
}
.btn-login:hover    { background:linear-gradient(135deg,#071E45,#0D47A1); transform:translateY(-1px); box-shadow:0 6px 22px rgba(13,71,161,0.45); }
.btn-login:disabled { opacity:.6; cursor:not-allowed; transform:none; }

.login-footer {
  text-align:center; padding-top:20px; margin-top:20px;
  font-size:11px; color:var(--text-muted);
  border-top:1px solid var(--border);
  display:flex; align-items:center; justify-content:center; gap:6px;
}



@keyframes shake {
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-8px); }
  40%{ transform:translateX(8px); }
  60%{ transform:translateX(-5px); }
  80%{ transform:translateX(5px); }
}

/* ══════════════════════════════════════
   LAYOUT
══════════════════════════════════════ */
.sidebar {
  position:fixed; top:0; left:0;
  width:var(--sidebar-w); height:100vh;
  background:var(--sidebar-bg);
  display:flex; flex-direction:column;
  z-index:100;
  transition:transform .3s cubic-bezier(.4,0,.2,1);
  overflow:hidden;
  box-shadow:4px 0 24px rgba(7,30,69,0.3);
}

/* Subtle nautical top accent */
.sidebar::before {
  content:'';
  position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg, #E53935, #FF6F00, #1976D2);
}

.main { margin-left:var(--sidebar-w); min-height:100vh; display:flex; flex-direction:column; }

/* ── SIDEBAR BRAND ── */
.sidebar-brand {
  display:flex; align-items:center; gap:12px;
  padding:22px 18px 16px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.brand-icon {
  width:38px; height:38px; border-radius:10px;
  background:linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.15);
  display:flex; align-items:center; justify-content:center;
  font-size:17px; color:#fff; flex-shrink:0;
}
.brand-title { display:block; font-family:var(--font2); font-weight:700; font-size:16px; color:#fff; letter-spacing:.5px; line-height:1.2; }
.brand-sub   { display:block; font-size:10px; color:rgba(255,255,255,0.45); margin-top:2px; letter-spacing:.3px; }

/* ── SIDEBAR USER ── */
.sidebar-user {
  display:flex; align-items:center; gap:10px;
  padding:14px 18px;
  background:rgba(255,255,255,0.04);
  border-bottom:1px solid rgba(255,255,255,0.07);
}
.user-avatar {
  width:38px; height:38px; border-radius:50%;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.1));
  display:flex; align-items:center; justify-content:center;
  font-size:16px; color:#fff; font-weight:700;
  border:2px solid rgba(255,255,255,0.2); flex-shrink:0;
}
.user-name { font-weight:700; font-size:13px; color:#fff; }
.user-role { font-size:10px; color:rgba(255,255,255,0.5); margin-top:1px; }

/* ── NAV ── */
.sidebar-nav { flex:1; padding:10px 10px; overflow-y:auto; display:flex; flex-direction:column; gap:1px; }
.sidebar-nav::-webkit-scrollbar { width:0; }
.nav-label {
  font-size:9px; font-weight:700; letter-spacing:1.4px;
  color:rgba(255,255,255,0.3); padding:12px 10px 5px; text-transform:uppercase;
}
.nav-item {
  display:flex; align-items:center; gap:10px;
  padding:9px 12px; border-radius:8px;
  color:rgba(255,255,255,0.65); text-decoration:none;
  font-size:13px; font-weight:600;
  transition:all .15s; position:relative; cursor:pointer;
}
.nav-item:hover  { background:var(--sidebar-hover); color:#fff; }
.nav-item.active {
  background:linear-gradient(135deg,rgba(25,118,210,0.5),rgba(13,71,161,0.3));
  color:#fff;
  border:1px solid rgba(255,255,255,0.12);
}
.nav-item.active::before {
  content:''; position:absolute; left:0; top:50%; transform:translateY(-50%);
  width:3px; height:60%; background:linear-gradient(180deg,#42A5F5,#1976D2);
  border-radius:0 3px 3px 0;
}
.nav-icon { font-size:15px; width:18px; text-align:center; flex-shrink:0; opacity:.85; }
.nav-item.active .nav-icon { opacity:1; }
.nav-text  { flex:1; }
.nav-badge {
  font-size:9px; font-weight:700; letter-spacing:.3px;
  background:rgba(255,111,0,0.25); color:#FFCC80;
  padding:2px 8px; border-radius:20px;
  border:1px solid rgba(255,204,128,0.25);
}

/* ── SIDEBAR FOOTER ── */
.sidebar-footer {
  padding:14px 16px; border-top:1px solid rgba(255,255,255,0.08);
  font-size:11px; color:rgba(255,255,255,0.4);
}
.refresh-info { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.pulse-dot { font-size:8px; color:#69F0AE; animation:pulse 1.8s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.last-updated { font-size:10px; margin-bottom:10px; }

.btn-logout {
  width:100%;
  display:flex; align-items:center; justify-content:center; gap:8px;
  padding:9px 12px; border-radius:8px;
  background:rgba(229,57,53,0.12); color:rgba(255,255,255,0.65);
  border:1px solid rgba(229,57,53,0.2);
  font-family:var(--font); font-size:12.5px; font-weight:700;
  cursor:pointer; transition:all .18s;
}
.btn-logout:hover { background:rgba(229,57,53,0.3); color:#fff; border-color:rgba(229,57,53,0.4); }

/* ── TOPBAR ── */
.topbar {
  height:var(--topbar-h); background:#fff;
  border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  padding:0 24px; position:sticky; top:0; z-index:50;
  box-shadow:0 1px 8px rgba(13,46,94,0.07);
}
.topbar-left  { display:flex; align-items:center; gap:14px; }
.sidebar-toggle { display:none; background:none; border:none; color:var(--text-muted); font-size:18px; cursor:pointer; padding:6px; border-radius:6px; }
.page-breadcrumb { display:flex; align-items:center; gap:8px; }
.breadcrumb-home { color:var(--primary-mid); font-size:14px; }
.breadcrumb-sep  { color:#C5CFD6; font-size:12px; }
.page-title { font-size:14.5px; font-weight:700; color:var(--text); }
.topbar-right { display:flex; align-items:center; gap:8px; }
.btn-refresh {
  display:flex; align-items:center; gap:6px;
  background:linear-gradient(135deg,#0D47A1,#1976D2); color:#fff;
  border:none; padding:7px 16px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; cursor:pointer;
  font-family:var(--font); transition:all .18s;
  box-shadow:0 2px 10px rgba(13,71,161,0.3);
}
.btn-refresh:hover { background:linear-gradient(135deg,#071E45,#0D47A1); transform:translateY(-1px); }
.topbar-icon-btn {
  width:34px; height:34px; border-radius:8px;
  background:var(--bg); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  color:var(--text-muted); cursor:pointer; font-size:14px; transition:all .18s;
}
.topbar-icon-btn:hover { background:#E3F2FD; color:var(--primary-mid); }

/* ── LOADING ── */
.loading-overlay {
  position:fixed; inset:0; background:rgba(238,242,247,0.9);
  backdrop-filter:blur(4px); z-index:200;
  display:flex; align-items:center; justify-content:center;
}
.loading-inner { text-align:center; color:var(--text-muted); }
.loading-ship {
  font-size:36px; color:var(--primary-mid);
  animation:shipBob 1.8s ease-in-out infinite;
  margin-bottom:10px;
}
@keyframes shipBob {
  0%,100% { transform:translateY(0); }
  50%      { transform:translateY(-8px); }
}
.spinner {
  width:36px; height:36px; border:3px solid #DDEEFF;
  border-top-color:var(--primary-mid); border-radius:50%;
  animation:spin .7s linear infinite; margin:0 auto 10px;
}
@keyframes spin { to { transform:rotate(360deg); } }
.loading-inner p { font-weight:700; font-size:13px; }

/* ── ERROR ── */
.error-banner {
  display:flex; align-items:center; gap:10px;
  background:#FFF3E0; border:1px solid #FFCC80; color:#E65100;
  padding:10px 20px; margin:16px 24px 0; border-radius:var(--radius-sm); font-size:13px;
}
.error-banner button { margin-left:auto; background:none; border:none; color:#E65100; cursor:pointer; font-size:16px; }

/* ── PAGES ── */
.page-content { display:none; padding:22px 24px; flex-direction:column; gap:16px; }
.page-content.active { display:flex; }

/* ── FILTER BAR ── */
.filter-bar {
  display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:14px 18px; box-shadow:var(--shadow-card);
}
.filter-group { display:flex; flex-direction:column; gap:5px; }
.filter-group label { font-size:10px; font-weight:700; letter-spacing:.8px; color:var(--text-muted); text-transform:uppercase; }
.filter-group select,
.filter-group input {
  background:#F7F9FC; border:1.5px solid var(--border); color:var(--text);
  padding:7px 12px; border-radius:var(--radius-sm);
  font-family:var(--font); font-size:13px; min-width:138px; transition:border-color .15s;
}
.filter-group select:focus,
.filter-group input:focus { outline:none; border-color:var(--primary-light); }
.btn-clear {
  background:#FFF3E0; border:1.5px solid #FFCC80;
  color:#E65100; padding:7px 14px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; cursor:pointer;
  font-family:var(--font); transition:all .18s; display:flex; align-items:center; gap:6px;
}
.btn-clear:hover { background:#E65100; color:#fff; border-color:#E65100; }

/* ── KPI CARDS ── */
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(182px,1fr)); gap:12px; }
.kpi-card {
  border-radius:var(--radius); padding:18px 20px;
  display:flex; align-items:center; gap:14px;
  position:relative; overflow:hidden;
  box-shadow:var(--shadow); transition:transform .2s, box-shadow .2s;
}
.kpi-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.18); }
.kpi-card.blue   { background:var(--card-blue); }
.kpi-card.orange { background:var(--card-orange); }
.kpi-card.green  { background:var(--card-green); }
.kpi-card.red    { background:var(--card-red); }
.kpi-card.teal   { background:var(--card-teal); }
.kpi-card.purple { background:var(--card-purple); }
.kpi-card.indigo { background:var(--card-indigo); }
/* Decorative geometry */
.kpi-card::after  { content:''; position:absolute; right:-22px; top:-22px; width:110px; height:110px; border-radius:50%; background:rgba(255,255,255,0.07); }
.kpi-card::before { content:''; position:absolute; right:14px; bottom:-28px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); }
.kpi-icon {
  width:48px; height:48px; border-radius:12px;
  background:rgba(255,255,255,0.18);
  display:flex; align-items:center; justify-content:center;
  font-size:20px; color:#fff; flex-shrink:0; z-index:1;
}
.kpi-body  { z-index:1; }
.kpi-value { font-size:26px; font-weight:800; color:#fff; line-height:1.1; letter-spacing:-.5px; font-family:var(--font2); }
.kpi-label { font-size:11px; color:rgba(255,255,255,0.78); margin-top:3px; font-weight:600; letter-spacing:.2px; }
.kpi-link {
  position:absolute; top:10px; right:10px; z-index:2;
  background:rgba(255,255,255,0.18); color:#fff;
  font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px;
  text-decoration:none; letter-spacing:.3px; transition:background .15s;
}
.kpi-link:hover { background:rgba(255,255,255,0.32); }

/* ── CHART ROW ── */
.chart-row { display:grid; grid-template-columns:1fr 330px; gap:14px; }
.chart-card {
  background:#fff; border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-card); overflow:hidden;
}
.chart-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:13px 18px 10px; border-bottom:1px solid var(--border);
}
.chart-title { font-size:13.5px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px; }
.chart-title i { color:var(--primary-mid); }
.chart-body { padding:14px 18px 16px; height:240px; position:relative; }
.pill-group { display:flex; gap:4px; }
.pill {
  padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700;
  border:1px solid var(--border); background:var(--bg); color:var(--text-muted);
  cursor:pointer; transition:all .15s; font-family:var(--font);
}
.pill.active, .pill:hover { background:var(--primary-mid); color:#fff; border-color:var(--primary-mid); }

/* ── BOTTOM ROW ── */
.bottom-row { display:grid; grid-template-columns:272px 1fr; gap:14px; }
.hazard-card {
  background:#fff; border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-card); overflow:hidden;
  display:flex; flex-direction:column;
}
.hazard-list   { padding:10px 12px 12px; display:flex; flex-direction:column; gap:6px; flex:1; }
.hazard-item   {
  display:flex; align-items:center; gap:10px;
  padding:9px 12px; background:var(--bg); border-radius:7px;
  border:1px solid var(--border); transition:border-color .15s;
}
.hazard-item:hover { border-color:#BBDEFB; }
.hazard-rank   { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0; }
.hazard-rank.r1 { background:#FFEBEE; color:#C62828; }
.hazard-rank.r2 { background:#FFF3E0; color:#E65100; }
.hazard-rank.r3 { background:#E3F2FD; color:#1565C0; }
.hazard-rank.r4 { background:#E8F5E9; color:#2E7D32; }
.hazard-rank.r5 { background:#F3E5F5; color:#6A1B9A; }
.hazard-name  { flex:1; font-size:12.5px; font-weight:600; color:var(--text); }
.hazard-count { font-family:var(--font2); font-size:12px; color:#fff; background:var(--primary-mid); padding:2px 8px; border-radius:20px; font-weight:700; }
.hazard-empty { text-align:center; color:var(--text-muted); font-size:13px; padding:20px; }

/* ── TABLE CARD ── */
.table-card {
  background:#fff; border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-card); overflow:hidden; display:flex; flex-direction:column;
}
.search-input {
  background:var(--bg); border:1.5px solid var(--border); color:var(--text);
  padding:6px 12px; border-radius:var(--radius-sm);
  font-family:var(--font); font-size:12.5px; width:190px; transition:border-color .15s;
}
.search-input:focus { outline:none; border-color:var(--primary-light); }
.table-wrap { overflow-x:auto; overflow-y:auto; max-height:320px; flex:1; }
.data-table  { width:100%; border-collapse:collapse; font-size:13px; }
.data-table thead th {
  background:#F0F4FA; color:var(--text-muted);
  font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px;
  padding:10px 14px; text-align:left; cursor:pointer; white-space:nowrap;
  border-bottom:1.5px solid var(--border); user-select:none; transition:color .15s;
  position:sticky; top:0; z-index:5;
}
.data-table thead th:hover { color:var(--primary-mid); }
.data-table tbody tr { border-bottom:1px solid #F0F4F8; transition:background .12s; }
.data-table tbody tr:hover { background:#F0F7FF; }
.data-table tbody td { padding:10px 14px; color:var(--text); white-space:nowrap; }
.table-footer { padding:10px 16px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted); background:#FAFBFC; }

/* ── BADGES ── */
.badge       { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
.badge-done  { background:#E8F5E9; color:#2E7D32; }
.badge-belum { background:#FFF3E0; color:#E65100; }
.badge-neg   { background:#E8F5E9; color:#2E7D32; }
.badge-pos   { background:#FFEBEE; color:#C62828; }

/* ── STAT ROW ── */
.stat-row  { padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
.stat-item { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg); border-radius:var(--radius-sm); border:1px solid var(--border); }
.stat-label { font-size:12px; font-weight:600; color:var(--text-muted); }
.stat-val   { font-family:var(--font2); font-size:20px; font-weight:700; color:#C62828; }

/* ── PLACEHOLDER ── */
.placeholder-page {
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:80px 24px; text-align:center; color:var(--text-muted);
}
.placeholder-icon { font-size:54px; margin-bottom:20px; opacity:.18; color:var(--primary); }
.placeholder-page h2 { font-size:22px; color:var(--text); font-weight:800; margin-bottom:10px; }
.placeholder-page p  { font-size:14px; line-height:1.7; max-width:360px; margin-bottom:20px; }
.placeholder-tag {
  display:inline-block; background:#E3F2FD; color:var(--primary-mid);
  border:1px solid #90CAF9; padding:5px 18px; border-radius:20px;
  font-size:12px; font-weight:700; letter-spacing:.5px;
}

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media(max-width:1100px){ .chart-row { grid-template-columns:1fr; } .bottom-row { grid-template-columns:1fr; } }
@media(max-width:900px){
  .login-left { display:none; }
  .login-right { width:100%; box-shadow:none; }
}
@media(max-width:768px){
  .sidebar { transform:translateX(-100%); }
  .sidebar.open { transform:translateX(0); box-shadow:0 0 40px rgba(0,0,0,0.4); }
  .main { margin-left:0; }
  .sidebar-toggle { display:flex; }
  .kpi-grid { grid-template-columns:1fr 1fr; }
  .page-content { padding:16px; }
}
@media(max-width:480px){ .kpi-grid { grid-template-columns:1fr; } .topbar { padding:0 14px; } }
.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:90; }
.sidebar-overlay.show { display:block; }

/* ══════════════════════════════════════
   PEDOMAN IH — PDF Portal
══════════════════════════════════════ */
.pedoman-header-bar {
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px;
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:20px 22px; box-shadow:var(--shadow-card);
}
.pedoman-title { font-size:18px; font-weight:800; color:var(--text); margin-bottom:4px; }
.pedoman-sub   { font-size:13px; color:var(--text-muted); }

.btn-upload-pdf {
  display:inline-flex; align-items:center; gap:8px; cursor:pointer;
  background:linear-gradient(135deg,#0D47A1,#1976D2); color:#fff;
  padding:9px 18px; border-radius:var(--radius-sm);
  font-size:13px; font-weight:700; font-family:var(--font);
  box-shadow:0 3px 10px rgba(13,71,161,0.3);
  transition:all .18s; border:none;
}
.btn-upload-pdf:hover { background:linear-gradient(135deg,#071E45,#0D47A1); transform:translateY(-1px); }

.btn-export-data {
  display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  background:#E8F5E9; color:#2E7D32;
  padding:9px 16px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; font-family:var(--font);
  border:1.5px solid #A5D6A7; transition:all .18s;
}
.btn-export-data:hover { background:#2E7D32; color:#fff; border-color:#2E7D32; transform:translateY(-1px); }

.btn-import-data {
  display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  background:#FFF3E0; color:#E65100;
  padding:9px 16px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; font-family:var(--font);
  border:1.5px solid #FFCC80; transition:all .18s;
}
.btn-import-data:hover { background:#E65100; color:#fff; border-color:#E65100; transform:translateY(-1px); }

.pedoman-info-banner {
  display:flex; align-items:flex-start; gap:10px;
  background:#E3F2FD; border:1px solid #90CAF9; color:#1565C0;
  padding:12px 18px; border-radius:var(--radius-sm);
  font-size:13px; font-weight:600; line-height:1.5;
}
.pedoman-info-banner i { font-size:16px; margin-top:1px; flex-shrink:0; }

.pedoman-search-bar {
  display:flex; gap:12px; flex-wrap:wrap;
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:14px 18px; box-shadow:var(--shadow-card);
}
.pedoman-search-wrap { flex:1; min-width:200px; position:relative; display:flex; align-items:center; }
.pedoman-search-wrap > i { position:absolute; left:12px; color:var(--text-muted); font-size:14px; }
.pedoman-search-wrap input {
  width:100%; padding:9px 12px 9px 36px;
  border:1.5px solid var(--border); border-radius:var(--radius-sm);
  font-family:var(--font); font-size:13.5px; color:var(--text); background:#F7F9FC;
  transition:border-color .15s;
}
.pedoman-search-wrap input:focus { outline:none; border-color:var(--primary-light); }
.pedoman-search-bar select {
  padding:9px 14px; border:1.5px solid var(--border); border-radius:var(--radius-sm);
  font-family:var(--font); font-size:13px; color:var(--text); background:#F7F9FC;
  min-width:160px; transition:border-color .15s;
}
.pedoman-search-bar select:focus { outline:none; border-color:var(--primary-light); }

.pedoman-stats-row { display:flex; gap:12px; flex-wrap:wrap; }
.pedoman-stat-card {
  flex:1; min-width:140px;
  display:flex; align-items:center; gap:14px;
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  padding:16px 20px; box-shadow:var(--shadow-card); font-size:22px;
}
.pedoman-stat-num { font-size:22px; font-weight:800; color:var(--text); line-height:1; }
.pedoman-stat-lbl { font-size:10px; color:var(--text-muted); font-weight:700; margin-top:3px; text-transform:uppercase; letter-spacing:.6px; }

.pedoman-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; }
.pedoman-empty {
  grid-column:1/-1; flex-direction:column; align-items:center; justify-content:center;
  padding:60px 24px; text-align:center; display:flex;
}
.pedoman-card {
  background:#fff; border:1px solid var(--border); border-radius:var(--radius);
  box-shadow:var(--shadow-card); padding:18px 20px;
  display:flex; flex-direction:column; gap:12px;
  transition:transform .18s, box-shadow .18s;
}
.pedoman-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(13,46,94,0.12); }
.pedoman-card-top  { display:flex; align-items:flex-start; gap:14px; }
.pedoman-pdf-icon  {
  width:48px; height:48px; border-radius:12px;
  background:linear-gradient(135deg,#B71C1C,#EF5350);
  display:flex; align-items:center; justify-content:center;
  font-size:22px; color:#fff; flex-shrink:0;
  box-shadow:0 4px 12px rgba(183,28,28,0.28);
}
.pedoman-card-info { flex:1; min-width:0; }
.pedoman-card-name {
  font-size:13.5px; font-weight:700; color:var(--text);
  line-height:1.4; margin-bottom:5px; word-break:break-word;
}
.pedoman-kat-badge {
  display:inline-block; font-size:10px; font-weight:700;
  background:#E3F2FD; color:var(--primary-mid);
  padding:2px 10px; border-radius:20px; letter-spacing:.3px;
}
.pedoman-card-meta { display:flex; gap:12px; font-size:11.5px; color:var(--text-muted); flex-wrap:wrap; }
.pedoman-card-meta span { display:flex; align-items:center; gap:4px; }
.pedoman-card-actions { display:flex; gap:8px; flex-wrap:wrap; }

.btn-pedoman-view {
  flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
  background:#E3F2FD; color:#1565C0; border:1.5px solid #BBDEFB;
  padding:8px 12px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; cursor:pointer; font-family:var(--font);
  transition:all .18s;
}
.btn-pedoman-view:hover { background:#1565C0; color:#fff; border-color:#1565C0; transform:translateY(-1px); }

.btn-pedoman-dl {
  flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
  background:linear-gradient(135deg,#0D47A1,#1976D2); color:#fff;
  border:none; padding:8px 14px; border-radius:var(--radius-sm);
  font-size:12.5px; font-weight:700; cursor:pointer; font-family:var(--font);
  transition:all .18s; box-shadow:0 2px 8px rgba(13,71,161,0.25);
}
.btn-pedoman-dl:hover { background:linear-gradient(135deg,#071E45,#0D47A1); transform:translateY(-1px); }

.btn-pedoman-del {
  width:36px; height:36px; display:flex; align-items:center; justify-content:center;
  background:#FFEBEE; color:#C62828; border:1.5px solid #FFCDD2;
  border-radius:var(--radius-sm); cursor:pointer; font-size:13px; transition:all .18s;
}
.btn-pedoman-del:hover { background:#C62828; color:#fff; border-color:#C62828; }

/* ══════════════════════════════════════
   DOKUMENTASI — Foto Gallery
══════════════════════════════════════ */
.dok-tabs {
  display:flex; gap:8px; flex-wrap:wrap;
  background:#fff; border:1px solid var(--border);
  border-radius:var(--radius); padding:12px 14px;
  box-shadow:var(--shadow-card);
}
.dok-tab {
  display:inline-flex; align-items:center; gap:8px;
  padding:9px 20px; border-radius:var(--radius-sm);
  font-size:13px; font-weight:700; font-family:var(--font);
  cursor:pointer; border:1.5px solid var(--border);
  background:var(--bg); color:var(--text-muted);
  transition:all .18s;
}
.dok-tab:hover  { background:#E3F2FD; color:var(--primary-mid); border-color:#BBDEFB; }
.dok-tab.active {
  background:linear-gradient(135deg,#0D47A1,#1976D2); color:#fff;
  border-color:transparent;
  box-shadow:0 3px 12px rgba(13,71,161,0.3);
}
.dok-tab i { font-size:14px; }

.dok-upload-area {
  background:#fff; border:2px dashed var(--border);
  border-radius:var(--radius); padding:32px 24px;
  text-align:center; box-shadow:var(--shadow-card);
  transition:border-color .2s, background .2s; cursor:pointer;
}
.dok-upload-area:hover { border-color:var(--primary-mid); background:#F0F7FF; }
.dok-upload-inner { display:flex; flex-direction:column; align-items:center; }

.dok-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
  gap:16px;
}
.dok-empty {
  grid-column:1/-1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:60px 24px; text-align:center;
}
.dok-card {
  background:#fff; border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-card);
  display:flex; flex-direction:column; overflow:hidden;
  transition:transform .18s, box-shadow .18s;
}
.dok-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(13,46,94,0.13); }

.dok-card-img-wrap {
  position:relative; width:100%; height:180px;
  overflow:hidden; cursor:pointer; background:#EEF2F7;
}
.dok-card-img {
  width:100%; height:100%; object-fit:cover; transition:transform .3s;
}
.dok-card-img-wrap:hover .dok-card-img { transform:scale(1.05); }
.dok-img-overlay {
  position:absolute; inset:0;
  background:rgba(13,46,94,0); color:#fff;
  display:flex; align-items:center; justify-content:center;
  font-size:26px;
  transition:background .2s, opacity .2s; opacity:0;
}
.dok-card-img-wrap:hover .dok-img-overlay { background:rgba(13,46,94,0.45); opacity:1; }

.dok-card-body { padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
.dok-card-filename {
  font-size:12.5px; font-weight:700; color:var(--text);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.dok-card-keterangan-wrap { display:flex; gap:6px; align-items:flex-start; }
.dok-keterangan-input {
  flex:1; resize:none; min-height:58px;
  padding:8px 10px; font-family:var(--font); font-size:12.5px;
  color:var(--text); background:#F7F9FC;
  border:1.5px solid var(--border); border-radius:var(--radius-sm);
  transition:border-color .15s; line-height:1.5;
}
.dok-keterangan-input:focus { outline:none; border-color:var(--primary-light); background:#fff; }
.dok-keterangan-input::placeholder { color:#B0BEC5; }
.dok-save-ket {
  flex-shrink:0; width:34px; height:34px;
  display:flex; align-items:center; justify-content:center;
  background:#E8F5E9; color:#2E7D32;
  border:1.5px solid #A5D6A7; border-radius:var(--radius-sm);
  cursor:pointer; font-size:15px; transition:all .18s; margin-top:2px;
}
.dok-save-ket:hover { background:#2E7D32; color:#fff; border-color:#2E7D32; }

.dok-card-meta { display:flex; gap:10px; font-size:11px; color:var(--text-muted); flex-wrap:wrap; }
.dok-card-meta span { display:flex; align-items:center; gap:4px; }
.dok-card-actions { display:flex; gap:8px; }

/* ══════════════════════════════════════
   ROLE-BASED ACCESS CONTROL UI
══════════════════════════════════════ */

/* Elemen admin-only disembunyikan via JS (applyRoleUI),
   ini sebagai fallback sebelum JS selesai load */
.admin-only { display: none; }

/* Badge role di sidebar */
.user-role {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-block;
  margin-top: 2px;
}
/* Warna badge berubah lewat JS berdasarkan role text */
.sidebar-user .user-role {
  display: none;
}

/* Viewer: textarea keterangan readonly */
.viewer-readonly .dok-keterangan-input {
  background: #F5F7FA;
  color: var(--text-muted);
  cursor: default;
  border-color: transparent;
  resize: none;
}
.viewer-readonly .dok-keterangan-input:focus {
  border-color: transparent;
  background: #F5F7FA;
}

/* Banner info role untuk viewer di halaman Pedoman & Dokumentasi */
.viewer-banner {
  display: none;
  align-items: center;
  gap: 10px;
  background: #E3F2FD;
  border: 1px solid #90CAF9;
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #1565C0;
  margin-bottom: 14px;
}
.viewer-banner i { font-size: 15px; flex-shrink: 0; }
