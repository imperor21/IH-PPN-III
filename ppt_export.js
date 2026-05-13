/* ═══════════════════════════════════════════════════════════════════
   PPT EXPORT v5.0 — MODERN REDESIGN + AI REKOMENDASI
   IH Dashboard · Pertamina Patra Niaga III
   AI Rekomendasi: Kemenaker Permenaker No.5/2018 + ACGIH TLV/BEI
   Konteks Khusus: Pekerjaan Pelaut / Marine Industry
   ─────────────────────────────────────────────────────────────────
   Slides HRA  : Cover · Eksekutif · Trend · Distribusi ·
                  AI Rekomendasi · AI Detail · Data Table · Penutup
   Slides DAT  : Cover · Eksekutif · Trend · Analisis ·
                  AI Rekomendasi · Regulasi Detail · Data Table · Penutup
   Slides Pest : Cover · Eksekutif · Trend · Distribusi ·
                  AI Rekomendasi · Regulasi Detail · Data Table · Penutup
═══════════════════════════════════════════════════════════════════ */

/* ── PREMIUM PALETTE ── */
var C = {
  navy:"0A1628", navyMid:"0F2044", navyLight:"162B55",
  blue:"0066CC", blueMid:"1A7FD4", blueLight:"EBF5FF", blueSoft:"DBEAFE",
  teal:"00B4D8", tealDark:"0077A8", tealSoft:"CCEEFF",
  gold:"F4A261", goldDark:"D4753B", goldSoft:"FFF3E5",
  red:"E63946",  redDark:"C1121F",  redSoft:"FFEAEC",
  green:"2DC653",greenDark:"1A8C38",greenSoft:"E3FAEB",
  orange:"F77F00",orangeSoft:"FFF0DC",
  purple:"7B2FBE",purpleSoft:"F3E8FF",
  white:"FFFFFF",offWhite:"F8FAFD",
  text:"1A1A2E", textMid:"374151", textMuted:"8899AB",
  border:"E2E8F0",
  kemenaker:"CC2B2B", acgih:"1B5E8A",
};

var BULAN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function fmtRp(n){n=parseFloat(n)||0;if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";return"Rp "+Math.round(n).toLocaleString("id-ID");}
function getDate(){return new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}
function getBulanLabel(){var b=document.getElementById("hra-filter-bulan")&&document.getElementById("hra-filter-bulan").value;if(b)return b+" 2026";var now=new Date();return BULAN[now.getMonth()]+" "+now.getFullYear();}
function shdw(){return{type:"outer",blur:10,offset:3,angle:135,color:"000000",opacity:0.12};}

/* ═══════════════════════════════════════════════════════════════════
   AI REKOMENDASI ENGINE
   Berbasis: Kemenaker Permenaker No.5/2018 & ACGIH TLV/BEI 2024
   Konteks: Pekerjaan Pelaut / Marine Industry
═══════════════════════════════════════════════════════════════════ */
var AI_DB = {
  kebisingan:{
    label:"Kebisingan (Noise)",
    nab_km:"85 dB(A) / 8 jam",tlv_ac:"85 dB(A) TWA-8h",
    ref_km:"Permenaker No.5/2018 Lamp.I Tabel 1",ref_ac:"ACGIH TLV Noise 2024",
    marine:"Kamar mesin ≤85 dB(A) · Anjungan ≤55 dB(A) · Kamar tidur ≤60 dB(A) (ILO MLC 2006 B4.3)",
    reks:["Audit noise level periodik 6 bln di kamar mesin, generator & pompa (target <85 dB(A))",
          "Pasang isolasi akustik pada bulkhead & deckplate kamar mesin untuk reduksi >5 dB(A)",
          "Wajibkan APD pendengaran (earplug NRR ≥25 dB) pada paparan >85 dB(A); double protection >105 dB(A)",
          "Terapkan hearing conservation program: audiometri pra-kerja, berkala tiap 12 bulan & purna bakti",
          "Rotasi jaga 4 jam ON/OFF di zona bising sesuai MLC 2006 Work & Rest Hours Reg.2.3"],
  },
  getaran:{
    label:"Getaran (Vibration)",
    nab_km:"HAV 4 m/s² · WBV 0.5 m/s²",tlv_ac:"HAV TLV 4 m/s² A(8)",
    ref_km:"Permenaker No.5/2018 Lamp.I Tabel 3 & 4",ref_ac:"ACGIH TLV HAV & WBV 2024",
    marine:"Getaran mesin kapal (WBV), winch/crane (HAV); risiko HAVS & cedera tulang belakang pelaut",
    reks:["Pasang vibration damping mount pada mesin & pompa; evaluasi HAV tiap 12 bulan",
          "Gunakan anti-vibration gloves (ISO 10819) saat operasional winch, crane & deck equipment",
          "Batasi paparan HAV: rotasi operator tiap 2 jam; istirahat 15 mnt/jam pada getaran >2.5 m/s²",
          "Lakukan surveillance kesehatan: vascular & neurologi untuk crew terpapar >2 tahun",
          "Perawatan rutin mesin untuk mencegah peningkatan vibrasi di luar spesifikasi IMO"],
  },
  "iklim kerja":{
    label:"Iklim Kerja / Heat Stress",
    nab_km:"ISBB 28–31°C sesuai beban kerja",tlv_ac:"WBGT TLV 25–31°C",
    ref_km:"Permenaker No.5/2018 Lamp.I Tabel 2",ref_ac:"ACGIH TLV Heat Stress & Strain 2024",
    marine:"Kamar mesin >45°C; rute tropis; risiko heat exhaustion & heat stroke pada ABK",
    reks:["Pasang ventilasi mekanis & AC di kamar mesin (target <35°C) & ruang kerja kritis",
          "Sediakan cool rest area tiap jam; wajibkan minum air ≥250 ml per 20 menit di zona panas",
          "Terapkan heat acclimatization 7–14 hari untuk crew baru bergabung di kapal tropis",
          "Monitor WBGT real-time; hentikan kerja berat jika WBGT >31°C tanpa PPE heat protective",
          "Heat stress emergency protocol: ice towel, oral rehydration & evakuasi medis"],
  },
  pencahayaan:{
    label:"Pencahayaan (Lighting)",
    nab_km:"Min 200 lux (kerja umum); 500 lux (presisi)",tlv_ac:"Referensi IESNA RP-1",
    ref_km:"Permenaker No.5/2018 Lamp.I Tabel 5",ref_ac:"ACGIH Ergonomics of Lighting",
    marine:"Anjungan <5 lux (malam); cargo deck ≥200 lux; kamar mesin ≥300 lux (SOLAS Reg.II-1)",
    reks:["Audit iluminasi periodik: anjungan (malam <5 lux), kamar mesin (>300 lux), cargo deck (>200 lux)",
          "Gunakan LED nautical lighting anti-glare untuk cegah visual fatigue officer jaga malam",
          "Pasang emergency lighting redundan sesuai SOLAS Ch.II-1 Reg.42 minimal 3 jam backup",
          "Evaluasi glare index (UGR<19) di ruang kontrol & bridge untuk cegah computer vision syndrome",
          "Sediakan kacamata anti-silau & anti-UV untuk crew deck di siang hari tropis"],
  },
  "radiasi uv":{
    label:"Radiasi UV (Ultraviolet)",
    nab_km:"30 J/m² per hari (UVB)",tlv_ac:"UV TLV 3–30 mJ/cm² tergantung λ",
    ref_km:"Permenaker No.5/2018 (Radiasi non-ionisasi)",ref_ac:"ACGIH TLV UV Radiation 2024",
    marine:"Refleksi air laut meningkatkan UVI 25–30; pelaut 3× risiko melanoma vs populasi umum (WHO)",
    reks:["Wajibkan sunscreen SPF ≥50 PA+++ saat UVI >6 (monitor UV Index BMKG harian)",
          "Pakaian UPF ≥50+ & topi brim lebar 7.5 cm untuk ABK deck terbuka >1 jam/hari",
          "Kacamata UV400 wajib; hindari kerja deck pukul 10.00–14.00 di perairan tropis",
          "Pemeriksaan kulit tahunan (dermatoskopi) crew dengan masa dinas laut >5 tahun",
          "Pasang kanopi/awning permanen di area kerja deck yang sering digunakan"],
  },
  "bahan kimia":{
    label:"Bahan Kimia / Chemical",
    nab_km:"Benzena 0.5 ppm · H₂S 1 ppm · CO 25 ppm",tlv_ac:"Benzene A1 0.5 ppm · H₂S 1 ppm TWA",
    ref_km:"Permenaker No.5/2018 Lamp.I (NAB kimia)",ref_ac:"ACGIH TLV-BEI 2024",
    marine:"Benzene saat loading; H₂S di cargo tank; CO dari exhaust; VOC dari cat kapal tanker",
    reks:["Pasang fixed gas detector H₂S & LEL di cargo tank & pump room; alarm >1 ppm H₂S",
          "Wajibkan SCBA & chemical-resistant gloves saat entry cargo tank & confined space",
          "Lakukan personal air sampling (PAS) per voyage untuk crew pump room & cargo officer",
          "Biological monitoring: urine phenol (benzene) & COHb (CO) tiap 6 bulan",
          "Pastikan ventilasi mekanik ≥20 ACH di cargo control room & pump room saat operasi"],
  },
  ergonomi:{
    label:"Ergonomi / Musculoskeletal",
    nab_km:"Manual handling >25 kg (laki-laki)",tlv_ac:"ACGIH TLV HAL & NIOSH Lifting",
    ref_km:"Permenaker No.5/2018 (Ergonomi)",ref_ac:"ACGIH TLV HAL 2024; NIOSH REL Lifting",
    marine:"Postur canggung di confined space; manual handling tali/jangkar; MSDs pada punggung pelaut",
    reks:["Ergonomic assessment (REBA/RULA) di workstation kritis: anjungan, kamar mesin, crane",
          "Pasang mechanical aids: block & tackle, mooring winch assist untuk operasi tali >15 kg",
          "Latihan body mechanics & stretching wajib 10 menit pre-shift untuk crew deck & engine",
          "Desain ulang workstation kamar mesin: tinggi optimal 90–110 cm, anti-fatigue mat",
          "Medical surveillance MSDs tiap 12 bulan; fisioterapi untuk kasus keluhan punggung"],
  },
  psikososial:{
    label:"Psikososial / Mental Health",
    nab_km:"SE Menaker No.5/2021 (K3 Mental)",tlv_ac:"ACGIH TLV Psychosocial Hazards 2024",
    ref_km:"SE Menaker No.5/2021; Permenaker No.5/2018 Pasal 10",ref_ac:"ACGIH Work Organization 2024",
    marine:"Isolasi sosial 6–9 bulan; fatigue MLC 2006; risiko depresi 2.3× populasi umum (WHO)",
    reks:["Implementasi MLC 2006 Reg.2.3: max 14 jam kerja/hari, min 10 jam istirahat; log wajib",
          "Sediakan akses internet/video call untuk crew tiap 48 jam; dukung koneksi keluarga",
          "Fatigue Risk Management System (FRMS): monitoring fatigue score sebelum jaga anjungan",
          "Wellbeing program: psikolog maritim konsultasi daring bulanan; peer support crew",
          "Sosialisasi MLC 2006 hak-hak psikososial kepada seluruh crew saat pre-joining"],
  },
  "ruang terbatas":{
    label:"Confined Space / Ruang Terbatas",
    nab_km:"O₂ 19.5–23.5%; LEL <10%",tlv_ac:"OSHA 29 CFR 1910.146; ACGIH Vent. Manual",
    ref_km:"Permenaker No.5/2018 & No.26/2014 (Confined Space)",ref_ac:"ACGIH Industrial Ventilation 31st Ed.",
    marine:"Cargo tank, pump room, ballast tank; risiko oxygen deficiency & H₂S di tanker",
    reks:["Wajibkan Permit to Work sesuai Permenaker No.26/2014 untuk setiap entry",
          "Atmospheric testing SEBELUM entry: O₂, LEL, H₂S (<1 ppm), CO (<25 ppm)",
          "Standby rescue team dengan SCBA & lifeline di luar ruang terbatas setiap saat",
          "Ventilasi mekanis minimal 20 menit sebelum entry; pertahankan selama dalam ruang",
          "Pelatihan confined space rescue tiap 12 bulan; drill skenario kapal tanker"],
  },
  biologi:{
    label:"Faktor Biologi / Biological",
    nab_km:"KEPMENKES No.431/2007 Sanitasi Kapal",tlv_ac:"ACGIH TLV Bioaerosols 2024",
    ref_km:"KEPMENKES No.431/2007; Permenaker No.5/2018",ref_ac:"ACGIH Bioaerosols 2024; WHO Ship San.",
    marine:"Legionella di sistem air kapal; biofilm tangki air minum; infeksi silang crew ruang sempit",
    reks:["Klorinasi tangki air tawar: residual chlorine 0.2–0.5 mg/L sesuai WHO guideline",
          "Thermal disinfeksi sistem air panas ≥60°C untuk cegah Legionella (IHO guidelines)",
          "Desinfeksi ruang awak dengan UV-C/fogging minimal tiap masuk pelabuhan baru",
          "Vaksinasi wajib: Hepatitis A&B, Tifoid, Yellow Fever (rute Afrika/Amerika) sesuai IHR 2005",
          "Pemeriksaan pre-join: TCM/Rontgen TBC, serologi; isolasi kasus suspek"],
  },
  default:{
    label:"General IH Hazard",
    nab_km:"Permenaker No.5/2018 (komprehensif)",tlv_ac:"ACGIH TLV & BEI 2024",
    ref_km:"Permenaker No.5/2018 K3 Lingkungan Kerja",ref_ac:"ACGIH TLV & BEI Booklet 2024",
    marine:"Multi-hazard pada pekerjaan kapal: fisika, kimia, biologi, ergonomi & psikososial",
    reks:["Lakukan HRA komprehensif per kapal sesuai Permenaker No.5/2018 minimal 1× per tahun",
          "Pastikan semua crew mendapat APD sesuai jenis pekerjaan dan NAB/TLV yang berlaku",
          "Implementasikan IH Monitoring Program: sampling, analisa lab & medical surveillance",
          "Latih safety officer kapal: HIRAC, penggunaan alat ukur & interpretasi hasil IH",
          "Dokumentasikan hasil monitoring IH dalam SMS sesuai ISM Code (SOLAS Ch.IX)"],
  },
};

var AI_PATTERNS = {
  kebisingan:["bising","noise","kebisingan","db","decibel","sound"],
  getaran:["getar","vibrat","havs","wbv"],
  "iklim kerja":["panas","heat","iklim","isbb","wbgt","suhu","thermal"],
  pencahayaan:["cahaya","light","lux","pencahayaan","iluminas"],
  "radiasi uv":["uv","ultraviolet","radiasi","solar","sinar"],
  "bahan kimia":["kimia","chemical","benzene","h2s","co","voc","gas","uap","fumes","hidrokarbon"],
  ergonomi:["ergon","msd","nyeri","punggung","postur","angkat","manual"],
  psikososial:["stres","stress","fatigue","lelah","mental","psiko","isolasi"],
  "ruang terbatas":["confined","ruang terbatas","tangki","tank","pump room","ballast","void"],
  biologi:["biologi","bakteri","virus","legionell","biofilm","sanitasi","infeksi","hama","kecoa","tikus"],
};

function aiGen(hazList, modType) {
  var matched = {};
  var raw = (hazList||[]).map(function(h){return(h||"").toLowerCase();});
  raw.forEach(function(hz){
    Object.keys(AI_PATTERNS).forEach(function(key){
      if(AI_PATTERNS[key].some(function(p){return hz.includes(p);})) matched[key]=(matched[key]||0)+1;
    });
  });
  if(modType==="dat"&&!matched.psikososial) matched.psikososial=1;
  if(modType==="pest"&&!matched.biologi) matched.biologi=1;
  if(modType==="hra"){
    if(!matched["ruang terbatas"]) matched["ruang terbatas"]=0.5;
    if(!matched.kebisingan) matched.kebisingan=0.5;
    if(!matched["bahan kimia"]) matched["bahan kimia"]=0.5;
  }
  var sorted=Object.keys(matched).sort(function(a,b){return matched[b]-matched[a];});
  var topKeys=sorted.length?sorted.slice(0,3):["default"];
  return topKeys.map(function(k){return AI_DB[k]||AI_DB.default;});
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED BUILDERS
═══════════════════════════════════════════════════════════════════ */
function addCover(pres,t1,t2,sub,label,stats){
  var s=pres.addSlide();
  s.background={color:C.navy};
  s.addShape(pres.ShapeType.rect,{x:5.5,y:0,w:4.5,h:5.63,fill:{color:C.navyMid},line:{color:C.navyMid}});
  s.addShape(pres.ShapeType.rect,{x:6.8,y:0,w:3.2,h:5.63,fill:{color:C.navyLight},line:{color:C.navyLight}});
  s.addShape(pres.ShapeType.ellipse,{x:7.2,y:-1.4,w:4.2,h:4.2,fill:{color:C.blue,transparency:82},line:{color:C.blue,transparency:75}});
  s.addShape(pres.ShapeType.ellipse,{x:8.1,y:-0.5,w:2.4,h:2.4,fill:{color:C.teal,transparency:78},line:{color:C.teal,transparency:72}});
  s.addShape(pres.ShapeType.ellipse,{x:-0.8,y:3.8,w:3.0,h:3.0,fill:{color:C.blue,transparency:85},line:{color:C.blue,transparency:80}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:10,h:0.06,fill:{color:C.teal},line:{color:C.teal}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:5.63,fill:{color:C.teal},line:{color:C.teal}});
  s.addShape(pres.ShapeType.rect,{x:0.4,y:0.42,w:0.7,h:0.7,fill:{color:C.teal},line:{color:C.teal},shadow:shdw()});
  s.addText("⚓",{x:0.4,y:0.42,w:0.7,h:0.7,fontSize:20,align:"center",valign:"middle",color:C.white});
  s.addText("PERTAMINA PATRA NIAGA",{x:1.25,y:0.46,w:6,h:0.3,fontSize:9.5,bold:true,color:C.white,charSpacing:3,valign:"middle"});
  s.addText("Industrial Hygiene Department · Health Division III",{x:1.25,y:0.76,w:6,h:0.25,fontSize:8.5,color:C.teal,valign:"middle"});
  s.addText(t1,{x:0.4,y:1.35,w:6.5,h:0.72,fontSize:38,bold:true,color:C.white,fontFace:"Calibri Light"});
  s.addText(t2,{x:0.4,y:2.05,w:6.5,h:0.52,fontSize:22,bold:true,color:C.teal,fontFace:"Calibri Light"});
  s.addText(sub,{x:0.4,y:2.65,w:6.0,h:0.32,fontSize:10.5,color:"8BBAD4",italic:true});
  s.addShape(pres.ShapeType.rect,{x:0.4,y:3.15,w:2.5,h:0.52,fill:{color:C.teal},line:{color:C.teal}});
  s.addText(label.toUpperCase(),{x:0.4,y:3.15,w:2.5,h:0.52,fontSize:11,bold:true,color:C.navy,align:"center",valign:"middle",charSpacing:1.5});
  stats.forEach(function(st,i){
    var x=0.4+i*2.15;
    s.addShape(pres.ShapeType.rect,{x:x,y:3.92,w:2.0,h:1.12,fill:{color:C.navyLight,transparency:20},line:{color:C.teal,transparency:55}});
    s.addShape(pres.ShapeType.rect,{x:x,y:3.92,w:0.07,h:1.12,fill:{color:C.teal},line:{color:C.teal}});
    s.addText(st.val,{x:x+0.14,y:3.96,w:1.8,h:0.55,fontSize:st.val.length>7?16:26,bold:true,color:C.white,fontFace:"Calibri"});
    s.addText(st.label,{x:x+0.14,y:4.5,w:1.8,h:0.45,fontSize:8.5,color:C.teal,valign:"top"});
  });
  s.addText("IH DASHBOARD\n2026",{x:6.8,y:1.2,w:3.0,h:2.5,fontSize:42,bold:true,color:C.white,align:"center",valign:"middle",transparency:88,fontFace:"Calibri Light"});
  s.addText("Prepared by: IH Admin  ·  "+getDate()+"  ·  CONFIDENTIAL",{x:0.4,y:5.1,w:9,h:0.22,fontSize:7.5,color:"4A6880",italic:true});
}

function addHdr(s,pres,title,sub){
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:10,h:1.0,fill:{color:C.navy},line:{color:C.navy}});
  s.addShape(pres.ShapeType.rect,{x:7.5,y:0,w:2.5,h:1.0,fill:{color:C.navyMid},line:{color:C.navyMid}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0.94,w:10,h:0.06,fill:{color:C.teal},line:{color:C.teal}});
  s.addText(title,{x:0.38,y:0.1,w:8.8,h:0.46,fontSize:16,bold:true,color:C.white,valign:"middle"});
  s.addText(sub,{x:0.38,y:0.55,w:8.8,h:0.3,fontSize:8.5,color:C.teal,valign:"middle"});
  s.addShape(pres.ShapeType.ellipse,{x:9.0,y:0.15,w:0.7,h:0.7,fill:{color:C.teal,transparency:70},line:{color:C.teal,transparency:55}});
}

function addFtr(s,pres,mod,label,pg,total){
  s.addShape(pres.ShapeType.rect,{x:0,y:5.36,w:10,h:0.27,fill:{color:C.navy},line:{color:C.navy}});
  s.addShape(pres.ShapeType.rect,{x:0,y:5.36,w:10,h:0.03,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("PERTAMINA PATRA NIAGA — "+mod+" | "+label+" | RAHASIA & TERBATAS",{x:0.3,y:5.38,w:7.5,h:0.23,fontSize:7,color:"4A6880",valign:"middle"});
  s.addText(pg+" / "+total,{x:8.5,y:5.38,w:1.2,h:0.23,fontSize:8,color:C.teal,align:"right",valign:"middle",bold:true});
}

function kpi(s,pres,x,y,w,h,label,val,color,icon){
  s.addShape(pres.ShapeType.rect,{x:x,y:y,w:w,h:h,fill:{color:C.white},line:{color:C.border,pt:0.8},shadow:shdw()});
  s.addShape(pres.ShapeType.rect,{x:x,y:y,w:w,h:0.08,fill:{color:color},line:{color:color}});
  s.addShape(pres.ShapeType.ellipse,{x:x+0.12,y:y+0.16,w:0.52,h:0.52,fill:{color:color,transparency:88},line:{color:color,transparency:70}});
  s.addText(icon,{x:x+0.12,y:y+0.16,w:0.52,h:0.52,fontSize:16,align:"center",valign:"middle"});
  var fs=val.length>8?(val.length>12?12:16):22;
  s.addText(val,{x:x+0.08,y:y+h-0.76,w:w-0.16,h:0.5,fontSize:fs,bold:true,color:color,align:"center",fontFace:"Calibri"});
  s.addText(label,{x:x+0.08,y:y+h-0.27,w:w-0.16,h:0.24,fontSize:8,color:C.textMuted,align:"center"});
}

function addAiSlide(pres,mod,hazList,modType,blbl,pg,tot){
  var s=pres.addSlide();
  s.background={color:C.offWhite};
  addHdr(s,pres,"AI REKOMENDASI — REGULASI & STANDAR INTERNASIONAL",mod+" · Analisis otomatis berbasis hazard teridentifikasi — "+blbl);
  addFtr(s,pres,mod,blbl,pg,tot);

  s.addShape(pres.ShapeType.rect,{x:0.25,y:1.1,w:9.5,h:0.46,fill:{color:C.navy},line:{color:C.navy},shadow:shdw()});
  s.addShape(pres.ShapeType.rect,{x:0.25,y:1.1,w:0.36,h:0.46,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("🤖  AI REKOMENDASI · Kemenaker Permenaker No.5/2018 & ACGIH TLV/BEI 2024 · Konteks: Pelaut / Marine Industry",{x:0.68,y:1.12,w:8.9,h:0.4,fontSize:8.5,bold:true,color:C.white,valign:"middle"});

  var results=aiGen(hazList,modType);
  var cols=[C.teal,C.blue,C.gold];

  results.forEach(function(res,ri){
    var yB=1.72+ri*1.27;
    var col=cols[ri]||C.blue;
    s.addShape(pres.ShapeType.rect,{x:0.25,y:yB,w:9.5,h:1.18,fill:{color:C.white},line:{color:col,pt:1},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:0.25,y:yB,w:0.12,h:1.18,fill:{color:col},line:{color:col}});
    s.addText("⚠  "+res.label.toUpperCase(),{x:0.48,y:yB+0.07,w:5.5,h:0.26,fontSize:9.5,bold:true,color:col,valign:"middle"});
    s.addShape(pres.ShapeType.rect,{x:6.0,y:yB+0.07,w:1.75,h:0.22,fill:{color:C.kemenaker,transparency:90},line:{color:C.kemenaker,pt:0.5}});
    s.addText("Kemenaker: "+res.nab_km,{x:6.02,y:yB+0.07,w:1.73,h:0.22,fontSize:6.5,color:C.kemenaker,valign:"middle"});
    s.addShape(pres.ShapeType.rect,{x:7.85,y:yB+0.07,w:1.85,h:0.22,fill:{color:C.acgih,transparency:90},line:{color:C.acgih,pt:0.5}});
    s.addText("ACGIH TLV: "+res.tlv_ac,{x:7.87,y:yB+0.07,w:1.83,h:0.22,fontSize:6.5,color:C.acgih,valign:"middle"});
    s.addText("⛵ "+res.marine,{x:0.48,y:yB+0.33,w:9.1,h:0.22,fontSize:7.5,color:C.textMuted,italic:true,valign:"middle"});
    res.reks.slice(0,2).forEach(function(rec,reci){
      var ry=yB+0.57+reci*0.28;
      s.addShape(pres.ShapeType.ellipse,{x:0.47,y:ry+0.04,w:0.17,h:0.17,fill:{color:col},line:{color:col}});
      s.addText(String(reci+1),{x:0.47,y:ry+0.04,w:0.17,h:0.17,fontSize:7,bold:true,color:C.white,align:"center",valign:"middle"});
      s.addText(rec,{x:0.72,y:ry,w:8.9,h:0.25,fontSize:8.5,color:C.textMid,valign:"middle"});
    });
    s.addText("Ref: "+res.ref_km+"  |  "+res.ref_ac,{x:0.48,y:yB+1.0,w:9.0,h:0.14,fontSize:6.5,color:"AABBC8",italic:true,valign:"middle"});
  });
}

function addAiDetailSlide(pres,mod,hazList,modType,blbl,pg,tot){
  var s=pres.addSlide();
  s.background={color:C.offWhite};
  addHdr(s,pres,"AI REKOMENDASI DETAIL — KEMENAKER & ACGIH",mod+" · Rincian lengkap tindakan korektif untuk Pelaut — "+blbl);
  var results=aiGen(hazList,modType);
  var cols=[C.teal,C.blue,C.gold];
  results.forEach(function(res,ri){
    var col=cols[ri]||C.blue;
    var xOff=ri*3.22;
    s.addShape(pres.ShapeType.rect,{x:0.22+xOff,y:1.16,w:3.0,h:0.48,fill:{color:col},line:{color:col}});
    s.addText(res.label,{x:0.24+xOff,y:1.18,w:2.96,h:0.44,fontSize:9,bold:true,color:C.white,align:"center",valign:"middle"});
    res.reks.forEach(function(rec,reci){
      var ry=1.70+reci*0.76;
      s.addShape(pres.ShapeType.rect,{x:0.22+xOff,y:ry,w:3.0,h:0.68,fill:{color:C.white},line:{color:col,transparency:70,pt:0.8},shadow:shdw()});
      s.addShape(pres.ShapeType.rect,{x:0.22+xOff,y:ry,w:0.08,h:0.68,fill:{color:col},line:{color:col}});
      s.addShape(pres.ShapeType.ellipse,{x:0.36+xOff,y:ry+0.22,w:0.22,h:0.22,fill:{color:col,transparency:80},line:{color:col}});
      s.addText(String(reci+1),{x:0.36+xOff,y:ry+0.22,w:0.22,h:0.22,fontSize:7,bold:true,color:col,align:"center",valign:"middle"});
      s.addText(rec,{x:0.65+xOff,y:ry+0.05,w:2.5,h:0.58,fontSize:7.8,color:C.textMid,valign:"middle"});
    });
    var rBot=1.70+5*0.76;
    s.addShape(pres.ShapeType.rect,{x:0.22+xOff,y:rBot,w:3.0,h:0.52,fill:{color:col,transparency:92},line:{color:col,pt:0.5}});
    s.addText("📌 "+res.ref_km,{x:0.28+xOff,y:rBot+0.02,w:2.88,h:0.22,fontSize:6.5,color:C.kemenaker});
    s.addText("📎 "+res.ref_ac,{x:0.28+xOff,y:rBot+0.25,w:2.88,h:0.22,fontSize:6.5,color:C.acgih});
  });
  addFtr(s,pres,mod,blbl,pg,tot);
}

function addClosing(pres,mod,blbl,actions,schedNote,pg,tot){
  var s=pres.addSlide();
  s.background={color:C.navy};
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:10,h:5.63,fill:{color:C.navyMid},line:{color:C.navyMid}});
  s.addShape(pres.ShapeType.ellipse,{x:6.5,y:-1.2,w:5.0,h:5.0,fill:{color:C.navy},line:{color:C.navy}});
  s.addShape(pres.ShapeType.ellipse,{x:7.2,y:-0.5,w:3.2,h:3.2,fill:{color:C.blue,transparency:75},line:{color:C.blue,transparency:68}});
  s.addShape(pres.ShapeType.ellipse,{x:-1.0,y:3.5,w:3.5,h:3.5,fill:{color:C.teal,transparency:80},line:{color:C.teal,transparency:75}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:10,h:0.06,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("TINDAK LANJUT & REKOMENDASI",{x:0.5,y:0.25,w:9,h:0.55,fontSize:20,bold:true,color:C.white,fontFace:"Calibri Light",charSpacing:1});
  s.addText(mod+" · "+blbl,{x:0.5,y:0.78,w:9,h:0.28,fontSize:9.5,color:C.teal});
  actions.slice(0,4).forEach(function(a,i){
    var col=i%2,row=Math.floor(i/2);
    var x=0.3+col*4.85,y=1.22+row*1.3;
    s.addShape(pres.ShapeType.rect,{x:x,y:y,w:4.55,h:1.12,fill:{color:C.navyLight,transparency:10},line:{color:C.teal,transparency:55},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:x,y:y,w:0.08,h:1.12,fill:{color:C.teal},line:{color:C.teal}});
    s.addShape(pres.ShapeType.ellipse,{x:x+0.18,y:y+0.32,w:0.44,h:0.44,fill:{color:C.teal,transparency:72},line:{color:C.teal,transparency:60}});
    s.addText(String(i+1),{x:x+0.18,y:y+0.32,w:0.44,h:0.44,fontSize:13,bold:true,color:C.white,align:"center",valign:"middle"});
    s.addText(a,{x:x+0.72,y:y+0.16,w:3.72,h:0.78,fontSize:9.5,color:C.white,valign:"middle"});
  });
  s.addShape(pres.ShapeType.rect,{x:0.3,y:3.92,w:9.4,h:1.22,fill:{color:C.teal,transparency:90},line:{color:C.teal,transparency:55}});
  s.addShape(pres.ShapeType.rect,{x:0.3,y:3.92,w:0.08,h:1.22,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("📅  PERIODE MONITORING BERIKUTNYA",{x:0.52,y:3.99,w:8.8,h:0.3,fontSize:10,bold:true,color:C.white});
  s.addText(schedNote,{x:0.52,y:4.30,w:8.8,h:0.74,fontSize:9.5,color:"CCDDE8"});
  addFtr(s,pres,mod,blbl,pg,tot);
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT HRA & IH — 8 SLIDES
═══════════════════════════════════════════════════════════════════ */
function exportHRAPPT(){
  if(!window.PptxGenJS){showToast("PptxGenJS belum siap.","error");return;}
  var data=(typeof filteredHRA!=="undefined"&&filteredHRA.length>0)?filteredHRA:[];
  if(!data.length){showToast("Tidak ada data HRA untuk diekspor.","error");return;}
  showToast("🤖 AI menyusun rekomendasi PPT HRA & IH...","info");

  var pres=new PptxGenJS();
  pres.layout="LAYOUT_16x9";pres.author="IH Dashboard — Pertamina Patra Niaga";pres.title="Laporan HRA & IH";
  var blbl=getBulanLabel(),TOTAL=85,MOD="HRA & IH",PT=8;

  var done=new Set(data.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
  var belum=TOTAL-done;
  var budget=data.reduce(function(s,r){return s+(parseFloat(r["Est Budget"])||0);},0);
  var cvg=((done/TOTAL)*100).toFixed(1);
  var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
  data.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
  var byBln={};BULAN.forEach(function(b){byBln[b]=0;});
  data.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&byBln[b]!==undefined)byBln[b]++;});
  var hazMap={};
  data.forEach(function(r){var h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){hazMap[hz]=(hazMap[hz]||0)+1;});});
  var hazSorted=Object.keys(hazMap).map(function(k){return[k,hazMap[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  var hazList=hazSorted.map(function(h){return h[0];});

  /* S1 Cover */
  addCover(pres,"LAPORAN HRA","& IH MONITORING","Health Risk Assessment & Industrial Hygiene — Kapal Milik PIS",blbl,
    [{val:String(TOTAL),label:"Total Kapal"},{val:String(done),label:"Sudah Monitoring"},{val:cvg+"%",label:"Coverage"}]);

  /* S2 Eksekutif */
  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"RINGKASAN EKSEKUTIF","Ikhtisar kinerja IH Monitoring armada kapal — "+blbl);
    [{label:"Total Kapal",val:String(TOTAL),color:C.blue,icon:"🚢"},
     {label:"Sudah Monitoring",val:String(done),color:C.green,icon:"✅"},
     {label:"Belum Monitoring",val:String(belum),color:C.orange,icon:"⏳"},
     {label:"Coverage",val:cvg+"%",color:C.teal,icon:"📊"},
     {label:"Est. Budget",val:fmtRp(budget),color:C.purple,icon:"💰"},
    ].forEach(function(k,i){kpi(s,pres,0.18+i*1.94,1.08,1.72,1.55,k.label,k.val,k.color,k.icon);});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:2.79,w:9.64,h:0.08,fill:{color:C.border},line:{color:C.border}});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:2.79,w:Math.max(0.1,9.64*(done/TOTAL)),h:0.08,fill:{color:C.teal},line:{color:C.teal}});
    s.addText("Coverage "+cvg+"% dari target "+TOTAL+" kapal armada",{x:0.18,y:2.88,w:9.64,h:0.2,fontSize:8,color:C.textMuted});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:3.12,w:5.85,h:2.12,fill:{color:C.white},line:{color:C.border,pt:0.8},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:3.12,w:0.1,h:2.12,fill:{color:C.blue},line:{color:C.blue}});
    s.addText("📋  TEMUAN UTAMA",{x:0.4,y:3.2,w:5.5,h:0.3,fontSize:10,bold:true,color:C.navy});
    s.addText(["Coverage monitoring "+cvg+"% dari "+TOTAL+" kapal armada PIS",
      "Sudah monitoring: "+done+" kapal — Belum: "+belum+" kapal",
      hazSorted.length?"Hazard dominan: "+hazSorted[0][0]+" ("+hazSorted[0][1]+" kasus)":"Belum ada data hazard",
      "Est. anggaran terserap: "+fmtRp(budget),
    ].map(function(f){return{text:f,options:{bullet:{type:"bullet"},breakLine:true,paraSpaceAfter:5}};}),
    {x:0.4,y:3.54,w:5.5,h:1.6,fontSize:9.5,color:C.textMid});
    s.addShape(pres.ShapeType.rect,{x:6.23,y:3.12,w:3.59,h:2.12,fill:{color:C.white},line:{color:C.border,pt:0.8},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:6.23,y:3.12,w:0.1,h:2.12,fill:{color:C.gold},line:{color:C.gold}});
    s.addText("⚡  REKOMENDASI",{x:6.43,y:3.2,w:3.2,h:0.3,fontSize:10,bold:true,color:C.goldDark});
    s.addText(["Percepat monitoring "+belum+" kapal tersisa",
      "Audit APD kapal hazard dominan",
      "Review jadwal vendor IH monitoring",
      "Lihat slide AI Rekomendasi untuk detail",
    ].map(function(r){return{text:r,options:{bullet:{type:"bullet"},breakLine:true,paraSpaceAfter:6}};}),
    {x:6.43,y:3.54,w:3.2,h:1.6,fontSize:9.5,color:C.textMid});
    addFtr(s,pres,MOD,blbl,2,PT);
  })();

  /* S3 Trend */
  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"TREND MONITORING PER BULAN","Frekuensi pelaksanaan HRA & IH sepanjang tahun 2026");
    s.addChart(pres.ChartType.bar,[{name:"Monitoring",labels:BULAN,values:BULAN.map(function(b){return byBln[b]||0;})}],{
      x:0.3,y:1.1,w:6.5,h:4.1,barDir:"col",chartColors:[C.teal],
      chartArea:{fill:{color:C.white}},catAxisLabelColor:C.textMuted,valAxisLabelColor:C.textMuted,
      valGridLine:{color:C.border,size:0.5},catGridLine:{style:"none"},
      showValue:true,dataLabelColor:C.navyMid,dataLabelFontSize:9,dataLabelFontBold:true,
      showLegend:false,catAxisLabelFontSize:8.5,barGapWidthPct:45,
    });
    var ytd=data.length,act=BULAN.filter(function(b){return(byBln[b]||0)>0;}).length;
    var avg=act?(ytd/act).toFixed(1):"0";
    [{label:"Total YTD",val:String(ytd),color:C.teal},
     {label:"Rata-rata/Bln",val:avg,color:C.green},
     {label:"Coverage",val:cvg+"%",color:C.blue},
     {label:"Target",val:String(TOTAL),color:C.navy},
    ].forEach(function(st,i){kpi(s,pres,7.0,1.12+i*1.0,2.75,0.9,st.label,st.val,st.color,"📈");});
    addFtr(s,pres,MOD,blbl,3,PT);
  })();

  /* S4 Distribusi */
  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DISTRIBUSI FLEET & TOP HAZARD","Sebaran armada per fleet dan hazard dominan teridentifikasi");
    s.addChart(pres.ChartType.doughnut,[{name:"Fleet",labels:Object.keys(fleets),values:Object.values(fleets)}],{
      x:0.2,y:1.1,w:4.2,h:3.85,chartColors:[C.teal,C.blue,C.gold,C.red],
      chartArea:{fill:{color:C.white}},showPercent:true,showLegend:true,legendPos:"b",
      legendFontSize:9,legendColor:C.textMid,dataLabelColor:C.white,dataLabelFontSize:9.5,dataLabelFontBold:true,holeSize:58,
      title:"Distribusi per Fleet",showTitle:true,titleFontSize:11,titleColor:C.navy,
    });
    var hc=[C.red,C.orange,C.blue,C.green,C.purple];
    s.addShape(pres.ShapeType.rect,{x:4.55,y:1.1,w:5.2,h:0.42,fill:{color:C.navy},line:{color:C.navy}});
    s.addText("🔥  TOP HAZARD TERIDENTIFIKASI",{x:4.65,y:1.14,w:5.0,h:0.3,fontSize:10,bold:true,color:C.white,valign:"middle"});
    if(!hazSorted.length)s.addText("Belum ada data hazard",{x:4.55,y:1.65,w:5.2,h:0.5,fontSize:11,color:C.textMuted,align:"center"});
    hazSorted.forEach(function(h,i){
      var y=1.6+i*0.67,maxV=hazSorted[0][1]||1,bW=Math.max(0.3,(h[1]/maxV)*3.5);
      s.addShape(pres.ShapeType.rect,{x:4.55,y:y,w:5.2,h:0.6,fill:{color:i%2===0?C.offWhite:C.white},line:{color:C.border,pt:0.5}});
      s.addShape(pres.ShapeType.ellipse,{x:4.62,y:y+0.12,w:0.36,h:0.36,fill:{color:hc[i]},line:{color:hc[i]}});
      s.addText(String(i+1),{x:4.62,y:y+0.12,w:0.36,h:0.36,fontSize:10,bold:true,color:C.white,align:"center",valign:"middle"});
      s.addText(h[0].length>30?h[0].slice(0,30)+"…":h[0],{x:5.06,y:y+0.04,w:3.2,h:0.28,fontSize:9.5,bold:true,color:C.text,valign:"middle"});
      s.addShape(pres.ShapeType.rect,{x:5.06,y:y+0.36,w:3.5,h:0.12,fill:{color:C.border},line:{color:C.border}});
      s.addShape(pres.ShapeType.rect,{x:5.06,y:y+0.36,w:bW,h:0.12,fill:{color:hc[i]},line:{color:hc[i]}});
      s.addText(h[1]+" kasus",{x:8.6,y:y+0.04,w:1.0,h:0.28,fontSize:8.5,color:hc[i],bold:true,align:"right",valign:"middle"});
    });
    addFtr(s,pres,MOD,blbl,4,PT);
  })();

  /* S5 AI Reko */
  addAiSlide(pres,MOD,hazList,"hra",blbl,5,PT);
  /* S6 AI Detail */
  addAiDetailSlide(pres,MOD,hazList,"hra",blbl,6,PT);

  /* S7 Data Table */
  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DATA MONITORING HRA & IH","Rekap data pelaksanaan monitoring seluruh kapal — "+blbl);
    var sd=data.slice(0,12);
    var hdr=["Nama Kapal","Fleet","Bulan","Vendor","Status","Est. Budget"].map(function(h){return{text:h,options:{fill:{color:C.navy},color:C.white,bold:true,fontSize:8.5,align:"center",valign:"middle"}};});
    var rows=[hdr];
    sd.forEach(function(r,ri){
      var isDone=(r["Status"]||"").toLowerCase()==="done",bg=ri%2===0?C.offWhite:C.white;
      rows.push([
        {text:r["Nama Kapal"]||"—",options:{fill:{color:bg},color:C.navy,bold:true,fontSize:8.5,align:"left",valign:"middle"}},
        {text:r["Jenis Fleet"]||"—",options:{fill:{color:bg},color:C.textMid,fontSize:8.5,align:"center",valign:"middle"}},
        {text:r["Bulan Pelaksanaan"]||"—",options:{fill:{color:bg},color:C.textMid,fontSize:8.5,align:"center",valign:"middle"}},
        {text:r["Vendor Pelaksana"]||"—",options:{fill:{color:bg},color:C.textMid,fontSize:8.5,align:"left",valign:"middle"}},
        {text:isDone?"✓ Done":"⏳ Proses",options:{fill:{color:isDone?C.greenSoft:C.orangeSoft},color:isDone?C.greenDark:C.orange,bold:true,fontSize:8.5,align:"center",valign:"middle"}},
        {text:fmtRp(r["Est Budget"]),options:{fill:{color:bg},color:C.blue,bold:true,fontSize:8.5,align:"right",valign:"middle"}},
      ]);
    });
    s.addTable(rows,{x:0.25,y:1.05,w:9.5,h:4.1,colW:[2.4,0.78,1.1,1.9,1.05,1.57],border:{pt:0.5,color:C.border},rowH:0.33});
    if(data.length>12)s.addText("... dan "+(data.length-12)+" data lainnya",{x:0.25,y:5.12,w:9.5,h:0.2,fontSize:8,color:C.textMuted,italic:true});
    addFtr(s,pres,MOD,blbl,7,PT);
  })();

  /* S8 Closing */
  addClosing(pres,MOD,blbl,
    ["Percepat jadwal monitoring "+belum+" kapal yang belum terlaksana",
     "Audit APD crew kapal dengan hazard dominan teridentifikasi",
     "Koordinasi vendor IH untuk optimasi jadwal monitoring bulanan",
     "Integrasikan AI Rekomendasi ke dalam SMS kapal (ISM Code)"],
    "Monitoring HRA & IH bulan berikutnya dimulai awal bulan. Koordinasikan vendor dan pastikan semua "+TOTAL+" kapal terjadwal. Hasil monitoring segera diunggah ke IH Dashboard untuk analisis real-time.",
    8,PT);

  pres.writeFile({fileName:"Laporan_HRA_IH_"+blbl.replace(/ /g,"_")+".pptx"})
    .then(function(){showToast("✅ PPT HRA & IH modern berhasil didownload!","success");})
    .catch(function(e){showToast("Gagal: "+e.message,"error");});
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT DAT — 8 SLIDES
═══════════════════════════════════════════════════════════════════ */
function exportDATPPT(){
  if(!window.PptxGenJS){showToast("PptxGenJS belum siap.","error");return;}
  var data=(typeof filteredDAT!=="undefined"&&filteredDAT.length>0)?filteredDAT:[];
  if(!data.length){showToast("Tidak ada data DAT.","error");return;}
  showToast("🤖 AI menyusun rekomendasi PPT DAT...","info");

  var pres=new PptxGenJS();pres.layout="LAYOUT_16x9";pres.title="Laporan DAT";
  var blbl=getBulanLabel(),TOTAL=85,MOD="Drugs & Alcohol Test",PT=8;

  var doneK=new Set(data.map(function(r){return r["Nama Kapal"];})).size;
  var belum=TOTAL-doneK;
  var crew=data.reduce(function(s,r){return s+(parseInt(r["Total Crew Diperiksa"])||0);},0);
  var pos=data.reduce(function(s,r){return s+(parseInt(r["Jumlah Crew Positif"])||0);},0);
  var neg=crew-pos;
  var biaya=data.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"])||0);},0);
  var cvg=((doneK/TOTAL)*100).toFixed(1);
  var posRate=crew>0?((pos/crew)*100).toFixed(1):"0.0";
  var byBln={};BULAN.forEach(function(b){byBln[b]=0;});
  data.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&byBln[b]!==undefined)byBln[b]++;});
  var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
  data.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});

  addCover(pres,"LAPORAN DAT","DRUGS & ALCOHOL TEST","Monitoring Narkoba & Alkohol — Crew Kapal Milik PIS",blbl,
    [{val:String(doneK),label:"Kapal Diperiksa"},{val:String(crew),label:"Total Crew"},{val:posRate+"%",label:"Tingkat Positif"}]);

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"RINGKASAN EKSEKUTIF","Ikhtisar hasil DAT armada kapal — "+blbl);
    [{label:"Kapal Diperiksa",val:String(doneK),color:C.blue,icon:"🚢"},
     {label:"Belum DAT",val:String(belum),color:C.orange,icon:"⏳"},
     {label:"Total Crew",val:String(crew),color:C.teal,icon:"👥"},
     {label:"Crew Positif",val:String(pos),color:C.red,icon:"⚠️"},
     {label:"Coverage",val:cvg+"%",color:C.green,icon:"📊"},
     {label:"Est. Biaya",val:fmtRp(biaya),color:C.purple,icon:"💰"},
    ].forEach(function(k,i){var col=i%3,row=Math.floor(i/3);kpi(s,pres,0.28+col*3.18,1.06+row*1.55,2.95,1.38,k.label,k.val,k.color,k.icon);});
    if(pos>0){s.addShape(pres.ShapeType.rect,{x:0.28,y:4.18,w:9.44,h:0.58,fill:{color:C.redSoft},line:{color:C.red,pt:1.5}});s.addText("⚠  "+pos+" crew terdeteksi positif. Lakukan tindakan sesuai STCW 2010 & MLC 2006 Reg.4.3 — Medical Care.",{x:0.5,y:4.22,w:9.0,h:0.48,fontSize:10,bold:true,color:C.red,valign:"middle"});}
    addFtr(s,pres,MOD,blbl,2,PT);
  })();

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"CREW TEST PER BULAN & HASIL TEST","Frekuensi DAT dan distribusi hasil negatif/positif");
    s.addChart(pres.ChartType.bar,[{name:"Kapal DAT",labels:BULAN,values:BULAN.map(function(b){return byBln[b]||0;})}],{
      x:0.3,y:1.1,w:6.0,h:4.1,barDir:"col",chartColors:[C.teal],chartArea:{fill:{color:C.white}},
      catAxisLabelColor:C.textMuted,valAxisLabelColor:C.textMuted,valGridLine:{color:C.border,size:0.5},catGridLine:{style:"none"},
      showValue:true,dataLabelColor:C.navyMid,dataLabelFontSize:9,dataLabelFontBold:true,showLegend:false,catAxisLabelFontSize:8.5,barGapWidthPct:45,
    });
    s.addChart(pres.ChartType.doughnut,[{name:"Hasil",labels:["Negatif","Positif"],values:[Math.max(0,neg),pos]}],{
      x:6.45,y:1.1,w:3.3,h:4.1,chartColors:[C.teal,C.red],chartArea:{fill:{color:C.white}},
      showPercent:true,showLegend:true,legendPos:"b",legendFontSize:9,dataLabelFontSize:10,dataLabelFontBold:true,holeSize:58,
      title:"Hasil Test",showTitle:true,titleFontSize:11,titleColor:C.navy,
    });
    addFtr(s,pres,MOD,blbl,3,PT);
  })();

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DISTRIBUSI FLEET & STATISTIK","Sebaran DAT per fleet & rekapitulasi crew");
    s.addChart(pres.ChartType.doughnut,[{name:"Fleet",labels:Object.keys(fleets),values:Object.values(fleets)}],{
      x:0.3,y:1.1,w:4.2,h:3.85,chartColors:[C.teal,C.blue,C.gold,C.red],chartArea:{fill:{color:C.white}},
      showPercent:true,showLegend:true,legendPos:"b",legendFontSize:9,holeSize:58,
      title:"Distribusi per Fleet",showTitle:true,titleFontSize:11,titleColor:C.navy,
    });
    [{label:"Total Kapal DAT",val:String(doneK),color:C.blue},
     {label:"Total Crew",val:String(crew),color:C.teal},
     {label:"Crew Negatif",val:String(Math.max(0,neg)),color:C.green},
     {label:"Crew Positif",val:String(pos),color:C.red},
     {label:"Tingkat Positif",val:posRate+"%",color:pos>0?C.red:C.green},
    ].forEach(function(st,i){kpi(s,pres,4.8,1.1+i*0.82,4.9,0.73,st.label,st.val,st.color,"📊");});
    addFtr(s,pres,MOD,blbl,4,PT);
  })();

  addAiSlide(pres,MOD,["psikososial","fatigue","stress","isolasi pelaut"],"dat",blbl,5,PT);
  addAiDetailSlide(pres,MOD,["psikososial","fatigue","mental health"],"dat",blbl,6,PT);

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DATA DRUGS & ALCOHOL TEST","Rekap data pelaksanaan DAT seluruh kapal — "+blbl);
    var sd=data.slice(0,11);
    var hdr=["Nama Kapal","Fleet","Bulan","Total Crew","Hasil","Crew Positif","Tindak Lanjut"].map(function(h){return{text:h,options:{fill:{color:C.navy},color:C.white,bold:true,fontSize:8,align:"center",valign:"middle"}};});
    var rows=[hdr];
    sd.forEach(function(r,ri){
      var isPos=(r["Hasil"]||"").toLowerCase()==="positif",bg=ri%2===0?C.offWhite:C.white;
      rows.push([
        {text:r["Nama Kapal"]||"—",options:{fill:{color:bg},color:C.navy,bold:true,fontSize:8,align:"left",valign:"middle"}},
        {text:r["Jenis Fleet"]||"—",options:{fill:{color:bg},color:C.textMid,fontSize:8,align:"center",valign:"middle"}},
        {text:r["Bulan Pelaksanaan"]||"—",options:{fill:{color:bg},color:C.textMid,fontSize:8,align:"center",valign:"middle"}},
        {text:String(parseInt(r["Total Crew Diperiksa"])||0),options:{fill:{color:bg},color:C.textMid,fontSize:8,align:"center",valign:"middle"}},
        {text:isPos?"⚠ Positif":"✓ Negatif",options:{fill:{color:isPos?C.redSoft:C.greenSoft},color:isPos?C.red:C.greenDark,bold:true,fontSize:8,align:"center",valign:"middle"}},
        {text:String(parseInt(r["Jumlah Crew Positif"])||0),options:{fill:{color:bg},color:isPos?C.red:C.textMid,bold:isPos,fontSize:8,align:"center",valign:"middle"}},
        {text:((r["Tindak Lanjut"]||"—").slice(0,40)),options:{fill:{color:bg},color:C.textMid,fontSize:7.5,align:"left",valign:"middle"}},
      ]);
    });
    s.addTable(rows,{x:0.25,y:1.05,w:9.5,h:4.1,colW:[2.0,0.7,0.9,0.88,0.88,0.82,2.32],border:{pt:0.5,color:C.border},rowH:0.34});
    if(data.length>11)s.addText("... dan "+(data.length-11)+" data lainnya",{x:0.25,y:5.12,w:9.5,h:0.2,fontSize:8,color:C.textMuted,italic:true});
    addFtr(s,pres,MOD,blbl,7,PT);
  })();

  addClosing(pres,MOD,blbl,
    ["Percepat DAT untuk "+belum+" kapal yang belum diperiksa",
     "Tindak lanjuti "+pos+" crew positif sesuai protokol STCW Manila 2010",
     "Implementasi Substance Abuse Prevention Program (MLC 2006 Reg.4.3)",
     "Laporan hasil DAT ke manajemen & flag state dalam 72 jam"],
    "DAT bulan berikutnya dijadwalkan awal bulan. Pastikan vendor siap & koordinasi nakhoda untuk akses crew. Hasil positif ditindaklanjuti sebelum kapal berangkat.",
    8,PT);

  pres.writeFile({fileName:"Laporan_DAT_"+blbl.replace(/ /g,"_")+".pptx"})
    .then(function(){showToast("✅ PPT DAT modern berhasil!","success");})
    .catch(function(e){showToast("Gagal: "+e.message,"error");});
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT PEST & RODENT — 8 SLIDES
═══════════════════════════════════════════════════════════════════ */
function exportPestPPT(){
  if(!window.PptxGenJS){showToast("PptxGenJS belum siap.","error");return;}
  var data=(typeof filteredPest!=="undefined"&&filteredPest.length>0)?filteredPest:[];
  if(!data.length){showToast("Tidak ada data Pest.","error");return;}
  showToast("🤖 AI menyusun rekomendasi PPT Pest...","info");

  var pres=new PptxGenJS();pres.layout="LAYOUT_16x9";pres.title="Laporan Pest & Rodent";
  var blbl=getBulanLabel(),MOD="Pest & Rodent Control",PT=8;

  var totalPel=data.length;
  var lokSet={};data.forEach(function(r){var l=(r["Lokasi"]||"").trim();if(l)lokSet[l]=1;});
  var totalLok=Object.keys(lokSet).length;
  var totalBiaya=data.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"])||0);},0);
  var hamaMap={};
  data.forEach(function(r){var t=(r["Temuan / Keluhan"]||"").toLowerCase();["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(function(h){if(t.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;});});
  var hamaSorted=Object.keys(hamaMap).map(function(k){return[k,hamaMap[k]];}).sort(function(a,b){return b[1]-a[1];});
  var hamaDom=hamaSorted.length?hamaSorted[0][0]:"—";
  var temuanMap={};data.forEach(function(r){var t=(r["Temuan / Keluhan"]||"").trim();if(t)temuanMap[t]=(temuanMap[t]||0)+1;});
  var temuanSorted=Object.keys(temuanMap).map(function(k){return[k,temuanMap[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  var byBln={},biayaBln={};BULAN.forEach(function(b){byBln[b]=0;biayaBln[b]=0;});
  data.forEach(function(r){var b=(r["Bulan"]||"").trim();if(b&&byBln[b]!==undefined){byBln[b]++;biayaBln[b]+=(parseFloat(r["Est Biaya"])||0);}});
  var lokMap={};data.forEach(function(r){var l=(r["Lokasi"]||"").trim();if(l)lokMap[l]=(lokMap[l]||0)+1;});
  var lokSorted=Object.keys(lokMap).map(function(k){return[k,lokMap[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,6);

  addCover(pres,"LAPORAN PEST","& RODENT CONTROL","Pengendalian Hama & Rodent — Fasilitas & Kapal Milik PIS",blbl,
    [{val:String(totalPel),label:"Total Pelaksanaan"},{val:String(totalLok),label:"Total Lokasi"},{val:fmtRp(totalBiaya),label:"Est. Biaya"}]);

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"RINGKASAN EKSEKUTIF","Ikhtisar pelaksanaan pest & rodent control — "+blbl);
    [{label:"Total Pelaksanaan",val:String(totalPel),color:C.blue,icon:"📋"},
     {label:"Total Lokasi",val:String(totalLok),color:C.teal,icon:"📍"},
     {label:"Total Temuan",val:String(data.length),color:C.orange,icon:"🔍"},
     {label:"Hama Dominan",val:(hamaDom.charAt(0).toUpperCase()+hamaDom.slice(1)).slice(0,10),color:C.red,icon:"🐛"},
     {label:"Est. Total Biaya",val:fmtRp(totalBiaya),color:C.purple,icon:"💰"},
    ].forEach(function(k,i){kpi(s,pres,0.18+i*1.94,1.08,1.72,1.55,k.label,k.val,k.color,k.icon);});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:2.79,w:5.85,h:2.12,fill:{color:C.white},line:{color:C.border,pt:0.8},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:0.18,y:2.79,w:0.1,h:2.12,fill:{color:C.blue},line:{color:C.blue}});
    s.addText("📋  TEMUAN UTAMA",{x:0.4,y:2.87,w:5.5,h:0.3,fontSize:10,bold:true,color:C.navy});
    s.addText(["Total "+totalPel+" pelaksanaan pada "+totalLok+" lokasi",
      "Hama dominan: "+(hamaDom.charAt(0).toUpperCase()+hamaDom.slice(1)),
      "Top temuan: "+(temuanSorted[0]||["—"])[0],
      "Estimasi total biaya: "+fmtRp(totalBiaya),
    ].map(function(f){return{text:f,options:{bullet:{type:"bullet"},breakLine:true,paraSpaceAfter:5}};}),{x:0.4,y:3.22,w:5.5,h:1.6,fontSize:9.5,color:C.textMid});
    s.addShape(pres.ShapeType.rect,{x:6.23,y:2.79,w:3.59,h:2.12,fill:{color:C.white},line:{color:C.border,pt:0.8},shadow:shdw()});
    s.addShape(pres.ShapeType.rect,{x:6.23,y:2.79,w:0.1,h:2.12,fill:{color:C.gold},line:{color:C.gold}});
    s.addText("⚡  REKOMENDASI",{x:6.43,y:2.87,w:3.2,h:0.3,fontSize:10,bold:true,color:C.goldDark});
    s.addText(["Intensifikasi pengendalian "+hamaDom,"Monitoring rutin seluruh lokasi rawan","Review efektivitas vendor pest control","Lihat AI Rekomendasi untuk detail regulasi",
    ].map(function(r){return{text:r,options:{bullet:{type:"bullet"},breakLine:true,paraSpaceAfter:5}};}),{x:6.43,y:3.22,w:3.2,h:1.6,fontSize:9.5,color:C.textMid});
    addFtr(s,pres,MOD,blbl,2,PT);
  })();

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"FREKUENSI & TREND BIAYA","Pelaksanaan pest control per bulan dan estimasi biaya");
    s.addChart(pres.ChartType.bar,[{name:"Pelaksanaan",labels:BULAN,values:BULAN.map(function(b){return byBln[b]||0;})}],{
      x:0.3,y:1.1,w:4.8,h:4.1,barDir:"col",chartColors:[C.teal],chartArea:{fill:{color:C.white}},
      catAxisLabelColor:C.textMuted,valAxisLabelColor:C.textMuted,valGridLine:{color:C.border,size:0.5},catGridLine:{style:"none"},
      showValue:true,dataLabelColor:C.navyMid,dataLabelFontSize:9,dataLabelFontBold:true,showLegend:false,catAxisLabelFontSize:8,barGapWidthPct:45,
    });
    s.addChart(pres.ChartType.line,[{name:"Est. Biaya",labels:BULAN,values:BULAN.map(function(b){return biayaBln[b]||0;})}],{
      x:5.3,y:1.1,w:4.45,h:4.1,chartColors:[C.gold],chartArea:{fill:{color:C.white}},
      catAxisLabelColor:C.textMuted,valAxisLabelColor:C.textMuted,valGridLine:{color:C.border,size:0.5},catGridLine:{style:"none"},
      lineSize:3,lineSmooth:true,showLegend:false,catAxisLabelFontSize:8,valAxisLabelFontSize:8.5,
      title:"Trend Biaya (Rp)",showTitle:true,titleFontSize:10,titleColor:C.navy,
    });
    addFtr(s,pres,MOD,blbl,3,PT);
  })();

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DISTRIBUSI LOKASI & TOP TEMUAN","Sebaran per lokasi dan temuan terbanyak");
    s.addChart(pres.ChartType.doughnut,[{name:"Lokasi",labels:lokSorted.map(function(x){return x[0];}),values:lokSorted.map(function(x){return x[1];})}],{
      x:0.2,y:1.1,w:4.2,h:3.85,chartColors:[C.teal,C.blue,C.gold,C.red,C.purple,"00897B"],
      chartArea:{fill:{color:C.white}},showPercent:true,showLegend:true,legendPos:"b",legendFontSize:9,holeSize:58,
      title:"Distribusi per Lokasi",showTitle:true,titleFontSize:11,titleColor:C.navy,
    });
    var hc=[C.red,C.orange,C.blue,C.green,C.purple];
    s.addShape(pres.ShapeType.rect,{x:4.55,y:1.1,w:5.2,h:0.42,fill:{color:C.navy},line:{color:C.navy}});
    s.addText("🔍  TOP TEMUAN / KELUHAN",{x:4.65,y:1.14,w:5.0,h:0.3,fontSize:10,bold:true,color:C.white,valign:"middle"});
    temuanSorted.forEach(function(t,i){
      var y=1.6+i*0.67,maxV=temuanSorted[0][1]||1,bW=Math.max(0.3,(t[1]/maxV)*3.5);
      s.addShape(pres.ShapeType.rect,{x:4.55,y:y,w:5.2,h:0.6,fill:{color:i%2===0?C.offWhite:C.white},line:{color:C.border,pt:0.5}});
      s.addShape(pres.ShapeType.ellipse,{x:4.62,y:y+0.12,w:0.36,h:0.36,fill:{color:hc[i]},line:{color:hc[i]}});
      s.addText(String(i+1),{x:4.62,y:y+0.12,w:0.36,h:0.36,fontSize:10,bold:true,color:C.white,align:"center",valign:"middle"});
      s.addText(t[0].length>30?t[0].slice(0,30)+"…":t[0],{x:5.06,y:y+0.04,w:3.2,h:0.28,fontSize:9.5,bold:true,color:C.text,valign:"middle"});
      s.addShape(pres.ShapeType.rect,{x:5.06,y:y+0.36,w:3.5,h:0.12,fill:{color:C.border},line:{color:C.border}});
      s.addShape(pres.ShapeType.rect,{x:5.06,y:y+0.36,w:bW,h:0.12,fill:{color:hc[i]},line:{color:hc[i]}});
      s.addText(t[1]+" kasus",{x:8.6,y:y+0.04,w:1.0,h:0.28,fontSize:8.5,color:hc[i],bold:true,align:"right",valign:"middle"});
    });
    addFtr(s,pres,MOD,blbl,4,PT);
  })();

  addAiSlide(pres,MOD,["biologi","sanitasi","tikus","kecoa","hama","vektor"],"pest",blbl,5,PT);
  addAiDetailSlide(pres,MOD,["biologi","sanitasi","hama","vector disease"],"pest",blbl,6,PT);

  (function(){
    var s=pres.addSlide();s.background={color:C.offWhite};
    addHdr(s,pres,"DATA PEST & RODENT CONTROL","Rekap data pelaksanaan pest control — "+blbl);
    var sd=data.slice(0,12);
    var hdr=["Lokasi","Tanggal","Temuan / Keluhan","Tindak Lanjut","Est. Biaya"].map(function(h){return{text:h,options:{fill:{color:C.navy},color:C.white,bold:true,fontSize:8.5,align:"center",valign:"middle"}};});
    var rows=[hdr];
    sd.forEach(function(r,ri){
      var bg=ri%2===0?C.offWhite:C.white;
      var tgl=r["Tanggal"]||r["Tanggal Pelaksanaan"]||"—";
      var tl=(r["Tindak Lanjut"]||r["Tindak Lanjut & Rekomendasi"]||"—").slice(0,40);
      rows.push([
        {text:r["Lokasi"]||"—",options:{fill:{color:bg},color:C.navy,bold:true,fontSize:8.5,align:"left",valign:"middle"}},
        {text:tgl,options:{fill:{color:bg},color:C.textMid,fontSize:8.5,align:"center",valign:"middle"}},
        {text:(r["Temuan / Keluhan"]||"—").slice(0,38),options:{fill:{color:bg},color:C.textMid,fontSize:8,align:"left",valign:"middle"}},
        {text:tl,options:{fill:{color:bg},color:C.textMid,fontSize:8,align:"left",valign:"middle"}},
        {text:fmtRp(r["Est Biaya"]),options:{fill:{color:bg},color:C.purple,bold:true,fontSize:8.5,align:"right",valign:"middle"}},
      ]);
    });
    s.addTable(rows,{x:0.25,y:1.05,w:9.5,h:4.1,colW:[1.5,0.95,2.4,2.95,1.2],border:{pt:0.5,color:C.border},rowH:0.33});
    if(data.length>12)s.addText("... dan "+(data.length-12)+" data lainnya",{x:0.25,y:5.12,w:9.5,h:0.2,fontSize:8,color:C.textMuted,italic:true});
    addFtr(s,pres,MOD,blbl,7,PT);
  })();

  addClosing(pres,MOD,blbl,
    ["Intensifikasi pengendalian "+(hamaDom.charAt(0).toUpperCase()+hamaDom.slice(1))+" di seluruh lokasi prioritas",
     "Perbarui SSCC (Ship Sanitation Certificate) sebelum habis masa berlaku",
     "Monitoring rutin tiap 2 minggu; vendor wajib laporan tertulis per pelaksanaan",
     "Dokumentasikan hasil pest control dalam SMS kapal (ISM Code)"],
    "Pest control rutin dijadwalkan tiap bulan. Pastikan semua "+totalLok+" lokasi terjangkau. Periksa SSCC validity sebelum singgah pelabuhan internasional — ketidaksesuaian berdampak pada PSC detention.",
    8,PT);

  pres.writeFile({fileName:"Laporan_Pest_Rodent_"+blbl.replace(/ /g,"_")+".pptx"})
    .then(function(){showToast("✅ PPT Pest & Rodent modern berhasil!","success");})
    .catch(function(e){showToast("Gagal: "+e.message,"error");});
}
