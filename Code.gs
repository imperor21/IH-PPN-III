/**
 * ============================================================
 *  HSE Marine Dashboard — Google Apps Script
 *  File: Code.gs  |  v3.0 SECURE
 *
 *  PERUBAHAN v3.0:
 *  ✅ Login sekarang di SERVER (bukan di browser)
 *  ✅ Password tidak ada lagi di script.js
 *  ✅ Setiap request data wajib bawa TOKEN
 *  ✅ Token otomatis expired setelah 8 jam
 *  ✅ Rate limiting: kunci 15 menit setelah 5x salah
 *
 *  CARA DEPLOY:
 *  1. Buka Google Sheets → Extensions → Apps Script
 *  2. Paste seluruh kode ini (ganti yang lama)
 *  3. Klik Deploy → New Deployment → Web App
 *  4. Execute as: Me
 *  5. Who has access: Anyone  ← tetap Anyone (token yang jaga keamanannya)
 *  6. Copy URL deployment → paste ke script.js (API_URL)
 *
 *  CARA GANTI PASSWORD:
 *  Edit bagian DAFTAR USER di bawah ini, lalu re-deploy
 * ============================================================
 */


// ============================================================
// 🔐 DAFTAR USER & PASSWORD — EDIT DI SINI
// Ganti password sesuai kebutuhan
// ============================================================
const USER_LIST = [
  { username: "ppn3",  password: "ppn2026",   displayName: "IH Admin",   role: "admin"  },
  { username: "hsse",  password: "hsseppn3",  displayName: "IH Officer", role: "viewer" },
];

// ============================================================
// ⚙️  KONFIGURASI KEAMANAN
// ============================================================
const TOKEN_EXPIRE_MS    = 8 * 60 * 60 * 1000;   // Token expired setelah 8 jam
const MAX_LOGIN_ATTEMPTS = 5;                      // Maks percobaan login salah
const LOCKOUT_MS         = 15 * 60 * 1000;        // Kunci 15 menit setelah melebihi batas
const SECRET_SALT        = "PPNiii_HSSE_2026_!";  // Ganti string ini untuk keamanan lebih

// ============================================================
// ⚙️  KONFIGURASI NAMA SHEET
// ============================================================
const SHEET_CONFIG = {
  hra:   "Data IH",
  dat:   "Data DAT",
  pest:  "Pest & Rodent",
  p3k:   "P3K & AED",
  menu5: "Placeholder 5",
  menu6: "Placeholder 6",
  // Sheet untuk menyimpan token aktif
  _tokens:   "_auth_tokens",
  _lockouts: "_auth_lockouts",
};

// ============================================================
// NORMALISASI HEADER PEST
// ============================================================
const PEST_HEADER_MAP = {
  "lokasi"                            : "Lokasi",
  "location"                          : "Lokasi",
  "tanggal"                           : "Tanggal",
  "tanggal pelaksanaan"               : "Tanggal",
  "date"                              : "Tanggal",
  "bulan"                             : "Bulan",
  "bulan pelaksanaan"                 : "Bulan",
  "month"                             : "Bulan",
  "temuan"                            : "Temuan / Keluhan",
  "temuan / keluhan"                  : "Temuan / Keluhan",
  "temuan/keluhan"                    : "Temuan / Keluhan",
  "temuan/ keluhan"                   : "Temuan / Keluhan",
  "keluhan"                           : "Temuan / Keluhan",
  "finding"                           : "Temuan / Keluhan",
  "tindak lanjut"                     : "Tindak Lanjut",
  "tindak lanjut & rekomendasi"       : "Tindak Lanjut",
  "tindak lanjut dan rekomendasi"     : "Tindak Lanjut",
  "tindaklanjut"                      : "Tindak Lanjut",
  "rekomendasi"                       : "Tindak Lanjut",
  "follow up"                         : "Tindak Lanjut",
  "followup"                          : "Tindak Lanjut",
  "est biaya"                         : "Est Biaya",
  "est. biaya"                        : "Est Biaya",
  "estimasi biaya"                    : "Est Biaya",
  "biaya"                             : "Est Biaya",
  "cost"                              : "Est Biaya",
  "budget"                            : "Est Biaya",
};


// ============================================================
// MAIN HANDLER — semua request masuk ke sini
// ============================================================
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || "";

    if (action === "login") {
      return handleLogin(body);
    }

    if (action === "logout") {
      return handleLogout(body);
    }

    // Semua action lain wajib punya token valid
    const tokenCheck = validateToken(body.token);
    if (!tokenCheck.valid) {
      return buildResponse({ status: "unauthorized", message: tokenCheck.reason });
    }

    if (action === "getData") {
      return handleGetData(body);
    }

    return buildResponse({ status: "error", message: "Action tidak dikenal: " + action });

  } catch (err) {
    return buildResponse({ status: "error", message: "Server error: " + err.toString() });
  }
}

// Tetap ada doGet untuk kompatibilitas (tapi tidak mengembalikan data)
function doGet(e) {
  return buildResponse({
    status: "info",
    message: "IH Dashboard API v3.0 — Gunakan POST request dengan token.",
    timestamp: new Date().toISOString()
  });
}


// ============================================================
// 🔐 LOGIN — verifikasi username & password di server
// ============================================================
function handleLogin(body) {
  const username = (body.username || "").trim().toLowerCase();
  const password = (body.password || "").trim();

  if (!username || !password) {
    return buildResponse({ status: "error", message: "Username dan password wajib diisi." });
  }

  // Cek apakah sedang dikunci (rate limiting)
  const lockout = checkLockout(username);
  if (lockout.locked) {
    const sisaMenit = Math.ceil(lockout.sisaMs / 60000);
    return buildResponse({
      status: "locked",
      message: "Terlalu banyak percobaan gagal. Coba lagi dalam " + sisaMenit + " menit."
    });
  }

  // Cek username & password
  const user = USER_LIST.find(u =>
    u.username.toLowerCase() === username && u.password === password
  );

  if (!user) {
    recordFailedAttempt(username);
    const attempts = getFailedAttempts(username);
    const sisaCoba = MAX_LOGIN_ATTEMPTS - attempts;
    return buildResponse({
      status: "error",
      message: sisaCoba > 0
        ? "Username atau password salah. Sisa percobaan: " + sisaCoba
        : "Akun dikunci. Coba lagi dalam 15 menit."
    });
  }

  // Login berhasil — reset hitungan gagal & buat token
  clearFailedAttempts(username);
  const token = createToken(user);

  return buildResponse({
    status:      "ok",
    token:       token,
    displayName: user.displayName,
    role:        user.role,
    expireMs:    TOKEN_EXPIRE_MS,
    message:     "Login berhasil"
  });
}


// ============================================================
// 🚪 LOGOUT — hapus token dari server
// ============================================================
function handleLogout(body) {
  if (body.token) deleteToken(body.token);
  return buildResponse({ status: "ok", message: "Logout berhasil" });
}


// ============================================================
// 📊 GET DATA — ambil data dari sheet (wajib token valid)
// ============================================================
function handleGetData(body) {
  const sheetParam = body.sheet || "all";
  const payload    = {};

  try {
    if (sheetParam === "all" || sheetParam === "hra")   payload.hra   = getSheetData(SHEET_CONFIG.hra,   null);
    if (sheetParam === "all" || sheetParam === "dat")   payload.dat   = getSheetData(SHEET_CONFIG.dat,   null);
    if (sheetParam === "all" || sheetParam === "pest")  payload.pest  = getSheetData(SHEET_CONFIG.pest,  PEST_HEADER_MAP);
    if (sheetParam === "all" || sheetParam === "p3k")   payload.p3k   = getSheetData(SHEET_CONFIG.p3k,   null);
    if (sheetParam === "all" || sheetParam === "menu5") payload.menu5 = getSheetData(SHEET_CONFIG.menu5, null);
    if (sheetParam === "all" || sheetParam === "menu6") payload.menu6 = getSheetData(SHEET_CONFIG.menu6, null);

    payload.status    = "ok";
    payload.timestamp = new Date().toISOString();

    return buildResponse(payload);
  } catch (err) {
    return buildResponse({ status: "error", message: err.toString() });
  }
}


// ============================================================
// 🎫 TOKEN — buat, cek, hapus token sesi
// Token disimpan di sheet tersembunyi "_auth_tokens"
// ============================================================
function generateTokenString(username) {
  const raw = username + "_" + Date.now() + "_" + Math.random() + "_" + SECRET_SALT;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    raw, Utilities.Charset.UTF_8);
  return bytes.map(b => ("0" + (b & 0xFF).toString(16)).slice(-2)).join("");
}

function createToken(user) {
  const token     = generateTokenString(user.username);
  const expireAt  = Date.now() + TOKEN_EXPIRE_MS;
  const sheet     = getOrCreateSheet(SHEET_CONFIG._tokens, ["token","username","displayName","role","expireAt"]);

  // Hapus token lama milik user ini dulu
  cleanupUserTokens(user.username, sheet);

  // Tulis token baru
  sheet.appendRow([token, user.username, user.displayName, user.role, expireAt]);

  // Bersihkan token expired dari semua user
  cleanupExpiredTokens(sheet);

  return token;
}

function validateToken(token) {
  if (!token) return { valid: false, reason: "Token tidak ada. Silakan login ulang." };

  const sheet = getOrCreateSheet(SHEET_CONFIG._tokens, ["token","username","displayName","role","expireAt"]);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      const expireAt = Number(data[i][4]);
      if (Date.now() > expireAt) {
        // Token expired — hapus
        sheet.deleteRow(i + 1);
        return { valid: false, reason: "Sesi habis. Silakan login ulang." };
      }
      return {
        valid:       true,
        username:    data[i][1],
        displayName: data[i][2],
        role:        data[i][3]
      };
    }
  }
  return { valid: false, reason: "Token tidak valid. Silakan login ulang." };
}

function deleteToken(token) {
  const sheet = getOrCreateSheet(SHEET_CONFIG._tokens, ["token","username","displayName","role","expireAt"]);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === token) { sheet.deleteRow(i + 1); break; }
  }
}

function cleanupUserTokens(username, sheet) {
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === username) sheet.deleteRow(i + 1);
  }
}

function cleanupExpiredTokens(sheet) {
  const data = sheet.getDataRange().getValues();
  const now  = Date.now();
  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][4]) < now) sheet.deleteRow(i + 1);
  }
}


// ============================================================
// 🔒 RATE LIMITING — catat percobaan login gagal
// ============================================================
function getFailedAttempts(username) {
  const sheet = getOrCreateSheet(SHEET_CONFIG._lockouts, ["username","attempts","lastAttempt","lockedUntil"]);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) return Number(data[i][1]) || 0;
  }
  return 0;
}

function recordFailedAttempt(username) {
  const sheet = getOrCreateSheet(SHEET_CONFIG._lockouts, ["username","attempts","lastAttempt","lockedUntil"]);
  const data  = sheet.getDataRange().getValues();
  const now   = Date.now();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      const attempts   = Number(data[i][1]) + 1;
      const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_MS : 0;
      sheet.getRange(i + 1, 2, 1, 3).setValues([[attempts, now, lockedUntil]]);
      return;
    }
  }
  // Belum ada record — buat baru
  sheet.appendRow([username, 1, now, 0]);
}

function checkLockout(username) {
  const sheet = getOrCreateSheet(SHEET_CONFIG._lockouts, ["username","attempts","lastAttempt","lockedUntil"]);
  const data  = sheet.getDataRange().getValues();
  const now   = Date.now();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      const lockedUntil = Number(data[i][3]);
      if (lockedUntil > now) {
        return { locked: true, sisaMs: lockedUntil - now };
      }
      return { locked: false };
    }
  }
  return { locked: false };
}

function clearFailedAttempts(username) {
  const sheet = getOrCreateSheet(SHEET_CONFIG._lockouts, ["username","attempts","lastAttempt","lockedUntil"]);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === username) { sheet.deleteRow(i + 1); return; }
  }
}


// ============================================================
// HELPER: Baca sheet data → array of objects
// ============================================================
function getSheetData(sheetName, headerMap) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values  = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => {
    const clean = String(h).trim();
    if (!headerMap) return clean;
    return headerMap[clean.toLowerCase()] || clean;
  });

  const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni",
                    "Juli","Agustus","September","Oktober","November","Desember"];
  const tz = Session.getScriptTimeZone();
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(c => c === "" || c === null || c === undefined)) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];
      if (val instanceof Date) val = Utilities.formatDate(val, tz, "dd/MM/yyyy");
      obj[header] = (typeof val === "number") ? val
                    : String(val === null || val === undefined ? "" : val).trim();
    });

    // Auto-derive Bulan dari Tanggal jika kosong
    if (headerMap && (!obj["Bulan"] || obj["Bulan"] === "")) {
      const m = (obj["Tanggal"] || "").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const idx = parseInt(m[2], 10) - 1;
        if (idx >= 0 && idx < 12) obj["Bulan"] = BULAN_ID[idx];
      }
    }

    rows.push(obj);
  }
  return rows;
}


// ============================================================
// HELPER: Pastikan sheet auth ada, buat jika belum
// ============================================================
function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Sembunyikan sheet dari tampilan biasa
    sheet.hideSheet();
  }
  return sheet;
}


// ============================================================
// HELPER: JSON response
// ============================================================
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// 🧪 FUNGSI TEST — Jalankan di editor Apps Script untuk debug
// ============================================================

// Test login berhasil
function testLogin() {
  const result = handleLogin({ username: "ppn3", password: "ppn2026" });
  Logger.log("=== TEST LOGIN ===");
  Logger.log(result.getContent());
}

// Test login salah password
function testLoginGagal() {
  const result = handleLogin({ username: "ppn3", password: "salah" });
  Logger.log("=== TEST LOGIN GAGAL ===");
  Logger.log(result.getContent());
}

// Test token valid
function testValidasiToken() {
  // Jalankan testLogin dulu, copy tokennya, paste di sini
  const token = "PASTE_TOKEN_DI_SINI";
  Logger.log("=== TEST VALIDASI TOKEN ===");
  Logger.log(JSON.stringify(validateToken(token)));
}

// Test ambil data dengan token (jalankan setelah testLogin)
function testGetData() {
  Logger.log("=== TEST GET DATA ===");
  // 1. Login dulu untuk dapat token
  const loginResult = JSON.parse(handleLogin({ username: "ppn3", password: "ppn2026" }).getContent());
  Logger.log("Token: " + loginResult.token);

  // 2. Pakai token untuk ambil data
  const dataResult = handleGetData({ sheet: "hra", token: loginResult.token });
  const parsed = JSON.parse(dataResult.getContent());
  Logger.log("Status: " + parsed.status);
  Logger.log("Jumlah baris HRA: " + (parsed.hra ? parsed.hra.length : 0));
}

// Debug header pest
function debugPestHeaders() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG.pest);
  if (!sheet) { Logger.log("Sheet tidak ditemukan: " + SHEET_CONFIG.pest); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("=== NAMA KOLOM ASLI ===");
  headers.forEach((h, i) => {
    const clean      = String(h).trim();
    const normalized = PEST_HEADER_MAP[clean.toLowerCase()] || "(tidak di-mapping)";
    Logger.log("Kolom " + (i+1) + ": \"" + clean + "\" → \"" + normalized + "\"");
  });
}

// Lihat semua token aktif
function lihatTokenAktif() {
  const sheet = getOrCreateSheet(SHEET_CONFIG._tokens, ["token","username","displayName","role","expireAt"]);
  const data  = sheet.getDataRange().getValues();
  Logger.log("=== TOKEN AKTIF ===");
  data.forEach((row, i) => {
    if (i === 0) { Logger.log("HEADER: " + row.join(" | ")); return; }
    const exp = new Date(Number(row[4]));
    Logger.log("User: " + row[1] + " | Expired: " + exp.toLocaleString() + " | Token: " + String(row[0]).slice(0,16) + "...");
  });
}

// Reset semua lockout (jika ada user yang terkunci)
function resetSemuaLockout() {
  const sheet = getOrCreateSheet(SHEET_CONFIG._lockouts, ["username","attempts","lastAttempt","lockedUntil"]);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  Logger.log("Semua lockout sudah direset.");
}
