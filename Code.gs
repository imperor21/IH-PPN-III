/**
 * ============================================================
 *  HSE Marine Dashboard — Google Apps Script
 *  File: Code.gs  |  v2.0 (fixed + Pest & Rodent aktif)
 *
 *  CARA DEPLOY:
 *  1. Buka Google Sheets → Extensions → Apps Script
 *  2. Paste seluruh kode ini (ganti yang lama)
 *  3. Klik Deploy → New Deployment → Web App
 *  4. Execute as: Me | Who has access: Anyone
 *  5. Copy URL deployment → tempel ke script.js (API_URL)
 *
 *  STRUKTUR KOLOM SHEET "Pest & Rodent":
 *  | Lokasi | Tanggal | Bulan | Temuan / Keluhan | Tindak Lanjut | Est Biaya |
 * ============================================================
 */

// ============================================================
// KONFIGURASI — sesuaikan nama sheet jika berbeda
// ============================================================
const SHEET_CONFIG = {
  hra:   "Data IH",
  dat:   "Data DAT",
  pest:  "Pest & Rodent",
  p3k:   "P3K & AED",
  menu5: "Placeholder 5",
  menu6: "Placeholder 6"
};

// ============================================================
// NORMALISASI HEADER PEST
// Mapping fleksibel: header apapun di spreadsheet → nama standar
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
  "tindak lanjut &amp; rekomendasi"   : "Tindak Lanjut",
  "tindak lanjut dan rekomendasi"     : "Tindak Lanjut",
  "tindaklanjut"                      : "Tindak Lanjut",
  "tindak lanjut& rekomendasi"        : "Tindak Lanjut",
  "tindak lanjut &rekomendasi"        : "Tindak Lanjut",
  "tindaklanjut & rekomendasi"        : "Tindak Lanjut",
  "tindaklanjut dan rekomendasi"      : "Tindak Lanjut",
  "rekomendasi"                       : "Tindak Lanjut",
  "follow up"                         : "Tindak Lanjut",
  "followup"                          : "Tindak Lanjut",
  "est biaya"                         : "Est Biaya",
  "est. biaya"                        : "Est Biaya",
  "estimasi biaya"                    : "Est Biaya",
  "biaya"                             : "Est Biaya",
  "cost"                              : "Est Biaya",
  "budget"                            : "Est Biaya"
};

// ============================================================
// MAIN HANDLER
// ============================================================
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const sheet  = params.sheet || "all";

  try {
    const payload = {};

    if (sheet === "all" || sheet === "hra")   payload.hra   = getSheetData(SHEET_CONFIG.hra,   null);
    if (sheet === "all" || sheet === "dat")   payload.dat   = getSheetData(SHEET_CONFIG.dat,   null);
    if (sheet === "all" || sheet === "pest")  payload.pest  = getSheetData(SHEET_CONFIG.pest,  PEST_HEADER_MAP);
    if (sheet === "all" || sheet === "p3k")   payload.p3k   = getSheetData(SHEET_CONFIG.p3k,   null);
    if (sheet === "all" || sheet === "menu5") payload.menu5 = getSheetData(SHEET_CONFIG.menu5, null);
    if (sheet === "all" || sheet === "menu6") payload.menu6 = getSheetData(SHEET_CONFIG.menu6, null);

    payload.status    = "ok";
    payload.timestamp = new Date().toISOString();

    return buildResponse(payload);

  } catch (err) {
    return buildResponse({ status: "error", message: err.toString(), timestamp: new Date().toISOString() });
  }
}

// ============================================================
// HELPER: Baca sheet → array of objects
// headerMap: normalisasi nama kolom (null = pakai nama asli)
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

  const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const tz = Session.getScriptTimeZone();

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(c => c === "" || c === null || c === undefined)) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];
      if (val instanceof Date) {
        // Format tanggal → dd/MM/yyyy
        val = Utilities.formatDate(val, tz, "dd/MM/yyyy");
      }
      obj[header] = (typeof val === "number") ? val : String(val === null || val === undefined ? "" : val).trim();
    });

    // Auto-derive Bulan dari Tanggal jika kolom Bulan kosong (khusus Pest)
    if (headerMap && (!obj["Bulan"] || obj["Bulan"] === "")) {
      const tgl = obj["Tanggal"] || "";
      const m = tgl.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const monthIdx = parseInt(m[2], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) obj["Bulan"] = BULAN_ID[monthIdx];
      }
    }

    rows.push(obj);
  }
  return rows;
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
// TEST — jalankan di editor Apps Script untuk debug
// ============================================================
function testDoGet()   { Logger.log(doGet({ parameter: { sheet: "all"  } }).getContent()); }
function testPestOnly(){ Logger.log(doGet({ parameter: { sheet: "pest" } }).getContent()); }

// ============================================================
// DEBUG HEADERS — jalankan ini jika data tidak muncul di dashboard
// Akan menampilkan nama kolom ASLI dari sheet "Pest & Rodent"
// beserta hasil normalisasinya
// ============================================================
function debugPestHeaders() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG.pest);
  if (!sheet) { Logger.log("Sheet tidak ditemukan: " + SHEET_CONFIG.pest); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("=== NAMA KOLOM ASLI DI SHEET ===");
  headers.forEach((h, i) => {
    const clean = String(h).trim();
    const normalized = PEST_HEADER_MAP[clean.toLowerCase()] || "(tidak di-mapping → pakai nama asli)";
    Logger.log(`Kolom ${i+1}: "${clean}" → "${normalized}"`);
  });
  Logger.log("=== SAMPLE DATA BARIS 2 ===");
  if (sheet.getLastRow() >= 2) {
    const row = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    row.forEach((v, i) => Logger.log(`  [${i+1}] "${v}"`));
  }
}
