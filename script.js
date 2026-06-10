/* HSE Marine Dashboard — script.js v4.0 DRIVE INTEGRATION */
/* ✅ HRA, DAT, Pest tetap dari Google Sheets                         */
/* ✅ Pedoman PDF & Foto Dokumentasi → Google Drive (multi-device)    */
/* ✅ IndexedDB dihapus — data terpusat di GAS/Drive                  */

const API_URL = "https://script.google.com/macros/s/AKfycbzWbXOOt42CDMA5RIn_ALsgacY_iNILDz6nuEsjAT2vxRv0XW5mxlAWbSg2KSJIlmBeMg/exec";

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

/* ── OTP state ── */
var _otpUsername = "";
var _otpTimer = null;

async function doLogin(){
  const username=document.getElementById("loginUsername").value.trim();
  const password=document.getElementById("loginPassword").value;
  const btn=document.getElementById("btnLogin");
  const lockedUntil=getLoginLockedUntil();
  if(Date.now()<lockedUntil){const sisa=Math.ceil((lockedUntil-Date.now())/60000);showLoginError("Terlalu banyak percobaan. Tunggu "+sisa+" menit.");return;}
  if(!username||!password){showLoginError("Username dan password tidak boleh kosong.");return;}
  btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Memverifikasi...';btn.disabled=true;
  try{
    clearSession();
    const data=await gasPost({action:"login",username,password,deviceInfo:getDeviceInfo()});
    if(data.status==="ok"){
      loginAttempts=0;localStorage.removeItem("ppn_locked_until");
      saveSession(data,data.token);
      document.getElementById("loginError").style.display="none";
      document.getElementById("loginOverlay").classList.add("hidden");
      document.getElementById("sidebarUsername").textContent=getMappedName(data.displayName);
      applyRoleUI();loadData();
    }
    else if(data.status==="otp_required"){
      /* Tampilkan panel OTP */
      _otpUsername=username;
      showOTPPanel(data.message);
    }
    else if(data.status==="locked"){
      setLoginLockedUntil(Date.now()+15*60*1000);
      showLoginError(data.message||"Akun dikunci sementara.");shakeCard();
    }
    else{
      loginAttempts++;
      if(loginAttempts>=5){setLoginLockedUntil(Date.now()+15*60*1000);loginAttempts=0;}
      showLoginError(data.message||"Username atau password salah.");shakeCard();
    }
  }catch(err){showLoginError("Tidak dapat terhubung ke server: "+err.message);console.error("Login error:",err);}
  btn.innerHTML='<i class="fas fa-right-to-bracket"></i> Masuk';btn.disabled=false;
}

/* ── Panel OTP ── */
function showOTPPanel(msg){
  document.getElementById("panelLogin").style.display="none";
  document.getElementById("panelOTP").style.display="block";
  var hint=document.getElementById("otpPhoneHint");
  if(hint)hint.textContent=msg||"Masukkan kode 6 digit dari WhatsApp Anda";
  document.getElementById("otpError").style.display="none";
  /* Kosongkan kotak OTP */
  for(var i=0;i<6;i++){
    var box=document.getElementById("otp"+i);
    if(box){box.value="";box.classList.remove("filled");}
  }
  /* Fokus ke kotak pertama */
  setTimeout(function(){var b=document.getElementById("otp0");if(b)b.focus();},100);
  /* Mulai countdown 5 menit */
  startOTPCountdown(120);
}

function showLoginPanel(){
  document.getElementById("panelOTP").style.display="none";
  document.getElementById("panelLogin").style.display="block";
  if(_otpTimer){clearInterval(_otpTimer);_otpTimer=null;}
}

function startOTPCountdown(seconds){
  if(_otpTimer)clearInterval(_otpTimer);
  var remaining=seconds;
  var el=document.getElementById("otpCountdown");
  function tick(){
    if(!el)return;
    var m=Math.floor(remaining/60),s=remaining%60;
    el.textContent=m+":"+(s<10?"0":"")+s;
    if(remaining<=0){
      clearInterval(_otpTimer);
      el.textContent="Kedaluwarsa";
      el.style.color="var(--red)";
    }
    remaining--;
  }
  tick();
  _otpTimer=setInterval(tick,1000);
}

/* ── Navigasi antar kotak OTP ── */
function otpNext(el,nextIdx){
  el.value=el.value.replace(/[^0-9]/g,"");
  if(el.value){el.classList.add("filled");var next=document.getElementById("otp"+nextIdx);if(next)next.focus();}
  else el.classList.remove("filled");
}
function otpBack(e,el,prevIdx){
  if(e.key==="Backspace"&&!el.value&&prevIdx!==null){
    var prev=document.getElementById("otp"+prevIdx);
    if(prev){prev.value="";prev.classList.remove("filled");prev.focus();}
  }
}
function otpSubmitAuto(){
  var last=document.getElementById("otp5");
  if(last)last.classList.add("filled");
  var code="";
  for(var i=0;i<6;i++){var b=document.getElementById("otp"+i);if(b)code+=b.value;}
  if(code.length===6)setTimeout(doVerifyOTP,120);
}

/* ── Verifikasi OTP ── */
async function doVerifyOTP(){
  var code="";
  for(var i=0;i<6;i++){var b=document.getElementById("otp"+i);if(b)code+=b.value;}
  if(code.length<6){
    var errEl=document.getElementById("otpError");
    var errMsg=document.getElementById("otpErrorMsg");
    if(errMsg)errMsg.textContent="Masukkan 6 digit kode OTP.";
    if(errEl)errEl.style.display="flex";
    return;
  }
  var btn=document.getElementById("btnVerifyOTP");
  if(btn){btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Memverifikasi...';btn.disabled=true;}
  try{
    const data=await gasPost({action:"verifyOTP",username:_otpUsername,otp:code,deviceInfo:getDeviceInfo()});
    if(data.status==="ok"){
      if(_otpTimer)clearInterval(_otpTimer);
      saveSession(data,data.token);
      document.getElementById("loginOverlay").classList.add("hidden");
      document.getElementById("sidebarUsername").textContent=getMappedName(data.displayName);
      applyRoleUI();loadData();
    }else{
      var errEl=document.getElementById("otpError");
      var errMsg=document.getElementById("otpErrorMsg");
      if(errMsg)errMsg.textContent=data.message||"Kode OTP salah.";
      if(errEl)errEl.style.display="flex";
      /* Kocok kotak OTP */
      for(var i=0;i<6;i++){var b=document.getElementById("otp"+i);if(b){b.value="";b.classList.remove("filled");}}
      var b0=document.getElementById("otp0");if(b0)b0.focus();
    }
  }catch(err){
    var errEl=document.getElementById("otpError");
    var errMsg=document.getElementById("otpErrorMsg");
    if(errMsg)errMsg.textContent="Error: "+err.message;
    if(errEl)errEl.style.display="flex";
  }
  if(btn){btn.innerHTML='<i class="fas fa-shield-check"></i> Verifikasi OTP';btn.disabled=false;}
}

/* ── Kirim ulang OTP ── */
async function doResendOTP(){
  var btn=document.getElementById("btnResendOTP");
  if(btn){btn.textContent="Mengirim...";btn.disabled=true;}
  var pwEl=document.getElementById("loginPassword");
  var pw=pwEl?pwEl.value:"";
  try{
    const data=await gasPost({action:"login",username:_otpUsername,password:pw,deviceInfo:getDeviceInfo()});
    if(data.status==="otp_required"){
      startOTPCountdown(120);
      if(typeof showToast==="function")showToast("Kode OTP baru telah dikirim ke WhatsApp","success");
    }
  }catch(e){}
  setTimeout(function(){if(btn){btn.textContent="Kirim ulang kode OTP";btn.disabled=false;}},3000);
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
let rawAlkes=[],filteredAlkes=[];
let rawMCU=[],filteredMCU=[],mcuSummary={};
let filteredFisika=[],filteredKimia=[],filteredBiologi=[],filteredErgonomi=[],filteredPsikososial=[];
let hraBarChart,hraDonutChart,datBarChart,datDonutChart,pestBarChart,pestDonutChart,pestTemuanChart,pestBiayaChart;
let fisikaBarChart,fisikaDonutChart,kimiaBarChart,kimiaDonutChart,biologiBarChart,biologiDonutChart;
let ergonomiBarChart,ergonomiDonutChart,psikoBarChart,psikoDonutChart,psikoRadarChart;
let hraSortCol=-1,hraSortDir=1,datSortCol=-1,datSortDir=1,pestSortCol=-1,pestSortDir=1;
let fisikaSortCol=-1,fisikaSortDir=1,kimiaSortCol=-1,kimiaSortDir=1,biologiSortCol=-1,biologiSortDir=1;
let ergonomiSortCol=-1,ergonomiSortDir=1,psikoSortCol=-1,psikoSortDir=1;
let hraChartType="bar",datChartType="bar",pestChartType="bar";
let hraMonitorType="bar";var hraMonitorChart=null,_hraMonitorData=null;
let fisikaChartType="bar",kimiaChartType="bar",biologiChartType="bar",ergonomiChartType="bar",psikoChartType="bar";

/* INIT */
document.addEventListener("DOMContentLoaded",()=>{
  ["loginUsername","loginPassword"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});});
  checkAuth();setupNav();setupSidebar();initMobileNav();
  if(isSessionValid()){
    loadData();
    let _autoRefreshing=false;
    let _warnShown=false;
    window._autoRefreshEnabled=true;
    window._setAutoRefreshEnabled=function(on){window._autoRefreshEnabled=!!on;};
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
      if(!window._autoRefreshEnabled)return; /* dihormati toggle Pengaturan */
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
  document.querySelectorAll('.nav-item[data-menu="riskprediction"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderRiskPage,80));});
  document.querySelectorAll('.nav-item[data-menu="closeout25"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderCO25Page,80));});
  document.querySelectorAll('.nav-item[data-menu="menu5"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderAlkesPage,80));});
  document.querySelectorAll('.nav-item[data-menu="medsurv"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(renderMCUPage,80));});
  document.querySelectorAll('.nav-item[data-menu="accesslog"]').forEach(item=>{item.addEventListener("click",()=>setTimeout(loadAccessLog,80));});
  /* Mobile logout FAB — tampil hanya di mobile */
  function updateMobileLogout(){
    var btn=document.getElementById('mLogoutBtn');
    if(!btn)return;
    var isMobile=window.innerWidth<=768;
    btn.style.display=isMobile?'flex':'none';
  }
  updateMobileLogout();
  window.addEventListener('resize',updateMobileLogout);

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
  /* Auto-scroll ke header grup yang baru dibuka */
  if(!wasOpen){
    setTimeout(function(){
      const hdr=grp.querySelector(".nav-group-hdr");
      if(hdr)hdr.scrollIntoView({behavior:"smooth",block:"nearest"});
    },80);
  }
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
  /* Reset summary cache agar data terbaru selalu dipakai */
  _summaryCache=null; _summaryCacheKey="";
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
    rawAlkes=[];filteredAlkes=[];
    rawMCU=[];filteredMCU=[];mcuSummary={};
    rawCloseout25=[...RAW_CLOSEOUT_2025];filteredCO25=[...RAW_CLOSEOUT_2025];
    const lastEl=document.getElementById("lastUpdated");
    if(lastEl)lastEl.textContent="Mode Demo";
    try{renderHRAPage();}catch(e){}
    try{renderDATPage();}catch(e){}
    try{renderPestPage();}catch(e){}
    try{renderP3KPage();}catch(e){}
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
    initP3KData(data);
    rawFisika=data.fisika||[];rawKimia=data.kimia||[];rawBiologi=data.biologi||[];
    rawErgonomi=data.ergonomi||[];rawPsikososial=data.psikososial||[];
    /* Alkes */
    rawAlkes=(data.alkes||[]).map(function(r){
      /* Jika GAS sudah hitung _kelengkapanPct & _status — pakai langsung */
      if(r._kelengkapanPct!=null&&r._status){return r;}
      /* Fallback kalkulasi client-side — HANYA "ADA" yang dihitung */
      var ITEMS=['Aed','Tandu Biasa','Basket Stretcher','Long Spinal Board',
                 'Tabung Oksigen','Body Thermometer','Blood Pressure Monitor','Spirometry'];
      var total=ITEMS.length; /* 8 — tidak ada +1, AED sudah masuk list */
      var adaCount=ITEMS.filter(function(k){
        return String(r[k]||'').toUpperCase().trim()==='ADA'; /* HANYA "ADA" */
      }).length;
      var pct=Math.round((adaCount/total)*100);
      /* Cek expired AED — format dd/MM/yyyy dari GAS */
      var expAED=(r['Expired Date AED']||r['Expired_Date_AED']||'').toString().trim();
      var isExpired=false;
      if(expAED){
        var dp=expAED.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if(dp){var expDt=new Date(parseInt(dp[3]),parseInt(dp[2])-1,parseInt(dp[1]));isExpired=expDt<new Date();}
        else{var d2=new Date(expAED);if(!isNaN(d2))isExpired=d2<new Date();}
      }
      var status=isExpired?'EXPIRED':(adaCount===total?'LENGKAP':(adaCount>0?'PARSIAL':'TIDAK LENGKAP'));
      return Object.assign({},r,{_status:status,_kelengkapanPct:pct,_expiredAED:isExpired,_alkesAda:adaCount,_alkesTotal:total});
    });
    filteredAlkes=[...rawAlkes];
    /* MCU Pelaut — ambil dari getData (SHEET_CONFIG mcu=MCU PELAUT) */
    if(data.mcu&&data.mcu.length>0){
      rawMCU=data.mcu;
      filteredMCU=[...rawMCU];
      _buildMCUSummary();
      var pgMed=document.getElementById('page-medsurv');
      if(pgMed&&pgMed.classList.contains('active'))renderMCUPage();
    }
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
    if(typeof refreshNotifAfterLoad==="function")refreshNotifAfterLoad();
  }catch(err){
    console.error("API Error:",err);
    showError("Gagal memuat data: "+err.message);
    rawHRA=[];rawDAT=[];rawPest=[];
    rawFisika=[];rawKimia=[];rawBiologi=[];rawErgonomi=[];rawPsikososial=[];
    filteredHRA=[];filteredDAT=[];filteredPest=[];
    filteredFisika=[];filteredKimia=[];filteredBiologi=[];filteredErgonomi=[];filteredPsikososial=[];
    rawAlkes=[];filteredAlkes=[];
    rawMCU=[];filteredMCU=[];mcuSummary={};
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
  /* Fetch MCU Pelaut data dari GAS */
  fetchMCUData();
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


/* ── PPT Library Waiter (fallback; ppt_export.js mendefinisikan versi kanonik
   yang dimuat belakangan & menimpa ini. Sengaja dibiarkan agar export tetap
   jalan walau ppt_export.js gagal dimuat). ── */
async function _awaitPptx(){
  var waited=0;
  while(typeof PptxGenJS==="undefined"&&waited<15000){
    await new Promise(function(r){setTimeout(r,500);});
    waited+=500;
  }
  return typeof PptxGenJS!=="undefined";
}

/* ── DOCX Library Waiter ── */
/* ── HRA/IH JENIS HELPER ── */
function hraJenis(namaKapal){
  var n=String(namaKapal||'').trim();
  if(/\s+HRA$/i.test(n)) return 'HRA';
  if(/\s+IH$/i.test(n))  return 'IH';
  return '';  /* tidak ada suffix = tidak dikenali */
}
function hraBaseKapal(namaKapal){
  return String(namaKapal||'').trim().replace(/\s+(HRA|IH)$/i,'').trim();
}

function renderHRAPage(){
  var data=filteredHRA;
  var pg=document.getElementById('hra-exec-page');
  if(!pg)return;

  /* ── Split HRA vs IH ── */
  var dataHRA=data.filter(function(r){return hraJenis(r['Nama Kapal'])==='HRA';});
  var dataIH =data.filter(function(r){return hraJenis(r['Nama Kapal'])==='IH';});

  function uniqueDone(d){
    return new Set(d.filter(function(r){return(r['Status']||'').toLowerCase()==='done';})
                    .map(function(r){return hraBaseKapal(r['Nama Kapal']);})).size;
  }
  function uniqueTotal(d){
    return new Set(d.map(function(r){return hraBaseKapal(r['Nama Kapal']);})).size;
  }

  var doneAll =new Set(data.filter(function(r){return(r['Status']||'').toLowerCase()==='done';})
                           .map(function(r){return r['Nama Kapal'];})).size;
  var doneHRA =uniqueDone(dataHRA);  var totalHRA=uniqueTotal(dataHRA);
  var doneIH  =uniqueDone(dataIH);   var totalIH =uniqueTotal(dataIH);
  var budget  =data.reduce(function(s,r){return s+parseFloat(r['Est Budget']||0);},0);
  var covAll  =TOTAL_KAPAL>0?((doneAll/TOTAL_KAPAL)*100).toFixed(1):0;
  var covHRA  =totalHRA>0?Math.round(doneHRA/totalHRA*100):0;
  var covIH   =totalIH >0?Math.round(doneIH /totalIH *100):0;

  /* ── Bulan filter options ── */
  var selBulan=(document.getElementById('hra-filter-bulan')||{}).value||'';
  var selFleet=(document.getElementById('hra-filter-fleet')||{}).value||'';
  var selJenis=(document.getElementById('hra-filter-jenis')||{}).value||'';

  /* ── Top hazards ── */
  var hazCounts={};
  rawHRA.forEach(function(r){
    var h=(r['Top 3 Hazard']||'').trim();if(!h)return;
    h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){
      hazCounts[hz]=(hazCounts[hz]||0)+1;
    });
  });
  var topHaz=Object.entries(hazCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,5);

  /* ── Per-fleet breakdown ── */
  var fleetMap={};
  data.forEach(function(r){
    var f=r['Jenis Fleet']||'—';
    if(!fleetMap[f])fleetMap[f]={total:0,done:0};
    fleetMap[f].total++;
    if((r['Status']||'').toLowerCase()==='done')fleetMap[f].done++;
  });

  /* ── Per-bulan monitoring trend (Terlaksana=Status done, Akan=nama kapal saja) ── */
  var bulanCounts={};
  BULAN_ORDER.forEach(function(b){bulanCounts[b]={hraDone:0,hraPlan:0,ihDone:0,ihPlan:0};});
  data.forEach(function(r){
    var b=r['Bulan Pelaksanaan'];if(!b||!bulanCounts[b])return;
    var nama=String(r['Nama Kapal']||'').trim();if(!nama)return;
    var done=(String(r['Status']||'').toLowerCase()==='done');
    var j=hraJenis(nama);
    if(j==='HRA'){if(done)bulanCounts[b].hraDone++;else bulanCounts[b].hraPlan++;}
    else if(j==='IH'){if(done)bulanCounts[b].ihDone++;else bulanCounts[b].ihPlan++;}
  });

  /* ── HELPERS ── */
  function svgRing(pct,col,sz){
    var r=sz/2-7,ci=2*Math.PI*r,da=ci*pct/100;
    return'<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" style="transform:rotate(-90deg)">'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="6"/>'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+da.toFixed(1)+' '+ci.toFixed(1)+'"/></svg>';
  }
  function miniBar(pct,col){
    return'<div style="display:flex;align-items:center;gap:6px">'+
      '<div style="flex:1;height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden">'+
      '<div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px;transition:width .6s ease"></div></div>'+
      '<span style="font-size:10px;font-weight:700;color:'+col+';min-width:30px">'+pct+'%</span></div>';
  }
  function statusDot(status){
    var s=(status||'').toLowerCase();
    if(s==='done')return'<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(67,160,71,.15);color:#43A047;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700"><i class="fas fa-circle-check" style="font-size:9px"></i>Done</span>';
    return'<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,140,0,.15);color:#FB8C00;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700"><i class="fas fa-clock" style="font-size:9px"></i>Pending</span>';
  }
  var BULAN_SHORT=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  /* ═══════════════════════════════════════════
     EXECUTIVE HEADER — Navy gradient + filters
  ═══════════════════════════════════════════ */
  var html=''
    +'<div style="background:linear-gradient(135deg,#0D2B4E 0%,#1A4A7A 55%,#1E5799 100%);'
    +'border-radius:16px;padding:24px 28px;margin-bottom:18px;position:relative;overflow:hidden">'
    /* Dekorasi background */
    +'<div style="position:absolute;right:-30px;top:-30px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.04)"></div>'
    +'<div style="position:absolute;right:80px;bottom:-40px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.03)"></div>'
    /* Header row */
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;position:relative">'
    +'<div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
    +'<i class="fas fa-magnifying-glass-chart" style="font-size:17px;color:#90CAF9"></i>'
    +'<span style="font-size:10px;font-weight:700;color:#90CAF9;letter-spacing:.9px;text-transform:uppercase">Monitoring &amp; Assessment</span>'
    +'</div>'
    +'<h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 3px">HRA &amp; IH Dashboard</h1>'
    +'<p style="font-size:11px;color:rgba(255,255,255,.55);margin:0">Hazard Recognition &amp; Assessment · Industrial Hygiene · Pertamina Patra Niaga</p>'
    +'</div>'
    /* Filter controls */
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    +'<select onchange="applyHRAFilters();renderHRAPage()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff" id="hra-filter-bulan2">'
    +'<option value="">Semua Bulan</option>'
    +BULAN_ORDER.map(function(b){return'<option style="color:#000"'+(b===selBulan?' selected':'')+'>'+b+'</option>';}).join('')
    +'</select>'
    +'<select onchange="applyHRAFilters();renderHRAPage()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff" id="hra-filter-fleet2">'
    +'<option value="">Semua Fleet</option>'
    +['FP I','FP II','FC','FGP'].map(function(f){return'<option style="color:#000"'+(f===selFleet?' selected':'')+'>'+f+'</option>';}).join('')
    +'</select>'
    +'<select onchange="applyHRAFilters();renderHRAPage()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff" id="hra-filter-jenis2">'
    +'<option value="">Semua Jenis</option>'
    +'<option style="color:#000"'+(selJenis==='HRA'?' selected':'')+' value="HRA">HRA</option>'
    +'<option style="color:#000"'+(selJenis==='IH'?' selected':'')+' value="IH">IH</option>'
    +'</select>'
    +'<button onclick="hraResetFilters()" style="padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-size:11px;cursor:pointer;font-weight:600">'
    +'<i class="fas fa-xmark" style="margin-right:4px"></i>Reset</button>'
    +'<button onclick="openHazardMap()" style="padding:7px 14px;border-radius:8px;border:none;background:#C9973A;color:#fff;font-size:11px;cursor:pointer;font-weight:700">'
    +'<i class="fas fa-map-location-dot" style="margin-right:5px"></i>Hazard Map</button>'
    +'<button onclick="exportHRAPPT()" style="padding:7px 14px;border-radius:8px;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:11px;cursor:pointer;font-weight:600">'
    +'<i class="fas fa-file-powerpoint" style="margin-right:5px"></i>Export PPT</button>'
    +'</div></div>'
    /* KPI STRIP */
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:18px;position:relative">'
    +[
      {l:'Total Kapal',    v:TOTAL_KAPAL, ico:'fa-ship',           c:'#E3F2FD'},
      {l:'Sudah Monitoring',v:doneAll,    ico:'fa-circle-check',   c:'#A5D6A7'},
      {l:'Belum Monitoring',v:TOTAL_KAPAL-doneAll,ico:'fa-clock',  c:'#FFE0B2'},
      {l:'Est. Budget',    v:formatRupiah(budget),ico:'fa-sack-dollar',c:'#FFF9C4'},
      {l:'Coverage',       v:covAll+'%',  ico:'fa-percent',         c:'#BBDEFB'},
    ].map(function(k){
      return'<div style="background:rgba(255,255,255,.11);border-radius:10px;padding:12px 14px;backdrop-filter:blur(4px)">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        +'<div>'
        +'<div style="font-size:10px;color:rgba(255,255,255,.65);font-weight:600;margin-bottom:3px">'+k.l+'</div>'
        +'<div style="font-size:'+(typeof k.v==='string'&&k.v.length>6?'16':'24')+'px;font-weight:800;color:#fff;line-height:1">'+k.v+'</div>'
        +'</div>'
        +'<div style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center">'
        +'<i class="fas '+k.ico+'" style="font-size:13px;color:'+k.c+'"></i></div></div></div>';
    }).join('')
    +'</div></div>';

  /* ═══════════════════════════════════════════
     ROW 1: 3 DONUT RINGS (Coverage Overall, HRA, IH)
  ═══════════════════════════════════════════ */
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:18px">';
  [
    {pct:parseFloat(covAll),col:'#1E88E5',label:'Coverage Keseluruhan',sub:doneAll+' dari '+TOTAL_KAPAL+' armada',tag:''},
    {pct:covHRA,            col:'#5C6BC0',label:'Coverage HRA',        sub:doneHRA+' dari '+totalHRA+' kapal',tag:'HRA'},
    {pct:covIH,             col:'#00ACC1',label:'Coverage IH',         sub:doneIH +' dari '+totalIH +' kapal',tag:'IH'},
  ].forEach(function(rg){
    html+='<div class="stat-card" style="text-align:center;padding:22px 16px">'
      +'<div style="position:relative;display:inline-block;margin-bottom:12px">'+svgRing(rg.pct,rg.col,90)
      +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
      +(rg.tag?'<span style="font-size:8px;font-weight:700;color:'+rg.col+';letter-spacing:.5px">'+rg.tag+'</span>':'')
      +'<span style="font-size:16px;font-weight:800;color:var(--text)">'+rg.pct+'%</span>'
      +'</div></div>'
      +'<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px">'+esc(rg.label)+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">'+esc(rg.sub)+'</div></div>';
  });
  html+='</div>';

  /* ═══════════════════════════════════════════
     ROW 2: Trend Bulanan (bar inline) + Top Hazard
  ═══════════════════════════════════════════ */
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">';

  /* Trend per bulan */
  /* data untuk chart monitoring (Chart.js, bar vertikal seperti DAT) */
  _hraMonitorData={
    labels:BULAN_SHORT.slice(),
    hraDone:BULAN_ORDER.map(function(b){return bulanCounts[b].hraDone;}),
    hraPlan:BULAN_ORDER.map(function(b){return bulanCounts[b].hraPlan;}),
    ihDone: BULAN_ORDER.map(function(b){return bulanCounts[b].ihDone;}),
    ihPlan: BULAN_ORDER.map(function(b){return bulanCounts[b].ihPlan;})
  };
  html+='<div class="stat-card" style="padding:16px 20px">'
    +'<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:8px">'
    +'<i class="fas fa-chart-column" style="color:#1E88E5"></i>Monitoring per Bulan'
    +'<div class="pill-group" style="margin-left:auto;display:flex;gap:4px">'
    +'<button class="pill '+(hraMonitorType==="bar"?"active":"")+'" onclick="toggleHRAMonitorType(this,\'bar\')">Bar</button>'
    +'<button class="pill '+(hraMonitorType==="line"?"active":"")+'" onclick="toggleHRAMonitorType(this,\'line\')">Line</button>'
    +'</div></div>'
    +'<div style="height:240px"><canvas id="hraMonitorChart"></canvas></div></div>';

  /* Top Hazard */
  html+='<div class="stat-card" style="padding:16px 20px">'
    +'<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px">'
    +'<i class="fas fa-triangle-exclamation" style="color:#FB8C00"></i>Top 5 Hazard Teridentifikasi</div>';
  var hazColors=['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5'];
  if(!topHaz.length){
    html+='<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px">'
      +'<i class="fas fa-inbox" style="font-size:24px;opacity:.2;display:block;margin-bottom:8px"></i>Belum ada data hazard</div>';
  } else {
    var maxHz=topHaz[0][1]||1;
    topHaz.forEach(function(e,i){
      var name=e[0],count=e[1],pct=Math.round(count/maxHz*100);
      html+='<div style="margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
        +'<div style="display:flex;align-items:center;gap:7px">'
        +'<div style="width:18px;height:18px;border-radius:50%;background:'+hazColors[i]+';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0">'+(i+1)+'</div>'
        +'<span style="font-size:11px;font-weight:600;color:var(--text)">'+esc(name)+'</span></div>'
        +'<span style="font-size:10px;font-weight:700;color:'+hazColors[i]+'">'+count+'x</span></div>'
        +'<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-left:25px">'
        +'<div style="width:'+pct+'%;height:100%;background:'+hazColors[i]+';border-radius:2px;transition:width .5s"></div></div>'
        +'</div>';
    });
  }
  html+='</div></div>';

  /* ═══════════════════════════════════════════
     ROW 3: Per-Fleet cards
  ═══════════════════════════════════════════ */
  var fleetKeys=Object.keys(fleetMap);
  if(fleetKeys.length){
    html+='<h3 style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">'
      +'<i class="fas fa-anchor" style="color:#1E88E5;margin-right:6px"></i>Status per Fleet</h3>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:18px">';
    var fleetColors={'FP I':'#1E88E5','FP II':'#5C6BC0','FC':'#00ACC1','FGP':'#43A047'};
    fleetKeys.sort().forEach(function(f){
      var fm=fleetMap[f],fp=fm.total>0?Math.round(fm.done/fm.total*100):0;
      var fc=fleetColors[f]||'#607D8B';
      html+='<div class="stat-card" style="padding:14px 16px;border-top:3px solid '+fc+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">'
        +'<div><div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(f)+'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:1px">'+fm.done+' selesai / '+fm.total+' total</div></div>'
        +'<span style="font-size:16px;font-weight:800;color:'+fc+'">'+fp+'%</span></div>'
        +miniBar(fp,fc)+'</div>';
    });
    html+='</div>';
  }

  /* ═══════════════════════════════════════════
     ROW 4: TABEL FULL — search + filter inline
  ═══════════════════════════════════════════ */
  html+='<div class="stat-card" style="padding:0;overflow:hidden">'
    +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<span style="font-size:12px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px">'
    +'<i class="fas fa-table-list" style="color:#1E88E5"></i>Data Monitoring HRA &amp; IH</span>'
    +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'
    +'<input type="text" placeholder="\uD83D\uDD0D Cari nama kapal..." oninput="hraExecSearch(this.value)" '
    +'style="font-size:11px;padding:6px 10px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:180px">'
    +'</div></div>'
    +'<div style="overflow-x:auto">'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead>'
    +'<tr style="background:var(--card)">'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Nama Kapal</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Jenis</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Fleet</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Bulan</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Vendor</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Status</th>'
    +'<th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Est. Budget</th>'
    +'</tr>'
    +'</thead>'
    +'<tbody id="hra-exec-tbody">';

  if(!data.length){
    html+='<tr><td colspan="7" style="padding:48px;text-align:center;color:var(--text-muted)">'
      +'<i class="fas fa-inbox" style="font-size:28px;opacity:.2;display:block;margin-bottom:10px"></i>'
      +'Belum ada data HRA &amp; IH</td></tr>';
  } else {
    data.forEach(function(r){
      var jenis=hraJenis(r['Nama Kapal']);
      var jenisHtml=jenis==='HRA'
        ?'<span style="background:#E8EAF6;color:#3949AB;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700">HRA</span>'
        :jenis==='IH'
        ?'<span style="background:#E0F2F1;color:#00695C;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700">IH</span>'
        :'<span style="color:var(--text-muted);font-size:10px">—</span>';
      var isDone=(r['Status']||'').toLowerCase()==='done';
      html+='<tr style="border-top:1px solid var(--border);transition:background .15s" '
        +'onmouseover="this.style.background=\'var(--card)\'" onmouseout="this.style.background=\'\'">'
        +'<td style="padding:10px 14px"><strong style="color:var(--text)">'+esc(hraBaseKapal(r['Nama Kapal']))+'</strong></td>'
        +'<td style="padding:10px 14px">'+jenisHtml+'</td>'
        +'<td style="padding:10px 14px"><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">'+esc(r['Jenis Fleet']||'—')+'</span></td>'
        +'<td style="padding:10px 14px;color:var(--text-muted)">'+esc(r['Bulan Pelaksanaan']||'—')+'</td>'
        +'<td style="padding:10px 14px;color:var(--text-muted);font-size:11px">'+esc(r['Vendor Pelaksana']||'—')+'</td>'
        +'<td style="padding:10px 14px">'+statusDot(r['Status'])+'</td>'
        +'<td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--text)">Rp '+fmtNum(parseFloat(r['Est Budget']||0))+'</td>'
        +'</tr>';
    });
  }

  html+='</tbody></table></div>'
    +'<div style="padding:10px 18px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border)">'
    +'Menampilkan '+data.length+' dari '+rawHRA.length+' entri</div></div>';

  pg.innerHTML=html;
  renderHRAMonitorChart();

  /* Sync filter header ke hidden inputs */
  document.getElementById('hra-filter-bulan').value=selBulan;
  document.getElementById('hra-filter-fleet').value=selFleet;
  document.getElementById('hra-filter-jenis').value=selJenis;

  /* Sync filter visible ke hidden */
  ['bulan','fleet','jenis'].forEach(function(k){
    var vis=document.getElementById('hra-filter-'+k+'2');
    var hid=document.getElementById('hra-filter-'+k);
    if(vis&&hid) vis.onchange=function(){hid.value=this.value;applyHRAFilters();};
  });
}

function hraResetFilters(){
  ['hra-filter-bulan','hra-filter-fleet','hra-filter-jenis','hra-filter-kapal'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  filteredHRA=[...rawHRA];
  renderHRAPage();
}

function hraExecSearch(q){
  var qq=q.toLowerCase();
  var rows=document.querySelectorAll('#hra-exec-tbody tr');
  rows.forEach(function(row){
    row.style.display=row.textContent.toLowerCase().includes(qq)?'':'none';
  });
}
function renderHRABarChart(data){const counts={};BULAN_ORDER.forEach(b=>counts[b]=0);data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(b&&counts[b]!==undefined)counts[b]++;});const ctx=document.getElementById("hraBarChart").getContext("2d");if(hraBarChart)hraBarChart.destroy();hraBarChart=new Chart(ctx,{type:hraChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Monitoring",data:BULAN_ORDER.map(b=>counts[b]),backgroundColor:hraChartType==="line"?"rgba(21,101,192,0.12)":"#1976D2",borderColor:"#1565C0",borderWidth:hraChartType==="line"?2.5:1,borderRadius:hraChartType==="bar"?6:0,fill:hraChartType==="line",tension:0.4,pointBackgroundColor:"#1565C0",pointRadius:hraChartType==="line"?4:0}]},options:chartOpts()});}
function renderHRADonutChart(data){const fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};data.forEach(r=>{const f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});const ctx=document.getElementById("hraDonutChart").getContext("2d");if(hraDonutChart)hraDonutChart.destroy();hraDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:Object.keys(fleets),datasets:[{data:Object.values(fleets),backgroundColor:["#1976D2","#43A047","#FB8C00","#8E24AA"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function toggleHRAChartType(btn,type){hraChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderHRABarChart(filteredHRA);}
function renderHRAMonitorChart(){var d=_hraMonitorData;if(!d)return;var cv=document.getElementById("hraMonitorChart");if(!cv)return;var ctx=cv.getContext("2d");if(hraMonitorChart)hraMonitorChart.destroy();var isLine=hraMonitorType==="line";var opts=chartOpts();opts.plugins.legend={display:true,position:"top",labels:{color:"#607D8B",font:{size:10,family:"Plus Jakarta Sans",weight:"700"},padding:10,boxWidth:11,usePointStyle:true}};if(!isLine){opts.scales.x.stacked=true;opts.scales.y.stacked=true;}function mk(label,arr,solid,line,dash){return{label:label,data:arr,backgroundColor:isLine?"transparent":solid,borderColor:line,borderWidth:isLine?2.5:1,borderRadius:isLine?0:5,borderDash:isLine&&dash?[5,4]:[],fill:false,tension:0.4,pointBackgroundColor:line,pointRadius:isLine?3:0,stack:"hra"};}hraMonitorChart=new Chart(ctx,{type:hraMonitorType,data:{labels:d.labels,datasets:[mk("HRA Terlaksana",d.hraDone,"#5C6BC0","#5C6BC0",false),mk("HRA Akan",d.hraPlan,"#C5CAE9","#9FA8DA",true),mk("IH Terlaksana",d.ihDone,"#00ACC1","#00ACC1",false),mk("IH Akan",d.ihPlan,"#B2EBF2","#4DD0E1",true)]},options:opts});}
function toggleHRAMonitorType(btn,type){hraMonitorType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(function(p){p.classList.remove("active");});btn.classList.add("active");renderHRAMonitorChart();}
function renderHRAHazard(){const bulan=document.getElementById("hra-hazard-bulan").value;const data=bulan?rawHRA.filter(r=>r["Bulan Pelaksanaan"]===bulan):rawHRA;const counts={};data.forEach(r=>{const h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(x=>x.trim()).filter(Boolean).forEach(hz=>{counts[hz]=(counts[hz]||0)+1;});});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);const el=document.getElementById("hazardList");if(!sorted.length){el.innerHTML='<div class="hazard-empty"><i class="fas fa-inbox" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>Tidak ada data hazard</div>';return;}el.innerHTML=sorted.map(([name,count],i)=>`<div class="hazard-item"><div class="hazard-rank r${i+1}">${i+1}</div><div class="hazard-name">${esc(name)}</div><div class="hazard-count">${count}x</div></div>`).join("");}
function renderHRATable(data){
  var tbody=document.getElementById('hraTableBody');
  if(!tbody)return;
  if(!data.length){
    tbody.innerHTML=emptyState('Belum ada data HRA','fa-lungs');
    document.getElementById('hraTableFooter').textContent='Tidak ada data';
    return;
  }
  tbody.innerHTML=data.map(function(r){
    var jenis=hraJenis(r['Nama Kapal']);
    var jenisHtml=jenis==='HRA'
      ?'<span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">HRA</span>'
      :jenis==='IH'
      ?'<span style="background:#E0F2F1;color:#006064;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">IH</span>'
      :'<span style="color:var(--text-muted);font-size:10px">—</span>';
    return'<tr>'+
      '<td><strong style="color:var(--text)">'+esc(hraBaseKapal(r['Nama Kapal']))+'</strong></td>'+
      '<td>'+jenisHtml+'</td>'+
      '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+esc(r['Jenis Fleet']||'')+'</span></td>'+
      '<td>'+esc(r['Bulan Pelaksanaan']||'')+'</td>'+
      '<td>'+esc(r['Vendor Pelaksana']||'')+'</td>'+
      '<td>'+statusBadge(r['Status'])+'</td>'+
      '<td style="font-weight:700">Rp '+fmtNum(parseFloat(r['Est Budget']||0))+'</td>'+
      '</tr>';
  }).join('');
  document.getElementById('hraTableFooter').textContent=
    'Menampilkan '+data.length+' dari '+rawHRA.length+' entri';
}
function applyHRAFilters(){
  var b=(document.getElementById('hra-filter-bulan')||{}).value||'';
  var f=(document.getElementById('hra-filter-fleet')||{}).value||'';
  var k=((document.getElementById('hra-filter-kapal')||{}).value||'').toLowerCase();
  var j=(document.getElementById('hra-filter-jenis')||{}).value||'';
  filteredHRA=rawHRA.filter(function(r){
    if(b&&r['Bulan Pelaksanaan']!==b)return false;
    if(f&&r['Jenis Fleet']!==f)return false;
    if(k&&!(r['Nama Kapal']||'').toLowerCase().includes(k))return false;
    if(j&&hraJenis(r['Nama Kapal'])!==j)return false;
    return true;
  });
  renderHRAPage();
}
function clearHRAFilters(){["hra-filter-bulan","hra-filter-fleet"].forEach(id=>document.getElementById(id).value="");document.getElementById("hra-filter-kapal").value="";filteredHRA=[...rawHRA];var jEl=document.getElementById('hra-filter-jenis');if(jEl)jEl.value='';
  renderHRAPage();}
function searchHRATable(){const q=document.getElementById("hra-search").value.toLowerCase();document.querySelectorAll("#hraTableBody tr").forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?"":"none";});}
function sortHRATable(col){if(hraSortCol===col)hraSortDir*=-1;else{hraSortCol=col;hraSortDir=1;}const keys=["Nama Kapal","Jenis Fleet","Bulan Pelaksanaan","Vendor Pelaksana","Status","Est Budget"];filteredHRA.sort((a,b)=>String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),"id")*hraSortDir);renderHRATable(filteredHRA);}

/* DAT PAGE */
function renderDATPage(){const data=filteredDAT;const done=new Set(data.map(r=>r["Nama Kapal"])).size;const belum=TOTAL_KAPAL-done;const crew=data.reduce((s,r)=>s+parseInt(r["Total Crew Diperiksa"]||0),0);const pos=data.reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);const biaya=data.reduce((s,r)=>s+parseFloat(r["Est Biaya"]||0),0);const coverage=((done/TOTAL_KAPAL)*100).toFixed(1);document.getElementById("dat-done").textContent=done;document.getElementById("dat-belum").textContent=belum;document.getElementById("dat-crew").textContent=fmtNum(crew);document.getElementById("dat-positif").textContent=pos;document.getElementById("dat-biaya").textContent=formatRupiah(biaya);document.getElementById("dat-coverage").textContent=coverage+"%";renderDATBarChart(data);renderDATDonutChart(data,crew,pos);renderDATTindakLanjut(data);renderDATTable(data);}
function renderDATBarChart(data){const done={},plan={};BULAN_ORDER.forEach(b=>{done[b]=0;plan[b]=0;});data.forEach(r=>{const b=r["Bulan Pelaksanaan"];if(!b||done[b]===undefined)return;const hasil=String(r["Hasil"]||"").trim();const nama=String(r["Nama Kapal"]||"").trim();if(hasil!=="")done[b]++;else if(nama)plan[b]++;});const isLine=datChartType==="line";const ctx=document.getElementById("datBarChart").getContext("2d");if(datBarChart)datBarChart.destroy();const opts=chartOpts();opts.plugins.legend={display:true,position:"top",labels:{color:"#607D8B",font:{size:11,family:"Plus Jakarta Sans",weight:"700"},padding:14,boxWidth:12,usePointStyle:true}};if(!isLine){opts.scales.x.stacked=true;opts.scales.y.stacked=true;}datBarChart=new Chart(ctx,{type:datChartType,data:{labels:BULAN_ORDER,datasets:[{label:"Terlaksana",data:BULAN_ORDER.map(b=>done[b]),backgroundColor:isLine?"rgba(67,160,71,0.12)":"#43A047",borderColor:"#2E7D32",borderWidth:isLine?2.5:1,borderRadius:isLine?0:6,fill:isLine,tension:0.4,pointBackgroundColor:"#2E7D32",pointRadius:isLine?4:0,stack:"dat"},{label:"Akan Dilaksanakan",data:BULAN_ORDER.map(b=>plan[b]),backgroundColor:isLine?"rgba(224,145,58,0.12)":"#F0A030",borderColor:"#E0913A",borderWidth:isLine?2.5:1,borderRadius:isLine?0:6,fill:isLine,tension:0.4,pointBackgroundColor:"#E0913A",pointRadius:isLine?4:0,stack:"dat"}]},options:opts});}
function renderDATDonutChart(data,crew,pos){const neg=crew-pos;const ctx=document.getElementById("datDonutChart").getContext("2d");if(datDonutChart)datDonutChart.destroy();datDonutChart=new Chart(ctx,{type:"doughnut",data:{labels:["Negatif","Positif"],datasets:[{data:[Math.max(0,neg),pos],backgroundColor:["#43A047","#E53935"],borderColor:"#fff",borderWidth:3,hoverOffset:8}]},options:donutOpts()});}
function toggleDATChartType(btn,type){datChartType=type;btn.closest(".pill-group").querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));btn.classList.add("active");renderDATBarChart(filteredDAT);}
function renderDATTindakLanjut(data){const diturunkan=data.filter(r=>(r["Tindak Lanjut"]||"").toLowerCase().includes("turun")).reduce((s,r)=>s+parseInt(r["Jumlah Crew Positif"]||0),0);const total_tl=data.filter(r=>r["Tindak Lanjut"]).length;document.getElementById("datTindakLanjut").innerHTML=`<div class="stat-row"><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-arrow-down-from-line" style="color:#C62828;margin-right:5px"></i>Crew Diturunkan</div><div class="stat-label">Hasil positif ditindaklanjuti</div></div><div class="stat-val">${diturunkan}</div></div><div class="stat-item"><div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:3px"><i class="fas fa-file-medical" style="color:#E65100;margin-right:5px"></i>Entri Tindak Lanjut</div><div class="stat-label">Kapal dengan tindak lanjut</div></div><div class="stat-val" style="color:#E65100">${total_tl}</div></div></div>`;}
function renderDATTable(data){const tbody=document.getElementById("datTableBody");if(!tbody)return;if(!data.length){tbody.innerHTML=emptyState("Belum ada data DAT","fa-vial");document.getElementById("datTableFooter").textContent="Tidak ada data";return;}tbody.innerHTML=data.map(r=>{const h=(r["Hasil"]||"").toLowerCase();const badge=h==="negatif"?'<span class="badge badge-neg">Negatif</span>':h==="positif"?'<span class="badge badge-pos">Positif</span>':esc(r["Hasil"]||"—");return`<tr><td><strong style="color:var(--text)">${esc(r["Nama Kapal"]||"")}</strong></td><td><span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${esc(r["Jenis Fleet"]||"")}</span></td><td>${esc(r["Bulan Pelaksanaan"]||"")}</td><td>${esc(r["Vendor Pelaksana"]||"—")}</td><td style="text-align:right;font-weight:700">${fmtNum(parseInt(r["Total Crew Diperiksa"]||0))}</td><td>${badge}</td><td style="text-align:right;font-weight:700;color:#C62828">${r["Jumlah Crew Positif"]||0}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(r["Tindak Lanjut"]||"—")}</td></tr>`;}).join("");document.getElementById("datTableFooter").textContent=`Menampilkan ${data.length} dari ${rawDAT.length} entri`;}
function applyDATFilters(){const b=document.getElementById("dat-filter-bulan").value;const f=document.getElementById("dat-filter-fleet").value;const k=document.getElementById("dat-filter-kapal").value.toLowerCase();filteredDAT=rawDAT.filter(r=>(!b||r["Bulan Pelaksanaan"]===b)&&(!f||r["Jenis Fleet"]===f)&&(!k||(r["Nama Kapal"]||"").toLowerCase().includes(k)));renderDATPage();}
function clearDATFilters(){["dat-filter-bulan","dat-filter-fleet","dat-filter-kapal"].forEach(id=>{var el=document.getElementById(id);if(el)el.value="";});filteredDAT=[...rawDAT];renderDATPage();}
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
function clearPestFilters(){["pest-filter-bulan","pest-filter-lokasi","pest-filter-temuan"].forEach(id=>{var el=document.getElementById(id);if(el)el.value="";});filteredPest=[...rawPest];renderPestPage();}
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
    psikososial:'Faktor Psikososial',
    summary:'Summary Dashboard', riskprediction:'Health Risk Prediction',
    closeout25:'Closeout HRA & IH 2025', accesslog:'Access Log',
    medsurv:'Medical Surveillance — MCU Pelaut'
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
  var tipeF=(document.getElementById("bio-filter-tipe")||{}).value||"all";
  var tahunF=(document.getElementById("bio-filter-tahun")||{}).value||"";
  var kapalF=(document.getElementById("bio-filter-kapal")||{}).value||"";

  /* Populate dropdown tahun */
  var allYears=[...new Set([...rawBiomarker,...rawPersonal].map(function(r){return r.tahun;}).filter(Boolean))].sort();
  var tahunSel=document.getElementById("bio-filter-tahun");
  if(tahunSel){var curT=tahunSel.value;tahunSel.innerHTML='<option value="">Semua Tahun</option>'+allYears.map(function(t){return'<option'+(t===curT?' selected':'')+'>'+esc(t)+'</option>';}).join("");}
  var allKapals=[...new Set([...rawBiomarker,...rawPersonal].map(function(r){return r.kapal;}).filter(Boolean))].sort();
  var kapalSel=document.getElementById("bio-filter-kapal");
  if(kapalSel){var curK=kapalSel.value;kapalSel.innerHTML='<option value="">Semua Kapal</option>'+allKapals.map(function(k){return'<option'+(k===curK?' selected':'')+'>'+esc(k)+'</option>';}).join("");}

  /* Filter */
  var bioData=rawBiomarker.filter(function(r){return(!tahunF||r.tahun===tahunF)&&(!kapalF||r.kapal===kapalF);});
  var perData=rawPersonal.filter(function(r){return(!tahunF||r.tahun===tahunF)&&(!kapalF||r.kapal===kapalF);});

  /* KPI */
  var totalBio=bioData.length;
  var melBio=bioData.filter(function(r){return r.kreatinin>r.rujukan;}).length;
  var totalPer=perData.length;
  var melPer=perData.filter(function(r){return r.hasil>r.nab;}).length;
  var kapalSet=new Set([...bioData,...perData].map(function(r){return r.kapal;}).filter(Boolean)).size;

  var setEl=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setEl("bio-kpi-total",(tipeF==="personal"?totalPer:tipeF==="biomarker"?totalBio:(totalBio+totalPer)));
  setEl("bio-kpi-melebihi",(tipeF==="personal"?melPer:tipeF==="biomarker"?melBio:(melBio+melPer)));
  setEl("bio-kpi-normal",(tipeF==="personal"?(totalPer-melPer):tipeF==="biomarker"?(totalBio-melBio):((totalBio+totalPer)-(melBio+melPer))));
  setEl("bio-kpi-kapal",kapalSet);

  _renderBioKimiaCharts(bioData,perData,tipeF);
  _renderBioKimiaTable(bioData,perData,tipeF);
  _renderBioKimiaRekomendasi(bioData,perData,melBio,melPer);
}

function _renderBioKimiaCharts(bioData,perData,tipeF){
  /* Chart 1: Bar chart rata-rata per kapal */
  var ctx1=document.getElementById("bioKapalChart");
  if(ctx1){
    if(window._bioKapalChart){window._bioKapalChart.destroy();window._bioKapalChart=null;}
    var src=tipeF==="personal"?perData:bioData;
    var isBio=tipeF!=="personal";
    if(!src.length){emptyChart("bioKapalChart","Belum ada data");return;}
    clearEmptyChart("bioKapalChart");
    var kapalMap={};
    src.forEach(function(r){
      var v=isBio?r.kreatinin:r.hasil;
      if(!kapalMap[r.kapal])kapalMap[r.kapal]=[];
      kapalMap[r.kapal].push(v);
    });
    var labels=Object.keys(kapalMap).slice(0,12);
    var avgs=labels.map(function(k){var arr=kapalMap[k];return+(arr.reduce(function(s,v){return s+v;},0)/arr.length).toFixed(2);});
    /* NAB/BEI reference — ambil dari data aktual bukan hardcoded */
    var ref=isBio?(bioData[0]?bioData[0].rujukan:25):(perData[0]?perData[0].nab:0.5);
    window._bioKapalChart=new Chart(ctx1.getContext("2d"),{
      type:"bar",
      data:{labels:labels,datasets:[
        {label:"Rata-rata nilai",data:avgs,
          backgroundColor:avgs.map(function(v){return v>ref?"rgba(198,40,40,.8)":"rgba(123,31,162,.75)";}),
          borderColor:avgs.map(function(v){return v>ref?"#C62828":"#7B1FA2";}),
          borderWidth:1.5,borderRadius:5},
        {label:(isBio?"BEI ACGIH 2024: "+ref+" µg/g kreat.":"NAB Kemenaker: "+ref+" ppm"),
          data:labels.map(function(){return ref;}),
          type:"line",borderColor:"#F59E0B",borderWidth:2,
          borderDash:[6,3],pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:"top",labels:{font:{size:11},padding:12}}},
        scales:{
          x:{ticks:{font:{size:9},maxRotation:35}},
          y:{beginAtZero:true,ticks:{font:{size:10}},
            title:{display:true,text:isBio?"µg/g kreatinin":"ppm",font:{size:10}}}
        }
      }
    });
  }
  /* Chart 2: Donut status */
  var ctx2=document.getElementById("bioStatusChart");
  if(ctx2){
    if(window._bioStatusChart){window._bioStatusChart.destroy();window._bioStatusChart=null;}
    var src2=tipeF==="personal"?perData:tipeF==="biomarker"?bioData:[...bioData,...perData];
    if(!src2.length){emptyChart("bioStatusChart","Belum ada data");return;}
    clearEmptyChart("bioStatusChart");
    var isBio2=tipeF!=="personal";
    var normal2=src2.filter(function(r){return(isBio2?r.kreatinin:r.hasil)<=(isBio2?r.rujukan:r.nab);}).length;
    var mel2=src2.length-normal2;
    window._bioStatusChart=new Chart(ctx2.getContext("2d"),{
      type:"doughnut",
      data:{labels:["Normal / Dalam Batas","Melebihi "+(isBio2?"BEI":"NAB")],
        datasets:[{data:[normal2,mel2],backgroundColor:["#43A047","#C62828"],
          borderColor:"#fff",borderWidth:3,hoverOffset:8}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:"62%",
        plugins:{legend:{position:"bottom",labels:{font:{size:11},padding:12,boxWidth:12}}}}
    });
  }
}

function _renderBioKimiaTable(bioData,perData,tipeF){
  var tbody=document.getElementById("bioTableBody");
  if(!tbody)return;

  /* Gabungkan sesuai filter tipe */
  var rows=[];
  if(tipeF==="all"||tipeF==="biomarker"){
    bioData.forEach(function(r){
      var over=r.kreatinin>r.rujukan;
      rows.push({
        tipe:"Biomarker",kapal:r.kapal,fleet:r.fleet,pekerja:r.pekerja,tahun:r.tahun,
        lokasi:"Urin (Akhir Shift)",
        nilai:r.kreatinin.toFixed(1),
        satuan:"µg/g kreat.",
        nab:r.rujukan,
        nabLabel:r.rujukan+" µg/g kreat.",
        nabRef:"BEI ACGIH 2024",
        over:over,
        pct:r.rujukan?Math.round(r.kreatinin/r.rujukan*100):0
      });
    });
  }
  if(tipeF==="all"||tipeF==="personal"){
    perData.forEach(function(r){
      var over=r.hasil>r.nab;
      rows.push({
        tipe:"Personal",kapal:r.kapal,fleet:r.fleet,pekerja:r.pekerja,tahun:r.tahun,
        lokasi:r.lokasi||"Area Kerja",
        nilai:r.hasil.toFixed(3),
        satuan:"ppm",
        nab:r.nab,
        nabLabel:r.nab+" ppm (TWA)",
        nabRef:"Kemenaker 05/2018",
        over:over,
        pct:r.nab?Math.round(r.hasil/r.nab*100):0
      });
    });
  }

  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada data untuk filter yang dipilih</td></tr>';
    var ft=document.getElementById("bioTableFooter");if(ft)ft.textContent="Tidak ada data";
    return;
  }

  tbody.innerHTML=rows.map(function(r){
    var badge=r.over
      ?'<span style="background:var(--red-soft);color:var(--red);padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700"><i class="fas fa-circle-xmark" style="margin-right:3px"></i>Melebihi</span>'
      :'<span style="background:var(--green-soft);color:var(--green-dark);padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700"><i class="fas fa-circle-check" style="margin-right:3px"></i>Normal</span>';
    var tipeBadge=r.tipe==="Biomarker"
      ?'<span style="background:#F3E5F5;color:#7B1FA2;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700"><i class="fas fa-flask-vial" style="margin-right:3px"></i>Biomarker</span>'
      :'<span style="background:var(--blue-soft);color:var(--blue);padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700"><i class="fas fa-wind" style="margin-right:3px"></i>Personal</span>';
    var pctColor=r.pct>=100?"var(--red)":r.pct>=75?"#E65100":"var(--green-dark)";
    return'<tr>'
      +'<td><strong style="color:var(--text)">'+esc(r.kapal)+'</strong></td>'
      +'<td style="font-size:11.5px">'+esc(r.fleet)+'</td>'
      +'<td>'+esc(r.pekerja)+'</td>'
      +'<td><span style="background:var(--blue-bg);color:var(--blue);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+r.tahun+'</span></td>'
      +'<td>'+tipeBadge+'</td>'
      +'<td style="font-size:11.5px;color:var(--text-muted)">'+esc(r.lokasi)+'</td>'
      +'<td style="font-weight:700;color:'+(r.over?"var(--red)":"var(--green-dark)")+'">'+r.nilai
      +' <small style="font-weight:400;color:var(--text-muted);font-size:10px">'+r.satuan+'</small></td>'
      +'<td style="font-size:11.5px">'
      +'<div style="font-weight:700;color:var(--text-mid)">'+r.nabLabel+'</div>'
      +'<div style="font-size:10px;color:var(--text-muted)">'+r.nabRef+'</div>'
      +'</td>'
      +'<td><div style="display:flex;align-items:center;gap:8px">'
      +badge
      +'<span style="font-size:10.5px;font-weight:700;color:'+pctColor+'">'+r.pct+'%</span>'
      +'</div></td>'
      +'</tr>';
  }).join("");

  var ft=document.getElementById("bioTableFooter");
  if(ft)ft.textContent="Menampilkan "+rows.length+" data ("+bioData.length+" biomarker + "+perData.length+" personal sampling)";
}

function _renderBioKimiaRekomendasi(bioData,perData,melBio,melPer){
  /* Cari atau buat container rekomendasi */
  var el=document.getElementById("bioRekomendasiSection");
  if(!el)return;

  var totalMel=melBio+melPer;
  var refBio=bioData[0]?bioData[0].rujukan:25;
  var refPer=perData[0]?perData[0].nab:0.5;

  /* Hitung nilai tertinggi */
  var maxBio=bioData.length?Math.max.apply(null,bioData.map(function(r){return r.kreatinin;})):0;
  var maxPer=perData.length?Math.max.apply(null,perData.map(function(r){return r.hasil;})):0;
  var pctBio=refBio?Math.round(maxBio/refBio*100):0;
  var pctPer=refPer?Math.round(maxPer/refPer*100):0;

  var regs=[
    {lbl:"BEI ACGIH 2024",val:refBio+" µg/g kreat.",tipe:"Biomarker (S-PMA Urin)"},
    {lbl:"NAB Kemenaker No.5/2018",val:refPer+" ppm",tipe:"Personal Sampling (Udara)"},
    {lbl:"TLV-C ACGIH 2024",val:"2.5 ppm",tipe:"Ceiling (tidak boleh dilampau sesaat)"},
    {lbl:"IARC Classification",val:"Group 1",tipe:"Karsinogen manusia terbukti (AML)"},
  ];

  var reksData=[
    {
      judul: totalMel>0?"⚕ Tindak Lanjut Medis Segera":"✓ Pertahankan Program",
      warna: totalMel>0?"var(--red)":"var(--green-dark)",
      bg:    totalMel>0?"var(--red-soft)":"var(--green-soft)",
      grad:  totalMel>0?"var(--grad-red)":"var(--grad-green)",
      items:[
        totalMel>0
          ?"Pemeriksaan hematologi lengkap (CBC + diferensial) untuk "+totalMel+" pekerja yang melebihi batas — konsultasi SpOK untuk risk assessment individual"
          :"Pertahankan program biomonitoring rutin — prinsip ALARA wajib diterapkan untuk benzene (IARC Group 1) meskipun nilai masih dalam batas",
        melBio>0?"Nilai tertinggi biomarker: "+maxBio.toFixed(1)+" µg/g kreat. ("+pctBio+"% dari BEI) — perlu re-sampling dalam 3 bulan":"Biomarker benzene: semua "+bioData.length+" sampel dalam batas BEI ACGIH 2024 (≤"+refBio+" µg/g kreat.)",
        melPer>0?"Nilai tertinggi personal sampling: "+maxPer.toFixed(3)+" ppm ("+pctPer+"% dari NAB) — audit sumber paparan segera":"Personal sampling benzene: semua "+perData.length+" titik dalam batas NAB Kemenaker (≤"+refPer+" ppm)",
      ]
    },
    {
      judul:"🔧 Pengendalian Teknis & Administratif",
      warna:"var(--blue)",
      bg:"var(--blue-soft)",
      grad:"var(--grad-blue)",
      items:[
        "Verifikasi dan perbaiki sistem Local Exhaust Ventilation (LEV) di pump room, cargo manifold, dan area bunkering — standar minimum airflow 150 fpm",
        "Terapkan closed-loop system untuk bunkering dan cargo handling — minimalkan pembukaan manhole saat proses transfer",
        "Wajibkan permit-to-work untuk entry ke cargo tank dan pump room dengan gas monitoring real-time — batas intervensi 10% LEL benzene",
        "Pastikan APD full-face respirator dengan cartridge OV/P100 tersedia dan digunakan di seluruh area berisiko tinggi paparan benzene",
      ]
    },
    {
      judul:"📋 Program Monitoring Jangka Panjang",
      warna:"#7B1FA2",
      bg:"#F3E5F5",
      grad:"var(--grad-purple)",
      items:[
        "Jadwalkan biomonitoring benzene rutin setiap 6 bulan untuk seluruh ABK yang terpapar reguler — dokumentasikan tren nilai individu",
        "Daftarkan ABK berisiko tinggi dalam program medical surveillance jangka panjang sesuai Permenaker 05/2018 Lampiran IV Tabel Hazard Kimia",
        "Kompilasi laporan biomonitoring tahunan untuk audit ISM Code, biro klasifikasi, dan PSC — cantumkan dalam Health Record ABK",
      ]
    },
  ];

  var html='';

  /* Regulasi reference strip */
  html+='<div style="background:var(--blue-soft);border:1px solid var(--border);border-left:4px solid var(--blue);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px">'
    +'<div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:10px"><i class="fas fa-scale-balanced" style="margin-right:7px"></i>Nilai Ambang Batas (NAB) &amp; Biological Exposure Indices (BEI) — Acuan Resmi</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">'
    +regs.map(function(r){
      return'<div style="background:#fff;border-radius:var(--radius-xs);padding:10px 12px;border:1px solid var(--border)">'
        +'<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">'+r.tipe+'</div>'
        +'<div style="font-size:13px;font-weight:800;color:var(--blue);font-family:var(--font2)">'+r.val+'</div>'
        +'<div style="font-size:10.5px;color:var(--text-mid);margin-top:2px">'+r.lbl+'</div>'
        +'</div>';
    }).join("")
    +'</div></div>';

  /* Rekomendasi cards */
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">'
    +reksData.map(function(rek){
      return'<div style="background:#fff;border:1.5px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-xs);overflow:hidden">'
        +'<div style="padding:13px 16px;background:'+rek.grad+'">'
        +'<div style="font-size:13px;font-weight:700;color:#fff;line-height:1.3">'+rek.judul+'</div>'
        +'</div>'
        +'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:9px">'
        +rek.items.map(function(item){
          return'<div style="display:flex;gap:9px;align-items:flex-start">'
            +'<div style="width:6px;height:6px;background:'+rek.warna+';border-radius:50%;flex-shrink:0;margin-top:6px"></div>'
            +'<div style="font-size:11.5px;color:var(--text-mid);line-height:1.65">'+item+'</div>'
            +'</div>';
        }).join("")
        +'</div></div>';
    }).join("")
    +'</div>';

  el.innerHTML=html;
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
  /* PNG actual: 1126×316 → SVG 900×253 (scale=0.79929) */
  svg.setAttribute('viewBox','0 0 900 253');

  /* Background image */
  var img=document.createElementNS(S,'image');
  img.setAttribute('href','https://raw.githubusercontent.com/imperor21/IH-PPN-III/main/ship_profile.png');
  img.setAttribute('x','0');img.setAttribute('y','0');
  img.setAttribute('width','900');img.setAttribute('height','253');
  img.setAttribute('preserveAspectRatio','xMinYMin meet');
  svg.appendChild(img);

  /* Zone overlay — koordinat dari pixel scan aktual PNG
     Boundary dari analisa warna pixel y=180 topview (lebar sama, 1126px):
       Acc/Cargo  : PNG x=248 → SVG x=198
       Cargo/Pump : PNG x=724 → SVG x=579
       Pump/Fore  : PNG x=876 → SVG x=700
       Fore end   : PNG x=1119→ SVG x=894                              */
  function zone(id,x,y,w,h,col){
    var g=document.createElementNS(S,'g');
    g.setAttribute('cursor','pointer');
    var r=document.createElementNS(S,'rect');
    r.setAttribute('x',String(x+1));r.setAttribute('y',String(y+1));
    r.setAttribute('width',String(w-2));r.setAttribute('height',String(h-2));
    r.setAttribute('fill',col);r.setAttribute('fill-opacity','0.10');
    r.setAttribute('stroke',col);r.setAttribute('stroke-width','2');
    r.setAttribute('stroke-opacity','0.60');r.setAttribute('rx','4');
    g.appendChild(r);
    g.addEventListener('click',function(){hcvZoneClick(id);});
    g.addEventListener('mouseenter',function(){
      r.setAttribute('fill-opacity','0.25');r.setAttribute('stroke-opacity','1');
    });
    g.addEventListener('mouseleave',function(){
      r.setAttribute('fill-opacity','0.10');r.setAttribute('stroke-opacity','0.60');
    });
    svg.appendChild(g);
  }

  /* PROFILE ZONES (SVG 900×253)
     bridge  : x=0   → x=198  (acc block penuh)
     engine  : x=0   → x=198  y=155→253  (lower acc = engine room)
     cargo   : x=198 → x=579  (cargo tank area)
     pump    : x=579 → x=700  (pump room)
     fore    : x=700 → x=894  (forecastle & mooring)               */
  zone('bridge', 0,   0,  198, 253, '#FF8F00');
  zone('engine', 0, 155,  198,  98, '#C62828');
  zone('cargo', 198,  0,  381, 253, '#B71C1C');
  zone('pump',  579,  0,  121, 253, '#E63946');
  zone('fore',  700,  0,  194, 253, '#FF8F00');
}

/* ── TOP VIEW SVG ── */
function hcvRenderTop(){
  var svg=document.getElementById('hcvTopSVG');
  if(!svg)return;
  var S='http://www.w3.org/2000/svg';
  svg.innerHTML='';
  /* PNG actual: 1126×366 → SVG 900×293 (scale=0.79929) */
  svg.setAttribute('viewBox','0 0 900 293');

  /* Background image */
  var img=document.createElementNS(S,'image');
  img.setAttribute('href','https://raw.githubusercontent.com/imperor21/IH-PPN-III/main/ship_topview.png');
  img.setAttribute('x','0');img.setAttribute('y','0');
  img.setAttribute('width','900');img.setAttribute('height','293');
  img.setAttribute('preserveAspectRatio','xMinYMin meet');
  svg.appendChild(img);

  /* Zone overlay dari pixel scan aktual PNG 1126×366
     Scan y=180 (PNG) = y=144 SVG → warna per x:
       x=40-248 PNG (SVG 32-198)   : ORANGE  = Accommodation/Bridge
       x=248-724 PNG (SVG 198-579) : RED     = Cargo Tanks
       x=724-876 PNG (SVG 579-700) : PINK    = Pump Room
       x=876-1070 PNG (SVG 700-855): ORANGE  = Forecastle
     Scan vertikal (PNG y) kapal di x=500:
       Ship TOP : y=120 PNG → SVG 96
       Ship BOT : y=330 PNG → SVG 264                                    */
  var YTOP=96, YBOT=264, YMID=Math.round((96+264)/2); /* 180 */

  function zoneRect(id,x,y,w,h,col){
    var g=document.createElementNS(S,'g');
    g.setAttribute('cursor','pointer');
    var r=document.createElementNS(S,'rect');
    r.setAttribute('x',String(x+1));r.setAttribute('y',String(y+1));
    r.setAttribute('width',String(w-2));r.setAttribute('height',String(h-2));
    r.setAttribute('fill',col);r.setAttribute('fill-opacity','0.10');
    r.setAttribute('stroke',col);r.setAttribute('stroke-width','2');
    r.setAttribute('stroke-opacity','0.60');r.setAttribute('rx','4');
    g.appendChild(r);
    g.addEventListener('click',function(){hcvZoneClick(id);});
    g.addEventListener('mouseenter',function(){
      r.setAttribute('fill-opacity','0.25');r.setAttribute('stroke-opacity','1');
    });
    g.addEventListener('mouseleave',function(){
      r.setAttribute('fill-opacity','0.10');r.setAttribute('stroke-opacity','0.60');
    });
    svg.appendChild(g);
  }

  function zonePath(id,d,col){
    var g=document.createElementNS(S,'g');
    g.setAttribute('cursor','pointer');
    var p=document.createElementNS(S,'path');
    p.setAttribute('d',d);
    p.setAttribute('fill',col);p.setAttribute('fill-opacity','0.10');
    p.setAttribute('stroke',col);p.setAttribute('stroke-width','2');
    p.setAttribute('stroke-opacity','0.60');
    g.appendChild(p);
    g.addEventListener('click',function(){hcvZoneClick(id);});
    g.addEventListener('mouseenter',function(){
      p.setAttribute('fill-opacity','0.25');p.setAttribute('stroke-opacity','1');
    });
    g.addEventListener('mouseleave',function(){
      p.setAttribute('fill-opacity','0.10');p.setAttribute('stroke-opacity','0.60');
    });
    svg.appendChild(g);
  }

  /* TOPVIEW ZONES
     bridge  : SVG x=32-198, y=96-264  (acc/anjungan penuh)
     engine  : SVG x=32-198, y=180-264 (lower half = engine bawah)
     cargo   : SVG x=198-579, y=96-264
     pump    : SVG x=579-700, y=96-264
     fore    : bow shape x=700-855, curved kanan                         */
  var H=YBOT-YTOP; /* 168 */
  zoneRect('bridge', 32,  YTOP, 166, H,         '#FF8F00');
  zoneRect('engine', 32,  YMID, 166, YBOT-YMID, '#C62828');
  zoneRect('cargo', 198,  YTOP, 381, H,         '#B71C1C');
  zoneRect('pump',  579,  YTOP, 121, H,         '#E63946');
  /* Forecastle — bow shape mengikuti outline kapal */
  zonePath('fore',
    'M 700 '+YTOP+' L 700 '+YBOT+
    ' L 790 '+YBOT+
    ' Q 855 '+YBOT+' 855 '+YMID+
    ' Q 855 '+YTOP+' 790 '+YTOP+' Z',
    '#FF8F00');

  /* Compass N↑ */
  var nt=document.createElementNS(S,'text');
  nt.setAttribute('x','886');nt.setAttribute('y','20');
  nt.setAttribute('text-anchor','end');
  nt.setAttribute('fill','rgba(0,180,216,.7)');
  nt.setAttribute('font-size','13');nt.setAttribute('font-weight','700');
  nt.setAttribute('font-family','Arial');
  nt.textContent='N \u2191';
  svg.appendChild(nt);
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

/* ─── ACCESS LOG — ringkas, hanya admin ihpis2026 ─── */
async function loadAccessLog(){
  if(!isAdmin()){
    var tb=document.getElementById("alogTableBody");
    if(tb)tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:#C62828"><i class="fas fa-lock" style="margin-right:8px"></i>Hanya Admin yang dapat melihat Access Log.</td></tr>';
    return;
  }
  var tbody=document.getElementById("alogTableBody");
  if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px"></i>Memuat log akses...</td></tr>';
  try{
    var days=parseInt(((document.getElementById("alog-filter-days")||{}).value)||"14");
    var data=await gasPost({action:"getAccessLog",token:getToken(),days:days});
    if(data&&data.status==="ok"){
      rawAlog=data.logs||[];
      filteredAlog=[...rawAlog];
      applyAlogFilters();
      if(rawAlog.length===0){
        if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">'
          +'<i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:8px"></i>'
          +'Belum ada log akses.<br><small>Log akan tercatat otomatis saat ada user login.</small></td></tr>';
      }
    }else if(data&&data.status==="forbidden"){
      if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:#C62828"><i class="fas fa-lock" style="margin-right:8px"></i>Akses ditolak — hanya Admin.</td></tr>';
    }else{
      /* Error paling umum: GAS belum di-redeploy */
      var msg=(data&&data.message)||"Gagal memuat";
      var isDeployError=msg.toLowerCase().includes("tidak dikenal")||msg.toLowerCase().includes("unknown");
      if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px">'
        +'<i class="fas fa-circle-exclamation" style="color:#E65100;font-size:24px;display:block;margin-bottom:10px"></i>'
        +'<b style="color:#E65100">'+esc(msg)+'</b><br>'
        +(isDeployError?'<small style="color:var(--text-muted);margin-top:6px;display:block">Solusi: Buka Google Apps Script → Deploy → Manage deployments → buat deployment baru → copy URL baru ke GAS_URL di script.js</small>':"")
        +'</td></tr>';
    }
  }catch(err){
    if(tbody)tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px;color:#C62828">Error: '+esc(err.message)+'</td></tr>';
  }
}

function applyAlogFilters(){
  var userF=((document.getElementById("alog-filter-user")||{}).value)||"";
  var statusF=((document.getElementById("alog-filter-status")||{}).value)||"";
  var daysF=parseInt(((document.getElementById("alog-filter-days")||{}).value)||"14");
  var cutoff=daysF>0?(Date.now()-daysF*24*60*60*1000):0;
  filteredAlog=rawAlog.filter(function(r){
    if(daysF>0&&new Date(r.timestamp||0).getTime()<cutoff)return false;
    if(userF&&r.username!==userF)return false;
    if(statusF&&r.status!==statusF)return false;
    return true;
  });
  /* Populate user dropdown */
  var userSel=document.getElementById("alog-filter-user");
  if(userSel){
    var cur=userSel.value;
    var users=[...new Set(rawAlog.map(function(r){return r.username;}).filter(Boolean))].sort();
    userSel.innerHTML='<option value="">Semua User</option>'+users.map(function(u){return'<option'+(u===cur?' selected':'')+'>'+esc(u)+'</option>';}).join("");
  }
  renderAlogKPI();
  renderAlogTable(filteredAlog);
}

function renderAlogKPI(){
  var total=filteredAlog.length;
  var success=filteredAlog.filter(function(r){return r.status==="LOGIN_OK";}).length;
  var fail=filteredAlog.filter(function(r){return r.status==="LOGIN_FAIL";}).length;
  var mobile=filteredAlog.filter(function(r){return(r.deviceType||"").toLowerCase()==="mobile";}).length;
  var desktop=filteredAlog.filter(function(r){var dt=(r.deviceType||"").toLowerCase();return dt==="desktop"||dt==="tablet";}).length;
  function set(id,v){var el=document.getElementById(id);if(el)el.textContent=fmtNum(v);}
  set("alog-total-login",total);set("alog-success",success);set("alog-fail",fail);
  set("alog-mobile",mobile);set("alog-desktop",desktop);
}

function renderAlogTable(data){
  var tbody=document.getElementById("alogTableBody");
  if(!tbody)return;
  if(!data||!data.length){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada log pada periode ini</td></tr>';
    var ft=document.getElementById("alogTableFooter");
    if(ft)ft.textContent="Tidak ada data";
    return;
  }
  var devIcon={Mobile:'<i class="fas fa-mobile-screen" style="color:#7B2FBE;margin-right:4px"></i>HP',Tablet:'<i class="fas fa-tablet-screen-button" style="color:#0288D1;margin-right:4px"></i>Tablet',Desktop:'<i class="fas fa-desktop" style="color:#388E3C;margin-right:4px"></i>Desktop'};
  var statusBadge={
    LOGIN_OK:'<span style="background:#E8F5E9;color:#2E7D32;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-check" style="margin-right:3px"></i>Berhasil</span>',
    LOGIN_FAIL:'<span style="background:#FFEBEE;color:#C62828;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-circle-xmark" style="margin-right:3px"></i>Gagal</span>',
    LOGOUT:'<span style="background:#F3F4F6;color:#6B7280;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700"><i class="fas fa-right-from-bracket" style="margin-right:3px"></i>Logout</span>'
  };
  tbody.innerHTML=data.map(function(r){
    var ts=r.timestamp?String(r.timestamp).replace("T"," ").slice(0,16):"—";
    var badge=statusBadge[r.status]||('<span>'+esc(r.status||"—")+'</span>');
    var dev=devIcon[r.deviceType]||('<i class="fas fa-question" style="margin-right:4px"></i>'+esc(r.deviceType||"—"));
    var rc=r.role==="admin"?"#C62828":r.role==="demo"?"#F59E0B":"#1976D2";
    return'<tr>'
      +'<td style="white-space:nowrap;font-size:12px;color:#475569">'+esc(ts)+'</td>'
      +'<td><strong>'+esc(r.username||"—")+'</strong></td>'
      +'<td><span style="background:'+rc+'18;color:'+rc+';padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+esc(r.role||"—")+'</span></td>'
      +'<td>'+badge+'</td>'
      +'<td style="font-size:12px">'+dev+'</td>'
      +'<td style="font-size:12px;color:#475569"><i class="fab fa-'+_getBrowserIcon(r.browser)+'" style="margin-right:5px"></i>'+esc(r.browser||"—")+'</td>'
      +'<td style="font-size:12px;color:#475569">'+esc(r.os||"—")+'</td>'
      +'</tr>';
  }).join("");
  var ft=document.getElementById("alogTableFooter");
  if(ft)ft.textContent="Menampilkan "+data.length+" dari "+rawAlog.length+" entri";
}

function _getBrowserIcon(b){
  var m={"Chrome":"chrome","Firefox":"firefox","Safari":"safari","Edge":"edge","Opera":"opera","Samsung":"samsung-internet"};
  return m[b]||"globe";
}

/* alogSortCol & alogSortDir sudah dideklarasi di atas (rawAlog line) — duplikat dihapus */
function sortAlogTable(col){
  if(alogSortCol===col)alogSortDir*=-1;else{alogSortCol=col;alogSortDir=-1;}
  var keys=["timestamp","username","role","status","deviceType","browser","os"];
  filteredAlog.sort(function(a,b){return String(a[keys[col]]||"").localeCompare(String(b[keys[col]]||""),undefined,{numeric:true})*alogSortDir;});
  renderAlogTable(filteredAlog);
}
function searchAlogTable(){
  var q=((document.getElementById("alog-search")||{}).value||"").toLowerCase();
  var res=q?filteredAlog.filter(function(r){
    return(r.username||"").toLowerCase().includes(q)||(r.browser||"").toLowerCase().includes(q)||(r.os||"").toLowerCase().includes(q)||(r.deviceType||"").toLowerCase().includes(q);
  }):filteredAlog;
  renderAlogTable(res);
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT PPT — 5 HAZARD UTAMA + BIOMARKER BENZENE
   Premium Design — Data Real Dashboard — Bahasa Akademis
   Permenaker 05/2018 — 5 Hirarki Pengendalian Risiko
═══════════════════════════════════════════════════════════════ */

var HAZARD_CONFIG={
  fisika:{label:"Faktor Fisika",icon:"⚡",color:"1565C0",
    data:function(){return typeof filteredFisika!=="undefined"?filteredFisika:(typeof rawFisika!=="undefined"?rawFisika:[]);},
    shipKey:"Nama Kapal",paramKey:"Jenis Parameter",valKey:"Hasil Pengukuran",
    nabKey:"NAB / TLV",pctKey:"% terhadap NAB",statusKey:"Status",unitKey:"Satuan",
    cols:["Nama Kapal","Fleet","Area / Titik Ukur","Jenis Parameter","Hasil","Satuan","% NAB","Status"]
  },
  kimia:{label:"Faktor Kimia",icon:"⚗",color:"7B1FA2",
    data:function(){return typeof filteredKimia!=="undefined"?filteredKimia:(typeof rawKimia!=="undefined"?rawKimia:[]);},
    shipKey:"Nama Kapal",paramKey:"Nama Bahan Kimia",valKey:"Hasil Pengukuran",
    nabKey:"TLV-TWA ACGIH",pctKey:"% terhadap TLV/BEI",statusKey:"Status",unitKey:"Satuan",
    cols:["Nama Kapal","Fleet","Bahan Kimia","Metode","Hasil","Satuan","% TLV","Status"]
  },
  biologi:{label:"Faktor Biologi",icon:"🦠",color:"2E7D32",
    data:function(){return typeof filteredBiologi!=="undefined"?filteredBiologi:(typeof rawBiologi!=="undefined"?rawBiologi:[]);},
    shipKey:"Nama Kapal",paramKey:"Nama Agen / Spesies",valKey:"Hasil Pengukuran",
    nabKey:"Baku Mutu / Referensi",pctKey:"",statusKey:"Status",unitKey:"Satuan",
    cols:["Nama Kapal","Fleet","Area / Lokasi","Jenis Agen","Nama Agen","Hasil","Satuan","Status"]
  },
  ergonomi:{label:"Faktor Ergonomi",icon:"🦴",color:"E65100",
    data:function(){return typeof filteredErgonomi!=="undefined"?filteredErgonomi:(typeof rawErgonomi!=="undefined"?rawErgonomi:[]);},
    shipKey:"Nama Kapal",paramKey:"Jenis Pekerjaan / Tugas",valKey:"Skor",
    nabKey:"",pctKey:"",statusKey:"Status TL",unitKey:"",
    cols:["Nama Kapal","Fleet","Area / Unit Kerja","Jenis Pekerjaan","Metode","Skor","Level Risiko","Status TL"]
  },
  psikososial:{label:"Faktor Psikososial",icon:"🧠",color:"AD1457",
    data:function(){return typeof filteredPsikososial!=="undefined"?filteredPsikososial:(typeof rawPsikososial!=="undefined"?rawPsikososial:[]);},
    shipKey:"Nama Kapal",paramKey:"Departemen / Jabatan",valKey:"Total Skor",
    nabKey:"",pctKey:"",statusKey:"Status TL",unitKey:"",
    cols:["Nama Kapal","Fleet","Departemen","Instrumen","Responden","Total Skor","Level Risiko","Status TL"]
  }
};

var HIRARKI_PENGENDALIAN={
  fisika:{
    "1":"Eliminasi sumber bising/panas/getaran — redesain proses operasional yang mengeliminasi hazard fisika",
    "2":"Substitusi peralatan bising tinggi dengan model emisi rendah (low-noise pump, vibration-isolated engine)",
    "3":"Rekayasa teknik: enclosure mesin, vibration isolator, ventilasi mekanis, heat shield & AC ruang kerja",
    "4":"Administratif: rotasi kerja, batas paparan harian, jadwal maintenance rutin, SOP area hazard fisika",
    "5":"APD: ear plug (NRR≥25dB), ear muff, baju anti panas, face shield sesuai SNI & ACGIH TLV 2024"
  },
  kimia:{
    "1":"Eliminasi penggunaan bahan kimia berbahaya — reformulasi proses tanpa benzene/VOC karsinogenik",
    "2":"Substitusi bahan kimia dengan alternatif toksisitas lebih rendah — audit MSDS & LCA bahan pengganti",
    "3":"Rekayasa teknik: Local Exhaust Ventilation (LEV), closed-loop transfer system, gas monitoring real-time",
    "4":"Administratif: SOP B3, MSDS awareness training, izin kerja khusus area kimia, batas waktu paparan",
    "5":"APD: respirator full-face OV/P100, coverall Tyvek Type 5/6, gloves nitrile heavy duty sesuai ACGIH"
  },
  biologi:{
    "1":"Eliminasi media pertumbuhan agen biologi — desinfeksi total area dengan protokol sterilisasi WHO",
    "2":"Substitusi material rentan kontaminasi dengan bahan anti-mikroba bersertifikat",
    "3":"Rekayasa teknik: UV sterilizer, HEPA filter ventilasi, positive/negative pressure room",
    "4":"Administratif: SOP higiene personal ketat, protokol cuci tangan, roster pemantauan kesehatan ABK",
    "5":"APD: masker N95/P100, gloves nitrile, face shield, coverall untuk area berisiko tinggi"
  },
  ergonomi:{
    "1":"Eliminasi tugas berisiko MSDs melalui full automation atau redesain proses kerja",
    "2":"Substitusi peralatan manual dengan mechanical handling aid (crane, hoist, conveyor)",
    "3":"Rekayasa teknik: workstation adjustable ergonomis, kursi dengan lumbar support, meja height-adjustable",
    "4":"Administratif: program micro-break setiap 2 jam, rotasi kerja, pelatihan postur kerja ergonomis",
    "5":"APD: back support brace, knee pad, anti-vibration gloves sesuai ISO 11228 & NIOSH Lifting Equation"
  },
  psikososial:{
    "1":"Eliminasi stresor kronis: redesain beban kerja tidak realistis dan sistem kerja tidak manusiawi",
    "2":"Substitusi sistem manajemen yang menciptakan konflik peran dengan model partisipatif",
    "3":"Rekayasa lingkungan: ruang istirahat memadai, area relaksasi, fasilitas komunikasi dengan keluarga",
    "4":"Administratif: konseling rutin, peer support program, jam kerja sesuai MLC 2006, jadwal libur teratur",
    "5":"Program EAP (Employee Assistance Program), akses psikolog industri, dan stress management training"
  }
};

function _hzBg(col){var m={"1565C0":"EBF5FF","7B1FA2":"F3E5F5","2E7D32":"E8F5E9","E65100":"FFF3E0","AD1457":"FCE4EC","C62828":"FFEBEE","F59E0B":"FEF3C7","C9973A":"FEF9E7","0288D1":"E3F2FD","6A1B9A":"F3E5F5"};return m[col]||"F4F6FA";}
function _hzFs(s){return String(s).length>9?14:String(s).length>6?18:String(s).length>4?23:29;}
function _hzFmt(v){if(!v&&v!==0)return"—";var n=parseFloat(v);if(isNaN(n))return String(v);if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+"M";if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+"Jt";return String(v);}

async function exportHazardPPT(hazardType){
  if(typeof _awaitPptx==="function"){var ok=await _awaitPptx();if(!ok){showToast("Library PPT gagal dimuat. Coba refresh halaman.","error");return;}} else if(typeof PptxGenJS==="undefined"){showToast("Library PPT sedang dimuat, coba lagi.","warning");return;}
  var cfg=HAZARD_CONFIG[hazardType];
  if(!cfg){showToast("Konfigurasi hazard tidak ditemukan.","error");return;}
  var data=cfg.data();
  if(!data||!data.length){showToast("Tidak ada data "+cfg.label+".","warning");return;}
  showToast("Membuat PPT "+cfg.label+"...","info");

  var AC=cfg.color;
  var tgl=new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  var total=data.length;
  var melebihi=data.filter(function(r){
    var s=(r[cfg.statusKey]||"").toLowerCase();
    return s.includes("melebihi")||s.includes("tinggi")||s.includes("kritis")||s.includes("abnormal");
  }).length;
  var normal=total-melebihi;
  var pctOK=total>0?((normal/total)*100).toFixed(1):"100.0";
  var stC=parseFloat(pctOK)>=80?"2E7D32":parseFloat(pctOK)>=60?"F59E0B":"C62828";
  /* Distribusi per kapal */
  var kapalMap={};
  data.forEach(function(r){
    var k=r[cfg.shipKey]||"—";
    if(!kapalMap[k])kapalMap[k]={t:0,m:0};
    kapalMap[k].t++;
    var s=(r[cfg.statusKey]||"").toLowerCase();
    if(s.includes("melebihi")||s.includes("tinggi")||s.includes("kritis"))kapalMap[k].m++;
  });
  /* Parameter dominan */
  var paramMap={};
  data.forEach(function(r){var p=r[cfg.paramKey]||"Lainnya";paramMap[p]=(paramMap[p]||0)+1;});
  var paramTop=Object.entries(paramMap).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  /* BULAN distribusi */
  var bulanMap={};
  (typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:[]).forEach(function(b){bulanMap[b]=0;});
  data.forEach(function(r){var b=r["Bulan"]||r["Bulan Pelaksanaan"]||"";if(b&&bulanMap[b]!==undefined)bulanMap[b]++;});
  var bulanPPT=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  var bulanFull=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  var pr=new PptxGenJS();
  pr.layout="LAYOUT_WIDE";
  pr.author="IH Dashboard v5.0 — PT Pertamina Patra Niaga III";
  pr.title=cfg.icon+" "+cfg.label+" — 5 Hirarki Pengendalian Risiko";

  var M={navy:"0F2A4A",navD:"0A1929",navL:"1C3A5A",nav2:"162E42",
    wht:"FFFFFF",gry:"F4F6FA",lgr:"E2E8F0",txt:"1E293B",
    mut:"64748B",gld:"C9973A",grn:"2E7D32",red:"C62828",amb:"F59E0B"};

  function hdrSlide(s,acc,sup,main){
    s.background={color:M.wht};
    s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:M.navy},line:{color:M.navy,width:0}});
    s.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:acc},line:{color:acc,width:0}});
    s.addText(sup,{x:0.22,y:0.08,w:12.8,h:0.36,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:1.5,fontFace:"Calibri"});
    s.addText(main,{x:0.22,y:0.5,w:12.8,h:0.46,fontSize:14,bold:true,color:M.wht,fontFace:"Calibri"});
  }
  function ftrSlide(s,pg,tot){
    s.addShape(pr.ShapeType.rect,{x:0,y:7.18,w:13.3,h:0.32,fill:{color:M.gry},line:{color:M.gry,width:0}});
    s.addText("Permenaker 05/2018  •  ACGIH TLV & BEI 2024  •  ISO 45001:2018  •  IMO MSC/Circ.1351",
      {x:0.2,y:7.2,w:10.9,h:0.26,fontSize:7.5,color:M.mut,fontFace:"Calibri"});
    s.addText(pg+" / "+tot,{x:11.3,y:7.2,w:1.8,h:0.26,fontSize:9,color:M.gld,bold:true,align:"right",fontFace:"Calibri"});
  }
  function kpiBox(s,x,y,w,h,lbl,val,col){
    var bg=_hzBg(col);
    s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,fill:{color:bg},line:{color:col,width:1.5},rectRadius:0.08});
    s.addShape(pr.ShapeType.rect,{x:x,y:y+h-0.06,w:w,h:0.06,fill:{color:col},line:{color:col,width:0}});
    s.addText(String(val),{x:x,y:y+0.07,w:w,h:h*0.56,fontSize:_hzFs(val),bold:true,color:col,align:"center",fontFace:"Calibri"});
    s.addText(lbl,{x:x+0.08,y:y+h*0.6,w:w-0.16,h:h*0.38,fontSize:9,color:M.mut,align:"center",fontFace:"Calibri",wrap:true});
  }
  function progressBar(s,x,y,w,pct,col,lbl){
    s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:0.28,fill:{color:M.lgr},line:{color:M.lgr,width:0},rectRadius:0.06});
    if(pct>0)s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:Math.min(pct/100,1)*w,h:0.28,fill:{color:col},line:{color:col,width:0},rectRadius:0.06});
    s.addText(lbl+" — "+Math.round(pct)+"%",{x:x,y:y+0.32,w:w,h:0.26,fontSize:10,bold:true,color:col,fontFace:"Calibri"});
  }
  function anaBox(s,x,y,w,h,col,title,body){
    s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,fill:{color:_hzBg(col)},line:{color:col,width:0},rectRadius:0.08});
    s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.06,h:h,fill:{color:col},line:{color:col,width:0}});
    s.addText([{text:title+": ",options:{bold:true,color:col,fontSize:11}},{text:body,options:{color:M.txt,fontSize:11}}],
      {x:x+0.2,y:y+0.1,w:w-0.3,h:h-0.2,fontFace:"Calibri",wrap:true,valign:"top"});
  }
  function barChart(s,x,y,w,h,bData,title,accent){
    s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:h,fill:{color:"FAFBFF"},line:{color:M.lgr,width:0.5}});
    if(title)s.addText(title,{x:x,y:y-0.28,w:w,h:0.26,fontSize:10,bold:true,color:M.navy,fontFace:"Calibri"});
    var vals=bData.map(function(d){return d.v||0;});
    var mx=Math.max.apply(null,vals)||1;
    var n=bData.length; var bw=w/n; var pad=bw*0.15;
    [0.5,1.0].forEach(function(f){
      var gy=y+h-(f*h*0.88);
      s.addShape(pr.ShapeType.rect,{x:x,y:gy,w:w,h:0.01,fill:{color:M.lgr},line:{color:M.lgr,width:0}});
      s.addText(Math.round(mx*f),{x:x-0.36,y:gy-0.12,w:0.34,h:0.24,fontSize:7.5,color:M.mut,align:"right",fontFace:"Calibri"});
    });
    bData.forEach(function(d,i){
      var v=d.v||0; var bh=(v/mx)*h*0.88; var bx=x+i*bw+pad;
      var col=d.c||(v===Math.max.apply(null,vals)?M.gld:accent||AC);
      if(bh>0){
        s.addShape(pr.ShapeType.roundRect,{x:bx,y:y+h-bh,w:bw-pad*2,h:bh,fill:{color:col},line:{color:M.wht,width:0.5},rectRadius:0.04});
        if(v>0)s.addText(String(v),{x:bx,y:y+h-bh-0.26,w:bw-pad*2,h:0.24,fontSize:8.5,bold:true,color:col,align:"center",fontFace:"Calibri"});
      }
      s.addText(d.lbl,{x:bx-pad*0.5,y:y+h+0.04,w:bw,h:0.22,fontSize:7.5,color:M.mut,align:"center",fontFace:"Calibri"});
    });
    s.addShape(pr.ShapeType.rect,{x:x,y:y+h,w:w,h:0.03,fill:{color:M.navy},line:{color:M.navy,width:0}});
  }
  function hbarChart(s,x,y,w,items,accent){
    var mx=items.reduce(function(a,d){return Math.max(a,d.v||0);},1);
    items.forEach(function(d,i){
      var iy=y+i*0.52; var bw=((d.v||0)/mx)*(w-1.5);
      var col=d.c||(i===0?M.gld:accent||AC);
      var lbl=String(d.lbl); if(lbl.length>22)lbl=lbl.slice(0,21)+"…";
      s.addText(lbl,{x:x,y:iy,w:1.4,h:0.38,fontSize:9.5,color:M.txt,fontFace:"Calibri",valign:"middle"});
      s.addShape(pr.ShapeType.rect,{x:x+1.48,y:iy+0.07,w:w-1.5,h:0.24,fill:{color:M.lgr},line:{color:M.lgr,width:0}});
      if(bw>0)s.addShape(pr.ShapeType.roundRect,{x:x+1.48,y:iy+0.07,w:bw,h:0.24,fill:{color:col},line:{color:col,width:0},rectRadius:0.03});
      s.addText(String(d.v),{x:x+1.48+bw+0.05,y:iy,w:0.5,h:0.38,fontSize:9.5,bold:true,color:col,fontFace:"Calibri"});
    });
  }

  /* ─────────── S1: COVER ─────────── */
  var s1=pr.addSlide();
  s1.background={color:M.navD};
  s1.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:AC},line:{color:AC,width:0}});
  s1.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:0.05,fill:{color:AC},line:{color:AC,width:0}});
  s1.addShape(pr.ShapeType.ellipse,{x:8.8,y:-1.5,w:6.5,h:6.5,fill:{color:M.navL},line:{color:M.navL,width:0}});
  s1.addShape(pr.ShapeType.ellipse,{x:10.5,y:5.0,w:4.0,h:4.0,fill:{color:M.nav2},line:{color:M.nav2,width:0}});
  s1.addText("PT PERTAMINA PATRA NIAGA  ·  SATUAN KERJA REGIONAL III",
    {x:0.28,y:0.2,w:9,h:0.28,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:2,fontFace:"Calibri"});
  s1.addText("Divisi Industrial Hygiene & Occupational Health  ·  IH Dashboard v5.0",
    {x:0.28,y:0.5,w:9,h:0.26,fontSize:9.5,color:"8899AA",fontFace:"Calibri"});
  s1.addShape(pr.ShapeType.rect,{x:0.28,y:0.86,w:5.0,h:0.04,fill:{color:M.gld},line:{color:M.gld,width:0}});
  s1.addText("5 HIRARKI PENGENDALIAN RISIKO",
    {x:0.28,y:1.02,w:9.0,h:0.72,fontSize:32,bold:true,color:M.wht,charSpacing:2,fontFace:"Calibri"});
  s1.addText(cfg.icon+"  "+cfg.label.toUpperCase(),
    {x:0.28,y:1.82,w:9.0,h:0.65,fontSize:26,bold:true,color:AC,fontFace:"Calibri"});
  s1.addShape(pr.ShapeType.rect,{x:0.28,y:2.56,w:5.0,h:0.04,fill:{color:AC},line:{color:AC,width:0}});
  s1.addText([
    {text:"Total Data: ",options:{color:"CADCFC",fontSize:12}},
    {text:String(total)+"  ",options:{bold:true,color:M.wht,fontSize:12}},
    {text:"Melebihi Standar NAB: ",options:{color:"CADCFC",fontSize:12}},
    {text:String(melebihi)+(melebihi>0?" ⚠":"  ✓"),options:{bold:true,color:melebihi>0?"FF6B6B":M.wht,fontSize:12}},
    {text:"   Compliance: "+pctOK+"%",options:{color:"8899AA",fontSize:11}}
  ],{x:0.28,y:2.68,w:12.8,h:0.44,fontFace:"Calibri"});
  /* 5 Pilar Hirarki Visual */
  var H5=[
    {no:"1",l:"ELIMINASI",s:"Hilangkan sumber bahaya",c:"C62828"},
    {no:"2",l:"SUBSTITUSI",s:"Ganti lebih aman",c:"E65100"},
    {no:"3",l:"REC. TEKNIK",s:"Engineering control",c:"1565C0"},
    {no:"4",l:"ADMINISTR.",s:"SOP & prosedur",c:"2E7D32"},
    {no:"5",l:"APD",s:"Alat Pelindung Diri",c:"6A1B9A"}
  ];
  H5.forEach(function(p,i){
    var bx=0.28+i*2.56;
    s1.addShape(pr.ShapeType.roundRect,{x:bx,y:3.38,w:2.44,h:3.0,fill:{color:p.c},line:{color:M.wht,width:1},rectRadius:0.08});
    s1.addShape(pr.ShapeType.rect,{x:bx,y:3.38,w:2.44,h:0.05,fill:{color:M.wht},line:{color:M.wht,width:0}});
    s1.addText(p.no,{x:bx,y:3.46,w:2.44,h:0.58,fontSize:28,bold:true,color:"CCCCCC",align:"center",fontFace:"Calibri"});
    s1.addText(p.l,{x:bx+0.08,y:4.08,w:2.28,h:0.5,fontSize:11,bold:true,color:M.wht,align:"center",fontFace:"Calibri"});
    s1.addText(p.s,{x:bx+0.08,y:4.62,w:2.28,h:0.88,fontSize:9.5,color:"DDDDDD",align:"center",fontFace:"Calibri",wrap:true});
  });
  s1.addText("Ref: Permenaker 05/2018  •  ISO 45001:2018  •  IH Dashboard v5.0  •  "+tgl,
    {x:0,y:7.14,w:13.3,h:0.28,fontSize:8,color:"445566",align:"center",fontFace:"Calibri"});

  /* ─────────── S2: EXECUTIVE SUMMARY + CHART ─────────── */
  var s2=pr.addSlide();
  hdrSlide(s2,AC,cfg.icon+" "+cfg.label.toUpperCase()+"  ·  EXECUTIVE SUMMARY",
    "Ringkasan Eksekutif — Hasil Pengukuran "+cfg.label+" & Status Kepatuhan NAB");
  kpiBox(s2,0.22,1.22,2.95,1.52,"Total Pengukuran",total,AC);
  kpiBox(s2,3.27,1.22,2.95,1.52,"Normal / Aman",normal+(parseFloat(pctOK)>=80?" ✓":""),"2E7D32");
  kpiBox(s2,6.32,1.22,2.95,1.52,"Melebihi NAB",melebihi+(melebihi>0?" ⚠":""),melebihi>0?"C62828":"2E7D32");
  kpiBox(s2,9.37,1.22,2.95,1.52,"Compliance Rate",pctOK+"%",stC);
  progressBar(s2,0.22,2.9,12.86,parseFloat(pctOK),stC,"Compliance Rate — Pengukuran dalam Batas NAB");
  /* Bar chart per parameter */
  if(paramTop.length){
    barChart(s2,0.22,3.42,7.8,2.92,
      paramTop.map(function(p){return{lbl:p[0].length>8?p[0].slice(0,7)+"…":p[0],v:p[1],c:AC};}),
      "Distribusi per Parameter Hazard",AC);
  }
  /* Kapal top 4 */
  var kTop=Object.entries(kapalMap).sort(function(a,b){return b[1].t-a[1].t;}).slice(0,4);
  s2.addText("Top Kapal per Volume Data",{x:8.62,y:3.42,w:4.46,h:0.26,fontSize:9.5,bold:true,color:M.navy,fontFace:"Calibri"});
  kTop.forEach(function(k,i){
    var ky=3.76+i*0.76;
    var hasMel=k[1].m>0;
    var kc=hasMel?"C62828":"2E7D32";
    s2.addShape(pr.ShapeType.roundRect,{x:8.62,y:ky,w:4.46,h:0.66,fill:{color:_hzBg(kc)},line:{color:kc,width:1},rectRadius:0.06});
    var kn=k[0].length>20?k[0].slice(0,18)+"…":k[0];
    s2.addText(kn,{x:8.72,y:ky+0.06,w:2.6,h:0.28,fontSize:10,bold:true,color:kc,fontFace:"Calibri"});
    s2.addText(k[1].t+" data"+(hasMel?" • "+k[1].m+" melebihi":""),
      {x:8.72,y:ky+0.34,w:3.0,h:0.24,fontSize:9.5,color:M.txt,fontFace:"Calibri"});
    s2.addText(hasMel?"⚠":"✓",{x:11.72,y:ky+0.12,w:0.68,h:0.4,fontSize:20,color:kc,align:"center",fontFace:"Calibri"});
  });
  ftrSlide(s2,2,5);

  /* ─────────── S3: DATA TABLE ─────────── */
  var s3=pr.addSlide();
  hdrSlide(s3,AC,cfg.icon+" "+cfg.label.toUpperCase()+"  ·  DATA PENGUKURAN",
    "Rekapitulasi Hasil Pengukuran "+cfg.label+" per Kapal & Parameter — Data Aktual Dashboard");
  var cols3=["No"].concat(cfg.cols);
  var hdrs3=cols3.map(function(c){
    return{text:c,options:{bold:true,color:M.wht,fill:{color:M.navy},fontSize:9,border:{type:"none"},align:"center"}};
  });
  var rows3=data.slice(0,12).map(function(r,i){
    var statusVal=r[cfg.statusKey]||"—";
    var isMel=statusVal.toLowerCase().includes("melebihi")||statusVal.toLowerCase().includes("tinggi")||statusVal.toLowerCase().includes("kritis");
    var cells=[{text:String(i+1),options:{fontSize:9.5,align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}}];
    cfg.cols.forEach(function(col){
      var v=r[col]||"—";
      var isS=col===cfg.statusKey||col==="Status"||col==="Status TL";
      cells.push({text:String(v).slice(0,22),options:{
        fontSize:isS?9.5:9.5,bold:isS,color:isS?(isMel?"C62828":"2E7D32"):M.txt,
        fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"},align:isS?"center":"left"
      }});
    });
    return cells;
  });
  /* colW: No + 8 cols = 9 cols, sum = 12.86 */
  var cw3=[0.32,1.7,0.7,1.4,1.3,1.0,0.9,0.9,1.15,1.49];
  s3.addTable([hdrs3].concat(rows3),{x:0.22,y:1.25,w:12.86,colW:cw3,rowH:0.36,fontFace:"Calibri",border:{type:"none"},fill:{color:M.wht}});
  if(data.length>12)s3.addText("* Menampilkan 12 dari "+data.length+" data. Detail lengkap di IH Dashboard.",
    {x:0.22,y:6.82,w:12.86,h:0.26,fontSize:9,color:M.mut,italic:true,fontFace:"Calibri"});
  ftrSlide(s3,3,5);

  /* ─────────── S4: 5 HIRARKI PENGENDALIAN ─────────── */
  var s4=pr.addSlide();
  hdrSlide(s4,AC,cfg.icon+" "+cfg.label.toUpperCase()+"  ·  5 HIRARKI PENGENDALIAN",
    "Rekomendasi Pengendalian Risiko — Hierarki ISO 45001:2018 & Permenaker 05/2018 Spesifik "+cfg.label);
  var hDB=HIRARKI_PENGENDALIAN[hazardType]||{};
  var hirCols=["C62828","E65100","1565C0","2E7D32","6A1B9A"];
  var hirLabels=["1. ELIMINASI","2. SUBSTITUSI","3. REKAYASA TEKNIK","4. ADMINISTRATIF","5. APD"];
  var hirHeights=[1.52,1.44,1.36,1.28,1.18];
  var curY=1.25;
  hirLabels.forEach(function(hl,i){
    var mg=i*0.16; var bx=0.22+mg; var bw=12.86-mg*2;
    s4.addShape(pr.ShapeType.roundRect,{x:bx,y:curY,w:bw,h:hirHeights[i],
      fill:{color:_hzBg(hirCols[i])},line:{color:hirCols[i],width:1.5},rectRadius:0.07});
    s4.addShape(pr.ShapeType.rect,{x:bx,y:curY,w:0.07,h:hirHeights[i],
      fill:{color:hirCols[i]},line:{color:hirCols[i],width:0}});
    s4.addShape(pr.ShapeType.ellipse,{x:bx+0.16,y:curY+(hirHeights[i]-0.38)/2,w:0.38,h:0.38,
      fill:{color:hirCols[i]},line:{color:hirCols[i],width:0}});
    s4.addText(String(i+1),{x:bx+0.16,y:curY+(hirHeights[i]-0.38)/2,w:0.38,h:0.38,
      fontSize:14,bold:true,color:M.wht,align:"center",fontFace:"Calibri"});
    s4.addText(hl,{x:bx+0.64,y:curY+0.06,w:3.0,h:hirHeights[i]-0.12,
      fontSize:11.5,bold:true,color:hirCols[i],fontFace:"Calibri",valign:"middle"});
    s4.addText(hDB[String(i+1)]||"Implementasikan pengendalian "+hl.toLowerCase()+" spesifik "+cfg.label,
      {x:bx+3.72,y:curY+0.08,w:bw-3.9,h:hirHeights[i]-0.16,
      fontSize:11,color:M.txt,fontFace:"Calibri",wrap:true,valign:"middle"});
    curY+=hirHeights[i]+0.05;
  });
  ftrSlide(s4,4,5);

  /* ─────────── S5: REKOMENDASI ─────────── */
  var s5=pr.addSlide();
  hdrSlide(s5,M.gld,cfg.icon+" "+cfg.label.toUpperCase()+"  ·  REKOMENDASI STRATEGIS",
    "Rekomendasi Tindak Lanjut Berbasis Bukti & Program Pengendalian "+cfg.label+" Jangka Panjang");
  var reks=[
    {p:"Segera (0–30 Hari)",c:"C62828",items:[
      melebihi>0?"Laksanakan tindakan pengendalian teknis segera untuk "+melebihi+" pengukuran melebihi NAB — prioritaskan eliminasi dan rekayasa teknik sesuai hierarki ISO 45001:2018":"Pertahankan program pengendalian yang sudah efektif — lakukan verifikasi rutin",
      "Evaluasi kesesuaian APD yang digunakan ABK dengan jenis dan intensitas paparan yang terukur",
      "Update semua temuan dan status pengendalian di IH Dashboard sebagai bukti kepatuhan"
    ]},
    {p:"Jangka Pendek (1–3 Bulan)",c:AC,items:[
      "Review dan update Job Safety Analysis (JSA) dan HIRARC untuk area dengan temuan melebihi NAB",
      "Lakukan pengukuran ulang (re-measurement) setelah implementasi tindakan pengendalian untuk verifikasi efektivitas",
      "Laksanakan medical surveillance untuk ABK yang terpapar di atas NAB — koordinasikan dengan dokter perusahaan SpOK"
    ]},
    {p:"Jangka Panjang (3–12 Bulan)",c:"1565C0",items:[
      "Integrasikan temuan "+cfg.label+" ke dalam Ship Safety Management System (SMS) sebagai bagian HIRARC permanen",
      "Kembangkan program monitoring berkala — tetapkan jadwal pengukuran rutin minimum satu kali per semester",
      "Kompilasi laporan tahunan "+cfg.label+" untuk keperluan audit ISM Code, biro klasifikasi, dan PSC inspection"
    ]}
  ];
  reks.forEach(function(r,i){
    var rx=0.22+i*4.38;
    s5.addShape(pr.ShapeType.roundRect,{x:rx,y:1.25,w:4.2,h:5.75,fill:{color:_hzBg(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
    s5.addShape(pr.ShapeType.rect,{x:rx,y:1.25,w:4.2,h:0.56,fill:{color:r.c},line:{color:r.c,width:0}});
    s5.addText(r.p,{x:rx+0.12,y:1.29,w:3.96,h:0.48,fontSize:11,bold:true,color:M.wht,fontFace:"Calibri"});
    r.items.forEach(function(it,j){
      s5.addShape(pr.ShapeType.ellipse,{x:rx+0.18,y:2.08+j*1.56,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
      s5.addText(it,{x:rx+0.52,y:2.01+j*1.56,w:3.56,h:1.44,fontSize:11,color:M.txt,fontFace:"Calibri",wrap:true,valign:"top"});
    });
  });
  ftrSlide(s5,5,5);

  pr.writeFile({fileName:"IH_"+hazardType.charAt(0).toUpperCase()+hazardType.slice(1)+"_"+new Date().toISOString().slice(0,10)+".pptx"})
    .then(function(){showToast("PPT "+cfg.label+" berhasil didownload!","success");})
    .catch(function(err){showToast("Gagal: "+err.message,"error");console.error(err);});
}

/* ═══════════════════════════════════════════════════
   BIOMARKER BENZENE — 5 Slide Premium + Chart
═══════════════════════════════════════════════════ */
async function exportBiomarkerPPT(){
  if(typeof _awaitPptx==="function"){var ok=await _awaitPptx();if(!ok){showToast("Library PPT gagal dimuat. Coba refresh halaman.","error");return;}} else if(typeof PptxGenJS==="undefined"){showToast("Library PPT sedang dimuat, coba lagi.","warning");return;}
  var _tahunF=((document.getElementById("bio-filter-tahun")||{}).value)||"";
  var _kapalF=((document.getElementById("bio-filter-kapal")||{}).value)||"";
  var _srcB=(typeof rawBiomarker!=="undefined")?rawBiomarker:[];
  var _srcP=(typeof rawPersonal!=="undefined")?rawPersonal:[];
  var dataB=_srcB.filter(function(r){return(!_tahunF||String(r.tahun)===_tahunF)&&(!_kapalF||r.kapal===_kapalF);});
  var dataP=_srcP.filter(function(r){return(!_tahunF||String(r.tahun)===_tahunF)&&(!_kapalF||r.kapal===_kapalF);});
  if(!dataB.length&&!dataP.length){showToast("Tidak ada data Biomarker.","warning");return;}
  showToast("Membuat PPT Biomarker Benzene...","info");
  var M={navy:"0F2A4A",navD:"0A1929",navL:"1C3A5A",nav2:"162E42",
    wht:"FFFFFF",gry:"F4F6FA",lgr:"E2E8F0",txt:"1E293B",mut:"64748B",gld:"C9973A"};
  var AC="7B1FA2"; var BEI=25; var TLV=0.5;
  var tgl=new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  var totalB=dataB.length;
  var melB=dataB.filter(function(r){return (parseFloat(r.kreatinin)||0)>(parseFloat(r.rujukan)||BEI);}).length;
  var totalP=dataP.length;
  var melP=dataP.filter(function(r){return (parseFloat(r.hasil)||0)>(parseFloat(r.nab)||TLV);}).length;
  var pctB=totalB>0?(((totalB-melB)/totalB)*100).toFixed(1):"100.0";
  var stC=parseFloat(pctB)>=90?"2E7D32":parseFloat(pctB)>=70?"F59E0B":"C62828";
  var pr=new PptxGenJS();
  pr.layout="LAYOUT_WIDE";
  pr.title="Biomonitoring Benzene — IH Dashboard";
  function hS(s,sup,main){
    s.background={color:M.wht};
    s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:M.navy},line:{color:M.navy,width:0}});
    s.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:AC},line:{color:AC,width:0}});
    s.addText(sup,{x:0.22,y:0.08,w:12.8,h:0.36,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:1.5,fontFace:"Calibri"});
    s.addText(main,{x:0.22,y:0.5,w:12.8,h:0.46,fontSize:14,bold:true,color:M.wht,fontFace:"Calibri"});
  }
  function fS(s,pg,tot){
    s.addShape(pr.ShapeType.rect,{x:0,y:7.18,w:13.3,h:0.32,fill:{color:M.gry},line:{color:M.gry,width:0}});
    s.addText("ACGIH BEI 2024: 25 µg/g kreat  •  TLV-TWA: 0.5 ppm  •  IARC Group 1  •  Permenaker 05/2018",
      {x:0.2,y:7.2,w:10.9,h:0.26,fontSize:7.5,color:M.mut,fontFace:"Calibri"});
    s.addText(pg+" / "+tot,{x:11.3,y:7.2,w:1.8,h:0.26,fontSize:9,color:M.gld,bold:true,align:"right",fontFace:"Calibri"});
  }
  function kS(s,x,y,w,h,l,v,c){
    s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,fill:{color:_hzBg(c)},line:{color:c,width:1.5},rectRadius:0.08});
    s.addShape(pr.ShapeType.rect,{x:x,y:y+h-0.06,w:w,h:0.06,fill:{color:c},line:{color:c,width:0}});
    s.addText(String(v),{x:x,y:y+0.07,w:w,h:h*0.56,fontSize:_hzFs(v),bold:true,color:c,align:"center",fontFace:"Calibri"});
    s.addText(l,{x:x+0.08,y:y+h*0.6,w:w-0.16,h:h*0.38,fontSize:9,color:M.mut,align:"center",fontFace:"Calibri",wrap:true});
  }
  function bChart(s,x,y,w,h,bData,title){
    s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:h,fill:{color:"FAFBFF"},line:{color:M.lgr,width:0.5}});
    if(title)s.addText(title,{x:x,y:y-0.28,w:w,h:0.26,fontSize:9.5,bold:true,color:M.navy,fontFace:"Calibri"});
    var mx=Math.max.apply(null,bData.map(function(d){return d.v||0;}))||1;
    var bw=w/bData.length; var pad=bw*0.15;
    bData.forEach(function(d,i){
      var v=d.v||0; var bh=(v/mx)*h*0.86; var bx=x+i*bw+pad;
      var col=d.c||AC;
      if(bh>0){
        s.addShape(pr.ShapeType.roundRect,{x:bx,y:y+h-bh,w:bw-pad*2,h:bh,fill:{color:col},line:{color:M.wht,width:0.5},rectRadius:0.04});
        if(v>0)s.addText(String(v),{x:bx,y:y+h-bh-0.25,w:bw-pad*2,h:0.23,fontSize:8,bold:true,color:col,align:"center",fontFace:"Calibri"});
      }
      s.addText(d.lbl,{x:bx-pad*0.5,y:y+h+0.04,w:bw,h:0.22,fontSize:7.5,color:M.mut,align:"center",fontFace:"Calibri"});
    });
    s.addShape(pr.ShapeType.rect,{x:x,y:y+h,w:w,h:0.03,fill:{color:M.navy},line:{color:M.navy,width:0}});
  }

  /* S1: COVER */
  var s1=pr.addSlide();
  s1.background={color:M.navD};
  s1.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:AC},line:{color:AC,width:0}});
  s1.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:0.05,fill:{color:AC},line:{color:AC,width:0}});
  s1.addShape(pr.ShapeType.ellipse,{x:8.8,y:-1.5,w:6.5,h:6.5,fill:{color:M.navL},line:{color:M.navL,width:0}});
  s1.addShape(pr.ShapeType.ellipse,{x:10.5,y:5.0,w:4.0,h:4.0,fill:{color:M.nav2},line:{color:M.nav2,width:0}});
  s1.addText("PT PERTAMINA PATRA NIAGA  ·  SATUAN KERJA REGIONAL III",
    {x:0.28,y:0.2,w:9,h:0.28,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:2,fontFace:"Calibri"});
  s1.addShape(pr.ShapeType.rect,{x:0.28,y:0.55,w:5.0,h:0.04,fill:{color:M.gld},line:{color:M.gld,width:0}});
  s1.addText("⚗  BIOMONITORING BENZENE",
    {x:0.28,y:0.7,w:9.5,h:0.9,fontSize:36,bold:true,color:M.wht,fontFace:"Calibri"});
  s1.addText("Pemantauan Biologis Paparan Benzene (C₆H₆) pada Awak Kapal Tanker BBM",
    {x:0.28,y:1.7,w:9.5,h:0.52,fontSize:14,bold:true,color:"9B59B6",fontFace:"Calibri"});
  s1.addShape(pr.ShapeType.rect,{x:0.28,y:2.3,w:5.0,h:0.04,fill:{color:AC},line:{color:AC,width:0}});
  s1.addText("BEI ACGIH 2024: S-Phenylmercapturic Acid / Muconic Acid 25 µg/g kreatinin  |  TLV-TWA: 0.5 ppm  |  IARC Group 1 Carcinogen",
    {x:0.28,y:2.42,w:9.5,h:0.36,fontSize:10,color:"CADCFC",fontFace:"Calibri",wrap:true});
  var k1=[
    {v:totalB,l:"Sampel Urin\nBiomonitoring",c:AC},
    {v:melB+(melB>0?" ⚠":""),l:"Melebihi BEI\n>25 µg/g kreat",c:melB>0?"C62828":"2E7D32"},
    {v:totalP,l:"Sampling Personal\nUdara Area Kerja",c:"1565C0"},
    {v:pctB+"%",l:"Compliance Rate\nBEI ACGIH 2024",c:stC}
  ];
  k1.forEach(function(k,i){
    var bx=0.28+i*3.28;
    s1.addShape(pr.ShapeType.roundRect,{x:bx,y:3.0,w:3.13,h:2.2,fill:{color:M.navL},line:{color:k.c,width:1.5},rectRadius:0.1});
    s1.addShape(pr.ShapeType.rect,{x:bx,y:3.0,w:3.13,h:0.06,fill:{color:k.c},line:{color:k.c,width:0}});
    s1.addText(String(k.v),{x:bx,y:3.1,w:3.13,h:1.05,fontSize:_hzFs(k.v),bold:true,color:k.c,align:"center",fontFace:"Calibri"});
    s1.addText(k.l,{x:bx+0.08,y:4.2,w:2.97,h:0.9,fontSize:9.5,color:"CADCFC",align:"center",fontFace:"Calibri",wrap:true});
  });
  s1.addText("IARC Group 1 Carcinogen — Tidak Ada Level Paparan yang Aman  •  "+tgl,
    {x:0,y:7.14,w:13.3,h:0.28,fontSize:8,color:"445566",align:"center",fontFace:"Calibri"});

  /* S2: DATA URIN + CHART */
  var s2=pr.addSlide();
  hS(s2,"⚗ BIOMARKER BENZENE  ·  DATA BIOMONITORING URIN",
    "Hasil Pemeriksaan Muconic Acid / Phenylmercapturic Acid vs BEI ACGIH 2024 (25 µg/g kreatinin)");
  kS(s2,0.22,1.22,3.88,1.45,"Total Sampel Urin",totalB,AC);
  kS(s2,4.2,1.22,3.88,1.45,"Melebihi BEI (>25 µg/g)",melB+(melB>0?" ⚠":""),melB>0?"C62828":"2E7D32");
  kS(s2,8.18,1.22,4.68,1.45,"Compliance Rate",pctB+"%",stC);
  /* Chart hasil per kapal */
  var kapalBio={};
  dataB.forEach(function(r){var k=r.kapal||"—";if(!kapalBio[k])kapalBio[k]={t:0,m:0};kapalBio[k].t++;if((parseFloat(r.kreatinin)||0)>(parseFloat(r.rujukan)||BEI))kapalBio[k].m++;});
  var kBioTop=Object.entries(kapalBio).sort(function(a,b){return b[1].m-a[1].m;}).slice(0,8);
  if(kBioTop.length)bChart(s2,0.22,3.0,7.8,2.9,kBioTop.map(function(k){return{lbl:k[0].slice(0,8),v:k[1].m,c:k[1].m>0?"C62828":"2E7D32"};}),
    "Jumlah ABK Melebihi BEI per Kapal");
  /* Tabel urin kanan */
  if(dataB.length){
    s2.addText("Data Sampel Urin",{x:8.3,y:3.0,w:4.78,h:0.26,fontSize:9.5,bold:true,color:M.navy,fontFace:"Calibri"});
    var uHdrs=["ABK","Kapal","Hasil","Status"].map(function(h){return{text:h,options:{bold:true,color:M.wht,fill:{color:M.navy},fontSize:9,border:{type:"none"},align:"center"}};});
    var uRows=dataB.slice(0,8).map(function(r,i){var v=parseFloat(r.kreatinin||0);var isH=v>(parseFloat(r.rujukan)||BEI);return[
      {text:String(r.pekerja||"—").slice(0,14),options:{fontSize:9,fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:String(r.kapal||"—").slice(0,12),options:{fontSize:9,fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:v.toFixed(1),options:{fontSize:9,bold:isH,color:isH?"C62828":"2E7D32",align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:isH?"⚠ Lebih":"✓ OK",options:{fontSize:9,bold:true,color:isH?"C62828":"2E7D32",align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}}
    ];});
    s2.addTable([uHdrs].concat(uRows),{x:8.3,y:3.34,w:4.78,colW:[1.5,1.4,0.9,0.98],rowH:0.36,fontFace:"Calibri",border:{type:"none"}});
  }
  fS(s2,2,5);

  /* S3: PERSONAL SAMPLING */
  var s3=pr.addSlide();
  hS(s3,"⚗ BIOMARKER BENZENE  ·  PERSONAL AIR SAMPLING",
    "Hasil Pengukuran Benzene Udara Area Kerja vs TLV-TWA ACGIH 2024 (0.5 ppm) — IMO MSC/Circ.1351");
  kS(s3,0.22,1.22,3.88,1.45,"Total Titik Sampling",totalP,"1565C0");
  kS(s3,4.2,1.22,3.88,1.45,"Melebihi TLV-TWA",melP+(melP>0?" ⚠":""),melP>0?"C62828":"2E7D32");
  kS(s3,8.18,1.22,4.68,1.45,"Status Compliance",melP===0?"Memenuhi":"Perlu Tindakan",melP===0?"2E7D32":"C62828");
  if(dataP.length){
    var pHdrs=["No","Kapal","Lokasi","TWA (ppm)","TLV","Durasi","Status"].map(function(h){return{text:h,options:{bold:true,color:M.wht,fill:{color:M.navy},fontSize:9.5,border:{type:"none"},align:"center"}};});
    var pRows=dataP.slice(0,13).map(function(r,i){var v=parseFloat(r.hasil||0);var isH=v>(parseFloat(r.nab)||TLV);return[
      {text:String(i+1),options:{fontSize:9.5,align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:String(r.kapal||"—"),options:{fontSize:9.5,bold:true,fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:String(r.lokasi||"—").slice(0,22),options:{fontSize:9.5,fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:v.toFixed(3),options:{fontSize:9.5,bold:isH,color:isH?"C62828":"2E7D32",align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:String(r.nab||"0.5"),options:{fontSize:9.5,align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:String(r.durasi||"8 jam"),options:{fontSize:9.5,align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}},
      {text:isH?"⚠ Melebihi":"✓ Normal",options:{fontSize:9.5,bold:true,color:isH?"C62828":"2E7D32",align:"center",fill:{color:i%2===0?M.wht:"F8FAFC"},border:{type:"none"}}}
    ];});
    s3.addTable([pHdrs].concat(pRows),{x:0.22,y:2.8,w:12.86,colW:[0.4,2.2,2.6,1.3,0.9,1.0,1.56],rowH:0.36,fontFace:"Calibri",border:{type:"none"}});
  } else {
    s3.addText("Belum ada data Personal Air Sampling untuk periode ini.",{x:0.22,y:4.0,w:12.86,h:0.5,fontSize:14,color:M.mut,align:"center",fontFace:"Calibri"});
  }
  fS(s3,3,5);

  /* S4: ANALISIS + 5 HIRARKI BENZENE */
  var s4=pr.addSlide();
  hS(s4,"⚗ BIOMARKER BENZENE  ·  ANALISIS RISIKO & HIRARKI PENGENDALIAN",
    "Analisis Risiko Karsinogenik Benzene (IARC Group 1) & Strategi Pengendalian Paparan Terintegrasi");
  kS(s4,0.22,1.22,2.95,1.45,"Sampel Urin",totalB,AC);
  kS(s4,3.27,1.22,2.95,1.45,"Melebihi BEI",melB,melB>0?"C62828":"2E7D32");
  kS(s4,6.32,1.22,2.95,1.45,"Sampling Personal",totalP,"1565C0");
  kS(s4,9.37,1.22,2.95,1.45,"Melebihi TLV",melP,melP>0?"C62828":"2E7D32");
  /* Analisis akademis */
  var anaB=melB===0&&melP===0?
    "Seluruh hasil biomonitoring benzene berada di bawah BEI ACGIH 2024 (25 µg/g kreatinin) dan TLV-TWA (0.5 ppm). Namun, mengingat benzene diklasifikasikan sebagai karsinogen IARC Group 1 (leukemia) tanpa threshold aman yang ditetapkan secara ilmiah, prinsip ALARA (As Low As Reasonably Achievable) tetap harus diterapkan. Pemantauan biomonitoring berkala minimal setiap 6 bulan sekali direkomendasikan.":
    "Teridentifikasi "+melB+" ABK dengan kadar muconic acid/S-PMA melebihi BEI ACGIH 2024 dan "+melP+
    " titik sampling area melebihi TLV-TWA. Benzene terklasifikasi karsinogen IARC Group 1 — meningkatkan risiko leukemia mieloid akut (AML) secara dose-dependent. Diperlukan tindakan pengendalian segera sesuai hierarki ISO 45001:2018 dan program medical surveillance intensif.";
  s4.addShape(pr.ShapeType.roundRect,{x:0.22,y:2.78,w:12.86,h:1.2,fill:{color:_hzBg(stC)},line:{color:stC,width:0},rectRadius:0.08});
  s4.addShape(pr.ShapeType.rect,{x:0.22,y:2.78,w:0.06,h:1.2,fill:{color:stC},line:{color:stC,width:0}});
  s4.addText([{text:"Analisis Risiko: ",options:{bold:true,color:stC,fontSize:11}},{text:anaB,options:{color:M.txt,fontSize:11}}],
    {x:0.42,y:2.86,w:12.48,h:1.04,fontFace:"Calibri",wrap:true,valign:"top"});
  /* 5 Hirarki Benzene */
  var hBenz=HIRARKI_PENGENDALIAN.kimia;
  var hirCols4=["C62828","E65100","1565C0","2E7D32","6A1B9A"];
  var hirLbl4=["1. ELIMINASI","2. SUBSTITUSI","3. REC. TEKNIK","4. ADMINISTRATIF","5. APD"];
  var hVals4=[hBenz["1"],hBenz["2"],hBenz["3"],hBenz["4"],hBenz["5"]];
  hirLbl4.forEach(function(hl,i){
    s4.addShape(pr.ShapeType.roundRect,{x:0.22+i*2.56,y:4.12,w:2.44,h:2.8,fill:{color:_hzBg(hirCols4[i])},line:{color:hirCols4[i],width:1.2},rectRadius:0.08});
    s4.addShape(pr.ShapeType.rect,{x:0.22+i*2.56,y:4.12,w:2.44,h:0.04,fill:{color:hirCols4[i]},line:{color:hirCols4[i],width:0}});
    s4.addText(hl,{x:0.3+i*2.56,y:4.19,w:2.28,h:0.36,fontSize:9,bold:true,color:hirCols4[i],fontFace:"Calibri"});
    s4.addText(hVals4[i]||"—",{x:0.3+i*2.56,y:4.6,w:2.28,h:2.2,fontSize:9.5,color:M.txt,fontFace:"Calibri",wrap:true,valign:"top"});
  });
  fS(s4,4,5);

  /* S5: REKOMENDASI */
  var s5=pr.addSlide();
  hS(s5,"⚗ BIOMARKER BENZENE  ·  REKOMENDASI STRATEGIS",
    "Rekomendasi Pengendalian Paparan Benzene & Program Biomonitoring Lanjutan Berbasis IARC/ACGIH");
  var reks5=[
    {p:melB>0?"Tindak Lanjut Medis Segera":"Pertahankan & Tingkatkan",c:"C62828",items:[
      melB>0?"Laksanakan pemeriksaan hematologi lengkap untuk "+melB+" ABK dengan kadar melebihi BEI — konsultasikan dengan dokter SpOK untuk penilaian risiko individual":"Pertahankan program biomonitoring rutin — prinsip ALARA tetap berlaku untuk karsinogen IARC Group 1",
      "Audit komprehensif sumber paparan benzene di kapal: cargo tank, pump room, manifold, void space",
      "Pastikan seluruh ABK yang terpapar menggunakan APD berlevel tertinggi sesuai konsentrasi yang terukur"
    ]},
    {p:"Pengendalian Teknis & Administratif",c:AC,items:[
      melP>0?"Perbaiki sistem ventilasi Local Exhaust Ventilation (LEV) di pump room dan manifold — verifikasi airflow minimal 150 fpm":"Verifikasi kondisi sistem ventilasi LEV secara berkala — lakukan smoke test untuk visual airflow",
      "Review dan perbarui SOP bunkering dan cargo handling — minimalkan paparan dengan closed-loop system",
      "Implementasikan permit-to-work untuk entry ke area konsentrasi benzene tinggi — wajibkan gas monitoring real-time"
    ]},
    {p:"Program Jangka Panjang",c:"1565C0",items:[
      "Jadwalkan biomonitoring benzene rutin setiap 6 bulan untuk seluruh ABK yang terpapar reguler — dokumentasikan tren individu",
      "Daftarkan ABK berisiko tinggi dalam program medical surveillance jangka panjang sesuai Permenaker 05/2018 Lampiran IV",
      "Kompilasi laporan biomonitoring tahunan untuk audit ISM Code, biro klasifikasi, dan Port State Control — cantumkan dalam Health Record ABK"
    ]}
  ];
  reks5.forEach(function(r,i){
    var rx=0.22+i*4.38;
    s5.addShape(pr.ShapeType.roundRect,{x:rx,y:1.25,w:4.2,h:5.75,fill:{color:_hzBg(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
    s5.addShape(pr.ShapeType.rect,{x:rx,y:1.25,w:4.2,h:0.56,fill:{color:r.c},line:{color:r.c,width:0}});
    s5.addText(r.p,{x:rx+0.12,y:1.29,w:3.96,h:0.48,fontSize:11,bold:true,color:M.wht,fontFace:"Calibri"});
    r.items.forEach(function(it,j){
      s5.addShape(pr.ShapeType.ellipse,{x:rx+0.18,y:2.08+j*1.56,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
      s5.addText(it,{x:rx+0.52,y:2.01+j*1.56,w:3.56,h:1.44,fontSize:11,color:M.txt,fontFace:"Calibri",wrap:true,valign:"top"});
    });
  });
  fS(s5,5,5);

  pr.writeFile({fileName:"IH_Biomarker_Benzene_"+new Date().toISOString().slice(0,10)+".pptx"})
    .then(function(){showToast("PPT Biomarker Benzene berhasil didownload!","success");})
    .catch(function(err){showToast("Gagal: "+err.message,"error");console.error(err);});
}


/* ═══════════════════════════════════════════════════════════════
   SUMMARY DASHBOARD — Laporan Komprehensif Industrial Hygiene
   Bahasa akademis untuk manajemen & direksi
   Output: tampilan dashboard + export PDF
═══════════════════════════════════════════════════════════════ */

function calcRiskScores(){
  /* Kumpulkan semua nama kapal dari semua dataset */
  var kapalSet=new Set();
  [rawHRA,rawDAT,rawFisika||[],rawKimia||[],rawBiologi||[],rawErgonomi||[],rawPsikososial||[]].forEach(function(arr){
    (arr||[]).forEach(function(r){var k=r["Nama Kapal"]||r["kapal"]||"";if(k)kapalSet.add(k);});
  });

  /* Tambahkan kapal dari dummy list jika ada */
  if(typeof rawBiomarker!=="undefined")rawBiomarker.forEach(function(r){if(r.kapal)kapalSet.add(r.kapal);});

  var results=[];
  var now=new Date();
  var BULAN_MAP={Januari:0,Februari:1,Maret:2,April:3,Mei:4,Juni:5,Juli:6,Agustus:7,September:8,Oktober:9,November:10,Desember:11};

  kapalSet.forEach(function(kapal){
    /* ─ 1. HRA SCORE (0–30) ─ */
    var hraRecord=(rawHRA||[]).filter(function(r){return(r["Nama Kapal"]||"")=== kapal;});
    var hraDone=hraRecord.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";});
    var hraScore=30; // default: belum pernah HRA = max risk
    var hraInfo="Belum pernah HRA";
    var hraFleet=hraRecord.length?hraRecord[0]["Jenis Fleet"]||"":
      (rawDAT||[]).filter(function(r){return r["Nama Kapal"]===kapal;})[0]?.["Jenis Fleet"]||"";

    if(hraDone.length>0){
      /* Cari HRA terakhir */
      var lastBulan=hraDone[hraDone.length-1]["Bulan Pelaksanaan"]||"";
      var bIdx=BULAN_MAP[lastBulan];
      var bulanLalu=typeof bIdx!=="undefined"?(now.getMonth()-bIdx+12)%12:12;
      if(bulanLalu<=3){hraScore=0;hraInfo="HRA < 3 bulan lalu";}
      else if(bulanLalu<=6){hraScore=10;hraInfo="HRA 3–6 bulan lalu";}
      else if(bulanLalu<=12){hraScore=20;hraInfo="HRA 6–12 bulan lalu";}
      else{hraScore=25;hraInfo="HRA > 12 bulan lalu";}
    }

    /* ─ 2. HAZARD SCORE (0–35) ─ */
    var hazardOver=0;
    var hazardTotal=0;
    var hazardDetail=[];
    [
      {data:rawFisika||[],label:"Fisika"},
      {data:rawKimia||[],label:"Kimia"},
      {data:rawBiologi||[],label:"Biologi"},
      {data:rawErgonomi||[],label:"Ergonomi"},
      {data:rawPsikososial||[],label:"Psikososial"}
    ].forEach(function(h){
      var kapalData=h.data.filter(function(r){return(r["Nama Kapal"]||r["kapal"]||"")=== kapal;});
      var over=kapalData.filter(function(r){
        var s=(r["Status"]||r["Level Risiko"]||"").toLowerCase();
        return s.includes("melebihi")||s.includes("tinggi")||parseInt(r["Level Risiko (1–4)"]||0)>=3;
      }).length;
      if(kapalData.length>0){hazardTotal+=kapalData.length;hazardOver+=over;}
      if(over>0)hazardDetail.push(h.label+"("+over+")");
    });
    var hazardScore=Math.min(35,Math.round((hazardOver/Math.max(hazardTotal,1))*35+(hazardOver*3)));
    var hazardInfo=hazardOver>0?(hazardOver+" parameter melebihi NAB: "+hazardDetail.join(", ")):"Semua dalam batas NAB";

    /* ─ 3. DAT SCORE (0–20) ─ */
    var datRecord=(rawDAT||[]).filter(function(r){return(r["Nama Kapal"]||"")=== kapal;});
    var datPos=datRecord.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
    var datScore=0;
    var datInfo="Tidak ada hasil positif";
    if(datPos>0){datScore=20;datInfo=datPos+" awak reaktif";}
    else if(datRecord.length===0){datScore=10;datInfo="Belum pernah DAT";}

    /* ─ 4. BIOMARKER SCORE (0–15) ─ */
    var bioRecord=(typeof rawBiomarker!=="undefined"?rawBiomarker:[]).filter(function(r){return(r.kapal||"")=== kapal;});
    var bioOver=bioRecord.filter(function(r){return parseFloat(r.kreatinin||0)>parseFloat(r.rujukan||25);}).length;
    var bioScore=Math.min(15,bioOver*8);
    var bioInfo=bioOver>0?(bioOver+" sampel > BEI"):(bioRecord.length>0?"Normal":"Belum ada data");

    /* ─ TOTAL SKOR ─ */
    var total=hraScore+hazardScore+datScore+bioScore;

    /* ─ LEVEL ─ */
    var level,levelColor,levelBg;
    if(total>75){level="KRITIS";levelColor="#B71C1C";levelBg="#FFEBEE";}
    else if(total>50){level="TINGGI";levelColor="#E65100";levelBg="#FFF3E0";}
    else if(total>25){level="SEDANG";levelColor="#F59E0B";levelBg="#FEF3C7";}
    else{level="RENDAH";levelColor="#2E7D32";levelBg="#E8F5E9";}

    /* ─ REKOMENDASI UTAMA ─ */
    var reks=[];
    if(hraScore>=20)reks.push("Jadwalkan HRA segera");
    if(hazardOver>0)reks.push("Implementasi pengendalian "+hazardDetail[0]);
    if(datScore===20)reks.push("Tindak lanjut "+datPos+" awak reaktif");
    if(datScore===10)reks.push("Jadwalkan DAT");
    if(bioOver>0)reks.push("Pemeriksaan hematologi ABK");
    if(reks.length===0)reks.push("Pertahankan program IH — status aman");

    results.push({
      kapal:kapal, fleet:hraFleet||"—",
      total:total, level:level, levelColor:levelColor, levelBg:levelBg,
      hraScore:hraScore, hraInfo:hraInfo,
      hazardScore:hazardScore, hazardInfo:hazardInfo, hazardOver:hazardOver,
      datScore:datScore, datInfo:datInfo, datPos:datPos,
      bioScore:bioScore, bioInfo:bioInfo, bioOver:bioOver,
      rekomendasi:reks[0], rekList:reks
    });
  });

  /* Sort: skor tertinggi (paling berisiko) duluan */
  return results.sort(function(a,b){return b.total-a.total;});
}

/* ── Render halaman Risk Prediction ── */
var _rpAllData=[];
function renderRiskPage(){
  _rpAllData=calcRiskScores();

  var fleetF=((document.getElementById("rp-filter-fleet")||{}).value)||"";
  var riskF=((document.getElementById("rp-filter-risk")||{}).value)||"";

  var filtered=_rpAllData.filter(function(r){
    if(fleetF&&r.fleet!==fleetF)return false;
    if(riskF&&r.level!==riskF)return false;
    return true;
  });

  /* KPI */
  function setEl(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
  setEl("rp-kritis",_rpAllData.filter(function(r){return r.level==="KRITIS";}).length);
  setEl("rp-tinggi",_rpAllData.filter(function(r){return r.level==="TINGGI";}).length);
  setEl("rp-sedang",_rpAllData.filter(function(r){return r.level==="SEDANG";}).length);
  setEl("rp-rendah",_rpAllData.filter(function(r){return r.level==="RENDAH";}).length);
  setEl("rp-total",_rpAllData.length);

  /* Render tabel */
  renderRiskTable(filtered);

  /* Render critical cards */
  renderCriticalCards(_rpAllData.filter(function(r){return r.level==="KRITIS"||r.level==="TINGGI";}).slice(0,3));
}

function renderRiskTable(data){
  var tbody=document.getElementById("rpTableBody");
  var footer=document.getElementById("rpTableFooter");
  if(!tbody)return;
  if(!data||!data.length){
    tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada data kapal yang ditemukan</td></tr>';
    if(footer)footer.textContent="Tidak ada data";
    return;
  }

  function scorePill(score,max,color){
    var pct=Math.min(100,Math.round(score/max*100));
    return'<div style="display:flex;align-items:center;gap:5px">'
      +'<div style="flex:1;background:#E2E8F0;border-radius:3px;height:5px;overflow:hidden;min-width:40px">'
      +'<div style="width:'+pct+'%;background:'+color+';height:100%;border-radius:3px"></div></div>'
      +'<span style="font-size:10px;font-weight:700;color:'+color+';min-width:18px">'+score+'</span>'
      +'</div>';
  }

  tbody.innerHTML=data.map(function(r,i){
    /* Skor bar */
    var barPct=r.total;
    var barColor=r.levelColor;
    return'<tr>'
      +'<td><strong style="color:var(--text)">'+esc(r.kapal)+'</strong></td>'
      +'<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+esc(r.fleet)+'</span></td>'
      +'<td style="text-align:center;min-width:80px">'
        +'<div style="font-size:18px;font-weight:700;color:'+barColor+'">'+r.total+'</div>'
        +'<div style="background:#E2E8F0;border-radius:4px;height:6px;overflow:hidden;margin-top:3px">'
        +'<div style="width:'+barPct+'%;background:'+barColor+';height:100%;border-radius:4px;transition:.3s"></div></div>'
      +'</td>'
      +'<td style="text-align:center">'
        +'<span style="background:'+r.levelBg+';color:'+r.levelColor+';padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">'+r.level+'</span>'
      +'</td>'
      +'<td style="text-align:center" title="'+esc(r.hraInfo)+'">'
        +scorePill(r.hraScore,30,r.hraScore>20?"#C62828":r.hraScore>10?"#E65100":"#2E7D32")
      +'</td>'
      +'<td style="text-align:center" title="'+esc(r.hazardInfo)+'">'
        +scorePill(r.hazardScore,35,r.hazardScore>25?"#C62828":r.hazardScore>12?"#E65100":"#2E7D32")
      +'</td>'
      +'<td style="text-align:center" title="'+esc(r.datInfo)+'">'
        +scorePill(r.datScore,20,r.datScore>=20?"#C62828":r.datScore>0?"#E65100":"#2E7D32")
      +'</td>'
      +'<td style="text-align:center" title="'+esc(r.bioInfo)+'">'
        +scorePill(r.bioScore,15,r.bioScore>8?"#C62828":r.bioScore>0?"#7B1FA2":"#2E7D32")
      +'</td>'
      +'<td style="font-size:11px;color:var(--text-muted);max-width:180px;word-break:break-word">'+esc(r.rekomendasi)+'</td>'
      +'</tr>';
  }).join("");

  if(footer)footer.textContent="Menampilkan "+data.length+" dari "+_rpAllData.length+" kapal";
}

function renderCriticalCards(data){
  var el=document.getElementById("rpCriticalCards");
  if(!el||!data.length)return;

  el.innerHTML='<div style="margin:8px 0 6px;font-size:12px;font-weight:700;color:var(--text)">'
    +'<i class="fas fa-fire-flame-curved" style="color:#C62828;margin-right:6px"></i>'
    +'Kapal Prioritas Intervensi Segera</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:10px">'
    +data.map(function(r){
      return'<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid '+r.levelColor+';border-radius:12px;padding:16px">'
        /* Header kapal */
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
          +'<div>'
            +'<div style="font-size:14px;font-weight:700;color:var(--text)"><i class="fas fa-ship" style="margin-right:6px;color:'+r.levelColor+'"></i>'+esc(r.kapal)+'</div>'
            +'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+esc(r.fleet)+'</div>'
          +'</div>'
          +'<div style="text-align:center">'
            +'<div style="font-size:32px;font-weight:700;color:'+r.levelColor+'">'+r.total+'</div>'
            +'<span style="background:'+r.levelBg+';color:'+r.levelColor+';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700">'+r.level+'</span>'
          +'</div>'
        +'</div>'
        /* 4 dimensi */
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
        +[
          {label:"HRA",score:r.hraScore,max:30,info:r.hraInfo,c:r.hraScore>20?"#C62828":r.hraScore>10?"#E65100":"#2E7D32"},
          {label:"5 Hazard",score:r.hazardScore,max:35,info:r.hazardInfo,c:r.hazardScore>25?"#C62828":r.hazardScore>12?"#E65100":"#2E7D32"},
          {label:"DAT",score:r.datScore,max:20,info:r.datInfo,c:r.datScore>=20?"#C62828":r.datScore>0?"#E65100":"#2E7D32"},
          {label:"Biomarker",score:r.bioScore,max:15,info:r.bioInfo,c:r.bioScore>8?"#C62828":r.bioScore>0?"#7B1FA2":"#2E7D32"}
        ].map(function(d){
          return'<div style="background:var(--bg);border-radius:8px;padding:8px 10px">'
            +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">'+d.label+'</div>'
            +'<div style="display:flex;align-items:center;justify-content:space-between">'
              +'<div style="font-size:14px;font-weight:700;color:'+d.c+'">'+d.score+' <span style="font-size:10px;font-weight:400;color:var(--text-muted)">/ '+d.max+'</span></div>'
            +'</div>'
            +'<div style="background:var(--border);border-radius:3px;height:5px;overflow:hidden;margin-top:5px">'
              +'<div style="width:'+Math.min(100,Math.round(d.score/d.max*100))+'%;background:'+d.c+';height:100%;border-radius:3px"></div>'
            +'</div>'
            +'<div style="font-size:9.5px;color:var(--text-muted);margin-top:4px;line-height:1.4">'+esc(d.info)+'</div>'
          +'</div>';
        }).join("")
        +'</div>'
        /* Rekomendasi */
        +'<div style="background:'+r.levelBg+';border-radius:8px;padding:10px 12px">'
          +'<div style="font-size:10px;font-weight:700;color:'+r.levelColor+';margin-bottom:6px"><i class="fas fa-list-check" style="margin-right:4px"></i>Tindak Lanjut</div>'
          +r.rekList.map(function(rek,j){
            return'<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:'+(j<r.rekList.length-1?'5px':'0')+'">'
              +'<div style="width:4px;height:4px;background:'+r.levelColor+';border-radius:50%;flex-shrink:0;margin-top:5px"></div>'
              +'<div style="font-size:11px;color:'+r.levelColor+';font-weight:600">'+esc(rek)+'</div>'
            +'</div>';
          }).join("")
        +'</div>'
      +'</div>';
    }).join("")
    +'</div>';
}

function searchRiskTable(){
  var q=((document.getElementById("rp-search")||{}).value||"").toLowerCase();
  var filtered=q?_rpAllData.filter(function(r){return r.kapal.toLowerCase().includes(q)||r.fleet.toLowerCase().includes(q);}):_rpAllData;
  var riskF=((document.getElementById("rp-filter-risk")||{}).value)||"";
  if(riskF)filtered=filtered.filter(function(r){return r.level===riskF;});
  renderRiskTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY DASHBOARD — Laporan Komprehensif IH
   Design: Elegan, ringan, langsung tampil — layak kirim ke direksi
   AI Rekomendasi otomatis dari data aktual
═══════════════════════════════════════════════════════════════ */

function getSummaryData(){
  var fleet=(document.getElementById("summary-filter-fleet")||{}).value||"";
  var bulan=(document.getElementById("summary-filter-bulan")||{}).value||"";

  function fd(raw,key){
    if(!raw||!raw.length)return[];
    if(!fleet&&!bulan)return raw;
    return raw.filter(function(r){
      var fok=!fleet||(r["Jenis Fleet"]||r["Fleet"]||r["fleet"]||"")=== fleet;
      var bok=!bulan||(r["Bulan Pelaksanaan"]||r["Bulan"]||r["bulan"]||"")=== bulan;
      return fok&&bok;
    });
  }

  /* HRA */
  var hraD=fd(rawHRA,"");
  var hraDone=new Set(hraD.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
  var hraTot=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
  var hraCov=((hraDone/hraTot)*100).toFixed(1);
  var hraBudget=hraD.reduce(function(s,r){return s+parseFloat(r["Est Budget"]||0);},0);

  /* DAT */
  var datD=fd(rawDAT,"");
  var datKapal=new Set(datD.map(function(r){return r["Nama Kapal"];})).size;
  var datCrew=datD.reduce(function(s,r){return s+parseInt(r["Total Crew Diperiksa"]||0);},0);
  var datPos=datD.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
  var datRate=datCrew>0?((datPos/datCrew)*100).toFixed(2):"0.00";
  var datBiaya=datD.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
  var datBulanList=[];
  var datBulanMap={};
  BULAN_ORDER.forEach(function(b){datBulanMap[b]={kapal:0,crew:0,positif:0,biaya:0};});
  datD.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&datBulanMap[b]){datBulanMap[b].kapal++;datBulanMap[b].crew+=parseInt(r["Total Crew Diperiksa"]||0);datBulanMap[b].positif+=parseInt(r["Jumlah Crew Positif"]||0);datBulanMap[b].biaya+=parseFloat(r["Est Biaya"]||0);}});
  BULAN_ORDER.forEach(function(b){if(datBulanMap[b].kapal>0)datBulanList.push({bulan:b,kapal:datBulanMap[b].kapal,crew:datBulanMap[b].crew,positif:datBulanMap[b].positif,rate:datBulanMap[b].crew>0?((datBulanMap[b].positif/datBulanMap[b].crew)*100).toFixed(2):"0.00",biaya:datBulanMap[b].biaya});});

  /* Pest */
  var pestD=fd(rawPest,"");
  var pestCount=pestD.length;
  var pestLokasi=new Set(pestD.map(function(r){return r["Lokasi"]||"";})).size;
  var pestBiaya=pestD.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
  var pestBulanMap2={};
  BULAN_ORDER.forEach(function(b){pestBulanMap2[b]={count:0,lokasi:new Set(),biaya:0,temuan:[]};});
  pestD.forEach(function(r){
    /* Normalisasi bulan: "April 2026" → "April" */
    var raw=(r["Bulan"]||r["Bulan Pelaksanaan"]||"").trim();
    var b=raw.split(" ")[0];
    if(b&&pestBulanMap2[b]){
      pestBulanMap2[b].count++;
      pestBulanMap2[b].lokasi.add((r["Lokasi"]||"").trim());
      pestBulanMap2[b].biaya+=parseFloat(r["Est Biaya"]||0);
      if(r["Temuan / Keluhan"])pestBulanMap2[b].temuan.push(r["Temuan / Keluhan"]);
    }
  });
  /* Hanya tampilkan bulan yang benar-benar ada kegiatannya */
  var pestBulanList=[];
  BULAN_ORDER.forEach(function(b){
    if(pestBulanMap2[b].count>0){
      pestBulanList.push({
        bulan:b,count:pestBulanMap2[b].count,
        lokasi:pestBulanMap2[b].lokasi.size,
        biaya:pestBulanMap2[b].biaya,
        temuan:[...new Set(pestBulanMap2[b].temuan)].slice(0,2).join("; ")||"—"
      });
    }
  });

  /* 5 Hazard */
  var fisD=rawFisika||[],fisMel=fisD.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var kimD=rawKimia||[],kimMel=kimD.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var bioloD=rawBiologi||[],bioloMel=bioloD.filter(function(r){return(r["Status"]||"").toLowerCase().includes("melebihi");}).length;
  var ergD=rawErgonomi||[],ergTin=ergD.filter(function(r){var l=r["Level Risiko (1–4)"]||r["Level Risiko"]||"";return parseInt(l)>=3||String(l).toLowerCase().includes("tinggi");}).length;
  var psiD=rawPsikososial||[],psiTin=psiD.filter(function(r){return(r["Level Risiko"]||"").toLowerCase().includes("tinggi")||parseInt(r["Level Risiko (1–4)"]||0)>=3;}).length;
  var hazTot=fisD.length+kimD.length+bioloD.length+ergD.length+psiD.length;
  var hazMel=fisMel+kimMel+bioloMel+ergTin+psiTin;

  /* Biomarker */
  var bioD=rawBiomarker||[];
  var bioMel=bioD.filter(function(r){return r.kreatinin>r.rujukan;}).length;

  return{
    fleet:fleet,bulan:bulan,
    hra:{done:hraDone,total:hraTot,coverage:hraCov,budget:hraBudget,data:hraD},
    dat:{kapal:datKapal,crew:datCrew,positif:datPos,rate:datRate,biaya:datBiaya,bulanList:datBulanList},
    pest:{count:pestCount,lokasi:pestLokasi,biaya:pestBiaya,bulanList:pestBulanList},
    hazard:{total:hazTot,melebihi:hazMel,fisika:{total:fisD.length,melebihi:fisMel},kimia:{total:kimD.length,melebihi:kimMel},biologi:{total:bioloD.length,melebihi:bioloMel},ergonomi:{total:ergD.length,tinggi:ergTin},psiko:{total:psiD.length,tinggi:psiTin}},
    bio:{total:bioD.length,melebihi:bioMel}
  };
}

/* ═══════════════════════════════════════════
   RENDER — langsung tampil, ringan, elegan
═══════════════════════════════════════════ */
var _summaryCache=null, _summaryCacheKey="";

function renderSummaryPage(){
  var el=document.getElementById("summaryReport");
  if(!el)return;
  var bulan=((document.getElementById("summary-filter-bulan")||{}).value)||"";
  var fleet=((document.getElementById("summary-filter-fleet")||{}).value)||"";
  var cKey=bulan+"|"+fleet;
  if(_summaryCache&&_summaryCacheKey===cKey){el.innerHTML=_summaryCache;return;}
  /* Langsung render tanpa loading overlay */
  _buildSummary(el,cKey);
}

function _buildSummary(el,cKey){
  var d=getSummaryData();
  var now=new Date();
  var tgl=now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  var yr=now.getFullYear();
  var periode=d.bulan?(d.bulan+" "+yr):("Tahun "+yr);
  var fleetLbl=d.fleet||"Seluruh Armada";
  var hazPct=d.hazard.total>0?(((d.hazard.total-d.hazard.melebihi)/d.hazard.total)*100).toFixed(1):"100.0";
  var datPct=d.dat.crew>0?(((d.dat.crew-d.dat.positif)/d.dat.crew)*100).toFixed(1):"100.0";
  var nomBio=d.bio&&d.bio.total>0;

  /* ── Helpers ── */
  function stC(v,good,warn){return parseFloat(v)>=good?"#2E7D32":parseFloat(v)>=warn?"#E65100":"#C62828";}
  function stBg(v,good,warn){return parseFloat(v)>=good?"#E8F5E9":parseFloat(v)>=warn?"#FFF3E0":"#FFEBEE";}
  function stLbl(v,good,warn){return parseFloat(v)>=good?"BAIK":parseFloat(v)>=warn?"PERHATIAN":"KRITIS";}
  function bar(pct,col){return'<div style="background:#E2E8F0;border-radius:4px;height:6px;margin-top:4px"><div style="width:'+Math.min(pct,100)+'%;background:'+col+';height:6px;border-radius:4px"></div></div>';}

  /* ── KPI box ── */
  function kpi(lbl,val,unit,col,bg,pct){
    return'<div style="background:'+bg+';border-radius:12px;padding:16px 18px;border-left:4px solid '+col+'">'
      +'<div style="font-size:10.5px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">'+lbl+'</div>'
      +'<div style="font-size:28px;font-weight:700;color:'+col+';line-height:1">'+val+'</div>'
      +'<div style="font-size:11px;color:#64748B;margin-top:3px">'+unit+'</div>'
      +(pct!==undefined?bar(pct,col):"")
      +'</div>';
  }
  /* ── Section header ── */
  function shdr(icon,title,col){
    return'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid '+col+'">'
      +'<div style="width:32px;height:32px;background:'+col+';border-radius:8px;display:flex;align-items:center;justify-content:center">'
      +'<i class="fas '+icon+'" style="color:#fff;font-size:14px"></i></div>'
      +'<div style="font-size:16px;font-weight:700;color:#0F2A4A">'+title+'</div></div>';
  }
  /* ── Analisis box ── */
  function anaBox(col,bg,bdr,lbl,txt){
    return'<div style="background:'+bg+';border:1px solid '+bdr+';border-left:4px solid '+col+';border-radius:8px;padding:12px 16px;font-size:11px;color:#334155;line-height:1.75">'
      +'<strong style="color:'+col+'">'+lbl+':</strong> '+txt+'</div>';
  }
  /* ── Rekomendasi box 3 kolom ── */
  function rekBox(items){
    var clrs=[["#C62828","#FFEBEE","Segera (0–30 Hari)"],["#E65100","#FFF3E0","Jangka Pendek (1–3 Bln)"],["#1565C0","#EBF5FF","Jangka Panjang (3–12 Bln)"]];
    return'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px">'
      +items.map(function(its,i){
        return'<div style="background:'+clrs[i][1]+';border-radius:10px;padding:14px;border-top:3px solid '+clrs[i][0]+'">'
          +'<div style="font-size:10px;font-weight:700;color:'+clrs[i][0]+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">'+clrs[i][2]+'</div>'
          +its.map(function(it){
            return'<div style="display:flex;gap:7px;margin-bottom:8px">'
              +'<div style="width:5px;height:5px;background:'+clrs[i][0]+';border-radius:50%;flex-shrink:0;margin-top:6px"></div>'
              +'<div style="font-size:11px;color:#334155;line-height:1.65">'+it+'</div></div>';
          }).join("")+'</div>';
      }).join("")+'</div>';
  }
  /* ── Regulasi strip ── */
  function regStrip(refs){
    return'<div style="background:#F0F4F8;border-radius:8px;padding:10px 14px;margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">'
      +'<span style="font-size:9.5px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-right:4px">Dasar Hukum:</span>'
      +refs.map(function(r){
        return'<span style="background:#fff;border:1px solid #CBD5E1;border-radius:20px;padding:3px 10px;font-size:9.5px;color:#475569;font-weight:600">'+r+'</span>';
      }).join("")+'</div>';
  }
  /* ── Info card horizontal ── */
  function infoCard(icon,title,body,col){
    return'<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start">'
      +'<div style="width:36px;height:36px;background:'+col+';border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      +'<i class="fas '+icon+'" style="color:#fff;font-size:14px"></i></div>'
      +'<div><div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:4px">'+title+'</div>'
      +'<div style="font-size:11px;color:#475569;line-height:1.7">'+body+'</div></div></div>';
  }
  /* ── Tabel mini ── */
  function tbl(hdrs,rows){
    var hw=hdrs.map(function(h){return'<th style="padding:8px 10px;background:#0F2A4A;color:#fff;font-size:10.5px;font-weight:600;text-align:left;border:none;white-space:nowrap">'+h+'</th>';}).join("");
    var rw=rows.map(function(r,i){return'<tr style="background:'+(i%2===0?"#fff":"#F8FAFC")+'">'
      +r.map(function(c){return'<td style="padding:7px 10px;font-size:10.5px;color:#334155;border-bottom:1px solid #EEF2F7;border-left:none;border-right:none;border-top:none">'+c+'</td>';}).join("")+'</tr>';}).join("");
    return'<div style="overflow:hidden;border-radius:8px;border:1px solid #E2E8F0">'
      +'<table style="width:100%;border-collapse:collapse"><thead><tr>'+hw+'</tr></thead>'
      +'<tbody>'+rw+'</tbody></table></div>';
  }
  /* ── A4 page ── */
  function pg(id,html){
    return'<div id="'+id+'" style="width:794px;min-height:1123px;background:#fff;'
      +'font-family:Arial,Helvetica,sans-serif;color:#1E293B;box-sizing:border-box;'
      +'padding:40px 44px 44px;position:relative;page-break-after:always">'+html+'</div>';
  }
  /* ── Page header ── */
  function phdr(pgN,tot){
    return'<div style="display:flex;justify-content:space-between;align-items:flex-start;'
      +'margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #0F2A4A">'
      +'<div>'
      +'<div style="font-size:9px;font-weight:700;color:#C9973A;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px">PT PERTAMINA PATRA NIAGA · SATUAN KERJA REGIONAL III</div>'
      +'<div style="font-size:9px;color:#94A3B8">Divisi Industrial Hygiene & Occupational Health · IH Dashboard v5.0</div>'
      +'</div>'
      +'<div style="text-align:right">'
      +'<div style="font-size:9.5px;font-weight:700;color:#0F2A4A">'+tgl+'</div>'
      +'<div style="font-size:9px;color:#94A3B8">Hal '+pgN+' / '+tot+'</div>'
      +'</div></div>';
  }
  /* ── Page footer ── */
  var pftr='<div style="position:absolute;bottom:20px;left:44px;right:44px;padding-top:10px;'
    +'border-top:1px solid #E2E8F0;display:flex;justify-content:space-between">'
    +'<div style="font-size:8px;color:#94A3B8">Permenaker 05/2018 · ACGIH BEI 2024 · ILO MLC 2006 · ISO 45001:2018 · IMO MSC/Circ.1351</div>'
    +'<div style="font-size:8px;color:#94A3B8">Konfidensial — Penggunaan Internal</div></div>';

  var stOvr=d.dat.positif>0||d.hazard.melebihi>0
    ?{l:"PERHATIAN",c:"#E65100",bg:"#FFF3E0"}
    :(parseFloat(d.hra.coverage)<50?{l:"KRITIS",c:"#C62828",bg:"#FFEBEE"}:{l:"BAIK",c:"#2E7D32",bg:"#E8F5E9"});
  var totalPages=nomBio?7:6;

  /* ══════════════ HALAMAN 1: COVER ══════════════ */
  var pg1=''
    /* Outer wrapper — putih bersih, full A4 */
    +'<div style="min-height:1123px;margin:-40px -44px -44px;padding:0;box-sizing:border-box;background:#FFFFFF;position:relative;font-family:Arial,Helvetica,sans-serif">'

    /* ── LEFT ACCENT BAR ── */
    +'<div style="position:absolute;left:0;top:0;width:5px;height:100%;background:linear-gradient(180deg,#0D2B4E 0%,#1A4A7A 100%)"></div>'

    /* ── TOP BAND — gelap tipis ── */
    +'<div style="background:#0D2B4E;height:6px;width:100%"></div>'

    /* ── MAIN CONTENT ── */
    +'<div style="padding:64px 60px 48px 64px">'

    /* Kategori dokumen */
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:48px">'
    +'<div style="width:32px;height:1px;background:#0D2B4E"></div>'
    +'<span style="font-size:9px;font-weight:700;color:#0D2B4E;letter-spacing:3px;text-transform:uppercase">Laporan Komprehensif</span>'
    +'<div style="flex:1;height:1px;background:#E2E8F0"></div>'
    +'<span style="font-size:9px;color:#94A3B8;letter-spacing:1px">'+tgl+'</span>'
    +'</div>'

    /* ── JUDUL UTAMA ── */
    +'<div style="margin-bottom:16px">'
    +'<div style="font-size:13px;font-weight:400;color:#64748B;letter-spacing:.5px;margin-bottom:10px;text-transform:uppercase">Industrial Hygiene &amp; Occupational Health</div>'
    +'<div style="font-size:46px;font-weight:700;color:#0D2B4E;line-height:1.1;letter-spacing:-1px;margin-bottom:4px">Monitoring,</div>'
    +'<div style="font-size:46px;font-weight:700;color:#0D2B4E;line-height:1.1;letter-spacing:-1px;margin-bottom:4px">Assessment</div>'
    +'<div style="font-size:46px;font-weight:300;color:#1A6BB5;line-height:1.1;letter-spacing:-1px">&amp; Hazard Management</div>'
    +'</div>'

    /* ── GARIS PEMBATAS ELEGAN ── */
    +'<div style="display:flex;align-items:center;gap:0;margin:28px 0">'
    +'<div style="width:40px;height:3px;background:#C9973A"></div>'
    +'<div style="width:20px;height:3px;background:#1A6BB5"></div>'
    +'<div style="flex:1;height:1px;background:#E2E8F0"></div>'
    +'</div>'

    /* ── INFO PERIODE & ARMADA ── */
    +'<div style="display:flex;gap:40px;margin-bottom:48px">'
    +'<div><div style="font-size:9px;color:#94A3B8;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Armada</div>'
    +'<div style="font-size:14px;font-weight:700;color:#0D2B4E">'+fleetLbl+'</div></div>'
    +'<div style="width:1px;background:#E2E8F0"></div>'
    +'<div><div style="font-size:9px;color:#94A3B8;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Periode</div>'
    +'<div style="font-size:14px;font-weight:700;color:#0D2B4E">'+periode+'</div></div>'
    +'<div style="width:1px;background:#E2E8F0"></div>'
    +'<div><div style="font-size:9px;color:#94A3B8;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Status</div>'
    +'<div style="font-size:14px;font-weight:700;color:'+stOvr.c+'">'+stOvr.l+'</div></div>'
    +'</div>'

    /* ── 4 KPI CARDS ── putih bersih dengan border ── */
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:40px">'
    +[
      {l:"Coverage HRA",    v:d.hra.coverage+"%",    s:d.hra.done+"/"+d.hra.total+" kapal",  c:stC(d.hra.coverage,80,50)},
      {l:"DAT Compliance",  v:datPct+"%",             s:d.dat.positif+" positif",              c:stC(datPct,99,95)},
      {l:"Hazard NAB",      v:hazPct+"%",             s:d.hazard.melebihi+" melebihi",         c:stC(hazPct,100,80)},
      {l:"Pest Control",    v:d.pest.count>0?"Aktif":"—", s:d.pest.count+"x / "+d.pest.lokasi+" lok.", c:d.pest.count>0?"#2E7D32":"#C62828"}
    ].map(function(k){
      return '<div style="background:#fff;padding:20px 18px;border-top:3px solid '+k.c+'">'
        +'<div style="font-size:9px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">'+k.l+'</div>'
        +'<div style="font-size:28px;font-weight:700;color:'+k.c+';line-height:1;margin-bottom:4px">'+k.v+'</div>'
        +'<div style="font-size:10px;color:#64748B">'+k.s+'</div>'
        +'</div>';
    }).join("")
    +'</div>'

    /* ── DUA KOLOM: RUANG LINGKUP + TEMUAN ── */
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:40px">'

    /* Ruang lingkup */
    +'<div style="border:1px solid #E2E8F0;border-radius:6px;padding:20px 22px">'
    +'<div style="font-size:9px;font-weight:700;color:#0D2B4E;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;display:flex;align-items:center;gap:8px">'
    +'<div style="width:16px;height:2px;background:#C9973A"></div>Ruang Lingkup</div>'
    +'<div style="font-size:11px;color:#475569;line-height:2">'
    +'<div>Hazard Recognition &amp; Assessment (HRA)</div>'
    +'<div>Drugs &amp; Alcohol Test (DAT) Awak Kapal</div>'
    +'<div>Pest &amp; Rodent Control</div>'
    +'<div>5 Hazard Utama (Fisika, Kimia, Biologi, Ergonomi, Psikososial)</div>'
    +(nomBio?'<div>Biomonitoring Benzene (ACGIH BEI 2024)</div>':"")
    +'</div></div>'

    /* Temuan utama */
    +'<div style="border:1px solid #E2E8F0;border-radius:6px;padding:20px 22px">'
    +'<div style="font-size:9px;font-weight:700;color:#0D2B4E;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;display:flex;align-items:center;gap:8px">'
    +'<div style="width:16px;height:2px;background:#1A6BB5"></div>Temuan Utama</div>'
    +'<div style="font-size:11px;color:#475569;line-height:2.1">'
    +(parseFloat(d.hra.coverage)<80
      ?'<div style="color:#C62828">\u26a0 Coverage HRA '+d.hra.coverage+'% &mdash; '+d.hra.done+'/'+d.hra.total+' armada</div>'
      :'<div style="color:#2E7D32">\u2713 Coverage HRA '+d.hra.coverage+'% &mdash; '+d.hra.done+' armada HRA</div>')
    +(d.dat.positif>0
      ?'<div style="color:#C62828">\u26a0 '+d.dat.positif+' ABK reaktif ('+d.dat.rate+'%) dari '+d.dat.crew.toLocaleString("id-ID")+' terperiksa</div>'
      :'<div style="color:#2E7D32">\u2713 Zero positif DAT &mdash; '+d.dat.crew.toLocaleString("id-ID")+' awak negatif</div>')
    +(d.hazard.melebihi>0
      ?'<div style="color:#C62828">\u26a0 '+d.hazard.melebihi+' parameter hazard melebihi NAB</div>'
      :'<div style="color:#2E7D32">\u2713 Semua '+d.hazard.total+' parameter dalam batas NAB</div>')
    +(d.pest.count>0
      ?'<div style="color:#2E7D32">\u2713 Pest Control aktif &mdash; '+d.pest.count+'x di '+d.pest.lokasi+' lokasi</div>'
      :'<div style="color:#C62828">\u26a0 Belum ada data Pest Control</div>')
    +(nomBio&&d.bio.melebihi>0
      ?'<div style="color:#C62828">\u26a0 '+d.bio.melebihi+' sampel benzene melebihi BEI</div>':"")
    +'</div></div></div>'

    /* ── REFERENSI REGULASI ── */
    +'<div style="border-top:1px solid #E2E8F0;padding-top:16px">'
    +'<div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Kerangka Regulasi &amp; Standar</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
    +["Permenaker 05/2018","ACGIH TLV &amp; BEI 2024","ILO MLC 2006","IMO MSC/Circ.1351","ISO 45001:2018","IHR 2005 WHO"].map(function(s){
      return '<span style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:3px;padding:3px 10px;font-size:9px;color:#475569;font-weight:600">'+s+'</span>';
    }).join("")
    +'</div></div>'

    +'</div>'/* end padding div */

    /* ── BOTTOM FOOTER BAND ── */
    +'<div style="position:absolute;bottom:0;left:0;right:0;background:#0D2B4E;padding:12px 64px;display:flex;justify-content:space-between;align-items:center">'
    +'<span style="font-size:8px;color:rgba(255,255,255,.4);letter-spacing:1px;text-transform:uppercase">Konfidensial &mdash; Penggunaan Internal</span>'
    +'<span style="font-size:8px;color:rgba(255,255,255,.4)">Hal 1 / '+totalPages+'</span>'
    +'</div>'

    +'</div>';

  /* ══════════════ HALAMAN 2: HRA ══════════════ */
  var hraCovNum=parseFloat(d.hra.coverage);
  var pg2=phdr(2,totalPages)
    +shdr("fa-lungs","I. Hazard Recognition &amp; Assessment (HRA)","#1565C0")
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">'
    +kpi("Kapal Telah HRA",d.hra.done,"unit armada","#1565C0","#EBF5FF")
    +kpi("Belum HRA",d.hra.total-d.hra.done,"unit",hraCovNum<100?"#C62828":"#2E7D32",hraCovNum<100?"#FFEBEE":"#E8F5E9")
    +kpi("Coverage",d.hra.coverage+"%","dari total armada",stC(d.hra.coverage,80,50),stBg(d.hra.coverage,80,50),hraCovNum)
    +kpi("Est. Anggaran",formatRupiah(d.hra.budget),"total HRA","#6A1B9A","#F3E5F5")
    +'</div>'
    +anaBox("#1565C0","#EBF5FF","#BFDBFE","Analisis",
      hraCovNum>=80?
      'Coverage HRA <strong>'+d.hra.coverage+'%</strong> mencerminkan kepatuhan <strong>baik</strong> terhadap Permenaker No.05/2018 Pasal 6 Ayat (1). Dari <strong>'+d.hra.done+' unit</strong> yang telah HRA, seluruh proses dilaksanakan oleh vendor IH tersertifikasi dengan estimasi anggaran <strong>'+formatRupiah(d.hra.budget)+'</strong>. Pertahankan siklus HRA berkala minimal satu kali per tahun.':
      'Coverage HRA <strong>'+d.hra.coverage+'%</strong> mengindikasikan <strong>'+(d.hra.total-d.hra.done)+' unit armada</strong> belum menjalani proses identifikasi hazard secara sistematis. Kondisi ini berpotensi menimbulkan blind spot manajemen risiko kesehatan kerja ABK. Percepatan jadwal HRA diperlukan sesuai Permenaker No.05/2018 Pasal 6 Ayat (1).')
    +(d.hra.data&&d.hra.data.length?'<div style="margin-top:14px">'+tbl(
      ["Nama Kapal","Fleet","Bulan","Vendor","Status"],
      d.hra.data.slice(0,8).map(function(r){
        var ok=(r["Status"]||"").toLowerCase()==="done";
        return[
          '<strong>'+esc(r["Nama Kapal"]||"—")+'</strong>',
          esc(r["Jenis Fleet"]||"—"),
          esc(r["Bulan Pelaksanaan"]||"—"),
          esc(r["Vendor Pelaksana"]||"—"),
          '<span style="color:'+(ok?"#2E7D32":"#C62828")+';font-weight:700">'+(ok?"✓ Done":"⏳ Belum")+'</span>'
        ];
      }))+'</div>':"")
    +rekBox([
      [hraCovNum<80?"Susun jadwal HRA prioritas untuk "+(d.hra.total-d.hra.done)+" unit yang belum, koordinasi vendor IH":"Lakukan verifikasi dokumentasi HRA seluruh unit armada yang sudah selesai",
       "Update status HRA di IH Dashboard segera setelah setiap pelaksanaan selesai",
       "Pastikan seluruh temuan hazard di lapangan terdokumentasi dalam HIRARC"],
      ["Review dan validasi laporan HRA yang sudah selesai — pastikan kualitas temuan hazard",
       "Tindaklanjuti setiap temuan hazard dengan rencana pengendalian berbasis hierarki ISO 45001",
       "Jadwalkan medical surveillance ABK sesuai jenis hazard yang teridentifikasi"],
      ["Target coverage HRA 100% sebelum akhir tahun — tetapkan KPI bulanan",
       "Integrasikan temuan HRA ke Ship Safety Management System (SMS) sesuai ISM Code",
       "Siapkan laporan HRA tahunan komprehensif untuk audit biro klasifikasi &amp; PSC"]
    ])
    +regStrip(["Permenaker No.05/2018 Pasal 6","ISO 45001:2018 Klausul 8","ISM Code Reg.7","IMO MSC/Circ.1351"])
    +pftr;

  /* ══════════════ HALAMAN 3: DAT ══════════════ */
  var pg3=phdr(3,totalPages)
    +shdr("fa-vial","II. Drugs &amp; Alcohol Test (DAT)","#2E7D32")
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">'
    +kpi("Kapal Terperiksa",d.dat.kapal,"unit armada","#2E7D32","#E8F5E9")
    +kpi("Total Crew",d.dat.crew.toLocaleString("id-ID"),"awak kapal","#0F2A4A","#F0F4F8")
    +kpi("Hasil Reaktif",d.dat.positif,d.dat.positif>0?"perlu tindak lanjut":"zero positive",d.dat.positif>0?"#C62828":"#2E7D32",d.dat.positif>0?"#FFEBEE":"#E8F5E9")
    +kpi("Prevalensi",d.dat.rate+"%","dari terperiksa",parseFloat(d.dat.rate)>0?"#E65100":"#2E7D32",parseFloat(d.dat.rate)>0?"#FFF3E0":"#E8F5E9")
    +'</div>'
    +anaBox(d.dat.positif===0?"#2E7D32":"#C62828",d.dat.positif===0?"#E8F5E9":"#FFEBEE",d.dat.positif===0?"#A5D6A7":"#EF9A9A","Analisis",
      d.dat.positif===0?
      'Program DAT mencatat <strong>zero positive rate</strong> dari <strong>'+d.dat.crew.toLocaleString("id-ID")+'</strong> awak di <strong>'+d.dat.kapal+' unit armada</strong>. Kepatuhan penuh terhadap MLC 2006 Regulation 4.3 — pertahankan dengan penerapan random unannounced testing minimal 25% per semester.':
      'Teridentifikasi <strong>'+d.dat.positif+' ABK reaktif</strong> (prevalensi <strong>'+d.dat.rate+'%</strong>) dari '+d.dat.crew.toLocaleString("id-ID")+' awak terperiksa di '+d.dat.kapal+' unit armada. Diperlukan protokol medis dan administratif segera sesuai MLC 2006 Reg.4.3 dan STCW Manila 2010.')
    +(d.dat.bulanList&&d.dat.bulanList.length?'<div style="margin-top:14px">'+tbl(
      ["Bulan","Kapal","Crew","Positif","Prevalensi","Est. Biaya","Status"],
      d.dat.bulanList.map(function(r){
        var ok=r.positif===0;
        return[
          '<strong>'+r.bulan+'</strong>',
          r.kapal+' kapal',
          r.crew.toLocaleString("id-ID"),
          '<span style="color:'+(ok?"#2E7D32":"#C62828")+';font-weight:700">'+r.positif+'</span>',
          '<span style="color:'+(ok?"#2E7D32":"#C62828")+'">'+r.rate+'%</span>',
          formatRupiah(r.biaya),
          '<span style="color:'+(ok?"#2E7D32":"#C62828")+';font-weight:700">'+(ok?"✓ Negatif":"⚠ Temuan")+'</span>'
        ];
      }))+'</div>':"")
    /* Info cards DAT */
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">'
    +infoCard("fa-shield-halved","Standar Compliance DAT",
      "Mengacu OCIMF Guidelines for the Control of Drugs and Alcohol in the Maritime Industry (2024) serta MLC 2006 Reg.4.3 dan ISM Code. Mendukung pemenuhan elemen kesehatan TMSA &amp; inspeksi SIRE 2.0; benchmark prevalensi positif &lt;1% untuk armada tanker.",
      "#2E7D32")
    +infoCard("fa-flask","Metode Pemeriksaan",
      "Pemeriksaan wajib mencakup urine drug test (UDT) dan alcohol breathalyzer test (ABT). Spesimen harus ditangani dengan chain-of-custody oleh laboratorium terakreditasi KAN.",
      "#1565C0")
    +'</div>'
    +rekBox([
      [d.dat.positif>0?"Protokol medis segera untuk "+d.dat.positif+" ABK reaktif — evaluasi SpOK, fitness-to-work":"Pertahankan zero positive — tingkatkan frekuensi random testing",
       "Notifikasi nakhoda &amp; manajemen dalam 24 jam sesuai prosedur ISM Code",
       "Update status tindak lanjut di IH Dashboard untuk monitoring real-time"],
      ["Implementasikan random unannounced DAT min 25% crew per semester",
       "Audit vendor laboratorium — validasi akreditasi KAN dan metode pemeriksaan",
       "Sosialisasi kebijakan zero tolerance kepada seluruh ABK setiap kapal"],
      ["Dokumentasikan statistik DAT tahunan untuk PSC inspection dan audit ISM",
       "Kembangkan Substance Abuse Prevention Program (SAPP) yang komprehensif",
       "Integrasikan data DAT ke Health Record individual ABK secara berkala"]
    ])
    +regStrip(["MLC 2006 Reg.4.3","STCW 2010 Manila","Permenhub KM.5/2016","ISM Code Reg.4"])
    +pftr;

  /* ══════════════ HALAMAN 4: PEST ══════════════ */
  var pg4=phdr(4,totalPages)
    +shdr("fa-bug","III. Pest &amp; Rodent Control","#6A1B9A")
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">'
    +kpi("Total Kegiatan",d.pest.count,"pelaksanaan","#6A1B9A","#F3E5F5")
    +kpi("Lokasi",d.pest.lokasi,"lokasi kantor","#4527A0","#EDE7F6")
    +kpi("Est. Anggaran",formatRupiah(d.pest.biaya),"total program","#6A1B9A","#F3E5F5")
    +kpi("Status",d.pest.count>0?"Terlaksana":"Belum Ada",d.pest.count>0?"sesuai jadwal":"perlu percepatan",d.pest.count>0?"#2E7D32":"#E65100",d.pest.count>0?"#E8F5E9":"#FFF3E0")
    +'</div>'
    +anaBox("#6A1B9A","#EDE7F6","#B39DDB","Analisis",
      d.pest.count>0?
      'Program Pest &amp; Rodent Control telah terlaksana <strong>'+d.pest.count+' kegiatan</strong> di <strong>'+d.pest.lokasi+' lokasi</strong> fasilitas perkantoran dengan estimasi anggaran <strong>'+formatRupiah(d.pest.biaya)+'</strong>. Program memenuhi kewajiban sanitasi dan pengendalian vektor penyakit sesuai International Health Regulations (IHR) 2005 WHO.':
      'Belum terdapat data Pest Control pada periode ini. Program pengendalian vektor dan hama wajib dilaksanakan secara periodik sesuai IHR 2005 WHO untuk menjaga sanitasi lingkungan kerja yang sehat.')
    +(d.pest.bulanList&&d.pest.bulanList.length?'<div style="margin-top:14px">'+tbl(
      ["Bulan","Kegiatan","Lokasi","Temuan Utama","Est. Biaya"],
      d.pest.bulanList.map(function(r){
        return['<strong>'+r.bulan+'</strong>',r.count+'x',r.lokasi+' lokasi',esc(r.temuan),formatRupiah(r.biaya)];
      }))+'</div>':"")
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">'
    +infoCard("fa-house-medical","Vektor Penyakit &amp; Risiko Kesehatan",
      "Tikus merupakan reservoir Leptospirosis, Salmonellosis, dan Hantavirus. Kecoa menjadi vektor diare, Salmonella, dan alergen respiratorik. Nyamuk berpotensi transmisi DBD dan Malaria di area tropis.",
      "#6A1B9A")
    +infoCard("fa-calendar-check","Frekuensi Pengendalian yang Direkomendasikan",
      "Fogging dan fumigasi minimal 1x per 3 bulan per lokasi. Pasang perangkap rodensia permanen. Inspeksi sanitasi bulanan di area dapur, gudang, dan saluran air terbuka sesuai Permenkes No.50/2017.",
      "#4527A0")
    +'</div>'
    +rekBox([
      ["Fogging &amp; fumigasi terjadwal min 1x/3 bulan untuk semua "+d.pest.lokasi+" lokasi aktif",
       "Pasang perangkap tikus permanen di titik strategis: dapur, gudang, saluran air",
       "Perbaiki celah struktural gedung yang menjadi titik masuk hama"],
      ["Review vendor pest control — pastikan sertifikat masih aktif dan metode sesuai standar",
       "Sosialisasi kebersihan lingkungan kerja kepada seluruh karyawan per semester",
       "Koordinasi dengan pengelola gedung untuk maintenance saluran pembuangan"],
      ["Arsipkan laporan Pest Control untuk keperluan audit K3 tahunan dan sertifikasi",
       "Integrasikan data temuan hama ke penilaian risiko kesehatan lingkungan kerja",
       "Siapkan laporan sanitasi tahunan sesuai persyaratan IHR 2005 WHO"]
    ])
    +regStrip(["IHR 2005 WHO","Permenkes No.50/2017","PP No.66/2014 Kesehatan Lingkungan","SNI 8151:2015"])
    +pftr;

  /* ══════════════ HALAMAN 5: 5 HAZARD ══════════════ */
  var hRows=[
    {l:"Faktor Fisika",t:d.hazard.fisika.total,m:d.hazard.fisika.melebihi,c:"#1565C0",icon:"Kebisingan, Getaran, Suhu, Radiasi, Pencahayaan"},
    {l:"Faktor Kimia",t:d.hazard.kimia.total,m:d.hazard.kimia.melebihi,c:"#7B1FA2",icon:"VOC, H₂S, CO, Benzene, Debu B3"},
    {l:"Faktor Biologi",t:d.hazard.biologi.total,m:d.hazard.biologi.melebihi,c:"#2E7D32",icon:"Bakteri, Virus, Jamur, Protozoa"},
    {l:"Faktor Ergonomi",t:d.hazard.ergonomi.total,m:d.hazard.ergonomi.tinggi,c:"#E65100",icon:"Postur, Manual Handling, Repetitif, Vibrasi"},
    {l:"Faktor Psikososial",t:d.hazard.psiko.total,m:d.hazard.psiko.tinggi,c:"#AD1457",icon:"Beban Kerja, Isolasi, Fatigue, Konflik Peran"}
  ];
  var pg5=phdr(5,totalPages)
    +shdr("fa-triangle-exclamation","IV. Pemantauan 5 Hazard Utama (Permenaker 05/2018)","#E65100")
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'
    +kpi("Total Pengukuran",d.hazard.total,"parameter","#0F2A4A","#F0F4F8")
    +kpi("Melebihi NAB",d.hazard.melebihi,d.hazard.melebihi>0?"perlu pengendalian":"semua aman",d.hazard.melebihi>0?"#C62828":"#2E7D32",d.hazard.melebihi>0?"#FFEBEE":"#E8F5E9")
    +kpi("Compliance",hazPct+"%","dalam batas NAB",stC(hazPct,100,80),stBg(hazPct,100,80),parseFloat(hazPct))
    +'</div>'
    +'<div style="margin-bottom:16px">'
    +hRows.map(function(h){
      var pct=h.t>0?Math.round((h.m/h.t)*100):0;
      var okC=h.m===0?"#2E7D32":"#C62828";
      return'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;background:#F8FAFC;'
        +'border-radius:8px;padding:10px 14px;border-left:3px solid '+h.c+'">'
        +'<div style="width:120px;font-size:11px;font-weight:700;color:#334155;flex-shrink:0">'+h.l+'</div>'
        +'<div style="width:220px;font-size:9.5px;color:#94A3B8;flex-shrink:0">'+h.icon+'</div>'
        +'<div style="flex:1;background:#E2E8F0;border-radius:3px;height:8px;overflow:hidden">'
        +'<div style="width:'+(h.t>0?(h.m/h.t*100).toFixed(0):0)+'%;background:'+h.c+';height:8px"></div></div>'
        +'<div style="width:70px;text-align:right;font-size:11px;font-weight:700;color:'+okC+'">'+h.m+' / '+h.t+'</div>'
        +'<div style="width:38px;text-align:right;font-size:10px;color:'+h.c+'">'+pct+'%</div>'
        +'</div>';
    }).join("")+'</div>'
    +anaBox(d.hazard.melebihi===0?"#2E7D32":"#C62828",d.hazard.melebihi===0?"#E8F5E9":"#FFEBEE",d.hazard.melebihi===0?"#A5D6A7":"#EF9A9A","Analisis",
      d.hazard.melebihi===0?
      'Seluruh <strong>'+d.hazard.total+' parameter</strong> hazard berada dalam batas Nilai Ambang Batas (NAB) yang ditetapkan. Efektivitas program pengendalian hazard terjaga sesuai Permenaker No.05/2018. Pertahankan monitoring berkala setiap semester.':
      '<strong>'+d.hazard.melebihi+' parameter ('+Math.round((d.hazard.melebihi/d.hazard.total)*100)+'%)</strong> melampaui NAB dari '+d.hazard.total+' pengukuran. Implementasi segera 5 hierarki pengendalian risiko (Eliminasi → Substitusi → Rekayasa Teknik → Administratif → APD) sesuai Permenaker 05/2018 dan ISO 45001:2018.')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">'
    +infoCard("fa-layer-group","5 Hierarki Pengendalian (ISO 45001:2018)",
      "<strong>1. Eliminasi</strong> — hilangkan sumber bahaya<br><strong>2. Substitusi</strong> — ganti dengan yang lebih aman<br><strong>3. Rekayasa Teknik</strong> — engineering control<br><strong>4. Administratif</strong> — SOP &amp; prosedur<br><strong>5. APD</strong> — alat pelindung diri",
      "#E65100")
    +infoCard("fa-stethoscope","Medical Surveillance Wajib",
      "ABK yang terpapar hazard di atas NAB wajib mengikuti medical surveillance berkala sesuai Permenaker 05/2018 Lampiran IV. Periode pemeriksaan: setiap 6 bulan untuk hazard risiko tinggi, setiap 12 bulan untuk risiko sedang.",
      "#1565C0")
    +'</div>'
    +rekBox([
      [d.hazard.melebihi>0?"Pengendalian teknis segera untuk "+d.hazard.melebihi+" parameter melebihi NAB":"Pertahankan program pengendalian yang sudah efektif",
       "Evaluasi kesesuaian APD yang digunakan dengan jenis paparan yang terukur",
       "Pastikan seluruh temuan terdokumentasi di IH Dashboard untuk tracking"],
      ["Review JSA dan HIRARC area dengan temuan melebihi NAB",
       "Re-measurement setelah implementasi pengendalian untuk verifikasi efektivitas",
       "Medical surveillance untuk ABK terpapar di atas NAB setiap 6 bulan"],
      ["Integrasikan temuan 5 Hazard ke SMS kapal sebagai HIRARC permanen",
       "Monitoring berkala — jadwal pengukuran rutin minimal 1x per semester",
       "Laporan tahunan 5 Hazard untuk audit ISM Code &amp; biro klasifikasi"]
    ])
    +regStrip(["Permenaker 05/2018 Pasal 7-11","ACGIH TLV 2024","ISO 45001:2018 Klausul 8.1.2","PP No.88/2019 Kesehatan Kerja"])
    +pftr;

  /* ══════════════ HALAMAN 6 (opsional): BIOMARKER ══════════════ */
  var pg6bio="";
  if(nomBio){
    pg6bio=phdr(6,totalPages)
      +shdr("fa-flask","V. Biomonitoring Benzene (ACGIH BEI 2024)","#7B1FA2")
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'
      +kpi("Total Sampel",d.bio.total,"sampel urin","#7B1FA2","#F3E5F5")
      +kpi("Melebihi BEI",d.bio.melebihi,"(>25 µg/g kreat)",d.bio.melebihi>0?"#C62828":"#2E7D32",d.bio.melebihi>0?"#FFEBEE":"#E8F5E9")
      +kpi("Dalam Batas",d.bio.total-d.bio.melebihi,"BEI ACGIH 2024","#7B1FA2","#F3E5F5")
      +'</div>'
      +anaBox("#7B1FA2","#F3E5F5","#CE93D8","Analisis",
        d.bio.melebihi>0?
        '<strong>'+d.bio.melebihi+' sampel ('+Math.round((d.bio.melebihi/d.bio.total)*100)+'%)</strong> melebihi BEI ACGIH 2024 (25 µg/g kreatinin). Benzene terklasifikasi IARC Group 1 — meningkatkan risiko leukemia mieloid akut (AML) secara dose-dependent. Diperlukan medical surveillance intensif dan pengendalian sumber segera.':
        'Seluruh <strong>'+d.bio.total+' sampel</strong> berada dalam batas BEI ACGIH 2024. Mengingat benzene sebagai karsinogen IARC Group 1 tanpa threshold aman, prinsip ALARA (As Low As Reasonably Achievable) tetap diterapkan. Monitoring berkala wajib dipertahankan.')
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">'
      +infoCard("fa-biohazard","Klasifikasi Bahaya Benzene",
        "Benzene (C₆H₆) diklasifikasikan sebagai <strong>Karsinogen IARC Group 1</strong> (terbukti karsinogenik pada manusia). Paparan kronik menyebabkan leukemia mieloid akut (AML), aplastik anemia, dan gangguan hematopoiesis. <strong>Tidak ada nilai paparan yang dianggap aman secara absolut.</strong>",
        "#7B1FA2")
      +infoCard("fa-vial","Biomarker &amp; Batas BEI ACGIH 2024",
        "<strong>S-Phenylmercapturic Acid (S-PMA):</strong> BEI 25 µg/g kreatinin (urin akhir shift)<br><strong>t,t-Muconic Acid (ttMA):</strong> BEI 500 µg/g kreatinin<br><strong>TLV-TWA udara:</strong> 0.5 ppm (ACGIH 2024)<br>Pemeriksaan wajib pre-shift dan post-shift untuk akurasi optimal.",
        "#6A1B9A")
      +'</div>'
      +rekBox([
        [d.bio.melebihi>0?"Medical surveillance segera: hematologi lengkap untuk "+d.bio.melebihi+" ABK":"Pertahankan program biomonitoring rutin setiap 6 bulan",
         "Audit sumber paparan benzene: cargo tank, pump room, manifold area",
         "Pastikan APD full-face respirator OV/P100 digunakan di semua area berisiko"],
        ["Perbaiki sistem Local Exhaust Ventilation (LEV) di pump room dan manifold",
         "Review SOP bunkering &amp; cargo handling — terapkan closed-loop system",
         "Re-sampling dalam 3 bulan untuk ABK dengan kadar di atas BEI"],
        ["Jadwalkan biomonitoring benzene rutin setiap 6 bulan untuk ABK berisiko",
         "Daftarkan ABK riwayat paparan tinggi dalam program medical surveillance jangka panjang",
         "Laporan biomonitoring tahunan untuk PSC inspection &amp; biro klasifikasi"]
      ])
      +regStrip(["ACGIH BEI 2024","IARC Monograph Vol.100F","Permenaker 05/2018 Lampiran IV","IMO MARPOL Annex VI"])
      +pftr;
  }

  /* ══════════════ HALAMAN TERAKHIR: REKOMENDASI AI ══════════════ */
  var pgRekN=nomBio?7:6;
  var reks=[];
  if(parseFloat(d.hra.coverage)<80)
    reks.push({p:"HRA",t:"Akselerasi Coverage HRA",
      b:'Coverage HRA <strong>'+d.hra.coverage+'%</strong> dari '+d.hra.total+' unit armada berada di bawah threshold kepatuhan 80% sesuai Permenaker 05/2018. Diperlukan percepatan penjadwalan HRA untuk <strong>'+(d.hra.total-d.hra.done)+' unit</strong> yang belum terlaksana.',
      c:"#C62828",bg:"#FFEBEE",ic:"fa-lungs"});
  else reks.push({p:"HRA",t:"Pertahankan Coverage HRA",
    b:'Coverage HRA <strong>'+d.hra.coverage+'%</strong> menunjukkan kepatuhan substansial. Jadwalkan siklus HRA berikutnya dan integrasikan temuan ke Ship Safety Management System.',
    c:"#2E7D32",bg:"#E8F5E9",ic:"fa-lungs"});
  if(d.dat.positif>0) reks.push({p:"DAT",t:"Tindak Lanjut "+d.dat.positif+" ABK Reaktif",
    b:'Ditemukan <strong>'+d.dat.positif+' ABK reaktif</strong> (prevalensi <strong>'+d.dat.rate+'%</strong>) dari '+d.dat.crew.toLocaleString("id-ID")+' awak terperiksa. Protokol medis dan administratif wajib segera dilaksanakan sesuai MLC 2006 Reg.4.3.',
    c:"#C62828",bg:"#FFEBEE",ic:"fa-vial"});
  else reks.push({p:"DAT",t:"Zero Positive — Pertahankan Program",
    b:'Program DAT mencatat <strong>zero positive rate</strong> dari <strong>'+d.dat.crew.toLocaleString("id-ID")+'</strong> awak di '+d.dat.kapal+' kapal. Pertahankan dengan random unannounced testing minimal 25% per semester.',
    c:"#2E7D32",bg:"#E8F5E9",ic:"fa-vial"});
  if(d.hazard.melebihi>0) reks.push({p:"5 HAZARD",t:"Pengendalian "+d.hazard.melebihi+" Parameter Melebihi NAB",
    b:'<strong>'+d.hazard.melebihi+' parameter ('+Math.round((d.hazard.melebihi/d.hazard.total)*100)+'%)</strong> dari '+d.hazard.total+' pengukuran melampaui NAB. Implementasi segera 5 hierarki pengendalian risiko sesuai ISO 45001:2018.',
    c:"#E65100",bg:"#FFF3E0",ic:"fa-triangle-exclamation"});
  else reks.push({p:"5 HAZARD",t:"Seluruh Parameter dalam Batas NAB",
    b:'Semua <strong>'+d.hazard.total+' parameter</strong> hazard memenuhi NAB sesuai Permenaker 05/2018. Pertahankan monitoring berkala minimum satu kali per semester.',
    c:"#2E7D32",bg:"#E8F5E9",ic:"fa-shield-halved"});
  if(nomBio&&d.bio.melebihi>0) reks.push({p:"BIOMARKER",t:"Medical Surveillance "+d.bio.melebihi+" ABK",
    b:'<strong>'+d.bio.melebihi+' sampel</strong> melebihi BEI ACGIH 2024. Benzene IARC Group 1 — wajib pemeriksaan hematologi dan evaluasi SpOK. Perbaiki ventilasi LEV dan terapkan APD full-face respirator.',
    c:"#7B1FA2",bg:"#F3E5F5",ic:"fa-flask"});

  var pgRek=phdr(pgRekN,totalPages+(nomBio?1:0))
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #0F2A4A">'
    +'<div style="width:32px;height:32px;background:linear-gradient(135deg,#6A1B9A,#1565C0);border-radius:8px;display:flex;align-items:center;justify-content:center">'
    +'<i class="fas fa-brain" style="color:#fff;font-size:14px"></i></div>'
    +'<div style="font-size:16px;font-weight:700;color:#0F2A4A">Rekomendasi AI — Berbasis Data Aktual Dashboard</div>'
    +'<div style="margin-left:auto"><span style="background:linear-gradient(135deg,#6A1B9A,#1565C0);color:#fff;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700">AI Generated</span></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">'
    +reks.slice(0,3).map(function(r){
      return'<div style="background:'+r.bg+';border-radius:12px;padding:14px;border-top:3px solid '+r.c+'">'
        +'<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">'
        +'<i class="fas '+r.ic+'" style="color:'+r.c+';font-size:15px"></i>'
        +'<span style="font-size:9px;font-weight:700;color:'+r.c+';text-transform:uppercase;letter-spacing:.5px">'+r.p+'</span>'
        +'</div>'
        +'<div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:7px;line-height:1.4">'+r.t+'</div>'
        +'<div style="font-size:10.5px;color:#475569;line-height:1.65">'+r.b+'</div>'
        +'</div>';
    }).join("")+'</div>'
    +(reks.length>3?
      '<div style="display:grid;grid-template-columns:repeat('+(reks.length-3)+',1fr);gap:12px;margin-bottom:14px">'
      +reks.slice(3).map(function(r){
        return'<div style="background:'+r.bg+';border-radius:12px;padding:14px;border-top:3px solid '+r.c+'">'
          +'<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">'
          +'<i class="fas '+r.ic+'" style="color:'+r.c+';font-size:15px"></i>'
          +'<span style="font-size:9px;font-weight:700;color:'+r.c+';text-transform:uppercase;letter-spacing:.5px">'+r.p+'</span>'
          +'</div>'
          +'<div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:7px;line-height:1.4">'+r.t+'</div>'
          +'<div style="font-size:10.5px;color:#475569;line-height:1.65">'+r.b+'</div>'
          +'</div>';
      }).join("")+'</div>':"")
    /* Program prioritas */
    +'<div style="background:#F0F4F8;border-radius:12px;padding:14px 18px;margin-bottom:14px">'
    +'<div style="font-size:12px;font-weight:700;color:#0F2A4A;margin-bottom:10px">📋 Program Prioritas Periode Berikutnya</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
    +[
      {no:"1",aksi:hraCovNum<80?"Akselerasi HRA — "+Math.ceil(d.hra.total*0.8-d.hra.done)+" unit target":"Verifikasi dokumentasi HRA seluruh armada",by:"IH Officer",when:"Bulan depan"},
      {no:"2",aksi:d.dat.positif>0?"Follow-up medis "+d.dat.positif+" ABK reaktif":"Jadwalkan DAT unannounced berikutnya",by:"Manager Health",when:"Segera"},
      {no:"3",aksi:d.hazard.melebihi>0?"Engineering control "+d.hazard.melebihi+" hazard melebihi NAB":"Jadwal pengukuran hazard semester berikutnya",by:"IH Tim",when:"1–3 bulan"}
    ].map(function(item){
      return'<div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px">'
        +'<div style="font-size:10px;font-weight:700;color:#1565C0;margin-bottom:5px">No.'+item.no+'</div>'
        +'<div style="font-size:11px;color:#334155;font-weight:600;margin-bottom:4px;line-height:1.4">'+item.aksi+'</div>'
        +'<div style="font-size:9.5px;color:#64748B">PIC: '+item.by+' · '+item.when+'</div>'
        +'</div>';
    }).join("")
    +'</div></div>'
    /* Closing box */
    +'<div style="background:#0F2A4A;border-radius:12px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between">'
    +'<div>'
    +'<div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:3px">Dihasilkan oleh IH Dashboard v5.0 — PT Pertamina Patra Niaga SK Regional III</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.5)">Data aktual real-time · '+tgl+' · Konfidensial — Penggunaan Internal</div>'
    +'</div>'
    +'<div style="font-size:11px;color:#C9973A;font-weight:700">ihhealth3.com</div>'
    +'</div>'
    +pftr;

  /* ══ Assembel ══ */
  var html='<div id="summaryPrintArea" style="display:flex;flex-direction:column;gap:0;background:#CBD5E1;padding:0;width:794px">'
    +pg("pg-cover",pg1)
    +pg("pg-hra",pg2)
    +pg("pg-dat",pg3)
    +pg("pg-pest",pg4)
    +pg("pg-hazard",pg5)
    +(nomBio?pg("pg-bio",pg6bio):"")
    +pg("pg-rek",pgRek)
    +'</div>';
  el.innerHTML=html;
  _summaryCache=html;
  _summaryCacheKey=cKey||"";
}

/* ═══════════════════════════════════════════════════
   EXPORT PDF — capture per halaman A4
═══════════════════════════════════════════════════ */
async function exportSummaryPDF(){
  var btn=document.querySelector("[onclick*='exportSummaryPDF']");
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Membuat PDF...';}
  try{
    var area=document.getElementById("summaryPrintArea");
    if(!area){showToast("Buka halaman Summary dulu.","warning");if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}return;}
    var pages=area.querySelectorAll("[id^='pg-']");
    if(!pages||!pages.length){showToast("Tidak ada halaman untuk di-export.","warning");if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}return;}
    var {jsPDF}=window.jspdf;
    var pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
    var pw=pdf.internal.pageSize.getWidth();
    var ph=pdf.internal.pageSize.getHeight();
    showToast("Memproses "+pages.length+" halaman...","info");
    for(var i=0;i<pages.length;i++){
      if(btn)btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Hal '+(i+1)+"/"+pages.length+"...";
      var canvas=await html2canvas(pages[i],{scale:2,useCORS:true,logging:false,backgroundColor:"#ffffff",width:794,height:1123,windowWidth:794});
      if(i>0)pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg",0.92),"JPEG",0,0,pw,ph);
    }
    var now=new Date();
    var fleet=(document.getElementById("summary-filter-fleet")||{}).value||"";
    var bulan=(document.getElementById("summary-filter-bulan")||{}).value||"";
    var suffix=(bulan?"_"+bulan:"")+(fleet&&fleet!=="Seluruh Armada"?"_"+fleet.replace(/\s+/g,""):"");
    pdf.save("IH_Summary"+suffix+"_"+now.toISOString().slice(0,10)+".pdf");
    showToast("PDF berhasil didownload — "+pages.length+" halaman!","success");
  }catch(e){console.error(e);showToast("Gagal export PDF: "+e.message,"error");}
  if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF';}
}


/* ═══════════════════════════════════════════════════════════════
   LAPORAN PDF — SEBARAN ALKES KAPAL (formal, untuk Kapten)
   Pakai html2canvas + jsPDF (pola sama exportSummaryPDF).
   Isi: kop, ringkasan, tabel ketersediaan semua kapal, temuan,
   rekomendasi sesuai regulasi (Indonesia + maritim internasional),
   tanggal update.
═══════════════════════════════════════════════════════════════ */
var ALKES_WAJIB_LBL=["AED","Tandu Biasa","Basket Stretcher","Long Spinal Board",
  "Tabung Oksigen","Body Thermometer","Blood Pressure Monitor","Spirometry"];

function _alkesPdfMetrics(data){
  var m={total:data.length,lengkap:0,parsial:0,tidakLengkap:0,expired:0,aedExpired:0,avgPct:0,
    perItem:{},kapalKurang:[],kapalExpired:[]};
  ALKES_WAJIB_LBL.forEach(function(it){m.perItem[it]={ada:0,tidak:0};});
  var sum=0;
  data.forEach(function(r){
    var st=r._status||"";
    if(st==="LENGKAP")m.lengkap++;else if(st==="PARSIAL")m.parsial++;
    else if(st==="EXPIRED")m.expired++;else m.tidakLengkap++;
    if(r._expiredAED){m.aedExpired++;m.kapalExpired.push(r._kapal||r["Nama Kapal"]||"-");}
    var pct=parseFloat(r._kelengkapanPct)||0; sum+=pct;
    if(pct<100)m.kapalKurang.push({nama:r._kapal||r["Nama Kapal"]||"-",pct:pct});
    /* hitung per item dari detail atau kolom mentah */
    ALKES_WAJIB_LBL.forEach(function(lbl){
      var key=lbl==="AED"?"Aed":lbl;
      var v="";
      if(r._alkesDetail&&r._alkesDetail.length){
        var d=r._alkesDetail.filter(function(x){return x.nama===lbl||x.nama===key;})[0];
        v=d?d.status:"";
      } else { v=String(r[key]||r[lbl]||"").toUpperCase().trim(); }
      if(v==="ADA")m.perItem[lbl].ada++;else m.perItem[lbl].tidak++;
    });
  });
  m.avgPct=data.length?Math.round(sum/data.length):0;
  m.kapalKurang.sort(function(a,b){return a.pct-b.pct;});
  return m;
}

function _alkesPdfRecs(m){
  /* rekomendasi sesuai regulasi — selaras dengan mesin _ai ALKES */
  var recs=[];
  if(m.aedExpired>0)recs.push({pri:"TINGGI",text:
    "Segera lakukan penggantian/pengisian ulang "+m.aedExpired+" unit AED yang telah melewati masa berlaku "+
    "(baterai dan pad elektroda). AED kedaluwarsa berisiko gagal berfungsi saat kondisi henti jantung mendadak di atas kapal.",
    reg:"MLC 2006 Reg. 4.1 (Medical Care On Board) · IMO/ILO/WHO International Medical Guide for Ships"});
  if(m.tidakLengkap>0)recs.push({pri:"TINGGI",text:
    "Penuhi alat kesehatan wajib pada "+m.tidakLengkap+" kapal berstatus TIDAK LENGKAP. Koordinasikan pengadaan agar "+
    "setiap kapal memiliki kelengkapan medis minimum sebelum berlayar.",
    reg:"MLC 2006 Reg. 4.1 · Permenkes RI No. 4 Tahun 2019 (Standar Pelayanan Kesehatan)"});
  if(m.parsial>0)recs.push({pri:"SEDANG",text:
    "Lengkapi kekurangan alat pada "+m.parsial+" kapal berstatus PARSIAL. Prioritaskan item penyelamatan jiwa "+
    "(AED, Tabung Oksigen, Long Spinal Board) sebelum alat penunjang lainnya.",
    reg:"ISM Code · MLC 2006 Reg. 4.1 · Ship's Medicine Chest Guidelines"});
  /* item paling banyak kurang */
  var itemKurang=ALKES_WAJIB_LBL.map(function(l){return {n:l,t:m.perItem[l].tidak};})
    .filter(function(x){return x.t>0;}).sort(function(a,b){return b.t-a.t;});
  if(itemKurang.length)recs.push({pri:"SEDANG",text:
    "Jenis alat yang paling banyak belum tersedia di armada: "+
    itemKurang.slice(0,3).map(function(x){return x.n+" ("+x.t+" kapal)";}).join(", ")+
    ". Pertimbangkan pengadaan terpusat untuk efisiensi biaya.",
    reg:"ISO 45001:2018 cl. 8.2 (Kesiapan & Tanggap Darurat)"});
  recs.push({pri:"RUTIN",text:
    "Lakukan inspeksi dan kalibrasi alat kesehatan secara berkala (cek masa berlaku AED, tekanan tabung oksigen, "+
    "fungsi tensimeter & termometer), serta catat dalam log pemeliharaan sebagai bukti kesiapan darurat untuk "+
    "audit Port State Control (PSC) dan biro klasifikasi.",
    reg:"ISM Code (Maintenance) · MLC 2006 Reg. 4.1 · UU No. 17/2008 tentang Pelayaran"});
  return recs;
}

async function exportAlkesPDF(){
  var btn=document.querySelector("[onclick*='exportAlkesPDF']");
  var oldHtml=btn?btn.innerHTML:"";
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Membuat PDF...';}
  try{
    if(typeof window.jspdf==="undefined"||typeof html2canvas==="undefined"){
      showToast("Library PDF belum termuat. Coba lagi sesaat.","warning");
      if(btn){btn.disabled=false;btn.innerHTML=oldHtml;}return;
    }
    var data=(typeof filteredAlkes!=="undefined"&&filteredAlkes.length)?filteredAlkes:
             (typeof rawAlkes!=="undefined"?rawAlkes:[]);
    if(!data.length){showToast("Tidak ada data Sebaran Alkes.","warning");if(btn){btn.disabled=false;btn.innerHTML=oldHtml;}return;}

    var m=_alkesPdfMetrics(data);
    var recs=_alkesPdfRecs(m);
    var now=new Date();
    var tglStr=now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
    var jamStr=now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});

    /* ── Bangun halaman HTML laporan (tersembunyi) ── */
    var host=document.createElement("div");
    host.style.cssText="position:fixed;left:-9999px;top:0;width:794px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a";
    function esc2(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

    var PRIC={TINGGI:"#C62828",SEDANG:"#E65100",RUTIN:"#00695C"};
    var PRIBG={TINGGI:"#FDECEA",SEDANG:"#FFF3E0",RUTIN:"#E0F2F1"};

    /* Header reusable */
    function pageHead(judul){
      return '<div style="border-bottom:3px solid #003B73;padding-bottom:10px;margin-bottom:18px">'+
        '<div style="font-size:11px;letter-spacing:1px;color:#003B73;font-weight:700">PT PERTAMINA PATRA NIAGA — HSSE FUNGSI HEALTH</div>'+
        '<div style="font-size:19px;font-weight:800;color:#0F2A4A;margin-top:3px">'+judul+'</div>'+
        '<div style="font-size:10.5px;color:#555;margin-top:3px">Laporan Ketersediaan Alat Kesehatan (Alkes) Kapal · Diperbarui: '+tglStr+' pukul '+jamStr+' WIB</div>'+
        '</div>';
    }
    function pageFoot(no){
      return '<div style="position:absolute;bottom:24px;left:42px;right:42px;border-top:1px solid #ccc;padding-top:7px;font-size:8.5px;color:#888;display:flex;justify-content:space-between">'+
        '<span>Dokumen ini dihasilkan otomatis oleh IH Dashboard — bersifat internal & rahasia.</span><span>Halaman '+no+'</span></div>';
    }
    function pageWrap(inner){
      return '<div style="width:794px;min-height:1123px;padding:42px;box-sizing:border-box;position:relative;background:#fff">'+inner+'</div>';
    }

    /* KPI ringkas */
    function kpiBox(val,lbl,col){
      return '<div style="flex:1;border:1px solid #E2E8F0;border-top:4px solid '+col+';border-radius:8px;padding:12px 10px;text-align:center;background:#fff">'+
        '<div style="font-size:26px;font-weight:800;color:'+col+'">'+val+'</div>'+
        '<div style="font-size:9.5px;color:#555;margin-top:3px;text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div></div>';
    }

    var statusColor=m.avgPct>=90?"#2E7D32":m.avgPct>=60?"#E65100":"#C62828";

    /* ===== HALAMAN 1: Ringkasan + Temuan ===== */
    var p1=pageHead("Ringkasan Eksekutif");
    p1+='<div style="display:flex;gap:10px;margin-bottom:16px">'+
      kpiBox(m.total,"Total Kapal","#1565C0")+
      kpiBox(m.lengkap,"Lengkap","#2E7D32")+
      kpiBox(m.parsial,"Parsial","#E65100")+
      kpiBox(m.tidakLengkap+m.expired,"Tidak Lengkap","#C62828")+
    '</div>';
    p1+='<div style="display:flex;gap:10px;margin-bottom:18px">'+
      kpiBox(m.avgPct+"%","Rata-rata Kelengkapan",statusColor)+
      kpiBox(m.aedExpired,"AED Kedaluwarsa",m.aedExpired>0?"#C62828":"#2E7D32")+
    '</div>';

    /* Narasi temuan */
    var temuanArr=[];
    temuanArr.push("Dari total "+m.total+" kapal yang dipantau, "+m.lengkap+" kapal memiliki alkes LENGKAP (100%), "+
      m.parsial+" kapal PARSIAL, dan "+(m.tidakLengkap+m.expired)+" kapal TIDAK LENGKAP/EXPIRED.");
    temuanArr.push("Rata-rata tingkat kelengkapan alat kesehatan armada adalah "+m.avgPct+"%.");
    if(m.aedExpired>0)temuanArr.push("Terdapat "+m.aedExpired+" unit AED yang telah melewati masa berlaku pada kapal: "+m.kapalExpired.slice(0,6).join(", ")+(m.kapalExpired.length>6?", dll":"")+".");
    else temuanArr.push("Seluruh unit AED dalam armada masih dalam masa berlaku.");
    if(m.kapalKurang.length)temuanArr.push("Kapal dengan kelengkapan terendah: "+
      m.kapalKurang.slice(0,5).map(function(k){return k.nama+" ("+k.pct+"%)";}).join(", ")+".");

    p1+='<div style="font-size:14px;font-weight:800;color:#0F2A4A;margin:4px 0 9px;border-left:4px solid #003B73;padding-left:9px">Temuan Utama</div>';
    p1+='<ul style="margin:0 0 4px;padding-left:20px;font-size:11.5px;line-height:1.7;color:#222">'+
      temuanArr.map(function(t){return '<li style="margin-bottom:5px">'+esc2(t)+'</li>';}).join('')+'</ul>';

    /* Tabel per item */
    p1+='<div style="font-size:14px;font-weight:800;color:#0F2A4A;margin:16px 0 9px;border-left:4px solid #003B73;padding-left:9px">Ketersediaan per Jenis Alat (8 Alkes Wajib)</div>';
    p1+='<table style="width:100%;border-collapse:collapse;font-size:10.5px"><thead><tr style="background:#003B73;color:#fff">'+
      '<th style="text-align:left;padding:7px 9px">Jenis Alat</th>'+
      '<th style="text-align:center;padding:7px 9px">Tersedia (Kapal)</th>'+
      '<th style="text-align:center;padding:7px 9px">Belum Ada</th>'+
      '<th style="text-align:center;padding:7px 9px">% Tersedia</th></tr></thead><tbody>';
    ALKES_WAJIB_LBL.forEach(function(lbl,i){
      var pi=m.perItem[lbl];var pct=m.total?Math.round((pi.ada/m.total)*100):0;
      var c=pct>=90?"#2E7D32":pct>=60?"#E65100":"#C62828";
      p1+='<tr style="background:'+(i%2?"#F7FAFC":"#fff")+'">'+
        '<td style="padding:6px 9px;border-bottom:1px solid #EEE">'+esc2(lbl)+'</td>'+
        '<td style="padding:6px 9px;border-bottom:1px solid #EEE;text-align:center">'+pi.ada+'</td>'+
        '<td style="padding:6px 9px;border-bottom:1px solid #EEE;text-align:center">'+pi.tidak+'</td>'+
        '<td style="padding:6px 9px;border-bottom:1px solid #EEE;text-align:center;font-weight:700;color:'+c+'">'+pct+'%</td></tr>';
    });
    p1+='</tbody></table>';
    p1+=pageFoot(1);

    /* ===== HALAMAN 2: Tabel semua kapal ===== */
    var rowsPerPage=20;
    /* Deteksi grup dari awalan nama kapal */
    function _grupKapal(nama){
      var n=String(nama||"").trim().toUpperCase();
      if(/^NC\b/.test(n)||n.indexOf("NC ")===0||n.indexOf("NC-")===0||/^NC/.test(n))return "NC";
      if(/^PTK\b/.test(n)||n.indexOf("PTK ")===0||n.indexOf("PTK-")===0||/^PTK/.test(n))return "PTK";
      return "LAINNYA";
    }
    function _sortByPct(arr){return arr.slice().sort(function(a,b){return (parseFloat(a._kelengkapanPct)||0)-(parseFloat(b._kelengkapanPct)||0);});}
    var grupNC=[],grupPTK=[],grupLain=[];
    data.forEach(function(r){
      var g=_grupKapal(r._kapal||r["Nama Kapal"]||"");
      if(g==="NC")grupNC.push(r);else if(g==="PTK")grupPTK.push(r);else grupLain.push(r);
    });
    var grupList=[
      {judul:"Kapal NC",data:_sortByPct(grupNC)},
      {judul:"Kapal PTK",data:_sortByPct(grupPTK)},
      {judul:"Kapal Lainnya",data:_sortByPct(grupLain)}
    ].filter(function(g){return g.data.length>0;});

    /* Bangun "blok" konten: tiap grup punya sub-judul + baris-barisnya.
       Lalu dipecah ke halaman berdasarkan kapasitas baris per halaman. */
    function tblHead(){
      return '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#003B73;color:#fff">'+
        '<th style="text-align:left;padding:6px 8px;width:26px">No</th>'+
        '<th style="text-align:left;padding:6px 8px">Nama Kapal</th>'+
        '<th style="text-align:left;padding:6px 8px">Fleet</th>'+
        '<th style="text-align:center;padding:6px 8px">Kelengkapan</th>'+
        '<th style="text-align:center;padding:6px 8px">Status</th>'+
        '<th style="text-align:center;padding:6px 8px">AED</th></tr></thead><tbody>';
    }
    function rowHtml(r,no,idx){
      var st=r._status||"-";
      var stc=st==="LENGKAP"?"#2E7D32":st==="PARSIAL"?"#E65100":"#C62828";
      var pct=parseFloat(r._kelengkapanPct)||0;
      var aedTxt=r._expiredAED?"EXPIRED":"OK";var aedC=r._expiredAED?"#C62828":"#2E7D32";
      return '<tr style="background:'+(idx%2?"#F7FAFC":"#fff")+'">'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE">'+no+'</td>'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE;font-weight:600">'+esc2(r._kapal||r["Nama Kapal"]||"-")+'</td>'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE">'+esc2(r._fleet||r["Fleet"]||"-")+'</td>'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE;text-align:center;font-weight:700;color:'+stc+'">'+pct+'%</td>'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE;text-align:center;color:'+stc+';font-weight:700">'+esc2(st)+'</td>'+
        '<td style="padding:5px 8px;border-bottom:1px solid #EEE;text-align:center;color:'+aedC+';font-weight:700">'+aedTxt+'</td></tr>';
    }
    function grupSubHeader(judul,jml){
      return '<div style="background:#E8EEF5;border-left:5px solid #003B73;padding:7px 11px;margin:14px 0 8px;font-size:12px;font-weight:800;color:#0F2A4A">'+
        esc2(judul)+' <span style="font-weight:600;color:#5A6B82;font-size:10.5px">('+jml+' kapal)</span></div>';
    }

    /* Susun jadi "unit konten" lalu paginate sederhana per ~20 baris kumulatif */
    var kapalHtmlPages=[];
    var curBody="";        /* isi halaman berjalan */
    var curRows=0;         /* hitung baris pada halaman berjalan */
    var pageIdx=0;
    var totalGrups=grupList.length;
    function flushPage(){
      var title="Daftar Ketersediaan Alkes per Kapal"+(pageIdx>0?" (lanjutan)":"");
      kapalHtmlPages.push(pageHead(title)+curBody);
      curBody=""; curRows=0; pageIdx++;
    }
    grupList.forEach(function(g){
      /* sub-header butuh ruang; kalau halaman hampir penuh, pindah halaman dulu */
      if(curRows>0 && curRows>rowsPerPage-4){ flushPage(); }
      curBody+=grupSubHeader(g.judul,g.data.length);
      curBody+=tblHead();
      var openTable=true;
      g.data.forEach(function(r,i){
        if(curRows>=rowsPerPage){
          /* tutup tabel, pindah halaman, buka tabel lagi dengan header sama */
          curBody+='</tbody></table>';
          flushPage();
          curBody+=grupSubHeader(g.judul+" (lanjutan)",g.data.length);
          curBody+=tblHead();
        }
        curBody+=rowHtml(r,i+1,i);
        curRows++;
      });
      curBody+='</tbody></table>';
    });
    if(curBody)flushPage();
    if(!kapalHtmlPages.length)kapalHtmlPages.push(pageHead("Daftar Ketersediaan Alkes per Kapal")+'<div style="font-size:11px;color:#666">Tidak ada data kapal.</div>');
    /* tambahkan footer nomor halaman */
    kapalHtmlPages=kapalHtmlPages.map(function(h,i){return h+pageFoot(2+i);});

    /* ===== HALAMAN TERAKHIR: Rekomendasi ===== */
    var pr=pageHead("Rekomendasi & Tindak Lanjut");
    pr+='<div style="font-size:11px;color:#444;margin-bottom:14px;line-height:1.6">Rekomendasi berikut disusun berdasarkan temuan kondisi alkes armada dan mengacu pada regulasi keselamatan & kesehatan kerja pelayaran yang berlaku di Indonesia maupun standar maritim internasional.</div>';
    recs.forEach(function(rc){
      pr+='<div style="border:1px solid #E2E8F0;border-left:5px solid '+PRIC[rc.pri]+';border-radius:7px;padding:11px 13px;margin-bottom:11px;background:'+PRIBG[rc.pri]+'">'+
        '<div style="display:inline-block;font-size:9px;font-weight:800;color:#fff;background:'+PRIC[rc.pri]+';padding:2px 9px;border-radius:11px;letter-spacing:.5px;margin-bottom:6px">PRIORITAS '+rc.pri+'</div>'+
        '<div style="font-size:11.5px;color:#1a1a1a;line-height:1.6">'+esc2(rc.text)+'</div>'+
        '<div style="font-size:9.5px;color:#003B73;font-weight:700;margin-top:6px"><i>Dasar regulasi: '+esc2(rc.reg)+'</i></div>'+
        '</div>';
    });
    pr+='<div style="margin-top:18px;padding:12px 14px;background:#F0F4F8;border-radius:7px;font-size:10px;color:#555;line-height:1.6">'+
      '<b>Catatan untuk Nakhoda/Kapten:</b> Pastikan seluruh alat penyelamatan jiwa (AED, Tabung Oksigen, Long Spinal Board, Basket Stretcher) dalam kondisi siap pakai dan tidak kedaluwarsa sebelum kapal berlayar. Laporkan segera kekurangan alkes kepada Fungsi Health HSSE untuk tindak lanjut pengadaan.</div>';
    pr+='<div style="margin-top:22px;font-size:10.5px;color:#333">Hormat kami,<br><br><b>HSSE Fungsi Health</b><br>PT Pertamina Patra Niaga</div>';
    pr+=pageFoot(2+kapalHtmlPages.length);

    /* Gabung semua halaman */
    var allPages=[p1].concat(kapalHtmlPages).concat([pr]);
    host.innerHTML=allPages.map(function(h){return pageWrap(h);}).join('');
    document.body.appendChild(host);

    /* Render ke PDF */
    var {jsPDF}=window.jspdf;
    var pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
    var pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
    var pageEls=host.children;
    showToast("Memproses "+pageEls.length+" halaman laporan...","info");
    for(var i=0;i<pageEls.length;i++){
      if(btn)btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Hal '+(i+1)+"/"+pageEls.length+"...";
      var canvas=await html2canvas(pageEls[i],{scale:2,useCORS:true,logging:false,backgroundColor:"#ffffff",width:794,height:1123,windowWidth:794});
      if(i>0)pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg",0.92),"JPEG",0,0,pw,ph);
    }
    document.body.removeChild(host);
    pdf.save("Laporan_Sebaran_Alkes_"+now.toISOString().slice(0,10)+".pdf");
    showToast("PDF laporan Alkes berhasil dibuat — "+pageEls.length+" halaman!","success");
  }catch(e){console.error(e);showToast("Gagal export PDF Alkes: "+(e&&e.message||e),"error");}
  if(btn){btn.disabled=false;btn.innerHTML=oldHtml;}
}



var _memoType = "";

/* ── Buka modal ── */
function showMemoModal(type){
  if(!isAdmin()||isDemo()){showToast("Fitur ini hanya dapat diakses oleh Admin.","warning");return;}
  _memoType = type;
  var modal  = document.getElementById("memoModal");
  var title  = document.getElementById("memoModalTitle");
  var fields = document.getElementById("memoModalFields");
  if(!modal) return;

  /* Default dari data DAT yang sedang difilter */
  var kapalDef = "", crewDef = "";
  if(typeof filteredDAT !== "undefined" && filteredDAT.length){
    var fk = (document.getElementById("dat-filter-kapal")||{}).value||"";
    if(fk) kapalDef = fk;
    var tc = filteredDAT.reduce(function(s,r){return s+parseInt(r["Total Crew Diperiksa"]||0);},0);
    if(tc>0) crewDef = String(tc);
  }
  var now = new Date();
  var tglDef = "Jakarta, "+now.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});

  function field(id,label,type,val,ph){
    type = type||"text";
    return '<div class="memo-field"><label>'+label+'</label>'
      +'<input id="'+id+'" type="'+type+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'"></div>';
  }

  if(type === "fleet"){
    title.textContent = "📄 Nota Dinas DAT — Manager Fleet";
    fields.innerHTML =
      field("mf_tgl","Tanggal Surat","text",tglDef,"Jakarta, 07 Juni 2026")+
      field("mf_nomor","Nomor Surat","text","","088/PIS0400-PN/2026-S0")+
      field("mf_tujuan","Kepada","text","Sr Manager Fleet Crude","Sr Manager Fleet Crude")+
      field("mf_dari","Dari","text","Pjs VP HSSE III","Pjs VP HSSE III")+
      field("mf_kapal","Nama Kapal","text",kapalDef,"MT Serui")+
      field("mf_crew","Jumlah Crew","number",crewDef,"13")+
      field("mf_lokasi","Lokasi Pelaksanaan","text","","Port Balikpapan")+
      field("mf_tglpel","Tanggal Pelaksanaan","text","","06 Juni 2026")+
      field("mf_vendor","Nama Pelaksana (RSP/Vendor)","text","","RSP Balikpapan")+
      field("mf_jabatan","Jabatan Penandatangan","text","Pjs VP HSSE III","Pjs VP HSSE III")+
      field("mf_ttd","Nama Penandatangan","text","Diyon Indarto","Diyon Indarto")+
      field("mf_jabttd","Jabatan di Kotak Tanda Tangan","text","Manager Health","Manager Health");
  } else {
    title.textContent = "📄 Surat DAT — Rumah Sakit / Vendor Pelaksana";
    fields.innerHTML =
      field("mf_tgl","Tanggal Surat","text",tglDef,"Jakarta, 07 Juni 2026")+
      field("mf_nomor","Nomor Surat","text","","091/PIS0400-PN/2026-S0")+
      field("mf_klinik","Tujuan (Jabatan/Nama RS)","text","Director RS Pertamina Balikpapan","Director RS Pertamina Balikpapan")+
      field("mf_instansi","Nama Instansi","text","PT Pertamina Bina Medika","PT Pertamina Bina Medika")+
      field("mf_pelaksana","Nama Pelaksana (RSP/Vendor)","text","RSP Balikpapan","RSP Balikpapan")+
      field("mf_kapal","Nama Kapal","text",kapalDef,"MT Serui")+
      field("mf_crew","Jumlah Crew","number",crewDef,"13")+
      field("mf_lokasi","Lokasi Pelaksanaan","text","","Port Balikpapan")+
      field("mf_tglpel","Tanggal Pelaksanaan","text","","06 Juni 2026")+
      field("mf_jabatan","Jabatan Penandatangan","text","Pjs VP HSSE III","Pjs VP HSSE III")+
      field("mf_ttd","Nama Penandatangan","text","Diyon Indarto","Diyon Indarto")+
      field("mf_jabttd","Jabatan di Kotak Tanda Tangan","text","Manager Health","Manager Health");
  }
  modal.style.display = "flex";
}

function closeMemoModal(){
  var m = document.getElementById("memoModal");
  if(m) m.style.display = "none";
}

function _mv(id){
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

async function downloadMemo(){
  var btn=document.getElementById("btnDownloadMemo");
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Membuat dokumen...';}
  try{
    /* Tunggu library docx max 15 detik dengan retry setiap 500ms */
    var waited=0;
    while(!_docxReady()&&waited<15000){
      await new Promise(function(r){setTimeout(r,500);});
      waited+=500;
      if(btn&&waited%2000===0){
        btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Memuat library ('+Math.round(waited/1000)+'s)...';
      }
    }
    if(!_docxReady()){
      /* Diagnosis lebih detail untuk debugging */
      var diagMsg="Library docx gagal dimuat setelah 15 detik. ";
      if(!window.docx) diagMsg+="window.docx=undefined. ";
      else diagMsg+="window.docx ada tapi Packer tidak ditemukan. ";
      diagMsg+="Pastikan koneksi internet aktif lalu refresh.";
      showToast(diagMsg,"error");
      console.error("[DOCX]",diagMsg,"window.docx=",window.docx);
      return;
    }
    if(_memoType==="fleet") await _buildMemoFleet();
    else await _buildMemoKlinik();
    closeMemoModal();
    showToast("Memo berhasil didownload!","success");
  }catch(e){
    console.error("downloadMemo error:",e);
    var errMsg = e.message||String(e);
    /* Diagnosa spesifik */
    if(errMsg.includes("Document")||errMsg.includes("Paragraph")||errMsg.includes("AlignmentType")){
      errMsg += " — Coba refresh halaman, library docx mungkin versi tidak kompatibel.";
    }
    showToast("Gagal membuat memo: "+errMsg,"error");
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-file-word"></i> Download .docx';}
  }
}

/* Cek apakah window.docx sudah siap dan punya Document + Packer */
function _docxReady(){
  try{
    /* docx UMD dapat expose ke: window.docx, window.docx.default, atau window.Document */
    var candidates=[
      window.docx,
      window.docx&&window.docx.default,
    ].filter(Boolean);
    for(var i=0;i<candidates.length;i++){
      var d=candidates[i];
      var Doc=d.Document||d.document;
      var Pk =d.Packer;
      /* Cek juga AlignmentType & Paragraph tersedia (dipakai di _mp) */
      var hasAlign=!!(d.AlignmentType||d.AlignmentType);
      if(Doc&&Pk&&(Pk.toBlob||Pk.toBase64String||Pk.toBuffer)){
        return true;
      }
    }
    return false;
  }catch(e){return false;}
}

/* ════════════════════════════════════════════════════
   Builder helpers — pakai window.docx
════════════════════════════════════════════════════ */
/* _D(): ambil namespace docx, support UMD (window.docx.X) dan ESM default (window.docx.default.X) */
function _D(){
  /* Ambil namespace docx yang benar — handle UMD, ESM-wrapped, dan CommonJS */
  if(!window.docx) throw new Error("window.docx tidak tersedia");
  var d=window.docx;
  /* Pola 1: langsung {Document, Packer, ...} */
  if(d.Document&&d.Packer) return d;
  /* Pola 2: { default: {Document, Packer, ...} } */
  if(d.default&&d.default.Document&&d.default.Packer) return d.default;
  /* Pola 3: mungkin versi lama expose berbeda */
  return d;
}

function _memoDoc(children){
  var D = _D();
  return new D.Document({
    sections:[{
      properties:{
        page:{
          size:{width:11906,height:16838},
          margin:{top:1680,right:1134,bottom:1814,left:1134}
        }
      },
      children: children
    }]
  });
}

function _mp(runs,opts){
  var D = _D();
  opts = opts||{};
  return new D.Paragraph({
    children: Array.isArray(runs)?runs:[runs],
    alignment: opts.align || D.AlignmentType.JUSTIFIED,
    spacing:{before:opts.b||0, after:opts.a||100, line:opts.line||276},
    indent: opts.ind?{left:opts.ind}:undefined
  });
}

function _mt(text,opts){
  opts = opts||{};
  return new (_D().TextRun)({
    text:text, font:"Arial", size:opts.s||22,
    bold:opts.bold||false, italics:opts.it||false, color:opts.c||"000000"
  });
}

function _mblank(n){
  return new (_D().Paragraph)({spacing:{before:0,after:(n||1)*100}});
}

function _mNoBord(){
  var b = _D().BorderStyle ? _D().BorderStyle.NONE : 'none';
  var nb = {style:b,size:0,color:"FFFFFF"};
  return {top:nb,bottom:nb,left:nb,right:nb,insideH:nb,insideV:nb};
}

/* Tabel 3 kolom untuk detail kegiatan */
function _mDetailTable(rows){
  var D = _D();
  var nb = _mNoBord();
  return new D.Table({
    width:{size:9360,type:D.WidthType.DXA},
    columnWidths:[2000,220,7140],
    borders: nb,
    rows: rows.map(function(r){
      /* Kolom 3: build runs dulu sebelum masuk TableCell */
      var col3runs;
      if(r[0]==="Pelaksanaan"){
        col3runs = [
          _mt("Dilakukan di atas kapal ("),
          new D.TextRun({text:"onboard",font:"Arial",size:22,italics:true}),
          _mt(")")
        ];
      } else {
        col3runs = [_mt(r[1]||"—",{s:22})];
      }
      return new D.TableRow({children:[
        new D.TableCell({
          children:[_mp([_mt(r[0],{s:22})],{a:60,align:D.AlignmentType.LEFT})],
          borders:nb, width:{size:2000,type:D.WidthType.DXA}
        }),
        new D.TableCell({
          children:[_mp([_mt(":",{s:22})],{a:60,align:D.AlignmentType.LEFT})],
          borders:nb, width:{size:220,type:D.WidthType.DXA}
        }),
        new D.TableCell({
          children:[_mp(col3runs,{a:60,align:D.AlignmentType.LEFT})],
          borders:nb, width:{size:7140,type:D.WidthType.DXA}
        })
      ]});
    })
  });
}

/* Tabel 3 kolom untuk Lampiran / Perihal */
function _mHeaderTable(perihal){
  var D = _D();
  var nb = _mNoBord();
  return new D.Table({
    width:{size:9360,type:D.WidthType.DXA},
    columnWidths:[1600,220,7540],
    borders:nb,
    rows:[
      new D.TableRow({children:[
        new D.TableCell({children:[_mp([_mt("Lampiran",{s:22})],{a:60,align:D.AlignmentType.LEFT})],borders:nb,width:{size:1600,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mp([_mt(":",{s:22})],{a:60,align:D.AlignmentType.LEFT})],borders:nb,width:{size:220,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mblank(0)],borders:nb,width:{size:7540,type:D.WidthType.DXA}})
      ]}),
      new D.TableRow({children:[
        new D.TableCell({children:[_mp([_mt("Perihal",{s:22})],{a:60,align:D.AlignmentType.LEFT})],borders:nb,width:{size:1600,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mp([_mt(":  ",{s:22})],{a:60,align:D.AlignmentType.LEFT})],borders:nb,width:{size:220,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mp([_mt(perihal,{s:22,bold:true})],{a:60,align:D.AlignmentType.LEFT})],borders:nb,width:{size:7540,type:D.WidthType.DXA}})
      ]})
    ]
  });
}

function _mSave(doc, filename){
  var D=_D();
  var Pk=D.Packer;
  if(!Pk) return Promise.reject(new Error("Packer tidak ditemukan"));
  function doDownload(blob){
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  /* Priority: toBlob (browser) > toBase64String > toBuffer (Node, tapi coba juga) */
  if(Pk.toBlob){
    return Pk.toBlob(doc).then(function(blob){doDownload(blob);});
  } else if(Pk.toBase64String){
    return Pk.toBase64String(doc).then(function(b64){
      var bin=atob(b64),arr=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      doDownload(new Blob([arr],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));
    });
  } else if(Pk.toBuffer){
    /* toBuffer ada di beberapa versi browser bundle juga */
    return Promise.resolve(Pk.toBuffer(doc)).then(function(buf){
      doDownload(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));
    });
  } else {
    return Promise.reject(new Error("Tidak ada method Packer yang tersedia (toBlob/toBase64String/toBuffer)"));
  }
}

/* Blok Kepada/Dari/Lampiran/Perihal untuk NOTA DINAS (4 baris) */
function _mNotaHeaderTable(rows){
  var D=_D(); var nb=_mNoBord();
  return new D.Table({
    width:{size:9360,type:D.WidthType.DXA},
    columnWidths:[1700,220,7440],
    borders:nb,
    rows:rows.map(function(r){
      return new D.TableRow({children:[
        new D.TableCell({children:[_mp([_mt(r[0],{s:22})],{a:40,align:D.AlignmentType.LEFT})],borders:nb,width:{size:1700,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mp([_mt(":",{s:22})],{a:40,align:D.AlignmentType.LEFT})],borders:nb,width:{size:220,type:D.WidthType.DXA}}),
        new D.TableCell({children:[_mp([_mt(r[1]||"",{s:22,bold:!!r[2]})],{a:40,align:D.AlignmentType.LEFT})],borders:nb,width:{size:7440,type:D.WidthType.DXA}})
      ]});
    })
  });
}

/* Kotak speciment tanda tangan polos (tanpa logo): jabatan kecil + NAMA besar */
function _mSpecimentBox(jabatanKecil,namaBesar){
  var D=_D();
  var b={style:D.BorderStyle.SINGLE,size:6,color:"000000"};
  var bord={top:b,bottom:b,left:b,right:b};
  return new D.Table({
    width:{size:3600,type:D.WidthType.DXA},
    columnWidths:[3600],
    borders:bord,
    rows:[new D.TableRow({children:[
      new D.TableCell({
        borders:bord,
        width:{size:3600,type:D.WidthType.DXA},
        margins:{top:120,bottom:120,left:120,right:120},
        children:[
          _mp([_mt(jabatanKecil||"Manager Health",{s:18})],{a:20,align:D.AlignmentType.CENTER}),
          _mp([_mt((namaBesar||"").toUpperCase(),{s:24,bold:true})],{a:0,align:D.AlignmentType.CENTER})
        ]
      })
    ]})]
  });
}

/* ════════════════════════════════════════════════════
   MEMO 1 — NOTA DINAS untuk Manager Fleet
════════════════════════════════════════════════════ */
async function _buildMemoFleet(){
  var D       = _D();
  var tgl     = _mv("mf_tgl")     || "Jakarta, ___________";
  var nomor   = _mv("mf_nomor")   || "___/PIS0400-PN/2026-S0";
  var tujuan  = _mv("mf_tujuan")  || "Sr Manager Fleet Crude";
  var dari    = _mv("mf_dari")    || "Pjs VP HSSE III";
  var kapal   = _mv("mf_kapal")   || "_______________";
  var crew    = _mv("mf_crew")    || "___";
  var lokasi  = _mv("mf_lokasi")  || "_______________";
  var tglpel  = _mv("mf_tglpel")  || "_______________";
  var vendor  = _mv("mf_vendor")  || "_______________";
  var jabatan = _mv("mf_jabatan") || "Pjs VP HSSE III";
  var ttd     = _mv("mf_ttd")     || "_______________";
  var jabttd  = _mv("mf_jabttd")  || "Manager Health";

  var children = [
    /* Judul NOTA DINAS */
    _mp([_mt("NOTA DINAS",{s:32,bold:true})],{a:40,align:D.AlignmentType.LEFT}),
    /* Disclaimer tanda tangan digital */
    _mp([_mt(
      "(Nota Dinas ini dinyatakan sah dengan menggunakan tanda tangan digital Pertamina milik pejabat ybs "+
      "dan QR Code berisi informasi detail dokumen dicetak dari sistem Korespondensi Elektronik Pertamina)",
    {s:16,it:true,c:"666666"})],{a:120,align:D.AlignmentType.LEFT}),
    /* Tanggal & nomor */
    _mp([_mt(tgl,{s:22})],{a:40,align:D.AlignmentType.LEFT}),
    _mp([_mt("No. "+nomor,{s:22})],{a:0,align:D.AlignmentType.LEFT}),
    _mblank(1),
    /* Kepada / Dari / Lampiran / Perihal */
    _mNotaHeaderTable([
      ["Kepada", tujuan, false],
      ["Dari", dari, false],
      ["Lampiran", "", false],
      ["Perihal", "Unannounced Drugs and Alcohol Test (Periodical)", true]
    ]),
    _mblank(1),
    /* Pembuka */
    _mp([_mt("Dengan hormat,",{s:22})],{a:100,align:D.AlignmentType.JUSTIFIED}),
    /* Paragraf 1 — komitmen */
    _mp([_mt(
      "Dalam rangka memastikan lingkungan kerja pelayaran yang aman, sehat, dan bebas dari "+
      "pengaruh obat-obatan terlarang serta alkohol, perusahaan berkomitmen untuk mencegah "+
      "pengoperasian kapal oleh individu yang berada di bawah pengaruh zat terlarang.",
    {s:22})],{a:100,align:D.AlignmentType.JUSTIFIED}),
    /* Paragraf 2 — OCIMF / SIRE */
    _mp([
      _mt("Sejalan dengan persyaratan dan rekomendasi dari ",{s:22}),
      _mt("Oil Companies International Marine Forum (OCIMF)",{s:22,it:true}),
      _mt(", khususnya dalam mendukung kepatuhan terhadap standar inspeksi ",{s:22}),
      _mt("Ship Inspection Report Programme (SIRE)",{s:22,it:true}),
      _mt(", HSSE Fungsi Health berencana melaksanakan ",{s:22}),
      _mt("Unannounced Drugs and Alcohol Test (Periodical)",{s:22,bold:true,it:true}),
      _mt(" terhadap awak kapal, berikut:",{s:22})
    ],{a:100,align:D.AlignmentType.JUSTIFIED}),
    _mblank(0),
    /* Tabel detail */
    _mDetailTable([
      ["Kapal",      kapal],
      ["Jumlah Crew",crew+" orang"],
      ["Lokasi",     lokasi],
      ["Tanggal",    tglpel],
      ["Pelaksanaan",""]
    ]),
    _mblank(0),
    /* Pelaksana */
    _mp([
      _mt("Kegiatan ini akan dilaksanakan oleh pihak ",{s:22}),
      _mt(vendor+" selaku pelaksana.",{s:22,bold:true})
    ],{a:100,align:D.AlignmentType.JUSTIFIED}),
    /* Penutup */
    _mp([_mt(
      "Demikian kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.",
    {s:22})],{a:100,align:D.AlignmentType.JUSTIFIED}),
    _mblank(1),
    /* Tanda tangan */
    _mp([_mt(jabatan+",",{s:22})],{a:60,align:D.AlignmentType.LEFT}),
    _mblank(1),
    _mSpecimentBox(jabttd,ttd),
    _mblank(0),
    _mp([_mt(ttd,{s:22,bold:true})],{a:60,align:D.AlignmentType.LEFT})
  ];

  var doc = _memoDoc(children);
  await _mSave(doc,"Nota_Dinas_DAT_"+kapal.replace(/[^a-zA-Z0-9]/g,"_")+"_Fleet.docx");
}

/* ════════════════════════════════════════════════════
   MEMO 2 — Klinik / Vendor Pelaksana
════════════════════════════════════════════════════ */
async function _buildMemoKlinik(){
  var D         = _D();
  var tgl       = _mv("mf_tgl")       || "Jakarta, ___________";
  var nomor     = _mv("mf_nomor")     || "___/PIS0400-PN/2026-S0";
  var klinik    = _mv("mf_klinik")    || "Director RS Pertamina Balikpapan";
  var instansi  = _mv("mf_instansi")  || "PT Pertamina Bina Medika";
  var pelaksana = _mv("mf_pelaksana") || "RSP Balikpapan";
  var kapal     = _mv("mf_kapal")     || "_______________";
  var crew      = _mv("mf_crew")      || "___";
  var lokasi    = _mv("mf_lokasi")    || "_______________";
  var tglpel    = _mv("mf_tglpel")    || "_______________";
  var jabatan   = _mv("mf_jabatan")   || "Pjs VP HSSE III";
  var ttd       = _mv("mf_ttd")       || "_______________";
  var jabttd    = _mv("mf_jabttd")    || "Manager Health";

  var kepada = [
    _mp([_mt("Yang terhormat",{s:22})],{a:0,align:D.AlignmentType.LEFT}),
    _mp([_mt(klinik,{s:22})],{a:0,align:D.AlignmentType.LEFT})
  ];
  if(instansi){
    kepada.push(_mp([_mt(instansi,{s:22})],{a:0,align:D.AlignmentType.LEFT}));
  }

  var children = [
    _mp([_mt(tgl,{s:22})],{a:40,align:D.AlignmentType.LEFT}),
    _mp([_mt("No. "+nomor,{s:22})],{a:0,align:D.AlignmentType.LEFT}),
    _mblank(1),
    _mHeaderTable("Unannounced Drugs and Alcohol Test (Periodical)"),
    _mblank(1)
  ].concat(kepada).concat([
    _mblank(1),
    /* Paragraf 1 — permohonan */
    _mp([
      _mt("Sehubungan dengan adanya kegiatan eksternal ",{s:22}),
      _mt("Unannounced Drugs and Alcohol Test (Periodical)",{s:22,bold:true,it:true}),
      _mt(" pada kapal milik PT. Pertamina Patra Niaga, maka kami mohon bantuan ",{s:22}),
      _mt(pelaksana,{s:22,bold:true}),
      _mt(" sebagai pelaksana di lapangan. Adapun berikut agenda kegiatan tersebut:",{s:22})
    ],{a:100,align:D.AlignmentType.JUSTIFIED}),
    _mblank(0),
    _mDetailTable([
      ["Kapal",      kapal],
      ["Jumlah Crew",crew+" orang"],
      ["Lokasi",     lokasi],
      ["Tanggal",    tglpel],
      ["Pelaksanaan",""]
    ]),
    _mblank(0),
    /* Biaya */
    _mp([
      _mt("Biaya yang timbul sehubungan dengan hal dimaksud menjadi beban ",{s:22}),
      _mt("PT Pertamina Patra Niaga - Health III HSSE",{s:22}),
      _mt(". Apabila ada perubahan data pelaksanaan ",{s:22}),
      _mt("Unannounced Drugs and Alcohol Test (Periodical)",{s:22,bold:true,it:true}),
      _mt(" dapat disesuaikan dengan jumlah crew yang diperiksa.",{s:22})
    ],{a:100,align:D.AlignmentType.JUSTIFIED}),
    /* Pengiriman dokumen */
    _mp([
      _mt("Agar disampaikan atau dikirimkan kepada Manager Health III HSSE dr. Diyon Indarto. "+
          "PT Pertamina Patra Niaga, Gedung Patra Jasa Office Tower Lantai 3 fungsi HSSE "+
          "Jl. Gatot Subroto Kav. 32-34, Kuningan Timur, Setiabudi, Jakarta Selatan, 12950 "+
          "dengan melampirkan dokumen pendukung, sbb:",{s:22})
    ],{a:80,align:D.AlignmentType.JUSTIFIED}),
    /* List dokumen */
    _mp([_mt("1.  Surat pengantar permintaan pembayaran.",{s:22})],
      {a:50,align:D.AlignmentType.LEFT,ind:400}),
    _mp([_mt("2.  ",{s:22}),_mt("Invoice",{s:22,it:true}),_mt(" atau debet Nota.",{s:22})],
      {a:50,align:D.AlignmentType.LEFT,ind:400}),
    _mp([_mt("3.  Kwitansi bermaterai cukup.",{s:22})],
      {a:50,align:D.AlignmentType.LEFT,ind:400}),
    _mp([_mt("4.  Billing atau rincian pemeriksaan ",{s:22}),
         _mt("drug & alcohol test.",{s:22,it:true})],
      {a:80,align:D.AlignmentType.LEFT,ind:400}),
    /* Penutup */
    _mp([_mt(
      "Demikian kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.",
    {s:22})],{a:100,align:D.AlignmentType.JUSTIFIED}),
    _mblank(1),
    /* Tanda tangan */
    _mp([_mt(jabatan,{s:22})],{a:60,align:D.AlignmentType.LEFT}),
    _mblank(1),
    _mSpecimentBox(jabttd,ttd),
    _mblank(0),
    _mp([_mt(ttd,{s:22,bold:true})],{a:60,align:D.AlignmentType.LEFT}),
    _mblank(2),
    /* Footer alamat kantor (teks, rata kanan) */
    _mp([_mt("PT Pertamina Patra Niaga",{s:16,c:"444444"})],{a:0,align:D.AlignmentType.RIGHT}),
    _mp([_mt("Patra Jasa Office Tower",{s:16,c:"444444"})],{a:0,align:D.AlignmentType.RIGHT}),
    _mp([_mt("Jl. Jendral Gatot Soebroto Kav. 32-34 Jakarta 12950",{s:16,c:"444444"})],{a:0,align:D.AlignmentType.RIGHT}),
    _mp([_mt("T +62 21 381 5111   F +62 21 381 6111",{s:16,c:"444444"})],{a:0,align:D.AlignmentType.RIGHT}),
    _mp([_mt("www.pertamina.com",{s:16,c:"444444"})],{a:0,align:D.AlignmentType.RIGHT})
  ]);

  var doc = _memoDoc(children);
  await _mSave(doc,"Surat_DAT_"+kapal.replace(/[^a-zA-Z0-9]/g,"_")+"_Vendor.docx");
}


/* ═══════════════════════════════════════════════════════════════
   P3K & AED OFFICE — Dashboard Module v2.0
   Design: Sesuai sistem desain IH Dashboard (kpi-card, chart-card)
   Regulasi: Permenakertrans No.Per.15/MEN/VIII/2008 | PERKI 2023
═══════════════════════════════════════════════════════════════ */

var P3K_LOKASI=[
  {lantai:"GF",   fungsi:"Lobby / Security"},
  {lantai:"Lt 3", fungsi:"Fungsi HSSE"},
  {lantai:"Lt 3", fungsi:"Fungsi SSA"},
  {lantai:"Lt 14",fungsi:"Fungsi HC"},
  {lantai:"Lt 14",fungsi:"Fungsi Digitalisasi"},
  {lantai:"Lt 17",fungsi:"Fungsi Aset"},
  {lantai:"Lt 17",fungsi:"Fungsi Procurement"},
  {lantai:"Lt 18",fungsi:"Fungsi Legal"},
  {lantai:"Lt 20",fungsi:"Fungsi ICT"},
  {lantai:"Lt 20",fungsi:"Fungsi Finance"},
  {lantai:"Lt 21",fungsi:"Fungsi LPSQ"},
  {lantai:"Lt 21",fungsi:"Fungsi TOP"},
  {lantai:"Lt 22",fungsi:"Fungsi Fleet"},
  {lantai:"Lt 22",fungsi:"Fungsi Crewing"},
];

var P3K_BULAN=["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

var rawP3K=[], filteredP3K=[];
var p3kTab="overview";

function _p3kMap(r){
  return{
    lantai:    r["Lantai"]||"",
    fungsi:    r["Fungsi"]||"",
    bulan:     r["Bulan"]||"",
    p3kTgl:    r["Tgl Cek P3K"]||r["Tgl Cek\nP3K"]||"",
    p3kStatus: r["Status Kotak P3K"]||r["Status\nKotak P3K"]||"",
    p3kTemuan: r["Temuan / Item Kosong"]||r["Temuan / Item\nKosong"]||"",
    p3kExp:    r["Item Expired"]||r["Item\nExpired"]||"",
    p3kTL:     r["Tindak Lanjut P3K"]||r["Tindak Lanjut\nP3K"]||"",
    aedTgl:    r["Tgl Cek AED"]||r["Tgl Cek\nAED"]||"",
    aedStatus: r["Status AED"]||r["Status\nAED"]||"",
    aedTemuan: r["Temuan AED"]||r["Temuan\nAED"]||"",
    aedExp:    r["Tgl Exp Elektrode/Batt"]||r["Tgl Exp\nElektrode/Batt"]||"",
    aedTL:     r["Tindak Lanjut AED"]||r["Tindak Lanjut\nAED"]||"",
    pemeriksa: r["Nama Pemeriksa"]||r["Nama\nPemeriksa"]||"",
    overall:   r["Status Keseluruhan"]||r["Status\nKeseluruhan"]||""
  };
}

function initP3KData(serverData){
  if(serverData&&serverData.p3k&&serverData.p3k.length){
    rawP3K=serverData.p3k.map(_p3kMap);
  } else {
    rawP3K=[];
    var no=1;
    P3K_BULAN.forEach(function(bln){
      P3K_LOKASI.forEach(function(lok){
        rawP3K.push({
          no:no++,lantai:lok.lantai,fungsi:lok.fungsi,bulan:bln,
          p3kTgl:"",p3kStatus:"",p3kTemuan:"",p3kExp:"",p3kTL:"",
          aedTgl:"",aedStatus:"",aedTemuan:"",aedExp:"",aedTL:"",
          pemeriksa:"",overall:""
        });
      });
    });
  }
  filteredP3K=[...rawP3K];
}

/* ── Status styling ── */
function _p3kSt(status){
  var s=(status||"").toLowerCase();
  if(s.includes("expired")||s.includes("rusak"))
    return{c:"var(--red)",bg:"var(--red-soft)",grad:"var(--grad-red)",icon:"fa-circle-xmark",dot:"#ED1A2F"};
  if(s.includes("tidak lengkap")||s.includes("perlu restock")||s.includes("perlu servis"))
    return{c:"#E65100",bg:"#FFF3E0",grad:"var(--grad-orange)",icon:"fa-triangle-exclamation",dot:"#F06000"};
  if(s.includes("lengkap")||s.includes("siap pakai")||s.includes("baik"))
    return{c:"var(--green-dark)",bg:"var(--green-soft)",grad:"var(--grad-green)",icon:"fa-circle-check",dot:"#ACC32A"};
  return{c:"var(--text-muted)",bg:"var(--bg)",grad:"linear-gradient(135deg,#6B7280,#9CA3AF)",icon:"fa-circle-question",dot:"#9CA3AF"};
}

/* ─────────────────────────────────────
   RENDER PAGE
───────────────────────────────────── */
function renderP3KPage(){
  if(!rawP3K.length) initP3KData(null);
  applyP3KFilters();
}

/* ══════════════════════════════════════════════════════════════
   SEBARAN ALKES KAPAL — renderAlkesPage
   Data: rawAlkes [] dari GAS action getData → key "alkes"
   Kolom GAS: Nama Kapal, Fleet, Aed, Expired Date AED,
              Tandu Biasa, Basket Stretcher, Long Spinal Board,
              Tabung Oksigen, Body Thermometer,
              Blood Pressure Monitor, Spirometry
   Kalkulasi: _status, _kelengkapanPct, _expiredAED
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   MEDICAL SURVEILLANCE — MCU PELAUT
   GAS action: getMCU → rawMCU[]
   GAS kalkulasi: IMT, classifyAudio(ISO1999), classifySpiro(ATS/ERS2022),
                  classifyHemo(WHO), classifyVisus(STCW2010), _riskLevel
   Tabs: overview | audiometri | spirometri | visus | hematologi | tabel
══════════════════════════════════════════════════════════════ */
async function fetchMCUData(){
  try{
    var data=await gasPost({action:'getMCU',token:getToken()});
    if(!data||data.status==='unauthorized')return;
    if(data.status!=='ok')return;
    if(data.mcu&&data.mcu.length>0){
      rawMCU=data.mcu;filteredMCU=[...rawMCU];_buildMCUSummary();
      var pgM=document.getElementById('page-medsurv');
      if(pgM&&pgM.classList.contains('active'))renderMCUPage();
    }
  }catch(e){console.warn('fetchMCUData:',e);}
}

function _buildMCUSummary(){
  var d=rawMCU;
  function gh(r){
    var v=r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||r['Status Fitness']||'';
    if(v)return String(v).toUpperCase().trim();
    var rl=(r._riskLevel||'').toUpperCase();
    if(rl==='KRITIS'||rl==='TINGGI')return'UNFIT';
    if(rl==='SEDANG')return'FIT BERSYARAT';
    if(rl==='RENDAH')return'FIT';
    return'';
  }
  mcuSummary={
    total:d.length,
    fit:d.filter(function(r){return gh(r)==='FIT';}).length,
    fitDenganCatatan:d.filter(function(r){return gh(r)==='FIT BERSYARAT';}).length,
    tidakFit:d.filter(function(r){return gh(r)==='UNFIT';}).length,
    avgIMT:d.length?+(d.reduce(function(s,r){return s+(parseFloat(r.imt||r.IMT||0));},0)/d.length).toFixed(1):0,
    fleets:[...new Set(d.map(function(r){return(r['Jenis Fleet']||r.fleet||r.Fleet||'').trim();}).filter(Boolean))].sort(),
    kapalList:[...new Set(d.map(function(r){return(r['Nama Kapal']||r.namaKapal||'').trim();}).filter(Boolean))].sort(),
  };
}

function renderMCUPage(){
  var pg=document.getElementById('page-medsurv');
  if(!pg)return;

  if(!rawMCU.length){
    pg.innerHTML=
      '<div style="padding:32px 0">'+
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">'+
      '<i class="fas fa-stethoscope" style="font-size:22px;color:#00ACC1"></i>'+
      '<h2 style="font-size:18px;font-weight:700;color:var(--text);margin:0">Medical Surveillance \u2014 MCU Pelaut</h2></div>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0 0 28px 34px">Hasil Medical Check-Up \u00b7 Pertamina Patra Niaga</p>'+
      '<div style="text-align:center;padding:52px 20px;background:var(--card);border-radius:16px;border:1px solid var(--border)">'+
      '<div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#00ACC1,#006064);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">'+
      '<i class="fas fa-database" style="font-size:26px;color:#fff"></i></div>'+
      '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px">Data MCU Belum Tersedia</div>'+
      '<div style="font-size:12px;color:var(--text-muted);max-width:380px;margin:0 auto;line-height:1.6">'+
      'Pastikan sheet <strong>MCU PELAUT</strong> sudah ada dan GAS sudah di-deploy ulang, lalu klik Refresh.</div>'+
      '<button onclick="fetchMCUData()" style="margin-top:18px;padding:9px 22px;background:#00ACC1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">'+
      '<i class="fas fa-rotate-right" style="margin-right:6px"></i>Coba Muat Ulang</button></div></div>';
    return;
  }

  var tab=pg.dataset.mcuTab||'overview';
  var tabs=[
    {id:'overview',   icon:'fa-chart-pie',   label:'Overview'},
    {id:'audiometri', icon:'fa-ear-listen',  label:'Audiometri'},
    {id:'spirometri', icon:'fa-lungs',       label:'Spirometri'},
    {id:'visus',      icon:'fa-eye',         label:'Visus'},
    {id:'hematologi', icon:'fa-droplet',     label:'Hematologi'},
    {id:'tabel',      icon:'fa-table-list',  label:'Data Lengkap'},
  ];

  var selFleet=pg.dataset.mcuFleet||'';
  var selKapal=pg.dataset.mcuKapal||'';

  /* Field resolver — sync dengan GAS getMCUData() output */
  function gNama(r){return r['Nama Lengkap']||r.nama||r.Nama||'\u2014';}
  function gKapal(r){return r['Nama Kapal']||r.namaKapal||'\u2014';}
  function gFleet(r){return r['Jenis Fleet']||r.fleet||r.Fleet||'\u2014';}
  /* GAS Hasil Umum: "FIT" / "FIT BERSYARAT" / "UNFIT"
     Coba beberapa kemungkinan nama kolom + fallback ke _riskLevel */
  function gHasil(r){
    var v=r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||r['Status Fitness']||'';
    if(v) return String(v).toUpperCase().trim();
    /* Fallback dari _riskLevel GAS: RENDAH=FIT, SEDANG=FIT BERSYARAT, TINGGI/KRITIS=UNFIT */
    var rl=(r._riskLevel||'').toUpperCase();
    if(rl==='KRITIS'||rl==='TINGGI') return 'UNFIT';
    if(rl==='SEDANG') return 'FIT BERSYARAT';
    if(rl==='RENDAH') return 'FIT';
    return '';
  }

  var d=rawMCU.filter(function(r){
    if(selFleet&&gFleet(r).trim()!==selFleet)return false;
    if(selKapal&&gKapal(r).trim()!==selKapal)return false;
    return true;
  });
  filteredMCU=[...d];

  var allFleets=[...new Set(rawMCU.map(function(r){return gFleet(r).trim();}).filter(function(f){return f&&f!=='\u2014';}))].sort();
  var allKapal =[...new Set(rawMCU.map(function(r){return gKapal(r).trim();}).filter(function(k){return k&&k!=='\u2014';}))].sort();

  /* KPI — pakai gHasil() yang sudah ada fallback */
  var fit   =d.filter(function(r){return gHasil(r)==='FIT';}).length;
  var fitBsy=d.filter(function(r){return gHasil(r)==='FIT BERSYARAT';}).length;
  var unfit =d.filter(function(r){return gHasil(r)==='UNFIT';}).length;
  var fitPct=d.length?Math.round(fit/d.length*100):0;

  /* Helpers */
  function hasilBadge(hu){
    var s=(hu||'').toUpperCase();
    var gH=gHasil({['Hasil Umum']:hu});
    var st={'FIT':'background:linear-gradient(90deg,#1B5E20,#2E7D32);color:#C8E6C9',
            'FIT BERSYARAT':'background:linear-gradient(90deg,#BF360C,#E64A19);color:#FFE0B2',
            'UNFIT':'background:linear-gradient(90deg,#7F0000,#B71C1C);color:#FFCDD2'};
    return'<span style="'+(st[gH]||'background:#37474F;color:#B0BEC5')+
      ';padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">'+esc(hu||'\u2014')+'</span>';
  }
  function riskLevelBadge(lv){
    var s=(lv||'').toUpperCase();
    var st={'RENDAH':'background:rgba(27,94,32,.15);color:#2E7D32;border:1px solid #2E7D32',
            'SEDANG':'background:rgba(191,54,12,.15);color:#E64A19;border:1px solid #E64A19',
            'TINGGI':'background:rgba(127,0,0,.15);color:#B71C1C;border:1px solid #B71C1C',
            'KRITIS':'background:rgba(74,20,140,.15);color:#6A1B9A;border:1px solid #6A1B9A'};
    return'<span style="'+(st[s]||'background:#37474F;color:#B0BEC5;border:1px solid #546E7A')+
      ';padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700">'+esc(lv||'\u2014')+'</span>';
  }
  function svgRing(pct,col,sz){
    var r=sz/2-6,ci=2*Math.PI*r,da=ci*pct/100;
    return'<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" style="transform:rotate(-90deg)">'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+da.toFixed(1)+' '+ci.toFixed(1)+'"/></svg>';
  }

  /* HEADER */
  var html='<div style="background:linear-gradient(135deg,#006064 0%,#00838F 55%,#0097A7 100%);'+
    'border-radius:16px;padding:24px 28px;margin-bottom:18px;position:relative;overflow:hidden">'+
    '<div style="position:absolute;right:-20px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05)"></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;position:relative">'+
    '<div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'+
    '<i class="fas fa-stethoscope" style="font-size:17px;color:#80DEEA"></i>'+
    '<span style="font-size:10px;font-weight:700;color:#80DEEA;letter-spacing:.9px;text-transform:uppercase">Medical Surveillance</span></div>'+
    '<h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 3px">MCU Pelaut Dashboard</h1>'+
    '<p style="font-size:11px;color:rgba(255,255,255,.6);margin:0">STCW 2010 \u00b7 WHO \u00b7 ATS/ERS 2022 \u00b7 ISO 1999</p></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
    '<select id="mcu-sel-fleet" onchange="mcuApplyFilter()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff">'+
    '<option value="">Semua Fleet</option>'+allFleets.map(function(f){return'<option style="color:#000"'+(f===selFleet?' selected':'')+'>'+esc(f)+'</option>';}).join('')+'</select>'+
    '<select id="mcu-sel-kapal" onchange="mcuApplyFilter()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff">'+
    '<option value="">Semua Kapal</option>'+allKapal.map(function(k){return'<option style="color:#000"'+(k===selKapal?' selected':'')+'>'+esc(k)+'</option>';}).join('')+'</select>'+
    '<button onclick="exportMCUPPT()" title="Export laporan MCU ke PowerPoint" style="font-size:11px;padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.18);color:#fff;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><i class="fas fa-file-powerpoint"></i> Export PPT</button></div></div>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;position:relative">'+
    [{v:d.length,l:'Total Crew MCU',ico:'fa-users',c:'#E0F7FA'},
     {v:fit,     l:'FIT',           ico:'fa-circle-check',c:'#A5D6A7'},
     {v:fitBsy,  l:'FIT Bersyarat', ico:'fa-triangle-exclamation',c:'#FFE0B2'},
     {v:unfit,   l:'UNFIT',         ico:'fa-circle-xmark',c:'#FFCDD2'}].map(function(k){
      return'<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px 14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
        '<div><div style="font-size:10px;color:rgba(255,255,255,.7);font-weight:600;margin-bottom:3px">'+esc(k.l)+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:#fff;line-height:1">'+k.v+'</div></div>'+
        '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center">'+
        '<i class="fas '+k.ico+'" style="font-size:14px;color:'+k.c+'"></i></div></div></div>';
    }).join('')+'</div></div>';

  /* TABS */
  var tabHtml='<div style="display:flex;gap:2px;margin-bottom:18px;background:var(--card);border-radius:12px;padding:4px;border:1px solid var(--border)">';
  tabs.forEach(function(t){
    var a=t.id===tab;
    var s='flex:1;padding:8px 4px;font-size:10px;border:none;border-radius:9px;cursor:pointer;transition:.2s;display:flex;flex-direction:column;align-items:center;gap:3px;';
    s+='font-weight:'+(a?'700':'500')+';background:'+(a?'var(--primary)':'transparent')+';color:'+(a?'#fff':'var(--text-muted)');
    tabHtml+='<button onclick="mcuSetTab(this.dataset.tid)" data-tid="'+t.id+'" style="'+s+'">'+
      '<i class="fas '+t.icon+'" style="font-size:13px"></i><span>'+esc(t.label)+'</span></button>';
  });
  html+=tabHtml+'</div>';

  /* OVERVIEW */
  if(tab==='overview'){
    var unfitPct=d.length?Math.round(unfit/d.length*100):0;
    var bsyPct  =d.length?Math.round(fitBsy/d.length*100):0;
    html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px">';
    [{pct:fitPct,   col:'#43A047',label:'Tingkat Kelayakan (FIT)',sub:fit+' dari '+d.length+' crew'},
     {pct:bsyPct,   col:'#FB8C00',label:'FIT Bersyarat',          sub:fitBsy+' crew perlu monitoring'},
     {pct:unfitPct, col:'#E53935',label:'UNFIT',                   sub:unfit+' crew tindak lanjut'}
    ].forEach(function(rg){
      html+='<div class="stat-card" style="text-align:center;padding:20px 16px">'+
        '<div style="position:relative;display:inline-block;margin-bottom:10px">'+svgRing(rg.pct,rg.col,80)+
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">'+
        '<span style="font-size:15px;font-weight:800;color:var(--text)">'+rg.pct+'%</span></div></div>'+
        '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">'+esc(rg.label)+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+esc(rg.sub)+'</div></div>';
    });
    html+='</div>';
    var km={};
    d.forEach(function(r){
      var k=gKapal(r).trim(),fl=gFleet(r).trim(),hu=gHasil(r);
      if(!km[k])km[k]={fl:fl,fit:0,bsy:0,unfit:0,n:0};
      km[k].n++;
      if(hu==='FIT')km[k].fit++;else if(hu==='FIT BERSYARAT')km[k].bsy++;else if(hu==='UNFIT')km[k].unfit++;
    });
    html+='<h3 style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">'+
      '<i class="fas fa-ship" style="color:#00ACC1;margin-right:6px"></i>Status per Kapal</h3>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">';
    Object.entries(km).sort(function(a,b){return b[1].n-a[1].n;}).forEach(function(e){
      var kn=e[0],ks=e[1];
      var kp=Math.round((ks.fit/ks.n)*100);
      var kc=kp>=80?'#43A047':(kp>=60?'#FB8C00':'#E53935');
      html+='<div class="stat-card" style="padding:13px 14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+esc(kn)+'</div>'+
        '<div style="font-size:10px;color:var(--text-muted)">'+esc(ks.fl)+'</div></div>'+
        '<span style="font-size:15px;font-weight:800;color:'+kc+'">'+kp+'%</span></div>'+
        '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:8px">'+
        '<div style="width:'+kp+'%;height:100%;background:'+kc+';border-radius:2px;transition:width .5s"></div></div>'+
        '<div style="display:flex;gap:5px">'+
        '<span style="flex:1;text-align:center;padding:2px;background:rgba(67,160,71,.12);border-radius:5px;font-size:9px;font-weight:700;color:#43A047">'+ks.fit+' FIT</span>'+
        '<span style="flex:1;text-align:center;padding:2px;background:rgba(251,140,0,.12);border-radius:5px;font-size:9px;font-weight:700;color:#FB8C00">'+ks.bsy+' BSYT</span>'+
        '<span style="flex:1;text-align:center;padding:2px;background:rgba(229,57,53,.12);border-radius:5px;font-size:9px;font-weight:700;color:#E53935">'+ks.unfit+' UNFIT</span>'+
        '</div></div>';
    });
    html+='</div>';
  }
  else if(tab==='audiometri'){
    html+='<div class="table-scroll"><table class="ih-table"><thead><tr>'+
      '<th>Nama</th><th>Kapal</th><th>Fleet</th><th>Jabatan</th>'+
      '<th>Audio Kanan</th><th>Audio Kiri</th><th>Klasifikasi</th><th>Hasil Umum</th></tr></thead><tbody>';
    if(!d.length)html+=emptyState('Belum ada data audiometri','fa-ear-listen');
    else d.forEach(function(r){
      var ka=r._audioKanan||'\u2014',ki=r._audioKiri||'\u2014';
      function aC(v){var c=v==='Normal'?'#43A047':(v==='Ringan'||v==='Sedang'?'#FB8C00':'#E53935');return'<span style="color:'+c+';font-weight:700">'+esc(v)+'</span>';}
      html+='<tr><td><strong>'+esc(gNama(r))+'</strong></td><td>'+esc(gKapal(r))+'</td>'+
        '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700">'+esc(gFleet(r))+'</span></td>'+
        '<td>'+esc(r['Jabatan']||'\u2014')+'</td>'+
        '<td>'+aC(ka)+'</td><td>'+aC(ki)+'</td>'+
        '<td><span style="font-size:10px;font-weight:700;color:'+(r._audioKlasif==='NIHL'?'#E53935':'#43A047')+'">'+esc(r._audioKlasif||'\u2014')+'</span></td>'+
        '<td>'+hasilBadge(r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||'')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  else if(tab==='spirometri'){
    html+='<div class="table-scroll"><table class="ih-table"><thead><tr>'+
      '<th>Nama</th><th>Kapal</th><th>Fleet</th>'+
      '<th>FVC (%pred)</th><th>FEV1 (%pred)</th><th>Pola</th><th>Hasil Umum</th></tr></thead><tbody>';
    if(!d.length)html+=emptyState('Belum ada data spirometri','fa-lungs');
    else d.forEach(function(r){
      function pC(v,lo){if(v===null||v===undefined)return'\u2014';var c=v>=lo?'#43A047':(v>=70?'#FB8C00':'#E53935');return'<span style="color:'+c+';font-weight:700">'+(v!==null?v+'%':'\u2014')+'</span>';}
      var pola=r._spiro||r._spiroPolа||'\u2014';
      var polaC=pola==='Normal'?'#43A047':(pola==='—'?'var(--text-muted)':'#FB8C00');
      html+='<tr><td><strong>'+esc(gNama(r))+'</strong></td><td>'+esc(gKapal(r))+'</td>'+
        '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700">'+esc(gFleet(r))+'</span></td>'+
        '<td>'+pC(r._fvcPct,80)+'</td><td>'+pC(r._fev1Pct,80)+'</td>'+
        '<td><span style="color:'+polaC+';font-weight:700">'+esc(pola)+'</span></td>'+
        '<td>'+hasilBadge(r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||'')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  else if(tab==='visus'){
    html+='<div class="table-scroll"><table class="ih-table"><thead><tr>'+
      '<th>Nama</th><th>Kapal</th><th>Fleet</th>'+
      '<th>OD Koreksi</th><th>OS Koreksi</th><th>Buta Warna</th><th>Status Visus</th><th>Hasil Umum</th></tr></thead><tbody>';
    if(!d.length)html+=emptyState('Belum ada data visus','fa-eye');
    else d.forEach(function(r){
      var vs=r._visusStatus||'\u2014';
      var vc=vs==='NORMAL'?'#43A047':(vs==='PERHATIAN'?'#FB8C00':'#E53935');
      html+='<tr><td><strong>'+esc(gNama(r))+'</strong></td><td>'+esc(gKapal(r))+'</td>'+
        '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700">'+esc(gFleet(r))+'</span></td>'+
        '<td>'+esc(r['OD Dgn Koreksi']||r['OD Tanpa Koreksi']||'\u2014')+'</td>'+
        '<td>'+esc(r['OS Dgn Koreksi']||r['OS Tanpa Koreksi']||'\u2014')+'</td>'+
        '<td>'+esc(r['Buta Warna']||'\u2014')+'</td>'+
        '<td><span style="color:'+vc+';font-weight:700;font-size:11px">'+esc(vs)+'</span></td>'+
        '<td>'+hasilBadge(r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||'')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  else if(tab==='hematologi'){
    html+='<div class="table-scroll"><table class="ih-table"><thead><tr>'+
      '<th>Nama</th><th>Kapal</th><th>Fleet</th>'+
      '<th>Hb (g/dL)</th><th>Leukosit</th><th>Trombosit</th><th>Status Hemo</th><th>Catatan</th><th>Hasil Umum</th></tr></thead><tbody>';
    if(!d.length)html+=emptyState('Belum ada data hematologi','fa-droplet');
    else d.forEach(function(r){
      var hs=r._hemoStatus||'\u2014';
      var hc=hs==='NORMAL'?'#43A047':'#E53935';
      var flags=(r._hemoFlags||[]).join(', ')||'\u2014';
      html+='<tr><td><strong>'+esc(gNama(r))+'</strong></td><td>'+esc(gKapal(r))+'</td>'+
        '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700">'+esc(gFleet(r))+'</span></td>'+
        '<td>'+esc(r['Hb (g/dL)']||'\u2014')+'</td>'+
        '<td>'+esc(r['Leukosit (/\u00b5L)']||'\u2014')+'</td>'+
        '<td>'+esc(r['Trombosit (/\u00b5L)']||'\u2014')+'</td>'+
        '<td><span style="color:'+hc+';font-weight:700">'+esc(hs)+'</span></td>'+
        '<td style="font-size:11px;color:var(--text-muted);max-width:160px">'+esc(flags)+'</td>'+
        '<td>'+hasilBadge(r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||'')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  else if(tab==='tabel'){
    html+='<div class="table-scroll"><table class="ih-table"><thead><tr>'+
      '<th>NIP</th><th>Nama</th><th>Jabatan</th><th>Kapal</th><th>Fleet</th>'+
      '<th>Tgl MCU</th><th>Audio</th><th>Spiro</th><th>Visus</th><th>Hemo</th>'+
      '<th>Risk Level</th><th>Hasil Umum</th></tr></thead><tbody>';
    if(!d.length)html+=emptyState('Belum ada data MCU','fa-stethoscope');
    else d.forEach(function(r){
      html+='<tr>'+
        '<td style="font-size:11px">'+esc(r['NIP / ID Pelaut']||r['NIP']||'\u2014')+'</td>'+
        '<td><strong style="color:var(--text)">'+esc(gNama(r))+'</strong></td>'+
        '<td>'+esc(r['Jabatan']||'\u2014')+'</td>'+
        '<td>'+esc(gKapal(r))+'</td>'+
        '<td><span style="background:#E3F2FD;color:#1565C0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700">'+esc(gFleet(r))+'</span></td>'+
        '<td style="font-size:11px">'+esc(r['Tgl Pelaksanaan']||r['Tanggal MCU']||'\u2014')+'</td>'+
        '<td style="font-size:11px">'+esc(r._audioKlasif||'\u2014')+'</td>'+
        '<td style="font-size:11px">'+esc(r._spiro||r._spiroPolа||'\u2014')+'</td>'+
        '<td style="font-size:11px">'+esc(r._visusStatus||'\u2014')+'</td>'+
        '<td style="font-size:11px">'+esc(r._hemoStatus||'\u2014')+'</td>'+
        '<td>'+riskLevelBadge(r._riskLevel)+'</td>'+
        '<td>'+hasilBadge(r['Hasil Umum']||r['Hasil MCU']||r['Hasil']||'')+'</td></tr>';
    });
    html+='</tbody></table></div>'+
      '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">'+d.length+' dari '+rawMCU.length+' data crew</div>';
  }

  pg.innerHTML=html;
}

function mcuSetTab(tab){
  var pg=document.getElementById('page-medsurv');
  if(pg){pg.dataset.mcuTab=tab;renderMCUPage();}
}

function mcuApplyFilter(){
  var pg=document.getElementById('page-medsurv');
  if(!pg)return;
  var sf=document.getElementById('mcu-sel-fleet');
  var sk=document.getElementById('mcu-sel-kapal');
  if(sf)pg.dataset.mcuFleet=sf.value;
  if(sk)pg.dataset.mcuKapal=sk.value;
  renderMCUPage();
}

function renderAlkesPage(){
  var pg=document.getElementById('page-menu5');
  if(!pg)return;

  var ITEMS=['Aed','Tandu Biasa','Basket Stretcher','Long Spinal Board',
             'Tabung Oksigen','Body Thermometer','Blood Pressure Monitor','Spirometry'];

  /* No-data state — tidak infinite loop */
  if(!rawAlkes.length){
    pg.innerHTML=
      '<div style="padding:32px 0">'+
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">'+
      '<i class="fas fa-briefcase-medical" style="font-size:22px;color:#43A047"></i>'+
      '<h2 style="font-size:18px;font-weight:700;color:var(--text);margin:0">Sebaran Alkes Kapal</h2></div>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0 0 28px 34px">Status Kelengkapan Alat Kesehatan \u00b7 Pertamina Patra Niaga</p>'+
      '<div style="text-align:center;padding:52px 20px;background:var(--card);border-radius:16px;border:1px solid var(--border)">'+
      '<div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#2E7D32,#1B5E20);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">'+
      '<i class="fas fa-database" style="font-size:26px;color:#fff"></i></div>'+
      '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px">Data Alkes Belum Tersedia</div>'+
      '<div style="font-size:12px;color:var(--text-muted);max-width:380px;margin:0 auto;line-height:1.6">Pastikan sheet <strong>Sebaran Alkes Kapal</strong> sudah ada di Google Sheets dan GAS sudah di-deploy ulang, lalu klik Refresh.</div>'+
      '</div></div>';
    return;
  }

  var selFleet=(pg.dataset.alkesFleet)||'';
  var selStatus=(pg.dataset.alkesStatus)||'';
  var data=rawAlkes.filter(function(r){
    if(selFleet&&(r['Fleet']||'').trim()!==selFleet)return false;
    if(selStatus&&r._status!==selStatus)return false;
    return true;
  });
  filteredAlkes=[...data];

  var cL=data.filter(function(r){return r._status==='LENGKAP';}).length;
  var cP=data.filter(function(r){return r._status==='PARSIAL';}).length;
  var cT=data.filter(function(r){return r._status==='TIDAK LENGKAP';}).length;
  var cE=data.filter(function(r){return r._status==='EXPIRED';}).length;
  var avgPct=data.length?Math.round(data.reduce(function(s,r){return s+r._kelengkapanPct;},0)/data.length):0;
  /* AED Valid = AED statusnya "ADA" DAN tidak expired
     Bug lama: hanya cek !_expiredAED → kapal tanpa AED (BELUM ADA) ikut dihitung valid */
  var aedOk=data.filter(function(r){
    /* Cek dari _alkesDetail (GAS) jika ada */
    if(r._alkesDetail&&r._alkesDetail.length>0){
      var aedItem=r._alkesDetail.find(function(d){return d.nama==='Aed';});
      if(aedItem&&aedItem.status!=='ADA') return false;
    } else {
      /* Fallback: cek langsung kolom Aed */
      var aedVal=String(r['Aed']||r['AED']||'').toUpperCase().trim();
      if(aedVal!=='ADA') return false;
    }
    /* Dan tidak expired */
    return !r._expiredAED;
  }).length;
  var aedPct=data.length?Math.round(aedOk/data.length*100):0;
  var fullPct=data.length?Math.round(cL/data.length*100):0;
  var fleets=[...new Set(rawAlkes.map(function(r){return(r['Fleet']||'').trim();}).filter(Boolean))].sort();

  /* helpers */
  function statusBadge(s){
    var st={'LENGKAP':'linear-gradient(90deg,#1B5E20,#2E7D32);color:#C8E6C9',
            'PARSIAL':'linear-gradient(90deg,#BF360C,#E64A19);color:#FFE0B2',
            'TIDAK LENGKAP':'linear-gradient(90deg,#7F0000,#B71C1C);color:#FFCDD2',
            'EXPIRED':'linear-gradient(90deg,#4A148C,#6A1B9A);color:#E1BEE7'};
    return '<span style="background:'+(st[s]||'#37474F;color:#B0BEC5')+';padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">'+esc(s)+'</span>';
  }
  function miniBar(pct){
    var c=pct>=100?'#43A047':(pct>=50?'#FB8C00':'#E53935');
    return '<div style="display:flex;align-items:center;gap:5px"><div style="flex:1;height:5px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden">'+
      '<div style="width:'+pct+'%;height:100%;background:'+c+';border-radius:3px;transition:width .5s"></div></div>'+
      '<span style="font-size:10px;font-weight:700;color:'+c+';min-width:28px">'+pct+'%</span></div>';
  }
  function svgRing(pct,col,sz){
    var r=sz/2-6,ci=2*Math.PI*r,da=ci*pct/100;
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" style="transform:rotate(-90deg)">'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>'+
      '<circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+da.toFixed(1)+' '+ci.toFixed(1)+'"/></svg>';
  }

  /* ── EXECUTIVE HEADER ── */
  var html='<div style="background:linear-gradient(135deg,#1B5E20 0%,#2E7D32 50%,#388E3C 100%);'+
    'border-radius:16px;padding:24px 28px;margin-bottom:18px;position:relative;overflow:hidden">'+
    '<div style="position:absolute;right:-20px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05)"></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;position:relative">'+
    '<div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'+
    '<i class="fas fa-briefcase-medical" style="font-size:17px;color:#A5D6A7"></i>'+
    '<span style="font-size:10px;font-weight:700;color:#A5D6A7;letter-spacing:.9px;text-transform:uppercase">Monitoring Alkes</span></div>'+
    '<h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 3px">Sebaran Alkes Kapal</h1>'+
    '<p style="font-size:11px;color:rgba(255,255,255,.6);margin:0">Status Kelengkapan Alat Kesehatan &amp; AED \u00b7 Pertamina Patra Niaga</p></div>'+
    '<div style="display:flex;gap:8px">'+
    '<select id="alkes-sel-fleet" onchange="applyAlkesFilters()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff">'+
    '<option value="">Semua Fleet</option>'+fleets.map(function(f){return'<option style="color:#000"'+(f===selFleet?' selected':'')+'>'+esc(f)+'</option>';}).join('')+'</select>'+
    '<select id="alkes-sel-status" onchange="applyAlkesFilters()" style="font-size:11px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff">'+
    '<option value="">Semua Status</option>'+
    ['LENGKAP','PARSIAL','TIDAK LENGKAP','EXPIRED'].map(function(s){return'<option style="color:#000"'+(s===selStatus?' selected':'')+'>'+s+'</option>';}).join('')+
    '</select>'+
    '<button onclick="exportAlkesPPT()" title="Export laporan Alkes ke PowerPoint" style="font-size:11px;padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.18);color:#fff;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><i class="fas fa-file-powerpoint"></i> Export PPT</button>'+
    '<button onclick="exportAlkesPDF()" title="Export laporan Alkes ke PDF (formal)" style="font-size:11px;padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.18);color:#fff;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><i class="fas fa-file-pdf"></i> Export PDF</button></div></div>'+
    /* KPI strip */
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:18px;position:relative">'+
    [{v:data.length,l:'Total Kapal',ico:'fa-ship',c:'#E8F5E9'},
     {v:cL,l:'Lengkap',ico:'fa-circle-check',c:'#A5D6A7'},
     {v:cP,l:'Parsial',ico:'fa-triangle-exclamation',c:'#FFE0B2'},
     {v:cT,l:'Tidak Lengkap',ico:'fa-circle-xmark',c:'#FFCDD2'},
     {v:cE,l:'AED Expired',ico:'fa-calendar-xmark',c:'#CE93D8'}
    ].map(function(k){
      return '<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px 14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
        '<div><div style="font-size:10px;color:rgba(255,255,255,.7);font-weight:600;margin-bottom:3px">'+esc(k.l)+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:#fff;line-height:1">'+k.v+'</div></div>'+
        '<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center">'+
        '<i class="fas '+k.ico+'" style="font-size:14px;color:'+k.c+'"></i></div></div></div>';
    }).join('')+'</div></div>';

  /* ── 3 RING METRICS ── */
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px">';
  [{pct:avgPct,col:'#66BB6A',label:'Rata-rata Kelengkapan',sub:'Seluruh armada',ico:'fa-kit-medical'},
   {pct:fullPct,col:'#43A047',label:'Kapal Fully Equipped',sub:cL+' dari '+data.length+' kapal',ico:'fa-circle-check'},
   {pct:aedPct,col:'#AB47BC',label:'AED Valid',sub:aedOk+' dari '+data.length+' kapal',ico:'fa-heart-pulse'}
  ].forEach(function(rg){
    html+='<div class="stat-card" style="text-align:center;padding:20px 16px">'+
      '<div style="position:relative;display:inline-block;margin-bottom:10px">'+svgRing(rg.pct,rg.col,80)+
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">'+
      '<span style="font-size:15px;font-weight:800;color:var(--text)">'+rg.pct+'%</span></div></div>'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">'+esc(rg.label)+'</div>'+
      '<div style="font-size:11px;color:var(--text-muted)">'+esc(rg.sub)+'</div></div>';
  });
  html+='</div>';

  /* ── EXPIRED AED ALERT ── */
  var expiredList=data.filter(function(r){return r._expiredAED;});
  if(expiredList.length){
    html+='<div style="background:linear-gradient(90deg,rgba(74,20,140,.2),rgba(106,27,154,.1));'+
      'border:1px solid rgba(171,71,188,.4);border-radius:12px;padding:14px 18px;margin-bottom:18px;'+
      'display:flex;align-items:flex-start;gap:12px">'+
      '<div style="width:36px;height:36px;border-radius:50%;background:rgba(171,71,188,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
      '<i class="fas fa-triangle-exclamation" style="color:#CE93D8;font-size:16px"></i></div>'+
      '<div><div style="font-size:12px;font-weight:700;color:#CE93D8;margin-bottom:4px">'+
      expiredList.length+' Kapal dengan AED Expired — Perlu Tindak Lanjut Segera</div>'+
      '<div style="font-size:11px;color:rgba(206,147,216,.7)">'+
      expiredList.map(function(r){return esc(r['Nama Kapal']||'');}).join(' \u00b7 ')+'</div></div></div>';
  }

  /* ── KAPAL CARDS GRID ── */
  html+='<h3 style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">'+
    '<i class="fas fa-ship" style="color:#43A047;margin-right:6px"></i>Status Kelengkapan per Kapal</h3>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-bottom:20px">';

  data.forEach(function(r){
    var pct=r._kelengkapanPct!=null?r._kelengkapanPct:0;
    var col=pct>=100?'#43A047':(pct>=50?'#FB8C00':'#E53935');
    html+='<div class="stat-card" style="padding:14px 16px'+(r._expiredAED?';border-left:3px solid #AB47BC':'')+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
      '<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+esc(r['Nama Kapal']||'—')+'</div>'+
      '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">'+
      '<span style="background:rgba(21,101,192,.1);color:#1565C0;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700">'+esc(r['Fleet']||'—')+'</span>'+
      (r._expiredAED?' <span style="color:#AB47BC;font-size:9px;font-weight:700">\u26a0 AED Expired</span>':'')+
      '</div></div>'+
      '<span style="font-size:15px;font-weight:800;color:'+col+'">'+pct+'%</span></div>'+
      miniBar(pct)+
      '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:3px">'+
      /* Gunakan _alkesDetail dari GAS jika ada — paling akurat */
      (r._alkesDetail&&r._alkesDetail.length>0?
        r._alkesDetail.map(function(d){
          var ok=d.status==='ADA';
          var lbl=d.nama==='Aed'?'AED':d.nama.split(' ').map(function(w){return w[0];}).join('').toUpperCase();
          return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;'+
            (ok?'background:rgba(67,160,71,.15);color:#43A047':'background:rgba(229,57,53,.12);color:#E53935')+
            '" title="'+esc(d.nama)+': '+esc(d.status)+'">'+esc(lbl)+'</span>';
        })
      :ITEMS.map(function(k){
          var ok=String(r[k]||'').toUpperCase().trim()==='ADA';
          var lbl=k==='Aed'?'AED':k.split(' ').map(function(w){return w[0];}).join('').toUpperCase();
          return '<span style="padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;'+
            (ok?'background:rgba(67,160,71,.15);color:#43A047':'background:rgba(229,57,53,.12);color:#E53935')+
            '" title="'+esc(k)+'">'+esc(lbl)+'</span>';
        })
      ).join('')+
      '</div></div>';
  });
  html+='</div>';

  /* ── TABEL LENGKAP ── */
  html+='<h3 style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">'+
    '<i class="fas fa-table-list" style="color:#43A047;margin-right:6px"></i>Tabel Detail Kelengkapan</h3>'+
    '<div class="table-scroll"><table class="ih-table"><thead><tr>'+
    '<th>Nama Kapal</th><th>Fleet</th>'+
    ITEMS.map(function(i){return'<th>'+(i==='Aed'?'AED':esc(i))+'</th>';}).join('')+
    '<th>Kelengkapan</th><th>Status</th></tr></thead><tbody>';
  if(!data.length){
    html+=emptyState('Belum ada data Alkes. Pastikan sheet "Sebaran Alkes Kapal" sudah ada di Google Sheets.','fa-briefcase-medical');
  } else {
    data.forEach(function(r){
      var expAed=(r['Expired Date AED']||'').toString().trim();
      html+='<tr>'+
        '<td><strong style="color:var(--text)">'+esc(r['Nama Kapal']||'—')+'</strong></td>'+
        '<td><span style="background:#E8F5E9;color:#1B5E20;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">'+esc(r['Fleet']||'—')+'</span></td>'+
        ITEMS.map(function(k){
          var ok=String(r[k]||'').toUpperCase().trim()==='ADA';
          var extra='';
          if(k==='Aed'&&r._expiredAED&&expAed)extra='<div style="font-size:9px;color:#AB47BC;margin-top:1px">Exp: '+esc(expAed)+'</div>';
          return'<td style="text-align:center">'+
            (ok?'<i class="fas fa-check-circle" style="color:#43A047;font-size:14px"></i>':
                '<i class="fas fa-times-circle" style="color:#E53935;opacity:.4;font-size:14px"></i>')+extra+'</td>';
        }).join('')+
        '<td style="min-width:110px">'+miniBar(r._kelengkapanPct)+'</td>'+
        '<td>'+statusBadge(r._status)+'</td></tr>';
    });
  }
  html+='</tbody></table></div>'+
    '<div style="font-size:11px;color:var(--text-muted);margin-top:8px" id="alkes-footer">'+
    data.length+' dari '+rawAlkes.length+' kapal</div>';

  pg.innerHTML=html;
}

function applyAlkesFilters(){
  var pg=document.getElementById('page-menu5');
  if(!pg)return;
  var sf=document.getElementById('alkes-sel-fleet');
  var ss=document.getElementById('alkes-sel-status');
  if(sf)pg.dataset.alkesFleet=sf.value;
  if(ss)pg.dataset.alkesStatus=ss.value;
  renderAlkesPage();
}
function applyP3KFilters(){
  var fLantai=(document.getElementById("p3k-filter-lantai")||{}).value||"";
  var fBulan =(document.getElementById("p3k-filter-bulan") ||{}).value||"";
  var fStatus=(document.getElementById("p3k-filter-status")||{}).value||"";
  filteredP3K=rawP3K.filter(function(r){
    if(fLantai&&r.lantai!==fLantai)return false;
    if(fBulan &&r.bulan!==fBulan)return false;
    if(fStatus==="Ada Masalah"){
      var bad=r.p3kStatus.toLowerCase().includes("tidak")||
              r.p3kStatus.toLowerCase().includes("expired")||
              r.p3kStatus.toLowerCase().includes("restock")||
              r.aedStatus.toLowerCase().includes("rusak")||
              r.aedStatus.toLowerCase().includes("servis");
      if(!bad)return false;
    }
    if(fStatus==="Belum Diperiksa"){
      if(r.p3kStatus||r.aedStatus)return false;
    }
    return true;
  });
  _renderP3KKPI();
  _renderP3KContent();
}

function clearP3KFilters(){
  ["p3k-filter-lantai","p3k-filter-bulan","p3k-filter-status"].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value="";
  });
  applyP3KFilters();
}

function switchP3KTab(tab){
  p3kTab=tab;
  ["overview","table","masalah"].forEach(function(t){
    var btn=document.getElementById("p3k-tab-"+t);
    var con=document.getElementById("p3k-content-"+t);
    if(btn)btn.classList.toggle("active",t===tab);
    if(con)con.style.display=t===tab?"block":"none";
  });
  _renderP3KContent();
}

function _renderP3KContent(){
  if(p3kTab==="overview")    _renderP3KOverview();
  else if(p3kTab==="table")  _renderP3KTable();
  else                       _renderP3KMasalah();
}

/* ─────────────────────────────────────
   KPI STRIP — pakai elemen dari HTML
───────────────────────────────────── */
function _renderP3KKPI(){
  var total=P3K_LOKASI.length;
  var sudahP3K=filteredP3K.filter(function(r){return r.p3kStatus&&r.p3kStatus!=="Tidak Diperiksa";}).length;
  var sudahAED=filteredP3K.filter(function(r){return r.aedStatus&&r.aedStatus!=="Tidak Diperiksa";}).length;
  var masalah=filteredP3K.filter(function(r){
    return r.p3kStatus.toLowerCase().includes("tidak")||
           r.p3kStatus.toLowerCase().includes("expired")||
           r.p3kStatus.toLowerCase().includes("restock")||
           r.aedStatus.toLowerCase().includes("rusak")||
           r.aedStatus.toLowerCase().includes("servis");
  }).length;
  /* Progress: lokasi yang sudah dicek minimal 1x */
  var lokCek=new Set(rawP3K.filter(function(r){return r.p3kStatus;}).map(function(r){return r.lantai+"|"+r.fungsi;})).size;
  var prog=Math.round((lokCek/total)*100)+"%";

  var el=function(id,v){var x=document.getElementById(id);if(x)x.textContent=v;};
  el("p3k-kpi-lokasi",total);
  el("p3k-kpi-p3k",sudahP3K||"—");
  el("p3k-kpi-aed",sudahAED||"—");
  el("p3k-kpi-masalah",masalah||"0");
  el("p3k-kpi-progress",prog);

  /* Update warna KPI masalah */
  var kpiMasalah=document.querySelector(".kpi-card.red .kpi-value");
  if(kpiMasalah&&masalah===0)kpiMasalah.style.color="#fff";
}

/* ─────────────────────────────────────
   TAB 1: OVERVIEW — Card per Lantai
───────────────────────────────────── */
function _renderP3KOverview(){
  var el=document.getElementById("p3k-content-overview");
  if(!el)return;

  /* Group by lantai+fungsi */
  var lokMap={};
  filteredP3K.forEach(function(r){
    var k=r.lantai+"|"+r.fungsi;
    if(!lokMap[k])lokMap[k]={lantai:r.lantai,fungsi:r.fungsi,rows:[]};
    lokMap[k].rows.push(r);
  });

  var loks=Object.values(lokMap);
  if(!loks.length){
    el.innerHTML='<div class="chart-card" style="padding:60px;text-align:center;color:var(--text-muted)"><i class="fas fa-magnifying-glass" style="font-size:36px;margin-bottom:12px;display:block"></i>Tidak ada data untuk filter yang dipilih</div>';
    return;
  }

  /* ── Ringkasan Cepat ── */
  var totalLok=loks.length;
  var lokOK=loks.filter(function(l){
    var last=l.rows.filter(function(r){return r.p3kStatus;});
    if(!last.length)return false;
    var r=last[last.length-1];
    return _p3kSt(r.p3kStatus).dot==="#ACC32A"&&_p3kSt(r.aedStatus).dot==="#ACC32A";
  }).length;
  var lokMasalah=loks.filter(function(l){
    return l.rows.some(function(r){
      return r.p3kStatus.toLowerCase().includes("tidak")||
             r.p3kStatus.toLowerCase().includes("expired")||
             r.aedStatus.toLowerCase().includes("rusak");
    });
  }).length;
  var lokBelum=loks.filter(function(l){
    return l.rows.every(function(r){return !r.p3kStatus&&!r.aedStatus;});
  }).length;

  var html='';

  /* ── Summary Bar ── */
  html+='<div class="chart-card" style="padding:18px 24px;margin-bottom:20px">'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">'
    +'<div style="width:4px;height:18px;background:var(--grad-blue);border-radius:2px"></div>'
    +'<span style="font-size:14px;font-weight:700;color:var(--text)">Ringkasan Status Semua Lokasi</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'
    +[
      {v:lokOK,   l:"Kondisi Baik",  c:"var(--green-dark)", bg:"var(--green-soft)", icon:"fa-circle-check"},
      {v:lokMasalah,l:"Ada Masalah", c:"var(--red)",        bg:"var(--red-soft)",   icon:"fa-triangle-exclamation"},
      {v:lokBelum,l:"Belum Dicek",   c:"var(--text-muted)", bg:"var(--bg)",         icon:"fa-clock"},
    ].map(function(s){
      return'<div style="background:'+s.bg+';border-radius:var(--radius-sm);padding:14px 16px;display:flex;align-items:center;gap:12px">'
        +'<div style="width:40px;height:40px;background:'+s.c+';border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        +'<i class="fas '+s.icon+'" style="color:#fff;font-size:16px"></i></div>'
        +'<div><div style="font-size:24px;font-weight:800;color:'+s.c+';font-family:var(--font2)">'+s.v+'</div>'
        +'<div style="font-size:11.5px;color:var(--text-muted);margin-top:1px">'+s.l+'</div></div>'
        +'</div>';
    }).join("")
    +'</div></div>';

  /* ── Grid Cards ── */
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:16px">';

  loks.forEach(function(lok){
    var dicek=lok.rows.filter(function(r){return r.p3kStatus||r.aedStatus;});
    var last=dicek.length?dicek[dicek.length-1]:lok.rows[lok.rows.length-1];
    var p3kSt=_p3kSt(last.p3kStatus);
    var aedSt=_p3kSt(last.aedStatus);
    var hasExp=last.p3kExp;
    var hasMasalah=p3kSt.dot==="#ED1A2F"||p3kSt.dot==="#F06000"||aedSt.dot==="#ED1A2F"||aedSt.dot==="#F06000";
    var allOK=p3kSt.dot==="#ACC32A"&&aedSt.dot==="#ACC32A";
    var notChecked=!last.p3kStatus&&!last.aedStatus;

    /* Progress per lokasi */
    var cekCount=lok.rows.filter(function(r){return r.p3kStatus&&r.p3kStatus!=="Tidak Diperiksa";}).length;
    var pct=Math.round((cekCount/12)*100);

    /* Top border color */
    var topCol=notChecked?"#9CA3AF":hasMasalah?"#ED1A2F":allOK?"#ACC32A":"#F06000";
    var topGrad=notChecked?"linear-gradient(90deg,#9CA3AF,#D1D5DB)":
                hasMasalah?"var(--grad-red)":
                allOK?"var(--grad-green)":"var(--grad-orange)";

    html+='<div class="hazard-card" style="border-top:3px solid '+topCol+';transition:transform .2s,box-shadow .2s;cursor:default" '
      +'onmouseenter="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'var(--shadow)\'" '
      +'onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">'

      /* Card Header */
      +'<div style="padding:16px 18px 12px;border-bottom:1.5px solid var(--border-soft)">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div>'
      +'<div style="font-size:13.5px;font-weight:800;color:var(--text);font-family:var(--font2);letter-spacing:.3px">'+esc(lok.lantai)+'</div>'
      +'<div style="font-size:12px;color:var(--text-muted);margin-top:1px">'+esc(lok.fungsi)+'</div>'
      +'</div>'
      +'<span style="background:'+topGrad+';color:#fff;padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:700;white-space:nowrap">'
      +(notChecked?"⏱ Belum Dicek":hasMasalah?"⚠ Ada Masalah":allOK?"✓ Baik":"⚡ Perhatian")
      +'</span></div>'

      /* Bulan terakhir dicek */
      +(last.bulan?'<div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:6px">'
        +'<i class="fas fa-calendar" style="margin-right:4px"></i>'+esc(last.bulan)
        +(last.pemeriksa?'<span style="color:var(--text-muted);font-weight:400;margin-left:8px">'
          +'<i class="fas fa-user" style="margin-right:3px"></i>'+esc(last.pemeriksa)+'</span>':'')
        +'</div>':"")
      +'</div>'

      /* Status P3K & AED */
      +'<div style="padding:12px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px">'

      /* P3K Box */
      +'<div style="background:'+p3kSt.bg+';border-radius:var(--radius-xs);padding:10px 12px">'
      +'<div style="font-size:9.5px;font-weight:700;color:'+p3kSt.c+';text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">'
      +'<i class="fas fa-kit-medical" style="margin-right:4px"></i>Kotak P3K</div>'
      +'<div style="display:flex;align-items:center;gap:6px">'
      +'<i class="fas '+p3kSt.icon+'" style="color:'+p3kSt.c+';font-size:13px"></i>'
      +'<span style="font-size:12px;font-weight:700;color:'+p3kSt.c+'">'+(last.p3kStatus||"Belum Dicek")+'</span>'
      +'</div>'
      +(last.p3kTemuan?'<div style="font-size:10px;color:var(--text-muted);margin-top:4px;line-height:1.4">'+esc(last.p3kTemuan.slice(0,45))+'</div>':"")
      +'</div>'

      /* AED Box */
      +'<div style="background:'+aedSt.bg+';border-radius:var(--radius-xs);padding:10px 12px">'
      +'<div style="font-size:9.5px;font-weight:700;color:'+aedSt.c+';text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">'
      +'<i class="fas fa-heart-pulse" style="margin-right:4px"></i>AED</div>'
      +'<div style="display:flex;align-items:center;gap:6px">'
      +'<i class="fas '+aedSt.icon+'" style="color:'+aedSt.c+';font-size:13px"></i>'
      +'<span style="font-size:12px;font-weight:700;color:'+aedSt.c+'">'+(last.aedStatus||"Belum Dicek")+'</span>'
      +'</div>'
      +(last.aedTemuan?'<div style="font-size:10px;color:var(--text-muted);margin-top:4px;line-height:1.4">'+esc(last.aedTemuan.slice(0,45))+'</div>':"")
      +'</div></div>'

      /* Expired Alert */
      +(hasExp?'<div style="margin:0 18px 12px;background:var(--red-soft);border:1px solid var(--red);border-radius:var(--radius-xs);padding:8px 12px;display:flex;align-items:center;gap:8px">'
        +'<i class="fas fa-clock" style="color:var(--red);font-size:13px;flex-shrink:0"></i>'
        +'<div style="font-size:11px;color:var(--red);font-weight:600"><strong>Expired:</strong> '+esc(last.p3kExp)+'</div></div>':"")

      /* Tindak Lanjut */
      +(last.p3kTL||last.aedTL?'<div style="margin:0 18px 12px;background:var(--blue-soft);border-radius:var(--radius-xs);padding:8px 12px">'
        +'<div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:3px"><i class="fas fa-arrow-right" style="margin-right:4px"></i>Tindak Lanjut</div>'
        +'<div style="font-size:11px;color:var(--text-mid)">'+(last.p3kTL||last.aedTL||"")+'</div></div>':"")

      /* Progress Bar */
      +'<div style="padding:10px 18px 14px;border-top:1.5px solid var(--border-soft)">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:5px">'
      +'<span>Progress Pengecekan 2026</span><span style="font-weight:600;color:'+topCol+'">'+cekCount+'/12 bulan</span></div>'
      +'<div style="background:var(--border);border-radius:99px;height:5px;overflow:hidden">'
      +'<div style="width:'+pct+'%;background:'+topGrad+';height:5px;border-radius:99px;transition:width .6s"></div>'
      +'</div></div>'

      +'</div>';
  });

  html+='</div>';
  el.innerHTML=html;
}

/* ─────────────────────────────────────
   TAB 2: TABEL PENGECEKAN
───────────────────────────────────── */
function _renderP3KTable(){
  var wrap=document.getElementById("p3k-table-wrap");
  var cnt =document.getElementById("p3k-table-count");
  if(!wrap)return;
  if(cnt)cnt.textContent=filteredP3K.length+" data";

  var hdrs=["Bulan","Lantai","Fungsi","Tgl P3K","Status P3K","Temuan P3K",
            "Item Exp","Tgl AED","Status AED","Temuan AED","Pemeriksa","Overall"];
  var thead=hdrs.map(function(h){
    return'<th style="padding:10px 12px;background:var(--grad-blue);color:#fff;font-size:11px;font-weight:700;text-align:left;border:none;white-space:nowrap">'+h+'</th>';
  }).join("");

  var tbody=filteredP3K.map(function(r,i){
    var p3kSt=_p3kSt(r.p3kStatus);
    var aedSt=_p3kSt(r.aedStatus);
    var ovSt =_p3kSt(r.overall);
    var ev=i%2===0?"var(--bg-card)":"var(--bg)";
    function td(v,extra){
      return'<td style="padding:8px 12px;font-size:11.5px;color:var(--text-mid);border-bottom:1px solid var(--border-soft);'+(extra||'')+'">'+esc(v||"—")+'</td>';
    }
    function badge(st,v){
      if(!v)return'<td style="padding:8px 12px;border-bottom:1px solid var(--border-soft)"><span style="font-size:10.5px;color:var(--text-muted)">—</span></td>';
      return'<td style="padding:8px 12px;border-bottom:1px solid var(--border-soft)">'
        +'<span style="background:'+st.bg+';color:'+st.c+';padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700;white-space:nowrap">'
        +'<i class="fas '+st.icon+'" style="margin-right:4px;font-size:9px"></i>'+esc(v)+'</span></td>';
    }
    return'<tr style="background:'+ev+'">'
      +td(r.bulan,"font-weight:700;color:var(--blue)")
      +td(r.lantai,"font-weight:700")
      +td(r.fungsi)
      +td(r.p3kTgl)
      +badge(p3kSt,r.p3kStatus)
      +td(r.p3kTemuan)
      +'<td style="padding:8px 12px;font-size:11.5px;color:var(--red);font-weight:600;border-bottom:1px solid var(--border-soft)">'+esc(r.p3kExp||"—")+'</td>'
      +td(r.aedTgl)
      +badge(aedSt,r.aedStatus)
      +td(r.aedTemuan)
      +td(r.pemeriksa)
      +badge(ovSt,r.overall)
      +'</tr>';
  }).join("");

  wrap.innerHTML='<table style="width:100%;border-collapse:collapse;min-width:900px">'
    +'<thead><tr>'+thead+'</tr></thead><tbody>'+tbody+'</tbody></table>';
}

/* ─────────────────────────────────────
   TAB 3: TEMUAN & TINDAK LANJUT
───────────────────────────────────── */
function _renderP3KMasalah(){
  var el=document.getElementById("p3k-content-masalah");
  if(!el)return;

  var masalah=filteredP3K.filter(function(r){
    return r.p3kStatus.toLowerCase().includes("tidak")||
           r.p3kStatus.toLowerCase().includes("expired")||
           r.p3kStatus.toLowerCase().includes("restock")||
           r.aedStatus.toLowerCase().includes("rusak")||
           r.aedStatus.toLowerCase().includes("servis")||
           r.p3kExp||r.aedExp;
  });
  var belum=filteredP3K.filter(function(r){
    return !r.p3kStatus&&!r.aedStatus;
  });

  if(!masalah.length&&!belum.length){
    el.innerHTML='<div class="chart-card" style="padding:60px;text-align:center">'
      +'<div style="width:72px;height:72px;background:var(--green-soft);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">'
      +'<i class="fas fa-circle-check" style="font-size:32px;color:var(--green-dark)"></i></div>'
      +'<div style="font-size:16px;font-weight:800;color:var(--green-dark);margin-bottom:6px">Semua Lokasi Dalam Kondisi Baik</div>'
      +'<div style="font-size:13px;color:var(--text-muted)">Tidak ada temuan bermasalah pada periode yang dipilih</div>'
      +'</div>';
    return;
  }

  /* Regulasi strip */
  var regBox='<div style="background:var(--blue-soft);border-left:4px solid var(--blue);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px">'
    +'<i class="fas fa-scale-balanced" style="color:var(--blue);font-size:18px;flex-shrink:0;margin-top:2px"></i>'
    +'<div style="font-size:12px;color:var(--text-mid);line-height:1.8">'
    +'<strong style="color:var(--blue)">Permenakertrans No.Per.15/MEN/VIII/2008</strong> — '
    +'Pengusaha wajib memastikan kotak P3K selalu dalam kondisi lengkap dan siap pakai. '
    +'Item kedaluwarsa wajib segera diganti. '
    +'AED wajib diperiksa setiap bulan sesuai panduan <strong>PERKI 2023</strong> dan <strong>AHA Guidelines 2020</strong>.'
    +'</div></div>';

  function section(items,title,grad,icon,bg,bc){
    if(!items.length)return"";
    return'<div class="chart-card" style="margin-bottom:16px;overflow:visible">'
      +'<div style="padding:14px 20px;background:'+grad+';border-radius:var(--radius) var(--radius) 0 0;display:flex;align-items:center;gap:10px">'
      +'<i class="fas '+icon+'" style="color:#fff;font-size:16px"></i>'
      +'<span style="font-size:14px;font-weight:700;color:#fff">'+title+'</span>'
      +'<span style="background:rgba(255,255,255,.25);color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;margin-left:auto">'+items.length+' lokasi</span>'
      +'</div>'
      +'<div style="padding:16px;display:flex;flex-direction:column;gap:10px">'
      +items.map(function(r){
        var p3kSt=_p3kSt(r.p3kStatus);
        var aedSt=_p3kSt(r.aedStatus);
        return'<div style="background:'+bg+';border:1px solid '+bc+';border-radius:var(--radius-sm);padding:14px 16px">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          +'<div style="display:flex;align-items:center;gap:10px">'
          +'<div style="background:'+grad+';width:36px;height:36px;border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center">'
          +'<i class="fas fa-building" style="color:#fff;font-size:14px"></i></div>'
          +'<div><div style="font-size:13px;font-weight:800;color:var(--text);font-family:var(--font2)">'+esc(r.lantai)+'</div>'
          +'<div style="font-size:11.5px;color:var(--text-muted)">'+esc(r.fungsi)+'</div></div></div>'
          +'<div style="text-align:right">'
          +'<div style="font-size:11px;font-weight:600;color:var(--blue)">'+esc(r.bulan||"—")+'</div>'
          +(r.pemeriksa?'<div style="font-size:10.5px;color:var(--text-muted)">'+esc(r.pemeriksa)+'</div>':"")
          +'</div></div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
          /* P3K detail */
          +'<div style="background:'+p3kSt.bg+';border-radius:var(--radius-xs);padding:10px 12px">'
          +'<div style="font-size:10px;font-weight:700;color:'+p3kSt.c+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">'
          +'<i class="fas fa-kit-medical" style="margin-right:3px"></i>P3K</div>'
          +(r.p3kStatus?'<span style="background:'+p3kSt.c+';color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">'+esc(r.p3kStatus)+'</span>':'')
          +(r.p3kTemuan?'<div style="font-size:11px;color:var(--text-mid);margin-top:5px">'+esc(r.p3kTemuan)+'</div>':"")
          +(r.p3kExp?'<div style="font-size:10.5px;color:var(--red);margin-top:4px;font-weight:600"><i class="fas fa-clock" style="margin-right:3px"></i>Exp: '+esc(r.p3kExp)+'</div>':"")
          +(r.p3kTL?'<div style="font-size:10.5px;color:var(--blue);margin-top:4px"><i class="fas fa-arrow-right" style="margin-right:3px"></i>'+esc(r.p3kTL)+'</div>':"")
          +'</div>'
          /* AED detail */
          +'<div style="background:'+aedSt.bg+';border-radius:var(--radius-xs);padding:10px 12px">'
          +'<div style="font-size:10px;font-weight:700;color:'+aedSt.c+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">'
          +'<i class="fas fa-heart-pulse" style="margin-right:3px"></i>AED</div>'
          +(r.aedStatus?'<span style="background:'+aedSt.c+';color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">'+esc(r.aedStatus)+'</span>':'')
          +(r.aedTemuan?'<div style="font-size:11px;color:var(--text-mid);margin-top:5px">'+esc(r.aedTemuan)+'</div>':"")
          +(r.aedExp?'<div style="font-size:10.5px;color:var(--red);margin-top:4px;font-weight:600"><i class="fas fa-clock" style="margin-right:3px"></i>Exp: '+esc(r.aedExp)+'</div>':"")
          +(r.aedTL?'<div style="font-size:10.5px;color:var(--blue);margin-top:4px"><i class="fas fa-arrow-right" style="margin-right:3px"></i>'+esc(r.aedTL)+'</div>':"")
          +'</div></div>'
          +'</div>';
      }).join("")
      +'</div></div>';
  }

  el.innerHTML=regBox
    +section(masalah,"Temuan Bermasalah — Segera Ditindaklanjuti",
      "var(--grad-red)","fa-triangle-exclamation","var(--red-soft)","#FFCDD2")
    +section(belum,"Belum Diperiksa Periode Ini",
      "var(--grad-orange)","fa-clock","#FFF3E0","#FFCC80");
}

function exportP3KPPT(){
  showToast("Export PPT P3K & AED akan segera hadir.","info");
}

/* ═══════════════════════════════════════════════════════════════
   PUSAT PERHATIAN (🔔) & PENGATURAN (⚙️) — v5.3
   Tombol topbar difungsikan. Mengumpulkan item kritis dari data
   yang sudah ada (MCU UNFIT, AED/alkes, DAT positif) ke satu panel.
   Tidak ada localStorage (preferensi disimpan di memori sesi).
═══════════════════════════════════════════════════════════════ */
var _notifPanelOpen=false, _settingsPanelOpen=false;
var _prefs={ autoRefresh:true, theme:"light" };
var _notifDismissed={}; /* key item yang sudah dibaca (selama sesi) */

/* ── Kumpulkan item perhatian dari data global ── */
function collectAttentionItems(){
  var items=[];
  /* MCU — UNFIT & risiko kritis */
  try{
    var mcu=(typeof filteredMCU!=="undefined"&&filteredMCU.length)?filteredMCU:(typeof rawMCU!=="undefined"?rawMCU:[]);
    var unfit=mcu.filter(function(r){return String(r["Hasil Umum"]||"").toUpperCase()==="UNFIT";});
    var nihl=mcu.filter(function(r){return (r._audioKlasif||"")==="NIHL";});
    if(unfit.length)items.push({key:"mcu_unfit",pri:"TINGGI",icon:"fa-user-doctor",cat:"MCU Pelaut",
      text:unfit.length+" pelaut berstatus UNFIT — perlu rujukan medis & keputusan fit-to-work.",
      detail:unfit.slice(0,5).map(function(r){return r["Nama Lengkap"]||r["NIP / ID Pelaut"]||"—";}).join(", "),
      menu:"medsurv"});
    if(nihl.length)items.push({key:"mcu_nihl",pri:"SEDANG",icon:"fa-ear-listen",cat:"MCU Pelaut",
      text:nihl.length+" pelaut indikasi NIHL — perlu audiometri ulang & kontrol kebisingan.",
      detail:"",menu:"medsurv"});
  }catch(e){}
  /* Alkes — AED expired & kapal tidak lengkap */
  try{
    var alk=(typeof filteredAlkes!=="undefined"&&filteredAlkes.length)?filteredAlkes:(typeof rawAlkes!=="undefined"?rawAlkes:[]);
    var aedExp=alk.filter(function(r){return r._expiredAED===true;});
    var tdk=alk.filter(function(r){return (r._status||"")==="TIDAK LENGKAP";});
    if(aedExp.length)items.push({key:"alkes_aed",pri:"TINGGI",icon:"fa-heart-pulse",cat:"Alkes Kapal",
      text:aedExp.length+" unit AED kedaluwarsa — segera pengadaan/ganti baterai & pad.",
      detail:aedExp.slice(0,5).map(function(r){return r._kapal||r["Nama Kapal"]||"—";}).join(", "),
      menu:"menu5"});
    if(tdk.length)items.push({key:"alkes_tdk",pri:"SEDANG",icon:"fa-briefcase-medical",cat:"Alkes Kapal",
      text:tdk.length+" kapal alkes TIDAK LENGKAP — perlu pemenuhan alat wajib.",
      detail:tdk.slice(0,5).map(function(r){return r._kapal||r["Nama Kapal"]||"—";}).join(", "),
      menu:"menu5"});
  }catch(e){}
  /* DAT — hasil positif */
  try{
    var dat=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:(typeof rawDAT!=="undefined"?rawDAT:[]);
    var posKapal=dat.filter(function(r){return parseInt(r["Jumlah Crew Positif"]||0)>0;});
    var totPos=posKapal.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
    if(totPos>0)items.push({key:"dat_pos",pri:"TINGGI",icon:"fa-vial-circle-check",cat:"DAT",
      text:totPos+" crew positif DAT pada "+posKapal.length+" kapal — uji konfirmasi & fit-to-sail.",
      detail:posKapal.slice(0,5).map(function(r){return r["Nama Kapal"]||"—";}).join(", "),
      menu:"dat"});
  }catch(e){}
  /* buang item yang sudah dibaca pada sesi ini */
  items=items.filter(function(it){return !_notifDismissed[it.key];});
  /* urutkan: TINGGI dulu */
  var ord={TINGGI:0,SEDANG:1,RUTIN:2};
  items.sort(function(a,b){return (ord[a.pri]||9)-(ord[b.pri]||9);});
  return items;
}

/* ── Update badge angka di lonceng ── */
function updateNotifBadge(){
  var badge=document.getElementById("notifBadge");
  if(!badge)return;
  var n=collectAttentionItems().filter(function(i){return i.pri==="TINGGI";}).length;
  if(n>0){badge.style.display="block";badge.textContent=n>9?"9+":String(n);}
  else badge.style.display="none";
}

/* ── Tandai 1 item sudah dibaca, lalu segarkan panel & badge ── */
function notifDismiss(key,ev){
  if(ev)ev.stopPropagation();
  _notifDismissed[key]=true;
  updateNotifBadge();
  _renderNotifBody();
}

/* ── Tandai semua sudah dibaca ── */
function notifDismissAll(ev){
  if(ev)ev.stopPropagation();
  collectAttentionItems().forEach(function(it){_notifDismissed[it.key]=true;});
  updateNotifBadge();
  _renderNotifBody();
}

/* ── Render ulang isi panel (dipakai saat dismiss tanpa menutup panel) ── */
function _renderNotifBody(){
  var panel=document.getElementById("notifPanel");
  if(!panel)return;
  var items=collectAttentionItems();
  var head=panel.querySelector("[data-notif-count]");
  if(head)head.textContent=items.length+" item";
  var bodyWrap=panel.querySelector("[data-notif-body]");
  if(bodyWrap)bodyWrap.innerHTML=_notifBodyHtml(items);
  var foot=panel.querySelector("[data-notif-foot]");
  if(foot)foot.style.display=items.length?"block":"none";
}

/* ── HTML isi daftar notif ── */
function _notifBodyHtml(items){
  var PRI={TINGGI:{c:"#E53935",bg:"#FEE2E2",l:"TINGGI"},SEDANG:{c:"#E65100",bg:"#FEF3C7",l:"SEDANG"},RUTIN:{c:"#00897B",bg:"#E0F2F1",l:"RUTIN"}};
  if(!items.length){
    return '<div style="padding:36px 20px;text-align:center;color:#6B7280">'+
      '<i class="fas fa-circle-check" style="font-size:34px;color:#43A047;margin-bottom:12px"></i>'+
      '<div style="font-size:13px;font-weight:700;color:#0F2A4A">Tidak ada yang perlu perhatian</div>'+
      '<div style="font-size:11px;margin-top:4px">Semua indikator dalam batas normal.</div></div>';
  }
  return items.map(function(it){
    var p=PRI[it.pri]||PRI.RUTIN;
    return '<div style="display:flex;gap:11px;padding:12px 15px;border-bottom:1px solid #F0F2F5;transition:background .15s" onmouseover="this.style.background=\'#F7F9FB\'" onmouseout="this.style.background=\'transparent\'">'+
      '<div onclick="notifGoto(\''+it.menu+'\',\''+it.key+'\')" style="display:flex;gap:11px;flex:1;min-width:0;cursor:pointer">'+
      '<div style="flex-shrink:0;width:34px;height:34px;border-radius:9px;background:'+p.bg+';display:flex;align-items:center;justify-content:center"><i class="fas '+it.icon+'" style="color:'+p.c+';font-size:14px"></i></div>'+
      '<div style="flex:1;min-width:0">'+
      '<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><span style="font-size:9px;font-weight:800;color:'+p.c+';background:'+p.bg+';padding:1px 7px;border-radius:20px;letter-spacing:.4px">'+p.l+'</span>'+
      '<span style="font-size:10px;color:#9AA5B1;font-weight:600">'+esc(it.cat)+'</span></div>'+
      '<div style="font-size:12px;color:#0F2A4A;font-weight:600;line-height:1.4">'+esc(it.text)+'</div>'+
      (it.detail?'<div style="font-size:10.5px;color:#6B7280;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(it.detail)+'</div>':'')+
      '</div></div>'+
      '<button onclick="notifDismiss(\''+it.key+'\',event)" title="Tandai sudah dibaca" style="flex-shrink:0;width:24px;height:24px;border:none;background:transparent;color:#B0BAC6;cursor:pointer;border-radius:6px;font-size:13px" onmouseover="this.style.background=\'#EEF1F5\';this.style.color=\'#6B7280\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'#B0BAC6\'"><i class="fas fa-xmark"></i></button>'+
      '</div>';
  }).join('');
}

/* ── Panel Pusat Perhatian ── */
function toggleNotifPanel(ev){
  if(ev)ev.stopPropagation();
  closeSettingsPanel();
  var existing=document.getElementById("notifPanel");
  if(existing){existing.remove();_notifPanelOpen=false;return;}
  var items=collectAttentionItems();
  var panel=document.createElement("div");
  panel.id="notifPanel";
  panel.style.cssText="position:absolute;top:52px;right:0;width:340px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #E5E7EB;border-radius:14px;box-shadow:0 12px 40px rgba(15,42,74,.18);z-index:1000;overflow:hidden;animation:notifSlide .18s ease";
  panel.innerHTML='<div style="padding:13px 16px;background:#0F2A4A;color:#fff;display:flex;align-items:center;justify-content:space-between">'+
    '<div style="font-size:13px;font-weight:800"><i class="fas fa-bell" style="margin-right:8px;color:#80DEEA"></i>Pusat Perhatian</div>'+
    '<span data-notif-count style="font-size:11px;color:rgba(255,255,255,.7)">'+items.length+' item</span></div>'+
    '<div data-notif-body style="max-height:55vh;overflow-y:auto">'+_notifBodyHtml(items)+'</div>'+
    '<div data-notif-foot style="display:'+(items.length?"block":"none")+';padding:10px 15px;background:#F7F9FB;border-top:1px solid #EEF1F5;text-align:center">'+
    '<button onclick="notifDismissAll(event)" style="border:none;background:transparent;color:#006BB8;font-size:11.5px;font-weight:700;cursor:pointer"><i class="fas fa-check-double" style="margin-right:6px"></i>Tandai semua sudah dibaca</button></div>';
  /* posisikan relatif ke topbar-right */
  var anchor=document.getElementById("mBellBtn");
  var wrap=anchor&&anchor.parentNode?anchor.parentNode:document.body;
  wrap.style.position="relative";
  wrap.appendChild(panel);
  _notifPanelOpen=true;
  setTimeout(function(){document.addEventListener("click",_closeNotifOnOutside);},10);
}
function _closeNotifOnOutside(e){
  var p=document.getElementById("notifPanel");
  if(p&&!p.contains(e.target)&&e.target.id!=="mBellBtn"&&!(e.target.closest&&e.target.closest("#mBellBtn"))){
    p.remove();_notifPanelOpen=false;document.removeEventListener("click",_closeNotifOnOutside);
  }
}
function notifGoto(menu,key){
  if(key)_notifDismissed[key]=true; /* item yang diklik dianggap dibaca */
  var p=document.getElementById("notifPanel");if(p)p.remove();
  _notifPanelOpen=false;
  updateNotifBadge();
  if(typeof switchPage==="function"){try{switchPage(menu);}catch(e){}}
  var nav=document.querySelector('.nav-item[data-menu="'+menu+'"]');
  if(nav)nav.click();
}

/* ── Panel Pengaturan ── */
function closeSettingsPanel(){var p=document.getElementById("settingsPanel");if(p){p.remove();_settingsPanelOpen=false;}}
function closeNotifPanel(){var p=document.getElementById("notifPanel");if(p){p.remove();_notifPanelOpen=false;}}
function toggleSettingsPanel(ev){
  if(ev)ev.stopPropagation();
  closeNotifPanel();
  if(document.getElementById("settingsPanel")){closeSettingsPanel();return;}
  function row(label,sub,control){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 16px;border-bottom:1px solid #F0F2F5">'+
      '<div><div style="font-size:12.5px;font-weight:700;color:#0F2A4A">'+label+'</div>'+
      (sub?'<div style="font-size:10.5px;color:#6B7280;margin-top:2px">'+sub+'</div>':'')+'</div>'+control+'</div>';
  }
  function toggle(id,on){
    return '<button id="'+id+'" onclick="settingsToggle(\''+id+'\')" style="width:42px;height:24px;border-radius:20px;border:none;cursor:pointer;background:'+(on?"#00C2A8":"#CBD5E1")+';position:relative;transition:background .2s;flex-shrink:0">'+
      '<span style="position:absolute;top:3px;left:'+(on?"21px":"3px")+';width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></button>';
  }
  /* daftar fleet untuk default */
  var fleets=[];try{
    var src=(typeof rawMCU!=="undefined"?rawMCU:[]).concat(typeof rawAlkes!=="undefined"?rawAlkes:[]);
    src.forEach(function(r){var f=r["Jenis Fleet"]||r._fleet||r["Fleet"]||"";if(f&&fleets.indexOf(f)===-1)fleets.push(f);});
  }catch(e){}
  var fleetOpts='<option value="">Semua Fleet</option>'+fleets.map(function(f){return'<option'+(_prefs.defaultFleet===f?' selected':'')+'>'+esc(f)+'</option>';}).join('');

  var panel=document.createElement("div");
  panel.id="settingsPanel";
  panel.style.cssText="position:absolute;top:52px;right:0;width:320px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #E5E7EB;border-radius:14px;box-shadow:0 12px 40px rgba(15,42,74,.18);z-index:1000;overflow:hidden;animation:notifSlide .18s ease";
  panel.innerHTML='<div style="padding:13px 16px;background:#0F2A4A;color:#fff;font-size:13px;font-weight:800"><i class="fas fa-gear" style="margin-right:8px;color:#80DEEA"></i>Pengaturan</div>'+
    row("Auto-refresh data","Muat ulang data otomatis tiap 5 menit",toggle("setAutoRefresh",_prefs.autoRefresh))+
    row("Mode gelap","Tampilan gelap menyeluruh termasuk menu",toggle("setDarkMode",_prefs.theme==="dark"))+
    row("Fleet default","Fleet yang tampil saat dashboard dibuka",
      '<select id="setDefaultFleet" onchange="settingsSetFleet(this.value)" style="font-size:11.5px;padding:6px 9px;border-radius:8px;border:1px solid #D1D9E2;color:#0F2A4A;max-width:130px">'+fleetOpts+'</select>')+
    '<div style="padding:11px 16px;background:#F7F9FB"><button onclick="settingsRefreshNow()" style="width:100%;padding:9px;background:#006BB8;color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-rotate-right" style="margin-right:7px"></i>Muat Ulang Data Sekarang</button>'+
    '<div style="font-size:10px;color:#9AA5B1;text-align:center;margin-top:9px">Preferensi berlaku selama sesi ini.</div></div>';
  var anchor=document.getElementById("mGearBtn");
  var wrap=anchor&&anchor.parentNode?anchor.parentNode:document.body;
  wrap.style.position="relative";
  wrap.appendChild(panel);
  _settingsPanelOpen=true;
  setTimeout(function(){document.addEventListener("click",_closeSettingsOnOutside);},10);
}
function _closeSettingsOnOutside(e){
  var p=document.getElementById("settingsPanel");
  if(p&&!p.contains(e.target)&&e.target.id!=="mGearBtn"&&!(e.target.closest&&e.target.closest("#mGearBtn"))){
    p.remove();_settingsPanelOpen=false;document.removeEventListener("click",_closeSettingsOnOutside);
  }
}
function settingsToggle(id){
  if(id==="setAutoRefresh"){
    _prefs.autoRefresh=!_prefs.autoRefresh;
    if(typeof window._setAutoRefreshEnabled==="function")window._setAutoRefreshEnabled(_prefs.autoRefresh);
    showToast("Auto-refresh "+(_prefs.autoRefresh?"diaktifkan":"dimatikan")+".","info");
  }else if(id==="setDarkMode"){
    _prefs.theme=_prefs.theme==="dark"?"light":"dark";
    document.documentElement.classList.toggle("theme-dark",_prefs.theme==="dark");
    showToast("Mode "+(_prefs.theme==="dark"?"gelap":"terang")+" aktif.","info");
  }
  /* re-render toggle visual */
  var on=(id==="setAutoRefresh")?_prefs.autoRefresh:(_prefs.theme==="dark");
  var btn=document.getElementById(id);
  if(btn){btn.style.background=on?"#00C2A8":"#CBD5E1";var k=btn.querySelector("span");if(k)k.style.left=on?"21px":"3px";}
}
function settingsSetFleet(v){
  _prefs.defaultFleet=v;
  showToast(v?("Fleet default: "+v):"Default: Semua Fleet","info");
}
function settingsRefreshNow(){
  closeSettingsPanel();
  if(typeof isDemo==="function"&&isDemo()){showToast("Mode Demo — data tidak dimuat dari server.","info");return;}
  if(typeof loadData==="function")loadData();
}

/* ── Hook: dipanggil setelah loadData selesai untuk refresh badge ── */
function refreshNotifAfterLoad(){ try{updateNotifBadge();}catch(e){} }
