/* ═══════════════════════════════════════════════════════
   PPT EXPORT — IH Dashboard Pertamina Patra Niaga
   Modul: HRA & IH | DAT | Pest & Rodent
   Library: PptxGenJS (browser CDN)
   Zero Error — Menggunakan data filteredHRA/DAT/Pest
═══════════════════════════════════════════════════════ */

/* ── PALETTE ── */
var PPT_C = {
  blue:      "006BB8",
  blueDark:  "004F8A",
  blueLight: "EBF5FF",
  blueMid:   "0080D6",
  red:       "ED1A2F",
  redDark:   "C4101F",
  redLight:  "FFF0F1",
  green:     "ACC32A",
  greenDark: "7A9020",
  greenSoft: "F4F9E6",
  orange:    "F06000",
  orangeSoft:"FFEDD5",
  purple:    "7C3AED",
  purpleSoft:"F3E8FF",
  teal:      "00897B",
  tealSoft:  "E0F2F1",
  white:     "FFFFFF",
  black:     "111827",
  textMid:   "374151",
  textMuted: "6B7280",
  border:    "E5E7EB",
  bg:        "F5F7FA",
};

var PPT_BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"];

/* ── HELPERS ── */
function pptShadow() {
  return { type:"outer", blur:6, offset:2, angle:135, color:"000000", opacity:0.08 };
}
function pptFmtRupiah(n) {
  n = parseFloat(n) || 0;
  if (n >= 1e9) return "Rp " + (n/1e9).toFixed(1) + " M";
  if (n >= 1e6) return "Rp " + (n/1e6).toFixed(1) + " Jt";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function pptGetBulanLabel() {
  var bulan = document.getElementById("hra-filter-bulan") &&
              document.getElementById("hra-filter-bulan").value;
  if (bulan) return bulan + " 2026";
  var now = new Date();
  return PPT_BULAN[now.getMonth()] + " " + now.getFullYear();
}
function pptGetDate() {
  var now = new Date();
  return now.toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" });
}

/* ── SHARED SLIDE ELEMENTS ── */
function pptAddHeader(s, pres, title, subtitle) {
  s.addShape(pres.ShapeType.rect, {
    x:0, y:0, w:10, h:0.9,
    fill:{ color:PPT_C.blueDark }, line:{ color:PPT_C.blueDark }
  });
  s.addShape(pres.ShapeType.rect, {
    x:0, y:0, w:10, h:0.055,
    fill:{ color:PPT_C.red }, line:{ color:PPT_C.red }
  });
  s.addText(title, {
    x:0.4, y:0.12, w:8.5, h:0.42,
    fontSize:17, bold:true, color:PPT_C.white, valign:"middle"
  });
  s.addText(subtitle, {
    x:0.4, y:0.52, w:8.5, h:0.28,
    fontSize:8.5, color:"AACCEE", valign:"middle"
  });
}

function pptAddFooter(s, pres, moduleName, bulanLabel, pageNum, pageTotal) {
  s.addShape(pres.ShapeType.rect, {
    x:0, y:5.35, w:10, h:0.27,
    fill:{ color:PPT_C.blueDark }, line:{ color:PPT_C.blueDark }
  });
  s.addText("PERTAMINA PATRA NIAGA — " + moduleName + " | " + bulanLabel + " | CONFIDENTIAL", {
    x:0.3, y:5.36, w:7.5, h:0.24,
    fontSize:7, color:"AACCEE", valign:"middle"
  });
  s.addText(pageNum + " / " + pageTotal, {
    x:8.5, y:5.36, w:1.2, h:0.24,
    fontSize:7.5, color:"AACCEE", align:"right", valign:"middle"
  });
}

function pptAddCover(pres, title, subtitle, moduleName, bulanLabel, stats) {
  var s = pres.addSlide();
  s.background = { color: PPT_C.blueDark };

  // Deco circles
  s.addShape(pres.ShapeType.ellipse, {
    x:6.8, y:-1.0, w:4.5, h:4.5,
    fill:{ color:PPT_C.blue, transparency:72 }, line:{ color:PPT_C.blue, transparency:72 }
  });
  s.addShape(pres.ShapeType.ellipse, {
    x:-1.5, y:3.2, w:4, h:4,
    fill:{ color:PPT_C.blue, transparency:78 }, line:{ color:PPT_C.blue, transparency:78 }
  });

  // Red accents
  s.addShape(pres.ShapeType.rect, { x:0, y:0, w:10, h:0.055, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
  s.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.1,  h:5.62, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });

  // Logo box
  s.addShape(pres.ShapeType.rect, {
    x:0.45, y:0.5, w:0.72, h:0.72,
    fill:{color:PPT_C.red}, line:{color:PPT_C.red}, shadow:pptShadow()
  });
  s.addText("⚓", { x:0.45, y:0.5, w:0.72, h:0.72, fontSize:24, align:"center", valign:"middle", color:PPT_C.white });

  s.addText("PERTAMINA PATRA NIAGA", {
    x:1.3, y:0.5, w:6, h:0.34, fontSize:10, bold:true, color:PPT_C.white, charSpacing:2.5, valign:"middle"
  });
  s.addText("Industrial Hygiene Department", {
    x:1.3, y:0.82, w:6, h:0.3, fontSize:9, color:"AACCEE", valign:"middle"
  });

  // Main title
  s.addText(title, { x:0.45, y:1.5, w:9, h:0.85, fontSize:44, bold:true, color:PPT_C.white, fontFace:"Calibri" });
  s.addText(subtitle, { x:0.45, y:2.38, w:9, h:0.4, fontSize:14, color:"AACCEE", italic:true });

  // Period badge
  s.addShape(pres.ShapeType.rect, { x:0.45, y:3.0, w:2.2, h:0.48, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
  s.addText(bulanLabel.toUpperCase(), {
    x:0.45, y:3.0, w:2.2, h:0.48, fontSize:12, bold:true, color:PPT_C.white, align:"center", valign:"middle", charSpacing:1.5
  });

  // Stats
  stats.forEach(function(st, i) {
    var x = 0.45 + i * 2.5;
    s.addShape(pres.ShapeType.rect, {
      x:x, y:3.75, w:2.2, h:0.95,
      fill:{ color:PPT_C.blue, transparency:60 }, line:{ color:PPT_C.blue, transparency:40 }
    });
    s.addText(st.val, { x:x, y:3.77, w:2.2, h:0.48, fontSize:24, bold:true, color:PPT_C.white, align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(st.label, { x:x, y:4.22, w:2.2, h:0.4, fontSize:9, color:"AACCEE", align:"center", valign:"top" });
  });

  s.addText("Prepared by: IH Admin  |  " + pptGetDate() + "  |  CONFIDENTIAL", {
    x:0.45, y:5.0, w:9, h:0.25, fontSize:8, color:"6688AA", italic:true
  });
  return s;
}

/* ═══════════════════════════════════════════════════════
   EXPORT HRA & IH PPT
═══════════════════════════════════════════════════════ */
function exportHRAPPT() {
  if (!window.PptxGenJS) { showToast("PptxGenJS belum siap, coba lagi.", "error"); return; }
  var data = (typeof filteredHRA !== "undefined" && filteredHRA.length > 0) ? filteredHRA : [];
  if (!data.length) { showToast("Tidak ada data HRA untuk diekspor.", "error"); return; }

  showToast("Membuat PPT HRA & IH...", "info");
  var pres = new PptxGenJS();
  pres.layout  = "LAYOUT_16x9";
  pres.author  = "IH Dashboard — Pertamina Patra Niaga";
  pres.title   = "Laporan HRA & IH";

  var bulanLabel = pptGetBulanLabel();
  var TOTAL = 85;
  var MODULE = "HRA & IH";
  var PAGE_TOTAL = 6;

  // ── KPI Calculations ──
  var done      = new Set(data.filter(function(r){ return (r["Status"]||"").toLowerCase()==="done"; }).map(function(r){ return r["Nama Kapal"]; })).size;
  var belum     = TOTAL - done;
  var budget    = data.reduce(function(s,r){ return s + (parseFloat(r["Est Budget"])||0); }, 0);
  var coverage  = ((done/TOTAL)*100).toFixed(1);
  var fleets    = {"FP I":0,"FP II":0,"FC":0,"FGP":0};
  data.forEach(function(r){ var f=r["Jenis Fleet"]; if(f&&fleets[f]!==undefined)fleets[f]++; });

  // Bar chart data
  var byBulan = {};
  PPT_BULAN.forEach(function(b){ byBulan[b]=0; });
  data.forEach(function(r){ var b=r["Bulan Pelaksanaan"]; if(b&&byBulan[b]!==undefined)byBulan[b]++; });

  // Hazard data
  var hazMap = {};
  data.forEach(function(r){ var h=(r["Top 3 Hazard"]||"").trim(); if(!h)return; h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){ hazMap[hz]=(hazMap[hz]||0)+1; }); });
  var hazSorted = Object.keys(hazMap).map(function(k){ return [k,hazMap[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);

  // ── SLIDE 1: COVER ──
  pptAddCover(pres, "LAPORAN HRA & IH",
    "Health Risk Assessment & Industrial Hygiene Monitoring",
    MODULE, bulanLabel,
    [{ val: String(TOTAL), label:"Total Kapal" },
     { val: String(done),  label:"Sudah Monitoring" },
     { val: coverage+"%",  label:"Coverage" }]
  );

  // ── SLIDE 2: RINGKASAN EKSEKUTIF ──
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "RINGKASAN EKSEKUTIF", "HRA & IH — " + bulanLabel);

    var kpis = [
      { label:"Total Kapal",      val:String(TOTAL),           color:PPT_C.blue,   bg:PPT_C.blueLight,  icon:"🚢" },
      { label:"Sudah Monitoring", val:String(done),            color:"15803D",     bg:"DCFCE7",         icon:"✅" },
      { label:"Belum Monitoring", val:String(belum),           color:PPT_C.orange, bg:PPT_C.orangeSoft, icon:"⏳" },
      { label:"Coverage",         val:coverage+"%",            color:PPT_C.blue,   bg:PPT_C.blueLight,  icon:"📊" },
      { label:"Est. Budget",      val:pptFmtRupiah(budget),    color:PPT_C.purple, bg:PPT_C.purpleSoft, icon:"💰" },
    ];
    kpis.forEach(function(k, i) {
      var x = 0.18 + i*1.94, y = 1.08, w = 1.72, h = 1.52;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:h, fill:{color:PPT_C.white}, line:{color:PPT_C.border,pt:1}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:0.07, fill:{color:k.color}, line:{color:k.color} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.58, y:y+0.14, w:0.56, h:0.56, fill:{color:k.bg}, line:{color:k.bg} });
      s.addText(k.icon, { x:x+0.58, y:y+0.14, w:0.56, h:0.56, fontSize:16, align:"center", valign:"middle" });
      s.addText(k.val, { x:x+0.06, y:y+0.77, w:w-0.12, h:0.46, fontSize:k.val.length>7?13:21, bold:true, color:k.color, align:"center", valign:"middle", fontFace:"Calibri" });
      s.addText(k.label, { x:x+0.06, y:y+1.2, w:w-0.12, h:0.27, fontSize:8.5, color:PPT_C.textMuted, align:"center" });
    });

    // Findings box
    s.addShape(pres.ShapeType.rect, { x:0.18, y:2.77, w:5.8, h:2.42, fill:{color:PPT_C.blueLight}, line:{color:"BFDBFE",pt:1} });
    s.addShape(pres.ShapeType.rect, { x:0.18, y:2.77, w:0.08, h:2.42, fill:{color:PPT_C.blue}, line:{color:PPT_C.blue} });
    s.addText("📋  TEMUAN UTAMA", { x:0.38, y:2.87, w:5.5, h:0.3, fontSize:10, bold:true, color:PPT_C.blueDark });
    var findings = [
      "Coverage monitoring " + coverage + "% dari " + TOTAL + " kapal armada",
      "Sudah monitoring: " + done + " kapal | Belum: " + belum + " kapal",
      hazSorted.length ? "Hazard dominan: " + (hazSorted[0]||["—"])[0] + " (" + (hazSorted[0]||[0,0])[1] + " kasus)" : "Belum ada data hazard",
      "Estimasi anggaran terserap: " + pptFmtRupiah(budget),
    ];
    s.addText(findings.map(function(f){ return {text:f, options:{bullet:true, breakLine:true, paraSpaceAfter:3}}; }).concat([{text:""}]), {
      x:0.38, y:3.22, w:5.5, h:1.88, fontSize:10, color:PPT_C.textMid
    });

    // Rekomendasi box
    s.addShape(pres.ShapeType.rect, { x:6.18, y:2.77, w:3.65, h:2.42, fill:{color:"FFF7ED"}, line:{color:"FED7AA",pt:1} });
    s.addShape(pres.ShapeType.rect, { x:6.18, y:2.77, w:0.08, h:2.42, fill:{color:PPT_C.orange}, line:{color:PPT_C.orange} });
    s.addText("⚡  REKOMENDASI", { x:6.38, y:2.87, w:3.3, h:0.3, fontSize:10, bold:true, color:PPT_C.orange });
    var recs = ["Percepat monitoring " + belum + " kapal tersisa", "Audit APD kapal dengan hazard tinggi", "Review jadwal vendor monitoring"];
    s.addText(recs.map(function(r){ return {text:r, options:{bullet:true, breakLine:true, paraSpaceAfter:5}}; }).concat([{text:""}]), {
      x:6.38, y:3.22, w:3.3, h:1.88, fontSize:10, color:PPT_C.textMid
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 2, PAGE_TOTAL);
  })();

  // ── SLIDE 3: MONITORING PER BULAN ──
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "MONITORING PER BULAN", "Frekuensi pelaksanaan HRA & IH sepanjang tahun 2026");
    s.addChart(pres.ChartType.bar, [{
      name:"Kapal Dimonitoring", labels:PPT_BULAN, values:PPT_BULAN.map(function(b){ return byBulan[b]||0; })
    }], {
      x:0.3, y:1.05, w:6.2, h:3.85, barDir:"col",
      chartColors:[PPT_C.blue],
      chartArea:{ fill:{ color:PPT_C.white }, roundedCorners:false },
      catAxisLabelColor:PPT_C.textMuted, valAxisLabelColor:PPT_C.textMuted,
      valGridLine:{ color:PPT_C.border, size:0.5 }, catGridLine:{ style:"none" },
      showValue:true, dataLabelColor:PPT_C.blueDark, dataLabelFontSize:9,
      showLegend:false, catAxisLabelFontSize:9, valAxisLabelFontSize:9,
    });
    var ytd = data.length;
    var avg = (ytd / Math.max(PPT_BULAN.filter(function(b){ return (byBulan[b]||0)>0; }).length, 1)).toFixed(1);
    var sideStats = [
      { label:"Total YTD",      val:String(ytd),   color:PPT_C.blue,   bg:PPT_C.blueLight  },
      { label:"Rata-rata/Bln",  val:avg,            color:"15803D",     bg:"DCFCE7"         },
      { label:"Coverage",       val:coverage+"%",   color:PPT_C.orange, bg:PPT_C.orangeSoft },
      { label:"Target Kapal",   val:String(TOTAL),  color:PPT_C.purple, bg:PPT_C.purpleSoft },
    ];
    sideStats.forEach(function(st, i) {
      var y = 1.1 + i*0.93;
      s.addShape(pres.ShapeType.rect, { x:6.75, y:y, w:2.9, h:0.78, fill:{color:st.bg}, line:{color:PPT_C.border,pt:1}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:6.75, y:y, w:0.07, h:0.78, fill:{color:st.color}, line:{color:st.color} });
      s.addText(st.val, { x:7.0, y:y+0.05, w:2.5, h:0.38, fontSize:20, bold:true, color:st.color, fontFace:"Calibri", valign:"middle" });
      s.addText(st.label, { x:7.0, y:y+0.42, w:2.5, h:0.28, fontSize:9, color:PPT_C.textMuted, valign:"middle" });
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 3, PAGE_TOTAL);
  })();

  // ── SLIDE 4: DISTRIBUSI FLEET & HAZARD ──
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DISTRIBUSI FLEET & TOP HAZARD", "Sebaran kapal per jenis fleet dan hazard dominan yang teridentifikasi");
    s.addChart(pres.ChartType.doughnut, [{
      name:"Fleet", labels:Object.keys(fleets), values:Object.values(fleets)
    }], {
      x:0.2, y:1.05, w:4.2, h:3.7,
      chartColors:[PPT_C.blue, PPT_C.red, PPT_C.green, PPT_C.orange],
      chartArea:{ fill:{ color:PPT_C.white } },
      showPercent:true, showLegend:true, legendPos:"b",
      legendFontSize:9, legendColor:PPT_C.textMid,
      dataLabelColor:PPT_C.white, dataLabelFontSize:9, holeSize:55,
      title:"Distribusi per Fleet", showTitle:true, titleFontSize:11, titleColor:PPT_C.black,
    });
    var colors = [PPT_C.red, PPT_C.orange, PPT_C.blue, "15803D", PPT_C.purple];
    s.addShape(pres.ShapeType.rect, { x:4.6, y:1.05, w:5.2, h:0.38, fill:{color:PPT_C.blueLight}, line:{color:PPT_C.border,pt:1} });
    s.addText("🔥  TOP HAZARD TERIDENTIFIKASI", { x:4.7, y:1.08, w:5.0, h:0.3, fontSize:10, bold:true, color:PPT_C.blueDark, valign:"middle" });
    if (hazSorted.length === 0) {
      s.addText("Belum ada data hazard tersedia", { x:4.6, y:1.55, w:5.2, h:0.5, fontSize:11, color:PPT_C.textMuted, align:"center" });
    }
    hazSorted.slice(0,5).forEach(function(h, i) {
      var y = 1.55 + i*0.62;
      var maxVal = hazSorted[0][1] || 1;
      var barW = Math.max(0.3, (h[1]/maxVal)*3.8);
      s.addShape(pres.ShapeType.rect, { x:4.6, y:y, w:5.2, h:0.55, fill:{color:i%2===0?"F9FAFB":PPT_C.white}, line:{color:PPT_C.border,pt:0.5} });
      s.addShape(pres.ShapeType.ellipse, { x:4.68, y:y+0.1, w:0.35, h:0.35, fill:{color:colors[i]}, line:{color:colors[i]} });
      s.addText(String(i+1), { x:4.68, y:y+0.1, w:0.35, h:0.35, fontSize:10, bold:true, color:PPT_C.white, align:"center", valign:"middle" });
      s.addText(h[0].length>32?h[0].slice(0,32)+"…":h[0], { x:5.1, y:y+0.04, w:2.8, h:0.27, fontSize:9.5, bold:true, color:PPT_C.black, valign:"middle" });
      s.addShape(pres.ShapeType.rect, { x:5.1, y:y+0.32, w:3.8, h:0.13, fill:{color:"E5E7EB"}, line:{color:"E5E7EB"} });
      s.addShape(pres.ShapeType.rect, { x:5.1, y:y+0.32, w:barW, h:0.13, fill:{color:colors[i]}, line:{color:colors[i]} });
      s.addText(h[1]+" kasus", { x:8.95, y:y+0.04, w:0.8, h:0.27, fontSize:8.5, color:colors[i], bold:true, align:"right", valign:"middle" });
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 4, PAGE_TOTAL);
  })();

  // ── SLIDE 5: DATA TABLE ──
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DATA MONITORING IH", "Rekap data pelaksanaan monitoring seluruh kapal — " + bulanLabel);
    var showData = data.slice(0, 12);
    var headerRow = ["Nama Kapal","Fleet","Bulan","Vendor","Status","Est. Budget"].map(function(h) {
      return { text:h, options:{ fill:{color:PPT_C.blueDark}, color:PPT_C.white, bold:true, fontSize:8.5, align:"center", valign:"middle" } };
    });
    var rows = [headerRow];
    showData.forEach(function(r, ri) {
      var isDone = (r["Status"]||"").toLowerCase()==="done";
      var bg = ri%2===0 ? "F8FAFC" : PPT_C.white;
      rows.push([
        { text:(r["Nama Kapal"]||"—"), options:{ fill:{color:bg}, color:PPT_C.black, bold:true, fontSize:8.5, align:"left", valign:"middle" } },
        { text:(r["Jenis Fleet"]||"—"), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8.5, align:"center", valign:"middle" } },
        { text:(r["Bulan Pelaksanaan"]||"—"), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8.5, align:"center", valign:"middle" } },
        { text:(r["Vendor Pelaksana"]||"—"), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8.5, align:"left", valign:"middle" } },
        { text:isDone?"✓ Done":"⏳ Belum", options:{ fill:{color:isDone?"DCFCE7":"FFEDD5"}, color:isDone?"15803D":PPT_C.orange, bold:true, fontSize:8.5, align:"center", valign:"middle" } },
        { text:pptFmtRupiah(r["Est Budget"]), options:{ fill:{color:bg}, color:PPT_C.blueDark, bold:true, fontSize:8.5, align:"right", valign:"middle" } },
      ]);
    });
    s.addTable(rows, { x:0.25, y:0.98, w:9.5, h:4.2, colW:[2.4,0.78,1.05,1.8,1.1,1.57], border:{pt:0.5,color:PPT_C.border}, rowH:0.33 });
    if (data.length > 12) {
      s.addText("... dan " + (data.length-12) + " data lainnya (total " + data.length + " entri)", {
        x:0.25, y:5.15, w:9.5, h:0.2, fontSize:8, color:PPT_C.textMuted, italic:true
      });
    }
    pptAddFooter(s, pres, MODULE, bulanLabel, 5, PAGE_TOTAL);
  })();

  // ── SLIDE 6: TINDAK LANJUT ──
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.blueDark };
    s.addShape(pres.ShapeType.ellipse, { x:7.0, y:-1.0, w:4.5, h:4.5, fill:{color:PPT_C.blue,transparency:70}, line:{color:PPT_C.blue,transparency:70} });
    s.addShape(pres.ShapeType.ellipse, { x:-1.8, y:3.2, w:4.5, h:4.5, fill:{color:PPT_C.blue,transparency:76}, line:{color:PPT_C.blue,transparency:76} });
    s.addShape(pres.ShapeType.rect, { x:0, y:0, w:10, h:0.055, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
    s.addText("TINDAK LANJUT & REKOMENDASI", { x:0.5, y:0.25, w:9, h:0.58, fontSize:22, bold:true, color:PPT_C.white, fontFace:"Calibri" });

    var actions = [
      "Percepat scheduling " + belum + " kapal yang belum monitoring",
      "Lakukan audit APD pada kapal dengan " + (hazSorted[0]||["—"])[0],
      "Koordinasi vendor untuk optimasi jadwal bulanan",
      "Update database monitoring di sistem IH Dashboard",
    ];
    actions.forEach(function(a, i) {
      var x = i<2 ? 0.3 : 5.2;
      var y = 1.02 + (i%2)*1.32;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:4.6, h:1.12, fill:{color:PPT_C.blue,transparency:60}, line:{color:PPT_C.blue,transparency:40}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:0.08, h:1.12, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addText(String(i+1), { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fontSize:11, bold:true, color:PPT_C.white, align:"center", valign:"middle" });
      s.addText(a, { x:x+0.72, y:y+0.18, w:3.75, h:0.72, fontSize:10.5, color:PPT_C.white, valign:"middle" });
    });

    s.addShape(pres.ShapeType.rect, { x:0.3, y:3.8, w:9.4, h:1.32, fill:{color:PPT_C.red,transparency:82}, line:{color:PPT_C.red,transparency:62} });
    s.addText("📅  PERIODE MONITORING BERIKUTNYA", { x:0.55, y:3.9, w:8.5, h:0.3, fontSize:10.5, bold:true, color:PPT_C.white });
    s.addText("Monitoring HRA & IH bulan berikutnya dimulai awal bulan. Koordinasi dengan vendor untuk penjadwalan 85 kapal. Pastikan semua kapal terjadwal sebelum akhir bulan.", {
      x:0.55, y:4.24, w:8.8, h:0.75, fontSize:10, color:"DDEEFF"
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 6, PAGE_TOTAL);
  })();

  pres.writeFile({ fileName:"Laporan_HRA_IH_" + bulanLabel.replace(/ /g,"_") + ".pptx" })
    .then(function(){ showToast("PPT HRA & IH berhasil didownload!", "success"); })
    .catch(function(e){ showToast("Gagal: " + e.message, "error"); });
}

/* ═══════════════════════════════════════════════════════
   EXPORT DAT PPT
═══════════════════════════════════════════════════════ */
function exportDATPPT() {
  if (!window.PptxGenJS) { showToast("PptxGenJS belum siap.", "error"); return; }
  var data = (typeof filteredDAT !== "undefined" && filteredDAT.length > 0) ? filteredDAT : [];
  if (!data.length) { showToast("Tidak ada data DAT untuk diekspor.", "error"); return; }

  showToast("Membuat PPT DAT...", "info");
  var pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title  = "Laporan Drugs & Alcohol Test";

  var bulanLabel = pptGetBulanLabel();
  var TOTAL = 85;
  var MODULE = "Drugs & Alcohol Test";
  var PAGE_TOTAL = 6;

  // KPI
  var doneKapal  = new Set(data.map(function(r){ return r["Nama Kapal"]; })).size;
  var belum      = TOTAL - doneKapal;
  var crew       = data.reduce(function(s,r){ return s + (parseInt(r["Total Crew Diperiksa"])||0); }, 0);
  var pos        = data.reduce(function(s,r){ return s + (parseInt(r["Jumlah Crew Positif"])||0); }, 0);
  var neg        = crew - pos;
  var biaya      = data.reduce(function(s,r){ return s + (parseFloat(r["Est Biaya"])||0); }, 0);
  var coverage   = ((doneKapal/TOTAL)*100).toFixed(1);
  var posRate    = crew > 0 ? ((pos/crew)*100).toFixed(1) : "0.0";

  // Bar chart
  var byBulan = {};
  PPT_BULAN.forEach(function(b){ byBulan[b]=0; });
  data.forEach(function(r){ var b=r["Bulan Pelaksanaan"]; if(b&&byBulan[b]!==undefined)byBulan[b]++; });

  // Fleet
  var fleets = {"FP I":0,"FP II":0,"FC":0,"FGP":0};
  data.forEach(function(r){ var f=r["Jenis Fleet"]; if(f&&fleets[f]!==undefined)fleets[f]++; });

  // SLIDE 1 — Cover
  pptAddCover(pres, "LAPORAN DAT", "Drugs & Alcohol Test — Health Monitoring Armada Kapal", MODULE, bulanLabel, [
    { val:String(doneKapal), label:"Kapal Diperiksa" },
    { val:String(crew),      label:"Total Crew" },
    { val:posRate+"%",       label:"Tingkat Positif" },
  ]);

  // SLIDE 2 — KPI
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "RINGKASAN EKSEKUTIF", "DAT — " + bulanLabel);
    var kpis = [
      { label:"Kapal Diperiksa", val:String(doneKapal),     color:PPT_C.blue,   bg:PPT_C.blueLight,  icon:"🚢" },
      { label:"Belum DAT",       val:String(belum),          color:PPT_C.orange, bg:PPT_C.orangeSoft, icon:"⏳" },
      { label:"Total Crew",      val:String(crew),           color:"15803D",     bg:"DCFCE7",         icon:"👥" },
      { label:"Crew Positif",    val:String(pos),            color:PPT_C.red,    bg:PPT_C.redLight,   icon:"⚠️" },
      { label:"Coverage",        val:coverage+"%",           color:PPT_C.purple, bg:PPT_C.purpleSoft, icon:"📊" },
      { label:"Est. Biaya",      val:pptFmtRupiah(biaya),    color:PPT_C.teal,   bg:PPT_C.tealSoft,   icon:"💰" },
    ];
    // 6 cards: 2 rows of 3
    kpis.forEach(function(k, i) {
      var col = i % 3, row = Math.floor(i/3);
      var x = 0.28 + col*3.18, y = 1.06 + row*1.48, w = 2.96, h = 1.3;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:h, fill:{color:PPT_C.white}, line:{color:PPT_C.border,pt:1}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:0.07, fill:{color:k.color}, line:{color:k.color} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.22, y:y+0.14, w:0.52, h:0.52, fill:{color:k.bg}, line:{color:k.bg} });
      s.addText(k.icon, { x:x+0.22, y:y+0.14, w:0.52, h:0.52, fontSize:16, align:"center", valign:"middle" });
      s.addText(k.val, { x:x+0.9, y:y+0.15, w:w-1.1, h:0.52, fontSize:k.val.length>8?14:22, bold:true, color:k.color, valign:"middle", fontFace:"Calibri" });
      s.addText(k.label, { x:x+0.06, y:y+0.96, w:w-0.12, h:0.26, fontSize:8.5, color:PPT_C.textMuted, align:"center" });
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 2, PAGE_TOTAL);
  })();

  // SLIDE 3 — Bar Chart + Donut
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "CREW TEST PER BULAN & HASIL TEST", "Frekuensi pelaksanaan DAT dan distribusi hasil test negatif/positif");
    s.addChart(pres.ChartType.bar, [{
      name:"Kapal DAT", labels:PPT_BULAN, values:PPT_BULAN.map(function(b){ return byBulan[b]||0; })
    }], {
      x:0.3, y:1.05, w:5.8, h:3.85, barDir:"col",
      chartColors:["43A047"],
      chartArea:{ fill:{color:PPT_C.white} },
      catAxisLabelColor:PPT_C.textMuted, valAxisLabelColor:PPT_C.textMuted,
      valGridLine:{ color:PPT_C.border, size:0.5 }, catGridLine:{ style:"none" },
      showValue:true, dataLabelColor:"15803D", dataLabelFontSize:9,
      showLegend:false, catAxisLabelFontSize:9, valAxisLabelFontSize:9,
    });
    s.addChart(pres.ChartType.doughnut, [{
      name:"Hasil", labels:["Negatif","Positif"], values:[Math.max(0,neg), pos]
    }], {
      x:6.3, y:1.05, w:3.4, h:3.85,
      chartColors:["43A047", PPT_C.red],
      chartArea:{ fill:{color:PPT_C.white} },
      showPercent:true, showLegend:true, legendPos:"b",
      legendFontSize:10, dataLabelFontSize:10, holeSize:55,
      title:"Hasil Test", showTitle:true, titleFontSize:11, titleColor:PPT_C.black,
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 3, PAGE_TOTAL);
  })();

  // SLIDE 4 — Fleet Distribution
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DISTRIBUSI FLEET & STATISTIK", "Sebaran pelaksanaan DAT per jenis fleet");
    s.addChart(pres.ChartType.doughnut, [{
      name:"Fleet", labels:Object.keys(fleets), values:Object.values(fleets)
    }], {
      x:0.3, y:1.05, w:4.2, h:3.7,
      chartColors:[PPT_C.blue, PPT_C.red, PPT_C.green, PPT_C.orange],
      chartArea:{ fill:{color:PPT_C.white} },
      showPercent:true, showLegend:true, legendPos:"b",
      legendFontSize:9, holeSize:55,
      title:"Distribusi per Fleet", showTitle:true, titleFontSize:11, titleColor:PPT_C.black,
    });
    // Stats right
    var stats2 = [
      { label:"Total Kapal DAT",   val:String(doneKapal),        color:PPT_C.blue,   bg:PPT_C.blueLight  },
      { label:"Total Crew",         val:String(crew),             color:"15803D",     bg:"DCFCE7"         },
      { label:"Crew Negatif",       val:String(Math.max(0,neg)),  color:"15803D",     bg:"DCFCE7"         },
      { label:"Crew Positif",       val:String(pos),              color:PPT_C.red,    bg:PPT_C.redLight   },
      { label:"Tingkat Positif",    val:posRate+"%",              color:PPT_C.red,    bg:PPT_C.redLight   },
    ];
    stats2.forEach(function(st, i) {
      var y = 1.1 + i*0.75;
      s.addShape(pres.ShapeType.rect, { x:4.8, y:y, w:4.9, h:0.62, fill:{color:st.bg}, line:{color:PPT_C.border,pt:1}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:4.8, y:y, w:0.07, h:0.62, fill:{color:st.color}, line:{color:st.color} });
      s.addText(st.val, { x:5.05, y:y+0.04, w:2.0, h:0.32, fontSize:18, bold:true, color:st.color, fontFace:"Calibri", valign:"middle" });
      s.addText(st.label, { x:5.05, y:y+0.34, w:4.4, h:0.22, fontSize:9, color:PPT_C.textMuted, valign:"middle" });
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 4, PAGE_TOTAL);
  })();

  // SLIDE 5 — Table
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DATA DRUGS & ALCOHOL TEST", "Rekap data pelaksanaan DAT seluruh kapal — " + bulanLabel);
    var showData = data.slice(0,11);
    var headerRow = ["Nama Kapal","Fleet","Bulan","Total Crew","Hasil","Crew Positif","Tindak Lanjut"].map(function(h) {
      return { text:h, options:{ fill:{color:PPT_C.blueDark}, color:PPT_C.white, bold:true, fontSize:8, align:"center", valign:"middle" } };
    });
    var rows = [headerRow];
    showData.forEach(function(r, ri) {
      var hasil = (r["Hasil"]||"").toLowerCase();
      var isPos = hasil === "positif";
      var bg = ri%2===0?"F8FAFC":PPT_C.white;
      rows.push([
        { text:(r["Nama Kapal"]||"—"), options:{ fill:{color:bg}, color:PPT_C.black, bold:true, fontSize:8, align:"left", valign:"middle" } },
        { text:(r["Jenis Fleet"]||"—"), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8, align:"center", valign:"middle" } },
        { text:(r["Bulan Pelaksanaan"]||"—"), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8, align:"center", valign:"middle" } },
        { text:String(parseInt(r["Total Crew Diperiksa"])||0), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8, align:"center", valign:"middle" } },
        { text:isPos?"⚠️ Positif":"✓ Negatif", options:{ fill:{color:isPos?"FFF0F1":"DCFCE7"}, color:isPos?PPT_C.red:"15803D", bold:true, fontSize:8, align:"center", valign:"middle" } },
        { text:String(parseInt(r["Jumlah Crew Positif"])||0), options:{ fill:{color:bg}, color:isPos?PPT_C.red:PPT_C.textMid, bold:isPos, fontSize:8, align:"center", valign:"middle" } },
        { text:((r["Tindak Lanjut"]||"—").slice(0,40)), options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:7.5, align:"left", valign:"middle" } },
      ]);
    });
    s.addTable(rows, { x:0.25, y:0.98, w:9.5, h:4.2, colW:[2.1,0.72,0.95,0.9,0.9,0.85,2.28], border:{pt:0.5,color:PPT_C.border}, rowH:0.34 });
    if (data.length > 11) s.addText("... dan "+(data.length-11)+" data lainnya", { x:0.25, y:5.14, w:9.5, h:0.2, fontSize:8, color:PPT_C.textMuted, italic:true });
    pptAddFooter(s, pres, MODULE, bulanLabel, 5, PAGE_TOTAL);
  })();

  // SLIDE 6 — Tindak Lanjut
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.blueDark };
    s.addShape(pres.ShapeType.ellipse, { x:7.0, y:-1.0, w:4.5, h:4.5, fill:{color:PPT_C.blue,transparency:70}, line:{color:PPT_C.blue,transparency:70} });
    s.addShape(pres.ShapeType.ellipse, { x:-1.8, y:3.2, w:4.5, h:4.5, fill:{color:PPT_C.blue,transparency:76}, line:{color:PPT_C.blue,transparency:76} });
    s.addShape(pres.ShapeType.rect, { x:0, y:0, w:10, h:0.055, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
    s.addText("TINDAK LANJUT & REKOMENDASI", { x:0.5, y:0.25, w:9, h:0.58, fontSize:22, bold:true, color:PPT_C.white, fontFace:"Calibri" });
    var actions = [
      "Percepat DAT untuk " + belum + " kapal yang belum diperiksa",
      "Tindak lanjuti " + pos + " crew dengan hasil positif",
      "Koordinasi dengan nakhoda untuk crew pengganti",
      "Update laporan DAT ke sistem monitoring pusat",
    ];
    actions.forEach(function(a, i) {
      var x = i<2?0.3:5.2, y = 1.02+(i%2)*1.32;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:4.6, h:1.12, fill:{color:PPT_C.blue,transparency:60}, line:{color:PPT_C.blue,transparency:40}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:0.08, h:1.12, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addText(String(i+1), { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fontSize:11, bold:true, color:PPT_C.white, align:"center", valign:"middle" });
      s.addText(a, { x:x+0.72, y:y+0.18, w:3.75, h:0.72, fontSize:10.5, color:PPT_C.white, valign:"middle" });
    });
    s.addShape(pres.ShapeType.rect, { x:0.3, y:3.8, w:9.4, h:1.32, fill:{color:PPT_C.red,transparency:82}, line:{color:PPT_C.red,transparency:62} });
    s.addText("📅  JADWAL DAT BERIKUTNYA", { x:0.55, y:3.9, w:8.5, h:0.3, fontSize:10.5, bold:true, color:PPT_C.white });
    s.addText("DAT bulan berikutnya dijadwalkan awal bulan. Pastikan vendor siap dan seluruh 85 kapal terjadwal untuk pemeriksaan. Hasil segera dilaporkan ke manajemen.", {
      x:0.55, y:4.24, w:8.8, h:0.75, fontSize:10, color:"DDEEFF"
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 6, PAGE_TOTAL);
  })();

  pres.writeFile({ fileName:"Laporan_DAT_"+bulanLabel.replace(/ /g,"_")+".pptx" })
    .then(function(){ showToast("PPT DAT berhasil didownload!", "success"); })
    .catch(function(e){ showToast("Gagal: "+e.message, "error"); });
}

/* ═══════════════════════════════════════════════════════
   EXPORT PEST & RODENT PPT
═══════════════════════════════════════════════════════ */
function exportPestPPT() {
  if (!window.PptxGenJS) { showToast("PptxGenJS belum siap.", "error"); return; }
  var data = (typeof filteredPest !== "undefined" && filteredPest.length > 0) ? filteredPest : [];
  if (!data.length) { showToast("Tidak ada data Pest untuk diekspor.", "error"); return; }

  showToast("Membuat PPT Pest & Rodent...", "info");
  var pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title  = "Laporan Pest & Rodent Control";

  var bulanLabel = pptGetBulanLabel();
  var MODULE = "Pest & Rodent Control";
  var PAGE_TOTAL = 6;

  // KPI
  var totalPelaksanaan = data.length;
  var lokSet = {};
  data.forEach(function(r){ var l=(r["Lokasi"]||"").trim(); if(l)lokSet[l]=1; });
  var totalLokasi = Object.keys(lokSet).length;
  var totalBiaya  = data.reduce(function(s,r){ return s+(parseFloat(r["Est Biaya"])||0); }, 0);

  // Hama
  var hamaMap = {};
  data.forEach(function(r) {
    var t=(r["Temuan / Keluhan"]||"").toLowerCase();
    ["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(function(h){ if(t.includes(h))hamaMap[h]=(hamaMap[h]||0)+1; });
  });
  var hamaSorted = Object.keys(hamaMap).map(function(k){ return [k,hamaMap[k]]; }).sort(function(a,b){ return b[1]-a[1]; });
  var hamaDominan = hamaSorted.length ? hamaSorted[0][0] : "—";

  // Temuan
  var temuanMap = {};
  data.forEach(function(r){ var t=(r["Temuan / Keluhan"]||"").trim(); if(t)temuanMap[t]=(temuanMap[t]||0)+1; });
  var temuanSorted = Object.keys(temuanMap).map(function(k){ return [k,temuanMap[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);

  // Bar per bulan
  var byBulan = {};
  PPT_BULAN.forEach(function(b){ byBulan[b]=0; });
  data.forEach(function(r){ var b=(r["Bulan"]||"").trim(); if(b&&byBulan[b]!==undefined)byBulan[b]++; });

  // Biaya per bulan
  var biayaByBulan = {};
  PPT_BULAN.forEach(function(b){ biayaByBulan[b]=0; });
  data.forEach(function(r){ var b=(r["Bulan"]||"").trim(); if(b&&biayaByBulan[b]!==undefined)biayaByBulan[b]+=(parseFloat(r["Est Biaya"])||0); });

  // Lokasi
  var lokMap = {};
  data.forEach(function(r){ var l=(r["Lokasi"]||"").trim(); if(l)lokMap[l]=(lokMap[l]||0)+1; });
  var lokSorted = Object.keys(lokMap).map(function(k){ return [k,lokMap[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,6);

  // SLIDE 1 — Cover
  pptAddCover(pres, "LAPORAN PEST & RODENT", "Pest & Rodent Control — Health Monitoring Fasilitas", MODULE, bulanLabel, [
    { val:String(totalPelaksanaan), label:"Total Pelaksanaan" },
    { val:String(totalLokasi),      label:"Total Lokasi" },
    { val:pptFmtRupiah(totalBiaya), label:"Est. Total Biaya" },
  ]);

  // SLIDE 2 — KPI
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "RINGKASAN EKSEKUTIF", "Pest & Rodent — " + bulanLabel);
    var kpis = [
      { label:"Total Pelaksanaan", val:String(totalPelaksanaan),    color:PPT_C.blue,   bg:PPT_C.blueLight,  icon:"📋" },
      { label:"Total Lokasi",      val:String(totalLokasi),         color:"15803D",     bg:"DCFCE7",         icon:"📍" },
      { label:"Total Temuan",      val:String(data.length),         color:PPT_C.orange, bg:PPT_C.orangeSoft, icon:"🔍" },
      { label:"Hama Dominan",      val:hamaDominan.charAt(0).toUpperCase()+hamaDominan.slice(1), color:PPT_C.red, bg:PPT_C.redLight, icon:"🐛" },
      { label:"Est. Total Biaya",  val:pptFmtRupiah(totalBiaya),    color:PPT_C.purple, bg:PPT_C.purpleSoft, icon:"💰" },
    ];
    kpis.forEach(function(k, i) {
      var x = 0.18+i*1.94, y = 1.08, w = 1.72, h = 1.52;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:h, fill:{color:PPT_C.white}, line:{color:PPT_C.border,pt:1}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:w, h:0.07, fill:{color:k.color}, line:{color:k.color} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.58, y:y+0.14, w:0.56, h:0.56, fill:{color:k.bg}, line:{color:k.bg} });
      s.addText(k.icon, { x:x+0.58, y:y+0.14, w:0.56, h:0.56, fontSize:16, align:"center", valign:"middle" });
      s.addText(k.val, { x:x+0.06, y:y+0.77, w:w-0.12, h:0.46, fontSize:k.val.length>8?11:19, bold:true, color:k.color, align:"center", valign:"middle", fontFace:"Calibri" });
      s.addText(k.label, { x:x+0.06, y:y+1.2, w:w-0.12, h:0.27, fontSize:8.5, color:PPT_C.textMuted, align:"center" });
    });
    // Findings & Recs
    s.addShape(pres.ShapeType.rect, { x:0.18, y:2.77, w:5.8, h:2.42, fill:{color:PPT_C.blueLight}, line:{color:"BFDBFE",pt:1} });
    s.addShape(pres.ShapeType.rect, { x:0.18, y:2.77, w:0.08, h:2.42, fill:{color:PPT_C.blue}, line:{color:PPT_C.blue} });
    s.addText("📋  TEMUAN UTAMA", { x:0.38, y:2.87, w:5.5, h:0.3, fontSize:10, bold:true, color:PPT_C.blueDark });
    var findings = [
      "Total " + totalPelaksanaan + " pelaksanaan pest control pada " + totalLokasi + " lokasi",
      "Hama dominan teridentifikasi: " + (hamaDominan.charAt(0).toUpperCase()+hamaDominan.slice(1)),
      "Top temuan: " + (temuanSorted[0]||["—"])[0],
      "Estimasi total biaya: " + pptFmtRupiah(totalBiaya),
    ];
    s.addText(findings.map(function(f){ return {text:f, options:{bullet:true, breakLine:true, paraSpaceAfter:3}}; }).concat([{text:""}]), {
      x:0.38, y:3.22, w:5.5, h:1.88, fontSize:10, color:PPT_C.textMid
    });
    s.addShape(pres.ShapeType.rect, { x:6.18, y:2.77, w:3.65, h:2.42, fill:{color:"FFF7ED"}, line:{color:"FED7AA",pt:1} });
    s.addShape(pres.ShapeType.rect, { x:6.18, y:2.77, w:0.08, h:2.42, fill:{color:PPT_C.orange}, line:{color:PPT_C.orange} });
    s.addText("⚡  REKOMENDASI", { x:6.38, y:2.87, w:3.3, h:0.3, fontSize:10, bold:true, color:PPT_C.orange });
    s.addText([
      {text:"Intensifikasi pengendalian "+hamaDominan, options:{bullet:true,breakLine:true,paraSpaceAfter:5}},
      {text:"Monitoring rutin seluruh lokasi rawan", options:{bullet:true,breakLine:true,paraSpaceAfter:5}},
      {text:"Review efektivitas vendor pest control", options:{bullet:true,breakLine:true,paraSpaceAfter:5}},
      {text:""},
    ], { x:6.38, y:3.22, w:3.3, h:1.88, fontSize:10, color:PPT_C.textMid });
    pptAddFooter(s, pres, MODULE, bulanLabel, 2, PAGE_TOTAL);
  })();

  // SLIDE 3 — Frekuensi + Biaya Chart
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "FREKUENSI & TREND BIAYA", "Pelaksanaan pest control per bulan dan estimasi biaya");
    s.addChart(pres.ChartType.bar, [{
      name:"Pelaksanaan", labels:PPT_BULAN, values:PPT_BULAN.map(function(b){ return byBulan[b]||0; })
    }], {
      x:0.3, y:1.05, w:4.7, h:3.85, barDir:"col",
      chartColors:[PPT_C.blue],
      chartArea:{ fill:{color:PPT_C.white} },
      catAxisLabelColor:PPT_C.textMuted, valAxisLabelColor:PPT_C.textMuted,
      valGridLine:{ color:PPT_C.border, size:0.5 }, catGridLine:{ style:"none" },
      showValue:true, dataLabelColor:PPT_C.blueDark, dataLabelFontSize:9,
      showLegend:false, catAxisLabelFontSize:8, valAxisLabelFontSize:9,
    });
    s.addChart(pres.ChartType.line, [{
      name:"Est. Biaya", labels:PPT_BULAN, values:PPT_BULAN.map(function(b){ return biayaByBulan[b]||0; })
    }], {
      x:5.2, y:1.05, w:4.5, h:3.85,
      chartColors:["7C3AED"],
      chartArea:{ fill:{color:PPT_C.white} },
      catAxisLabelColor:PPT_C.textMuted, valAxisLabelColor:PPT_C.textMuted,
      valGridLine:{ color:PPT_C.border, size:0.5 }, catGridLine:{ style:"none" },
      lineSize:3, lineSmooth:true,
      showLegend:false, catAxisLabelFontSize:8, valAxisLabelFontSize:9,
      title:"Trend Biaya (Rp)", showTitle:true, titleFontSize:10, titleColor:PPT_C.black,
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 3, PAGE_TOTAL);
  })();

  // SLIDE 4 — Distribusi Lokasi + Top Temuan
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DISTRIBUSI LOKASI & TOP TEMUAN", "Sebaran pelaksanaan per lokasi dan temuan terbanyak");
    var lokLabels = lokSorted.map(function(x){ return x[0]; });
    var lokValues = lokSorted.map(function(x){ return x[1]; });
    s.addChart(pres.ChartType.doughnut, [{ name:"Lokasi", labels:lokLabels, values:lokValues }], {
      x:0.2, y:1.05, w:4.2, h:3.7,
      chartColors:[PPT_C.blue,PPT_C.red,PPT_C.green,PPT_C.orange,"7C3AED","00897B"],
      chartArea:{ fill:{color:PPT_C.white} },
      showPercent:true, showLegend:true, legendPos:"b",
      legendFontSize:9, holeSize:55,
      title:"Distribusi per Lokasi", showTitle:true, titleFontSize:11, titleColor:PPT_C.black,
    });
    // Top Temuan bars
    var colors = [PPT_C.red, PPT_C.orange, PPT_C.blue, "15803D", PPT_C.purple];
    s.addShape(pres.ShapeType.rect, { x:4.6, y:1.05, w:5.2, h:0.38, fill:{color:PPT_C.blueLight}, line:{color:PPT_C.border,pt:1} });
    s.addText("🔍  TOP TEMUAN / KELUHAN", { x:4.7, y:1.08, w:5.0, h:0.3, fontSize:10, bold:true, color:PPT_C.blueDark, valign:"middle" });
    temuanSorted.forEach(function(t, i) {
      var y = 1.55 + i*0.62;
      var maxVal = temuanSorted[0][1] || 1;
      var barW = Math.max(0.3, (t[1]/maxVal)*3.8);
      s.addShape(pres.ShapeType.rect, { x:4.6, y:y, w:5.2, h:0.55, fill:{color:i%2===0?"F9FAFB":PPT_C.white}, line:{color:PPT_C.border,pt:0.5} });
      s.addShape(pres.ShapeType.ellipse, { x:4.68, y:y+0.1, w:0.35, h:0.35, fill:{color:colors[i]}, line:{color:colors[i]} });
      s.addText(String(i+1), { x:4.68, y:y+0.1, w:0.35, h:0.35, fontSize:10, bold:true, color:PPT_C.white, align:"center", valign:"middle" });
      s.addText(t[0].length>32?t[0].slice(0,32)+"…":t[0], { x:5.1, y:y+0.04, w:2.8, h:0.27, fontSize:9.5, bold:true, color:PPT_C.black, valign:"middle" });
      s.addShape(pres.ShapeType.rect, { x:5.1, y:y+0.32, w:3.8, h:0.13, fill:{color:"E5E7EB"}, line:{color:"E5E7EB"} });
      s.addShape(pres.ShapeType.rect, { x:5.1, y:y+0.32, w:barW, h:0.13, fill:{color:colors[i]}, line:{color:colors[i]} });
      s.addText(t[1]+" kasus", { x:8.95, y:y+0.04, w:0.8, h:0.27, fontSize:8.5, color:colors[i], bold:true, align:"right", valign:"middle" });
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 4, PAGE_TOTAL);
  })();

  // SLIDE 5 — Data Table
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.white };
    pptAddHeader(s, pres, "DATA PEST & RODENT CONTROL", "Rekap data pelaksanaan pest control — " + bulanLabel);
    var showData = data.slice(0,12);
    var headerRow = ["Lokasi","Tanggal","Temuan / Keluhan","Tindak Lanjut","Est. Biaya"].map(function(h) {
      return { text:h, options:{ fill:{color:PPT_C.blueDark}, color:PPT_C.white, bold:true, fontSize:8.5, align:"center", valign:"middle" } };
    });
    var rows = [headerRow];
    showData.forEach(function(r, ri) {
      var bg = ri%2===0?"F8FAFC":PPT_C.white;
      var tgl = r["Tanggal"]||r["Tanggal Pelaksanaan"]||"—";
      var tl  = (r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||"—").slice(0,40);
      var temuan = (r["Temuan / Keluhan"]||"—").slice(0,40);
      rows.push([
        { text:(r["Lokasi"]||"—"), options:{ fill:{color:bg}, color:PPT_C.black, bold:true, fontSize:8.5, align:"left", valign:"middle" } },
        { text:tgl, options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8.5, align:"center", valign:"middle" } },
        { text:temuan, options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8, align:"left", valign:"middle" } },
        { text:tl, options:{ fill:{color:bg}, color:PPT_C.textMid, fontSize:8, align:"left", valign:"middle" } },
        { text:pptFmtRupiah(r["Est Biaya"]), options:{ fill:{color:bg}, color:PPT_C.purple, bold:true, fontSize:8.5, align:"right", valign:"middle" } },
      ]);
    });
    s.addTable(rows, { x:0.25, y:0.98, w:9.5, h:4.2, colW:[1.5,0.95,2.4,2.95,1.2], border:{pt:0.5,color:PPT_C.border}, rowH:0.33 });
    if (data.length > 12) s.addText("... dan "+(data.length-12)+" data lainnya", { x:0.25, y:5.14, w:9.5, h:0.2, fontSize:8, color:PPT_C.textMuted, italic:true });
    pptAddFooter(s, pres, MODULE, bulanLabel, 5, PAGE_TOTAL);
  })();

  // SLIDE 6 — Tindak Lanjut
  (function() {
    var s = pres.addSlide();
    s.background = { color: PPT_C.blueDark };
    s.addShape(pres.ShapeType.ellipse, { x:7.0,y:-1.0,w:4.5,h:4.5, fill:{color:PPT_C.blue,transparency:70}, line:{color:PPT_C.blue,transparency:70} });
    s.addShape(pres.ShapeType.ellipse, { x:-1.8,y:3.2,w:4.5,h:4.5, fill:{color:PPT_C.blue,transparency:76}, line:{color:PPT_C.blue,transparency:76} });
    s.addShape(pres.ShapeType.rect, { x:0,y:0,w:10,h:0.055, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
    s.addText("TINDAK LANJUT & REKOMENDASI", { x:0.5, y:0.25, w:9, h:0.58, fontSize:22, bold:true, color:PPT_C.white, fontFace:"Calibri" });
    var tindakLanjutData = data.map(function(r){ return r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||""; }).filter(Boolean).slice(0,4);
    var defaultActions = [
      "Intensifikasi pengendalian " + (hamaDominan.charAt(0).toUpperCase()+hamaDominan.slice(1)) + " di lokasi prioritas",
      "Monitoring rutin setiap 2 minggu pada lokasi rawan",
      "Koordinasi dengan vendor untuk tindak lanjut temuan",
      "Dokumentasi hasil pest control dan laporan ke manajemen",
    ];
    var actions = tindakLanjutData.length >= 4 ? tindakLanjutData : defaultActions;
    actions.slice(0,4).forEach(function(a, i) {
      var x = i<2?0.3:5.2, y = 1.02+(i%2)*1.32;
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:4.6, h:1.12, fill:{color:PPT_C.blue,transparency:60}, line:{color:PPT_C.blue,transparency:40}, shadow:pptShadow() });
      s.addShape(pres.ShapeType.rect, { x:x, y:y, w:0.08, h:1.12, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addShape(pres.ShapeType.ellipse, { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fill:{color:PPT_C.red}, line:{color:PPT_C.red} });
      s.addText(String(i+1), { x:x+0.18, y:y+0.3, w:0.42, h:0.42, fontSize:11, bold:true, color:PPT_C.white, align:"center", valign:"middle" });
      s.addText(a.slice(0,80), { x:x+0.72, y:y+0.18, w:3.75, h:0.72, fontSize:10, color:PPT_C.white, valign:"middle" });
    });
    s.addShape(pres.ShapeType.rect, { x:0.3, y:3.8, w:9.4, h:1.32, fill:{color:PPT_C.red,transparency:82}, line:{color:PPT_C.red,transparency:62} });
    s.addText("📅  JADWAL PEST CONTROL BERIKUTNYA", { x:0.55, y:3.9, w:8.5, h:0.3, fontSize:10.5, bold:true, color:PPT_C.white });
    s.addText("Pest control rutin dijadwalkan setiap bulan. Pastikan semua "+totalLokasi+" lokasi terjangkau. Vendor wajib memberikan laporan tertulis setelah setiap pelaksanaan.", {
      x:0.55, y:4.24, w:8.8, h:0.75, fontSize:10, color:"DDEEFF"
    });
    pptAddFooter(s, pres, MODULE, bulanLabel, 6, PAGE_TOTAL);
  })();

  pres.writeFile({ fileName:"Laporan_Pest_Rodent_"+bulanLabel.replace(/ /g,"_")+".pptx" })
    .then(function(){ showToast("PPT Pest & Rodent berhasil didownload!", "success"); })
    .catch(function(e){ showToast("Gagal: "+e.message, "error"); });
}
