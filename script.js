/**
 * ============================================================
 *  HSE Marine Dashboard — Google Apps Script
 *  File: Code.gs  |  v5.2 — Fix Alkes + MCU field sync
 * ============================================================
 */

const USER_LIST = [
  { username: "ihpis2026", passwordHash: "", displayName: "IH Admin",  role: "admin"  },
  { username: "health3",   passwordHash: "", displayName: "Health3",   role: "viewer" },
  { username: "demo",      passwordHash: "", displayName: "Demo User", role: "demo"   },
];

const TOKEN_EXPIRE_MS    = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS         = 15 * 60 * 1000;
const SECRET_SALT_DEFAULT = "PPNiii_HSSE_2026_!";

function getSecretSalt() {
  try {
    return PropertiesService.getScriptProperties().getProperty("SECRET_SALT") || SECRET_SALT_DEFAULT;
  } catch(e) { return SECRET_SALT_DEFAULT; }
}

const SHEET_CONFIG = {
  hra:         "Data IH",
  dat:         "Data DAT",
  pest:        "Pest & Rodent",
  p3k:         "P3K & AED",
  menu5:       "Sebaran Alkes Kapal",
  menu6:       "Placeholder 6",
  fisika:      "Faktor_Fisika",
  kimia:       "Faktor_Kimia",
  biologi:     "Faktor_Biologi",
  ergonomi:    "Faktor_Ergonomi",
  psikososial: "Faktor_Psikososial",
  _tokens:     "_auth_tokens",
  _lockouts:   "_auth_lockouts",
  _driveFiles: "_drive_files",
  _accessLog:  "_access_log",
  biomarker:   "Biomarker_Benzene",
  personal:    "Benzene_Personal",
  mcu:         "MCU PELAUT",
  alkes:       "Sebaran Alkes Kapal",
};

const DRIVE_ROOT_FOLDER_NAME = "IH_Dashboard_PPN3";
const DRIVE_FOLDERS = {
  pedoman:    "Pedoman_IH",
  dok_hra_ih: "Dokumentasi/HRA_IH",
  dok_dat:    "Dokumentasi/DAT",
  dok_pest:   "Dokumentasi/Pest_Rodent",
};
const MAX_PDF_SIZE   = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PDF_MIMETYPES   = ["application/pdf"];
const ALLOWED_IMAGE_MIMETYPES = ["image/jpeg","image/png","image/webp","image/gif"];
const ALLOWED_MIMETYPES       = ALLOWED_PDF_MIMETYPES.concat(ALLOWED_IMAGE_MIMETYPES);

const PEST_HEADER_MAP = {
  "lokasi":"Lokasi","location":"Lokasi","tanggal":"Tanggal","tanggal pelaksanaan":"Tanggal",
  "date":"Tanggal","bulan":"Bulan","bulan pelaksanaan":"Bulan","month":"Bulan",
  "temuan":"Temuan / Keluhan","temuan / keluhan":"Temuan / Keluhan","temuan/keluhan":"Temuan / Keluhan",
  "temuan/ keluhan":"Temuan / Keluhan","keluhan":"Temuan / Keluhan","finding":"Temuan / Keluhan",
  "tindak lanjut":"Tindak Lanjut","tindak lanjut & rekomendasi":"Tindak Lanjut",
  "tindak lanjut dan rekomendasi":"Tindak Lanjut","tindaklanjut":"Tindak Lanjut",
  "rekomendasi":"Tindak Lanjut","follow up":"Tindak Lanjut","followup":"Tindak Lanjut",
  "est biaya":"Est Biaya","est. biaya":"Est Biaya","estimasi biaya":"Est Biaya",
  "biaya":"Est Biaya","cost":"Est Biaya","budget":"Est Biaya",
};

const DRIVE_FILES_HEADERS = [
  "id","module","filename","mimeType","nama","kategori","keterangan",
  "uploadedBy","uploadDate","uploadTime","sizeBytes",
  "fileUrl","downloadUrl","viewUrl","previewUrl","downloads"
];

// ── SETUP ──
function initPasswordHashes() {
  var props = PropertiesService.getScriptProperties();
  var passwords = { "ihpis2026":"Samirah2026", "health3":"Test2026", "demo":"demo1234" };
  Object.keys(passwords).forEach(function(u){
    var h = hashPassword(passwords[u]);
    props.setProperty("PWD_"+u.toUpperCase(), h);
    Logger.log("Hash saved: "+u);
  });
  Logger.log("initPasswordHashes selesai.");
}

// ── MAIN HANDLER ──
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || "";
    if (action==="login")      return handleLogin(body);
    if (action==="verifyOTP")  return handleVerifyOTP(body);
    if (action==="logout")     return handleLogout(body);
    var tc = validateToken(body.token);
    if (!tc.valid) return buildResponse({status:"unauthorized",message:tc.reason});
    if (action==="getData")       return handleGetData(body,tc);
    if (action==="getAccessLog")  return handleGetAccessLog(body,tc);
    if (action==="biomonitoring") return handleBiomonitoring(body,tc);
    if (action==="getMCU")        return handleMCUSurveillance(body,tc);
    var ADMIN_ONLY = ["driveUpload","driveDelete","driveUpdateMeta"];
    if (ADMIN_ONLY.indexOf(action)!==-1 && tc.role!=="admin")
      return buildResponse({status:"forbidden",message:"Hanya Admin."});
    if (action==="driveUpload")     return handleDriveUpload(body,tc);
    if (action==="driveList")       return handleDriveList(body);
    if (action==="driveDelete")     return handleDriveDelete(body,tc);
    if (action==="driveGetFile")    return handleDriveGetFile(body);
    if (action==="driveUpdateMeta") return handleDriveUpdateMeta(body,tc);
    return buildResponse({status:"error",message:"Action tidak dikenal: "+action});
  } catch(err) {
    return buildResponse({status:"error",message:"Server error: "+err.toString()});
  }
}
function doGet(e){return buildResponse({status:"info",message:"IH Dashboard API v5.2",timestamp:new Date().toISOString()});}
function doOptions(e){return ContentService.createTextOutput(JSON.stringify({status:"ok"})).setMimeType(ContentService.MimeType.JSON);}

// ── LOGIN ──
function handleLogin(body) {
  var username = (body.username||"").trim().toLowerCase();
  var password = (body.password||"").trim();
  if(!username||!password) return buildResponse({status:"error",message:"Username dan password wajib."});
  var lockout = checkLockout(username);
  if(lockout.locked) return buildResponse({status:"locked",message:"Coba lagi dalam "+Math.ceil(lockout.sisaMs/60000)+" menit."});
  var user=null;
  for(var i=0;i<USER_LIST.length;i++){if(USER_LIST[i].username.toLowerCase()===username){user=USER_LIST[i];break;}}
  if(!user){
    recordFailedAttempt(username);
    logAccessEvent(username,"LOGIN_FAIL","viewer",body.deviceInfo||{},"User tidak ditemukan");
    return buildResponse({status:"error",message:"Username atau password salah. Sisa: "+(MAX_LOGIN_ATTEMPTS-getFailedAttempts(username))});
  }
  var props=PropertiesService.getScriptProperties();
  var storedHash=props.getProperty("PWD_"+user.username.toUpperCase());
  if(!storedHash){try{initPasswordHashes();storedHash=props.getProperty("PWD_"+user.username.toUpperCase());}catch(e){return buildResponse({status:"error",message:"Jalankan initPasswordHashes() dulu."});}}
  if(hashPassword(password)!==storedHash){
    recordFailedAttempt(username);
    logAccessEvent(username,"LOGIN_FAIL",user.role,body.deviceInfo||{},"Password salah");
    return buildResponse({status:"error",message:"Username atau password salah. Sisa: "+(MAX_LOGIN_ATTEMPTS-getFailedAttempts(username))});
  }
  clearFailedAttempts(username);
  var cfg=getWAConfig();
  var otpEnabled=cfg.phone&&cfg.apikey&&cfg.phone!=="628xxxxxxxxx";
  if(otpEnabled&&user.role!=="demo"){
    var otp=generateOTP();storeOTP(username,otp);
    sendWAMessage(cfg.phone,cfg.apikey,cfg.provider,"🔐 IH Dashboard OTP\nUser: "+user.displayName+"\nKode: "+otp+"\nBerlaku 2 menit");
    logAccessEvent(user.username,"OTP_SENT",user.role,body.deviceInfo||{},"OTP sent");
    return buildResponse({status:"otp_required",username:username,message:"OTP dikirim ke IH Officer."});
  }
  var token=createToken(user);
  logAccessEvent(user.username,"LOGIN_OK",user.role,body.deviceInfo||{},"");
  sendWALoginNotification(user.username,user.role,body.deviceInfo||{});
  return buildResponse({status:"ok",token:token,displayName:user.displayName,role:user.role,expireMs:TOKEN_EXPIRE_MS,message:"Login berhasil"});
}
function handleLogout(body){if(body.token){var tc=validateToken(body.token);if(tc.valid)logAccessEvent(tc.username,"LOGOUT",tc.role,{},"");deleteToken(body.token);}return buildResponse({status:"ok",message:"Logout berhasil"});}

// ── GET DATA ──
function handleGetData(body,tokenCheck){
  if(tokenCheck&&tokenCheck.role==="demo"){
    return buildResponse({status:"ok",demo:true,hra:[],dat:[],pest:[],p3k:[],menu5:[],menu6:[],
      fisika:[],kimia:[],biologi:[],ergonomi:[],psikososial:[],mcu:[],alkes:[],timestamp:new Date().toISOString()});
  }
  var sp=body.sheet||"all"; var payload={};
  try{
    if(sp==="all"||sp==="hra")         payload.hra         =getSheetData(SHEET_CONFIG.hra,null);
    if(sp==="all"||sp==="dat")         payload.dat         =getSheetData(SHEET_CONFIG.dat,null);
    if(sp==="all"||sp==="pest")        payload.pest        =getSheetData(SHEET_CONFIG.pest,PEST_HEADER_MAP);
    if(sp==="all"||sp==="p3k")         payload.p3k         =getSheetData(SHEET_CONFIG.p3k,null);
    if(sp==="all"||sp==="menu5")       payload.menu5       =getSheetData(SHEET_CONFIG.menu5,null);
    if(sp==="all"||sp==="menu6")       payload.menu6       =getSheetData(SHEET_CONFIG.menu6,null);
    if(sp==="all"||sp==="fisika")      payload.fisika      =getSheetData(SHEET_CONFIG.fisika,null);
    if(sp==="all"||sp==="kimia")       payload.kimia       =getSheetData(SHEET_CONFIG.kimia,null);
    if(sp==="all"||sp==="biologi")     payload.biologi     =getSheetData(SHEET_CONFIG.biologi,null);
    if(sp==="all"||sp==="ergonomi")    payload.ergonomi    =getSheetData(SHEET_CONFIG.ergonomi,null);
    if(sp==="all"||sp==="psikososial") payload.psikososial =getSheetData(SHEET_CONFIG.psikososial,null);
    if(sp==="all"||sp==="mcu")         payload.mcu         =getMCUData();
    if(sp==="all"||sp==="alkes"||sp==="menu5") payload.alkes=getAlkesData();
    payload.status="ok"; payload.timestamp=new Date().toISOString();
    return buildResponse(payload);
  }catch(err){return buildResponse({status:"error",message:err.toString()});}
}

// ── BIOMONITORING ──
function handleBiomonitoring(body,tokenCheck){
  try{
    var ss=SpreadsheetApp.getActiveSpreadsheet();
    function readSheet(name){
      var sh=ss.getSheetByName(name); if(!sh)return[];
      var d=sh.getDataRange().getValues(); var hdrs=d[0].map(function(h){return String(h).trim();});
      var rows=[]; var tz=Session.getScriptTimeZone();
      for(var i=1;i<d.length;i++){
        var row=d[i]; if(row.every(function(c){return c===""||c===null||c===undefined;}))continue;
        var obj={};
        for(var j=0;j<hdrs.length;j++){var v=row[j];if(v instanceof Date)v=Utilities.formatDate(v,tz,"yyyy");obj[hdrs[j]]=v;}
        rows.push(obj);
      }
      return rows;
    }
    var bio=readSheet(SHEET_CONFIG.biomarker); var per=readSheet(SHEET_CONFIG.personal);
    return buildResponse({status:"ok",data:{biomarker:bio,personal:per},count:{biomarker:bio.length,personal:per.length}});
  }catch(err){return buildResponse({status:"error",message:"Biomonitoring error: "+err.toString()});}
}

// ── DRIVE HANDLERS ──
function handleDriveUpload(body,tokenCheck){
  try{
    var module=body.module||"",filename=sanitizeFilename(body.filename||"file");
    var mimeType=body.mimeType||"application/octet-stream",dataBase64=body.dataBase64||"",meta=body.meta||{};
    if(!DRIVE_FOLDERS[module])return buildResponse({status:"error",message:"Module tidak valid: "+module});
    if(!dataBase64)return buildResponse({status:"error",message:"Data file kosong."});
    if(ALLOWED_MIMETYPES.indexOf(mimeType)===-1)return buildResponse({status:"error",message:"Tipe file tidak diizinkan: "+mimeType});
    var maxSize=mimeType==="application/pdf"?MAX_PDF_SIZE:MAX_IMAGE_SIZE;
    if(Math.ceil(dataBase64.length*0.75)>maxSize)return buildResponse({status:"error",message:"File terlalu besar."});
    var folder=getOrCreateDriveFolder(module),decoded=Utilities.base64Decode(dataBase64);
    var blob=Utilities.newBlob(decoded,mimeType,filename),driveFile=folder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    var fileId=driveFile.getId();
    var record={id:fileId,module:module,filename:filename,mimeType:mimeType,
      nama:meta.nama||filename,kategori:meta.kategori||"",keterangan:meta.keterangan||"",
      uploadedBy:tokenCheck.username,uploadDate:formatDateId(new Date()),
      uploadTime:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"HH:mm"),
      sizeBytes:driveFile.getSize(),fileUrl:driveFile.getUrl(),
      downloadUrl:"https://drive.google.com/uc?export=download&id="+fileId,
      viewUrl:"https://drive.google.com/file/d/"+fileId+"/view",
      previewUrl:mimeType==="application/pdf"?"https://drive.google.com/file/d/"+fileId+"/preview":"https://drive.google.com/thumbnail?id="+fileId+"&sz=w400",
      downloads:0};
    saveDriveFileMeta(record);
    return buildResponse({status:"ok",message:"Upload berhasil.",fileId:fileId,filename:filename,
      downloadUrl:record.downloadUrl,viewUrl:record.viewUrl,previewUrl:record.previewUrl,record:record});
  }catch(err){return buildResponse({status:"error",message:"Upload gagal: "+err.toString()});}
}
function handleDriveList(body){
  try{
    var module=body.module||"",kategori=body.kategori||"";
    var sheet=getOrCreateSheet(SHEET_CONFIG._driveFiles,DRIVE_FILES_HEADERS);
    var data=sheet.getDataRange().getValues(); if(data.length<2)return buildResponse({status:"ok",files:[],count:0});
    var headers=data[0],results=[],toDelete=[];
    for(var i=1;i<data.length;i++){
      var row=rowToObject(headers,data[i]);
      if(module&&row.module!==module)continue; if(kategori&&row.kategori!==kategori)continue;
      var exists=false;try{DriveApp.getFileById(String(row.id));exists=true;}catch(e){}
      if(exists)results.push(row);else toDelete.push(String(row.id));
    }
    if(toDelete.length>0){var fd=sheet.getDataRange().getValues();for(var j=fd.length-1;j>=1;j--){if(toDelete.indexOf(String(fd[j][0]))!==-1)sheet.deleteRow(j+1);}}
    results.reverse();
    return buildResponse({status:"ok",files:results,count:results.length});
  }catch(err){return buildResponse({status:"error",message:"Gagal list: "+err.toString()});}
}
function handleDriveDelete(body,tokenCheck){
  try{
    var fileId=body.fileId||""; if(!fileId)return buildResponse({status:"error",message:"fileId wajib."});
    try{DriveApp.getFileById(fileId).setTrashed(true);}catch(e){}
    deleteDriveFileMeta(fileId);
    return buildResponse({status:"ok",message:"File dihapus.",deletedBy:tokenCheck?tokenCheck.username:"unknown"});
  }catch(err){return buildResponse({status:"error",message:"Hapus gagal: "+err.toString()});}
}
function handleDriveGetFile(body){
  try{
    var fileId=body.fileId||""; if(!fileId)return buildResponse({status:"error",message:"fileId wajib."});
    var sheet=getOrCreateSheet(SHEET_CONFIG._driveFiles,DRIVE_FILES_HEADERS);
    var data=sheet.getDataRange().getValues(); if(data.length<2)return buildResponse({status:"error",message:"File tidak ditemukan."});
    var headers=data[0],dlCol=headers.indexOf("downloads");
    for(var i=1;i<data.length;i++){
      if(String(data[i][0])===String(fileId)){
        var rec=rowToObject(headers,data[i]);
        if(dlCol>=0)sheet.getRange(i+1,dlCol+1).setValue(Number(rec.downloads||0)+1);
        return buildResponse({status:"ok",file:rec});
      }
    }
    return buildResponse({status:"error",message:"File tidak ditemukan."});
  }catch(err){return buildResponse({status:"error",message:err.toString()});}
}
function handleDriveUpdateMeta(body,tokenCheck){
  try{
    var fileId=body.fileId||"",meta=body.meta||{}; if(!fileId)return buildResponse({status:"error",message:"fileId wajib."});
    var sheet=getOrCreateSheet(SHEET_CONFIG._driveFiles,DRIVE_FILES_HEADERS);
    var data=sheet.getDataRange().getValues(); if(data.length<2)return buildResponse({status:"error",message:"File tidak ditemukan."});
    var headers=data[0];
    for(var i=1;i<data.length;i++){
      if(String(data[i][0])===String(fileId)){
        if(meta.nama!==undefined){var nc=headers.indexOf("nama")+1;if(nc>0)sheet.getRange(i+1,nc).setValue(meta.nama);}
        if(meta.kategori!==undefined){var kc=headers.indexOf("kategori")+1;if(kc>0)sheet.getRange(i+1,kc).setValue(meta.kategori);}
        if(meta.keterangan!==undefined){var kec=headers.indexOf("keterangan")+1;if(kec>0)sheet.getRange(i+1,kec).setValue(meta.keterangan);}
        return buildResponse({status:"ok",message:"Meta diupdate."});
      }
    }
    return buildResponse({status:"error",message:"File tidak ditemukan."});
  }catch(err){return buildResponse({status:"error",message:err.toString()});}
}

// ── DRIVE HELPERS ──
function getDriveRootFolder(){var f=DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);return f.hasNext()?f.next():DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);}
function getOrCreateDriveFolder(module){var root=getDriveRootFolder(),parts=DRIVE_FOLDERS[module].split("/"),cur=root;for(var i=0;i<parts.length;i++){var s=cur.getFoldersByName(parts[i]);cur=s.hasNext()?s.next():cur.createFolder(parts[i]);}return cur;}
function saveDriveFileMeta(r){var sh=getOrCreateSheet(SHEET_CONFIG._driveFiles,DRIVE_FILES_HEADERS);sh.appendRow([r.id,r.module,r.filename,r.mimeType,r.nama,r.kategori,r.keterangan,r.uploadedBy,r.uploadDate,r.uploadTime,r.sizeBytes,r.fileUrl,r.downloadUrl,r.viewUrl,r.previewUrl,r.downloads]);}
function deleteDriveFileMeta(fileId){var sh=getOrCreateSheet(SHEET_CONFIG._driveFiles,DRIVE_FILES_HEADERS),d=sh.getDataRange().getValues();for(var i=d.length-1;i>=1;i--){if(String(d[i][0])===String(fileId)){sh.deleteRow(i+1);return;}}}
function rowToObject(headers,row){var obj={};for(var i=0;i<headers.length;i++)obj[headers[i]]=row[i];return obj;}

// ── TOKENS ──
function generateTokenString(u){var raw=u+"_"+Date.now()+"_"+Math.random()+"_"+getSecretSalt();var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8);return b.map(function(x){return("0"+(x&0xFF).toString(16)).slice(-2);}).join("");}
function createToken(user){var t=generateTokenString(user.username),exp=Date.now()+TOKEN_EXPIRE_MS;var sh=getOrCreateSheet(SHEET_CONFIG._tokens,["token","username","displayName","role","expireAt"]);cleanupUserTokens(user.username,sh);cleanupExpiredTokens(sh);sh.appendRow([t,user.username,user.displayName,user.role,exp]);return t;}
function validateToken(token){if(!token)return{valid:false,reason:"Token tidak ada."};var sh=getOrCreateSheet(SHEET_CONFIG._tokens,["token","username","displayName","role","expireAt"]);var d=sh.getDataRange().getValues();for(var i=1;i<d.length;i++){if(d[i][0]===token){if(Date.now()>Number(d[i][4])){sh.deleteRow(i+1);return{valid:false,reason:"Sesi habis."};}return{valid:true,username:d[i][1],displayName:d[i][2],role:d[i][3]};}}return{valid:false,reason:"Token tidak valid."};}
function deleteToken(t){var sh=getOrCreateSheet(SHEET_CONFIG._tokens,["token","username","displayName","role","expireAt"]);var d=sh.getDataRange().getValues();for(var i=d.length-1;i>=1;i--){if(d[i][0]===t){sh.deleteRow(i+1);break;}}}
function cleanupUserTokens(u,sh){var d=sh.getDataRange().getValues();for(var i=d.length-1;i>=1;i--){if(d[i][1]===u)sh.deleteRow(i+1);}}
function cleanupExpiredTokens(sh){var d=sh.getDataRange().getValues(),now=Date.now();for(var i=d.length-1;i>=1;i--){if(Number(d[i][4])<now)sh.deleteRow(i+1);}}

// ── RATE LIMITING ──
function getFailedAttempts(u){var sh=getOrCreateSheet(SHEET_CONFIG._lockouts,["username","attempts","lastAttempt","lockedUntil"]);var d=sh.getDataRange().getValues();for(var i=1;i<d.length;i++){if(d[i][0]===u)return Number(d[i][1])||0;}return 0;}
function recordFailedAttempt(u){var sh=getOrCreateSheet(SHEET_CONFIG._lockouts,["username","attempts","lastAttempt","lockedUntil"]);var d=sh.getDataRange().getValues(),now=Date.now();for(var i=1;i<d.length;i++){if(d[i][0]===u){var a=Number(d[i][1])+1;sh.getRange(i+1,2,1,3).setValues([[a,now,a>=MAX_LOGIN_ATTEMPTS?now+LOCKOUT_MS:0]]);return;}}sh.appendRow([u,1,now,0]);}
function checkLockout(u){var sh=getOrCreateSheet(SHEET_CONFIG._lockouts,["username","attempts","lastAttempt","lockedUntil"]);var d=sh.getDataRange().getValues(),now=Date.now();for(var i=1;i<d.length;i++){if(d[i][0]===u){var lu=Number(d[i][3]);if(lu>now)return{locked:true,sisaMs:lu-now};return{locked:false};}}return{locked:false};}
function clearFailedAttempts(u){var sh=getOrCreateSheet(SHEET_CONFIG._lockouts,["username","attempts","lastAttempt","lockedUntil"]);var d=sh.getDataRange().getValues();for(var i=d.length-1;i>=1;i--){if(d[i][0]===u){sh.deleteRow(i+1);return;}}}

// ── SHEET DATA READER ──
function getSheetData(sheetName,headerMap){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(sheetName);
  if(!sheet)return[];
  var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow<2||lastCol<1)return[];
  var values=sheet.getRange(1,1,lastRow,lastCol).getValues();
  var headers=values[0].map(function(h){var c=String(h).trim();return headerMap?(headerMap[c.toLowerCase()]||c):c;});
  var BULAN_ID=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  var tz=Session.getScriptTimeZone(),rows=[];
  for(var i=1;i<values.length;i++){
    var row=values[i],isEmpty=true;
    for(var c=0;c<row.length;c++){if(row[c]!==""&&row[c]!==null&&row[c]!==undefined){isEmpty=false;break;}}
    if(isEmpty)continue;
    var obj={};
    for(var j=0;j<headers.length;j++){var val=row[j];if(val instanceof Date)val=Utilities.formatDate(val,tz,"dd/MM/yyyy");obj[headers[j]]=typeof val==="number"?val:String(val===null||val===undefined?"":val).trim();}
    if(headerMap&&(!obj["Bulan"]||obj["Bulan"]==="")){var m=(obj["Tanggal"]||"").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);if(m){var idx=parseInt(m[2],10)-1;if(idx>=0&&idx<12)obj["Bulan"]=BULAN_ID[idx];}}
    rows.push(obj);
  }
  return rows;
}
function getOrCreateSheet(name,headers){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.hideSheet();}return sh;}

// ── HELPERS ──
function sanitizeFilename(f){return f.replace(/[\/\\:*?"<>|]/g,"_").replace(/\s+/g,"_").substring(0,200);}
function formatDateId(d){var b=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];return d.getDate()+" "+b[d.getMonth()]+" "+d.getFullYear();}
function hashPassword(p){var raw=p+getSecretSalt();var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8);return b.map(function(x){return("0"+(x&0xFF).toString(16)).slice(-2);}).join("");}
function buildResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}

// ── ACCESS LOG ──
var ACCESS_LOG_HEADERS=["timestamp","username","role","status","reason","browser","os","deviceType","screenRes","userAgent"];
function logAccessEvent(username,status,role,deviceInfo,reason){try{var sh=getOrCreateSheet(SHEET_CONFIG._accessLog,ACCESS_LOG_HEADERS),now=new Date(),tz=Session.getScriptTimeZone(),ts=Utilities.formatDate(now,tz,"yyyy-MM-dd'T'HH:mm:ss"),ua=deviceInfo.userAgent||"";sh.appendRow([ts,username,role,status,reason||"",parseUA_Browser(ua),parseUA_OS(ua,deviceInfo.platform||""),deviceInfo.deviceType||(isMobileUA(ua)?"Mobile":"Desktop"),deviceInfo.screenRes||"",ua.slice(0,300)]);cleanupOldLogs(sh);}catch(e){}}
function cleanupOldLogs(sh){try{var d=sh.getDataRange().getValues(),c=Date.now()-180*24*60*60*1000;for(var i=d.length-1;i>=1;i--){var t=new Date(d[i][0]).getTime();if(!isNaN(t)&&t<c)sh.deleteRow(i+1);}}catch(e){}}
function parseUA_Browser(ua){if(!ua)return"Unknown";if(/Edg\//i.test(ua))return"Edge";if(/OPR\/|Opera/i.test(ua))return"Opera";if(/Chrome\/\d/i.test(ua)&&!/Chromium/i.test(ua))return"Chrome";if(/Firefox\/\d/i.test(ua))return"Firefox";if(/Safari\/\d/i.test(ua)&&!/Chrome/i.test(ua))return"Safari";if(/MSIE|Trident/i.test(ua))return"IE";if(/SamsungBrowser/i.test(ua))return"Samsung";return"Other";}
function parseUA_OS(ua,platform){if(!ua)return platform||"Unknown";if(/Windows NT/i.test(ua))return"Windows";if(/Android/i.test(ua))return"Android";if(/iPhone|iPad|iPod/i.test(ua))return"iOS";if(/Macintosh|Mac OS X/i.test(ua))return"macOS";if(/Linux/i.test(ua))return"Linux";if(/CrOS/i.test(ua))return"ChromeOS";return platform||"Unknown";}
function isMobileUA(ua){return/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);}
function handleGetAccessLog(body,tokenCheck){if(tokenCheck.role!=="admin")return buildResponse({status:"forbidden",message:"Hanya Admin."});try{var sh=getOrCreateSheet(SHEET_CONFIG._accessLog,ACCESS_LOG_HEADERS);var d=sh.getDataRange().getValues();if(d.length<2)return buildResponse({status:"ok",logs:[],count:0});var headers=d[0],days=parseInt(body.days||30),cutoff=days>0?Date.now()-days*24*60*60*1000:0,logs=[];for(var i=1;i<d.length;i++){var row=rowToObject(headers,d[i]);if(days>0&&new Date(row.timestamp||0).getTime()<cutoff)continue;delete row.userAgent;logs.push(row);}logs.sort(function(a,b){return new Date(b.timestamp||0)-new Date(a.timestamp||0);});return buildResponse({status:"ok",logs:logs,count:logs.length});}catch(err){return buildResponse({status:"error",message:err.toString()});}}

// ── OTP ──
function generateOTP(){return String(Math.floor(100000+Math.random()*900000));}
function storeOTP(u,otp){PropertiesService.getScriptProperties().setProperty("OTP_"+u.toUpperCase(),JSON.stringify({otp:otp,expires:Date.now()+2*60*1000}));}
function verifyOTPCode(u,inp){var props=PropertiesService.getScriptProperties(),raw=props.getProperty("OTP_"+u.toUpperCase());if(!raw)return{valid:false,reason:"OTP tidak ditemukan."};try{var data=JSON.parse(raw);if(Date.now()>data.expires){props.deleteProperty("OTP_"+u.toUpperCase());return{valid:false,reason:"OTP kedaluwarsa."};}if(String(inp).trim()!==String(data.otp))return{valid:false,reason:"Kode OTP salah."};props.deleteProperty("OTP_"+u.toUpperCase());return{valid:true};}catch(e){return{valid:false,reason:"Error OTP."};};}
function handleVerifyOTP(body){var u=(body.username||"").trim().toLowerCase(),inp=(body.otp||"").trim();if(!u||!inp)return buildResponse({status:"error",message:"Username dan OTP wajib."});var user=null;for(var i=0;i<USER_LIST.length;i++){if(USER_LIST[i].username.toLowerCase()===u){user=USER_LIST[i];break;}}if(!user)return buildResponse({status:"error",message:"User tidak ditemukan."});var chk=verifyOTPCode(u,inp);if(!chk.valid){logAccessEvent(u,"OTP_FAIL",user.role,body.deviceInfo||{},chk.reason);return buildResponse({status:"error",message:chk.reason});}var token=createToken(user);logAccessEvent(user.username,"LOGIN_OK",user.role,body.deviceInfo||{},"OTP verified");sendWALoginNotification(user.username,user.role,body.deviceInfo||{});return buildResponse({status:"ok",token:token,displayName:user.displayName,role:user.role,expireMs:TOKEN_EXPIRE_MS,message:"Login berhasil"});}

// ── WHATSAPP ──
function setupCallMeBot(){var p=PropertiesService.getScriptProperties();p.setProperty("WA_PHONE","628xxxxxxxxx");p.setProperty("WA_APIKEY","xxxxxxxx");p.setProperty("WA_PROVIDER","callmebot");}
function setupFonnte(){var p=PropertiesService.getScriptProperties();p.setProperty("WA_PHONE","628xxxxxxxxx");p.setProperty("WA_APIKEY","xxxxxxxxxxxx");p.setProperty("WA_PROVIDER","fonnte");}
function setupWAConfig(){setupCallMeBot();}
function getWAConfig(){var p=PropertiesService.getScriptProperties();return{phone:p.getProperty("WA_PHONE")||"",apikey:p.getProperty("WA_APIKEY")||"",provider:p.getProperty("WA_PROVIDER")||"callmebot"};}
function sendWAMessage(phone,apikey,provider,message){try{if(provider==="fonnte")sendFonnte(phone,apikey,message);else sendCallMeBot(phone,apikey,message);}catch(e){Logger.log("WA error: "+e.toString());}}
function sendCallMeBot(phone,apikey,message){var url="https://api.callmebot.com/whatsapp.php?phone="+encodeURIComponent(phone)+"&text="+encodeURIComponent(message)+"&apikey="+encodeURIComponent(apikey);UrlFetchApp.fetch(url,{method:"get",muteHttpExceptions:true});}
function sendFonnte(phone,token,message){UrlFetchApp.fetch("https://api.fonnte.com/send",{method:"post",muteHttpExceptions:true,headers:{"Authorization":token},payload:{"target":phone,"message":message,"delay":"1"}});}
function sendWALoginNotification(username,role,deviceInfo){try{var cfg=getWAConfig();if(!cfg.phone||cfg.phone==="628xxxxxxxxx")return;var now=new Date(),tz=Session.getScriptTimeZone(),ua=(deviceInfo&&deviceInfo.userAgent)||"";var msg="🔔 IH Dashboard — Login\n👤 "+username+" ("+role+")\n✅ Login OK\n📅 "+Utilities.formatDate(now,tz,"dd/MM/yyyy HH:mm:ss")+"\n🌐 "+parseUA_Browser(ua)+" / "+parseUA_OS(ua,(deviceInfo&&deviceInfo.platform)||"");sendWAMessage(cfg.phone,cfg.apikey,cfg.provider,msg);}catch(e){}}

// ============================================================
// MEDICAL SURVEILLANCE — MCU PELAUT (v5.2)
// ============================================================
var MCU_AUDIO_THRESHOLD={normal:25,ringan:40,sedang:55,berat:70};
var MCU_SPIRO_THRESHOLD={fvc:80,fev1:80,rasio:70};
var MCU_HEMO_RANGE={L:{hb:[13.5,17.5],hkt:[40,52],eri:[4.5,5.9]},P:{hb:[12.0,15.5],hkt:[36,48],eri:[4.0,5.2]},both:{leu:[4500,11000],trom:[150000,400000],mcv:[80,100],mch:[27,33],mchc:[32,36]}};

function classifyAudio(vals){var max=Math.max.apply(null,vals.map(function(v){return parseFloat(v)||0;}));if(max<=MCU_AUDIO_THRESHOLD.normal)return"Normal";if(max<=MCU_AUDIO_THRESHOLD.ringan)return"Ringan";if(max<=MCU_AUDIO_THRESHOLD.sedang)return"Sedang";if(max<=MCU_AUDIO_THRESHOLD.berat)return"Berat";return"Sangat Berat";}
function classifySpiro(fvcPct,fev1Pct,rasio){var fvc=parseFloat(fvcPct)||0,r=parseFloat(rasio)||0;if(fvc===0)return"—";if(fvc>=MCU_SPIRO_THRESHOLD.fvc&&r>=MCU_SPIRO_THRESHOLD.rasio)return"Normal";if(fvc>=MCU_SPIRO_THRESHOLD.fvc&&r<MCU_SPIRO_THRESHOLD.rasio)return"Obstruktif";if(fvc<MCU_SPIRO_THRESHOLD.fvc&&r>=MCU_SPIRO_THRESHOLD.rasio)return"Restriktif";return"Mixed";}
function classifyHemo(obj,jk){var g=(jk||"L").toUpperCase()==="P"?"P":"L",range=MCU_HEMO_RANGE[g],both=MCU_HEMO_RANGE.both,flags=[];function chk(l,v,lo,hi){var n=parseFloat(v);if(isNaN(n)||n===0)return;if(n<lo)flags.push(l+" rendah");if(n>hi)flags.push(l+" tinggi");}chk("Hb",obj["Hb (g/dL)"],range.hb[0],range.hb[1]);chk("Leukosit",obj["Leukosit (/µL)"],both.leu[0],both.leu[1]);chk("Trombosit",obj["Trombosit (/µL)"],both.trom[0],both.trom[1]);chk("Hematokrit",obj["Hematokrit (%)"],range.hkt[0],range.hkt[1]);chk("Eritrosit",obj["Eritrosit (jt/µL)"],range.eri[0],range.eri[1]);chk("MCV",obj["MCV (fL)"],both.mcv[0],both.mcv[1]);chk("MCH",obj["MCH (pg)"],both.mch[0],both.mch[1]);chk("MCHC",obj["MCHC (g/dL)"],both.mchc[0],both.mchc[1]);return{status:flags.length===0?"NORMAL":"ABNORMAL",flags:flags,flagCount:flags.length};}
function calcIMT(tb,bb){var h=parseFloat(tb)/100,w=parseFloat(bb);if(!h||!w||h===0)return{imt:null,kategori:"—"};var imt=w/(h*h);return{imt:Math.round(imt*10)/10,kategori:imt<18.5?"Underweight":imt<25?"Normal":imt<30?"Overweight":"Obese"};}
function calcSpiroPct(a,p){var av=parseFloat(a),pv=parseFloat(p);if(!pv||pv===0)return null;return Math.round((av/pv)*1000)/10;}
function classifyVisus(od,os,bw){var b=(bw||"").toLowerCase();if(b==="total")return"TIDAK LAYAK";function belowMin(v){var s=String(v||"").trim();if(!s||s==="6/6"||s==="20/20"||s==="")return false;var m=s.match(/^(\d+)\/(\d+)$/);if(!m)return false;return(parseInt(m[1])/parseInt(m[2]))<(6/9);}if(belowMin(od)||belowMin(os))return"PERHATIAN";if(b==="parsial")return"PERHATIAN";return"NORMAL";}

function getMCUData(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEET_CONFIG.mcu);
  if(!sheet)return[];
  var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow<3||lastCol<1)return[];
  /* Deteksi header row: cari baris yang mengandung "NIP" */
  var peek=sheet.getRange(1,1,Math.min(lastRow,5),lastCol).getValues();
  var headerRowIdx=1;
  outer: for(var h=0;h<peek.length;h++){for(var hc=0;hc<peek[h].length;hc++){if(String(peek[h][hc]).toLowerCase().indexOf("nip")!==-1){headerRowIdx=h;break outer;}}}
  var allData=sheet.getRange(1,1,lastRow,lastCol).getValues();
  var headers=allData[headerRowIdx].map(function(h){return String(h).trim();});
  var tz=Session.getScriptTimeZone(),rows=[];
  for(var i=headerRowIdx+1;i<allData.length;i++){
    var row=allData[i];
    if(row.every(function(c){return c===""||c===null||c===undefined;}))continue;
    var obj={};
    for(var j=0;j<headers.length;j++){var val=row[j];if(val instanceof Date)val=Utilities.formatDate(val,tz,"dd/MM/yyyy");obj[headers[j]]=typeof val==="number"?val:String(val===null||val===undefined?"":val).trim();}
    var nip=obj["NIP / ID Pelaut"]||obj["NIP"]||""; if(!nip)continue;
    var jk=(obj["Jenis Kelamin"]||"L").toUpperCase();
    /* IMT */
    var imtR=calcIMT(obj["Tinggi Badan (cm)"],obj["Berat Badan (kg)"]);obj._imt=imtR.imt;obj._katIMT=imtR.kategori;
    /* Audiometri — graceful fallback jika kolom Hz tidak ada */
    var kaVals=["Ka 500 Hz","Ka 1000 Hz","Ka 2000 Hz","Ka 3000 Hz","Ka 4000 Hz","Ka 6000 Hz","Ka 8000 Hz"].map(function(k){return parseFloat(obj[k])||0;});
    var kiVals=["Ki 500 Hz","Ki 1000 Hz","Ki 2000 Hz","Ki 3000 Hz","Ki 4000 Hz","Ki 6000 Hz","Ki 8000 Hz"].map(function(k){return parseFloat(obj[k])||0;});
    var audioManual=obj["Klasifikasi Audio"]||obj["Klasifikasi Audiometri"]||"";
    obj._audioKanan = kaVals.some(function(v){return v>0;})?classifyAudio(kaVals):(audioManual||"—");
    obj._audioKiri  = kiVals.some(function(v){return v>0;})?classifyAudio(kiVals):(audioManual||"—");
    obj._audioMaxKanan=Math.max.apply(null,kaVals);obj._audioMaxKiri=Math.max.apply(null,kiVals);
    obj._audioKlasif=(obj._audioKanan!=="Normal"&&obj._audioKanan!=="—")||(obj._audioKiri!=="Normal"&&obj._audioKiri!=="—")?"NIHL":(audioManual||"Normal");
    /* Spirometri — graceful fallback */
    var fvcPct=calcSpiroPct(obj["FVC Aktual (L)"],obj["FVC Predicted (L)"]);
    var fev1Pct=calcSpiroPct(obj["FEV1 Aktual (L)"],obj["FEV1 Predicted (L)"]);
    var rasioVal=parseFloat(obj["FEV1/FVC (%)"])||0;
    obj._fvcPct=fvcPct;obj._fev1Pct=fev1Pct;
    /* Fallback ke kolom klasifikasi manual jika kolom predicted tidak ada */
    var spiroManual=obj["Klasifikasi Spiro"]||obj["Pola Spirometri"]||"";
    obj._spiro=(fvcPct!==null)?classifySpiro(fvcPct,fev1Pct,rasioVal):(spiroManual||"—");
    /* Hematologi — graceful fallback */
    var hemoR=classifyHemo(obj,jk);
    obj._hemoStatus=hemoR.status;obj._hemoFlags=hemoR.flags;obj._hemoFlagCount=hemoR.flagCount;
    /* Fallback hemo ke kolom manual */
    if(hemoR.flagCount===0&&obj._hemoStatus==="NORMAL"){var hManual=obj["Klasifikasi Hemo"]||obj["Status Hematologi"]||"";if(hManual)obj._hemoStatus=hManual.toUpperCase().includes("ABNORMAL")?"ABNORMAL":"NORMAL";}
    /* Visus */
    obj._visusStatus=classifyVisus(obj["OD Dgn Koreksi"]||obj["OD Tanpa Koreksi"],obj["OS Dgn Koreksi"]||obj["OS Tanpa Koreksi"],obj["Buta Warna"]);
    var visManual=obj["Klasifikasi Visus"]||"";if(obj._visusStatus==="NORMAL"&&visManual)obj._visusStatus=visManual.toUpperCase().includes("TIDAK")?"TIDAK LAYAK":visManual.toUpperCase().includes("PERHATIAN")?"PERHATIAN":"NORMAL";
    /* Risk score — prioritas ke Hasil Umum jika tersedia */
    var hu=(obj["Hasil Umum"]||"").toUpperCase();
    var rs=0;
    if(hu==="UNFIT")rs+=4;else if(hu==="FIT BERSYARAT")rs+=2;
    if(obj._audioKlasif==="NIHL")rs+=2;
    if(obj._audioKanan==="Berat"||obj._audioKiri==="Berat"||obj._audioKanan==="Sangat Berat"||obj._audioKiri==="Sangat Berat")rs+=2;
    if(obj._spiro!=="Normal"&&obj._spiro!=="—")rs+=2;
    if(obj._hemoStatus==="ABNORMAL")rs+=1;
    if(obj._visusStatus==="TIDAK LAYAK")rs+=2;else if(obj._visusStatus==="PERHATIAN")rs+=1;
    obj._riskScore=rs;obj._riskLevel=rs===0?"RENDAH":rs<=2?"SEDANG":rs<=4?"TINGGI":"KRITIS";
    rows.push(obj);
  }
  return rows;
}

function handleMCUSurveillance(body,tokenCheck){
  try{
    var data=getMCUData(),fleet=body.fleet||"",kapal=body.kapal||"",tahun=body.tahun||"",hasil=body.hasil||"";
    var filtered=data.filter(function(r){
      if(fleet&&(r["Jenis Fleet"]||"")!==fleet)return false;
      if(kapal&&(r["Nama Kapal"]||"")!==kapal)return false;
      if(tahun&&String(r["Tahun MCU"]||"")!==String(tahun))return false;
      if(hasil&&(r["Hasil Umum"]||"").toUpperCase()!==hasil.toUpperCase())return false;
      return true;
    });
    if(tokenCheck&&tokenCheck.role==="demo")return buildResponse({status:"ok",demo:true,mcu:[],summary:buildMCUSummary(filtered),count:filtered.length});
    return buildResponse({status:"ok",mcu:filtered,summary:buildMCUSummary(filtered),count:filtered.length});
  }catch(err){return buildResponse({status:"error",message:"MCU error: "+err.toString()});}
}

function buildMCUSummary(data){
  var s={totalABK:0,fit:0,fitBersyarat:0,unfit:0,fitPct:"0.0",audio:{normal:0,gangguan:0,nihl:0},spiro:{normal:0,obstruktif:0,restriktif:0,mixed:0,belumAda:0},hemo:{normal:0,abnormal:0},visus:{normal:0,perhatian:0,tidakLayak:0},risk:{rendah:0,sedang:0,tinggi:0,kritis:0},perFleet:{},perKapal:{},perJabatan:{},perTahun:{}};
  if(!data||!data.length)return s;
  s.totalABK=data.length;
  data.forEach(function(r){
    var hu=(r["Hasil Umum"]||"").toUpperCase(),pola=r._spiro||"—",rl=(r._riskLevel||"RENDAH").toLowerCase();
    if(hu==="FIT")s.fit++;else if(hu==="FIT BERSYARAT")s.fitBersyarat++;else if(hu==="UNFIT")s.unfit++;
    if(r._audioKlasif==="NIHL"){s.audio.gangguan++;s.audio.nihl++;}else s.audio.normal++;
    if(pola==="Normal")s.spiro.normal++;else if(pola==="Obstruktif")s.spiro.obstruktif++;else if(pola==="Restriktif")s.spiro.restriktif++;else if(pola==="Mixed")s.spiro.mixed++;else s.spiro.belumAda++;
    if(r._hemoStatus==="NORMAL")s.hemo.normal++;else s.hemo.abnormal++;
    if(r._visusStatus==="NORMAL")s.visus.normal++;else if(r._visusStatus==="PERHATIAN")s.visus.perhatian++;else s.visus.tidakLayak++;
    if(s.risk[rl]!==undefined)s.risk[rl]++;
    var fl=r["Jenis Fleet"]||"—";if(!s.perFleet[fl])s.perFleet[fl]={total:0,fit:0,unfit:0,nihl:0};s.perFleet[fl].total++;if(hu==="FIT")s.perFleet[fl].fit++;if(hu==="UNFIT")s.perFleet[fl].unfit++;if(r._audioKlasif==="NIHL")s.perFleet[fl].nihl++;
    var kp=r["Nama Kapal"]||"—";if(!s.perKapal[kp])s.perKapal[kp]={total:0,fit:0,unfit:0};s.perKapal[kp].total++;if(hu==="FIT")s.perKapal[kp].fit++;if(hu==="UNFIT")s.perKapal[kp].unfit++;
    var th=String(r["Tahun MCU"]||"—");if(!s.perTahun[th])s.perTahun[th]={total:0,fit:0,fitBersyarat:0,unfit:0};s.perTahun[th].total++;if(hu==="FIT")s.perTahun[th].fit++;if(hu==="FIT BERSYARAT")s.perTahun[th].fitBersyarat++;if(hu==="UNFIT")s.perTahun[th].unfit++;
  });
  s.fitPct=((s.fit/s.totalABK)*100).toFixed(1);
  return s;
}

// ============================================================
// SEBARAN ALKES KAPAL (v5.2) — sync dengan script.js
// ============================================================
function getAlkesData(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEET_CONFIG.alkes);
  if(!sheet)return[];
  var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow<2||lastCol<1)return[];

  /* Struktur baru: Row 1 = header langsung (NAMA KAPAL, FLEET, Aed, ...) */
  /* Deteksi header row: cari baris yang ada "kapal" atau "fleet" */
  var peek=sheet.getRange(1,1,Math.min(lastRow,5),lastCol).getValues();
  var headerRowIdx=0;
  for(var h=0;h<peek.length;h++){
    var rowStr=peek[h].map(function(c){return String(c||"").toLowerCase();}).join("|");
    if((rowStr.includes("nama")||rowStr.includes("kapal"))&&rowStr.includes("aed")){headerRowIdx=h;break;}
    if(rowStr.includes("fleet")&&(rowStr.includes("kapal")||rowStr.includes("tandu"))){headerRowIdx=h;break;}
  }

  var allData=sheet.getRange(1,1,lastRow,lastCol).getValues();
  var rawHdrs=allData[headerRowIdx];
  var headers=rawHdrs.map(function(h,idx){var s=String(h).trim();return(s===""&&idx===0)?"NAMA KAPAL":s;});

  /* 8 alkes wajib */
  var ALKES_WAJIB=["Aed","Tandu Biasa","Basket Stretcher","Long Spinal Board","Tabung Oksigen","Body Thermometer","Blood Pressure Monitor","Spirometry"];
  /* Map kolom alkes (case-insensitive) */
  var alkesMap=ALKES_WAJIB.map(function(wajib){
    var wl=wajib.toLowerCase().trim();
    var found=null;
    for(var i=0;i<headers.length;i++){if(headers[i].toLowerCase().trim()===wl){found=headers[i];break;}}
    return{wajib:wajib,key:found};
  });
  /* Cari kolom Expired Date AED */
  var expiredKey=null;
  for(var ei=0;ei<headers.length;ei++){if(headers[ei].toLowerCase().includes("expired")){expiredKey=headers[ei];break;}}

  var tz=Session.getScriptTimeZone(),rows=[];
  for(var i=headerRowIdx+1;i<allData.length;i++){
    var row=allData[i];
    if(row.every(function(c){return c===""||c===null||c===undefined;}))continue;
    var obj={};
    for(var j=0;j<headers.length;j++){
      var val=row[j];
      if(val instanceof Date)val=Utilities.formatDate(val,tz,"dd/MM/yyyy");
      obj[headers[j]]=typeof val==="number"?val:String(val===null||val===undefined?"":val).trim();
    }
    /* Normalisasi nama kapal */
    var namaKapal=obj["NAMA KAPAL"]||obj["Nama Kapal"]||obj["nama kapal"]||obj["Kapal"]||obj["KAPAL"]||"";
    if(!namaKapal)continue;
    /* Normalisasi fleet */
    var fleet=obj["FLEET"]||obj["Fleet"]||obj["fleet"]||"";

    /* Kalkulasi kelengkapan — HANYA "ADA" yang dihitung */
    var adaCount=0,belumCount=0,kosongCount=0;
    alkesMap.forEach(function(item){
      if(!item.key){kosongCount++;return;}
      var v=String(obj[item.key]||"").toUpperCase().trim();
      if(v==="ADA")adaCount++;
      else if(v==="BELUM ADA")belumCount++;
      else kosongCount++;
    });

    /* Detail per item — untuk cards di dashboard */
    var alkesDetail=alkesMap.map(function(item){
      var v=item.key?String(obj[item.key]||"").toUpperCase().trim():"";
      return{nama:item.wajib,status:v==="ADA"?"ADA":v==="BELUM ADA"?"BELUM ADA":"KOSONG"};
    });

    /* Cek AED expired */
    var expiredDate="",isExpired=false;
    if(expiredKey&&obj[expiredKey]&&String(obj[expiredKey]).trim()!==""){
      expiredDate=String(obj[expiredKey]).trim();
      /* Parse tanggal — format dd/MM/yyyy */
      var dp=expiredDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(dp){var expDt=new Date(parseInt(dp[3]),parseInt(dp[2])-1,parseInt(dp[1]));if(expDt<new Date())isExpired=true;}
    }
    var alkesExpired=isExpired?[{item:"AED",tgl:expiredDate}]:[];

    var totalWajib=ALKES_WAJIB.length; /* 8 */
    var kelengkapanPct=Math.round((adaCount/totalWajib)*100);

    /* Status */
    var status;
    if(isExpired&&adaCount<totalWajib)status="EXPIRED";
    else if(isExpired)status="EXPIRED";
    else if(adaCount===totalWajib)status="LENGKAP";
    else if(adaCount>0)status="PARSIAL";
    else status="TIDAK LENGKAP";

    /* Set field yang dibutuhkan script.js */
    obj["Nama Kapal"] = namaKapal;   /* normalisasi */
    obj["Fleet"]      = fleet;        /* normalisasi */
    obj._kapal        = namaKapal;
    obj._fleet        = fleet;
    obj._status       = status;
    obj._kelengkapanPct = kelengkapanPct;
    obj._alkesDetail  = alkesDetail;
    obj._alkesExpired = alkesExpired;
    obj._expiredAED   = isExpired;
    obj._alkesAda     = adaCount;
    obj._alkesBelum   = belumCount+kosongCount;
    obj._alkesTotal   = totalWajib;

    rows.push(obj);
  }
  return rows;
}

// ── TEST FUNCTIONS ──
function initPasswordHashes_run(){initPasswordHashes();}
function testLogin(){Logger.log(handleLogin({username:"ihpis2026",password:"Samirah2026"}).getContent());}
function debugSheetNames(){SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function(s,i){Logger.log((i+1)+'. "'+s.getName()+'"');});}
function resetSemuaLockout(){var sh=getOrCreateSheet(SHEET_CONFIG._lockouts,["username","attempts","lastAttempt","lockedUntil"]),lr=sh.getLastRow();if(lr>1)sh.deleteRows(2,lr-1);Logger.log("Semua lockout direset.");}

function testMCU(){
  Logger.log("=== TEST MCU PELAUT v5.2 ===");
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEET_CONFIG.mcu);
  if(!sheet){Logger.log("❌ Sheet '"+SHEET_CONFIG.mcu+"' tidak ditemukan!");ss.getSheets().forEach(function(s){Logger.log("  → "+s.getName());});return;}
  var data=getMCUData();
  Logger.log("✅ Data: "+data.length+" ABK");
  if(data.length>0){var r=data[0];Logger.log("Nama: "+(r["Nama Lengkap"]||"—")+" | Kapal: "+(r["Nama Kapal"]||"—")+" | Hasil: "+(r["Hasil Umum"]||"—"));Logger.log("Audio Ka: "+r._audioKanan+" Ki: "+r._audioKiri+" | Klasif: "+r._audioKlasif);Logger.log("Spiro: "+r._spiro+" | Hemo: "+r._hemoStatus+" | Visus: "+r._visusStatus);Logger.log("Risk: "+r._riskLevel+" (score "+r._riskScore+")");}
  var s=buildMCUSummary(data);
  Logger.log("FIT: "+s.fit+" | FIT BERSYARAT: "+s.fitBersyarat+" | UNFIT: "+s.unfit+" | NIHL: "+s.audio.nihl);
  Logger.log("=== SELESAI ===");
}

function testAlkes(){
  Logger.log("=== TEST SEBARAN ALKES v5.2 ===");
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEET_CONFIG.alkes);
  if(!sheet){Logger.log("❌ Sheet '"+SHEET_CONFIG.alkes+"' tidak ditemukan!");return;}
  var data=getAlkesData();
  Logger.log("✅ Data: "+data.length+" kapal");
  if(data.length>0){
    data.slice(0,3).forEach(function(r){
      Logger.log("Kapal: "+r._kapal+" | Fleet: "+r._fleet+" | Status: "+r._status+" | Pct: "+r._kelengkapanPct+"%");
      Logger.log("  ADA="+r._alkesAda+" BELUM/KOSONG="+r._alkesBelum+" EXPIRED="+r._alkesExpired.length);
      if(r._alkesDetail)r._alkesDetail.forEach(function(d){Logger.log("  "+(d.status==="ADA"?"✅":"❌")+" "+d.nama+": "+d.status);});
      Logger.log("---");
    });
  }
  var cL=data.filter(function(r){return r._status==="LENGKAP";}).length;
  var cP=data.filter(function(r){return r._status==="PARSIAL";}).length;
  var cT=data.filter(function(r){return r._status==="TIDAK LENGKAP";}).length;
  var cE=data.filter(function(r){return r._status==="EXPIRED";}).length;
  Logger.log("LENGKAP="+cL+" PARSIAL="+cP+" TIDAK LENGKAP="+cT+" EXPIRED="+cE);
  Logger.log("=== SELESAI ===");
}

function testBiomonitoring(){Logger.log("=== TEST BIOMONITORING ===");var lr=JSON.parse(handleLogin({username:"ihpis2026",password:"Samirah2026"}).getContent());if(lr.status!=="ok"){Logger.log("Login gagal: "+lr.message);return;}var r=JSON.parse(handleBiomonitoring({token:lr.token},{role:"admin"}).getContent());if(r.status==="ok"){Logger.log("✅ Biomarker: "+r.count.biomarker+" | Personal: "+r.count.personal);}else Logger.log("❌ "+r.message);}
function testWAKirim(){var cfg=getWAConfig();if(!cfg.phone||cfg.phone==="628xxxxxxxxx"){Logger.log("❌ Nomor WA belum diisi.");return;}sendWAMessage(cfg.phone,cfg.apikey,cfg.provider,"✅ Test WA OK — "+cfg.provider);}
