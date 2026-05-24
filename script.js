/* HSE Marine Dashboard — script.js v4.0 DRIVE INTEGRATION */
/* ✅ HRA, DAT, Pest tetap dari Google Sheets                         */
/* ✅ Pedoman PDF & Foto Dokumentasi → Google Drive (multi-device)    */
/* ✅ IndexedDB dihapus — data terpusat di GAS/Drive                  */

const API_URL = "https://script.google.com/macros/s/AKfycbzqCyLLFs-rLkahFThbzxIDWCpeoCjv_cvRZqw00_28Q96W6BerasPhmCaV8_Qel2lrPQ/exec";

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
function isDemo(){return getRole()==="demo";}

/* Mapping nama tampilan — override displayName dari server */
var NAME_MAP = {
  "IH Viewer": "Health3",
  "IH Admin":  "IH Admin"
};
function getMappedName(name) {
  return NAME_MAP[name] || name;
}
function saveSession(data,token){sessionStorage.setItem("ppn_token",token);sessionStorage.setItem("ppn_user",JSON.stringify({displayName:data.displayName,role:data.role}));sessionStorage.setItem("ppn_login_time",Date.now().toString());}
function clearSession(){sessionStorage.removeItem("ppn_token");sessionStorage.removeItem("ppn_user");sessionStorage.removeItem("ppn_login_time");}
function isSessionValid(){
  const token=getToken();
  const loginTime=parseInt(sessionStorage.getItem("ppn_login_time")||"0");
  if(!token)return false;
  /* Token demo lokal — selalu valid selama tab terbuka */
  if(token==="DEMO_LOCAL_TOKEN")return true;
  if(Date.now()-loginTime>8*60*60*1000){clearSession();return false;}
  return true;
}
function checkAuth(){
  const overlay=document.getElementById("loginOverlay");
  const usernameEl=document.getElementById("sidebarUsername");
  if(!overlay)return;
  if(isSessionValid()){
    const user=getSession();
    overlay.classList.add("hidden");
    if(usernameEl)usernameEl.textContent=user?getMappedName(user.displayName):"User";
    // Update avatar inisial
    var av=document.querySelector(".user-avatar");
    if(av&&user){var nm=user.displayName||"IH";var ini=nm.split(" ").map(function(w){return w[0];}).join("").toUpperCase().slice(0,2);av.innerHTML='<span style="font-size:14px;font-weight:800;color:#fff;">'+ini+'</span>';}
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
    const data=await gasPost({action:"login",username,password,deviceInfo:getDeviceInfo()});
    if(data.status==="ok"){loginAttempts=0;localStorage.removeItem("ppn_locked_until");saveSession(data,data.token);document.getElementById("loginError").style.display="none";document.getElementById("loginOverlay").classList.add("hidden");document.getElementById("sidebarUsername").textContent=getMappedName(data.displayName);applyRoleUI();loadData();}
    else if(data.status==="locked"){setLoginLockedUntil(Date.now()+15*60*1000);showLoginError(data.message||"Akun dikunci sementara.");shakeCard();}
    else{loginAttempts++;if(loginAttempts>=5){setLoginLockedUntil(Date.now()+15*60*1000);loginAttempts=0;}showLoginError(data.message||"Username atau password salah.");shakeCard();}
  }catch(err){showLoginError("Tidak dapat terhubung ke server: "+err.message);console.error("Login error:",err);}
  btn.innerHTML='<i class="fas fa-right-to-bracket"></i> Masuk';btn.disabled=false;
}
function shakeCard(){const card=document.querySelector(".login-card");card.style.animation="shake .4s ease";setTimeout(()=>{card.style.animation="";},400);}

/* ── Kumpulkan info perangkat untuk access log ── */
function getDeviceInfo(){
  var ua=navigator.userAgent||"";
  var isMob=/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  var isTab=/iPad|Android(?!.*Mobile)/i.test(ua);
  return{
    userAgent:ua,
    platform:navigator.platform||"",
    screenRes:(window.screen?window.screen.width+"x"+window.screen.height:"?"),
    deviceType:isTab?"Tablet":isMob?"Mobile":"Desktop",
    lang:navigator.language||""
  };
}

/* ── Demo Login — LANGSUNG jalan di browser, tidak perlu GAS ── */
function doDemoLogin(){
  const btn=document.getElementById("btnDemo");
  if(btn){btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Memuat...';btn.disabled=true;}

  /* Buat sesi demo lokal tanpa server call */
  clearSession();
  sessionStorage.setItem("ppn_token","DEMO_LOCAL_TOKEN");
  sessionStorage.setItem("ppn_user",JSON.stringify({displayName:"Demo User",role:"demo"}));
  sessionStorage.setItem("ppn_login_time",Date.now().toString());

  /* Sembunyikan overlay login */
  const errEl=document.getElementById("loginError");
  if(errEl)errEl.style.display="none";
  const overlay=document.getElementById("loginOverlay");
  if(overlay)overlay.classList.add("hidden");

  /* Set nama di sidebar */
  const unEl=document.getElementById("sidebarUsername");
  if(unEl)unEl.textContent="Demo User";

  /* Terapkan UI role demo (banner, sembunyikan admin elements) */
  applyRoleUI();

  /* Render halaman dengan data kosong + overlay kunci */
  loadData();

  setTimeout(function(){
    if(btn){btn.innerHTML='<i class="fas fa-eye"></i> Lihat Tampilan Demo';btn.disabled=false;}
  },300);
}

/* LOGOUT */
async function doLogout(){if(!confirm("Yakin ingin logout?"))return;const token=getToken();if(token&&!isDemo())gasPost({action:"logout",token}).catch(()=>{});var banner=document.getElementById("demoBanner");if(banner)banner.remove();var mainEl=document.querySelector(".main");if(mainEl)mainEl.style.paddingTop="";var sidebarEl=document.querySelector(".sidebar");if(sidebarEl)sidebarEl.style.top="";var topbarEl=document.querySelector(".topbar");if(topbarEl)topbarEl.style.top="";document.querySelectorAll(".demo-overlay").forEach(function(el){el.remove();});clearSession();const unEl=document.getElementById("loginUsername");const pwEl=document.getElementById("loginPassword");const errEl=document.getElementById("loginError");const overlay=document.getElementById("loginOverlay");if(unEl)unEl.value="";if(pwEl)pwEl.value="";if(errEl)errEl.style.display="none";if(overlay)overlay.classList.remove("hidden");}
function showLoginError(msg){document.getElementById("loginErrorMsg").textContent=msg;document.getElementById("loginError").style.display="flex";}
function togglePassword(){const input=document.getElementById("loginPassword");const icon=document.getElementById("togglePwIcon");if(input.type==="password"){input.type="text";icon.className="fas fa-eye-slash";}else{input.type="password";icon.className="fas fa-eye";}}

/* ROLE UI */
function applyRoleUI(){
  const admin=isAdmin();
  const demo=isDemo();

  /* Admin-only elements */
  document.querySelectorAll(".admin-only").forEach(el=>{
    const tag=el.tagName.toLowerCase();
    el.style.display=(admin&&!demo)?(tag==="label"||tag==="button"||tag==="a"?"inline-flex":"flex"):"none";
  });
  /* Viewer-only elements */
  document.querySelectorAll(".viewer-only").forEach(el=>{
    const tag=el.tagName.toLowerCase();
    el.style.display=(!admin&&!demo)?(tag==="label"||tag==="button"||tag==="a"?"inline-flex":"flex"):"none";
  });
  /* Role badge */
  const roleEl=document.querySelector(".user-role");
  if(roleEl){roleEl.textContent=admin?"Admin":demo?"Demo":"Viewer";roleEl.style.display="none";}

  /* Avatar inisial */
  var avatarEl=document.querySelector(".user-avatar");
  if(avatarEl){
    var uname=document.getElementById("sidebarUsername");
    var name=uname?uname.textContent:"IH";
    var initials=name.split(" ").map(function(w){return w[0];}).join("").toUpperCase().slice(0,2);
    avatarEl.innerHTML='<span style="font-size:14px;font-weight:800;color:#fff;">'+initials+'</span>';
  }

  /* ── DEMO MODE ── */
  var existingBanner=document.getElementById("demoBanner");
  if(demo){
    if(!existingBanner){
      var banner=document.createElement("div");
      banner.id="demoBanner";
      banner.innerHTML='<i class="fas fa-eye" style="margin-right:7px"></i>'
        +'<strong>MODE DEMO</strong> &mdash; Data tidak ditampilkan. '
        +'<a href="#" onclick="doLogout();return false;" '
        +'style="color:#fff;font-weight:800;text-decoration:underline;margin-left:8px">'
        +'Login untuk akses penuh &rarr;</a>';
      banner.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9998;"
        +"background:linear-gradient(90deg,#d97706,#f59e0b);color:#1a1a1a;"
        +"text-align:center;padding:11px 16px;font-size:13px;font-weight:600;"
        +"letter-spacing:.2px;box-shadow:0 2px 12px rgba(0,0,0,.2);";
      document.body.prepend(banner);
      var mainEl=document.querySelector(".main");
      if(mainEl)mainEl.style.paddingTop="44px";
      var sidebarEl=document.querySelector(".sidebar");
      if(sidebarEl)sidebarEl.style.top="44px";
      /* Mobile: topbar is sticky, geser ke bawah banner */
      var topbarEl=document.querySelector(".topbar");
      if(topbarEl)topbarEl.style.top="44px";
    }
    setTimeout(applyDemoOverlay,400);
  } else {
    if(existingBanner){
      existingBanner.remove();
      var mainEl2=document.querySelector(".main");
      if(mainEl2)mainEl2.style.paddingTop="";
      var sidebarEl2=document.querySelector(".sidebar");
      if(sidebarEl2)sidebarEl2.style.top="";
    }
    document.querySelectorAll(".demo-overlay").forEach(function(el){el.remove();});
  }
}

/* Pasang overlay kunci di setiap card saat mode demo */
function applyDemoOverlay(){
  if(!isDemo())return;
  document.querySelectorAll(".chart-card,.table-card,.kpi-card,.hazard-card").forEach(function(el){
    if(el.querySelector(".demo-overlay"))return;
    el.style.position="relative";
    var ov=document.createElement("div");
    ov.className="demo-overlay";
    ov.innerHTML='<div class="demo-overlay-inner">'
      +'<i class="fas fa-lock"></i>'
      +'<span>Data Tersembunyi</span>'
      +'<small>Login untuk melihat data lengkap</small>'
      +'</div>';
    el.appendChild(ov);
  });
}

/* VIEWER GUARD — blokir action write jika bukan admin */
function guardAdmin(msg){
  if(!isAdmin()){showToast(msg||"Akses ditolak. Hanya Admin yang dapat melakukan aksi ini.","error");return false;}
  return true;
}


const TOTAL_KAPAL=85;
const BULAN_ORDER=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
let rawHRA=[],rawDAT=[],rawPest=[],filteredHRA=[],filteredDAT=[],filteredPest=[];
let rawFisika=[],rawKimia=[],rawBiologi=[],rawErgonomi=[],rawPsikososial=[];
let rawCloseout25=[];
let filteredFisika=[],filteredKimia=[],filteredBiologi=[],filteredErgonomi=[],filteredPsikososial=[];
let hraBarChart,hraDonutChart,datBarChart,datDonutChart,pestBarChart,pestDonutChart,pestTemuanChart,pestBiayaChart;
let fisikaBarChart,fisikaDonutChart,kimiaBarChart,kimiaDonutChart,biologiBarChart,biologiDonutChart;
let ergonomiBarChart,ergonomiDonutChart,psikoBarChart,psikoDonutChart,psikoRadarChart;
let hraSortCol=-1,hraSortDir=1,datSortCol=-1,datSortDir=1,pestSortCol=-1,pestSortDir=1;
let fisikaSortCol=-1,fisikaSortDir=1,kimiaSortCol=-1,kimiaSortDir=1,biologiSortCol=-1,biologiSortDir=1;
let ergonomiSortCol=-1,ergonomiSortDir=1,psikoSortCol=-1,psikoSortDir=1;
let hraChartType="bar",datChartType="bar",pestChartType="bar";
let fisikaChartType="bar",kimiaChartType="bar",biologiChartType="bar",ergonomiChartType="bar",psikoChartType="bar";

/* INIT */
document.addEventListener("DOMContentLoaded",()=>{
  ["loginUsername","loginPassword"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});});
  checkAuth();setupNav();setupSidebar();initMobileNav();
  if(isSessionValid()){
    loadData();
    let _autoRefreshing=false;
    let _warnShown=false;
    setInterval(()=>{
      if(isDemo())return; /* Demo mode: skip auto-refresh */
      if(!isSessionValid()){
        alert("Sesi Anda telah habis (8 jam). Silakan login kembali.");
        clearSession();
        const overlay=document.getElementById("loginOverlay");
        if(overlay)overlay.classList.remove("hidden");
        return;
      }
      /* Warning 10 menit sebelum sesi habis */
      const loginTime=parseInt(sessionStorage.getItem("ppn_login_time")||"0");
      const sisaMs=(8*60*60*1000)-(Date.now()-loginTime);
      if(!_warnShown&&sisaMs>0&&sisaMs<10*60*1000){
        _warnShown=true;
        showToast("Sesi Anda akan berakhir dalam "+Math.ceil(sisaMs/60000)+" menit. Simpan pekerjaan Anda.","warning");
      }
      if(_autoRefreshing)return;
      _autoRefreshing=true;
      loadData().finally(()=>{_autoRefreshing=false;});
    },300000);
  }
  const btnRefresh=document.getElementById("btnRefresh");
  if(btnRefresh)btnRefresh.addEventListener("click",()=>{
    if(isDemo()){showToast("Mode Demo — data tidak dapat dimuat dari server.","info");return;}
    if(isSessionValid())loadData();else alert("Sesi habis. Silakan login kembali.");
  });
  document.querySelectorAll('.nav-item[data-menu="menu6"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderPedomanList,80));});
  document.querySelectorAll('.nav-item[data-menu="dokumentasi"]').forEach(item=>{item.addEventListener("click",()=>{currentDokFolder="hra_ih";setTimeout(renderDokGallery,80);});});
  document.querySelectorAll('.nav-item[data-menu="biomonitoring"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(initBiomonitoring,80));});
  /* ── Dashboard age counter ── */
  function updateDashboardAge(){
    var start=new Date("2026-04-25T00:00:00");
    var now=new Date();
    var diff=now-start;
    var days=Math.floor(diff/(1000*60*60*24));
    var months=Math.floor(days/30);
    var remainDays=days-(months*30);
    var txt="";
    if(months>0&&remainDays>0) txt=months+" Bln "+remainDays+" Hari";
    else if(months>0) txt=months+" Bulan";
    else txt=days+" Hari";
    var el=document.getElementById("dashAgeText");
    if(el)el.textContent=txt;
  }
  updateDashboardAge();
  setInterval(updateDashboardAge,60000);
  document.querySelectorAll('.nav-item[data-menu="summary"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderSummaryPage,80));});
  document.querySelectorAll('.nav-item[data-menu="accesslog"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(loadAccessLog,80));});
  /* Re-apply demo overlay saat pindah halaman */
  document.querySelectorAll(".nav-item").forEach(item=>{
    item.addEventListener("click",()=>{if(isDemo())setTimeout(applyDemoOverlay,250);});
  });
});

/* NAV */
function setupNav(){
  document.querySelectorAll(".nav-item").forEach(item=>{
    item.addEventListener("click",e=>{
      e.preventDefault();
      const menu=item.dataset.menu;
      const title=item.dataset.title||menu;
      const group=item.dataset.group;
      document.querySelectorAll(".page-content").forEach(p=>p.classList.remove("active"));
      document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
      const page=document.getElementById("page-"+menu);
      if(page)page.classList.add("active");
      item.classList.add("active");
      document.getElementById("pageTitle").textContent=title;
      /* Auto-open parent group if closed */
      if(group){
        const grpEl=document.getElementById("navg-"+group);
        if(grpEl&&!grpEl.classList.contains("open")){
          toggleNavGroup(group);
        }
      }
      closeSidebar();
    });
  });
  /* Restore saved group states from localStorage */
  restoreNavGroups();
}
function toggleNavGroup(id){
  const grp=document.getElementById("navg-"+id);
  if(!grp)return;
  const wasOpen=grp.classList.contains("open");
  grp.classList.toggle("open");
  /* Save state */
  try{
    const states=JSON.parse(localStorage.getItem("ppn_nav_groups")||"{}");
    states[id]=!wasOpen;
    localStorage.setItem("ppn_nav_groups",JSON.stringify(states));
  }catch(e){}
}
function restoreNavGroups(){
  try{
    const states=JSON.parse(localStorage.getItem("ppn_nav_groups")||"{}");
    ["monitoring","hazard","others"].forEach(id=>{
      const grp=document.getElementById("navg-"+id);
      if(!grp)return;
      if(states[id]===false){
        /* Only close if explicitly saved as closed AND no active item inside */
        const hasActive=grp.querySelector(".nav-item.active");
        if(!hasActive) grp.classList.remove("open");
      } else if(states[id]===true){
        grp.classList.add("open");
      }
    });
  }catch(e){}
}
function setupSidebar(){var overlay=document.getElementById("sidebarOverlay");if(overlay)overlay.addEventListener("click",closeSidebar);var tog=document.getElementById("sidebarToggle");if(tog)tog.addEventListener("click",function(){var open=document.getElementById("sidebar").classList.toggle("open");var ov=document.getElementById("sidebarOverlay");if(ov)ov.classList.toggle("show",open);});}
function closeSidebar(){document.getElementById("sidebar").classList.remove("open");document.getElementById("sidebarOverlay").classList.remove("show");}

/* ════════════════════════════════════════════════════════
   MOBILE — CONCEPT C (Teekay Navy Bold)
   Primary #0F2A4A · Accent #00C2A8
════════════════════════════════════════════════════════ */

/* Switch page via mobile nav or strip tap */
function mNavGoPage(menu,title,group){
  document.querySelectorAll(".page-content").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const page=document.getElementById("page-"+menu);
  if(page)page.classList.add("active");
  const sideItem=document.querySelector('.nav-item[data-menu="'+menu+'"]');
  if(sideItem){
    sideItem.classList.add("active");
    if(group){const grp=document.getElementById("navg-"+group);if(grp&&!grp.classList.contains("open"))toggleNavGroup(group);}
  }
  const titleEl=document.getElementById("pageTitle");
  if(titleEl)titleEl.textContent=title;
  /* Sync bottom nav */
  const mBtn=document.querySelector('.m-nav-btn[data-menu="'+menu+'"]');
  document.querySelectorAll(".m-nav-btn").forEach(b=>b.classList.remove("active"));
  if(mBtn){mBtn.classList.add("active");moveMNavPill(mBtn);}
  else{document.querySelectorAll(".m-nav-btn").forEach(b=>b.classList.remove("active"));}
  /* Update filter chips for this page */
  mUpdateFilterChips(menu);
  /* Trigger render */
  if(menu==="closeout25")setTimeout(renderCO25Page,80);
  closeSidebar();
}

function mNavClick(btn){
  const menu=btn.dataset.menu;
  const title=btn.dataset.title||menu;
  const group=btn.dataset.group||"";
  mNavGoPage(menu,title,group);
  btn.classList.add("active");
  moveMNavPill(btn);
}

function mOpenSidebar(){
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("show");
}

function moveMNavPill(activeBtn){
  const pill=document.getElementById("mNavPill");
  if(!pill||!activeBtn)return;
  const nav=document.getElementById("mBottomNav");
  if(!nav)return;
  const bR=activeBtn.getBoundingClientRect();
  const nR=nav.getBoundingClientRect();
  pill.style.left=(bR.left-nR.left+6)+"px";
  pill.style.width=(bR.width-12)+"px";
}

/* ── KPI Strip update (called after data loaded) ── */
function mUpdateKpiStrip(){
  const isMobile=window.innerWidth<=768;
  if(!isMobile)return;
  /* Coverage HRA */
  const total=85;
  const done=rawHRA?new Set(rawHRA.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size:0;
  const pct=total?Math.round(done/total*100):0;
  const cv=document.getElementById("mKpiCoverage");
  const bar=document.getElementById("mKpiBar");
  if(cv)cv.textContent=pct+"%";
  if(bar)bar.style.width=pct+"%";
  /* Total selesai (HRA done kapal) */
  const doneEl=document.getElementById("mKpiDone");
  if(doneEl)doneEl.textContent=done||"—";
  /* Closeout OPEN count */
  const openCo=filteredCO25?filteredCO25.filter(function(r){return(r.closeout||"").trim()==="OPEN";}).length:0;
  const alertEl=document.getElementById("mKpiAlert");
  if(alertEl)alertEl.textContent=openCo||"0";
}

/* ── Filter chips per halaman ── */
var M_CHIPS={
  hra:[{l:"Semua Fleet",v:""},{l:"FP I",v:"Fleet Product I"},{l:"FP II",v:"Fleet Product II"},{l:"FC",v:"Fleet Crude"},{l:"FGP",v:"Fleet Gas & Petchem"}],
  dat:[{l:"Semua Fleet",v:""},{l:"FP I",v:"Fleet Product I"},{l:"FP II",v:"Fleet Product II"},{l:"FC",v:"Fleet Crude"},{l:"FGP",v:"Fleet Gas & Petchem"}],
  pest:[{l:"Semua Lokasi",v:""},{l:"Kapal",v:"Kapal"},{l:"Kantor",v:"Kantor"},{l:"Gudang",v:"Gudang"}],
  closeout25:[{l:"HRA & IHM",v:""},{l:"HRA",v:"HRA"},{l:"IHM",v:"IHM"},{l:"CLOSE",v:"CLOSE"},{l:"OPEN",v:"OPEN"}],
  fisika:[{l:"Semua",v:""},{l:"Fisika",v:"Fisika"}],
};
var mChipActive={};

function mUpdateFilterChips(menu){
  var isMobile=window.innerWidth<=768;
  var chipsEl=document.getElementById("mFilterChips");
  if(!chipsEl)return;
  var defs=M_CHIPS[menu];
  if(!isMobile||!defs){chipsEl.style.display="none";return;}
  chipsEl.style.display="flex";
  if(!mChipActive[menu])mChipActive[menu]="";
  chipsEl.innerHTML="";
  defs.forEach(function(c){
    var isActive=mChipActive[menu]===c.v;
    var btn=document.createElement("button");
    btn.className="m-chip"+(isActive?" active":"");
    btn.textContent=c.l;
    btn.setAttribute("data-menu",menu);
    btn.setAttribute("data-val",c.v);
    btn.addEventListener("click",function(){mChipClick(btn);});
    chipsEl.appendChild(btn);
  });
}
function mChipClick(btn){
  var menu=btn.getAttribute("data-menu");
  var val=btn.getAttribute("data-val");
  mChipActive[menu]=val;
  mUpdateFilterChips(menu);
  if(menu==="hra"){
    var s=document.getElementById("hra-filter-fleet");if(s){s.value=val;applyHRAFilters();}
  } else if(menu==="dat"){
    var s=document.getElementById("dat-filter-fleet");if(s){s.value=val;applyDATFilters();}
  } else if(menu==="closeout25"){
    if(val==="CLOSE"||val==="OPEN"){var s=document.getElementById("co25-filter-status");if(s){s.value=val;applyCO25Filters();}}
    else{var s=document.getElementById("co25-filter-type");if(s){s.value=val;applyCO25Filters();}}
  }
}
function initMobileNav(){
  const firstActive=document.querySelector(".m-nav-btn.active");
  if(firstActive)setTimeout(function(){moveMNavPill(firstActive);},120);
  /* Sync when sidebar nav is clicked */
  document.querySelectorAll(".nav-item").forEach(function(item){
    item.addEventListener("click",function(){
      const menu=item.dataset.menu;
      document.querySelectorAll(".m-nav-btn").forEach(function(b){b.classList.remove("active");});
      const mBtn=document.querySelector('.m-nav-btn[data-menu="'+menu+'"]');
      if(mBtn){mBtn.classList.add("active");setTimeout(function(){moveMNavPill(mBtn);},50);}
      mUpdateFilterChips(menu);
    });
  });
  /* Initial filter chips */
  const curActive=document.querySelector(".page-content.active");
  if(curActive){const id=curActive.id.replace("page-","");mUpdateFilterChips(id);}
  /* Resize pill on window resize */
  window.addEventListener("resize",function(){
    const activeBtn=document.querySelector(".m-nav-btn.active");
    if(activeBtn)moveMNavPill(activeBtn);
    mUpdateKpiStrip();
  });
}

/* DATA LOAD */
async function loadData(){
  if(!isSessionValid()){
    showError("Sesi habis. Silakan login kembali.");
    const overlay=document.getElementById("loginOverlay");
    if(overlay)overlay.classList.remove("hidden");
    return;
  }

  /* ── MODE DEMO: tidak ada data, langsung render kosong ── */
  if(isDemo()){
    rawHRA=[];rawDAT=[];rawPest=[];
    rawFisika=[];rawKimia=[];rawBiologi=[];rawErgonomi=[];rawPsikososial=[];
    filteredHRA=[];filteredDAT=[];filteredPest=[];
    filteredFisika=[];filteredKimia=[];filteredBiologi=[];filteredErgonomi=[];filteredPsikososial=[];
    rawCloseout25=[...RAW_CLOSEOUT_2025];filteredCO25=[...RAW_CLOSEOUT_2025];
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Mode Demo";
    try{renderHRAPage();}catch(e){}
    try{renderDATPage();}catch(e){}
    try{renderPestPage();}catch(e){}
    try{renderFisikaPage();}catch(e){}
    try{renderKimiaPage();}catch(e){}
    try{renderBiologiPage();}catch(e){}
    try{renderErgonomiPage();}catch(e){}
    try{renderPsikoPage();}catch(e){}
    /* Matikan loading spinner */
    showLoading(false);
    hideError();
    setTimeout(applyDemoOverlay,400);
    return;
  }
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
    rawFisika=data.fisika||[];rawKimia=data.kimia||[];rawBiologi=data.biologi||[];
    rawErgonomi=data.ergonomi||[];rawPsikososial=data.psikososial||[];
    filteredHRA=[...rawHRA];filteredDAT=[...rawDAT];filteredPest=[...rawPest];
    filteredFisika=[...rawFisika];filteredKimia=[...rawKimia];filteredBiologi=[...rawBiologi];
    filteredErgonomi=[...rawErgonomi];filteredPsikososial=[...rawPsikososial];
    /* ── CLOSEOUT 2025: ambil live dari GAS jika sheet Closeout_25 sudah ditambahkan ── */
    if(data.closeout25&&data.closeout25.length>0){
      rawCloseout25=data.closeout25.map(function(r){
        return {
          kapal:    r["Nama Kapal"]||r["kapal"]||"",
          jenis:    (r["Jenis"]||r["jenis"]||"").trim(),
          fleet:    (r["Fleet"]||r["fleet"]||"").trim(),
          statusMon:r["Status Monitoring"]||r["statusMon"]||"Sudah Terlaksana",
          laporan:  r["Laporan & Memo"]||r["laporan"]||"",
          closeout: (r["Closeout Status"]||r["closeout"]||"").trim().toUpperCase()
        };
      });
      filteredCO25=[...rawCloseout25];
      showToast("Closeout 2025: "+rawCloseout25.length+" data live dari Google Sheets ✅","info");
    } else {
      /* Fallback ke data statis sampai sheet GAS ditambahkan */
      rawCloseout25=[...RAW_CLOSEOUT_2025];
      filteredCO25=[...RAW_CLOSEOUT_2025];
    }
    /* Re-render closeout page jika sedang aktif */
    const pgCo25=document.getElementById("page-closeout25");
    if(pgCo25&&pgCo25.classList.contains("active"))renderCO25Page();
    const now=new Date();
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Update: "+now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
  }catch(err){
    console.error("API Error:",err);
    showError("Gagal memuat data: "+err.message);
    rawHRA=[];rawDAT=[];rawPest=[];
    rawFisika=[];rawKimia=[];rawBiologi=[];rawErgonomi=[];rawPsikososial=[];
    filteredHRA=[];filteredDAT=[];filteredPest=[];
    filteredFisika=[];filteredKimia=[];filteredBiologi=[];filteredErgonomi=[];filteredPsikososial=[];
    /* Closeout tetap pakai data statis saat koneksi gagal */
    rawCloseout25=[...RAW_CLOSEOUT_2025];
    filteredCO25=[...RAW_CLOSEOUT_2025];
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Gagal terhubung";
  }
  renderHRAPage();renderDATPage();renderPestPage();
  renderFisikaPage();renderKimiaPage();renderBiologiPage();renderErgonomiPage();renderPsikoPage();
  showLoading(false);
  /* Update mobile KPI strip after data loaded */
  setTimeout(mUpdateKpiStrip,200);
  /* Fetch biomonitoring data from GAS */
  fetchBiomonitoring();
}
function showLoading(v){document.getElementById("loadingOverlay").style.display=v?"flex":"none";}
function showError(msg){document.getElementById("errorBanner").style.display="flex";document.getElementById("errorMsg").textContent=msg;}
function hideError(){document.getElementById("errorBanner").style.display="none";}

/* Empty state konsisten untuk semua tabel */
function emptyState(msg,icon){
  icon=icon||"fa-inbox";
  msg=msg||"Tidak ada data";
  return'<tr><td colspan="99" style="text-align:center;padding:48px 20px">'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-muted)">'
    +'<i class="fas '+icon+'" style="font-size:32px;opacity:.25"></i>'
    +'<span style="font-size:13px;font-weight:600">'+msg+'</span>'
    +'</div></td></tr>';
}

/* Empty state untuk chart container */
function emptyChart(canvasId,msg){
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  const parent=canvas.parentElement;
  let ph=parent.querySelector(".chart-empty-ph");
  if(!ph){ph=document.createElement("div");ph.className="chart-empty-ph";ph.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-muted)";parent.style.position="relative";parent.appendChild(ph);}
  ph.innerHTML='<i class="fas fa-chart-bar" style="font-size:28px;opacity:.2"></i><span style="font-size:12px;font-weight:600;opacity:.5">'+(msg||"Belum ada data")+'</span>';
  canvas.style.opacity="0";
}
function clearEmptyChart(canvasId){
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  canvas.style.opacity="1";
  const ph=canvas.parentElement.querySelector(".chart-empty-ph");
  if(ph)ph.remove();
}

/* HRA PAGE */
function renderHRAPage(){const data=filteredHRA;const done=new Set(data.filter(r=>(r["Status"]||"").toLowerCase()==="done").map(r=>r["Nama Kapal"])).size;const belum=TOTAL_KAPAL-done;const budget=data.reduce((s,r)=>s+parseFloat(r["Est Budget"]||0),0);const coverage=((done/TOTAL_KAPAL)*100).toFixed(1);document.getElementById("hra-done").textContent=done;document.getElementById("hra-belum").textContent=belum;document.getElementById("hra-budget").textContent=formatRupiah(budget);document.getElementById("hra-coverage").textContent=coverage+"%";renderHRABarChart(data);renderHRADonutChart(data);renderHRAHazard();renderHRATable(data);}
function renderHRABarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("hraBarChart").getContext("2d");if(hraBarChart)hraBarChart.destroy();hraBarChart=new Chart(ctx,{type:hraChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Monitoring",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:hraChartType==="line"?"rgba(21,101,192,0.12)":"#1976D2",borderColor:"#1565C0",borderWidth:hraChartType==="line"?2.5:1,borderRadius:hraChartType==="bar"?6:0,fill:hraChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:hraChartType==="line"?4:0}]},options:chartOpts()});}
function renderHRADonutChart(data){const fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};data.forEach(r=>{const f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});const ctx=document.getElementById("hraDonutChart").getContext("2d");if(hraDonutChart)hraDonutChart.destroy();hraDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:Object.keys(fleets),datasets:[{data:Object.values(fleets),backgroundColor:["#1976D2","#43A047","#FB8C00","#8E24AA"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function toggleHRAChartType(btn,type){hraChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderHRABarChart(filteredHRA);}
function renderHRAHazard(){const bulan=document.getElementById("hra-hazard-bulan").value;const data=bulan?rawHRA.filter(r=>r["Bulan Pelaksanaan"]===bulan):rawHRA;const counts={};data.forEach(r=>{const h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(x=>x.trim()).filter(Boolean).forEach(hz=>{counts[hz]=(counts[hz]||0)+1;});});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);const el=document.getElementById("hazardList");if(!sorted.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada data hazard</div>';return;}el.innerHTML=sorted.map(([name,count],i)=>`<div class="hazard-item"><div class="hazard-rank r${i+1}">${i+1}</div><div class="hazard-name">${esc(name)}</div><div class="hazard-count">${count}x</div></div>`).join("");}
function renderHRATable(data){const tbody=document.getElementById("hraTableBody");if(!tbody)return;if(!data.length){tbody.innerHTML=emptyState("Belum ada data HRA","fa-lungs");document.getElementById("hraTableFooter").textContent="Tidak ada data";return;}tbody.innerHTML=data.map(r=>`<tr><td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"")}</td><td>${statusBadge(r["Status"])}</td><td style="font-weight:700">Rp ${fmtNum(parseFloat(r["Est Budget"]||0))}</td></tr>`).join("");document.getElementById("hraTableFooter").textContent=`Menampilkan ${data.length} dari ${rawHRA.length} entri kapal`;}
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
function renderDATTable(data){const tbody=document.getElementById("datTableBody");if(!tbody)return;if(!data.length){tbody.innerHTML=emptyState("Belum ada data DAT","fa-vial");document.getElementById("datTableFooter").textContent="Tidak ada data";return;}tbody.innerHTML=data.map(r=>{const h=(r["Hasil"]||"").toLowerCase();const badge=h==="negatif"?'<span class="badge badge-neg">Negatif</span>':h==="positif"?'<span class="badge badge-pos">Positif</span>':esc(r["Hasil"]||"—");return`<tr><td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"—")}</td><td style="text-align:right;font-weight:700">${fmtNum(parseInt(r["Total Crew Diperiksa"]||0))}</td><td>${badge}</td><td style="text-align:right;font-weight:700;color:#C62828">${r["Jumlah Crew Positif"]||0}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r["Tindak Lanjut"]||"—")}</td></tr>`;}).join("");document.getElementById("datTableFooter").textContent=`Menampilkan ${data.length} dari ${rawDAT.length} entri`;}
function applyDATFilters(){const b=document.getElementById("dat-filter-bulan").value;const f=document.getElementById("dat-filter-fleet").value;const k=document.getElementById("dat-filter-kapal").value.toLowerCase();filteredDAT=rawDAT.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderDATPage();}
function clearDATFilters(){["dat-filter-bulan","dat-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("dat-filter-kapal").value="";filteredDAT=[...rawDAT];renderDATPage();}
function searchDATTable(){const q=document.getElementById("dat-search").value.toLowerCase();document.querySelectorAll("#datTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortDATTable(col){if(datSortCol===col)datSortDir*=-1;else{datSortCol=col;datSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Total Crew Diperiksa","Hasil","Jumlah Crew Positif","Tindak Lanjut"];filteredDAT.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*datSortDir);renderDATTable(filteredDAT);}

/* PEST PAGE */
function getPestTanggalDisplay(r){return r["Tanggal"]||r["Tanggal Pelaksanaan"]||r["Date"]||"";}
function getPestTL(r){return r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||r["Tindak Lanjut dan Rekomendasi"]||"";}
function renderPestPage(){const data=filteredPest;const totalPelaksanaan=data.length;const lokSet=new Set(data.map(r=>(r["Lokasi"]||"").trim()).filter(Boolean));const totalBiaya=data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);const temuanAll=data.map(r=>(r["Temuan / Keluhan"]||"").trim()).filter(Boolean);const hamaMap={};temuanAll.forEach(t=>{const low=t.toLowerCase();["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(h=>{if(low.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;});});const hamaDominan=Object.entries(hamaMap).sort((a,b)=>b[1]-a[1])[0];const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};setEl("pest-total",fmtNum(totalPelaksanaan));setEl("pest-lokasi",fmtNum(lokSet.size));setEl("pest-temuan",fmtNum(temuanAll.length));setEl("pest-hama-dominan",hamaDominan?hamaDominan[0].charAt(0).toUpperCase()+hamaDominan[0].slice(1):"—");setEl("pest-biaya",formatRupiah(totalBiaya));const lokasiSel=document.getElementById("pest-filter-lokasi");if(lokasiSel){const currentLok=lokasiSel.value;const uniqueLok=[...lokSet].sort();lokasiSel.innerHTML='<option value="">Semua Lokasi</option>'+uniqueLok.map(l=>`<option${l===currentLok?" selected":""}>${esc(l)}</option>`).join("");}renderPestBarChart(data);renderPestDonutChart(data);renderPestTemuanChart(data);renderPestBiayaChart(data);renderPestTindakLanjut(data);renderPestTable(data);}
function renderPestBarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("pestBarChart").getContext("2d");if(pestBarChart)pestBarChart.destroy();const colors=BULAN_ORDER.map((_,i)=>`hsl(${210+i*5},70%,${50+i*1.5}%)`);pestBarChart=new Chart(ctx,{type:pestChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Pelaksanaan",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:pestChartType==="line"?"rgba(21,101,192,0.12)":colors,borderColor:"#1565C0",borderWidth:pestChartType==="line"?2.5:1,borderRadius:pestChartType==="bar"?6:0,fill:pestChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:pestChartType==="line"?4:0}]},options:chartOpts()});}
function renderPestDonutChart(data){const lokMap={};data.forEach(r=>{const l=(r["Lokasi"]||"").trim();if(l)lokMap[l]=(lokMap[l]||0)+1;});const sorted=Object.entries(lokMap).sort((a,b)=>b[1]-a[1]).slice(0,8);const ctx=document.getElementById("pestDonutChart").getContext("2d");if(pestDonutChart)pestDonutChart.destroy();const palette=["#1976D2","#43A047","#FB8C00","#8E24AA","#00838F","#E53935","#F9A825","#5E35B1"];pestDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:sorted.map(([k])=>k),datasets:[{data:sorted.map(([,v])=>v),backgroundColor:palette,borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function renderPestTemuanChart(data){const tMap={};data.forEach(r=>{const t=(r["Temuan / Keluhan"]||"").trim();if(t)tMap[t]=(tMap[t]||0)+1;});const sorted=Object.entries(tMap).sort((a,b)=>b[1]-a[1]).slice(0,6);const ctx=document.getElementById("pestTemuanChart").getContext("2d");if(pestTemuanChart)pestTemuanChart.destroy();pestTemuanChart=new Chart(ctx,{type:"bar",data:{labels:sorted.map(([k])=>k.length>30?k.slice(0,30)+"…":k),datasets:[{label:"Frekuensi",data:sorted.map(([,v])=>v),backgroundColor:"#8E24AA",borderRadius:6}]},options:{...chartOpts(),indexAxis:"y"}});}
function renderPestBiayaChart(data){const biayaMap={};BULAN_ORDER.forEach(b=>biayaMap[b]=0);data.forEach(r=>{const b=(r["Bulan"]||"").trim();if(b&&biayaMap[b]!==undefined)biayaMap[b]+=parseFloat(r["Est Biaya"]||0);});const ctx=document.getElementById("pestBiayaChart").getContext("2d");if(pestBiayaChart)pestBiayaChart.destroy();pestBiayaChart=new Chart(ctx,{type:"line",data:{labels:BULAN_ORDER,datasets:[{label:"Est. Biaya",data:BULAN_ORDER.map(b=>biayaMap[b]),backgroundColor:"rgba(142,36,170,0.1)",borderColor:"#8E24AA",borderWidth:2.5,fill:true,tension:0.4,pointBackgroundColor:"#8E24AA",pointRadius:4}]},options:chartOpts()});}
function renderPestTindakLanjut(data){const el=document.getElementById("pestTindakLanjutList");const items=data.map(r=>getPestTL(r)).filter(Boolean).slice(0,6);if(!items.length){el.innerHTML='<div class="hazard-empty">Tidak ada data tindak lanjut</div>';return;}el.innerHTML=items.map((t,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name" style="white-space:normal;line-height:1.4">${esc(t.length>80?t.slice(0,80)+"…":t)}</div></div>`).join("");}
function renderPestTable(data){const tbody=document.getElementById("pestTableBody");if(!tbody)return;if(!data.length){tbody.innerHTML=emptyState("Belum ada data Pest & Rodent","fa-bug");document.getElementById("pestTableFooter").textContent="Tidak ada data";return;}tbody.innerHTML=data.map(r=>{const biaya=parseFloat(r["Est Biaya"]||0);const tglDisplay=getPestTanggalDisplay(r);const tindakLanjut=getPestTL(r)||"—";const temuan=(r["Temuan / Keluhan"]||r["Temuan"]||r["Keluhan"]||"—").trim();return`<tr><td><strong style="color:var(--text)">${esc(r["Lokasi"]||"—")}</strong></td><td style="white-space:nowrap;font-weight:600">${esc(tglDisplay)}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${esc(temuan)}">${esc(temuan)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${esc(tindakLanjut)}">${esc(tindakLanjut)}</td><td style="text-align:right;font-weight:700;color:#6A1B9A">${biaya?formatRupiah(biaya):"—"}</td></tr>`;}).join("");document.getElementById("pestTableFooter").textContent=`Menampilkan ${data.length} dari ${rawPest.length} entri`;}
function applyPestFilters(){const b=document.getElementById("pest-filter-bulan").value;const l=document.getElementById("pest-filter-lokasi").value;const t=document.getElementById("pest-filter-temuan").value.toLowerCase();filteredPest=rawPest.filter(r=>(!b||r["Bulan"]===b)&&(!l||r["Lokasi"]===l)&&(!t||(r["Temuan / Keluhan"]||"").toLowerCase().includes(t)));renderPestPage();}
function clearPestFilters(){["pest-filter-bulan","pest-filter-lokasi"].forEach(id=>document.getElementById(id).value="");document.getElementById("pest-filter-temuan").value="";filteredPest=[...rawPest];renderPestPage();}
function searchPestTable(){const q=document.getElementById("pest-search").value.toLowerCase();document.querySelectorAll("#pestTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortPestTable(col){if(pestSortCol===col)pestSortDir*=-1;else{pestSortCol=col;pestSortDir=1;}const keys=["Lokasi","Tanggal","Temuan / Keluhan","Tindak Lanjut","Est Biaya"];filteredPest.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*pestSortDir);renderPestTable(filteredPest);}
function togglePestChartType(btn,type){pestChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderPestBarChart(filteredPest);}

/* CHART HELPERS */
function chartOpts(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#1565C0",titleColor:"#fff",bodyColor:"rgba(255,255,255,0.8)",padding:10,cornerRadius:8,displayColors:false}},scales:{x:{grid:{color:"#F0F4F8"},ticks:{color:"#90A4AE",font:{size:11,family:"Plus Jakarta Sans"}}},y:{grid:{color:"#F0F4F8"},ticks:{color:"#90A4AE",font:{size:11,family:"Plus Jakarta Sans"}},beginAtZero:true}}};}
function donutOpts(){return{responsive:true,maintainAspectRatio:false,cutout:"65%",plugins:{legend:{position:"bottom",labels:{color:"#607D8B",font:{size:12,family:"Plus Jakarta Sans",weight:"700"},padding:14,boxWidth:12}},tooltip:{backgroundColor:"#1565C0",titleColor:"#fff",bodyColor:"rgba(255,255,255,0.8)",padding:10,cornerRadius:8}}};}

/* HELPERS */
function fmtNum(n){return(n===undefined||n===null)?"—":Number(n).toLocaleString("id-ID");}
function formatRupiah(n){if(n>=1e9)return(n/1e9).toFixed(1)+" M";if(n>=1e6)return(n/1e6).toFixed(1)+" Jt";return fmtNum(n);}
function esc(s){const d=document.createElement("div");d.textContent=String(s||"");return d.innerHTML;}
function statusBadge(s){return(s||"").toLowerCase()==="done"?'<span class="badge badge-done">✓ Done</span>':'<span class="badge badge-belum">⏳ Belum</span>';}

/* TOAST */
function showToast(msg,type){const existing=document.getElementById("driveToast");if(existing)existing.remove();const color=type==="success"?"#2E7D32":type==="error"?"#C62828":type==="warning"?"#E65100":"#1565C0";const icon=type==="success"?"fa-circle-check":type==="error"?"fa-circle-xmark":type==="warning"?"fa-triangle-exclamation":"fa-circle-info";const toast=document.createElement("div");toast.id="driveToast";toast.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;background:${color};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,0.25);max-width:380px`;toast.innerHTML=`<i class="fas ${icon}" style="font-size:16px;flex-shrink:0"></i><span>${msg}</span>`;document.body.appendChild(toast);const dur=type==="warning"?8000:4000;setTimeout(()=>{if(toast.parentNode)toast.remove();},dur);}

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

/* ═══ MOBILE PAGE SWITCHER ═══ */
function switchPage(menu) {
  var titles = {
    hra:'HRA & IH', dat:'Drugs & Alcohol Test',
    pest:'Pest & Rodent Control', p3k:'P3K & AED Office',
    menu5:'Sebaran Alkes Kapal', menu6:'Pedoman IH',
    dokumentasi:'Dokumentasi',
    fisika:'Faktor Fisika', kimia:'Faktor Kimia',
    biologi:'Faktor Biologi', ergonomi:'Faktor Ergonomi',
    psikososial:'Faktor Psikososial'
  };
  var title = titles[menu] || menu;
  document.querySelectorAll('.page-content').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  document.querySelectorAll('.mobile-nav-item').forEach(function(n){ n.classList.remove('active'); });
  var page = document.getElementById('page-' + menu);
  if (page) page.classList.add('active');
  document.querySelectorAll('[data-menu="'+menu+'"]').forEach(function(n){ n.classList.add('active'); });
  var pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = title;
  closeSidebar();
}

/* ═══════════════════════════════════════════════
   HELPERS — NAB STATUS
═══════════════════════════════════════════════ */
function nabBadge(status){
  const s=(status||"").toLowerCase();
  if(s.includes("melebihi"))return'<span class="badge badge-melebihi">⛔ Melebihi NAB</span>';
  if(s.includes("perhatian"))return'<span class="badge badge-perhatian">⚠ Perhatian</span>';
  if(s.includes("aman"))return'<span class="badge badge-aman">✅ Aman</span>';
  return`<span class="badge badge-belum">${esc(status||"—")}</span>`;
}
function tlBadge(s){
  const v=(s||"").toLowerCase();
  if(v==="closed")return'<span class="badge badge-done">✓ Closed</span>';
  if(v==="on progress")return'<span class="badge badge-perhatian">↻ On Progress</span>';
  if(v==="open")return'<span class="badge badge-melebihi">⏳ Open</span>';
  return`<span class="badge badge-belum">${esc(s||"—")}</span>`;
}
function riskBadge(level){
  const n=parseInt(level)||0;
  if(n>=3)return'<span class="badge badge-melebihi">🔴 Level '+n+'</span>';
  if(n===2)return'<span class="badge badge-perhatian">🟡 Level 2</span>';
  if(n===1)return'<span class="badge badge-aman">🟢 Level 1</span>';
  return`<span class="badge badge-belum">${esc(level||"—")}</span>`;
}
function psikoBadge(level){
  const l=(level||"").toLowerCase();
  if(l.includes("tinggi"))return'<span class="badge badge-melebihi">🔴 Risiko Tinggi</span>';
  if(l.includes("sedang"))return'<span class="badge badge-perhatian">🟡 Risiko Sedang</span>';
  if(l.includes("rendah"))return'<span class="badge badge-aman">🟢 Risiko Rendah</span>';
  return`<span class="badge badge-belum">${esc(level||"—")}</span>`;
}
function nabAlertBar(pageId, alertId, msgId, data){
  const over=data.filter(r=>{const s=(r["Status"]||"").toLowerCase();return s.includes("melebihi");});
  const bar=document.getElementById(alertId);
  const msg=document.getElementById(msgId);
  if(!bar||!msg)return;
  if(over.length>0){
    bar.style.display="flex";
    msg.textContent=over.length+" parameter melebihi NAB — perlu tindakan segera!";
  }else{bar.style.display="none";}
}

/* ═══════════════════════════════════════════════
   FAKTOR FISIKA
═══════════════════════════════════════════════ */
function renderFisikaPage(){
  const data=filteredFisika;
  const total=data.length;
  const melebihi=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).length;
  const perhatian=data.filter(r=>(r["Status"]||"").toLowerCase().includes("perhatian")).length;
  const aman=data.filter(r=>(r["Status"]||"").toLowerCase().includes("aman")).length;
  const personal=data.filter(r=>(r["Metode"]||"").toLowerCase()==="personal").length;
  document.getElementById("fisika-total").textContent=total;
  document.getElementById("fisika-melebihi").textContent=melebihi;
  document.getElementById("fisika-perhatian").textContent=perhatian;
  document.getElementById("fisika-aman").textContent=aman;
  document.getElementById("fisika-personal").textContent=personal;
  nabAlertBar("fisika","fisika-alert-bar","fisika-alert-msg",data);
  renderFisikaBarChart(data);renderFisikaDonutChart(data);renderFisikaAlertList(data);renderFisikaTable(data);
}
function renderFisikaBarChart(data){
  const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const b=r["Tanggal Pengukuran"]?"":""||"";const tgl=r["Tanggal Pengukuran"]||"";
    BULAN_ORDER.forEach((bln,i)=>{if(tgl.toLowerCase().includes(bln.toLowerCase())||(parseInt(tgl.split("-")[1])-1===i))counts[bln]++;});
  });
  const ctx=document.getElementById("fisikaBarChart");if(!ctx)return;
  if(fisikaBarChart)fisikaBarChart.destroy();
  fisikaBarChart=new Chart(ctx.getContext("2d"),{type:fisikaChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Pengukuran",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:fisikaChartType==="line"?"rgba(21,101,192,0.12)":"#1976D2",borderColor:"#1565C0",borderWidth:fisikaChartType==="line"?2.5:1,borderRadius:fisikaChartType==="bar"?6:0,fill:fisikaChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:fisikaChartType==="line"?4:0}]},options:chartOpts()});
}
function renderFisikaDonutChart(data){
  const params={};
  data.forEach(r=>{const p=r["Jenis Parameter"]||"Lainnya";params[p]=(params[p]||0)+1;});
  const ctx=document.getElementById("fisikaDonutChart");if(!ctx)return;
  if(fisikaDonutChart)fisikaDonutChart.destroy();
  const keys=Object.keys(params);
  const palette=["#1976D2","#43A047","#FB8C00","#8E24AA","#00838F"];
  fisikaDonutChart=new Chart(ctx.getContext("2d"),{type:"doughnut",data:{labels:keys,datasets:[{data:keys.map(k=>params[k]),backgroundColor:palette.slice(0,keys.length),borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}
function renderFisikaAlertList(data){
  const el=document.getElementById("fisikaAlertList");if(!el)return;
  const over=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).slice(0,6);
  if(!over.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-check-circle" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Semua dalam batas aman</div>';return;}
  el.innerHTML=over.map((r,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name">${esc(r["Nama Kapal"]||"")} — ${esc(r["Jenis Parameter"]||"")} ${r["Hasil Pengukuran"]||""} ${esc(r["Satuan"]||"")}</div><div class="hazard-count">${r["% terhadap NAB"]||""}%</div></div>`).join("");
}
function renderFisikaTable(data){
  const tbody=document.getElementById("fisikaTableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>`<tr>
    <td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Fleet"]||"")}</span></td>
    <td>${esc(r["Area / Titik Ukur"]||"")}</td>
    <td>${esc(r["Jenis Parameter"]||"")}</td>
    <td><span style="background:#EDE7F6;color:#4527A0;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:700">${esc(r["Metode"]||"")}</span></td>
    <td style="font-weight:700">${r["Hasil Pengukuran"]||"—"}</td>
    <td>${esc(r["Satuan"]||"")}</td>
    <td>${r["NAB / TLV"]||"—"}</td>
    <td style="font-weight:700;color:${pctColor(parseFloat(r["% terhadap NAB"]||0))}">${r["% terhadap NAB"]||"—"}%</td>
    <td>${nabBadge(r["Status"])}</td>
    <td>${tlBadge(r["Status TL"])}</td>
  </tr>`).join("");
  const f=document.getElementById("fisikaTableFooter");if(f)f.textContent=`Menampilkan ${data.length} dari ${rawFisika.length} entri`;
}
function pctColor(pct){if(pct>=100)return"#C62828";if(pct>=50)return"#E65100";return"#2E7D32";}
function applyFisikaFilters(){
  const b=document.getElementById("fisika-filter-bulan").value;
  const f=document.getElementById("fisika-filter-fleet").value;
  const p=document.getElementById("fisika-filter-param").value;
  const m=document.getElementById("fisika-filter-metode").value;
  const k=document.getElementById("fisika-filter-kapal").value.toLowerCase();
  filteredFisika=rawFisika.filter(r=>
    (!b||(r["Tanggal Pengukuran"]||"").includes(b))&&
    (!f||r["Fleet"]===f)&&
    (!p||r["Jenis Parameter"]===p)&&
    (!m||r["Metode"]===m)&&
    (!k||(r["Nama Kapal"]||"").toLowerCase().includes(k))
  );renderFisikaPage();
}
function clearFisikaFilters(){
  ["fisika-filter-bulan","fisika-filter-fleet","fisika-filter-param","fisika-filter-metode"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const k=document.getElementById("fisika-filter-kapal");if(k)k.value="";
  filteredFisika=[...rawFisika];renderFisikaPage();
}
function searchFisikaTable(){const q=(document.getElementById("fisika-search")||{}).value||"";document.querySelectorAll("#fisikaTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}
function sortFisikaTable(col){if(fisikaSortCol===col)fisikaSortDir*=-1;else{fisikaSortCol=col;fisikaSortDir=1;}const keys=["Nama Kapal","Fleet","Area / Titik Ukur","Jenis Parameter","Metode","Hasil Pengukuran","Satuan","NAB / TLV","% terhadap NAB","Status","Status TL"];filteredFisika.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*fisikaSortDir);renderFisikaTable(filteredFisika);}
function toggleFisikaChartType(btn,type){fisikaChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderFisikaBarChart(filteredFisika);}

/* ═══════════════════════════════════════════════
   FAKTOR KIMIA
═══════════════════════════════════════════════ */
function renderKimiaPage(){
  const data=filteredKimia;
  const total=data.length;
  const melebihi=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).length;
  const perhatian=data.filter(r=>(r["Status"]||"").toLowerCase().includes("perhatian")).length;
  const personal=data.filter(r=>(r["Metode Sampling"]||"").toLowerCase().includes("personal air")).length;
  const bio=data.filter(r=>(r["Metode Sampling"]||"").toLowerCase().includes("biological")).length;
  document.getElementById("kimia-total").textContent=total;
  document.getElementById("kimia-melebihi").textContent=melebihi;
  document.getElementById("kimia-perhatian").textContent=perhatian;
  document.getElementById("kimia-personal").textContent=personal;
  document.getElementById("kimia-bio").textContent=bio;
  nabAlertBar("kimia","kimia-alert-bar","kimia-alert-msg",data);
  renderKimiaBarChart(data);renderKimiaDonutChart(data);renderKimiaAlertList(data);renderKimiaTable(data);
}
function renderKimiaBarChart(data){
  const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const tgl=r["Tanggal"]||"";BULAN_ORDER.forEach((bln,i)=>{if(tgl.toLowerCase().includes(bln.toLowerCase())||(parseInt((tgl.split("-")[1]||"0"))-1===i))counts[bln]++;});});
  const ctx=document.getElementById("kimiaBarChart");if(!ctx)return;
  if(kimiaBarChart)kimiaBarChart.destroy();
  kimiaBarChart=new Chart(ctx.getContext("2d"),{type:kimiaChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Sampling",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:kimiaChartType==="line"?"rgba(142,36,170,0.12)":"#8E24AA",borderColor:"#6A1B9A",borderWidth:kimiaChartType==="line"?2.5:1,borderRadius:kimiaChartType==="bar"?6:0,fill:kimiaChartType==="line",tension:0.4,pointBackgroundColor:"#6A1B9A",pointRadius:kimiaChartType==="line"?4:0}]},options:chartOpts()});
}
function renderKimiaDonutChart(data){
  const methods={};
  data.forEach(r=>{const m=r["Metode Sampling"]||"Lainnya";methods[m]=(methods[m]||0)+1;});
  const ctx=document.getElementById("kimiaDonutChart");if(!ctx)return;
  if(kimiaDonutChart)kimiaDonutChart.destroy();
  const keys=Object.keys(methods);
  kimiaDonutChart=new Chart(ctx.getContext("2d"),{type:"doughnut",data:{labels:keys,datasets:[{data:keys.map(k=>methods[k]),backgroundColor:["#8E24AA","#1976D2","#E91E63"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}
function renderKimiaAlertList(data){
  const el=document.getElementById("kimiaAlertList");if(!el)return;
  const over=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).slice(0,6);
  if(!over.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-check-circle" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Semua dalam batas aman</div>';return;}
  el.innerHTML=over.map((r,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name">${esc(r["Nama Kapal"]||"")} — ${esc(r["Nama Bahan Kimia"]||"")} [${esc(r["Metode Sampling"]||"")}]</div><div class="hazard-count">${r["% terhadap TLV/BEI"]||""}%</div></div>`).join("");
}
function renderKimiaTable(data){
  const tbody=document.getElementById("kimiaTableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>`<tr>
    <td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Fleet"]||"")}</span></td>
    <td>${esc(r["Nama Bahan Kimia"]||"")}</td>
    <td><span style="background:#F3E5F5;color:#6A1B9A;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:700">${esc(r["Metode Sampling"]||"")}</span></td>
    <td>${esc(r["Media Sampel"]||"")}</td>
    <td style="font-weight:700">${r["Hasil Pengukuran"]||"—"}</td>
    <td>${esc(r["Satuan"]||"")}</td>
    <td>${r["TLV-TWA ACGIH"]||r["BEI ACGIH"]||"—"}</td>
    <td style="font-weight:700;color:${pctColor(parseFloat(r["% terhadap TLV/BEI"]||0))}">${r["% terhadap TLV/BEI"]||"—"}%</td>
    <td>${nabBadge(r["Status"])}</td>
    <td style="font-size:11px">${esc(r["Nama Laboratorium"]||"—")}</td>
  </tr>`).join("");
  const f=document.getElementById("kimiaTableFooter");if(f)f.textContent=`Menampilkan ${data.length} dari ${rawKimia.length} entri`;
  /* Render biomarker section di bawah tabel kimia */
  renderBioKimiaSection();
}
/* ── Render Biomarker section di halaman Faktor Kimia ── */
var filteredBioKimia=[];
var bioKapalChart=null,bioStatusChart=null;
var bioKimiaSortCol=0,bioKimiaSortDir=-1;

function renderBioKimiaSection(){
  /* Gabungkan rawBiomarker + rawPersonal jadi satu list */
  var tipeF=(document.getElementById("bio-filter-tipe")||{}).value||"all";
  var tahunF=(document.getElementById("bio-filter-tahun")||{}).value||"";
  var kapalF=(document.getElementById("bio-filter-kapal")||{}).value||"";

  /* Populate dropdown tahun & kapal */
  var allData=[];
  if(tipeF==="all"||tipeF==="biomarker") rawBiomarker.forEach(function(r){allData.push(Object.assign({},r,{tipe:"Biomarker",lokasi:r.lokasi||"Urin",nilai:r.kreatinin,batas:r.rujukan,satuan:"00b5g/g kreat."}));});
  if(tipeF==="all"||tipeF==="personal")  rawPersonal.forEach(function(r){allData.push(Object.assign({},r,{tipe:"Personal",lokasi:r.lokasi||"Udara",nilai:r.hasil,batas:r.nab,satuan:"ppm"}));});

  /* Populate tahun dropdown */
  var tahunSel=document.getElementById("bio-filter-tahun");
  if(tahunSel){
    var curT=tahunSel.value;
    var tahuns=[...new Set(allData.map(function(r){return r.tahun;}).filter(Boolean))].sort();
    tahunSel.innerHTML='<option value="">Semua Tahun</option>'+tahuns.map(function(t){return'<option'+(t===curT?' selected':'')+'>'+esc(t)+'</option>';}).join("");
  }
  /* Populate kapal dropdown */
  var kapalSel=document.getElementById("bio-filter-kapal");
  if(kapalSel){
    var curK=kapalSel.value;
    var kapals=[...new Set(allData.map(function(r){return r.kapal;}).filter(Boolean))].sort();
    kapalSel.innerHTML='<option value="">Semua Kapal</option>'+kapals.map(function(k){return'<option'+(k===curK?' selected':'')+'>'+esc(k)+'</option>';}).join("");
  }

  /* Filter */
  filteredBioKimia=allData.filter(function(r){
    if(tahunF&&r.tahun!==tahunF)return false;
    if(kapalF&&r.kapal!==kapalF)return false;
    return true;
  });

  /* KPI */
  var total=filteredBioKimia.length;
  var melebihi=filteredBioKimia.filter(function(r){return r.nilai>r.batas;}).length;
  var normal=total-melebihi;
  var kapalSet=new Set(filteredBioKimia.map(function(r){return r.kapal;}).filter(Boolean));
  var setEl=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setEl("bio-kpi-total",fmtNum(total));
  setEl("bio-kpi-melebihi",fmtNum(melebihi));
  setEl("bio-kpi-normal",fmtNum(normal));
  setEl("bio-kpi-kapal",fmtNum(kapalSet.size));

  renderBioKapalChart(filteredBioKimia);
  renderBioStatusChart(filteredBioKimia,melebihi,normal);
  renderBioTable(filteredBioKimia);
}

function renderBioKapalChart(data){
  var ctx=document.getElementById("bioKapalChart");
  if(!ctx)return;
  if(bioKapalChart){bioKapalChart.destroy();bioKapalChart=null;}
  if(!data.length){emptyChart("bioKapalChart","Belum ada data");return;}
  clearEmptyChart("bioKapalChart");
  var kapalMap={};
  data.forEach(function(r){kapalMap[r.kapal]=(kapalMap[r.kapal]||[]);kapalMap[r.kapal].push(r.nilai);});
  var labels=Object.keys(kapalMap).slice(0,12);
  var avgs=labels.map(function(k){var arr=kapalMap[k];return+(arr.reduce(function(s,v){return s+v;},0)/arr.length).toFixed(2);});
  var refs=data.filter(function(r){return labels.indexOf(r.kapal)!==-1;}).map(function(r){return r.batas;})[0]||25;
  bioKapalChart=new Chart(ctx.getContext("2d"),{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"Rata-rata Nilai",data:avgs,backgroundColor:avgs.map(function(v){return v>refs?"#E53935":"#8E24AA";}),borderRadius:5},
      {label:"BEI/NAB",data:labels.map(function(){return refs;}),type:"line",borderColor:"#F59E0B",borderWidth:2,borderDash:[6,3],pointRadius:0,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{font:{size:11}}}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}
  });
}

function renderBioStatusChart(data,melebihi,normal){
  var ctx=document.getElementById("bioStatusChart");
  if(!ctx)return;
  if(bioStatusChart){bioStatusChart.destroy();bioStatusChart=null;}
  if(!data.length){emptyChart("bioStatusChart","Belum ada data");return;}
  clearEmptyChart("bioStatusChart");
  bioStatusChart=new Chart(ctx.getContext("2d"),{
    type:"doughnut",
    data:{labels:["Normal","Melebihi BEI/NAB"],datasets:[{data:[normal,melebihi],backgroundColor:["#43A047","#E53935"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{position:"bottom",labels:{font:{size:11},padding:12,boxWidth:12}}}}
  });
}

function renderBioTable(data){
  var tbody=document.getElementById("bioTableBody");
  if(!tbody)return;
  if(!data.length){tbody.innerHTML=emptyState("Belum ada data biomonitoring","fa-flask-vial");document.getElementById("bioTableFooter").textContent="Tidak ada data";return;}
  tbody.innerHTML=data.map(function(r){
    var over=r.nilai>r.batas;
    var badge=over?'<span style="background:#FFEBEE;color:#C62828;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-xmark"></i> Melebihi</span>':'<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-check"></i> Normal</span>';
    var tipeBadge=r.tipe==="Biomarker"?'<span style="background:#F3E5F5;color:#6A1B9A;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700">Biomarker</span>':'<span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700">Personal</span>';
    return'<tr>'
      +'<td><strong>'+esc(r.tahun||"—")+'</strong></td>'
      +'<td>'+esc(r.kapal||"—")+'</td>'
      +'<td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700">'+esc(r.fleet||"—")+'</span></td>'
      +'<td>'+esc(r.pekerja||"—")+'</td>'
      +'<td>'+tipeBadge+'</td>'
      +'<td style="font-size:11px;color:var(--text-muted)">'+esc(r.lokasi||"—")+'</td>'
      +'<td style="font-weight:700;color:'+(over?"#C62828":"#2E7D32")+'">'+r.nilai+' <small style="font-weight:400;color:var(--text-muted)">'+esc(r.satuan)+'</small></td>'
      +'<td style="color:var(--text-muted)">'+r.batas+' '+esc(r.satuan)+'</td>'
      +'<td>'+badge+'</td>'
      +'</tr>';
  }).join("");
  var ft=document.getElementById("bioTableFooter");
  if(ft)ft.textContent="Menampilkan "+data.length+" entri";
}

function applyBioKimiaFilters(){renderBioKimiaSection();}
function clearBioKimiaFilters(){
  ["bio-filter-tahun","bio-filter-kapal","bio-filter-tipe"].forEach(function(id){var el=document.getElementById(id);if(el)el.value=id==="bio-filter-tipe"?"all":"";});
  renderBioKimiaSection();
}
function searchBioTable(){
  var q=((document.getElementById("bio-search")||{}).value||"").toLowerCase();
  var res=q?filteredBioKimia.filter(function(r){return(r.pekerja||"").toLowerCase().includes(q)||(r.kapal||"").toLowerCase().includes(q)||(r.tipe||"").toLowerCase().includes(q);}):filteredBioKimia;
  renderBioTable(res);
}
function sortBioTable(col){
  if(bioKimiaSortCol===col)bioKimiaSortDir*=-1;else{bioKimiaSortCol=col;bioKimiaSortDir=-1;}
  var keys=["tahun","kapal","fleet","pekerja","tipe","lokasi","nilai","batas"];
  filteredBioKimia.sort(function(a,b){return String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),undefined,{numeric:true})*bioKimiaSortDir;});
  renderBioTable(filteredBioKimia);
}
function applyKimiaFilters(){
  const b=document.getElementById("kimia-filter-bulan").value;
  const f=document.getElementById("kimia-filter-fleet").value;
  const m=document.getElementById("kimia-filter-metode").value;
  const bh=(document.getElementById("kimia-filter-bahan")||{}).value||"";
  filteredKimia=rawKimia.filter(r=>
    (!b||(r["Tanggal"]||"").includes(b))&&
    (!f||r["Fleet"]===f)&&
    (!m||r["Metode Sampling"]===m)&&
    (!bh||(r["Nama Bahan Kimia"]||"").toLowerCase().includes(bh.toLowerCase()))
  );renderKimiaPage();
}
function clearKimiaFilters(){
  ["kimia-filter-bulan","kimia-filter-fleet","kimia-filter-metode"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const bh=document.getElementById("kimia-filter-bahan");if(bh)bh.value="";
  filteredKimia=[...rawKimia];renderKimiaPage();
}
function searchKimiaTable(){const q=(document.getElementById("kimia-search")||{}).value||"";document.querySelectorAll("#kimiaTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}
function sortKimiaTable(col){if(kimiaSortCol===col)kimiaSortDir*=-1;else{kimiaSortCol=col;kimiaSortDir=1;}const keys=["Nama Kapal","Fleet","Nama Bahan Kimia","Metode Sampling","Media Sampel","Hasil Pengukuran","Satuan","TLV-TWA ACGIH","% terhadap TLV/BEI","Status","Nama Laboratorium"];filteredKimia.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*kimiaSortDir);renderKimiaTable(filteredKimia);}
function toggleKimiaChartType(btn,type){kimiaChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderKimiaBarChart(filteredKimia);}

/* ═══════════════════════════════════════════════
   FAKTOR BIOLOGI
═══════════════════════════════════════════════ */
function renderBiologiPage(){
  const data=filteredBiologi;
  const total=data.length;
  const melebihi=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).length;
  const perhatian=data.filter(r=>(r["Status"]||"").toLowerCase().includes("perhatian")).length;
  const aman=data.filter(r=>(r["Status"]||"").toLowerCase().includes("aman")).length;
  const lokSet=new Set(data.map(r=>(r["Area / Lokasi"]||"").trim()).filter(Boolean));
  document.getElementById("biologi-total").textContent=total;
  document.getElementById("biologi-melebihi").textContent=melebihi;
  document.getElementById("biologi-perhatian").textContent=perhatian;
  document.getElementById("biologi-aman").textContent=aman;
  document.getElementById("biologi-lokasi").textContent=lokSet.size;
  renderBiologiBarChart(data);renderBiologiDonutChart(data);renderBiologiAlertList(data);renderBiologiTable(data);
}
function renderBiologiBarChart(data){
  const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const tgl=r["Tanggal"]||"";BULAN_ORDER.forEach((bln,i)=>{if(tgl.toLowerCase().includes(bln.toLowerCase())||(parseInt((tgl.split("-")[1]||"0"))-1===i))counts[bln]++;});});
  const ctx=document.getElementById("biologiBarChart");if(!ctx)return;
  if(biologiBarChart)biologiBarChart.destroy();
  biologiBarChart=new Chart(ctx.getContext("2d"),{type:biologiChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Sampling",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:biologiChartType==="line"?"rgba(0,131,143,0.12)":"#00838F",borderColor:"#006064",borderWidth:biologiChartType==="line"?2.5:1,borderRadius:biologiChartType==="bar"?6:0,fill:biologiChartType==="line",tension:0.4,pointBackgroundColor:"#006064",pointRadius:biologiChartType==="line"?4:0}]},options:chartOpts()});
}
function renderBiologiDonutChart(data){
  const agenMap={};
  data.forEach(r=>{const a=r["Jenis Agen"]||"Lainnya";agenMap[a]=(agenMap[a]||0)+1;});
  const ctx=document.getElementById("biologiDonutChart");if(!ctx)return;
  if(biologiDonutChart)biologiDonutChart.destroy();
  const keys=Object.keys(agenMap);
  const palette=["#00838F","#43A047","#FB8C00","#E53935","#8E24AA"];
  biologiDonutChart=new Chart(ctx.getContext("2d"),{type:"doughnut",data:{labels:keys,datasets:[{data:keys.map(k=>agenMap[k]),backgroundColor:palette.slice(0,keys.length),borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}
function renderBiologiAlertList(data){
  const el=document.getElementById("biologiAlertList");if(!el)return;
  const over=data.filter(r=>(r["Status"]||"").toLowerCase().includes("melebihi")).slice(0,6);
  if(!over.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-check-circle" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Semua dalam batas aman</div>';return;}
  el.innerHTML=over.map((r,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name">${esc(r["Nama Kapal"]||"")} — ${esc(r["Nama Agen / Spesies"]||"")} (${esc(r["Media Sampel"]||"")})</div><div class="hazard-count">${r["Hasil Pengukuran"]||""} ${esc(r["Satuan"]||"")}</div></div>`).join("");
}
function renderBiologiTable(data){
  const tbody=document.getElementById("biologiTableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>`<tr>
    <td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Fleet"]||"")}</span></td>
    <td>${esc(r["Area / Lokasi"]||"")}</td>
    <td>${esc(r["Jenis Agen"]||"")}</td>
    <td>${esc(r["Nama Agen / Spesies"]||"")}</td>
    <td>${esc(r["Media Sampel"]||"")}</td>
    <td style="font-weight:700">${r["Hasil Pengukuran"]||"—"}</td>
    <td>${esc(r["Satuan"]||"")}</td>
    <td>${r["Baku Mutu / Referensi"]||"—"}</td>
    <td>${nabBadge(r["Status"])}</td>
    <td style="font-size:11px">${esc(r["Nama Laboratorium"]||"—")}</td>
  </tr>`).join("");
  const f=document.getElementById("biologiTableFooter");if(f)f.textContent=`Menampilkan ${data.length} dari ${rawBiologi.length} entri`;
}
function applyBiologiFilters(){
  const b=document.getElementById("biologi-filter-bulan").value;
  const f=document.getElementById("biologi-filter-fleet").value;
  const a=document.getElementById("biologi-filter-agen").value;
  const k=(document.getElementById("biologi-filter-kapal")||{}).value||"";
  filteredBiologi=rawBiologi.filter(r=>
    (!b||(r["Tanggal"]||"").includes(b))&&
    (!f||r["Fleet"]===f)&&
    (!a||r["Jenis Agen"]===a)&&
    (!k||(r["Nama Kapal"]||"").toLowerCase().includes(k.toLowerCase()))
  );renderBiologiPage();
}
function clearBiologiFilters(){
  ["biologi-filter-bulan","biologi-filter-fleet","biologi-filter-agen"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const k=document.getElementById("biologi-filter-kapal");if(k)k.value="";
  filteredBiologi=[...rawBiologi];renderBiologiPage();
}
function searchBiologiTable(){const q=(document.getElementById("biologi-search")||{}).value||"";document.querySelectorAll("#biologiTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}
function sortBiologiTable(col){if(biologiSortCol===col)biologiSortDir*=-1;else{biologiSortCol=col;biologiSortDir=1;}const keys=["Nama Kapal","Fleet","Area / Lokasi","Jenis Agen","Nama Agen / Spesies","Media Sampel","Hasil Pengukuran","Satuan","Baku Mutu / Referensi","Status","Nama Laboratorium"];filteredBiologi.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*biologiSortDir);renderBiologiTable(filteredBiologi);}
function toggleBiologiChartType(btn,type){biologiChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderBiologiBarChart(filteredBiologi);}

/* ═══════════════════════════════════════════════
   FAKTOR ERGONOMI
═══════════════════════════════════════════════ */
function renderErgonomiPage(){
  const data=filteredErgonomi;
  const total=data.length;
  const tinggi=data.filter(r=>parseInt(r["Level Risiko (1–4)"]||0)>=3).length;
  const sedang=data.filter(r=>parseInt(r["Level Risiko (1–4)"]||0)===2).length;
  const rendah=data.filter(r=>parseInt(r["Level Risiko (1–4)"]||0)===1).length;
  const tlOpen=data.filter(r=>(r["Status TL"]||"").toLowerCase()==="open").length;
  document.getElementById("ergonomi-total").textContent=total;
  document.getElementById("ergonomi-tinggi").textContent=tinggi;
  document.getElementById("ergonomi-sedang").textContent=sedang;
  document.getElementById("ergonomi-rendah").textContent=rendah;
  document.getElementById("ergonomi-tl-open").textContent=tlOpen;
  renderErgonomiBarChart(data);renderErgonomiDonutChart(data);renderErgonomiAlertList(data);renderErgonomiTable(data);
}
function renderErgonomiBarChart(data){
  const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const tgl=r["Tanggal"]||"";BULAN_ORDER.forEach((bln,i)=>{if(tgl.toLowerCase().includes(bln.toLowerCase())||(parseInt((tgl.split("-")[1]||"0"))-1===i))counts[bln]++;});});
  const ctx=document.getElementById("ergonomiBarChart");if(!ctx)return;
  if(ergonomiBarChart)ergonomiBarChart.destroy();
  ergonomiBarChart=new Chart(ctx.getContext("2d"),{type:ergonomiChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Assessment",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:ergonomiChartType==="line"?"rgba(245,124,0,0.12)":"#F57C00",borderColor:"#E65100",borderWidth:ergonomiChartType==="line"?2.5:1,borderRadius:ergonomiChartType==="bar"?6:0,fill:ergonomiChartType==="line",tension:0.4,pointBackgroundColor:"#E65100",pointRadius:ergonomiChartType==="line"?4:0}]},options:chartOpts()});
}
function renderErgonomiDonutChart(data){
  const levels={"Level 1 — Rendah":0,"Level 2 — Sedang":0,"Level 3 — Tinggi":0,"Level 4 — Sangat Tinggi":0};
  data.forEach(r=>{const n=parseInt(r["Level Risiko (1–4)"]||0);if(n===1)levels["Level 1 — Rendah"]++;else if(n===2)levels["Level 2 — Sedang"]++;else if(n===3)levels["Level 3 — Tinggi"]++;else if(n>=4)levels["Level 4 — Sangat Tinggi"]++;});
  const ctx=document.getElementById("ergonomiDonutChart");if(!ctx)return;
  if(ergonomiDonutChart)ergonomiDonutChart.destroy();
  ergonomiDonutChart=new Chart(ctx.getContext("2d"),{type:"doughnut",data:{labels:Object.keys(levels),datasets:[{data:Object.values(levels),backgroundColor:["#43A047","#FB8C00","#E53935","#880E4F"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}
function renderErgonomiAlertList(data){
  const el=document.getElementById("ergonomiAlertList");if(!el)return;
  const high=data.filter(r=>parseInt(r["Level Risiko (1–4)"]||0)>=3).slice(0,6);
  if(!high.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-check-circle" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada risiko tinggi</div>';return;}
  el.innerHTML=high.map((r,i)=>`<div class="hazard-item"><div class="hazard-rank r${(i%5)+1}">${i+1}</div><div class="hazard-name">${esc(r["Nama Kapal"]||"")} — ${esc(r["Jenis Pekerjaan / Tugas"]||"")} (Skor: ${r["Skor"]||""})</div><div class="hazard-count">L${r["Level Risiko (1–4)"]||""}</div></div>`).join("");
}
function renderErgonomiTable(data){
  const tbody=document.getElementById("ergonomiTableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>`<tr>
    <td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Fleet"]||"")}</span></td>
    <td>${esc(r["Area / Unit Kerja"]||"")}</td>
    <td style="max-width:140px">${esc(r["Jenis Pekerjaan / Tugas"]||"")}</td>
    <td>${esc(r["Metode Assessment"]||"")}</td>
    <td style="font-weight:700;text-align:center">${r["Skor"]||"—"}</td>
    <td style="text-align:center">${riskBadge(r["Level Risiko (1–4)"])}</td>
    <td style="font-size:11px">${esc(r["Keluhan MSDs (area tubuh)"]||"—")}</td>
    <td style="font-size:11px;max-width:140px">${esc(r["Rekomendasi Teknis"]||"—")}</td>
    <td>${tlBadge(r["Status TL"])}</td>
  </tr>`).join("");
  const f=document.getElementById("ergonomiTableFooter");if(f)f.textContent=`Menampilkan ${data.length} dari ${rawErgonomi.length} entri`;
}
function applyErgonomiFilters(){
  const b=document.getElementById("ergonomi-filter-bulan").value;
  const f=document.getElementById("ergonomi-filter-fleet").value;
  const l=document.getElementById("ergonomi-filter-level").value;
  const k=(document.getElementById("ergonomi-filter-kapal")||{}).value||"";
  filteredErgonomi=rawErgonomi.filter(r=>
    (!b||(r["Tanggal"]||"").includes(b))&&
    (!f||r["Fleet"]===f)&&
    (!l||String(r["Level Risiko (1–4)"]||"")===l)&&
    (!k||(r["Nama Kapal"]||"").toLowerCase().includes(k.toLowerCase()))
  );renderErgonomiPage();
}
function clearErgonomiFilters(){
  ["ergonomi-filter-bulan","ergonomi-filter-fleet","ergonomi-filter-level"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const k=document.getElementById("ergonomi-filter-kapal");if(k)k.value="";
  filteredErgonomi=[...rawErgonomi];renderErgonomiPage();
}
function searchErgonomiTable(){const q=(document.getElementById("ergonomi-search")||{}).value||"";document.querySelectorAll("#ergonomiTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}
function sortErgonomiTable(col){if(ergonomiSortCol===col)ergonomiSortDir*=-1;else{ergonomiSortCol=col;ergonomiSortDir=1;}const keys=["Nama Kapal","Fleet","Area / Unit Kerja","Jenis Pekerjaan / Tugas","Metode Assessment","Skor","Level Risiko (1–4)","Keluhan MSDs (area tubuh)","Rekomendasi Teknis","Status TL"];filteredErgonomi.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*ergonomiSortDir);renderErgonomiTable(filteredErgonomi);}
function toggleErgonomiChartType(btn,type){ergonomiChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderErgonomiBarChart(filteredErgonomi);}

/* ═══════════════════════════════════════════════
   FAKTOR PSIKOSOSIAL
═══════════════════════════════════════════════ */
function renderPsikoPage(){
  const data=filteredPsikososial;
  const total=data.length;
  const tinggi=data.filter(r=>(r["Level Risiko"]||"").toLowerCase().includes("tinggi")).length;
  const sedang=data.filter(r=>(r["Level Risiko"]||"").toLowerCase().includes("sedang")).length;
  const rendah=data.filter(r=>(r["Level Risiko"]||"").toLowerCase().includes("rendah")).length;
  const responden=data.reduce((s,r)=>s+parseInt(r["Jumlah Responden"]||0),0);
  document.getElementById("psiko-total").textContent=total;
  document.getElementById("psiko-tinggi").textContent=tinggi;
  document.getElementById("psiko-sedang").textContent=sedang;
  document.getElementById("psiko-rendah").textContent=rendah;
  document.getElementById("psiko-responden").textContent=fmtNum(responden);
  renderPsikoBarChart(data);renderPsikoDonutChart(data);renderPsikoRadarChart(data);renderPsikoTable(data);
}
function renderPsikoBarChart(data){
  const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);
  data.forEach(r=>{const tgl=r["Tanggal"]||"";BULAN_ORDER.forEach((bln,i)=>{if(tgl.toLowerCase().includes(bln.toLowerCase())||(parseInt((tgl.split("-")[1]||"0"))-1===i))counts[bln]++;});});
  const ctx=document.getElementById("psikoBarChart");if(!ctx)return;
  if(psikoBarChart)psikoBarChart.destroy();
  psikoBarChart=new Chart(ctx.getContext("2d"),{type:psikoChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Assessment",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:psikoChartType==="line"?"rgba(30,136,229,0.12)":"#1E88E5",borderColor:"#1565C0",borderWidth:psikoChartType==="line"?2.5:1,borderRadius:psikoChartType==="bar"?6:0,fill:psikoChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:psikoChartType==="line"?4:0}]},options:chartOpts()});
}
function renderPsikoDonutChart(data){
  const levels={"Risiko Rendah":0,"Risiko Sedang":0,"Risiko Tinggi":0};
  data.forEach(r=>{const l=(r["Level Risiko"]||"").toLowerCase();if(l.includes("tinggi"))levels["Risiko Tinggi"]++;else if(l.includes("sedang"))levels["Risiko Sedang"]++;else if(l.includes("rendah"))levels["Risiko Rendah"]++;});
  const ctx=document.getElementById("psikoDonutChart");if(!ctx)return;
  if(psikoDonutChart)psikoDonutChart.destroy();
  psikoDonutChart=new Chart(ctx.getContext("2d"),{type:"doughnut",data:{labels:Object.keys(levels),datasets:[{data:Object.values(levels),backgroundColor:["#43A047","#FB8C00","#E53935"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});
}
function renderPsikoRadarChart(data){
  const ctx=document.getElementById("psikoRadarChart");if(!ctx)return;
  if(psikoRadarChart)psikoRadarChart.destroy();
  const dims=["Beban Kerja (1–5)","Kontrol Kerja (1–5)","Dukungan Atasan (1–5)","Hub. Antar Rekan (1–5)","Peran Pekerjaan (1–5)","Perubahan Organisasi (1–5)"];
  const labels=["Beban Kerja","Kontrol Kerja","Dukungan Atasan","Hub. Rekan","Peran","Perubahan Org"];
  const avgs=dims.map(d=>{const vals=data.map(r=>parseFloat(r[d]||0)).filter(v=>v>0);return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0;});
  psikoRadarChart=new Chart(ctx.getContext("2d"),{type:"radar",data:{labels,datasets:[{label:"Rata-rata Skor",data:avgs.map(v=>+v.toFixed(2)),backgroundColor:"rgba(21,101,192,0.15)",borderColor:"#1565C0",borderWidth:2,pointBackgroundColor:"#1565C0",pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:5,ticks:{stepSize:1,color:"#90A4AE",font:{size:10}},grid:{color:"#ECEFF1"},pointLabels:{color:"#607D8B",font:{size:10}}}},plugins:{legend:{display:false}}}});
}
function renderPsikoTable(data){
  const tbody=document.getElementById("psikoTableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>`<tr>
    <td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td>
    <td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Fleet"]||"")}</span></td>
    <td>${esc(r["Departemen / Jabatan"]||"")}</td>
    <td>${esc(r["Instrumen"]||"")}</td>
    <td style="text-align:center">${r["Jumlah Responden"]||"—"}</td>
    <td style="font-weight:700;text-align:center">${r["Total Skor"]||"—"}</td>
    <td>${psikoBadge(r["Level Risiko"])}</td>
    <td style="font-size:11px;max-width:160px">${esc(r["Program Intervensi"]||"—")}</td>
    <td>${tlBadge(r["Status TL"])}</td>
  </tr>`).join("");
  const f=document.getElementById("psikoTableFooter");if(f)f.textContent=`Menampilkan ${data.length} dari ${rawPsikososial.length} entri`;
}
function applyPsikoFilters(){
  const b=document.getElementById("psiko-filter-bulan").value;
  const f=document.getElementById("psiko-filter-fleet").value;
  const l=document.getElementById("psiko-filter-level").value;
  const k=(document.getElementById("psiko-filter-kapal")||{}).value||"";
  filteredPsikososial=rawPsikososial.filter(r=>
    (!b||(r["Tanggal"]||"").includes(b))&&
    (!f||r["Fleet"]===f)&&
    (!l||(r["Level Risiko"]||"").toLowerCase().includes(l.toLowerCase()))&&
    (!k||(r["Nama Kapal"]||"").toLowerCase().includes(k.toLowerCase()))
  );renderPsikoPage();
}
function clearPsikoFilters(){
  ["psiko-filter-bulan","psiko-filter-fleet","psiko-filter-level"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const k=document.getElementById("psiko-filter-kapal");if(k)k.value="";
  filteredPsikososial=[...rawPsikososial];renderPsikoPage();
}
function searchPsikoTable(){const q=(document.getElementById("psiko-search")||{}).value||"";document.querySelectorAll("#psikoTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}

/* ═══════════════════════════════════════════════
   CLOSEOUT HRA & IH 2025 — DATA STATIS
═══════════════════════════════════════════════ */
const RAW_CLOSEOUT_2025 = [
  {kapal:"PIS NATUNA",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS ROKAN",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PRIMA XP",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PATRA TANKER II",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PATRA TANKER I",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PEGADEN",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"SUNGAI GERONG",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"MT.GAMALAMA",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS PRABUMULIH",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS JATIBARANG",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS CEPU",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS CINTA",jenis:"HRA",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"KASIM",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"SEI PAKNING",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"SENIPAH",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PATRA TANKER III",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"KAKAP",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"SAMBU",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PERTAMINA GAS 2",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PANGKALAN BRANDAN",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PIS PATRIOT",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PAGERUNGAN",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"TRANSKO BIMA",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"KAMOJANG",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PANDAN",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"MAUHAU",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PALU SIPAT",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PIS MAHAKAM",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"KLASOGUN",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"GAS ARIMBI",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PANDERMAN",jenis:"IHM",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"GAS AMBALAT",jenis:"HRA",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PANGRANGO",jenis:"IHM",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"GEDE",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"GELISH",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PARIGI",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"TRANSKO AQUILA",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"KRASAK",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"KLAWOTONG",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PLAJU",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"MATINDOK",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"SERUI",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"BALONGAN",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"PERTAMINA GAS 1",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"KUANG",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"TRANSKO ANTASENA",jenis:"IHM",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"TRANSKO ARAFURA",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"GAS PATRA 2",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"MERAUKE",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"MUNDU",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"GAS PATRA 3",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"TRANSKO TAURUS",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"KATOMAS",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"MUSI",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"MEDITRAN",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"KETALING",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PAPANDAYAN",jenis:"IHM",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"TRANSKO ARIES",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PANJANG",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"GAS ATTAKA",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"GAS ARAR",jenis:"IHM",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"FASTRON",jenis:"IHM",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"PASAMAN",jenis:"IHM",fleet:"Fleet Product II",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"HRA PIS BANGKA",jenis:"HRA",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"HRA PIS BELITUNG",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"HRA GALUNGGUNG",jenis:"HRA",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"HRA GAMKONORA",jenis:"HRA",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"HRA SANGGAU",jenis:"HRA",fleet:"Fleet Crude",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"},
  {kapal:"HRA GAS ARJUNA",jenis:"HRA",fleet:"Fleet Gas & Petchem",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"CLOSE"},
  {kapal:"HRA PIS BINTAN",jenis:"HRA",fleet:"Fleet Product I",statusMon:"Sudah Terlaksana",laporan:"Sudah Terkirim Ke Email Kapal",closeout:"OPEN"}
];

let filteredCO25=[...RAW_CLOSEOUT_2025];
let co25SortCol=-1,co25SortDir=1;
let co25BarChart,co25DonutChart;

function renderCO25Page(){
  const data=filteredCO25;
  const total=data.length;
  const closeCount=data.filter(r=>r.closeout.trim()==="CLOSE").length;
  const openCount=data.filter(r=>r.closeout.trim()==="OPEN").length;
  const pct=total?Math.round(closeCount/total*100):0;
  const hraCount=data.filter(r=>r.jenis.trim()==="HRA").length;
  const ihmCount=data.filter(r=>r.jenis.trim()==="IHM").length;
  const el=id=>document.getElementById(id);
  if(el("co25-total"))el("co25-total").textContent=total;
  if(el("co25-close"))el("co25-close").textContent=closeCount;
  if(el("co25-open"))el("co25-open").textContent=openCount;
  if(el("co25-pct"))el("co25-pct").textContent=pct+"%";
  if(el("co25-hra"))el("co25-hra").textContent=hraCount;
  if(el("co25-ihm"))el("co25-ihm").textContent=ihmCount;
  renderCO25BarChart(data);
  renderCO25DonutChart(data);
  renderCO25OpenList(data);
  renderCO25Table(data);
}

function renderCO25BarChart(data){
  const fleets=["Fleet Product I","Fleet Product II","Fleet Crude","Fleet Gas & Petchem"];
  const closeData=fleets.map(f=>data.filter(r=>r.fleet===f&&r.closeout.trim()==="CLOSE").length);
  const openData=fleets.map(f=>data.filter(r=>r.fleet===f&&r.closeout.trim()==="OPEN").length);
  const ctx=document.getElementById("co25BarChart");if(!ctx)return;
  if(co25BarChart)co25BarChart.destroy();
  co25BarChart=new Chart(ctx.getContext("2d"),{
    type:"bar",
    data:{
      labels:["FP I","FP II","FC","FGP"],
      datasets:[
        {label:"CLOSE",data:closeData,backgroundColor:"#43A047",borderRadius:5},
        {label:"OPEN",data:openData,backgroundColor:"#FB8C00",borderRadius:5}
      ]
    },
    options:{...chartOpts(),plugins:{...chartOpts().plugins,legend:{display:true,position:"top",labels:{color:"var(--text)",font:{size:11},boxWidth:12}}},scales:{x:{stacked:false},y:{stacked:false,beginAtZero:true,ticks:{stepSize:1}}}}
  });
}

function renderCO25DonutChart(data){
  const closeCount=data.filter(r=>r.closeout.trim()==="CLOSE").length;
  const openCount=data.filter(r=>r.closeout.trim()==="OPEN").length;
  const ctx=document.getElementById("co25DonutChart");if(!ctx)return;
  if(co25DonutChart)co25DonutChart.destroy();
  co25DonutChart=new Chart(ctx.getContext("2d"),{
    type:"doughnut",
    data:{labels:["CLOSE","OPEN"],datasets:[{data:[closeCount,openCount],backgroundColor:["#43A047","#FB8C00"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},
    options:donutOpts()
  });
}

function renderCO25OpenList(data){
  const list=document.getElementById("co25OpenList");if(!list)return;
  const openItems=data.filter(r=>r.closeout.trim()==="OPEN");
  if(!openItems.length){list.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted)"><i class="fas fa-check-circle" style="color:#43A047;font-size:28px;margin-bottom:8px;display:block"></i>Semua kapal sudah CLOSE</div>';return;}
  list.innerHTML=openItems.map(r=>`<div class="hazard-item" style="border-left:3px solid #FB8C00">
    <div class="hazard-name" style="font-weight:700">${r.kapal}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${r.jenis} &middot; ${r.fleet}</div>
    <span style="display:inline-block;margin-top:4px;background:#FFF3E0;color:#E65100;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">OPEN</span>
  </div>`).join("");
}

function renderCO25Table(data){
  const tbody=document.getElementById("co25TableBody");if(!tbody)return;
  tbody.innerHTML=data.map(r=>{
    const badge=r.closeout.trim()==="CLOSE"
      ?'<span class="badge-close"><i class="fas fa-check" style="font-size:9px"></i>CLOSE</span>'
      :'<span class="badge-open-co"><i class="fas fa-clock" style="font-size:9px"></i>OPEN</span>';
    const jenisBadge=r.jenis.trim()==="HRA"
      ?'<span class="badge-jenis-hra">HRA</span>'
      :'<span class="badge-jenis-ihm">IHM</span>';
    return `<tr>
      <td><strong style="color:var(--text)">${r.kapal}</strong></td>
      <td>${jenisBadge}</td>
      <td><span style="background:#F5F5F5;color:#37474F;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${r.fleet}</span></td>
      <td><i class="fas fa-check-circle" style="color:#43A047;margin-right:5px"></i>${r.statusMon}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.laporan}</td>
      <td>${badge}</td>
    </tr>`;
  }).join("");
  const f=document.getElementById("co25TableFooter");
  if(f)f.textContent="Menampilkan "+data.length+" dari "+RAW_CLOSEOUT_2025.length+" entri";
}

function applyCO25Filters(){
  const fleet=(document.getElementById("co25-filter-fleet")||{}).value||"";
  const type=(document.getElementById("co25-filter-type")||{}).value||"";
  const status=(document.getElementById("co25-filter-status")||{}).value||"";
  const kapal=(document.getElementById("co25-filter-kapal")||{}).value||"";
  filteredCO25=RAW_CLOSEOUT_2025.filter(r=>
    (!fleet||r.fleet===fleet)&&
    (!type||r.jenis.trim()===type)&&
    (!status||r.closeout.trim()===status)&&
    (!kapal||r.kapal.toLowerCase().includes(kapal.toLowerCase()))
  );
  renderCO25Page();
}

function clearCO25Filters(){
  ["co25-filter-fleet","co25-filter-type","co25-filter-status"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  const k=document.getElementById("co25-filter-kapal");if(k)k.value="";
  filteredCO25=[...RAW_CLOSEOUT_2025];
  renderCO25Page();
}

function searchCO25Table(){
  const q=(document.getElementById("co25-search")||{}).value||"";
  document.querySelectorAll("#co25TableBody tr").forEach(row=>{
    row.style.display=row.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";
  });
}

function sortCO25Table(col){
  if(co25SortCol===col)co25SortDir*=-1;else{co25SortCol=col;co25SortDir=1;}
  const keys=["kapal","jenis","fleet","statusMon","laporan","closeout"];
  filteredCO25.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*co25SortDir);
  renderCO25Table(filteredCO25);
}
function sortPsikoTable(col){if(psikoSortCol===col)psikoSortDir*=-1;else{psikoSortCol=col;psikoSortDir=1;}const keys=["Nama Kapal","Fleet","Departemen / Jabatan","Instrumen","Jumlah Responden","Total Skor","Level Risiko","Program Intervensi","Status TL"];filteredPsikososial.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*psikoSortDir);renderPsikoTable(filteredPsikososial);}
function togglePsikoChartType(btn,type){psikoChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderPsikoBarChart(filteredPsikososial);}

/* ════════════════════════════════════════════════════════════════
   HAZARD CONTROL VIEW — Per Kapal, Filterable
   Zona: Bridge · Cargo Tank · Engine Room · Pump Room · Forecastle
════════════════════════════════════════════════════════════════ */

/* ── Per-zone hazard data — COMING SOON (data aktual belum tersedia) ── */
var HCV_ZONE_DATA = {
  bridge:{
    name:'Akomodasi & Anjungan', nameEn:'Accommodation & Navigation Bridge',
    risk:'SOON', rc:'#9E9E9E', rb:'rgba(158,158,158,.12)',
    hazards:[], ctrl:[], act:[], reg:''
  },
  cargo:{
    name:'Cargo Tank Area', nameEn:'Cargo Tank Area (Typical)',
    risk:'SOON', rc:'#9E9E9E', rb:'rgba(158,158,158,.12)',
    hazards:[], ctrl:[], act:[], reg:''
  },
  engine:{
    name:'Kamar Mesin', nameEn:'Engine Room',
    risk:'SOON', rc:'#9E9E9E', rb:'rgba(158,158,158,.12)',
    hazards:[], ctrl:[], act:[], reg:''
  },
  pump:{
    name:'Pump Room', nameEn:'Cargo Pump Room',
    risk:'SOON', rc:'#9E9E9E', rb:'rgba(158,158,158,.12)',
    hazards:[], ctrl:[], act:[], reg:''
  },
  fore:{
    name:'Haluan & Mooring', nameEn:'Forecastle (Mooring Area)',
    risk:'SOON', rc:'#9E9E9E', rb:'rgba(158,158,158,.12)',
    hazards:[], ctrl:[], act:[], reg:''
  },
};

/* Current selected ship */
var hcvCurrentShip = null;

/* ── OPEN MODAL ── */
function openHazardMap(){
  var modal=document.getElementById('hazardMapModal');
  if(!modal)return;
  modal.classList.add('open');
  hcvBuildShipDropdown();
  hcvRenderProfile();
  hcvRenderTop();
  hcvRenderZoneSummary();
}
function closeHazardMap(){
  var modal=document.getElementById('hazardMapModal');
  if(modal)modal.classList.remove('open');
}
window.openHazardMap=openHazardMap;
window.closeHazardMap=closeHazardMap;

/* ── BUILD SHIP DROPDOWN from RAW_CLOSEOUT_2025 ── */
function hcvBuildShipDropdown(){
  var sel=document.getElementById('hcvShipFilter');
  if(!sel)return;
  var data=(typeof rawCloseout25!=='undefined'&&rawCloseout25.length>0)
    ?rawCloseout25
    :(typeof RAW_CLOSEOUT_2025!=='undefined'?RAW_CLOSEOUT_2025:[]);
  /* unique ships sorted */
  var ships=[...new Set(data.map(function(r){return r.kapal;}))].sort();
  sel.innerHTML='<option value="">— Semua / Tipikal —</option>';
  ships.forEach(function(s){
    var opt=document.createElement('option');
    opt.value=s; opt.textContent=s;
    sel.appendChild(opt);
  });
}

/* ── FILTER BY FLEET → update ship dropdown ── */
function hcvApplyFleetFilter(){
  var fleet=document.getElementById('hcvFleetFilter').value;
  var sel=document.getElementById('hcvShipFilter');
  var data=(typeof rawCloseout25!=='undefined'&&rawCloseout25.length>0)
    ?rawCloseout25
    :(typeof RAW_CLOSEOUT_2025!=='undefined'?RAW_CLOSEOUT_2025:[]);
  var filtered=fleet?data.filter(function(r){return r.fleet===fleet;}):data;
  var ships=[...new Set(filtered.map(function(r){return r.kapal;}))].sort();
  sel.innerHTML='<option value="">— Semua / Tipikal —</option>';
  ships.forEach(function(s){
    var opt=document.createElement('option');
    opt.value=s; opt.textContent=s;
    sel.appendChild(opt);
  });
  hcvApplyShipFilter();
}

/* ── SELECT SHIP ── */
function hcvApplyShipFilter(){
  var ship=document.getElementById('hcvShipFilter').value;
  if(!ship){
    hcvCurrentShip=null;
    hcvUpdateShipStrip(null);
    hcvRenderZoneSummary();
    document.getElementById('hcvDetail').innerHTML='<div class="hcv-detail-placeholder"><i class="fas fa-ship" style="font-size:26px;color:rgba(0,180,216,.3);margin-bottom:8px"></i><p>Pilih kapal untuk melihat hazard spesifik per zona</p></div>';
    return;
  }
  var data=(typeof rawCloseout25!=='undefined'&&rawCloseout25.length>0)
    ?rawCloseout25
    :(typeof RAW_CLOSEOUT_2025!=='undefined'?RAW_CLOSEOUT_2025:[]);
  var rec=data.find(function(r){return r.kapal===ship;})||{kapal:ship,fleet:'—',jenis:'—',closeout:'—'};
  hcvCurrentShip=rec;
  hcvUpdateShipStrip(rec);
  hcvRenderZoneSummary();
  /* auto-show info panel */
  hcvZoneClick('bridge');
}
window.hcvApplyShipFilter=hcvApplyShipFilter;
window.hcvApplyFleetFilter=hcvApplyFleetFilter;

/* ── SHIP INFO STRIP ── */
function hcvUpdateShipStrip(rec){
  var nm=document.getElementById('hcvShipName');
  var fl=document.getElementById('hcvShipFleet');
  var jn=document.getElementById('hcvShipJenis');
  var st=document.getElementById('hcvShipStatus');
  if(!rec){
    nm.textContent='Tampilan Tipikal — Pilih kapal untuk data spesifik';
    fl.textContent=''; jn.textContent=''; st.style.display='none'; return;
  }
  nm.textContent=rec.kapal||'—';
  fl.textContent=rec.fleet||'';
  jn.textContent=rec.jenis?'Jenis: '+rec.jenis:'';
  var isCl=(rec.closeout||'').trim().toUpperCase()==='CLOSE';
  st.textContent=isCl?'✓ CLOSE':'⏳ OPEN';
  st.style.cssText='font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;display:inline-block;'
    +(isCl?'background:rgba(67,160,71,.2);color:#43A047;border:1px solid #43A07455;'
           :'background:rgba(255,143,0,.2);color:#FF8F00;border:1px solid #FF8F0055;');
}

/* ── ZONE SUMMARY CARDS ── */
function hcvRenderZoneSummary(){
  var el=document.getElementById('hcvZoneSummary');
  if(!el)return;
  var zones=[
    {id:'bridge',label:'Bridge',icon:'fas fa-building',col:'#FF8F00'},
    {id:'cargo', label:'Cargo Tank',icon:'fas fa-oil-well',col:'#B71C1C'},
    {id:'engine',label:'Engine Room',icon:'fas fa-gears',col:'#C62828'},
    {id:'pump',  label:'Pump Room',icon:'fas fa-faucet-drip',col:'#E63946'},
    {id:'fore',  label:'Haluan',icon:'fas fa-anchor',col:'#FF8F00'},
  ];
  el.innerHTML=zones.map(function(z){
    var d=HCV_ZONE_DATA[z.id];
    var lvlColors={'EXTREME':'#B71C1C','HIGH':'#E63946','MODERATE':'#FF8F00','LOW':'#43A047','SOON':'#9E9E9E'};
    var lc=lvlColors[d.risk]||'#90A4AE';
    return '<div onclick="hcvZoneClick(\''+z.id+'\')" style="display:flex;align-items:center;gap:6px;background:rgba(0,180,216,.07);border:1px solid rgba(0,180,216,.18);border-radius:8px;padding:5px 10px;cursor:pointer;transition:background .15s;flex:1;min-width:0" onmouseover="this.style.background=\'rgba(0,180,216,.15)\'" onmouseout="this.style.background=\'rgba(0,180,216,.07)\'">'
      +'<i class="'+z.icon+'" style="font-size:12px;color:'+z.col+';flex-shrink:0"></i>'
      +'<div style="min-width:0">'
      +'<div style="font-size:9.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+z.label+'</div>'
      +(d.risk==='SOON'?'<div style="font-size:8.5px;color:#9E9E9E">Coming Soon</div>':'<div style="font-size:8.5px;font-weight:700;color:'+lc+'">'+d.risk+'</div>')
      +'</div></div>';
  }).join('');
}

/* ── PROFILE SVG ── */
function hcvRenderProfile(){
  var svg=document.getElementById('hcvProfileSVG');
  if(!svg)return;
  var S='http://www.w3.org/2000/svg';
  svg.innerHTML='';
  function el(tag,attrs){
    var e=document.createElementNS(S,tag);
    Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k]);});
    return e;
  }
  function tx(x,y,txt,attrs){
    var t=document.createElementNS(S,'text');
    t.setAttribute('x',x);t.setAttribute('y',y);
    Object.keys(attrs||{}).forEach(function(k){t.setAttribute(k,attrs[k]);});
    t.textContent=txt;return t;
  }
  function zone(id,x,y,w,h,col,lbl,ly){
    var g=document.createElementNS(S,'g');
    g.setAttribute('cursor','pointer');
    var r=el('rect',{x:x,y:y,width:w,height:h,fill:col,opacity:'.18',rx:3,stroke:col,'stroke-width':1.5});
    g.appendChild(r);
    g.appendChild(el('rect',{x:x+1,y:y+1,width:5,height:h-2,fill:col,rx:3}));
    /* leader line up */
    g.appendChild(el('line',{x1:x+w/2,y1:y,x2:x+w/2,y2:ly+11,stroke:col,'stroke-width':1,'stroke-dasharray':'3,2',opacity:'.7'}));
    /* label box */
    var bw=lbl.length*6.5+14; var bh=12;
    var bx=Math.max(2,Math.min(896-bw,x+w/2-bw/2));
    g.appendChild(el('rect',{x:bx,y:ly-1,width:bw,height:bh,fill:'#060E1E',stroke:col,'stroke-width':1.2,rx:3,opacity:'.94'}));
    var t=document.createElementNS(S,'text');
    t.setAttribute('x',bx+bw/2);t.setAttribute('y',ly+8);t.setAttribute('text-anchor','middle');
    t.setAttribute('fill',col);t.setAttribute('font-size','8');t.setAttribute('font-family','Arial');t.setAttribute('font-weight','700');
    t.textContent=lbl;g.appendChild(t);
    g.addEventListener('click',function(){hcvZoneClick(id);});
    g.addEventListener('mouseenter',function(){r.setAttribute('opacity','.36');});
    g.addEventListener('mouseleave',function(){r.setAttribute('opacity','.18');});
    svg.appendChild(g);
  }

  /* Sky */
  svg.appendChild(el('rect',{x:0,y:0,width:900,height:195,fill:'#C8D8E8'}));
  svg.appendChild(el('rect',{x:0,y:175,width:900,height:20,fill:'#B8CCDC'}));
  /* Water */
  svg.appendChild(el('rect',{x:0,y:195,width:900,height:50,fill:'#2E6E9E'}));
  svg.appendChild(el('rect',{x:0,y:195,width:900,height:4,fill:'#3A80B8'}));
  svg.appendChild(el('line',{x1:0,y1:206,x2:900,y2:206,stroke:'#3A80B8','stroke-width':1,opacity:'.6'}));
  svg.appendChild(el('line',{x1:0,y1:218,x2:900,y2:218,stroke:'#3A80B8','stroke-width':.8,opacity:'.35'}));

  /* HULL */
  svg.appendChild(el('path',{d:'M 30,198 L 30,160 L 52,157 L 795,143 Q 830,140 848,150 L 854,168 L 854,198 Z',fill:'#181818'}));
  /* Red anti-fouling */
  svg.appendChild(el('path',{d:'M 31,198 L 31,210 Q 32,220 60,222 L 798,218 Q 826,216 840,210 L 852,202 L 854,195 Q 840,195 830,196 L 35,196 Z',fill:'#8C1A14'}));
  /* White waterline */
  svg.appendChild(el('line',{x1:31,y1:198,x2:795,y2:198,stroke:'#D8DDD5','stroke-width':2.5}));
  svg.appendChild(el('line',{x1:795,y1:198,x2:843,y2:192,stroke:'#D8DDD5','stroke-width':2.5}));
  /* Hull sheer line */
  svg.appendChild(el('line',{x1:52,y1:157,x2:795,y2:143,stroke:'#252E38','stroke-width':1.5}));
  /* Stern */
  svg.appendChild(el('rect',{x:22,y:155,width:9,height:46,fill:'#101010',rx:1}));
  svg.appendChild(el('rect',{x:22,y:198,width:9,height:24,fill:'#6A1210',rx:1}));
  /* Bow */
  svg.appendChild(el('path',{d:'M 844,150 Q 855,148 862,158 L 868,175 L 868,198 L 854,198 L 852,168 Z',fill:'#181818'}));
  svg.appendChild(el('path',{d:'M 854,198 L 868,198 L 868,212 Q 858,220 838,222 L 798,222 Q 822,220 836,214 Z',fill:'#8C1A14'}));
  svg.appendChild(el('ellipse',{cx:866,cy:212,rx:12,ry:8,fill:'#6A1210',opacity:'.65'}));

  /* SUPERSTRUCTURE */
  svg.appendChild(el('rect',{x:30,y:66,width:185,height:96,fill:'#D8DCDE',rx:1}));
  [78,90,102,114,126,138,150].forEach(function(y){
    svg.appendChild(el('line',{x1:30,y1:y,x2:215,y2:y,stroke:'#BCC0C4','stroke-width':1.2}));
  });
  /* Windows */
  [[68,11],[80,10],[92,10],[104,9],[116,9],[128,8],[140,8],[152,7]].forEach(function(row,fi){
    var y=row[0],h=row[1];
    for(var x=36;x<213;x+=14){
      svg.appendChild(el('rect',{x:x,y:y,width:10,height:h,fill:'#7AAEC2',rx:1,opacity:String(0.95-fi*0.08)}));
    }
  });
  /* Bridge deck */
  svg.appendChild(el('rect',{x:18,y:50,width:208,height:18,fill:'#CDD2D6',rx:1}));
  svg.appendChild(el('rect',{x:24,y:53,width:196,height:12,fill:'#7ABCD0',rx:1,opacity:'.6'}));
  [52,84,116,148,180,208].forEach(function(x){
    svg.appendChild(el('line',{x1:x,y1:53,x2:x,y2:65,stroke:'#9CC8D8','stroke-width':1}));
  });
  svg.appendChild(el('rect',{x:40,y:36,width:152,height:15,fill:'#C0C6CC',rx:1}));
  svg.appendChild(el('rect',{x:62,y:22,width:108,height:15,fill:'#B4BAC0',rx:1}));

  /* FUNNEL (orange/amber) */
  svg.appendChild(el('path',{d:'M 222,22 L 220,100 L 270,100 L 268,22 Z',fill:'#D4780A'}));
  svg.appendChild(el('path',{d:'M 215,18 Q 218,12 245,12 Q 272,12 274,18 L 268,24 Q 265,18 245,18 Q 225,18 222,24 Z',fill:'#B86808'}));
  svg.appendChild(el('ellipse',{cx:245,cy:12,rx:31,ry:6.5,fill:'#0A1218'}));
  /* Red stripe */
  svg.appendChild(el('rect',{x:220,y:42,width:50,height:14,fill:'#CC2200'}));
  svg.appendChild(el('rect',{x:218,y:93,width:62,height:8,fill:'#A86006',rx:1}));

  /* Mast */
  svg.appendChild(el('line',{x1:124,y1:36,x2:124,y2:6,stroke:'#7A8A94','stroke-width':3}));
  svg.appendChild(el('line',{x1:96,y1:13,x2:154,y2:13,stroke:'#7A8A94','stroke-width':2}));
  svg.appendChild(el('circle',{cx:124,cy:6,r:3.5,fill:'#909AA4'}));

  /* Lifeboats */
  [[222,106,15,9],[240,106,15,9],[222,118,15,9],[240,118,15,9]].forEach(function(b){
    svg.appendChild(el('rect',{x:b[0],y:b[1],width:b[2],height:b[3],fill:'#E8D8A8',rx:2,stroke:'#C4A870','stroke-width':.8}));
  });

  /* CARGO DECK */
  svg.appendChild(el('rect',{x:276,y:157,width:466,height:14,fill:'#2A3A28'}));
  svg.appendChild(el('rect',{x:276,y:157,width:466,height:3,fill:'#364A34'}));

  /* CARGO TANK DOMES */
  [[288,157,310,138],[322,157,352,140],[368,157,396,142],[412,157,438,144],[454,157,478,146]].forEach(function(t){
    svg.appendChild(el('path',{d:'M '+t[0]+','+t[1]+' Q '+t[0]+','+t[2]+' '+t[3]+','+t[2]+' Q '+(t[3]+((t[3]-t[0])*1))+','+t[2]+' '+(t[3]+((t[3]-t[0])*1))+','+t[1],fill:'#1C2C38'}));
    var cx=t[3]; var cy=t[2];
    svg.appendChild(el('ellipse',{cx:cx,cy:cy,rx:String(t[3]-t[0]),ry:'8',fill:'#182230'}));
    svg.appendChild(el('ellipse',{cx:cx,cy:cy,rx:String((t[3]-t[0])/2),ry:'3.5',fill:'#1C2A36'}));
  });

  /* Tank dividers */
  [318,370,414,456,508].forEach(function(x){
    svg.appendChild(el('rect',{x:x,y:157,width:3,height:20,fill:'#364852'}));
  });

  /* Manifold */
  svg.appendChild(el('rect',{x:456,y:143,width:32,height:24,fill:'#3A5060',rx:2}));
  svg.appendChild(el('rect',{x:452,y:150,width:40,height:5,fill:'#4A6272',rx:1}));

  /* Pipelines */
  svg.appendChild(el('rect',{x:278,y:163,width:464,height:4,fill:'#3A5A6E',rx:1.5}));
  svg.appendChild(el('rect',{x:278,y:168,width:464,height:3,fill:'#2E4A5A',rx:1}));

  /* Railing */
  svg.appendChild(el('line',{x1:278,y1:162,x2:280,y2:150,stroke:'#446070','stroke-width':1.2}));
  svg.appendChild(el('line',{x1:280,y1:150,x2:720,y2:138,stroke:'#446070','stroke-width':1.2}));
  [300,344,386,430,474,516,560,604,648,692].forEach(function(x){
    var y2=150-(x-280)*12/440;
    svg.appendChild(el('line',{x1:x,y1:162-(x-280)*12/440+6,x2:x,y2:y2,stroke:'#446070','stroke-width':1}));
  });

  /* Pump room deckhouse */
  svg.appendChild(el('rect',{x:548,y:126,width:76,height:46,fill:'#1E2E3A',rx:1}));
  svg.appendChild(el('rect',{x:546,y:126,width:80,height:4,fill:'#2A3E4E'}));
  [556,570,584,598,612].forEach(function(x){
    svg.appendChild(el('rect',{x:x,y:134,width:9,height:8,fill:'#4A8098',rx:1,opacity:'.8'}));
  });
  [558,572,588].forEach(function(x){
    svg.appendChild(el('rect',{x:x,y:114,width:5,height:13,fill:'#2A3E4E',rx:1}));
  });

  /* Fore mast */
  svg.appendChild(el('line',{x1:658,y1:157,x2:658,y2:102,stroke:'#5A6A78','stroke-width':3}));
  svg.appendChild(el('line',{x1:636,y1:113,x2:680,y2:113,stroke:'#5A6A78','stroke-width':2}));
  svg.appendChild(el('circle',{cx:658,cy:102,r:3.5,fill:'#6A7880'}));

  /* Forecastle */
  svg.appendChild(el('path',{d:'M 726,157 L 726,146 Q 728,143 748,141 L 808,139 Q 826,138 832,143 L 836,153 L 836,157 Z',fill:'#1E2C38'}));
  svg.appendChild(el('rect',{x:726,y:145,width:112,height:3,fill:'#2A3E4E'}));
  [744,766].forEach(function(x){svg.appendChild(el('ellipse',{cx:x,cy:153,rx:11,ry:5,fill:'#2E4050'}));});
  [732,750,768,786,804,820].forEach(function(x){svg.appendChild(el('rect',{x:x,y:157,width:7,height:7,fill:'#2A3C4E',rx:1}));});
  svg.appendChild(el('circle',{cx:838,cy:168,r:5.5,fill:'#101820',stroke:'#384858','stroke-width':1.5}));
  svg.appendChild(el('circle',{cx:836,cy:180,r:4.5,fill:'#101820',stroke:'#384858','stroke-width':1.5}));

  /* ZONE OVERLAYS */
  zone('bridge', 18,  18, 204, 145, '#FF8F00', 'AKOMODASI & ANJUNGAN', 18);
  zone('cargo',  278, 128, 268, 86,  '#B71C1C', 'CARGO TANK AREA',      18);
  zone('engine', 22,  164, 256, 72,  '#C62828', 'KAMAR MESIN',          222);
  zone('pump',   544, 118, 90,  96,  '#E63946', 'PUMP ROOM',            18);
  zone('fore',   722, 132, 130, 98,  '#FF8F00', 'HALUAN & MOORING',     18);

  /* Waterline label */
  svg.appendChild(tx(880,240,'STARBOARD VIEW',{'text-anchor':'end',fill:'#607888','font-size':'8','font-family':'Arial','font-style':'italic'}));
}

/* ── TOP VIEW SVG ── */
function hcvRenderTop(){
  var svg=document.getElementById('hcvTopSVG');
  if(!svg)return;
  var S='http://www.w3.org/2000/svg';
  svg.innerHTML='';
  function el(tag,attrs){
    var e=document.createElementNS(S,tag);
    Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k]);});
    return e;
  }
  svg.appendChild(el('rect',{x:0,y:0,width:900,height:170,fill:'#0D1E36'}));
  svg.appendChild(el('path',{d:'M 38 15 L 38 155 L 738 155 Q 848 155 868 85 Q 848 15 738 15 Z',fill:'#1A2E40',stroke:'#2A3E54','stroke-width':1.5}));
  var tZones=[
    {id:'bridge',path:'M 38 15 L 38 155 L 180 155 L 180 15 Z',col:'#FF8F00',lbls:['Akomodasi','& Anjungan'],lx:108,ly:85},
    {id:'cargo', path:'M 184 15 L 184 155 L 592 155 L 592 15 Z',col:'#B71C1C',lbls:['CARGO TANKS'],lx:388,ly:85},
    {id:'pump',  path:'M 596 15 L 596 155 L 686 155 L 686 15 Z',col:'#E63946',lbls:['Pump','Room'],lx:640,ly:85},
    {id:'engine',path:'M 38 90 L 38 155 L 180 155 L 180 90 Z',col:'#C62828',lbls:['Engine','(Bawah)'],lx:108,ly:120},
    {id:'fore',  path:'M 690 15 L 690 155 L 738 155 Q 848 155 868 85 Q 848 15 738 15 Z',col:'#FF8F00',lbls:['Forecastle'],lx:778,ly:85},
  ];
  tZones.forEach(function(z){
    var g=document.createElementNS(S,'g');g.setAttribute('cursor','pointer');
    var p=el('path',{d:z.path,fill:z.col,opacity:'.28',stroke:z.col,'stroke-width':1.2});
    g.appendChild(p);
    g.addEventListener('click',function(){hcvZoneClick(z.id);});
    g.addEventListener('mouseenter',function(){p.setAttribute('opacity','.45');});
    g.addEventListener('mouseleave',function(){p.setAttribute('opacity','.28');});
    svg.appendChild(g);
    z.lbls.forEach(function(line,li){
      var t=document.createElementNS(S,'text');
      t.setAttribute('x',z.lx);t.setAttribute('y',z.ly-((z.lbls.length-1)*8)+li*16);
      t.setAttribute('text-anchor','middle');t.setAttribute('fill','#fff');
      t.setAttribute('font-size',z.lbls.length>1?'8':'10');
      t.setAttribute('font-family','Arial');t.setAttribute('font-weight','700');
      t.textContent=line;svg.appendChild(t);
    });
  });
  [340,490,592].forEach(function(x){svg.appendChild(el('line',{x1:x,y1:15,x2:x,y2:155,stroke:'rgba(0,180,216,.25)','stroke-width':1.5}));});
  [184,686,690].forEach(function(x){svg.appendChild(el('line',{x1:x,y1:15,x2:x,y2:155,stroke:'rgba(0,180,216,.3)','stroke-width':1.5}));});
  /* Void strips */
  svg.appendChild(el('rect',{x:184,y:15,width:408,height:14,fill:'#455A64',opacity:'.35'}));
  svg.appendChild(el('rect',{x:184,y:141,width:408,height:14,fill:'#455A64',opacity:'.35'}));
  var vt=document.createElementNS(S,'text');
  vt.setAttribute('x','388');vt.setAttribute('y','26');vt.setAttribute('text-anchor','middle');
  vt.setAttribute('fill','rgba(144,164,174,.7)');vt.setAttribute('font-size','8');vt.setAttribute('font-family','Arial');
  vt.textContent='VOID / BALLAST SPACE';svg.appendChild(vt);
  /* Manifold */
  svg.appendChild(el('rect',{x:386,y:70,width:56,height:24,fill:'#4A6070',rx:3,opacity:'.7'}));
  var mt=document.createElementNS(S,'text');
  mt.setAttribute('x','414');mt.setAttribute('y','85');mt.setAttribute('text-anchor','middle');
  mt.setAttribute('fill','#7FC3E8');mt.setAttribute('font-size','8');mt.setAttribute('font-family','Arial');
  mt.textContent='MANIFOLD';svg.appendChild(mt);
  var nt=document.createElementNS(S,'text');
  nt.setAttribute('x','886');nt.setAttribute('y','18');nt.setAttribute('text-anchor','end');
  nt.setAttribute('fill','rgba(0,180,216,.55)');nt.setAttribute('font-size','11');
  nt.setAttribute('font-weight','700');nt.setAttribute('font-family','Arial');
  nt.textContent='N \u2191';svg.appendChild(nt);
}

/* ── ZONE CLICK — show detail ── */
function hcvZoneClick(zoneId){
  document.querySelectorAll('.hcv-zone-hit').forEach(function(el){el.setAttribute('opacity','.18');});
  var z=HCV_ZONE_DATA[zoneId]; if(!z)return;

  /* SOON state — data belum tersedia */
  if(z.risk==='SOON'){
    var det=document.getElementById('hcvDetail'); if(!det)return;
    det.innerHTML='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;gap:14px">'
      +'<i class="fas fa-circle-half-stroke" style="font-size:36px;color:rgba(0,180,216,.35)"></i>'
      +'<div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.7)">'+z.name+'</div>'
      +'<div style="font-size:11px;color:rgba(0,180,216,.5);letter-spacing:.8px;text-transform:uppercase">'+z.nameEn+'</div>'
      +'<div style="background:rgba(0,180,216,.08);border:1px solid rgba(0,180,216,.2);border-radius:10px;padding:14px 18px;max-width:220px">'
      +'<div style="font-size:11px;font-weight:700;color:#00B4D8;margin-bottom:6px;letter-spacing:.5px">COMING SOON</div>'
      +'<div style="font-size:11px;color:rgba(255,255,255,.45);line-height:1.6">Data pengukuran aktual untuk zona ini sedang dikembangkan. Akan diisi dari hasil monitoring lapangan.</div>'
      +'</div></div>';
    return;
  }
  var ship=hcvCurrentShip;
  var det=document.getElementById('hcvDetail'); if(!det)return;
  var lc={'EXTREME':'#B71C1C','HIGH':'#E63946','MODERATE':'#FF8F00','LOW':'#43A047'}[z.risk]||'#90A4AE';

  /* Ship-specific context note */
  var shipNote='';
  if(ship){
    var isCl=(ship.closeout||'').trim().toUpperCase()==='CLOSE';
    shipNote='<div style="margin-bottom:10px;padding:8px 10px;background:rgba(0,180,216,.08);border-radius:7px;border:1px solid rgba(0,180,216,.2)">'
      +'<div style="font-size:9px;font-weight:700;color:#00B4D8;letter-spacing:.8px;margin-bottom:3px">KAPAL: '+ship.kapal+'</div>'
      +'<div style="font-size:9px;color:rgba(255,255,255,.55)">Fleet: '+ship.fleet+' &nbsp;|&nbsp; Jenis: '+ship.jenis+'</div>'
      +'<div style="font-size:9px;margin-top:3px;font-weight:700;color:'+(isCl?'#43A047':'#FF8F00')+'">'
      +'Status Closeout: '+(isCl?'✓ CLOSE':'⏳ OPEN')+'</div></div>';
  }

  var hazHtml=z.hazards.map(function(h){
    var pct=h.st==='m'?100:h.st==='p'?65:40;
    var bc={'m':'#EE1111','p':'#FF8800','a':'#00AA33'}[h.st]||'#90A4AE';
    var sl={'m':'MELEBIHI NAB','p':'PERHATIAN','a':'AMAN'}[h.st]||'—';
    var scc={'m':'background:#FFECEC;color:#BB1100;border:1px solid #FFBBBB',
             'p':'background:#FFF4E0;color:#BB5500;border:1px solid #FFD090',
             'a':'background:#E8F8EE;color:#005520;border:1px solid #90D8A8'}[h.st]||'';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 7px;border-radius:6px;background:rgba(255,255,255,.04);margin-bottom:3px;border-left:3px solid '+h.c+'">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.8);font-weight:500;flex:1">'+h.n+'</span>'
      +'<div style="text-align:right">'
      +'<div style="font-size:11px;font-weight:700;color:'+h.c+'">'+h.v+'</div>'
      +'<div style="font-size:8.5px;color:rgba(255,255,255,.3)">NAB: '+h.nab+'</div>'
      +'<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;'+scc+'">'+sl+'</span>'
      +'</div></div>';
  }).join('');

  var ctrlHtml=z.ctrl.map(function(c){
    return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:9.5px;color:rgba(255,255,255,.55);margin-bottom:4px;line-height:1.35">'
      +'<i class="fas fa-shield-halved" style="font-size:10px;color:#00B4D8;flex-shrink:0;margin-top:1px"></i>'+c+'</div>';
  }).join('');

  var actHtml=z.act.map(function(a){
    return '<div style="font-size:9.5px;color:rgba(255,255,255,.5);margin-bottom:2px;padding-left:8px;position:relative">'
      +'<span style="position:absolute;left:0;color:#00B4D8">&bull;</span>'+a+'</div>';
  }).join('');

  det.innerHTML=shipNote
    +'<div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:2px">'+z.name+'</div>'
    +'<div style="font-size:9px;color:rgba(0,180,216,.6);letter-spacing:.5px;margin-bottom:8px">'+z.nameEn+'</div>'
    +'<div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:10px;background:'+z.rb+';color:'+z.rc+';border:1px solid '+z.rc+'55">⚠ RISK LEVEL: '+z.risk+'</div>'
    +'<div style="font-size:8.5px;font-weight:700;letter-spacing:1px;color:rgba(0,180,216,.5);text-transform:uppercase;margin-bottom:5px">Hazard Teridentifikasi</div>'
    +hazHtml
    +'<div style="font-size:8.5px;font-weight:700;letter-spacing:1px;color:rgba(0,180,216,.5);text-transform:uppercase;margin:8px 0 5px">Tindak Pengendalian</div>'
    +ctrlHtml
    +'<div style="margin-top:8px;padding:7px 9px;background:rgba(0,180,216,.07);border-radius:6px;border:1px solid rgba(0,180,216,.15)">'
    +'<div style="font-size:8px;font-weight:700;color:#00B4D8;letter-spacing:.8px;margin-bottom:4px">AKTIVITAS TIPIKAL</div>'
    +actHtml+'</div>'
    +'<div style="margin-top:7px;padding:6px 8px;background:rgba(0,80,160,.12);border-radius:5px;border:1px solid rgba(0,180,216,.18)">'
    +'<div style="font-size:8px;font-weight:700;color:rgba(0,180,216,.6);letter-spacing:.8px;margin-bottom:2px">REFERENSI REGULASI</div>'
    +'<div style="font-size:9px;color:rgba(255,255,255,.35);line-height:1.4">'+z.reg+'</div></div>';
}
window.hcvZoneClick=hcvZoneClick;

/* ═══════════════════════════════════════════════════════════════
   BIOMONITORING BENZENE MODULE
   Kolom Biomarker : nama_kapal, fleet, nama_pekerja, kreatinin, rujukan
   Kolom Personal  : nama_kapal, fleet, nama_pekerja, lokasi, hasil, nab
   Tahun data      : 2023 & 2025
═══════════════════════════════════════════════════════════════ */

/* ── SAMPLE DATA — ganti dengan data real dari Google Sheets ── */
var RAW_BIOMARKER = [
  /* 2023 */
  {tahun:"2024",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Ahmad Fauzi",kreatinin:12.4,rujukan:25},
  {tahun:"2024",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Budi Santoso",kreatinin:8.2,rujukan:25},
  {tahun:"2024",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Cahyo Pratama",kreatinin:18.7,rujukan:25},
  {tahun:"2024",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Dian Kurniawan",kreatinin:9.1,rujukan:25},
  {tahun:"2024",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Eko Wahyudi",kreatinin:22.4,rujukan:25},
  {tahun:"2024",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Fajar Ramadhan",kreatinin:26.8,rujukan:25},
  {tahun:"2024",kapal:"PANDERMAN",fleet:"Fleet Product I",pekerja:"Gunawan Saputra",kreatinin:14.3,rujukan:25},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Hendra Wijaya",kreatinin:31.2,rujukan:25},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Irfan Maulana",kreatinin:28.5,rujukan:25},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Joko Susilo",kreatinin:19.6,rujukan:25},
  {tahun:"2024",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Kurniawan Adi",kreatinin:7.8,rujukan:25},
  {tahun:"2024",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Lukman Hakim",kreatinin:11.2,rujukan:25},
  {tahun:"2024",kapal:"TRANSKO BIMA",fleet:"Fleet Gas & Petchem",pekerja:"Muhamad Ilham",kreatinin:33.4,rujukan:25},
  {tahun:"2024",kapal:"PRIMA XP",fleet:"Fleet Product I",pekerja:"Nugroho Seto",kreatinin:16.8,rujukan:25},
  /* 2025 */
  {tahun:"2026",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Ahmad Fauzi",kreatinin:9.8,rujukan:25},
  {tahun:"2026",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Budi Santoso",kreatinin:6.4,rujukan:25},
  {tahun:"2026",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Cahyo Pratama",kreatinin:15.2,rujukan:25},
  {tahun:"2026",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Dian Kurniawan",kreatinin:7.6,rujukan:25},
  {tahun:"2026",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Eko Wahyudi",kreatinin:19.3,rujukan:25},
  {tahun:"2026",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Fajar Ramadhan",kreatinin:21.1,rujukan:25},
  {tahun:"2026",kapal:"PANDERMAN",fleet:"Fleet Product I",pekerja:"Gunawan Saputra",kreatinin:11.8,rujukan:25},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Hendra Wijaya",kreatinin:24.6,rujukan:25},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Irfan Maulana",kreatinin:22.3,rujukan:25},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Joko Susilo",kreatinin:14.1,rujukan:25},
  {tahun:"2026",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Kurniawan Adi",kreatinin:6.2,rujukan:25},
  {tahun:"2026",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Lukman Hakim",kreatinin:9.4,rujukan:25},
  {tahun:"2026",kapal:"TRANSKO BIMA",fleet:"Fleet Gas & Petchem",pekerja:"Muhamad Ilham",kreatinin:27.8,rujukan:25},
  {tahun:"2026",kapal:"PRIMA XP",fleet:"Fleet Product I",pekerja:"Nugroho Seto",kreatinin:13.2,rujukan:25},
  {tahun:"2026",kapal:"PATRA TANKER II",fleet:"Fleet Product II",pekerja:"Otto Pribadi",kreatinin:18.9,rujukan:25},
  {tahun:"2026",kapal:"PATRA TANKER II",fleet:"Fleet Product II",pekerja:"Pandu Kusuma",kreatinin:12.4,rujukan:25},
];

var RAW_PERSONAL_BENZENE = [
  /* 2023 */
  {tahun:"2024",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Ahmad Fauzi",lokasi:"Pump Room",hasil:0.08,nab:0.5},
  {tahun:"2024",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Budi Santoso",lokasi:"Cargo Tank Area",hasil:0.14,nab:0.5},
  {tahun:"2024",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Cahyo Pratama",lokasi:"Pump Room",hasil:0.22,nab:0.5},
  {tahun:"2024",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Eko Wahyudi",lokasi:"Engine Room",hasil:0.06,nab:0.5},
  {tahun:"2024",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Fajar Ramadhan",lokasi:"Pump Room",hasil:0.38,nab:0.5},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Hendra Wijaya",lokasi:"Cargo Tank Area",hasil:0.54,nab:0.5},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Irfan Maulana",lokasi:"Pump Room",hasil:0.48,nab:0.5},
  {tahun:"2024",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Joko Susilo",lokasi:"Main Deck",hasil:0.19,nab:0.5},
  {tahun:"2024",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Kurniawan Adi",lokasi:"Engine Room",hasil:0.04,nab:0.5},
  {tahun:"2024",kapal:"TRANSKO BIMA",fleet:"Fleet Gas & Petchem",pekerja:"Muhamad Ilham",lokasi:"Cargo Tank Area",hasil:0.61,nab:0.5},
  /* 2025 */
  {tahun:"2026",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Ahmad Fauzi",lokasi:"Pump Room",hasil:0.06,nab:0.5},
  {tahun:"2026",kapal:"PIS NATUNA",fleet:"Fleet Product II",pekerja:"Budi Santoso",lokasi:"Cargo Tank Area",hasil:0.11,nab:0.5},
  {tahun:"2026",kapal:"PIS ROKAN",fleet:"Fleet Product II",pekerja:"Cahyo Pratama",lokasi:"Pump Room",hasil:0.18,nab:0.5},
  {tahun:"2026",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Eko Wahyudi",lokasi:"Engine Room",hasil:0.05,nab:0.5},
  {tahun:"2026",kapal:"KAMOJANG",fleet:"Fleet Product I",pekerja:"Fajar Ramadhan",lokasi:"Pump Room",hasil:0.29,nab:0.5},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Hendra Wijaya",lokasi:"Cargo Tank Area",hasil:0.44,nab:0.5},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Irfan Maulana",lokasi:"Pump Room",hasil:0.38,nab:0.5},
  {tahun:"2026",kapal:"GAS ARIMBI",fleet:"Fleet Gas & Petchem",pekerja:"Joko Susilo",lokasi:"Main Deck",hasil:0.14,nab:0.5},
  {tahun:"2026",kapal:"MT GAMALAMA",fleet:"Fleet Crude",pekerja:"Kurniawan Adi",lokasi:"Engine Room",hasil:0.03,nab:0.5},
  {tahun:"2026",kapal:"TRANSKO BIMA",fleet:"Fleet Gas & Petchem",pekerja:"Muhamad Ilham",lokasi:"Cargo Tank Area",hasil:0.49,nab:0.5},
  {tahun:"2026",kapal:"PATRA TANKER II",fleet:"Fleet Product II",pekerja:"Otto Pribadi",lokasi:"Pump Room",hasil:0.16,nab:0.5},
  {tahun:"2026",kapal:"PATRA TANKER II",fleet:"Fleet Product II",pekerja:"Pandu Kusuma",lokasi:"Cargo Tank Area",hasil:0.21,nab:0.5},
];

/* Working data */
var rawBiomarker=[...RAW_BIOMARKER];
var rawPersonal=[...RAW_PERSONAL_BENZENE];
var filteredBiomarker=[...rawBiomarker];
var filteredPersonal=[...rawPersonal];
var bioCurrentTab='biomarker';
var bioDistChart=null, bioTrendChart=null;

/* ── STATUS HELPER ── */
function bioStatus(pct){
  if(pct<50) return 'normal';
  if(pct<100) return 'perhatian';
  return 'melebihi';
}
function bioStatusBadge(status){
  if(status==='normal')    return '<span class="bio-status-normal">✓ Normal</span>';
  if(status==='perhatian') return '<span class="bio-status-perhatian">⚠ Perhatian</span>';
  return '<span class="bio-status-melebihi">⛔ Melebihi</span>';
}
function bioBarColor(status){
  if(status==='normal')    return '#43A047';
  if(status==='perhatian') return '#FF8F00';
  return '#C62828';
}

/* ── TAB SWITCH ── */
function switchBioTab(tab){
  bioCurrentTab=tab;
  document.querySelectorAll('.bio-tab').forEach(function(b){b.classList.remove('active');});
  document.getElementById(tab==='biomarker'?'bioTabBiomarker':'bioTabPersonal').classList.add('active');
  /* Update ref label */
  var refEl=document.getElementById('bioRefLabel');
  if(refEl) refEl.textContent=tab==='biomarker'
    ?'BEI ACGIH 2024: S-PMA ≤ 25 µg/g kreatinin'
    :'NAB Kemenaker No.5/2018: Benzene ≤ 0.5 ppm';
  /* Update table title */
  var ttl=document.getElementById('bioTableTitle');
  if(ttl) ttl.innerHTML=tab==='biomarker'
    ?'<i class="fas fa-flask-vial"></i> Data Biomarker Benzene (Urin)'
    :'<i class="fas fa-wind"></i> Data Benzene Personal (Udara)';
  renderBioPage();
}
window.switchBioTab=switchBioTab;

/* ── FILTER ── */
function applyBioFilters(){
  var tahun=document.getElementById('bio-filter-tahun').value;
  var fleet=document.getElementById('bio-filter-fleet').value;
  var kapal=document.getElementById('bio-filter-kapal').value;
  var modul=document.getElementById('bio-filter-modul').value;
  if(modul) bioCurrentTab=modul;
  function filt(arr){
    return arr.filter(function(r){
      return (!tahun||r.tahun===tahun)
          &&(!fleet||r.fleet===fleet)
          &&(!kapal||r.kapal===kapal);
    });
  }
  filteredBiomarker=filt(rawBiomarker);
  filteredPersonal=filt(rawPersonal);
  renderBioPage();
}
function clearBioFilters(){
  ['bio-filter-tahun','bio-filter-fleet','bio-filter-kapal'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  filteredBiomarker=[...rawBiomarker];
  filteredPersonal=[...rawPersonal];
  renderBioPage();
}
window.applyBioFilters=applyBioFilters;
window.clearBioFilters=clearBioFilters;

/* ── SHIP FILTER POPULATE ── */
function bioPopulateKapalFilter(){
  var sel=document.getElementById('bio-filter-kapal');
  if(!sel)return;
  var all=[...rawBiomarker,...rawPersonal];
  var ships=[...new Set(all.map(function(r){return r.kapal;}))].sort();
  sel.innerHTML='<option value="">Semua Kapal</option>';
  ships.forEach(function(s){
    var o=document.createElement('option');
    o.value=s;o.textContent=s;sel.appendChild(o);
  });
}

/* ── MAIN RENDER ── */
function renderBioPage(){
  var isBiomarker=bioCurrentTab==='biomarker';
  var data=isBiomarker?filteredBiomarker:filteredPersonal;

  /* Compute per-row status */
  var rows=data.map(function(r){
    var val=isBiomarker?r.kreatinin:r.hasil;
    var ref=isBiomarker?r.rujukan:r.nab;
    var pct=ref?Math.round(val/ref*100):0;
    var st=bioStatus(pct);
    return Object.assign({},r,{val:val,ref:ref,pct:pct,st:st});
  });

  /* KPIs */
  var total=rows.length;
  var normal=rows.filter(function(r){return r.st==='normal';}).length;
  var perhatian=rows.filter(function(r){return r.st==='perhatian';}).length;
  var melebihi=rows.filter(function(r){return r.st==='melebihi';}).length;
  var kapalSet=new Set(rows.map(function(r){return r.kapal;})).size;
  var pct=total?Math.round((normal/total)*100):0;

  function setEl(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
  setEl('bioKpiTotal',total);
  setEl('bioKpiNormal',normal);
  setEl('bioKpiPerhatian',perhatian);
  setEl('bioKpiMelebihi',melebihi);
  setEl('bioKpiKapal',kapalSet);
  setEl('bioKpiPct',pct+'%');
  var nlbl=document.getElementById('bioKpiNormalLbl');
  var mlbl=document.getElementById('bioKpiMelebihiLbl');
  if(nlbl)nlbl.textContent=isBiomarker?'Di Bawah BEI':'Di Bawah NAB';
  if(mlbl)mlbl.textContent=isBiomarker?'Melebihi BEI':'Melebihi NAB';

  /* Table head */
  var thead=document.getElementById('bioTableHead');
  if(thead){
    if(isBiomarker){
      thead.innerHTML='<tr><th>Kapal</th><th>Fleet</th><th>Nama Pekerja</th><th>Tahun</th>'
        +'<th>Nilai (µg/g kreat.)</th><th>Rujukan BEI</th><th>% BEI</th><th>Status</th></tr>';
    } else {
      thead.innerHTML='<tr><th>Kapal</th><th>Fleet</th><th>Nama Pekerja</th><th>Tahun</th>'
        +'<th>Lokasi</th><th>Hasil (ppm)</th><th>NAB (ppm)</th><th>% NAB</th><th>Status</th></tr>';
    }
  }

  /* Table body */
  var tbody=document.getElementById('bioTableBody');
  if(tbody){
    if(!rows.length){
      tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Tidak ada data</td></tr>';
    } else {
      tbody.innerHTML=rows.map(function(r){
        var bar='<div class="bio-bar-wrap"><div class="bio-bar" style="width:'+Math.min(r.pct,100)+'%;background:'+bioBarColor(r.st)+'"></div></div>';
        if(isBiomarker){
          return '<tr>'
            +'<td><strong style="color:var(--text)">'+esc(r.kapal)+'</strong></td>'
            +'<td>'+esc(r.fleet)+'</td>'
            +'<td>'+esc(r.pekerja)+'</td>'
            +'<td><span style="background:var(--blue-bg);color:var(--blue);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+r.tahun+'</span></td>'
            +'<td><strong style="color:var(--text)">'+r.val.toFixed(1)+'</strong>'+bar+'</td>'
            +'<td>'+r.ref+'</td>'
            +'<td><strong style="color:'+bioBarColor(r.st)+'">'+r.pct+'%</strong></td>'
            +'<td>'+bioStatusBadge(r.st)+'</td>'
            +'</tr>';
        } else {
          return '<tr>'
            +'<td><strong style="color:var(--text)">'+esc(r.kapal)+'</strong></td>'
            +'<td>'+esc(r.fleet)+'</td>'
            +'<td>'+esc(r.pekerja)+'</td>'
            +'<td><span style="background:var(--blue-bg);color:var(--blue);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+r.tahun+'</span></td>'
            +'<td>'+esc(r.lokasi)+'</td>'
            +'<td><strong style="color:var(--text)">'+r.val.toFixed(2)+'</strong>'+bar+'</td>'
            +'<td>'+r.ref+'</td>'
            +'<td><strong style="color:'+bioBarColor(r.st)+'">'+r.pct+'%</strong></td>'
            +'<td>'+bioStatusBadge(r.st)+'</td>'
            +'</tr>';
        }
      }).join('');
    }
    var footer=document.getElementById('bioTableFooter');
    if(footer)footer.textContent='Menampilkan '+rows.length+' data';
    var cnt=document.getElementById('bioTableCount');
    if(cnt)cnt.textContent=rows.length+' data';
  }

  /* Alert panel */
  var alertPanel=document.getElementById('bioAlertPanel');
  var alertList=document.getElementById('bioAlertList');
  var alertTitle=document.getElementById('bioAlertTitle');
  var melebihiRows=rows.filter(function(r){return r.st==='melebihi';});
  if(alertPanel){
    alertPanel.style.display=melebihiRows.length?'block':'none';
  }
  if(alertTitle && melebihiRows.length){
    alertTitle.textContent=melebihiRows.length+' Pekerja dengan Nilai Melebihi '+(isBiomarker?'BEI':'NAB')+' — Perlu Tindak Lanjut Medis';
  }
  if(alertList){
    alertList.innerHTML=melebihiRows.map(function(r){
      return '<div class="bio-alert-item">'
        +'<div><div class="bio-alert-name">'+esc(r.pekerja)+'</div>'
        +'<div class="bio-alert-kapal">'+esc(r.kapal)+' · '+r.fleet+' · '+r.tahun+'</div></div>'
        +(isBiomarker?'':'<div style="font-size:11px;color:var(--text-muted)">'+esc(r.lokasi)+'</div>')
        +'<div class="bio-alert-val">'+(isBiomarker?r.val.toFixed(1)+' µg/g':r.val.toFixed(2)+' ppm')+'<br>'
        +'<span style="font-size:10px;font-weight:500;color:#C62828">'+(r.pct)+'% dari '+(isBiomarker?'BEI':'NAB')+'</span></div>'
        +'</div>';
    }).join('');
  }

  /* Charts */
  renderBioDistChart(rows,isBiomarker);
  renderBioTrendChart(isBiomarker);
}

/* ── DISTRIBUTION CHART ── */
function renderBioDistChart(rows,isBiomarker){
  var ctx=document.getElementById('bioDistChart');
  if(!ctx)return;
  if(bioDistChart){bioDistChart.destroy();bioDistChart=null;}
  var normal=rows.filter(function(r){return r.st==='normal';}).length;
  var perhatian=rows.filter(function(r){return r.st==='perhatian';}).length;
  var melebihi=rows.filter(function(r){return r.st==='melebihi';}).length;
  bioDistChart=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Normal / Aman','Perhatian (50–99%)','Melebihi '+(isBiomarker?'BEI':'NAB')],
      datasets:[{data:[normal,perhatian,melebihi],backgroundColor:['#43A047','#FF8F00','#C62828'],
        borderWidth:2,borderColor:'#fff'}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}}}}
  });
}

/* ── TREND COMPARISON CHART 2023 vs 2025 ── */
function renderBioTrendChart(isBiomarker){
  var ctx=document.getElementById('bioTrendChart');
  if(!ctx)return;
  if(bioTrendChart){bioTrendChart.destroy();bioTrendChart=null;}
  var src=isBiomarker?rawBiomarker:rawPersonal;
  var kapalSet=[...new Set(src.map(function(r){return r.kapal;}))].sort();
  /* For each kapal, average value per year */
  var avg2023=[],avg2025=[];
  kapalSet.forEach(function(k){
    var r23=src.filter(function(r){return r.kapal===k&&r.tahun==='2023';});
    var r25=src.filter(function(r){return r.kapal===k&&r.tahun==='2025';});
    var getVal=function(r){return isBiomarker?r.kreatinin:r.hasil;};
    var mean=function(arr){return arr.length?arr.reduce(function(s,r){return s+getVal(r);},0)/arr.length:null;};
    avg2023.push(r23.length?parseFloat(mean(r23).toFixed(2)):null);
    avg2025.push(r25.length?parseFloat(mean(r25).toFixed(2)):null);
  });
  /* Shorten kapal labels */
  var labels=kapalSet.map(function(k){return k.length>12?k.substring(0,11)+'…':k;});
  bioTrendChart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[
        {label:'2023',data:avg2023,backgroundColor:'rgba(21,101,192,.65)',borderColor:'#1565C0',borderWidth:1.5},
        {label:'2025',data:avg2025,backgroundColor:'rgba(67,160,71,.65)',borderColor:'#43A047',borderWidth:1.5},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:'top',labels:{font:{size:11}}},
        tooltip:{callbacks:{label:function(ctx){
          return ctx.dataset.label+': '+(ctx.raw!==null?ctx.raw+(isBiomarker?' µg/g':' ppm'):'Tidak ada data');
        }}}
      },
      scales:{
        y:{
          title:{display:true,text:isBiomarker?'µg/g kreatinin':'ppm',font:{size:10}},
          grid:{color:'rgba(0,0,0,.06)'},
          ticks:{font:{size:10}},
          /* Draw BEI/NAB line */
        },
        x:{ticks:{font:{size:9},maxRotation:45}},
      },
      /* Reference line annotation via borderDash workaround */
    }
  });
  /* Add reference line manually after render */
  var refVal=isBiomarker?25:0.5;
  Chart.register({id:'bioRefLine',afterDraw:function(chart){
    if(!chart.canvas.id==='bioTrendChart')return;
    var ctx2=chart.ctx;
    var yScale=chart.scales.y;
    if(!yScale)return;
    var y=yScale.getPixelForValue(refVal);
    ctx2.save();
    ctx2.beginPath();
    ctx2.moveTo(chart.chartArea.left,y);
    ctx2.lineTo(chart.chartArea.right,y);
    ctx2.strokeStyle='#C62828';
    ctx2.lineWidth=1.5;
    ctx2.setLineDash([5,4]);
    ctx2.stroke();
    ctx2.fillStyle='#C62828';
    ctx2.font='10px Arial';
    ctx2.fillText((isBiomarker?'BEI':'NAB')+' '+refVal+(isBiomarker?' µg/g':' ppm'),chart.chartArea.left+4,y-4);
    ctx2.restore();
  }});
}

/* ── SEARCH ── */
function searchBioPageTable(){
  var q=(document.getElementById('bioSearch').value||'').toLowerCase();
  var isBiomarker=bioCurrentTab==='biomarker';
  var src=isBiomarker?filteredBiomarker:filteredPersonal;
  var filtered=q?src.filter(function(r){
    return (r.kapal||'').toLowerCase().includes(q)||(r.pekerja||'').toLowerCase().includes(q);
  }):src;
  /* Temporarily override for table render */
  if(isBiomarker)filteredBiomarker=filtered; else filteredPersonal=filtered;
  renderBioPage();
  /* Restore */
  if(isBiomarker)filteredBiomarker=src; else filteredPersonal=src;
}
window.searchBioPageTable=searchBioPageTable;

/* ── INIT ── */
function initBiomonitoring(){
  rawBiomarker=[...RAW_BIOMARKER];
  rawPersonal=[...RAW_PERSONAL_BENZENE];
  filteredBiomarker=[...rawBiomarker];
  filteredPersonal=[...rawPersonal];
  bioPopulateKapalFilter();
  renderBioPage();
}

/* ── FETCH BIOMONITORING FROM GAS ── */
async function fetchBiomonitoring(){
  try{
    var data=await gasPost({action:"biomonitoring",token:getToken()});
    if(!data||data.status==="error"||data.status==="unauthorized") throw new Error("GAS error");

    /* ── BIOMARKER BENZENE ── */
    if(data.data&&data.data.biomarker&&data.data.biomarker.length>0){
      rawBiomarker=data.data.biomarker.map(function(r){
        /* Cari nilai tahun dari berbagai kemungkinan nama kolom */
        var thn=r["Tahun"]||r["tahun"]||r["TAHUN"]||r["Year"]||r["year"]||"";
        var kpl=r["Nama Kapal"]||r["nama_kapal"]||r["Kapal"]||r["kapal"]||"";
        var flt=r["Fleet"]||r["fleet"]||r["Jenis Fleet"]||r["jenis_fleet"]||"";
        var pkj=r["Nama Pekerja"]||r["nama_pekerja"]||r["Pekerja"]||r["pekerja"]||"";
        var val=parseFloat(
          r["Kreatinin (µg/g kreat.)"]||r["kreatinin_ugpg"]||r["Kreatinin"]||
          r["kreatinin"]||r["Nilai"]||r["nilai"]||r["Hasil"]||r["hasil"]||0
        );
        var ref=parseFloat(
          r["Nilai Rujukan BEI"]||r["nilai_rujukan_bei"]||r["Rujukan BEI"]||
          r["rujukan"]||r["BEI"]||r["bei"]||25
        );
        return {
          tahun:    String(thn).trim(),
          kapal:    String(kpl).trim(),
          fleet:    String(flt).trim(),
          pekerja:  String(pkj).trim(),
          kreatinin:isNaN(val)?0:val,
          rujukan:  isNaN(ref)?25:ref
        };
      }).filter(function(r){return r.kapal||r.pekerja;});
      filteredBiomarker=[...rawBiomarker];
      console.log("Biomarker: "+rawBiomarker.length+" data dari GAS ✅");
    } else {
      rawBiomarker=[...RAW_BIOMARKER];
      filteredBiomarker=[...rawBiomarker];
    }

    /* ── BENZENE PERSONAL ── */
    if(data.data&&data.data.personal&&data.data.personal.length>0){
      rawPersonal=data.data.personal.map(function(r){
        var thn=r["Tahun"]||r["tahun"]||r["TAHUN"]||r["Year"]||r["year"]||"";
        var kpl=r["Nama Kapal"]||r["nama_kapal"]||r["Kapal"]||r["kapal"]||"";
        var flt=r["Fleet"]||r["fleet"]||r["Jenis Fleet"]||r["jenis_fleet"]||"";
        var pkj=r["Nama Pekerja"]||r["nama_pekerja"]||r["Pekerja"]||r["pekerja"]||"";
        var lok=r["Lokasi Pengukuran"]||r["lokasi_pengukuran"]||r["Lokasi"]||r["lokasi"]||"";
        var val=parseFloat(
          r["Hasil (ppm)"]||r["hasil_ppm"]||r["Hasil"]||r["hasil"]||
          r["Nilai"]||r["nilai"]||r["Result"]||0
        );
        var nab=parseFloat(
          r["NAB (ppm)"]||r["nab_ppm"]||r["NAB"]||r["nab"]||
          r["TLV"]||r["tlv"]||0.5
        );
        return {
          tahun:  String(thn).trim(),
          kapal:  String(kpl).trim(),
          fleet:  String(flt).trim(),
          pekerja:String(pkj).trim(),
          lokasi: String(lok).trim(),
          hasil:  isNaN(val)?0:val,
          nab:    isNaN(nab)?0.5:nab
        };
      }).filter(function(r){return r.kapal||r.pekerja;});
      filteredPersonal=[...rawPersonal];
      console.log("Benzene Personal: "+rawPersonal.length+" data dari GAS ✅");
    } else {
      rawPersonal=[...RAW_PERSONAL_BENZENE];
      filteredPersonal=[...rawPersonal];
    }

    /* Update dropdown kapal & re-render jika halaman aktif */
    bioPopulateKapalFilter();
    var pgBio=document.getElementById("page-biomonitoring");
    if(pgBio&&pgBio.classList.contains("active")) renderBioPage();
    /* Juga update section biomarker di Faktor Kimia jika sedang aktif */
    var pgKimia=document.getElementById("page-kimia");
    if(pgKimia&&pgKimia.classList.contains("active")) renderBioKimiaSection();

  }catch(err){
    /* Koneksi gagal: pakai data dummy, tidak crash */
    console.warn("fetchBiomonitoring fallback ke dummy data:", err.message);
    rawBiomarker=[...RAW_BIOMARKER];
    rawPersonal=[...RAW_PERSONAL_BENZENE];
    filteredBiomarker=[...rawBiomarker];
    filteredPersonal=[...rawPersonal];
  }
}

/* ═══════════════════════════════════════════════════════════════
   ACCESS LOG MODULE
   Rekam & tampilkan riwayat akses dashboard
═══════════════════════════════════════════════════════════════ */
var rawAlog=[],filteredAlog=[],alogSortCol=0,alogSortDir=-1;
var alogBarChart=null,alogBrowserChart=null;

async function loadAccessLog(){
  if(!isAdmin())return;
  const tbody=document.getElementById("alogTableBody");
  if(tbody)tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px"></i>Memuat log akses...</td></tr>';
  try{
    const data=await gasPost({action:"getAccessLog",token:getToken(),days:90});
    if(data.status==="ok"){
      rawAlog=data.logs||[];
      filteredAlog=[...rawAlog];
      applyAlogFilters();
    }else{
      if(tbody)tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:#C62828">Gagal memuat log: '+(data.message||"")+'</td></tr>';
    }
  }catch(err){
    if(tbody)tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:#C62828">Error: '+err.message+'</td></tr>';
  }
}

function applyAlogFilters(){
  const userF=(document.getElementById("alog-filter-user")||{}).value||"";
  const statusF=(document.getElementById("alog-filter-status")||{}).value||"";
  const daysF=parseInt(((document.getElementById("alog-filter-days")||{}).value)||"14");
  const now=Date.now();
  const cutoff=daysF>0?(now-daysF*24*60*60*1000):0;

  filteredAlog=rawAlog.filter(function(r){
    const ts=new Date(r.timestamp||0).getTime();
    if(daysF>0&&ts<cutoff)return false;
    if(userF&&r.username!==userF)return false;
    if(statusF&&r.status!==statusF)return false;
    return true;
  });

  /* Populate user dropdown */
  const userSel=document.getElementById("alog-filter-user");
  if(userSel){
    const curVal=userSel.value;
    const users=[...new Set(rawAlog.map(function(r){return r.username;}).filter(Boolean))].sort();
    userSel.innerHTML='<option value="">Semua User</option>'+users.map(function(u){return'<option'+(u===curVal?" selected":"")+'>'+esc(u)+'</option>';}).join("");
  }

  renderAlogKPI();
  renderAlogBarChart();
  renderAlogBrowserChart();
  renderAlogTable(filteredAlog);
}

function renderAlogKPI(){
  const total=filteredAlog.filter(function(r){return r.status==="LOGIN_OK"||r.status==="LOGIN_FAIL";}).length;
  const success=filteredAlog.filter(function(r){return r.status==="LOGIN_OK";}).length;
  const fail=filteredAlog.filter(function(r){return r.status==="LOGIN_FAIL";}).length;
  const mobile=filteredAlog.filter(function(r){return r.deviceType==="Mobile";}).length;
  const desktop=filteredAlog.filter(function(r){return r.deviceType==="Desktop"||r.deviceType==="Tablet";}).length;
  function set(id,v){const el=document.getElementById(id);if(el)el.textContent=fmtNum(v);}
  set("alog-total-login",total);set("alog-success",success);set("alog-fail",fail);
  set("alog-mobile",mobile);set("alog-desktop",desktop);
}

function renderAlogBarChart(){
  const ctx=document.getElementById("alogBarChart");
  if(!ctx)return;
  if(alogBarChart){alogBarChart.destroy();alogBarChart=null;}
  const labels=[],dataOk=[],dataFail=[];
  for(var i=13;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=d.toISOString().slice(0,10);
    labels.push(key.slice(5));
    dataOk.push(filteredAlog.filter(function(r){return r.status==="LOGIN_OK"&&(r.timestamp||"").startsWith(key);}).length);
    dataFail.push(filteredAlog.filter(function(r){return r.status==="LOGIN_FAIL"&&(r.timestamp||"").startsWith(key);}).length);
  }
  alogBarChart=new Chart(ctx,{type:"bar",data:{labels:labels,datasets:[{label:"Berhasil",data:dataOk,backgroundColor:"#43A047",borderRadius:5},{label:"Gagal",data:dataFail,backgroundColor:"#E53935",borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{font:{size:11}}}},scales:{x:{ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{stepSize:1,font:{size:10}}}}}});
}

function renderAlogBrowserChart(){
  const ctx=document.getElementById("alogBrowserChart");
  if(!ctx)return;
  if(alogBrowserChart){alogBrowserChart.destroy();alogBrowserChart=null;}
  const bmap={};
  filteredAlog.forEach(function(r){const b=r.browser||"Unknown";bmap[b]=(bmap[b]||0)+1;});
  const sorted=Object.entries(bmap).sort(function(a,b){return b[1]-a[1];});
  const palette=["#1976D2","#43A047","#FB8C00","#8E24AA","#00838F","#E53935","#F9A825"];
  alogBrowserChart=new Chart(ctx,{type:"doughnut",data:{labels:sorted.map(function(e){return e[0];}),datasets:[{data:sorted.map(function(e){return e[1];}),backgroundColor:palette,borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:"60%",plugins:{legend:{position:"bottom",labels:{font:{size:11},padding:10,boxWidth:12}}}}});
}

function getBrowserIcon(b){
  if(!b)return"globe";const bl=b.toLowerCase();
  if(bl.includes("chrome"))return"chrome";if(bl.includes("firefox"))return"firefox-browser";
  if(bl.includes("safari"))return"safari";if(bl.includes("edge"))return"edge";
  if(bl.includes("opera"))return"opera";if(bl.includes("samsung"))return"android";
  return"globe";
}

function renderAlogTable(data){
  const tbody=document.getElementById("alogTableBody");
  if(!tbody)return;
  if(!data.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada data pada periode ini</td></tr>';return;}
  const devIcon={Mobile:'<i class="fas fa-mobile-screen" style="color:#7B2FBE"></i>',Tablet:'<i class="fas fa-tablet-screen-button" style="color:#0288D1"></i>',Desktop:'<i class="fas fa-desktop" style="color:#388E3C"></i>'};
  const statusBadge={
    LOGIN_OK:'<span style="background:#E8F5E9;color:#2E7D32;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-check"></i> Berhasil</span>',
    LOGIN_FAIL:'<span style="background:#FFEBEE;color:#C62828;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-xmark"></i> Gagal</span>',
    LOGOUT:'<span style="background:#F3F4F6;color:#6B7280;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-right-from-bracket"></i> Logout</span>'
  };
  tbody.innerHTML=data.map(function(r){
    const ts=r.timestamp?(String(r.timestamp).replace("T"," ").slice(0,16)):"—";
    const badge=statusBadge[r.status]||('<span>'+esc(r.status||"—")+'</span>');
    const dicon=(devIcon[r.deviceType]||'<i class="fas fa-question"></i>');
    const rc=r.role==="admin"?"#C62828":r.role==="demo"?"#F59E0B":"#1976D2";
    return'<tr>'
      +'<td style="white-space:nowrap;font-weight:600;font-size:12px">'+esc(ts)+'</td>'
      +'<td><strong>'+esc(r.username||"—")+'</strong></td>'
      +'<td><span style="background:'+rc+'18;color:'+rc+';padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+esc(r.role||"—")+'</span></td>'
      +'<td>'+badge+'</td>'
      +'<td><i class="fab fa-'+getBrowserIcon(r.browser)+'" style="margin-right:5px"></i>'+esc(r.browser||"—")+'</td>'
      +'<td>'+esc(r.os||"—")+'</td>'
      +'<td style="text-align:center">'+dicon+' '+esc(r.deviceType||"—")+'</td>'
      +'<td style="font-size:11px;color:var(--text-muted)">'+esc(r.screenRes||"—")+'</td>'
      +'</tr>';
  }).join("");
  const footer=document.getElementById("alogTableFooter");
  if(footer)footer.textContent="Menampilkan "+data.length+" dari "+rawAlog.length+" entri";
}

function searchAlogTable(){
  const q=((document.getElementById("alog-search")||{}).value||"").toLowerCase();
  const res=q?filteredAlog.filter(function(r){return(r.username||"").toLowerCase().includes(q)||(r.browser||"").toLowerCase().includes(q)||(r.os||"").toLowerCase().includes(q)||(r.deviceType||"").toLowerCase().includes(q);}):filteredAlog;
  renderAlogTable(res);
}

function sortAlogTable(col){
  if(alogSortCol===col)alogSortDir*=-1;else{alogSortCol=col;alogSortDir=-1;}
  const keys=["timestamp","username","role","status","browser","os","deviceType","screenRes"];
  filteredAlog.sort(function(a,b){return String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""))*alogSortDir;});
  renderAlogTable(filteredAlog);
}


/* ═══════════════════════════════════════════════════════════════
   EXPORT PPT — 5 HAZARD UTAMA
   5 Hirarki Pengendalian Risiko (Permenaker 05/2018 + IMO MSC)
   Eliminasi → Substitusi → Rekayasa Teknik → Administratif → APD
═══════════════════════════════════════════════════════════════ */

/* ── Konfigurasi warna per hazard ── */
var HAZARD_CONFIG={
  fisika:{
    label:"Faktor Fisika",
    icon:"🔊",
    color:"1565C0",
    colorLight:"EBF5FF",
    data:function(){return filteredFisika;},
    temuanKey:"Jenis Parameter",
    lokasiKey:"Area / Titik Ukur",
    kapalKey:"Nama Kapal",
    fleetKey:"Fleet",
    hasilKey:"Hasil Pengukuran",
    satuanKey:"Satuan",
    nabKey:"NAB / TLV",
    statusKey:"Status",
    tindakKey:"Status TL",
    pctKey:"% terhadap NAB"
  },
  kimia:{
    label:"Faktor Kimia",
    icon:"⚗",
    color:"7B1FA2",
    colorLight:"F3E5F5",
    data:function(){return filteredKimia;},
    temuanKey:"Nama Bahan Kimia",
    lokasiKey:"Nama Laboratorium",
    kapalKey:"Nama Kapal",
    fleetKey:"Fleet",
    hasilKey:"Hasil Pengukuran",
    satuanKey:"Satuan",
    nabKey:"TLV-TWA ACGIH",
    statusKey:"Status",
    tindakKey:"Nama Laboratorium",
    pctKey:"% terhadap TLV/BEI"
  },
  biologi:{
    label:"Faktor Biologi",
    icon:"🦠",
    color:"2E7D32",
    colorLight:"E8F5E9",
    data:function(){return filteredBiologi;},
    temuanKey:"Nama Agen / Spesies",
    lokasiKey:"Area / Lokasi",
    kapalKey:"Nama Kapal",
    fleetKey:"Fleet",
    hasilKey:"Hasil Pengukuran",
    satuanKey:"Satuan",
    nabKey:"Baku Mutu / Referensi",
    statusKey:"Status",
    tindakKey:"Nama Laboratorium",
    pctKey:""
  },
  ergonomi:{
    label:"Faktor Ergonomi",
    icon:"🏋",
    color:"E65100",
    colorLight:"FFF3E0",
    data:function(){return filteredErgonomi;},
    temuanKey:"Jenis Pekerjaan / Tugas",
    lokasiKey:"Area / Unit Kerja",
    kapalKey:"Nama Kapal",
    fleetKey:"Fleet",
    hasilKey:"Skor",
    satuanKey:"Level Risiko (1–4)",
    nabKey:"",
    statusKey:"Level Risiko (1–4)",
    tindakKey:"Rekomendasi Teknis",
    pctKey:""
  },
  psikososial:{
    label:"Faktor Psikososial",
    icon:"🧠",
    color:"AD1457",
    colorLight:"FCE4EC",
    data:function(){return filteredPsikososial;},
    temuanKey:"Instrumen",
    lokasiKey:"Departemen / Jabatan",
    kapalKey:"Nama Kapal",
    fleetKey:"Fleet",
    hasilKey:"Total Skor",
    satuanKey:"",
    nabKey:"",
    statusKey:"Level Risiko",
    tindakKey:"Program Intervensi",
    pctKey:""
  }
};

/* ── 5 Hirarki Pengendalian per hazard ── */
var HIRARKI_DB={
  fisika:{
    kebisingan:{
      E:"Eliminasi sumber bising: ganti atau hilangkan mesin/pompa penyebab kebisingan jika secara teknis memungkinkan. Pertimbangkan redesign layout engine room untuk menjauhkan sumber bising dari area kerja.",
      S:"Substitusi: ganti mesin diesel dengan motor listrik yang lebih senyap. Gunakan coupling anti-vibrasi dan mounting isolator pada pompa cargo.",
      R:"Rekayasa Teknik: pasang akustik enclosure pada mesin utama, panel peredam di bulkhead engine room, double-glazed window pada control room. Pasang vibration damper pada fondasi mesin.",
      A:"Administratif: rotasi kerja maksimal 4 jam di area >85 dB. Jadwal maintenance berkala. Posting tanda wajib APD. Audiometric test tahunan. Job Hazard Analysis (JHA) sebelum masuk engine room.",
      P:"APD: earplug (NRR ≥25 dB) wajib >85 dB, earmuff (NRR ≥30 dB) wajib >95 dB. Double protection >105 dB. Sesuai IMO MSC/Circ.1351 dan SNI ISO 4869."
    },
    getaran:{
      E:"Eliminasi: hilangkan operasi yang menyebabkan getaran berlebih. Redesign alur kerja untuk menghindari hand-arm vibration saat berlayar.",
      S:"Substitusi: ganti peralatan hand tool bergetar tinggi dengan versi low-vibration. Gunakan material anti-vibration pada mounting mesin.",
      R:"Rekayasa Teknik: pasang vibration isolator pada pondasi mesin, anti-vibration mounting, flexible coupling. Pasang peredam getaran pada hull.",
      A:"Administratif: batasi waktu paparan sesuai HAV Action Value 2.5 m/s² (4 jam) atau WBV 0.5 m/s². Rotasi kerja, istirahat wajib setiap 1 jam. Medical surveillance tangan dan tulang belakang.",
      P:"APD: sarung tangan anti-vibrasi (ISO 10819), sepatu anti-vibrasi untuk WBV. Pakaian hangat untuk mencegah Raynaud's phenomenon."
    },
    default:{
      E:"Eliminasi sumber faktor fisika berbahaya dari area kerja kapal jika memungkinkan secara teknis dan operasional.",
      S:"Substitusi: ganti peralatan/proses yang menghasilkan paparan fisika berbahaya dengan alternatif yang lebih aman.",
      R:"Rekayasa Teknik: pasang barrier fisik, shielding, isolasi atau ventilasi mekanis untuk mengurangi paparan di titik sumber.",
      A:"Administratif: SOP paparan fisika, rotasi kerja, jadwal monitoring berkala, safety sign, training crew tentang bahaya faktor fisika di kapal. Sesuai Permenaker 05/2018.",
      P:"APD sesuai jenis paparan fisika: earplug/earmuff, kacamata UV, pakaian tahan panas, sepatu isolasi. Wajib sesuai SOLAS Ch. II-1 dan ILO Maritime Labour Convention 2006."
    }
  },
  kimia:{
    benzene:{
      E:"Eliminasi: hentikan penggunaan benzene murni. Ganti bahan bakar / solvent yang mengandung benzene tinggi dengan alternatif bebas benzene.",
      S:"Substitusi: gunakan bahan bakar ultra-low benzene (<0.1%). Ganti solvent benzene dengan cyclohexane, heptane, atau produk berbasis aqueous.",
      R:"Rekayasa Teknik: pasang vapor recovery system pada manifold cargo, LEV (Local Exhaust Ventilation) di pump room dan cargo tank. Enclosed loading system. Continuous gas detector terpasang permanen.",
      A:"Administratif: permit-to-work untuk entry cargo tank dan pump room. Monitoring udara sebelum dan selama kerja di confined space. Biomonitoring urin (muconic acid) setiap 6 bulan untuk ABK terpapar. Rotasi kerja maks 2 jam tanpa break di area >0.1 ppm.",
      P:"APD: full-face respirator dengan cartridge organic vapor (NIOSH-approved) untuk >0.5 ppm. Chemical-resistant gloves (nitrile). Coverall anti-static. Emergency escape SCBA. Sesuai ACGIH TLV 0.5 ppm."
    },
    default:{
      E:"Eliminasi: hentikan penggunaan bahan kimia berbahaya jika ada alternatif proses yang tidak membutuhkannya.",
      S:"Substitusi: ganti bahan kimia berbahaya dengan versi lebih aman, konsentrasi lebih rendah, atau bentuk fisik lebih aman (granul vs. serbuk).",
      R:"Rekayasa Teknik: pasang LEV (Local Exhaust Ventilation), enclosed handling system, scrubber gas, dan continuous gas detector di area cargo dan pump room.",
      A:"Administratif: SDS (Safety Data Sheet) tersedia di kapal dalam Bahasa Indonesia. Permit-to-work untuk pekerjaan melibatkan bahan kimia. Training HAZMAT. Monitoring udara rutin. Sesuai IMDG Code dan Permenaker 05/2018.",
      P:"APD: respirator sesuai TLV bahan kimia, chemical-resistant gloves dan boots, face shield, coverall. Emergency SCBA tersedia di kapal sesuai SOLAS."
    }
  },
  biologi:{
    default:{
      E:"Eliminasi: desinfeksi dan sterilisasi total area yang terkontaminasi agen biologis. Buang media yang terkontaminasi sesuai prosedur limbah medis.",
      S:"Substitusi: ganti metode kerja yang berisiko kontak dengan agen biologi dengan metode tertutup atau remote handling.",
      R:"Rekayasa Teknik: pasang sistem ventilasi bertekanan positif di area medis kapal, HEPA filter, UV-C sterilizer di ruang isolasi, shower dekontaminasi. Fasilitas cuci tangan memadai di seluruh kapal.",
      A:"Administratif: SOP dekontaminasi dan isolasi kasus penyakit menular di kapal. Vaksinasi wajib: hepatitis A&B, typhoid, yellow fever sesuai rute pelayaran. Pemeriksaan kesehatan pra-embarkasiasi. Pelaporan Ship Sanitation sesuai IHR 2005. Rodent & pest control berkala.",
      P:"APD: sarung tangan nitril sekali pakai, masker N95 untuk penyakit airborne, gown/apron, eye protection saat penanganan specimen. Sesuai WHO International Health Regulations 2005."
    }
  },
  ergonomi:{
    default:{
      E:"Eliminasi tugas dengan risiko ergonomi tinggi: redesign pekerjaan untuk menghilangkan postur janggal, angkat manual berulang, dan gerakan repetitif di lingkungan kapal yang bergerak.",
      S:"Substitusi: ganti pekerjaan manual berisiko tinggi dengan peralatan mekanis (crane, forklift, conveyor). Gunakan alat bantu angkat untuk beban >23 kg.",
      R:"Rekayasa Teknik: redesign workstation di engine room, bridge, galley sesuai prinsip ergonomi. Pasang anti-slip flooring, pegangan (handrail) di seluruh deck. Kursi bridge dengan lumbar support. Peralatan dengan grip ergonomis.",
      A:"Administratif: SOP manual handling untuk ABK. Batas berat angkat maksimal 23 kg (sendirian) sesuai ILO C185. Rotasi tugas untuk mengurangi repetisi. Stretching/warm-up sebelum tugas berat. REBA/RULA assessment tahunan. Training ergonomi untuk perwira.",
      P:"APD: sabuk angkat untuk pekerjaan manual handling berat. Knee pad untuk pekerjaan berlutut. Back support belt untuk ABK bagian deck dan mesin. Anti-vibration gloves."
    }
  },
  psikososial:{
    default:{
      E:"Eliminasi stressor psikososial struktural: kurangi jam kerja berlebih, sesuaikan workload dengan jumlah ABK yang cukup. Hapus kebijakan yang menciptakan konflik peran.",
      S:"Substitusi: ganti sistem shift yang tidak manusiawi dengan pola rotasi yang memperhatikan recovery time. Rotasi jabatan untuk menghindari kelelahan peran.",
      R:"Rekayasa Teknik (Lingkungan): perbaiki akomodasi ABK (ruang istirahat nyaman, pencahayaan kamar yang baik, koneksi internet untuk komunikasi keluarga). Pasang ruang relaksasi. Fasilitas olahraga di kapal. Sesuai MLC 2006 Reg. 3.1.",
      A:"Administratif: program Employee Assistance Program (EAP) untuk ABK. Buddy system dan peer support. Pelatihan stress management dan resiliensi untuk perwira. Survei iklim keselamatan berkala. SOP anti-bullying dan harassment. Pemeriksaan psikologi pra-embarkasi. Akses layanan telemedis psikologi.",
      P:"APD (Perlindungan Psikologis): sistem pelaporan anonim untuk pelanggaran HAM di kapal. Jaminan perlindungan whistleblower. Kunjungan seafarer welfare di pelabuhan."
    }
  }
};

/* ── Dapatkan hirarki berdasarkan jenis hazard dan temuan ── */
function getHirarki(hazardType,tipe){
  var db=HIRARKI_DB[hazardType]||{};
  var t=(tipe||"").toLowerCase();
  /* Match spesifik */
  if(hazardType==="fisika"){
    if(t.includes("bising")||t.includes("noise"))return db.kebisingan||db.default;
    if(t.includes("getaran")||t.includes("vibr"))return db.getaran||db.default;
    return db.default||{};
  }
  if(hazardType==="kimia"){
    if(t.includes("benzene")||t.includes("benzen"))return db.benzene||db.default;
    return db.default||{};
  }
  return db.default||{};
}

/* ── MAIN EXPORT FUNCTION ── */
function exportHazardPPT(hazardType){
  if(typeof PptxGenJS==="undefined"){showToast("Library PPT sedang dimuat, coba lagi dalam beberapa detik.","warning");return;}
  var cfg=HAZARD_CONFIG[hazardType];
  if(!cfg){showToast("Konfigurasi hazard tidak ditemukan.","error");return;}
  var data=cfg.data();
  if(!data||!data.length){showToast("Tidak ada data "+cfg.label+" untuk diexport.","warning");return;}

  showToast("Membuat PPT "+cfg.label+"...","info");

  var pres=new PptxGenJS();
  pres.layout="LAYOUT_WIDE";
  pres.author="IH Dashboard — Pertamina Patra Niaga III";
  pres.title="5 Hirarki Pengendalian — "+cfg.label;
  pres.subject="Industrial Hygiene Maritime Report";

  var MC="0F2A4A";   /* Main color dark navy */
  var AC=cfg.color;  /* Accent color per hazard */
  var WH="FFFFFF";
  var GR="F4F6FA";
  var TX="1E293B";
  var MU="64748B";
  var RED="C62828";
  var GRN="2E7D32";
  var YEL="F59E0B";

  /* ══════════════════════════════════════════
     SLIDE 1 — Cover
  ══════════════════════════════════════════ */
  var s1=pres.addSlide();
  s1.background={color:MC};
  /* Gradient strip kiri */
  s1.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.06,h:7.5,fill:{color:AC}});
  /* Judul besar */
  s1.addText("5 HIRARKI PENGENDALIAN RISIKO",{
    x:0.3,y:0.7,w:12.7,h:0.8,
    fontSize:28,bold:true,color:WH,fontFace:"Calibri",charSpacing:3
  });
  s1.addText(cfg.icon+" "+cfg.label.toUpperCase(),{
    x:0.3,y:1.55,w:12.7,h:0.7,
    fontSize:22,bold:true,color:AC,fontFace:"Calibri"
  });
  /* Garis pemisah */
  s1.addShape(pres.ShapeType.rect,{x:0.3,y:2.4,w:5,h:0.04,fill:{color:AC}});
  /* Info deck */
  var now=new Date();
  var tgl=now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  var totalData=data.length;
  var melebihi=data.filter(function(r){var s=(r[cfg.statusKey]||"").toLowerCase();return s.includes("melebihi")||s.includes("tinggi")||s.includes("kritis");}).length;
  s1.addText([
    {text:"Total Pengukuran / Temuan : ",options:{bold:false,color:"CADCFC"}},
    {text:String(totalData),options:{bold:true,color:WH}},
    {text:"    |    Melebihi Standar : ",options:{bold:false,color:"CADCFC"}},
    {text:String(melebihi)+" temuan",options:{bold:true,color:melebihi>0?"FF6B6B":WH}}
  ],{x:0.3,y:2.6,w:12,h:0.45,fontSize:13,fontFace:"Calibri"});
  /* Pilar 5 hirarki */
  var pilars=[
    {no:"1",label:"ELIMINASI",sub:"Hilangkan sumber bahaya",col:"C62828"},
    {no:"2",label:"SUBSTITUSI",sub:"Ganti dengan lebih aman",col:"E65100"},
    {no:"3",label:"REC. TEKNIK",sub:"Kontrol teknik & engineering",col:"1565C0"},
    {no:"4",label:"ADMINISTRATIF",sub:"SOP & prosedur kerja",col:"2E7D32"},
    {no:"5",label:"APD",sub:"Alat Pelindung Diri",col:"6A1B9A"}
  ];
  pilars.forEach(function(p,i){
    var bx=0.3+i*2.56;
    s1.addShape(pres.ShapeType.roundRect,{x:bx,y:3.4,w:2.4,h:3.0,fill:{color:p.col},line:{color:WH,width:1},rectRadius:0.08});
    s1.addText(p.no,{x:bx,y:3.45,w:2.4,h:0.55,fontSize:28,bold:true,color:"FFFFFF99",align:"center",fontFace:"Calibri"});
    s1.addText(p.label,{x:bx+0.08,y:4.05,w:2.24,h:0.55,fontSize:11,bold:true,color:WH,align:"center",fontFace:"Calibri"});
    s1.addText(p.sub,{x:bx+0.08,y:4.65,w:2.24,h:0.8,fontSize:9,color:"FFFFFFCC",align:"center",fontFace:"Calibri",wrap:true});
  });
  /* Footer */
  s1.addText("IH Dashboard v5.0  |  Pertamina Patra Niaga III  |  "+tgl,{
    x:0,y:7.1,w:13.3,h:0.35,
    fontSize:9,color:"CADCFC",align:"center",fontFace:"Calibri"
  });

  /* ══════════════════════════════════════════
     SLIDE 2 — Ringkasan KPI & Data Summary
  ══════════════════════════════════════════ */
  var s2=pres.addSlide();
  s2.background={color:GR};
  /* Header */
  s2.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.0,fill:{color:MC}});
  s2.addText(cfg.icon+" RINGKASAN DATA — "+cfg.label.toUpperCase(),{
    x:0.4,y:0.15,w:11,h:0.7,fontSize:18,bold:true,color:WH,fontFace:"Calibri"
  });
  s2.addText("Dasar: Permenaker No.05/2018 | ACGIH TLV 2024 | ILO MLC 2006",{
    x:0.4,y:6.9,w:12,h:0.35,fontSize:9,color:MU,fontFace:"Calibri"
  });
  /* KPI cards */
  var aman=totalData-melebihi;
  var kpiData=[
    {label:"Total Data",val:String(totalData),col:"1565C0",icon:"📊"},
    {label:"Melebihi Standar",val:String(melebihi),col:RED,icon:"⚠"},
    {label:"Dalam Batas",val:String(aman),col:GRN,icon:"✅"},
    {label:"Kapal Terdampak",val:String(new Set(data.map(function(r){return r[cfg.kapalKey]||"";}).filter(Boolean)).size),col:"7B1FA2",icon:"🚢"}
  ];
  kpiData.forEach(function(k,i){
    var bx=0.3+i*3.2;
    s2.addShape(pres.ShapeType.roundRect,{x:bx,y:1.15,w:3.0,h:1.5,fill:{color:WH},line:{color:k.col,width:2},rectRadius:0.1});
    s2.addText(k.icon,{x:bx,y:1.2,w:3.0,h:0.5,fontSize:20,align:"center"});
    s2.addText(k.val,{x:bx,y:1.7,w:3.0,h:0.55,fontSize:28,bold:true,color:k.col,align:"center",fontFace:"Calibri"});
    s2.addText(k.label,{x:bx,y:2.25,w:3.0,h:0.35,fontSize:10,color:MU,align:"center",fontFace:"Calibri"});
  });
  /* Tabel top temuan melebihi */
  var overList=data.filter(function(r){var s=(r[cfg.statusKey]||"").toLowerCase();return s.includes("melebihi")||s.includes("tinggi")||s.includes("kritis");}).slice(0,8);
  if(overList.length){
    s2.addText("⚠  TEMUAN MELEBIHI STANDAR / RISIKO TINGGI",{
      x:0.3,y:2.85,w:12.7,h:0.4,fontSize:12,bold:true,color:RED,fontFace:"Calibri"
    });
    var rows=[
      [{text:"No",options:{bold:true,color:WH}},{text:"Kapal",options:{bold:true,color:WH}},{text:"Fleet",options:{bold:true,color:WH}},{text:"Temuan",options:{bold:true,color:WH}},{text:"Nilai",options:{bold:true,color:WH}},{text:"Status",options:{bold:true,color:WH}}]
    ];
    overList.forEach(function(r,i){
      rows.push([
        {text:String(i+1)},{text:String(r[cfg.kapalKey]||"—")},{text:String(r[cfg.fleetKey]||"—")},
        {text:String(r[cfg.temuanKey]||"—")},
        {text:String(r[cfg.hasilKey]||"—")+(r[cfg.satuanKey]?" "+r[cfg.satuanKey]:"")},
        {text:String(r[cfg.statusKey]||"—")}
      ]);
    });
    s2.addTable(rows,{
      x:0.3,y:3.3,w:12.7,h:Math.min(overList.length*0.42+0.42,3.2),
      fontSize:10,fontFace:"Calibri",
      align:"left",valign:"middle",
      fill:{color:WH},
      border:{pt:0.5,color:"E2E8F0"},
      colW:[0.4,2.4,1.0,3.2,1.5,1.5],
      rowH:0.38,
      autoPage:false,
      color:TX,
      thead:{fill:{color:MC},color:WH}
    });
  }

  /* ══════════════════════════════════════════
     SLIDE 3–N — Per temuan unik: 5 Hirarki
  ══════════════════════════════════════════ */
  /* Grup temuan unik */
  var grupMap={};
  data.forEach(function(r){
    var key=(r[cfg.temuanKey]||"Tidak Diketahui").trim();
    if(!grupMap[key])grupMap[key]=[];
    grupMap[key].push(r);
  });
  var temuan=Object.keys(grupMap);

  temuan.forEach(function(tipe){
    var rows=grupMap[tipe];
    var melebihiRows=rows.filter(function(r){var s=(r[cfg.statusKey]||"").toLowerCase();return s.includes("melebihi")||s.includes("tinggi")||s.includes("kritis");});
    var hirarki=getHirarki(hazardType,tipe);
    var kapalList=[...new Set(rows.map(function(r){return r[cfg.kapalKey]||"";}).filter(Boolean))];
    var statusLabel=melebihiRows.length>0?"MELEBIHI STANDAR":"DALAM BATAS";
    var statusColor=melebihiRows.length>0?RED:GRN;

    var s=pres.addSlide();
    s.background={color:WH};

    /* Header strip */
    s.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:0.95,fill:{color:MC}});
    s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:"#"+AC}});
    s.addText(cfg.icon+" "+cfg.label.toUpperCase()+" — HIRARKI PENGENDALIAN",{
      x:0.25,y:0.05,w:9,h:0.45,fontSize:11,bold:true,color:"CADCFC",fontFace:"Calibri"
    });
    s.addText(tipe.toUpperCase(),{
      x:0.25,y:0.5,w:9,h:0.4,fontSize:14,bold:true,color:WH,fontFace:"Calibri"
    });
    /* Badge status */
    s.addShape(pres.ShapeType.roundRect,{x:10.0,y:0.15,w:3.1,h:0.65,fill:{color:statusColor},rectRadius:0.08});
    s.addText(statusLabel,{x:10.0,y:0.15,w:3.1,h:0.65,fontSize:11,bold:true,color:WH,align:"center",fontFace:"Calibri"});

    /* Info baris — kapal & data */
    s.addShape(pres.ShapeType.rect,{x:0.15,y:1.0,w:13.0,h:0.5,fill:{color:GR},line:{color:"E2E8F0",width:0.5}});
    s.addText([
      {text:"🚢 Kapal: ",options:{bold:true,color:TX}},
      {text:kapalList.slice(0,5).join(", ")+(kapalList.length>5?" + "+(kapalList.length-5)+" lainnya":""),options:{color:TX}},
      {text:"    |    📊 Total Data: ",options:{bold:true,color:TX}},
      {text:String(rows.length),options:{color:TX}},
      {text:"    |    ⚠ Melebihi: ",options:{bold:true,color:TX}},
      {text:String(melebihiRows.length),options:{color:melebihiRows.length>0?RED:GRN,bold:true}}
    ],{x:0.2,y:1.02,w:12.9,h:0.45,fontSize:10,fontFace:"Calibri"});

    /* 5 Hirarki Pengendalian */
    var hierData=[
      {no:"1",judul:"ELIMINASI",warna:RED,icon:"🚫",isi:hirarki.E||"Identifikasi dan eliminasi sumber bahaya dari lingkungan kerja kapal jika secara teknis dan operasional memungkinkan."},
      {no:"2",judul:"SUBSTITUSI",warna:"E65100",icon:"🔄",isi:hirarki.S||"Ganti material, proses, atau peralatan yang berbahaya dengan alternatif yang lebih aman dan memenuhi standar maritim."},
      {no:"3",judul:"REKAYASA TEKNIK",warna:"1565C0",icon:"⚙",isi:hirarki.R||"Terapkan kontrol teknis: ventilasi, enclosure, isolasi, dan modifikasi teknis peralatan dan fasilitas kapal."},
      {no:"4",judul:"ADMINISTRATIF",warna:GRN,icon:"📋",isi:hirarki.A||"Terapkan SOP, permit-to-work, rotasi kerja, training, dan program pengawasan sesuai regulasi Permenaker 05/2018 dan ILO MLC 2006."},
      {no:"5",judul:"APD",warna:"6A1B9A",icon:"🦺",isi:hirarki.P||"Sediakan APD yang sesuai dengan jenis hazard, terstandarisasi SNI/ISO, dan pastikan penggunaan konsisten oleh seluruh ABK."}
    ];

    hierData.forEach(function(h,i){
      var bx=0.15;
      var by=1.62+i*1.12;
      /* Label nomor & judul */
      s.addShape(pres.ShapeType.roundRect,{x:bx,y:by,w:2.5,h:1.0,fill:{color:h.warna},rectRadius:0.06});
      s.addText(h.icon+" "+h.no,{x:bx,y:by+0.05,w:2.5,h:0.42,fontSize:18,bold:true,color:WH,align:"center",fontFace:"Calibri"});
      s.addText(h.judul,{x:bx,y:by+0.52,w:2.5,h:0.42,fontSize:9,bold:true,color:WH,align:"center",fontFace:"Calibri",charSpacing:1});
      /* Isi rekomendasi */
      s.addShape(pres.ShapeType.rect,{x:2.7,y:by,w:10.4,h:1.0,fill:{color:i%2===0?WH:GR},line:{color:"E2E8F0",width:0.5}});
      s.addText(h.isi,{
        x:2.8,y:by+0.04,w:10.2,h:0.92,
        fontSize:9.5,color:TX,fontFace:"Calibri",wrap:true,valign:"middle"
      });
    });

    /* Footer slide */
    s.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:GR}});
    s.addText("Ref: Permenaker No.05/2018 | ACGIH TLV 2024 | IMO MSC/Circ.1351 | ILO MLC 2006 | OSHA 29 CFR 1910",{
      x:0.2,y:7.18,w:10,h:0.28,fontSize:7.5,color:MU,fontFace:"Calibri"
    });
    s.addText("IH Dashboard  |  Pertamina Patra Niaga III",{
      x:10.2,y:7.18,w:3.0,h:0.28,fontSize:7.5,color:MU,align:"right",fontFace:"Calibri"
    });
  });

  /* ══════════════════════════════════════════
     SLIDE PENUTUP — Rekomendasi Prioritas
  ══════════════════════════════════════════ */
  var sEnd=pres.addSlide();
  sEnd.background={color:MC};
  sEnd.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:"#"+AC}});
  sEnd.addText("REKOMENDASI PRIORITAS TINDAK LANJUT",{
    x:0.3,y:0.4,w:12.5,h:0.7,fontSize:22,bold:true,color:WH,fontFace:"Calibri",charSpacing:2
  });
  sEnd.addText(cfg.icon+" "+cfg.label,{
    x:0.3,y:1.1,w:12.5,h:0.45,fontSize:14,color:AC,fontFace:"Calibri",bold:true
  });
  sEnd.addShape(pres.ShapeType.rect,{x:0.3,y:1.65,w:12.5,h:0.04,fill:{color:AC}});

  /* Prioritas berdasarkan melebihi */
  var prioData=[
    {label:"SEGERA (0–1 Bulan)",color:"C62828",items:["Hentikan pekerjaan di area dengan temuan KRITIS sampai kontrol teknis terpasang","Distribusi APD darurat untuk seluruh ABK di area terdampak","Laporkan temuan kepada HSE Officer dan Nakhoda segera","Pasang safety barrier dan warning sign di area berbahaya"]},
    {label:"JANGKA PENDEK (1–3 Bulan)",color:"E65100",items:["Pasang rekayasa teknik: ventilasi, enclosure, atau monitoring kontinu","Revisi JSA (Job Safety Analysis) untuk semua pekerjaan berisiko tinggi","Laksanakan training ulang ABK tentang hazard "+cfg.label,"Lakukan medical check-up untuk ABK yang terpapar melebihi standar"]},
    {label:"JANGKA PANJANG (3–12 Bulan)",color:"1565C0",items:["Review dan update program IH monitoring tahunan","Evaluasi efektivitas semua kontrol yang telah diterapkan","Integrasikan temuan ke dalam Ship Safety Management System (SMS)","Susun laporan tahunan untuk manajemen dan klas"]}
  ];
  prioData.forEach(function(p,i){
    var by=2.0+i*1.7;
    sEnd.addShape(pres.ShapeType.roundRect,{x:0.3,y:by,w:12.5,h:1.55,fill:{color:"1C3A5A"},line:{color:p.color,width:2},rectRadius:0.1});
    sEnd.addShape(pres.ShapeType.roundRect,{x:0.3,y:by,w:3.2,h:0.45,fill:{color:p.color},rectRadius:0.06});
    sEnd.addText(p.label,{x:0.35,y:by+0.02,w:3.1,h:0.4,fontSize:9,bold:true,color:WH,fontFace:"Calibri",align:"center"});
    var bullets=p.items.map(function(txt,j){return{text:txt,options:{bullet:true,color:"CADCFC",fontSize:9,fontFace:"Calibri",breakLine:j<p.items.length-1}};});
    sEnd.addText(bullets,{x:0.45,y:by+0.5,w:12.2,h:1.0});
  });
  /* Footer */
  sEnd.addText("Dokumen ini dibuat otomatis oleh IH Dashboard v5.0 — "+new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}),{
    x:0,y:7.1,w:13.3,h:0.35,fontSize:9,color:"CADCFC",align:"center",fontFace:"Calibri"
  });

  /* ── Save ── */
  /* ══════════════════════════════════════════
     SLIDE BIOMARKER — khusus Faktor Kimia
  ══════════════════════════════════════════ */
  if(hazardType==="kimia"&&(rawBiomarker.length>0||rawPersonal.length>0)){

    /* ── Slide cover biomonitoring ── */
    var sbio=pres.addSlide();
    sbio.background={color:WH};
    sbio.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:MC}});
    sbio.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:"7B1FA2"}});
    sbio.addText("⚗ FAKTOR KIMIA — BIOMONITORING BENZENE",{
      x:0.25,y:0.1,w:12.5,h:0.45,fontSize:11,bold:true,color:"CADCFC",fontFace:"Calibri"
    });
    sbio.addText("Hasil Pemantauan Biologis & Personal Air Sampling",{
      x:0.25,y:0.58,w:10,h:0.42,fontSize:14,bold:true,color:WH,fontFace:"Calibri"
    });

    /* KPI row */
    var bioTotal=rawBiomarker.length+rawPersonal.length;
    var bioMelebihi=rawBiomarker.filter(function(r){return r.kreatinin>r.rujukan;}).length
                   +rawPersonal.filter(function(r){return r.hasil>r.nab;}).length;
    var bioAman=bioTotal-bioMelebihi;
    var kapalBio=new Set([].concat(rawBiomarker.map(function(r){return r.kapal;}),rawPersonal.map(function(r){return r.kapal;})).filter(Boolean)).size;

    var kpiItems=[
      {label:"Total Sampel",val:String(bioTotal),col:"7B1FA2",icon:"🧪"},
      {label:"Melebihi BEI/NAB",val:String(bioMelebihi),col:bioMelebihi>0?RED:GRN,icon:"⚠"},
      {label:"Dalam Batas Normal",val:String(bioAman),col:GRN,icon:"✅"},
      {label:"Kapal Terdampak",val:String(kapalBio),col:"1565C0",icon:"🚢"}
    ];
    kpiItems.forEach(function(k,i){
      var bx=0.3+i*3.17;
      sbio.addShape(pres.ShapeType.roundRect,{x:bx,y:1.25,w:3.0,h:1.4,fill:{color:WH},line:{color:k.col,width:2},rectRadius:0.1});
      sbio.addText(k.icon,{x:bx,y:1.3,w:3.0,h:0.5,fontSize:18,align:"center"});
      sbio.addText(k.val,{x:bx,y:1.8,w:3.0,h:0.52,fontSize:26,bold:true,color:k.col,align:"center",fontFace:"Calibri"});
      sbio.addText(k.label,{x:bx,y:2.33,w:3.0,h:0.28,fontSize:10,color:MU,align:"center",fontFace:"Calibri"});
    });

    /* Standar referensi */
    sbio.addShape(pres.ShapeType.roundRect,{x:0.3,y:2.8,w:12.7,h:0.55,fill:{color:"F3E5F5"},rectRadius:0.06});
    sbio.addText([
      {text:"Standar: ",options:{bold:true,color:"7B1FA2",fontSize:10}},
      {text:"ACGIH BEI 2024: Muconic Acid 500 µg/g kreatinin (25 µg/g ≈ 0.1 ppm)  |  ",options:{color:"4A148C",fontSize:10}},
      {text:"Permenaker 05/2018: NAB Benzene Udara 0.5 ppm TWA  |  ",options:{color:"4A148C",fontSize:10}},
      {text:"IARC: Grup 1 (Karsinogen pada Manusia)",options:{bold:true,color:"C62828",fontSize:10}}
    ],{x:0.4,y:2.82,w:12.5,h:0.5});

    /* Tabel Biomarker */
    if(rawBiomarker.length>0){
      sbio.addText("A. DATA BIOMARKER BENZENE (Urin — Muconic Acid/Kreatinin)",{
        x:0.3,y:3.5,w:12.7,h:0.35,fontSize:10,bold:true,color:"7B1FA2",fontFace:"Calibri"
      });
      var bioRows=[[
        {text:"No",options:{bold:true,color:WH}},
        {text:"Tahun",options:{bold:true,color:WH}},
        {text:"Kapal",options:{bold:true,color:WH}},
        {text:"Fleet",options:{bold:true,color:WH}},
        {text:"Pekerja",options:{bold:true,color:WH}},
        {text:"Nilai (µg/g)",options:{bold:true,color:WH}},
        {text:"BEI",options:{bold:true,color:WH}},
        {text:"Status",options:{bold:true,color:WH}}
      ]];
      rawBiomarker.slice(0,12).forEach(function(r,i){
        var over=r.kreatinin>r.rujukan;
        bioRows.push([
          {text:String(i+1)},
          {text:String(r.tahun||"—")},
          {text:String(r.kapal||"—")},
          {text:String(r.fleet||"—")},
          {text:String(r.pekerja||"—")},
          {text:String(r.kreatinin||"0"),options:{bold:true,color:over?RED:GRN}},
          {text:String(r.rujukan||"25")},
          {text:over?"MELEBIHI BEI":"Normal",options:{bold:true,color:over?RED:GRN}}
        ]);
      });
      sbio.addTable(bioRows,{
        x:0.3,y:3.9,w:12.7,h:Math.min(rawBiomarker.slice(0,12).length*0.34+0.34,2.7),
        fontSize:9,fontFace:"Calibri",color:TX,
        border:{pt:0.5,color:"E2E8F0"},
        rowH:0.3,
        colW:[0.3,0.7,2.0,0.8,2.2,1.1,0.8,1.6],
        fill:{color:WH},
        thead:{fill:{color:MC},color:WH},
        autoPage:false
      });
    }

    /* Footer */
    sbio.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:GR}});
    sbio.addText("Ref: ACGIH BEI 2024 | Permenaker No.05/2018 | IARC Monograph Vol.120 | ILO MLC 2006",{
      x:0.2,y:7.18,w:10,h:0.28,fontSize:7.5,color:MU,fontFace:"Calibri"
    });
    sbio.addText("IH Dashboard  |  Pertamina Patra Niaga III",{
      x:10.2,y:7.18,w:3.0,h:0.28,fontSize:7.5,color:MU,align:"right",fontFace:"Calibri"
    });

    /* ── Slide Personal Air Sampling ── */
    if(rawPersonal.length>0){
      var spers=pres.addSlide();
      spers.background={color:WH};
      spers.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:MC}});
      spers.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:"7B1FA2"}});
      spers.addText("⚗ FAKTOR KIMIA — BENZENE PERSONAL AIR SAMPLING",{
        x:0.25,y:0.1,w:12.5,h:0.45,fontSize:11,bold:true,color:"CADCFC",fontFace:"Calibri"
      });
      spers.addText("Hasil Pengukuran Paparan Benzene di Udara Tempat Kerja (ppm)",{
        x:0.25,y:0.58,w:12.5,h:0.42,fontSize:14,bold:true,color:WH,fontFace:"Calibri"
      });

      /* Statistik */
      var persNABOver=rawPersonal.filter(function(r){return r.hasil>r.nab;}).length;
      var persAvg=rawPersonal.length?+(rawPersonal.reduce(function(s,r){return s+r.hasil;},0)/rawPersonal.length).toFixed(3):0;
      var persMax=rawPersonal.length?Math.max.apply(null,rawPersonal.map(function(r){return r.hasil;})):0;
      var nabRef=rawPersonal.length?rawPersonal[0].nab:0.5;

      var statItems=[
        {label:"Total Sampel",val:String(rawPersonal.length),col:"1565C0"},
        {label:"Melebihi NAB ("+nabRef+" ppm)",val:String(persNABOver),col:persNABOver>0?RED:GRN},
        {label:"Rata-rata Paparan",val:String(persAvg)+" ppm",col:"7B1FA2"},
        {label:"Nilai Tertinggi",val:String(persMax)+" ppm",col:persMax>nabRef?RED:"E65100"}
      ];
      statItems.forEach(function(k,i){
        var bx=0.3+i*3.17;
        spers.addShape(pres.ShapeType.roundRect,{x:bx,y:1.25,w:3.0,h:1.2,fill:{color:GR},line:{color:k.col,width:1.5},rectRadius:0.08});
        spers.addText(k.val,{x:bx,y:1.32,w:3.0,h:0.55,fontSize:22,bold:true,color:k.col,align:"center",fontFace:"Calibri"});
        spers.addText(k.label,{x:bx,y:1.88,w:3.0,h:0.32,fontSize:9.5,color:MU,align:"center",fontFace:"Calibri"});
      });

      /* NAB reference box */
      spers.addShape(pres.ShapeType.roundRect,{x:0.3,y:2.6,w:12.7,h:0.5,fill:{color:"FFF3E0"},rectRadius:0.06});
      spers.addText([
        {text:"NAB Permenaker 05/2018: ",options:{bold:true,color:"E65100",fontSize:10}},
        {text:"0.5 ppm TWA (8 jam/hari)   ",options:{color:"BF360C",fontSize:10}},
        {text:"TLV-TWA ACGIH 2024: ",options:{bold:true,color:"E65100",fontSize:10}},
        {text:"0.5 ppm   ",options:{color:"BF360C",fontSize:10}},
        {text:"NIOSH REL: ",options:{bold:true,color:"C62828",fontSize:10}},
        {text:"0.1 ppm (paling ketat, reference tertinggi)",options:{color:"C62828",fontSize:10}}
      ],{x:0.4,y:2.63,w:12.5,h:0.44});

      /* Tabel Personal */
      spers.addText("DATA PERSONAL AIR SAMPLING BENZENE",{
        x:0.3,y:3.22,w:12.7,h:0.35,fontSize:10,bold:true,color:"7B1FA2",fontFace:"Calibri"
      });
      var persRows=[[
        {text:"No",options:{bold:true,color:WH}},
        {text:"Tahun",options:{bold:true,color:WH}},
        {text:"Kapal",options:{bold:true,color:WH}},
        {text:"Fleet",options:{bold:true,color:WH}},
        {text:"Pekerja",options:{bold:true,color:WH}},
        {text:"Lokasi",options:{bold:true,color:WH}},
        {text:"Hasil (ppm)",options:{bold:true,color:WH}},
        {text:"NAB",options:{bold:true,color:WH}},
        {text:"Status",options:{bold:true,color:WH}}
      ]];
      rawPersonal.slice(0,14).forEach(function(r,i){
        var over=r.hasil>r.nab;
        persRows.push([
          {text:String(i+1)},
          {text:String(r.tahun||"—")},
          {text:String(r.kapal||"—")},
          {text:String(r.fleet||"—")},
          {text:String(r.pekerja||"—")},
          {text:String(r.lokasi||"—")},
          {text:String(r.hasil||"0"),options:{bold:true,color:over?RED:GRN}},
          {text:String(r.nab||"0.5")},
          {text:over?"MELEBIHI NAB":"Normal",options:{bold:true,color:over?RED:GRN}}
        ]);
      });
      spers.addTable(persRows,{
        x:0.3,y:3.62,w:12.7,h:Math.min(rawPersonal.slice(0,14).length*0.3+0.3,3.0),
        fontSize:8.5,fontFace:"Calibri",color:TX,
        border:{pt:0.5,color:"E2E8F0"},
        rowH:0.28,
        colW:[0.3,0.65,1.8,0.75,1.9,1.7,1.05,0.75,1.5],
        fill:{color:WH},
        thead:{fill:{color:MC},color:WH},
        autoPage:false
      });

      /* Footer */
      spers.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:GR}});
      spers.addText("Ref: ACGIH TLV-TWA 2024 (0.5 ppm) | Permenaker 05/2018 | NIOSH REL (0.1 ppm) | IARC Group 1",{
        x:0.2,y:7.18,w:10,h:0.28,fontSize:7.5,color:MU,fontFace:"Calibri"
      });
      spers.addText("IH Dashboard  |  Pertamina Patra Niaga III",{
        x:10.2,y:7.18,w:3.0,h:0.28,fontSize:7.5,color:MU,align:"right",fontFace:"Calibri"
      });
    }

    /* ── Slide hirarki pengendalian khusus benzene ── */
    var sbenz=pres.addSlide();
    sbenz.background={color:WH};
    sbenz.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:MC}});
    sbenz.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:"7B1FA2"}});
    sbenz.addText("⚗ FAKTOR KIMIA — HIRARKI PENGENDALIAN BENZENE",{
      x:0.25,y:0.1,w:12.5,h:0.45,fontSize:11,bold:true,color:"CADCFC",fontFace:"Calibri"
    });
    sbenz.addText("Strategi Pengendalian Paparan Benzene di Lingkungan Kerja Maritim",{
      x:0.25,y:0.58,w:12.5,h:0.42,fontSize:14,bold:true,color:WH,fontFace:"Calibri"
    });

    var hBenzene=HIRARKI_DB.kimia.benzene;
    var hierBenz=[
      {no:"1",judul:"ELIMINASI",warna:"C62828",icon:"🚫",isi:hBenzene.E},
      {no:"2",judul:"SUBSTITUSI",warna:"E65100",icon:"🔄",isi:hBenzene.S},
      {no:"3",judul:"REKAYASA TEKNIK",warna:"1565C0",icon:"⚙",isi:hBenzene.R},
      {no:"4",judul:"ADMINISTRATIF",warna:"2E7D32",icon:"📋",isi:hBenzene.A},
      {no:"5",judul:"APD",warna:"6A1B9A",icon:"🦺",isi:hBenzene.P}
    ];
    hierBenz.forEach(function(h,i){
      var by=1.24+i*1.22;
      sbenz.addShape(pres.ShapeType.roundRect,{x:0.15,y:by,w:2.5,h:1.1,fill:{color:h.warna},rectRadius:0.06});
      sbenz.addText(h.icon+" "+h.no,{x:0.15,y:by+0.05,w:2.5,h:0.48,fontSize:20,bold:true,color:WH,align:"center",fontFace:"Calibri"});
      sbenz.addText(h.judul,{x:0.15,y:by+0.6,w:2.5,h:0.42,fontSize:9,bold:true,color:WH,align:"center",fontFace:"Calibri",charSpacing:1});
      sbenz.addShape(pres.ShapeType.rect,{x:2.7,y:by,w:10.4,h:1.1,fill:{color:i%2===0?WH:GR},line:{color:"E2E8F0",width:0.5}});
      sbenz.addText(h.isi,{x:2.8,y:by+0.06,w:10.2,h:0.98,fontSize:9.5,color:TX,fontFace:"Calibri",wrap:true,valign:"middle"});
    });
    sbenz.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:GR}});
    sbenz.addText("Ref: ACGIH TLV 2024 | Permenaker 05/2018 | NIOSH REL | IARC Group 1 | IMO MSC/Circ.1351",{
      x:0.2,y:7.18,w:10,h:0.28,fontSize:7.5,color:MU,fontFace:"Calibri"
    });
    sbenz.addText("IH Dashboard  |  Pertamina Patra Niaga III",{
      x:10.2,y:7.18,w:3.0,h:0.28,fontSize:7.5,color:MU,align:"right",fontFace:"Calibri"
    });
  }

  var filename="IH_5Hirarki_"+cfg.label.replace(/\s+/g,"_")+"_"+new Date().toISOString().slice(0,10)+".pptx";
  pres.writeFile({fileName:filename})
    .then(function(){showToast("PPT "+cfg.label+" berhasil didownload!","success");})
    .catch(function(err){showToast("Gagal export PPT: "+err.message,"error");console.error(err);});
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY DASHBOARD — Laporan Komprehensif Industrial Hygiene
   Bahasa akademis untuk manajemen & direksi
   Output: tampilan dashboard + export PDF
═══════════════════════════════════════════════════════════════ */

function getSummaryData(){
  var fleet=(document.getElementById("summary-filter-fleet")||{}).value||"";
  var filterFleet=function(arr){return fleet?arr.filter(function(r){return(r["Fleet"]||r["Jenis Fleet"]||"")=== fleet;}):arr;};

  /* HRA */
  var hraData=filterFleet(rawHRA);
  var hraDone=new Set(hraData.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
  var hraTotal=fleet?new Set(hraData.map(function(r){return r["Nama Kapal"];})).size:TOTAL_KAPAL;
  var hraBudget=hraData.reduce(function(s,r){return s+parseFloat(r["Est Budget"]||0);},0);
  var hraCoverage=hraTotal>0?((hraDone/hraTotal)*100).toFixed(1):0;

  /* DAT */
  var datData=filterFleet(rawDAT);
  var datKapal=new Set(datData.map(function(r){return r["Nama Kapal"];})).size;
  var datCrew=datData.reduce(function(s,r){return s+parseInt(r["Total Crew Diperiksa"]||0);},0);
  var datPos=datData.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
  var datBiaya=datData.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
  var datPositifRate=datCrew>0?((datPos/datCrew)*100).toFixed(2):0;

  /* Pest */
  var pestData=filterFleet(rawPest);
  var pestCount=pestData.length;
  var pestBiaya=pestData.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);

  /* 5 Hazard */
  var fisikaData=filterFleet(rawFisika);
  var fisikaMelebihi=fisikaData.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var kimiaData=filterFleet(rawKimia);
  var kimiaMelebihi=kimiaData.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var biologiData=filterFleet(rawBiologi);
  var biologiMelebihi=biologiData.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var ergonomiData=filterFleet(rawErgonomi);
  var ergonomiTinggi=ergonomiData.filter(function(r){var l=(r["Level Risiko (1–4)"]||r["Level Risiko"]||"");return parseInt(l)>=3||String(l).toLowerCase().includes("tinggi");}).length;
  var psikoData=filterFleet(rawPsikososial);
  var psikoTinggi=psikoData.filter(function(r){return(r["Level Risiko"]||"").toLowerCase().includes("tinggi")||parseInt(r["Level Risiko (1–4)"]||r["Level Risiko"]||0)>=3;}).length;
  var hazardTotal=fisikaData.length+kimiaData.length+biologiData.length+ergonomiData.length+psikoData.length;
  var hazardMelebihi=fisikaMelebihi+kimiaMelebihi+biologiMelebihi+ergonomiTinggi+psikoTinggi;

  /* Biomarker */
  var bioData=filterFleet(rawBiomarker);
  var bioMelebihi=bioData.filter(function(r){return r.kreatinin>r.rujukan;}).length;

  return{
    fleet:fleet,
    hra:{done:hraDone,total:hraTotal,budget:hraBudget,coverage:hraCoverage,data:hraData},
    dat:{kapal:datKapal,crew:datCrew,positif:datPos,biaya:datBiaya,rate:datPositifRate,data:datData},
    pest:{count:pestCount,biaya:pestBiaya,data:pestData},
    hazard:{total:hazardTotal,melebihi:hazardMelebihi,
      fisika:{total:fisikaData.length,melebihi:fisikaMelebihi},
      kimia:{total:kimiaData.length,melebihi:kimiaMelebihi},
      biologi:{total:biologiData.length,melebihi:biologiMelebihi},
      ergonomi:{total:ergonomiData.length,tinggi:ergonomiTinggi},
      psiko:{total:psikoData.length,tinggi:psikoTinggi}
    },
    bio:{total:bioData.length,melebihi:bioMelebihi}
  };
}

function trafficLight(pct){
  if(pct>=80)return{color:"#2E7D32",bg:"#E8F5E9",label:"BAIK",icon:"fa-circle-check"};
  if(pct>=50)return{color:"#E65100",bg:"#FFF3E0",label:"PERHATIAN",icon:"fa-circle-exclamation"};
  return{color:"#C62828",bg:"#FFEBEE",label:"KRITIS",icon:"fa-circle-xmark"};
}

function renderSummaryPage(){
  var el=document.getElementById("summaryReport");
  if(!el)return;
  var d=getSummaryData();
  var now=new Date();
  var tgl=now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  var bulan=now.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  var fleetLabel=d.fleet||"Seluruh Armada";
  var hraTL=trafficLight(parseFloat(d.hra.coverage));
  var datTL=trafficLight(d.dat.crew>0?((1-(d.dat.positif/d.dat.crew))*100):100);
  var hazardPct=d.hazard.total>0?(((d.hazard.total-d.hazard.melebihi)/d.hazard.total)*100):100;
  var hazardTL=trafficLight(hazardPct);
  var pestTL=trafficLight(d.pest.count>0?100:0);

  /* Helper: tabel hazard */
  function hazardTableRows(){
    var rows=[
      {label:"Faktor Fisika",total:d.hazard.fisika.total,over:d.hazard.fisika.melebihi,pct:d.hazard.fisika.total>0?Math.round(d.hazard.fisika.melebihi/d.hazard.fisika.total*100):0},
      {label:"Faktor Kimia",total:d.hazard.kimia.total,over:d.hazard.kimia.melebihi,pct:d.hazard.kimia.total>0?Math.round(d.hazard.kimia.melebihi/d.hazard.kimia.total*100):0},
      {label:"Faktor Biologi",total:d.hazard.biologi.total,over:d.hazard.biologi.melebihi,pct:d.hazard.biologi.total>0?Math.round(d.hazard.biologi.melebihi/d.hazard.biologi.total*100):0},
      {label:"Faktor Ergonomi",total:d.hazard.ergonomi.total,over:d.hazard.ergonomi.tinggi,pct:d.hazard.ergonomi.total>0?Math.round(d.hazard.ergonomi.tinggi/d.hazard.ergonomi.total*100):0},
      {label:"Faktor Psikososial",total:d.hazard.psiko.total,over:d.hazard.psiko.tinggi,pct:d.hazard.psiko.total>0?Math.round(d.hazard.psiko.tinggi/d.hazard.psiko.total*100):0}
    ];
    return rows.map(function(r,i){
      var bc=r.pct>50?"#C62828":r.pct>20?"#E65100":"#2E7D32";
      return'<tr style="background:'+(i%2===0?'#fff':'#F8FAFC')+'">'+
        '<td style="padding:8px 14px;border-bottom:1px solid #EEF2F7;font-size:12px;font-weight:600;color:#1E293B">'+r.label+'</td>'+
        '<td style="padding:8px 14px;border-bottom:1px solid #EEF2F7;text-align:center;font-size:12px;color:#475569">'+r.total+'</td>'+
        '<td style="padding:8px 14px;border-bottom:1px solid #EEF2F7;text-align:center;font-size:12px;font-weight:700;color:'+(r.over>0?"#C62828":"#2E7D32")+'">'+r.over+'</td>'+
        '<td style="padding:8px 14px;border-bottom:1px solid #EEF2F7">'+
          '<div style="display:flex;align-items:center;gap:8px">'+
          '<div style="flex:1;background:#E8EDF2;border-radius:4px;height:7px;overflow:hidden">'+
          '<div style="width:'+Math.min(r.pct,100)+'%;background:'+bc+';height:100%;border-radius:4px"></div></div>'+
          '<span style="font-size:11px;font-weight:700;color:'+bc+';min-width:32px">'+r.pct+'%</span></div></td>'+
        '</tr>';
    }).join("");
  }

  /* Teks akademis dinamis per bagian */
  var anaHRA = d.hra.coverage>=80
    ? 'Tingkat coverage pelaksanaan HRA sebesar <b>'+d.hra.coverage+'%</b> mencerminkan kepatuhan yang <b>baik dan sesuai target program</b>. Capaian ini melampaui ambang minimal 80% yang ditetapkan dalam Peraturan Menteri Ketenagakerjaan Nomor 05 Tahun 2018 sebagai indikator kinerja IH minimal. Sebanyak <b>'+d.hra.done+' unit armada</b> telah menyelesaikan siklus HRA penuh, dengan estimasi total anggaran program sebesar <b>'+formatRupiah(d.hra.budget)+'</b>.'
    : 'Tingkat coverage pelaksanaan HRA sebesar <b>'+d.hra.coverage+'%</b> menunjukkan adanya <b>kesenjangan implementasi yang signifikan</b> terhadap target program IH tahunan. Dari total <b>'+d.hra.total+' unit armada</b>, masih terdapat <b>'+( d.hra.total-d.hra.done)+' kapal</b> yang belum menyelesaikan siklus HRA, berpotensi menimbulkan blind spot dalam sistem manajemen bahaya ketenagakerjaan. Diperlukan percepatan dan prioritisasi pelaksanaan HRA sesuai amanat Permenaker No.05/2018 Pasal 6 ayat (1).';

  var anaDAT = d.dat.positif===0
    ? 'Program Drugs &amp; Alcohol Test (DAT) mencatat capaian <b>zero positive rate</b> dari total <b>'+fmtNum(d.dat.crew)+' awak kapal</b> yang diperiksa pada <b>'+d.dat.kapal+' unit armada</b>. Capaian ini merupakan indikator tertinggi kepatuhan terhadap ketentuan Maritime Labour Convention (MLC) 2006 Regulation 4.3 tentang lingkungan kerja bebas zat adiktif, serta Peraturan Menteri Perhubungan terkait sertifikasi kesehatan awak kapal.'
    : 'Program DAT mencatat <b>'+d.dat.positif+' kasus reaktif</b> dari <b>'+fmtNum(d.dat.crew)+' awak kapal</b> yang diperiksa (tingkat prevalensi: <b>'+d.dat.rate+'%</b>). Seluruh kasus reaktif wajib mendapatkan penanganan medis dan tindak lanjut administratif sesuai Prosedur Operasional Standar perusahaan, mencakup evaluasi kesehatan, rujukan spesialis, serta potensi pembebastugasan sementara. Penemuan ini memerlukan evaluasi komprehensif terhadap faktor risiko lingkungan dan sosial di unit armada terdampak.';

  var anaHazard = d.hazard.melebihi===0
    ? 'Seluruh <b>'+d.hazard.total+' parameter hazard</b> yang diukur menunjukkan nilai berada dalam batas Nilai Ambang Batas (NAB) yang ditetapkan. Kondisi ini mencerminkan efektivitas program pengendalian bahaya eksisting dan kepatuhan penuh terhadap Permenaker No.05/2018 Pasal 9 tentang pengendalian faktor bahaya lingkungan kerja. Pemantauan berkala tetap diperlukan untuk mempertahankan kondisi ini.'
    : 'Dari total <b>'+d.hazard.total+' pengukuran</b> faktor hazard yang dilaksanakan, teridentifikasi <b>'+d.hazard.melebihi+' parameter ('+Math.round(d.hazard.melebihi/d.hazard.total*100)+'%)</b> melampaui NAB yang ditetapkan. Temuan ini menuntut implementasi segera hirarki pengendalian risiko (eliminasi → substitusi → rekayasa teknik → administratif → APD) sesuai amanat Permenaker No.05/2018, ISO 45001:2018, dan standar IMO MSC/Circ.1351. Prioritas tindak lanjut diarahkan pada parameter dengan persentase ekseedance tertinggi.';

  var anaPest = d.pest.count>0
    ? 'Program pengendalian vektor dan hama telah terlaksana sebanyak <b>'+d.pest.count+' kegiatan</b> dengan total anggaran <b>'+formatRupiah(d.pest.biaya)+'</b>. Pelaksanaan ini memenuhi kewajiban sanitasi kapal sebagaimana diatur dalam International Health Regulations (IHR) 2005 WHO dan persyaratan Ship Sanitation Certificate yang diverifikasi pada setiap kunjungan pelabuhan.'
    : 'Data pelaksanaan Pest &amp; Rodent Control belum tersedia pada periode pelaporan ini. Pelaksanaan program pengendalian vektor merupakan kewajiban regulatif yang harus dipenuhi secara periodik sesuai IHR 2005 WHO untuk menjaga sanitasi kapal dan mencegah transmisi penyakit zoonosis.';

  var anaBio = d.bio.total>0
    ? 'Pemantauan biologis benzene terhadap <b>'+d.bio.total+' sampel</b> menunjukkan <b>'+d.bio.melebihi+' sampel ('+Math.round(d.bio.melebihi/d.bio.total*100)+'%)</b> '+(d.bio.melebihi>0?'melampaui Biological Exposure Indices (BEI) ACGIH 2024 sebesar 25 µg/g kreatinin. Mengingat benzene terklasifikasi sebagai karsinogen Grup 1 oleh IARC, temuan ini memerlukan respons kesehatan segera mencakup pemeriksaan hematologi lengkap, evaluasi paparan sumber, dan implementasi rekayasa pengendalian di area kerja terdampak.':'berada dalam batas BEI ACGIH 2024 (25 µg/g kreatinin). Pemantauan berkala setiap 6 bulan tetap direkomendasikan mengingat klasifikasi karsinogen Grup 1 benzene oleh IARC.')
    : 'Data biomonitoring benzene belum tersedia. Program pemantauan biologis direkomendasikan untuk seluruh ABK yang berpotensi terpapar benzene sesuai standar ACGIH BEI 2024.';

  /* Penentuan warna status komprehensif */
  var statusKeseluruhan=function(){
    var skor=0;
    if(parseFloat(d.hra.coverage)>=80)skor++;
    if(d.dat.positif===0)skor+=2;else if(parseFloat(d.dat.rate)<1)skor++;
    if(d.hazard.melebihi===0)skor+=2;else if(d.hazard.melebihi<=3)skor++;
    if(d.pest.count>0)skor++;
    if(skor>=5)return{label:"BAIK",color:"#1B5E20",bg:"#E8F5E9",border:"#4CAF50"};
    if(skor>=3)return{label:"PERHATIAN",color:"#E65100",bg:"#FFF3E0",border:"#FF9800"};
    return{label:"KRITIS",color:"#B71C1C",bg:"#FFEBEE",border:"#F44336"};
  }();

  el.innerHTML=`
<div id="summaryPrintArea" style="font-family:Arial,Helvetica,sans-serif;color:#1E293B;width:100%;background:#fff">

<!-- ═══ KOVER LAPORAN ═══ -->
<div style="background:linear-gradient(135deg,#0D2137 0%,#0F3460 60%,#16537E 100%);padding:42px 48px 36px;position:relative;overflow:hidden;page-break-after:avoid">
  <div style="position:absolute;right:-60px;top:-60px;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.04)"></div>
  <div style="position:absolute;right:60px;bottom:-80px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.03)"></div>
  <div style="position:absolute;top:0;left:0;width:6px;height:100%;background:linear-gradient(180deg,#3B82F6,#06B6D4)"></div>
  <div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:20px">
    <div style="flex:1;min-width:300px">
      <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px">Laporan Komprehensif Industrial Hygiene</div>
      <div style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;color:#fff;line-height:1.1;margin-bottom:4px">Monitoring, Assessment</div>
      <div style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;color:#60B4F4;line-height:1.1;margin-bottom:18px">&amp; Hazard Management</div>
      <div style="font-family:Arial,sans-serif;font-size:12.5px;color:rgba(255,255,255,.7);line-height:1.8">
        <b style="color:#fff">PT Pertamina Patra Niaga</b> &mdash; Satuan Kerja Regional III<br>
        Divisi Industrial Hygiene &amp; Occupational Health<br>
        Armada: <b style="color:#fff">${fleetLabel}</b> &nbsp;&bull;&nbsp; Periode: <b style="color:#fff">${bulan}</b>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;min-width:190px">
      <div style="background:rgba(255,255,255,.1);backdrop-filter:blur(4px);border-radius:12px;padding:14px 18px;text-align:center;border:1px solid rgba(255,255,255,.15)">
        <div style="font-family:Arial,sans-serif;font-size:34px;font-weight:700;color:#fff;line-height:1">${d.hra.coverage}%</div>
        <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.6);margin-top:3px;text-transform:uppercase;letter-spacing:1px">Coverage HRA</div>
      </div>
      <div style="background:${statusKeseluruhan.bg};border:1px solid ${statusKeseluruhan.border};border-radius:10px;padding:10px 18px;text-align:center">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${statusKeseluruhan.color};text-transform:uppercase;letter-spacing:1px">Status Keseluruhan</div>
        <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:${statusKeseluruhan.color};margin-top:2px">${statusKeseluruhan.label}</div>
      </div>
    </div>
  </div>
  <div style="position:relative;margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12)">
    <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Kerangka Regulasi &amp; Standar</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap">
      ${["Permenaker No.05/2018","ACGIH TLV &amp; BEI 2024","ILO MLC 2006","IMO MSC/Circ.1351","IARC Monograph","ISO 45001:2018","OSHA 29 CFR 1910"].map(function(s){return'<span style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);padding:4px 11px;border-radius:20px;font-family:Arial,sans-serif;font-size:10px;font-weight:600;border:1px solid rgba(255,255,255,.15)">'+s+'</span>';}).join("")}
    </div>
  </div>
</div>

<!-- ═══ RINGKASAN EKSEKUTIF ═══ -->
<div style="background:#F0F4F8;padding:20px 48px;border-bottom:3px solid #E2E8F0">
  <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px">Ringkasan Eksekutif</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
    ${[
      {judul:"Hazard Recognition &amp; Assessment",sub:"Pelaksanaan HRA Armada",pct:parseFloat(d.hra.coverage),icon:"&#x1F52C;",detail:d.hra.done+"/"+d.hra.total+" kapal"},
      {judul:"Drugs &amp; Alcohol Testing",sub:"Tingkat Kepatuhan Awak",pct:d.dat.crew>0?(1-d.dat.positif/d.dat.crew)*100:100,icon:"&#x1F9EA;",detail:d.dat.positif+" positif dari "+fmtNum(d.dat.crew)+" crew"},
      {judul:"5 Hazard Utama",sub:"Kepatuhan Nilai Ambang Batas",pct:hazardPct,icon:"&#x26A0;",detail:d.hazard.melebihi+" parameter melebihi NAB"}
    ].map(function(c){
      var tl=trafficLight(c.pct);
      return'<div style="background:'+tl.bg+';border:1.5px solid '+tl.color+'40;border-left:4px solid '+tl.color+';border-radius:10px;padding:14px 16px">'
        +'<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:'+tl.color+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">'+tl.label+'</div>'
        +'<div style="font-family:Arial,sans-serif;font-size:12.5px;font-weight:700;color:#1E293B;margin-bottom:2px">'+c.judul+'</div>'
        +'<div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-bottom:10px">'+c.sub+'</div>'
        +'<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:700;color:'+tl.color+'">'+Math.round(c.pct)+'%</div>'
        +'<div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;margin-top:4px">'+c.detail+'</div>'
        +'</div>';
    }).join("")}
  </div>
</div>

<div style="padding:28px 48px">

<!-- ═══ BAGIAN I: HRA ═══ -->
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#1565C0;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">I.&nbsp; Hazard Recognition &amp; Assessment (HRA)</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Analisis komprehensif pelaksanaan identifikasi, penilaian, dan pengendalian bahaya di seluruh unit armada</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    ${[
      {label:"Kapal Telah Dilaksanakan HRA",val:d.hra.done,unit:"unit armada",color:"#1565C0",bg:"#EBF5FF"},
      {label:"Kapal Belum Melaksanakan HRA",val:d.hra.total-d.hra.done,unit:"unit",color:(d.hra.total-d.hra.done>0?"#C62828":"#2E7D32"),bg:(d.hra.total-d.hra.done>0?"#FFEBEE":"#E8F5E9")},
      {label:"Coverage Pelaksanaan HRA",val:d.hra.coverage+"%",unit:"dari total armada",color:"#0F2A4A",bg:"#F0F4F8"},
      {label:"Estimasi Anggaran Program",val:formatRupiah(d.hra.budget),unit:"total alokasi",color:"#6A1B9A",bg:"#F3E5F5"}
    ].map(function(k){return'<div style="background:'+k.bg+';border-radius:10px;padding:12px 14px;border-left:3px solid '+k.color+'">'+
      '<div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;line-height:1.4;margin-bottom:6px">'+k.label+'</div>'+
      '<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:'+k.color+'">'+k.val+'</div>'+
      '<div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;margin-top:2px">'+k.unit+'</div></div>';}).join("")}
  </div>
  <div style="background:#EBF5FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 16px;font-family:Arial,sans-serif;font-size:12px;color:#1E3A5F;line-height:1.75">
    <b style="color:#1565C0">Analisis:</b> ${anaHRA}
  </div>
</div>

<!-- ═══ BAGIAN II: DAT ═══ -->
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#2E7D32;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">II.&nbsp; Pengujian Narkotika, Psikotropika &amp; Stimulan (Drugs &amp; Alcohol Test)</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Evaluasi pelaksanaan program pemeriksaan zat adiktif pada awak kapal sesuai ketentuan regulasi maritim internasional</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    ${[
      {label:"Jumlah Kapal Terperiksa",val:d.dat.kapal,unit:"unit armada",color:"#2E7D32",bg:"#E8F5E9"},
      {label:"Total Awak Kapal Diperiksa",val:fmtNum(d.dat.crew),unit:"crew",color:"#0F2A4A",bg:"#F0F4F8"},
      {label:"Awak Hasil Reaktif",val:d.dat.positif,unit:d.dat.positif>0?"perlu tindak lanjut":"tidak ada temuan",color:(d.dat.positif>0?"#C62828":"#2E7D32"),bg:(d.dat.positif>0?"#FFEBEE":"#E8F5E9")},
      {label:"Tingkat Prevalensi",val:d.dat.rate+"%",unit:"dari total terperiksa",color:(parseFloat(d.dat.rate)>0?"#E65100":"#2E7D32"),bg:(parseFloat(d.dat.rate)>0?"#FFF3E0":"#E8F5E9")}
    ].map(function(k){return'<div style="background:'+k.bg+';border-radius:10px;padding:12px 14px;border-left:3px solid '+k.color+'">'+
      '<div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;line-height:1.4;margin-bottom:6px">'+k.label+'</div>'+
      '<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:'+k.color+'">'+k.val+'</div>'+
      '<div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;margin-top:2px">'+k.unit+'</div></div>';}).join("")}
  </div>
  <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:12px 16px;font-family:Arial,sans-serif;font-size:12px;color:#1B4332;line-height:1.75">
    <b style="color:#2E7D32">Analisis:</b> ${anaDAT}
  </div>
</div>

<!-- ═══ BAGIAN III: 5 HAZARD ═══ -->
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#E65100;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">III.&nbsp; Pemantauan 5 Hazard Utama (Permenaker No.05/2018)</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Hasil pengukuran faktor fisika, kimia, biologi, ergonomi, dan psikososial dibandingkan terhadap Nilai Ambang Batas (NAB) yang berlaku</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px">
    <div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif">
        <thead>
          <tr style="background:#0F2A4A">
            <th style="padding:9px 14px;text-align:left;font-size:11px;font-weight:700;color:#fff;border-radius:0">Faktor Hazard</th>
            <th style="padding:9px 14px;text-align:center;font-size:11px;font-weight:700;color:#fff">Total Ukur</th>
            <th style="padding:9px 14px;text-align:center;font-size:11px;font-weight:700;color:#fff">Melebihi NAB</th>
            <th style="padding:9px 14px;text-align:left;font-size:11px;font-weight:700;color:#fff">Proporsi</th>
          </tr>
        </thead>
        <tbody>
          ${hazardTableRows()}
          <tr style="background:#F0F4F8">
            <td style="padding:9px 14px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1E293B">Total Keseluruhan</td>
            <td style="padding:9px 14px;text-align:center;font-family:Arial,sans-serif;font-size:12px;font-weight:700">${d.hazard.total}</td>
            <td style="padding:9px 14px;text-align:center;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${d.hazard.melebihi>0?"#C62828":"#2E7D32"}">${d.hazard.melebihi}</td>
            <td style="padding:9px 14px;font-family:Arial,sans-serif;font-size:11px;color:#94A3B8">${d.hazard.total>0?Math.round(d.hazard.melebihi/d.hazard.total*100):0}% dari total</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="background:#FFEBEE;border-radius:10px;padding:14px 16px;flex:1">
        <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#C62828;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Parameter Melebihi NAB</div>
        <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#C62828">${d.hazard.melebihi}</div>
        <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-top:3px">dari ${d.hazard.total} total pengukuran</div>
      </div>
      <div style="background:#E8F5E9;border-radius:10px;padding:14px 16px;flex:1">
        <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#2E7D32;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Parameter dalam Batas</div>
        <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:#2E7D32">${d.hazard.total-d.hazard.melebihi}</div>
        <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-top:3px">memenuhi persyaratan NAB</div>
      </div>
      ${d.bio.total>0?'<div style="background:#F3E5F5;border-radius:10px;padding:14px 16px;flex:1"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#7B1FA2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Biomarker Benzene</div><div style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;color:'+(d.bio.melebihi>0?"#C62828":"#7B1FA2")+'">'+d.bio.melebihi+'</div><div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-top:3px">melebihi BEI dari '+d.bio.total+' sampel</div></div>':""}
    </div>
  </div>
  <div style="background:#FFF3E0;border:1px solid #FFCC80;border-radius:10px;padding:12px 16px;font-family:Arial,sans-serif;font-size:12px;color:#5D3A00;line-height:1.75">
    <b style="color:#E65100">Analisis:</b> ${anaHazard}
  </div>
</div>

<!-- ═══ BAGIAN IV: BIOMONITORING ═══ -->
${d.bio.total>0?`
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#7B1FA2;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">IV.&nbsp; Biomonitoring Benzene (Faktor Kimia)</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Pemantauan biologis dan personal air sampling paparan benzene sesuai ACGIH BEI 2024 &amp; Permenaker No.05/2018</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
    <div style="background:#F3E5F5;border-radius:10px;padding:12px 14px;border-left:3px solid #7B1FA2">
      <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-bottom:6px">Total Sampel Biomarker</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#7B1FA2">${d.bio.total}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8">sampel urin/udara</div>
    </div>
    <div style="background:${d.bio.melebihi>0?"#FFEBEE":"#E8F5E9"};border-radius:10px;padding:12px 14px;border-left:3px solid ${d.bio.melebihi>0?"#C62828":"#2E7D32"}">
      <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-bottom:6px">Melebihi BEI ACGIH 2024</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${d.bio.melebihi>0?"#C62828":"#2E7D32"}">${d.bio.melebihi}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8">BEI: 25 µg/g kreat. | NAB: 0.5 ppm</div>
    </div>
    <div style="background:#E8F5E9;border-radius:10px;padding:12px 14px;border-left:3px solid #2E7D32">
      <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-bottom:6px">Dalam Batas Normal</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#2E7D32">${d.bio.total-d.bio.melebihi}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8">IARC Grup 1 — pantau berkala</div>
    </div>
  </div>
  <div style="background:#F3E5F5;border:1px solid #CE93D8;border-radius:10px;padding:12px 16px;font-family:Arial,sans-serif;font-size:12px;color:#3E0054;line-height:1.75">
    <b style="color:#7B1FA2">Analisis:</b> ${anaBio}
  </div>
</div>`:""}

<!-- ═══ BAGIAN V: PEST CONTROL ═══ -->
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#6A1B9A;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">${d.bio.total>0?"V.":"IV."}&nbsp; Pengendalian Vektor &amp; Hama (Pest &amp; Rodent Control)</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Rekapitulasi pelaksanaan program sanitasi kapal dan pengendalian vektor penyakit sesuai IHR 2005 WHO</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
    <div style="background:#F3E5F5;border-radius:10px;padding:12px 14px;border-left:3px solid #6A1B9A">
      <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-bottom:6px">Total Pelaksanaan Pest Control</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#6A1B9A">${d.pest.count}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8">kegiatan terlaksana</div>
    </div>
    <div style="background:#EDE7F6;border-radius:10px;padding:12px 14px;border-left:3px solid #4527A0">
      <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;margin-bottom:6px">Estimasi Anggaran Program</div>
      <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#4527A0">${formatRupiah(d.pest.biaya)}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8">total anggaran pest control</div>
    </div>
  </div>
  <div style="background:#EDE7F6;border:1px solid #B39DDB;border-radius:10px;padding:12px 16px;font-family:Arial,sans-serif;font-size:12px;color:#1A0036;line-height:1.75">
    <b style="color:#6A1B9A">Analisis:</b> ${anaPest}
  </div>
</div>

<!-- ═══ REKOMENDASI STRATEGIS ═══ -->
<div style="margin-bottom:28px;page-break-inside:avoid">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:4px;height:32px;background:#0F2A4A;border-radius:2px;flex-shrink:0"></div>
    <div>
      <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1E293B">${d.bio.total>0?"VI.":"V."}&nbsp; Rekomendasi Strategis &amp; Program Tindak Lanjut</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;margin-top:2px">Rekomendasi berbasis hierarki pengendalian risiko ISO 45001:2018 untuk manajemen senior dan direksi</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
    ${[
      {prio:"Segera (0–30 Hari)",color:"#C62828",bg:"#FFEBEE",border:"#EF9A9A",items:[
        d.hazard.melebihi>0?"Implementasi pengendalian teknis segera untuk "+d.hazard.melebihi+" parameter hazard yang melampaui NAB":"Pertahankan program pengendalian hazard yang telah efektif",
        d.hra.total-d.hra.done>0?"Akselerasi pelaksanaan HRA pada "+(d.hra.total-d.hra.done)+" unit armada yang belum terlaksana":"Verifikasi dan dokumentasi hasil HRA seluruh armada",
        d.dat.positif>0?"Pelaksanaan protokol medis dan administratif untuk "+d.dat.positif+" awak dengan hasil DAT reaktif":"Pertahankan konsistensi program DAT dengan hasil nol positif"
      ]},
      {prio:"Jangka Pendek (1–3 Bulan)",color:"#E65100",bg:"#FFF3E0",border:"#FFCC80",items:[
        "Pemasangan rekayasa teknik: sistem ventilasi, enclosure, dan monitoring kontinu pada area hazard",
        "Revisi Job Safety Analysis (JSA) untuk seluruh pekerjaan berisiko tinggi di area terdampak temuan",
        "Pelaksanaan medical surveillance berkala bagi ABK dengan riwayat paparan kronik teridentifikasi"
      ]},
      {prio:"Jangka Panjang (3–12 Bulan)",color:"#1565C0",bg:"#EBF5FF",border:"#90CAF9",items:[
        "Review komprehensif program IH tahunan dan penetapan target coverage HRA 100% armada",
        "Integrasi seluruh temuan IH ke dalam Ship Safety Management System (SMS) dan ISM Code",
        "Penyusunan laporan IH tahunan untuk audit eksternal, biro klasifikasi, dan otoritas regulator"
      ]}
    ].map(function(s){return'<div style="background:'+s.bg+';border:1px solid '+s.border+';border-top:3px solid '+s.color+';border-radius:10px;padding:14px 16px">'+
      '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:'+s.color+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">'+s.prio+'</div>'+
      s.items.map(function(it){return'<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:8px"><div style="width:5px;height:5px;background:'+s.color+';border-radius:50%;flex-shrink:0;margin-top:5px"></div><div style="font-family:Arial,sans-serif;font-size:11.5px;color:#334155;line-height:1.6">'+it+'</div></div>';}).join("")+
      '</div>';}).join("")}
  </div>
</div>

</div>

<!-- ═══ FOOTER ═══ -->
<div style="background:#F0F4F8;border-top:2px solid #E2E8F0;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
  <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#94A3B8;line-height:1.7">
    Laporan ini dihasilkan secara otomatis oleh <b style="color:#64748B">IH Dashboard v5.0</b> &mdash; PT Pertamina Patra Niaga Satuan Kerja Regional III<br>
    <span style="font-size:10px">Ref: Permenaker 05/2018 &bull; ACGIH TLV &amp; BEI 2024 &bull; ILO MLC 2006 &bull; IMO MSC/Circ.1351 &bull; ISO 45001:2018 &bull; IARC Monograph</span>
  </div>
  <div style="text-align:right">
    <div style="font-family:Arial,sans-serif;font-size:10.5px;color:#64748B;font-weight:700">${tgl}</div>
    <div style="font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;margin-top:2px">Dokumen Konfidensial &mdash; Hanya untuk Penggunaan Internal</div>
  </div>
</div>

</div>`;
}
async function exportSummaryPDF(){
  var btn=document.getElementById("btnSummaryPDF");
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Membuat PDF...';}
  /* Guard: pastikan library sudah loaded (defer) */
  if(typeof html2canvas==="undefined"||typeof window.jspdf==="undefined"){
    showToast("Library PDF sedang dimuat, coba lagi dalam beberapa detik.","warning");
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}
    return;
  }
  try{
    var area=document.getElementById("summaryPrintArea");
    if(!area){showToast("Render halaman summary dulu sebelum export.","warning");if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}return;}
    var now=new Date();
    var fleet=(document.getElementById("summary-filter-fleet")||{}).value||"Seluruh Armada";

    /* Paksa lebar konten penuh A4 saat di-render */
    var origMaxW=area.style.maxWidth;
    var origMargin=area.style.margin;
    area.style.maxWidth="none";
    area.style.margin="0";
    area.style.width="794px"; /* A4 lebar dalam px pada 96dpi */

    /* Tunggu reflow */
    await new Promise(function(resolve){setTimeout(resolve,200);});

    var canvas=await html2canvas(area,{
      scale:2,
      useCORS:true,
      logging:false,
      backgroundColor:"#ffffff",
      width:area.offsetWidth,
      height:area.scrollHeight,
      windowWidth:area.offsetWidth,
      scrollX:0,
      scrollY:0
    });

    /* Kembalikan style asli */
    area.style.maxWidth=origMaxW;
    area.style.margin=origMargin;
    area.style.width="";

    var {jsPDF}=window.jspdf;
    var pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
    var pageW=pdf.internal.pageSize.getWidth();   /* 595.28 pt */
    var pageH=pdf.internal.pageSize.getHeight();  /* 841.89 pt */
    var margin=18; /* pt — ~6.3mm */

    /* Skala gambar agar lebar = pageW - 2*margin */
    var contentW=pageW-margin*2;
    var scale=contentW/canvas.width;
    var imgTotalH=canvas.height*scale;

    /* Tinggi konten per halaman (tanpa margin atas bawah) */
    var pageContentH=pageH-margin*2;

    var pageNum=0;
    var drawnH=0;

    while(drawnH<imgTotalH){
      if(pageNum>0)pdf.addPage();

      /* Berapa tinggi gambar yang muat di halaman ini */
      var thisH=Math.min(pageContentH,imgTotalH-drawnH);

      /* Baris piksel di canvas yang sesuai */
      var srcY_px=Math.round(drawnH/scale);
      var srcH_px=Math.round(thisH/scale);

      /* Buat canvas potongan */
      var slice=document.createElement("canvas");
      slice.width=canvas.width;
      slice.height=srcH_px;
      var ctx=slice.getContext("2d");
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,slice.width,slice.height);
      ctx.drawImage(canvas,0,srcY_px,canvas.width,srcH_px,0,0,canvas.width,srcH_px);

      /* Tambahkan ke PDF — tepat di margin */
      pdf.addImage(slice.toDataURL("image/jpeg",0.97),"JPEG",margin,margin,contentW,thisH);

      drawnH+=thisH;
      pageNum++;
    }

    var fname="IH_Summary_"+fleet.replace(/\s+/g,"_")+"_"+now.toISOString().slice(0,10)+".pdf";
    pdf.save(fname);
    showToast("PDF berhasil didownload!","success");
  }catch(err){
    showToast("Gagal export PDF: "+err.message,"error");
    console.error(err);
  }
  if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT PPT — BIOMONITORING BENZENE
   Khusus Biomarker (Urin) & Personal Air Sampling (Udara)
   Berdasarkan filter aktif di halaman Faktor Kimia
═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════
   EXPORT PPT — BIOMONITORING BENZENE (v4 — no PowerPoint repair)
   Fix 1: colW harus sum = w (sebelumnya mismatch 1 inch → korup)
   Fix 2: ellipse y tidak boleh negatif (sebelumnya y:-1.5)
   Fix 3: ellipse line:{type:"none"} bukan line:{color:X}
   Fix 4: semua warna 6-digit hex
═══════════════════════════════════════════════════════════ */
function exportBiomarkerPPT(){
  var btn=document.getElementById("btnBioPPT");
  function resetBtn(){
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-powerpoint"></i> Download PPT';}
  }
  if(typeof PptxGenJS==="undefined"){
    showToast("Library PPT sedang dimuat, coba lagi dalam beberapa detik.","warning");
    resetBtn();return;
  }
  try{
    var tipeF=((document.getElementById("bio-filter-tipe")||{}).value)||"all";
    var tahunF=((document.getElementById("bio-filter-tahun")||{}).value)||"";
    var kapalF=((document.getElementById("bio-filter-kapal")||{}).value)||"";
    var bioData=(rawBiomarker||[]).filter(function(r){
      if(tahunF&&String(r.tahun||"")!==tahunF)return false;
      if(kapalF&&String(r.kapal||"")!==kapalF)return false;
      return true;
    });
    var perData=(rawPersonal||[]).filter(function(r){
      if(tahunF&&String(r.tahun||"")!==tahunF)return false;
      if(kapalF&&String(r.kapal||"")!==kapalF)return false;
      return true;
    });
    if(tipeF==="biomarker")perData=[];
    if(tipeF==="personal")bioData=[];
    if(!bioData.length&&!perData.length){
      showToast("Tidak ada data biomonitoring. Pastikan data sudah dimuat dari server.","warning");
      resetBtn();return;
    }
    if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Membuat PPT...';}
    showToast("Membuat PPT Biomonitoring Benzene...","info");

    /* Statistik */
    var bioMel=bioData.filter(function(r){return Number(r.kreatinin||0)>Number(r.rujukan||25);}).length;
    var perMel=perData.filter(function(r){return Number(r.hasil||0)>Number(r.nab||0.5);}).length;
    var totalAll=bioData.length+perData.length;
    var totalMel=bioMel+perMel;
    var kapalSet=new Set([].concat(bioData.map(function(r){return r.kapal||"";}),perData.map(function(r){return r.kapal||"";})).filter(Boolean));
    var bioAvg=bioData.length?+(bioData.reduce(function(s,r){return s+(Number(r.kreatinin)||0);},0)/bioData.length).toFixed(1):0;
    var bioMax=bioData.length?Math.max.apply(null,bioData.map(function(r){return Number(r.kreatinin)||0;})):0;
    var bioBEI=bioData.length?Number(bioData[0].rujukan||25):25;
    var perAvg=perData.length?+(perData.reduce(function(s,r){return s+(Number(r.hasil)||0);},0)/perData.length).toFixed(3):0;
    var perMax=perData.length?Math.max.apply(null,perData.map(function(r){return Number(r.hasil)||0;})):0;
    var perNAB=perData.length?Number(perData[0].nab||0.5):0.5;
    var now=new Date();
    var tgl=now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
    var filterLabel=(tahunF?"Tahun "+tahunF:"Semua Tahun")+(kapalF?" | "+kapalF:"");

    /* Warna — HANYA 6-digit hex */
    var MC="0F2A4A",PU="7B1FA2",BL="1565C0";
    var WH="FFFFFF",GR="F4F6FA",TX="1E293B",MU="64748B";
    var RED="C62828",GRN="2E7D32",NAV="1C3A5A";

    var pres=new PptxGenJS();
    pres.layout="LAYOUT_WIDE";
    pres.author="IH Dashboard — Pertamina Patra Niaga III";
    pres.title="Biomonitoring Benzene";

    /* colW HARUS jumlahnya = w tabel persis */
    /* Biomarker 8 col, w=12.9: sum=12.9 */
    var bioColW=[0.4,0.7,2.6,0.9,3.2,1.8,0.8,2.5];
    /* Personal 9 col, w=12.9: sum=12.9 */
    var perColW=[0.35,0.7,2.1,0.85,2.4,2.1,1.05,0.75,2.6];

    function mkHead(cols){
      return cols.map(function(c){
        return{text:c,options:{bold:true,color:WH,fill:{color:MC}}};
      });
    }
    function addFtr(sl,ref){
      sl.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:GR}});
      sl.addText(ref,{x:0.2,y:7.18,w:9.5,h:0.28,fontSize:7.5,color:MU,fontFace:"Calibri"});
      sl.addText("IH Dashboard | Pertamina Patra Niaga III",{x:9.8,y:7.18,w:3.3,h:0.28,fontSize:7.5,color:MU,align:"right",fontFace:"Calibri"});
    }
    function addHdr(sl,accent,sup,main){
      sl.background={color:WH};
      sl.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.05,fill:{color:MC}});
      sl.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:accent}});
      sl.addText(sup,{x:0.25,y:0.07,w:12.5,h:0.38,fontSize:9,bold:true,color:"CADCFC",fontFace:"Calibri"});
      sl.addText(main,{x:0.25,y:0.52,w:12.5,h:0.42,fontSize:13,bold:true,color:WH,fontFace:"Calibri"});
    }

    /* ══ SLIDE 1 — COVER ══ */
    var s1=pres.addSlide();
    s1.background={color:MC};
    s1.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.1,h:7.5,fill:{color:PU}});
    /* FIX: ellipse y>=0, line:{type:"none"} bukan line:{color:X} */
    s1.addShape(pres.ShapeType.ellipse,{x:9.5,y:0,w:4.5,h:4.5,fill:{color:NAV},line:{type:"none"}});
    s1.addShape(pres.ShapeType.ellipse,{x:10.8,y:4.0,w:3.2,h:3.2,fill:{color:"162E42"},line:{type:"none"}});
    s1.addText("LAPORAN BIOMONITORING BENZENE",{x:0.4,y:0.8,w:9,h:0.65,fontSize:24,bold:true,color:WH,fontFace:"Calibri",charSpacing:2});
    s1.addText("Faktor Kimia  |  Industrial Hygiene Maritime",{x:0.4,y:1.52,w:9,h:0.42,fontSize:15,bold:true,color:"AD7CE0",fontFace:"Calibri"});
    s1.addShape(pres.ShapeType.rect,{x:0.4,y:2.08,w:4,h:0.05,fill:{color:PU}});
    s1.addText("Filter: "+filterLabel+"    |    "+tgl,{x:0.4,y:2.28,w:9,h:0.38,fontSize:10.5,color:"CADCFC",fontFace:"Calibri"});

    /* KPI boxes */
    var boxes=[
      {label:"Total Sampel",val:String(totalAll),col:PU},
      {label:"Melebihi BEI/NAB",val:String(totalMel),col:totalMel>0?RED:GRN},
      {label:"Normal",val:String(totalAll-totalMel),col:GRN},
      {label:"Kapal",val:String(kapalSet.size),col:BL}
    ];
    boxes.forEach(function(b,i){
      var bx=0.4+i*3.12;
      s1.addShape(pres.ShapeType.roundRect,{x:bx,y:3.05,w:2.95,h:1.65,fill:{color:NAV},rectRadius:0.1});
      s1.addText(b.val,{x:bx,y:3.1,w:2.95,h:0.9,fontSize:38,bold:true,color:b.col,align:"center",fontFace:"Calibri"});
      s1.addText(b.label,{x:bx,y:4.02,w:2.95,h:0.55,fontSize:10,color:"CADCFC",align:"center",fontFace:"Calibri"});
    });

    /* Referensi standar */
    var refs=["ACGIH BEI 2024","Permenaker 05/2018","NIOSH REL 0.1 ppm","IARC Grup 1","ILO MLC 2006","OSHA 1910.1028"];
    s1.addText("Referensi Standar:",{x:0.4,y:4.95,w:9,h:0.28,fontSize:9.5,bold:true,color:"CADCFC",fontFace:"Calibri"});
    refs.forEach(function(r,i){
      s1.addShape(pres.ShapeType.roundRect,{x:0.4+i*2.17,y:5.3,w:2.05,h:0.42,fill:{color:"1C3060"},rectRadius:0.06});
      s1.addText(r,{x:0.44+i*2.17,y:5.33,w:1.97,h:0.36,fontSize:8.5,color:"CADCFC",align:"center",fontFace:"Calibri",valign:"middle"});
    });
    s1.addText("PT Pertamina Patra Niaga Regional III  |  IH Dashboard v5.0  |  "+tgl,{
      x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"
    });

    /* ══ SLIDE 2 — BIOMARKER URIN ══ */
    if(bioData.length>0){
      var s2=pres.addSlide();
      addHdr(s2,PU,"BIOMONITORING BENZENE — FAKTOR KIMIA",
        "A. Data Biomarker Benzene (Pemantauan Biologis — Urin/Kreatinin)");
      var kpiB=[
        {label:"Total Sampel",val:String(bioData.length),col:PU},
        {label:"Melebihi BEI ("+bioBEI+" ug/g)",val:String(bioMel),col:bioMel>0?RED:GRN},
        {label:"Rata-rata",val:bioAvg+" ug/g",col:PU},
        {label:"Nilai Tertinggi",val:bioMax+" ug/g",col:bioMax>bioBEI?RED:"E65100"}
      ];
      kpiB.forEach(function(k,i){
        var bx=0.2+i*3.22;
        s2.addShape(pres.ShapeType.roundRect,{x:bx,y:1.15,w:3.05,h:1.08,fill:{color:GR},line:{color:k.col,width:1.5},rectRadius:0.08});
        s2.addText(k.val,{x:bx,y:1.18,w:3.05,h:0.55,fontSize:22,bold:true,color:k.col,align:"center",fontFace:"Calibri"});
        s2.addText(k.label,{x:bx,y:1.74,w:3.05,h:0.44,fontSize:9,color:MU,align:"center",fontFace:"Calibri",wrap:true});
      });
      s2.addShape(pres.ShapeType.roundRect,{x:0.2,y:2.36,w:12.9,h:0.42,fill:{color:"F3E5F5"},rectRadius:0.06});
      s2.addText("BEI ACGIH 2024: Muconic Acid 25 ug/g kreat.  |  Permenaker 05/2018: NAB benzene 0.5 ppm  |  IARC: Karsinogen Grup 1",{
        x:0.3,y:2.38,w:12.7,h:0.38,fontSize:9,color:PU,fontFace:"Calibri",valign:"middle"
      });
      s2.addText("Detail Data Biomarker Benzene",{x:0.2,y:2.92,w:12.9,h:0.28,fontSize:10,bold:true,color:PU,fontFace:"Calibri"});
      var bRows=[mkHead(["No","Tahun","Nama Kapal","Fleet","Nama Pekerja","Kreatinin (ug/g)","BEI","Status"])];
      bioData.forEach(function(r,i){
        var over=Number(r.kreatinin||0)>Number(r.rujukan||25);
        bRows.push([
          {text:String(i+1)},
          {text:String(r.tahun||"-")},
          {text:String(r.kapal||"-")},
          {text:String(r.fleet||"-")},
          {text:String(r.pekerja||"-")},
          {text:String(r.kreatinin||0),options:{bold:true,color:over?RED:GRN}},
          {text:String(r.rujukan||25)},
          {text:over?"MELEBIHI BEI":"Normal",options:{bold:true,color:over?RED:GRN}}
        ]);
      });
      /* FIX: colW sum = w = 12.9 */
      s2.addTable(bRows,{
        x:0.2,y:3.24,w:12.9,
        fontSize:9,fontFace:"Calibri",color:TX,
        border:{pt:0.5,color:"E2E8F0"},rowH:0.32,
        colW:bioColW
      });
      addFtr(s2,"Ref: ACGIH BEI 2024 | Permenaker No.05/2018 | IARC Monograph Vol.120 | ILO MLC 2006");
    }

    /* ══ SLIDE 3 — PERSONAL AIR SAMPLING ══ */
    if(perData.length>0){
      var s3=pres.addSlide();
      addHdr(s3,BL,"BIOMONITORING BENZENE — FAKTOR KIMIA",
        "B. Benzene Personal Air Sampling (Paparan Udara Tempat Kerja — ppm)");
      var kpiP=[
        {label:"Total Sampel",val:String(perData.length),col:BL},
        {label:"Melebihi NAB ("+perNAB+" ppm)",val:String(perMel),col:perMel>0?RED:GRN},
        {label:"Rata-rata Paparan",val:perAvg+" ppm",col:BL},
        {label:"Nilai Tertinggi",val:perMax+" ppm",col:perMax>perNAB?RED:"E65100"}
      ];
      kpiP.forEach(function(k,i){
        var bx=0.2+i*3.22;
        s3.addShape(pres.ShapeType.roundRect,{x:bx,y:1.15,w:3.05,h:1.08,fill:{color:GR},line:{color:k.col,width:1.5},rectRadius:0.08});
        s3.addText(k.val,{x:bx,y:1.18,w:3.05,h:0.55,fontSize:22,bold:true,color:k.col,align:"center",fontFace:"Calibri"});
        s3.addText(k.label,{x:bx,y:1.74,w:3.05,h:0.44,fontSize:9,color:MU,align:"center",fontFace:"Calibri",wrap:true});
      });
      s3.addShape(pres.ShapeType.roundRect,{x:0.2,y:2.36,w:12.9,h:0.42,fill:{color:"E3F2FD"},rectRadius:0.06});
      s3.addText("Permenaker 05/2018 & ACGIH TLV-TWA 2024: 0.5 ppm  |  NIOSH REL: 0.1 ppm  |  OSHA PEL: 1 ppm  |  IARC: Karsinogen Grup 1",{
        x:0.3,y:2.38,w:12.7,h:0.38,fontSize:9,color:BL,fontFace:"Calibri",valign:"middle"
      });
      s3.addText("Detail Data Personal Air Sampling Benzene",{x:0.2,y:2.92,w:12.9,h:0.28,fontSize:10,bold:true,color:BL,fontFace:"Calibri"});
      var pRows=[mkHead(["No","Tahun","Nama Kapal","Fleet","Nama Pekerja","Lokasi","Hasil (ppm)","NAB","Status"])];
      perData.forEach(function(r,i){
        var over=Number(r.hasil||0)>Number(r.nab||0.5);
        pRows.push([
          {text:String(i+1)},
          {text:String(r.tahun||"-")},
          {text:String(r.kapal||"-")},
          {text:String(r.fleet||"-")},
          {text:String(r.pekerja||"-")},
          {text:String(r.lokasi||"-")},
          {text:String(r.hasil||0),options:{bold:true,color:over?RED:GRN}},
          {text:String(r.nab||0.5)},
          {text:over?"MELEBIHI NAB":"Normal",options:{bold:true,color:over?RED:GRN}}
        ]);
      });
      /* FIX: colW sum = w = 12.9 */
      s3.addTable(pRows,{
        x:0.2,y:3.24,w:12.9,
        fontSize:8.5,fontFace:"Calibri",color:TX,
        border:{pt:0.5,color:"E2E8F0"},rowH:0.28,
        colW:perColW
      });
      addFtr(s3,"Ref: ACGIH TLV-TWA 2024 | Permenaker 05/2018 | NIOSH REL 0.1 ppm | OSHA 29 CFR 1910.1028");
    }

    /* ══ SLIDE 4 — 5 HIRARKI PENGENDALIAN ══ */
    var s4=pres.addSlide();
    addHdr(s4,PU,"BIOMONITORING BENZENE — FAKTOR KIMIA",
      "C. Strategi 5 Hirarki Pengendalian Paparan Benzene (Industri Maritim)");
    var hB=(HIRARKI_DB&&HIRARKI_DB.kimia&&HIRARKI_DB.kimia.benzene)||{
      E:"Eliminasi sumber benzene dari area kerja kapal. Ganti proses yang menghasilkan uap benzene jika memungkinkan secara teknis.",
      S:"Substitusi: gunakan bahan bakar ultra-low benzene (<0.1%). Ganti solvent benzene dengan cyclohexane, heptane, atau produk aqueous.",
      R:"Rekayasa Teknik: pasang vapor recovery system pada manifold cargo, LEV (Local Exhaust Ventilation) di pump room, enclosed loading system, gas detector permanen.",
      A:"Administratif: permit-to-work untuk confined space, biomonitoring urin 6 bulan sekali, rotasi kerja maks 2 jam tanpa break di area >0.1 ppm, JSA sebelum masuk cargo tank.",
      P:"APD: full-face respirator organic vapor cartridge (NIOSH-approved) untuk paparan >0.5 ppm, chemical-resistant gloves (nitrile), coverall anti-static, emergency SCBA."
    };
    var h5=[
      {no:"1",judul:"ELIMINASI",warna:"C62828",isi:hB.E},
      {no:"2",judul:"SUBSTITUSI",warna:"E65100",isi:hB.S},
      {no:"3",judul:"REKAYASA TEKNIK",warna:"1565C0",isi:hB.R},
      {no:"4",judul:"ADMINISTRATIF",warna:"2E7D32",isi:hB.A},
      {no:"5",judul:"APD",warna:"6A1B9A",isi:hB.P}
    ];
    h5.forEach(function(h,i){
      var by=1.18+i*1.18;
      s4.addShape(pres.ShapeType.roundRect,{x:0.15,y:by,w:2.55,h:1.06,fill:{color:h.warna},rectRadius:0.07});
      s4.addText(h.judul,{x:0.15,y:by+0.08,w:2.55,h:0.5,fontSize:12,bold:true,color:WH,align:"center",fontFace:"Calibri"});
      s4.addText("Tingkat "+h.no,{x:0.15,y:by+0.62,w:2.55,h:0.36,fontSize:9,color:WH,align:"center",fontFace:"Calibri"});
      s4.addShape(pres.ShapeType.rect,{x:2.75,y:by,w:10.35,h:1.06,fill:{color:i%2===0?WH:GR},line:{color:"E2E8F0",width:0.5}});
      s4.addText(h.isi,{x:2.85,y:by+0.05,w:10.15,h:0.96,fontSize:9.5,color:TX,fontFace:"Calibri",wrap:true,valign:"middle"});
    });
    addFtr(s4,"Ref: ACGIH TLV 2024 | Permenaker 05/2018 | NIOSH REL | IARC Group 1 | IMO MSC/Circ.1351 | OSHA 1910.1028");

    /* SAVE */
    var suffix=(tahunF?"_"+tahunF:"")+(kapalF?"_"+kapalF.replace(/\s+/g,""):"");
    var fname="IH_Biomonitoring_Benzene"+suffix+"_"+now.toISOString().slice(0,10)+".pptx";
    pres.writeFile({fileName:fname})
      .then(function(){showToast("PPT Biomonitoring Benzene berhasil didownload!","success");resetBtn();})
      .catch(function(err){showToast("Gagal simpan: "+err.message,"error");console.error(err);resetBtn();});

  }catch(err){
    showToast("Error: "+err.message,"error");
    console.error("exportBiomarkerPPT:",err.stack||err);
    resetBtn();
  }
}
