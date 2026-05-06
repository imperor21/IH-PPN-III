/**
 * ============================================================
 *  HSE Marine Dashboard — Google Apps Script
 *  File: Code.gs
 *
 *  CARA DEPLOY:
 *  1. Buka Google Sheets → Extensions → Apps Script
 *  2. Paste seluruh kode ini
 *  3. Klik Deploy → New Deployment → Web App
 *  4. Execute as: Me | Who has access: Anyone
 *  5. Copy URL deployment → tempel ke script.js (API_URL)
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
// MAIN HANDLER
// ============================================================
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const sheet  = params.sheet || "all";   // ?sheet=hra  OR  all

  try {
    let payload = {};

    if (sheet === "all" || sheet === "hra") {
      payload.hra = getSheetData(SHEET_CONFIG.hra);
    }
    if (sheet === "all" || sheet === "dat") {
      payload.dat = getSheetData(SHEET_CONFIG.dat);
    }
    if (sheet === "all" || sheet === "pest") {
      payload.pest = getSheetData(SHEET_CONFIG.pest);
    }
    if (sheet === "all" || sheet === "p3k") {
      payload.p3k = getSheetData(SHEET_CONFIG.p3k);
    }
    if (sheet === "all" || sheet === "menu5") {
      payload.menu5 = getSheetData(SHEET_CONFIG.menu5);
    }
    if (sheet === "all" || sheet === "menu6") {
      payload.menu6 = getSheetData(SHEET_CONFIG.menu6);
    }

    payload.status    = "ok";
    payload.timestamp = new Date().toISOString();

    return buildResponse(payload);

  } catch (err) {
    return buildResponse({
      status: "error",
      message: err.toString(),
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================
// HELPER: Baca sheet dan konversi ke array of objects
// ============================================================
function getSheetData(sheetName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return [];  // Sheet tidak ada → kembalikan array kosong
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) return [];  // Hanya header atau kosong

  const range   = sheet.getRange(1, 1, lastRow, lastCol);
  const values  = range.getValues();
  const headers = values[0].map(h => String(h).trim());

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    // Skip baris kosong (semua kolom kosong)
    const isEmpty = row.every(cell => cell === "" || cell === null || cell === undefined);
    if (isEmpty) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];

      // Format tanggal jika Date object
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy");
      }

      // Konversi angka agar tetap number
      if (typeof val === "number") {
        obj[header] = val;
      } else {
        obj[header] = String(val === null || val === undefined ? "" : val).trim();
      }
    });

    rows.push(obj);
  }

  return rows;
}

// ============================================================
// HELPER: Build JSON response dengan CORS headers
// ============================================================
function buildResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================
// TEST FUNCTION — jalankan manual untuk debug
// ============================================================
function testDoGet() {
  const result = doGet({ parameter: { sheet: "all" } });
  Logger.log(result.getContent());
}
