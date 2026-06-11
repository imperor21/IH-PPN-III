/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — IH Dashboard · Export PowerPoint (Health)
   Redesign v6 — minimalis · elegan · konsisten · zero error
   Layout LAYOUT_WIDE 13.33 × 7.5 in · pptxgenjs 3.x
   Mengekspos: exportDATPPT, exportHRAPPT, exportPestPPT,
               exportCloseout25PPT, exportSummaryPPT
═══════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ PALETTE — Gamma-style (navy & biru, elegan) ══ */
var C = {
  ink:  "1A3F6B", ink2: "122C4D",          /* navy cover/hero & gelap */
  teal: "2C6CB5", aqua: "4A90D9", tealL: "D6EAF5",  /* primary & accent biru + tint */
  sky:  "7AB3E0", tint: "D6EAF5", slate: "3D607F",
  amber:"E0913A", amberL:"FBEFDC",
  red:  "D8504D", redL:  "FAE8E8",
  grn:  "2E9E5B", grnL:  "E4F3EA",
  blue: "4A90D9", blueL: "E3EFFA",
  pur:  "5B6BB5", purL:  "E6E9F6",
  wht:  "FFFFFF", bg:    "F4F8FC",
  line: "E1E9F2", txt:   "1F3A5F", mut: "6B7E95"
};

/* ══ BRAND — identitas fungsi Health (tanpa nama korporat) ══ */
var BRAND = {
  org:    "HEALTH · INDUSTRIAL HYGIENE",
  unit:   "Health Division",
  eyebrow:"INDUSTRIAL HYGIENE REPORT",
  mark1:  "HEALTH",
  mark2:  "INDUSTRIAL HYGIENE"
};

/* ── util ───────────────────────────────────────────────── */
function _fs(v){var s=String(v);return s.length>10?16:s.length>7?20:s.length>4?26:s.length>2?32:40;}
function _now(){
  var d=new Date(),B=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return d.getDate()+" "+B[d.getMonth()]+" "+d.getFullYear();
}
function _rp(v){
  var n=parseFloat(v)||0;
  if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";
  if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";
  if(n>=1e3)return"Rp "+(n/1e3).toFixed(0)+" Rb";
  return"Rp "+n;
}
var BULAN_S = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function _months(){
  return (typeof BULAN_ORDER!=="undefined") ? BULAN_ORDER :
    ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
}
function _toast(msg,type){ if(typeof showToast==="function")showToast(msg,type); }

function _pres(title){
  var p=new PptxGenJS();
  p.layout="LAYOUT_WIDE";
  p.author="IH Dashboard — Health";
  p.company=BRAND.org;
  p.title=title;
  return p;
}
function _guard(){
  if(typeof PptxGenJS==="undefined"){_toast("Library PPT sedang dimuat, coba lagi.","warning");return false;}
  return true;
}
async function _awaitPptx(){
  var waited=0;
  while(typeof PptxGenJS==="undefined" && waited<20000){
    await new Promise(function(r){setTimeout(r,300);});
    waited+=300;
  }
  return typeof PptxGenJS!=="undefined";
}
async function _guardAsync(){
  var ok=await _awaitPptx();
  if(!ok){_toast("Library PPT gagal dimuat. Coba refresh halaman.","error");return false;}
  return true;
}

/* ══════════════════════════════════════════════════════════
   DESIGN PRIMITIVES — semua signature konsisten
══════════════════════════════════════════════════════════ */

/* Header slide konten — Gamma style: latar terang, eyebrow + judul navy (kompak) */
function _hdr(s,pr,title,sub){
  s.background={color:C.bg};
  s.addShape(pr.ShapeType.ellipse,{x:11.9,y:-1.6,w:3.2,h:3.2,fill:{color:C.tint},line:{type:"none"}});
  s.addText([{text:"● ",options:{color:C.aqua}},{text:BRAND.org,options:{color:C.slate}}],
    {x:0.55,y:0.18,w:9.8,h:0.24,fontSize:8.5,bold:true,charSpacing:1.3,fontFace:"Segoe UI",valign:"middle"});
  var fs=title.length>52?17:title.length>38?20:24;
  s.addText(String(title),{x:0.50,y:0.42,w:10.6,h:0.52,
    fontSize:fs,bold:true,color:C.ink,fontFace:"Segoe UI",valign:"middle"});
  if(sub)s.addText(sub,{x:0.55,y:0.95,w:10.6,h:0.24,
    fontSize:9.5,color:C.mut,fontFace:"Segoe UI",valign:"middle"});
  s.addShape(pr.ShapeType.line,{x:0.55,y:1.20,w:12.25,h:0,line:{color:C.line,width:1}});
  s.addShape(pr.ShapeType.rect,{x:0.55,y:1.185,w:0.85,h:0.04,fill:{color:C.aqua},line:{type:"none"}});
}

/* Footer slide konten */
function _ftr(s,pr,label,pg,tot){
  s.addShape(pr.ShapeType.line,{x:0.55,y:7.18,w:12.25,h:0,line:{color:C.line,width:1}});
  s.addText(label,{x:0.55,y:7.22,w:10.5,h:0.22,
    fontSize:7.5,color:C.mut,fontFace:"Segoe UI",valign:"middle"});
  s.addText([{text:String(pg),options:{color:C.aqua,bold:true}},{text:" / "+tot,options:{color:C.mut}}],
    {x:11.9,y:7.22,w:0.92,h:0.22,fontSize:8,align:"right",fontFace:"Segoe UI",valign:"middle"});
}

/* KPI Card — putih, strip aksen atas, angka besar */
function _kpi(s,pr,x,y,w,h,val,label,accent,icon){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.75},rectRadius:0.09,
    shadow:{type:"outer",color:"1F3A5F",blur:7,offset:2,angle:90,opacity:0.06}});
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:0.09,
    fill:{color:accent},line:{type:"none"},rectRadius:0.09});
  /* aksen titik kecil kanan-atas (pengganti emoji, konsisten di semua viewer) */
  s.addShape(pr.ShapeType.ellipse,{x:x+w-0.42,y:y+0.24,w:0.18,h:0.18,
    fill:{color:accent},line:{type:"none"}});
  s.addText(String(val),{x:x+0.16,y:y+0.20,w:w-0.32,h:h*0.50,
    fontSize:_fs(val),bold:true,color:accent,align:"left",valign:"middle",fontFace:"Segoe UI"});
  s.addText(String(label).toUpperCase(),{x:x+0.18,y:y+h*0.70,w:w-0.30,h:h*0.27,
    fontSize:9,color:C.mut,align:"left",valign:"middle",fontFace:"Segoe UI",charSpacing:0.3,wrap:true});
}

/* Row compact — untuk daftar/peringkat */
function _row(s,pr,x,y,w,h,val,label,accent){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.6},rectRadius:0.07});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.07,h:h,fill:{color:accent},line:{type:"none"}});
  s.addText(String(val),{x:x+0.24,y:y,w:2.0,h:h,
    fontSize:16,bold:true,color:accent,valign:"middle",fontFace:"Segoe UI"});
  s.addText(String(label),{x:x+2.3,y:y,w:w-2.5,h:h,
    fontSize:10.5,color:C.txt,valign:"middle",fontFace:"Segoe UI",wrap:true});
}

/* Note / status box */
function _note(s,pr,x,y,w,h,text,accent,tint){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:tint||C.bg},line:{color:accent,width:0.9},rectRadius:0.09});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.08,h:h,fill:{color:accent},line:{type:"none"}});
  s.addText(text,{x:x+0.26,y:y+0.10,w:w-0.42,h:h-0.20,
    fontSize:10.5,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"middle"});
}

/* Recommendation card — angka teal + teks */
function _rec(s,pr,x,y,w,h,num,text){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.6},rectRadius:0.09});
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:0.62,h:h,
    fill:{color:C.ink},line:{type:"none"},rectRadius:0.09});
  s.addShape(pr.ShapeType.rect,{x:x+0.55,y:y,w:0.07,h:h,fill:{color:C.aqua},line:{type:"none"}});
  s.addText(String(num),{x:x,y:y,w:0.62,h:h,
    fontSize:22,bold:true,color:C.aqua,align:"center",valign:"middle",fontFace:"Segoe UI"});
  s.addText(text,{x:x+0.80,y:y+0.08,w:w-0.95,h:h-0.16,
    fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"middle"});
}

/* ══════════════════════════════════════════════════════════
   AI RECOMMENDATION ENGINE — berbasis data + regulasi tertanam
   Mengembalikan {analisis, recs:[{pri,text,reg}]}
══════════════════════════════════════════════════════════ */
var _PRI={TINGGI:{c:C.red,bg:C.redL},SEDANG:{c:C.amber,bg:C.amberL},RUTIN:{c:C.teal,bg:C.tealL}};

/* Map nama hazard bebas → jenis hirarki + acuan regulasi */
function _hazClass(name){
  var n=(name||"").toLowerCase();
  if(/bising|noise|kebisingan|getar|vibrat|panas|heat|suhu|pencahayaan|cahaya|radiasi/.test(n))
    return {tipe:"Fisika",reg:"Permenaker 05/2018 · ACGIH TLV 2024 · SNI 16-7063"};
  if(/benzene|benzena|kimia|voc|uap|gas|debu|dust|h2s|co|solvent|pelarut|b3/.test(n))
    return {tipe:"Kimia",reg:"ACGIH BEI/TLV 2024 · IARC · Permenaker 05/2018"};
  if(/bakteri|virus|jamur|mikro|biolog|legionella|sanitasi|air bersih|food/.test(n))
    return {tipe:"Biologi",reg:"IHR 2005 (WHO) · MLC 2006 Title 3 · Permenkes"};
  if(/ergonom|angkat|postur|msd|manual handling|repetit|beban/.test(n))
    return {tipe:"Ergonomi",reg:"ISO 11228 · NIOSH Lifting Eq. · Permenaker 05/2018"};
  if(/stres|stress|psiko|fatigue|lelah|beban kerja|mental|jam kerja/.test(n))
    return {tipe:"Psikososial",reg:"MLC 2006 (jam kerja/istirahat) · ILO PSY"};
  return {tipe:"Umum",reg:"ISO 45001:2018 · Permenaker 05/2018"};
}
/* Saran hirarki pengendalian sesuai jenis (mirror HIRARKI_PENGENDALIAN dashboard) */
function _hirById(tipe){
  var H=(typeof HIRARKI_PENGENDALIAN!=="undefined")?HIRARKI_PENGENDALIAN:null;
  var key={Fisika:"fisika",Kimia:"kimia",Biologi:"biologi",Ergonomi:"ergonomi",Psikososial:"psikososial"}[tipe];
  if(H&&key&&H[key])return H[key];
  return null;
}

function _ai(modul,m){
  var R=[],an="";
  function add(pri,text,reg){R.push({pri:pri,text:text,reg:reg});}

  if(modul==="DAT"){
    an=(m.pos>0
      ? "Terdeteksi "+m.pos+" hasil positif dari "+m.crew+" crew yang diperiksa (tingkat positif "+m.rate+"%). "
      : "Seluruh "+m.crew+" crew yang diperiksa menunjukkan hasil negatif (compliance "+m.cov+"% armada). ")
      + (m.belum>0 ? m.belum+" kapal belum menjalani DAT — coverage armada "+m.cov+"%." : "Coverage pemeriksaan armada telah mencapai "+m.cov+"%.");
    if(m.pos>0)add("TINGGI",
      "Tindak lanjut medis untuk "+m.pos+" crew positif: nonaktifkan tugas berisiko, lakukan uji konfirmasi (GC-MS), konseling, dan keputusan fit-to-sail oleh dokter sebelum keberangkatan.",
      "MLC 2006 Reg.4.3 · STCW 2010 Sec.A-I/9");
    if(m.belum>0)add(m.cov<50?"TINGGI":"SEDANG",
      "Percepat DAT pada "+m.belum+" kapal yang belum diperiksa (target coverage 100%); koordinasikan vendor & akses crew dengan nakhoda.",
      "Kebijakan Zero-Tolerance · OCIMF");
    add("RUTIN",
      "Selenggarakan random/unannounced testing minimal 25% populasi per kuartal sebagai efek deteren dan penguatan budaya keselamatan.",
      "ISGOTT · OCIMF Drug & Alcohol Policy");
    add("RUTIN",
      "Arsipkan hasil sebagai bukti kepatuhan dan integrasikan ke Health Record crew untuk audit PSC & biro klasifikasi"+(m.biaya>0?" (estimasi biaya program "+m.biayaR+")":"")+".",
      "MLC 2006 Reg.4.3 · ISM Code");
  }

  else if(modul==="HRA"){
    var hz=m.hazTop&&m.hazTop.length?m.hazTop[0][0]:null;
    var cls=hz?_hazClass(hz):null;
    an=(m.cov<80
      ? "Coverage HRA armada baru "+m.cov+"% ("+m.done+"/"+m.tot+" kapal) — di bawah target 80%. "
      : "Coverage HRA armada "+m.cov+"% ("+m.done+"/"+m.tot+" kapal) telah memenuhi target. ")
      + (hz ? "Bahaya paling sering teridentifikasi: "+hz+" ("+m.hazTop[0][1]+"×), tergolong hazard "+cls.tipe+"." : "Profil bahaya belum terisi pada periode ini.");
    if(m.belum>0)add(m.cov<50?"TINGGI":"SEDANG",
      "Percepat HRA pada "+m.belum+" armada tersisa; prioritaskan kapal dengan profil risiko tinggi agar coverage menembus target >80%.",
      "ISO 45001:2018 cl.6.1 · Permenaker 05/2018");
    if(hz){
      var hir=_hirById(cls.tipe);
      add("TINGGI",
        "Kendalikan bahaya dominan \""+hz+"\" mengikuti hirarki pengendalian — dahulukan eliminasi/substitusi/rekayasa sebelum APD"+(hir?": "+String(hir["3"]).split("—")[0].trim():"")+".",
        cls.reg);
    }
    add("SEDANG",
      "Ukur paparan kuantitatif (noise/dust/gas/iklim kerja) pada area berisiko dan bandingkan terhadap NAB/TLV untuk verifikasi efektivitas pengendalian.",
      "ACGIH TLV 2024 · Permenaker 05/2018");
    add("RUTIN",
      "Perbarui register bahaya, integrasikan temuan ke medical surveillance, dan selaraskan anggaran pengendalian ("+m.budgetR+") dengan tingkat risiko.",
      "ISO 45001:2018 · Permenaker 05/2018 Lamp.IV");
  }

  else if(modul==="PEST"){
    var hama=m.hamaTop&&m.hamaTop.length?m.hamaTop[0][0]:null;
    an=(hama
      ? "Hama dominan periode ini: "+hama+" ("+m.hamaTop[0][1]+" temuan) dari "+m.totalKeg+" kegiatan di "+m.totalLok+" lokasi. "
      : "Tercatat "+m.totalKeg+" kegiatan pengendalian di "+m.totalLok+" lokasi. ")
      + "Pengendalian vektor menjaga sanitasi & mencegah penyakit terbawa vektor di lingkungan kerja kapal.";
    if(hama)add("TINGGI",
      "Fokuskan treatment pada "+hama+": tutup titik akses, eliminasi sumber pakan/air, dan terapkan Integrated Vector Management pada lokasi terdampak.",
      "IHR 2005 (WHO) · MLC 2006 Title 3 (Akomodasi)");
    add("SEDANG",
      "Tingkatkan sanitasi pantry, gudang, dan ruang kerja untuk memutus siklus perkembangbiakan vektor; jadwalkan inspeksi higiene berkala.",
      "MLC 2006 Reg.3.2 · Permenkes Sanitasi Kapal");
    add("RUTIN",
      "Pertahankan jadwal pengendalian rutin dan dokumentasikan temuan/before-after sebagai bukti Ship Sanitation Control untuk PSC.",
      "IHR 2005 · Ship Sanitation Certificate");
    add("RUTIN",
      "Evaluasi anggaran ("+m.biayaR+") terhadap frekuensi & jenis temuan untuk efisiensi program pengendalian.",
      "Prinsip ALARP");
  }

  else if(modul==="CLOSEOUT"){
    var fr=m.fleetRanked||[];
    var fleetTxt=fr.length?fr.map(function(f){return f.fleet+" ("+f.open+" kapal)";}).join(", "):"";
    an=(m.kapalOpen>0
      ? "Dari "+m.totalKapal+" kapal, "+m.kapalClose+" sudah CLOSE (temuan selesai) dan "+m.kapalOpen+" masih OPEN (temuan belum selesai) — progress "+m.pct+"%. "
      : "Seluruh "+m.totalKapal+" kapal telah CLOSE — temuan selesai 100%. ")
      + (fleetTxt ? "Fleet dengan kapal open: "+fleetTxt+"." : "");
    if(m.kapalOpen>0){
      var topf=fr[0];
      add("TINGGI",
        "Prioritaskan "+(topf?topf.fleet:"fleet dengan open terbanyak")+(topf?" ("+topf.open+" kapal open)":"")+": tetapkan PIC & target tanggal per kapal, dan jadwalkan penyelesaian temuan bersama manajemen fleet.",
        "ISO 45001:2018 cl.10.2 (Tindakan Korektif)");
      if(fr.length>1)add("SEDANG",
        "Susun rencana closeout bertahap untuk fleet lain: "+fr.slice(1).map(function(f){return f.fleet+" ("+f.open+")";}).join(", ")+"; pantau progres mingguan per fleet.",
        "Manajemen Fleet · ISO 45001:2018");
    }
    add("SEDANG",
      "Verifikasi efektivitas pengendalian di tiap kapal secara aktual (foto/pengukuran ulang) sebelum menetapkan status CLOSE — utamakan kontrol di puncak hirarki, bukan administratif/APD.",
      "Hierarchy of Controls · ISO 45001:2018");
    add("RUTIN",
      "Lampirkan bukti penyelesaian per kapal CLOSE dan kompilasi lesson learned per fleet untuk mencegah temuan berulang pada siklus HRA berikutnya.",
      "ISM Code · Continual Improvement");
  }

  else if(modul==="MCU"){
    /* m: {total, fit, fitBersyarat, unfit, fitPct, nihl, spiroAbn, spiroBelum, hemoAbn, visusTidakLayak, visusPerhatian, riskTinggi, riskKritis, tahun} */
    var unfitTot=(m.unfit||0)+(m.riskKritis||0>0?0:0); /* unfit utama dari Hasil Umum */
    an="Dari "+(m.total||0)+" pelaut yang menjalani MCU"
      +(m.tahun?" ("+m.tahun+")":"")+": "
      +(m.fit||0)+" FIT, "+(m.fitBersyarat||0)+" FIT BERSYARAT, "+(m.unfit||0)+" UNFIT "
      +"(fit rate "+(m.fitPct||"0")+"%). "
      +((m.nihl||0)>0?"Terdeteksi "+m.nihl+" kasus indikasi NIHL (gangguan pendengaran akibat bising). ":"Tidak ada indikasi NIHL signifikan. ")
      +((m.riskKritis||0)+(m.riskTinggi||0)>0?"Terdapat "+((m.riskKritis||0)+(m.riskTinggi||0))+" pelaut berisiko tinggi/kritis yang memerlukan perhatian prioritas.":"Profil risiko populasi tergolong terkendali.");

    if((m.unfit||0)>0)add("TINGGI",
      "Tindak lanjuti "+m.unfit+" pelaut berstatus UNFIT: nonaktifkan dari penugasan berisiko, lakukan rujukan medis & pemeriksaan lanjutan, dan keputusan fit-to-work oleh dokter penerbitan sertifikat medis sebelum penugasan ulang.",
      "MLC 2006 Reg.1.2 (Medical Certificate) · STCW 2010 Sec.A-I/9");
    if((m.nihl||0)>0)add((m.nihl||0)>=3?"TINGGI":"SEDANG",
      "Lakukan audiometri ulang konfirmasi pada "+m.nihl+" pelaut indikasi NIHL, evaluasi paparan kebisingan di posisi kerjanya (engine room/deck), dan perkuat kontrol kebisingan (rekayasa + APD pendengaran) sesuai hirarki pengendalian.",
      "Permenaker 05/2018 (NAB Bising 85 dBA) · ACGIH TLV · ILO MLC 2006 Title 4");
    if((m.spiroAbn||0)>0)add("SEDANG",
      "Tindak lanjuti "+m.spiroAbn+" pelaut dengan pola spirometri abnormal (obstruktif/restriktif): evaluasi paparan debu/asap/uap kimia, rujuk pemeriksaan paru bila perlu, dan tinjau penggunaan respirator yang sesuai.",
      "ACGIH TLV · Permenaker 05/2018 (Faktor Kimia)");
    if((m.fitBersyarat||0)>0)add("SEDANG",
      "Pastikan "+m.fitBersyarat+" pelaut FIT BERSYARAT memenuhi syarat yang ditetapkan (mis. kontrol rutin, pembatasan tugas) dan pantau pemenuhannya hingga jadwal MCU berikutnya.",
      "MLC 2006 Reg.1.2 · Pedoman ILO/IMO Medical Examination of Seafarers");
    if((m.visusTidakLayak||0)>0)add("SEDANG",
      "Evaluasi "+m.visusTidakLayak+" pelaut dengan status visus TIDAK LAYAK terhadap kesesuaian tugas (lookout/navigasi); pertimbangkan koreksi penglihatan & reassignment sesuai standar penglihatan pelaut.",
      "STCW 2010 Sec.A-I/9 (Standar Penglihatan)");
    add("RUTIN",
      "Arsipkan hasil MCU ke Health Record tiap pelaut, jadwalkan MCU periodik sesuai masa berlaku sertifikat medis (maks. 2 tahun), dan integrasikan dengan surveilans kesehatan kerja untuk deteksi dini tren.",
      "MLC 2006 Reg.1.2 · ISO 45001:2018 cl.9.1");
  }

  else if(modul==="ALKES"){
    /* m: {totalKapal, lengkap, parsial, tidakLengkap, expired, aedExpired, avgPct, kapalKurang:[{nama,pct,kurang}]} */
    an="Dari "+(m.totalKapal||0)+" kapal: "
      +(m.lengkap||0)+" LENGKAP, "+(m.parsial||0)+" PARSIAL, "+(m.tidakLengkap||0)+" TIDAK LENGKAP"
      +((m.expired||0)>0?", "+m.expired+" dengan alkes EXPIRED":"")+". "
      +"Rata-rata kelengkapan alat kesehatan armada "+(m.avgPct||0)+"%. "
      +((m.aedExpired||0)>0?"Terdapat "+m.aedExpired+" unit AED yang sudah melewati masa kedaluwarsa — berisiko gagal fungsi saat darurat jantung.":"Seluruh AED dalam masa berlaku.");

    if((m.aedExpired||0)>0)add("TINGGI",
      "Segera ganti/isi ulang "+m.aedExpired+" unit AED yang kedaluwarsa (baterai & pad elektroda) — AED kedaluwarsa dapat gagal saat henti jantung mendadak. Lakukan pengadaan prioritas dan verifikasi kesiapan fungsi.",
      "MLC 2006 Reg.4.1 (Medical Care On Board) · Guidelines IMO/ILO/WHO Medical Stores");
    if((m.tidakLengkap||0)>0)add("TINGGI",
      "Penuhi alat kesehatan wajib pada "+m.tidakLengkap+" kapal berstatus TIDAK LENGKAP — koordinasikan pengadaan agar setiap kapal memiliki kelengkapan medis minimum sesuai standar medical stores kapal.",
      "MLC 2006 Reg.4.1 · IMMA Guide / WHO IMGS");
    if((m.parsial||0)>0)add("SEDANG",
      "Lengkapi kekurangan alat pada "+m.parsial+" kapal berstatus PARSIAL; prioritaskan item life-saving (AED, oksigen, spinal board) sebelum item penunjang.",
      "MLC 2006 Reg.4.1 · Ship's Medicine Chest Guidelines");
    if(m.kapalKurang&&m.kapalKurang.length)add("SEDANG",
      "Fokus pemenuhan pada kapal kelengkapan terendah: "
        +m.kapalKurang.slice(0,3).map(function(k){return k.nama+" ("+k.pct+"%)";}).join(", ")
        +" — tetapkan PIC & target tanggal pemenuhan per kapal.",
      "ISO 45001:2018 cl.8.2 (Kesiapan Tanggap Darurat)");
    add("RUTIN",
      "Buat jadwal inspeksi & kalibrasi alkes berkala (cek masa berlaku AED, tabung oksigen, tensimeter) dan catat dalam log pemeliharaan sebagai bukti kesiapan darurat untuk audit PSC/biro klasifikasi.",
      "ISM Code · MLC 2006 Reg.4.1 · ISO 45001:2018 cl.8.2");
  }

  else if(modul==="SUMMARY"){
    an="Status keseluruhan program IH: coverage HRA "+m.hraCov+"%, kepatuhan DAT "+m.datPct+"% ("+m.datPos+" positif), "+m.pestCount+" kegiatan pest control. "
      +(m.overallOk?"Indikator utama dalam batas normal.":"Beberapa indikator memerlukan tindak lanjut prioritas.");
    add(parseFloat(m.hraCov)<80?"TINGGI":"RUTIN",
      parseFloat(m.hraCov)<80
        ? "Percepat HRA hingga coverage >80% melalui penjadwalan armada prioritas berbasis tingkat risiko."
        : "Pertahankan coverage HRA dan perbarui register bahaya secara berkala.",
      "ISO 45001:2018 · Permenaker 05/2018");
    add(m.datPos>0?"TINGGI":"RUTIN",
      m.datPos>0
        ? "Tindak lanjuti "+m.datPos+" crew positif DAT (uji konfirmasi + keputusan fit-to-sail) sebelum keberangkatan."
        : "Jaga zero positive rate DAT dengan random testing berkala.",
      "MLC 2006 Reg.4.3 · STCW 2010");
    add("SEDANG",
      "Lanjutkan pest control rutin & dokumentasi temuan; sinkronkan dengan program sanitasi kapal.",
      "IHR 2005 · MLC 2006 Title 3");
    add("RUTIN",
      "Selaraskan anggaran ("+m.budgetR+") dengan profil risiko lintas modul untuk efisiensi dan prioritas pengendalian.",
      "Prinsip ALARP · ISO 45001:2018");
  }
  return {analisis:an,recs:R};
}

/* Kotak analisis AI (narasi data-driven) */
function _aiBox(s,pr,x,y,w,h,text){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.ink},line:{type:"none"},rectRadius:0.09});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.08,h:h,fill:{color:C.aqua},line:{type:"none"}});
  s.addText("ANALISIS",{x:x+0.26,y:y+0.12,w:2.2,h:0.26,
    fontSize:9,bold:true,color:C.aqua,charSpacing:1.5,fontFace:"Segoe UI"});
  s.addText(text,{x:x+0.26,y:y+0.40,w:w-0.5,h:h-0.52,
    fontSize:10.5,color:"DCE6F2",fontFace:"Segoe UI",wrap:true,valign:"top"});
}

/* Kartu rekomendasi profesional: chip prioritas + teks + sitasi regulasi */
function _recPro(s,pr,x,y,w,h,idx,pri,text,reg){
  var P=_PRI[pri]||_PRI.RUTIN;
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.6},rectRadius:0.09});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.08,h:h,fill:{color:P.c},line:{type:"none"}});
  /* nomor */
  s.addText(String(idx),{x:x+0.18,y:y,w:0.5,h:h,
    fontSize:20,bold:true,color:P.c,align:"center",valign:"middle",fontFace:"Segoe UI"});
  /* chip prioritas */
  s.addShape(pr.ShapeType.roundRect,{x:x+0.78,y:y+0.14,w:1.15,h:0.30,
    fill:{color:P.bg},line:{color:P.c,width:0.75},rectRadius:0.06});
  s.addText(pri,{x:x+0.78,y:y+0.14,w:1.15,h:0.30,
    fontSize:8,bold:true,color:P.c,align:"center",valign:"middle",charSpacing:0.5,fontFace:"Segoe UI"});
  /* teks rekomendasi */
  s.addText(text,{x:x+2.05,y:y+0.10,w:w-2.25,h:h-0.42,
    fontSize:10.5,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"top"});
  /* sitasi regulasi */
  s.addText([{text:"Regulasi:  ",options:{color:P.c,bold:true}},{text:String(reg||""),options:{color:C.mut,italic:true}}],
    {x:x+2.05,y:y+h-0.34,w:w-2.25,h:0.28,fontSize:8.5,fontFace:"Segoe UI",valign:"middle"});
}

/* Render slide rekomendasi lengkap (analisis + kartu) untuk satu modul */
function _slideRek(pr,modul,m,ftr,pg,tot,subjudul){
  var s=pr.addSlide();
  _hdr(s,pr,"Rekomendasi Tindak Lanjut (AI)",subjudul);
  var ai=_ai(modul,m);
  _aiBox(s,pr,0.45,1.28,12.43,1.12,ai.analisis);
  var recs=ai.recs.slice(0,4);
  var gap=0.16, top=2.66, avail=7.06-top, ch=(avail-gap*(recs.length-1))/recs.length;
  if(ch>1.18)ch=1.18;
  recs.forEach(function(r,i){
    _recPro(s,pr,0.45,top+i*(ch+gap),12.43,ch,i+1,r.pri,r.text,r.reg);
  });
  _ftr(s,pr,ftr,pg,tot);
  return s;
}

/* Bar chart native — labels[] & values[] paralel */
function _bars(s,pr,x,y,w,h,labels,values,color,title){
  var hasData=values.some(function(v){return (parseFloat(v)||0)>0;});
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.75},rectRadius:0.08});
  if(title)s.addText(title,{x:x+0.18,y:y+0.12,w:w-0.36,h:0.30,
    fontSize:11.5,bold:true,color:C.ink,fontFace:"Segoe UI"});
  var cy=title?y+0.50:y+0.16, ch=title?h-0.66:h-0.32;
  if(!hasData){
    s.addText("Belum ada data pada periode ini.",{x:x,y:cy,w:w,h:ch,
      fontSize:11,italic:true,color:C.mut,align:"center",valign:"middle",fontFace:"Segoe UI"});
    return;
  }
  s.addChart(pr.ChartType.bar,[{name:title||"Data",labels:labels,values:values}],{
    x:x+0.14,y:cy,w:w-0.28,h:ch,
    barDir:"col", barGapWidthPct:50, chartColors:[color],
    showLegend:false, showTitle:false,
    showValue:true, dataLabelColor:C.txt, dataLabelFontSize:8.5, dataLabelFontFace:"Segoe UI", dataLabelPosition:"outEnd",
    catAxisLabelColor:C.mut, catAxisLabelFontSize:8.5, catAxisLabelFontFace:"Segoe UI",
    catAxisLineShow:true, catAxisLineColor:C.line,
    valAxisHidden:true, valGridLine:{style:"none"}, catGridLine:{style:"none"},
    valAxisLineShow:false
  });
}

/* Donut native — items:[{label,value,color}] */
function _donut(s,pr,x,y,w,h,items,title){
  var total=items.reduce(function(a,b){return a+(parseFloat(b.value)||0);},0);
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.line,width:0.75},rectRadius:0.08});
  if(title)s.addText(title,{x:x+0.18,y:y+0.12,w:w-0.36,h:0.30,
    fontSize:11.5,bold:true,color:C.ink,fontFace:"Segoe UI"});
  var cy=title?y+0.46:y+0.16, ch=title?h-0.60:h-0.32;
  if(total<=0){
    s.addText("Belum ada data.",{x:x,y:cy,w:w,h:ch,
      fontSize:11,italic:true,color:C.mut,align:"center",valign:"middle",fontFace:"Segoe UI"});
    return;
  }
  s.addChart(pr.ChartType.doughnut,
    [{name:title||"Data",labels:items.map(function(i){return i.label;}),values:items.map(function(i){return parseFloat(i.value)||0;})}],{
    x:x+0.10,y:cy,w:w-0.20,h:ch,
    holeSize:64, chartColors:items.map(function(i){return i.color;}),
    showLegend:true, legendPos:"b", legendColor:C.txt, legendFontFace:"Segoe UI", legendFontSize:9,
    showValue:false, showPercent:true, dataLabelColor:C.wht, dataLabelFontSize:9, dataLabelFontFace:"Segoe UI",
    showTitle:false
  });
}

/* ══ COVER — Gamma style: navy + lingkaran organik + pill + judul besar ══ */
function _cover(pr,judul1,judul2,sub,periode,kpis,mark){
  var s=pr.addSlide();
  s.background={color:C.ink};
  /* lingkaran organik samar */
  s.addShape(pr.ShapeType.ellipse,{x:9.2,y:-2.4,w:6.6,h:6.6,fill:{color:"163A63"},line:{type:"none"}});
  s.addShape(pr.ShapeType.ellipse,{x:-2.0,y:4.6,w:5.2,h:5.2,fill:{color:"1E4878"},line:{type:"none"}});
  s.addShape(pr.ShapeType.ellipse,{x:11.0,y:5.2,w:3.2,h:3.2,fill:{color:"143356"},line:{type:"none"}});
  /* pill eyebrow */
  s.addShape(pr.ShapeType.roundRect,{x:0.9,y:0.72,w:6.7,h:0.46,fill:{color:"244E7E"},line:{type:"none"},rectRadius:0.23});
  s.addText([{text:"● ",options:{color:C.sky}},{text:BRAND.eyebrow+"   ·   "+String(periode).toUpperCase(),options:{color:"DCEAF7"}}],
    {x:0.9,y:0.72,w:6.7,h:0.46,fontSize:9.5,bold:true,align:"center",valign:"middle",charSpacing:1.2,fontFace:"Segoe UI"});
  /* judul besar */
  s.addText(judul1,{x:0.86,y:1.55,w:11.6,h:1.95,
    fontSize:42,bold:true,color:C.wht,fontFace:"Segoe UI",lineSpacingMultiple:0.98,valign:"top"});
  /* subjudul */
  s.addText(judul2,{x:0.9,y:3.55,w:11.5,h:0.7,
    fontSize:18,color:C.sky,fontFace:"Segoe UI",valign:"top",wrap:true});
  s.addText(sub,{x:0.9,y:4.18,w:11.5,h:0.46,
    fontSize:11,color:"AFC3DC",fontFace:"Segoe UI",valign:"top",wrap:true});
  /* baris KPI (statistik) */
  var ks=(kpis||[]).slice(0,3), kw=3.62, gap=0.34, x0=0.9, ky=4.92;
  ks.forEach(function(k,i){
    var kx=x0+i*(kw+gap);
    s.addShape(pr.ShapeType.roundRect,{x:kx,y:ky,w:kw,h:1.06,fill:{color:"1E4878"},line:{type:"none"},rectRadius:0.10});
    s.addShape(pr.ShapeType.rect,{x:kx,y:ky+0.16,w:0.09,h:0.74,fill:{color:k.c||C.sky},line:{type:"none"}});
    s.addText(String(k.v),{x:kx+0.24,y:ky+0.10,w:kw-0.4,h:0.58,
      fontSize:_fs(k.v),bold:true,color:k.c||C.sky,valign:"middle",fontFace:"Segoe UI"});
    s.addText(String(k.l).toUpperCase(),{x:kx+0.26,y:ky+0.64,w:kw-0.45,h:0.34,
      fontSize:8.5,color:"AFC3DC",valign:"middle",charSpacing:0.4,fontFace:"Segoe UI",wrap:true});
  });
  /* bar metadata bawah */
  s.addShape(pr.ShapeType.roundRect,{x:0.9,y:6.34,w:11.53,h:0.66,fill:{color:"163A63"},line:{type:"none"},rectRadius:0.10});
  s.addText([
    {text:BRAND.org,options:{color:C.wht,bold:true}},
    {text:"     |     "+BRAND.unit,options:{color:"AFC3DC"}},
    {text:"     |     "+_now(),options:{color:"AFC3DC"}},
    {text:"     |     CONFIDENTIAL",options:{color:C.sky,bold:true}}
  ],{x:0.9,y:6.34,w:11.53,h:0.66,fontSize:9.5,align:"center",valign:"middle",fontFace:"Segoe UI"});
}

/* ══ CLOSING — Gamma style ══ */
function _closing(pr,sub){
  var s=pr.addSlide();
  s.background={color:C.ink};
  s.addShape(pr.ShapeType.ellipse,{x:9.4,y:-2.6,w:6.8,h:6.8,fill:{color:"163A63"},line:{type:"none"}});
  s.addShape(pr.ShapeType.ellipse,{x:-2.2,y:4.4,w:5.6,h:5.6,fill:{color:"1E4878"},line:{type:"none"}});
  s.addShape(pr.ShapeType.roundRect,{x:5.16,y:2.05,w:3.0,h:0.44,fill:{color:"244E7E"},line:{type:"none"},rectRadius:0.22});
  s.addText("● "+BRAND.eyebrow,{x:5.16,y:2.05,w:3.0,h:0.44,fontSize:8.5,bold:true,color:C.sky,align:"center",valign:"middle",charSpacing:1,fontFace:"Segoe UI"});
  s.addText("TERIMA KASIH",{x:1.0,y:2.70,w:11.33,h:1.15,
    fontSize:48,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI",charSpacing:0.5});
  s.addShape(pr.ShapeType.rect,{x:5.96,y:3.96,w:1.4,h:0.04,fill:{color:C.aqua},line:{type:"none"}});
  s.addText(sub,{x:1.0,y:4.14,w:11.33,h:0.40,
    fontSize:13,color:C.sky,align:"center",fontFace:"Segoe UI"});
  s.addText(BRAND.org+"  ·  "+BRAND.unit,{x:1.0,y:4.58,w:11.33,h:0.34,
    fontSize:11,color:"AFC3DC",align:"center",fontFace:"Segoe UI"});
  s.addText("Laporan ini bersifat RAHASIA dan hanya untuk penggunaan internal.",{x:2.0,y:6.74,w:9.33,h:0.28,
    fontSize:9,color:"7E97B5",align:"center",italic:true,fontFace:"Segoe UI"});
}

function _download(pr,fname){
  return pr.writeFile({fileName:fname})
    .then(function(){_toast("PPT berhasil dibuat!","success");})
    .catch(function(e){_toast("Gagal menyimpan PPT: "+(e&&e.message||e),"error");});
}

/* ══════════════════════════════════════════════════════════
   1) DRUGS & ALCOHOL TEST
══════════════════════════════════════════════════════════ */
async function exportDATPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:
          (typeof rawDAT!=="undefined"?rawDAT:[]);
  if(!raw.length){_toast("Tidak ada data DAT.","warning");return;}
  _toast("Membuat PPT DAT...","info");
  try{
    var tgl=_now(), TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var kapalDone=new Set(raw.map(function(r){return r["Nama Kapal"];})).size;
    var belum=Math.max(0,TOT-kapalDone);
    var crew=raw.reduce(function(s,r){return s+(parseInt(r["Total Crew Diperiksa"]||0)||0);},0);
    var pos=raw.reduce(function(s,r){return s+(parseInt(r["Jumlah Crew Positif"]||0)||0);},0);
    var neg=Math.max(0,crew-pos);
    var biaya=raw.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"]||0)||0);},0);
    var rate=crew>0?((pos/crew)*100).toFixed(1):"0.0";
    var cov=((kapalDone/TOT)*100).toFixed(1);
    var lb=_months();
    var bMap={}; lb.forEach(function(b){bMap[b]=0;});
    raw.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&bMap[b]!==undefined)bMap[b]++;});
    var vals=lb.map(function(b){return bMap[b]||0;});
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    var periode=((document.getElementById("dat-filter-bulan")||{}).value)||"Semua Bulan";
    var ftr=BRAND.org+" — Drugs & Alcohol Test · "+periode;
    var TOTP=6, pr=_pres("Laporan DAT — IH Dashboard");

    _cover(pr,"DRUGS &\nALCOHOL TEST","Monitoring narkoba & alkohol crew kapal",
      "Pemeriksaan kepatuhan crew sesuai standar MLC 2006 & STCW 2010.",periode,[
      {v:kapalDone,l:"Kapal Diperiksa",c:C.aqua},
      {v:crew.toLocaleString("id-ID"),l:"Total Crew",c:C.wht},
      {v:rate+"%",l:"Tingkat Positif",c:pos>0?C.red:C.grn}
    ],"DAT");

    /* S2 Ringkasan */
    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Eksekutif","Ikhtisar hasil DAT armada — "+periode);
    _kpi(s2,pr,0.45,1.30,3.95,1.95,kapalDone,"Kapal Diperiksa",C.blue,"");
    _kpi(s2,pr,4.55,1.30,3.95,1.95,belum,"Belum DAT",C.amber,"");
    _kpi(s2,pr,8.65,1.30,4.23,1.95,crew.toLocaleString("id-ID"),"Total Crew",C.teal,"");
    _kpi(s2,pr,0.45,3.45,3.95,1.95,pos,"Crew Positif",pos>0?C.red:C.grn,"");
    _kpi(s2,pr,4.55,3.45,3.95,1.95,cov+"%","Coverage",C.grn,"");
    _kpi(s2,pr,8.65,3.45,4.23,1.95,_rp(biaya),"Est. Total Biaya",C.pur,"");
    _note(s2,pr,0.45,5.62,12.43,1.20,
      pos>0 ? "Terdapat "+pos+" crew dengan hasil positif. Tindak lanjuti sesuai MLC 2006 Reg.4.3 (Medical Care) sebelum keberangkatan kapal."
            : "Zero positive rate — kepatuhan penuh terhadap MLC 2006 Reg.4.3. Pertahankan jadwal pemeriksaan berkala.",
      pos>0?C.red:C.grn, pos>0?C.redL:C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    /* S3 Tren & Distribusi */
    var s3=pr.addSlide(); _hdr(s3,pr,"Tren & Distribusi","Frekuensi DAT per bulan dan hasil pemeriksaan");
    _bars(s3,pr,0.45,1.30,7.55,5.55,BULAN_S,vals,C.teal,"Crew Test per Bulan");
    _donut(s3,pr,8.15,1.30,4.73,2.95,[
      {label:"Negatif",value:neg,color:C.grn},
      {label:"Positif",value:pos,color:C.red}
    ],"Hasil Test");
    var ftot=Object.values(fleets).reduce(function(a,v){return a+v;},0);
    _donut(s3,pr,8.15,4.40,4.73,2.45,[
      {label:"FP I",value:fleets["FP I"],color:C.teal},
      {label:"FP II",value:fleets["FP II"],color:C.blue},
      {label:"FC",value:fleets["FC"],color:C.amber},
      {label:"FGP",value:fleets["FGP"],color:C.pur}
    ],ftot>0?"Distribusi Fleet":"Distribusi Fleet");
    _ftr(s3,pr,ftr,3,TOTP);

    /* S4 Data */
    var s4=pr.addSlide(); _hdr(s4,pr,"Data Drugs & Alcohol Test","Rekapitulasi hasil pemeriksaan per kapal");
    var hdr=["Kapal","Fleet","Bulan","Crew","Hasil","Positif"];
    var rows=raw.slice(0,12).map(function(r){
      var p=parseInt(r["Jumlah Crew Positif"]||0)||0;
      return [
        {text:String(r["Nama Kapal"]||"-"),options:{align:"left"}},
        String(r["Jenis Fleet"]||"-"),
        String(r["Bulan Pelaksanaan"]||"-"),
        String(parseInt(r["Total Crew Diperiksa"]||0)||0),
        {text:p>0?"Positif":"Negatif",options:{color:p>0?C.red:C.grn,bold:true}},
        {text:String(p),options:{color:p>0?C.red:C.txt,bold:p>0}}
      ];
    });
    var head=hdr.map(function(t){return {text:t,options:{bold:true,color:C.wht,fill:{color:C.ink},align:"center"}};});
    s4.addTable([head].concat(rows),{x:0.45,y:1.30,w:12.43,
      colW:[3.93,1.5,1.8,1.4,1.9,1.9], border:{type:"solid",color:C.line,pt:0.5},
      fontFace:"Segoe UI",fontSize:10,color:C.txt,align:"center",valign:"middle",rowH:0.38,
      fill:{color:C.wht}});
    if(raw.length>12)s4.addText("… dan "+(raw.length-12)+" data lainnya.",{x:0.45,y:6.40,w:12.43,h:0.3,
      fontSize:9,italic:true,color:C.mut,fontFace:"Segoe UI"});
    _ftr(s4,pr,ftr,4,TOTP);

    /* S5 Rekomendasi (AI) */
    _slideRek(pr,"DAT",{pos:pos,crew:crew,rate:rate,cov:cov,belum:belum,biaya:biaya,biayaR:_rp(biaya)},
      ftr,5,TOTP,"Disesuaikan dari data DAT & regulasi MLC/STCW/OCIMF");

    _closing(pr,"Drugs & Alcohol Test · "+periode);
    await _download(pr,"Laporan_DAT_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT DAT: "+(e&&e.message||e),"error");console.error(e);}
}

/* ══════════════════════════════════════════════════════════
   2) HRA & IH
══════════════════════════════════════════════════════════ */
async function exportHRAPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:
          (typeof rawHRA!=="undefined"?rawHRA:[]);
  if(!raw.length){_toast("Tidak ada data HRA.","warning");return;}
  _toast("Membuat PPT HRA...","info");
  try{
    var tgl=_now(), TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var done=new Set(raw.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
    var belum=Math.max(0,TOT-done);
    var budget=raw.reduce(function(s,r){return s+(parseFloat(r["Est Budget"]||0)||0);},0);
    var cov=((done/TOT)*100).toFixed(1);
    var lb=_months();
    var bMap={}; lb.forEach(function(b){bMap[b]=0;});
    raw.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&bMap[b]!==undefined)bMap[b]++;});
    var vals=lb.map(function(b){return bMap[b]||0;});
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    var hazCnt={};
    raw.forEach(function(r){var h=(r["Top 3 Hazard"]||"").trim();if(!h)return;
      h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){hazCnt[hz]=(hazCnt[hz]||0)+1;});});
    var hazTop=Object.entries(hazCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var stC=parseFloat(cov)>=80?C.grn:parseFloat(cov)>=50?C.amber:C.red;
    var ftr=BRAND.org+" — Hazard Recognition & Assessment · "+tgl;
    var TOTP=6, pr=_pres("Laporan HRA — IH Dashboard");

    _cover(pr,"HAZARD RECOGNITION\n& ASSESSMENT","Monitoring pelaksanaan HRA armada kapal",
      "Identifikasi & penilaian risiko kesehatan kerja pada seluruh armada.",tgl,[
      {v:done,l:"Kapal Telah HRA",c:C.aqua},
      {v:TOT,l:"Total Armada",c:C.wht},
      {v:cov+"%",l:"Coverage HRA",c:stC}
    ],"HRA");

    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Eksekutif","Ikhtisar pelaksanaan HRA armada — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.95,1.95,done,"Kapal Telah HRA",C.blue,"");
    _kpi(s2,pr,4.55,1.30,3.95,1.95,belum,"Belum HRA",belum>0?C.red:C.grn,"");
    _kpi(s2,pr,8.65,1.30,4.23,1.95,cov+"%","Coverage HRA",stC,"");
    _kpi(s2,pr,0.45,3.45,3.95,1.95,TOT,"Total Armada",C.teal,"");
    _kpi(s2,pr,4.55,3.45,3.95,1.95,_rp(budget),"Est. Anggaran",C.pur,"");
    _kpi(s2,pr,8.65,3.45,4.23,1.95,hazTop.length?hazTop[0][0]:"-","Hazard Teratas",C.amber,"");
    _note(s2,pr,0.45,5.62,12.43,1.20,
      parseFloat(cov)<80 ? belum+" unit armada belum HRA. Diperlukan percepatan jadwal agar coverage mencapai target >80%."
                         : "Coverage HRA dalam kondisi baik. Pertahankan siklus HRA berkala dan pembaruan register bahaya.",
      parseFloat(cov)<80?C.amber:C.grn, parseFloat(cov)<80?C.amberL:C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    var s3=pr.addSlide(); _hdr(s3,pr,"Tren & Distribusi","Frekuensi HRA per bulan dan sebaran per fleet");
    _bars(s3,pr,0.45,1.30,7.55,5.55,BULAN_S,vals,C.teal,"HRA per Bulan");
    var ftot=Object.values(fleets).reduce(function(a,v){return a+v;},0);
    _donut(s3,pr,8.15,1.30,4.73,5.55,[
      {label:"FP I",value:fleets["FP I"],color:C.teal},
      {label:"FP II",value:fleets["FP II"],color:C.blue},
      {label:"FC",value:fleets["FC"],color:C.amber},
      {label:"FGP",value:fleets["FGP"],color:C.pur}
    ],"Distribusi per Fleet");
    _ftr(s3,pr,ftr,3,TOTP);

    var s4=pr.addSlide(); _hdr(s4,pr,"Top Hazard Teridentifikasi","Bahaya yang paling sering ditemukan pada HRA");
    if(hazTop.length){
      var hc=[C.red,C.amber,C.teal,C.blue,C.pur];
      hazTop.forEach(function(h,i){_row(s4,pr,0.45,1.40+i*1.04,12.43,0.90,h[1]+"×",h[0],hc[i%hc.length]);});
    }else{
      _note(s4,pr,0.45,1.40,12.43,1.0,"Belum ada data hazard pada periode ini.",C.mut,C.bg);
    }
    _ftr(s4,pr,ftr,4,TOTP);

    /* S5 Rekomendasi (AI) */
    _slideRek(pr,"HRA",{cov:parseFloat(cov),done:done,tot:TOT,hazTop:hazTop,belum:belum,budgetR:_rp(budget)},
      ftr,5,TOTP,"Disesuaikan dari status HRA, profil bahaya & hirarki pengendalian ISO 45001");

    _closing(pr,"Hazard Recognition & Assessment · "+tgl);
    await _download(pr,"Laporan_HRA_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT HRA: "+(e&&e.message||e),"error");console.error(e);}
}

/* ══════════════════════════════════════════════════════════
   3) PEST & RODENT CONTROL
══════════════════════════════════════════════════════════ */
async function exportPestPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredPest!=="undefined"&&filteredPest.length)?filteredPest:
          (typeof rawPest!=="undefined"?rawPest:[]);
  if(!raw.length){_toast("Tidak ada data Pest Control.","warning");return;}
  _toast("Membuat PPT Pest Control...","info");
  try{
    var tgl=_now();
    var totalKeg=raw.length;
    var totalLok=new Set(raw.map(function(r){return(r["Lokasi"]||"").trim();})).size;
    var totalBiaya=raw.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"]||0)||0);},0);
    var hamaMap={};
    raw.forEach(function(r){var t=(r["Temuan / Keluhan"]||"").toLowerCase();
      ["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(function(h){if(t.indexOf(h)>=0)hamaMap[h]=(hamaMap[h]||0)+1;});});
    var hamaTop=Object.entries(hamaMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var hamaDom=hamaTop.length?hamaTop[0][0].charAt(0).toUpperCase()+hamaTop[0][0].slice(1):"-";
    var lb=_months();
    var bMap={}; lb.forEach(function(b){bMap[b]={c:0,bi:0};});
    raw.forEach(function(r){var b=(r["Bulan"]||r["Bulan Pelaksanaan"]||"").trim();
      if(b&&bMap[b]){bMap[b].c++;bMap[b].bi+=(parseFloat(r["Est Biaya"]||0)||0);}});
    var vals=lb.map(function(b){return bMap[b]?bMap[b].c:0;});
    var ftr=BRAND.org+" — Pest & Rodent Control · "+tgl;
    var TOTP=6, pr=_pres("Laporan Pest Control — IH Dashboard");

    _cover(pr,"PEST & RODENT\nCONTROL","Pengendalian vektor & sanitasi lingkungan",
      "Pengendalian hama dan menjaga sanitasi fasilitas sesuai IHR 2005 (WHO).",tgl,[
      {v:totalKeg+"x",l:"Total Kegiatan",c:C.aqua},
      {v:totalLok+" lok",l:"Lokasi Aktif",c:C.wht},
      {v:hamaDom,l:"Hama Dominan",c:C.amber}
    ],"PEST");

    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Eksekutif","Ikhtisar kegiatan Pest Control — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.95,1.95,totalKeg+"x","Total Kegiatan",C.pur,"");
    _kpi(s2,pr,4.55,1.30,3.95,1.95,totalLok,"Lokasi Aktif",C.blue,"");
    _kpi(s2,pr,8.65,1.30,4.23,1.95,_rp(totalBiaya),"Est. Total Biaya",C.teal,"");
    _kpi(s2,pr,0.45,3.45,3.95,1.95,hamaDom,"Hama Dominan",C.red,"");
    _kpi(s2,pr,4.55,3.45,3.95,1.95,(totalKeg/12).toFixed(1)+"x","Rata-rata / Bulan",C.grn,"");
    _kpi(s2,pr,8.65,3.45,4.23,1.95,hamaTop.length,"Jenis Hama",C.amber,"");
    _note(s2,pr,0.45,5.62,12.43,1.20,
      "Program pengendalian berjalan sesuai jadwal. Lanjutkan monitoring rutin dan tindak lanjut temuan untuk menjaga sanitasi lingkungan kerja.",
      C.grn,C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    var s3=pr.addSlide(); _hdr(s3,pr,"Tren & Temuan","Frekuensi kegiatan per bulan dan jenis hama");
    _bars(s3,pr,0.45,1.30,7.55,5.55,BULAN_S,vals,C.pur,"Kegiatan per Bulan");
    if(hamaTop.length){
      s3.addText("Temuan Hama",{x:8.15,y:1.34,w:4.7,h:0.3,fontSize:11.5,bold:true,color:C.ink,fontFace:"Segoe UI"});
      var hc=[C.red,C.amber,C.teal,C.blue,C.pur];
      hamaTop.forEach(function(h,i){_row(s3,pr,8.15,1.72+i*1.00,4.73,0.86,h[1]+"×",h[0].charAt(0).toUpperCase()+h[0].slice(1),hc[i%hc.length]);});
    }else{
      _note(s3,pr,8.15,1.34,4.73,1.0,"Belum ada temuan hama.",C.mut,C.bg);
    }
    _ftr(s3,pr,ftr,3,TOTP);

    var s4=pr.addSlide(); _hdr(s4,pr,"Data Kegiatan Pest Control","Rekapitulasi pelaksanaan per lokasi");
    var head=["Lokasi","Bulan","Temuan","Est. Biaya"].map(function(t){return {text:t,options:{bold:true,color:C.wht,fill:{color:C.ink},align:"center"}};});
    var rows=raw.slice(0,12).map(function(r){
      return [
        {text:String(r["Lokasi"]||"-"),options:{align:"left"}},
        String(r["Bulan"]||r["Bulan Pelaksanaan"]||"-"),
        {text:String(r["Temuan / Keluhan"]||"-").slice(0,60),options:{align:"left"}},
        {text:_rp(r["Est Biaya"]||0),options:{align:"right"}}
      ];
    });
    s4.addTable([head].concat(rows),{x:0.45,y:1.30,w:12.43,
      colW:[3.4,1.7,5.13,2.2], border:{type:"solid",color:C.line,pt:0.5},
      fontFace:"Segoe UI",fontSize:9.5,color:C.txt,align:"center",valign:"middle",rowH:0.40,fill:{color:C.wht}});
    if(raw.length>12)s4.addText("… dan "+(raw.length-12)+" data lainnya.",{x:0.45,y:6.42,w:12.43,h:0.3,
      fontSize:9,italic:true,color:C.mut,fontFace:"Segoe UI"});
    _ftr(s4,pr,ftr,4,TOTP);

    /* S5 Rekomendasi (AI) */
    _slideRek(pr,"PEST",{hamaTop:hamaTop,totalKeg:totalKeg,totalLok:totalLok,biayaR:_rp(totalBiaya)},
      ftr,5,TOTP,"Disesuaikan dari temuan hama & regulasi IHR 2005 / MLC 2006");

    _closing(pr,"Pest & Rodent Control · "+tgl);
    await _download(pr,"Laporan_Pest_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT Pest: "+(e&&e.message||e),"error");console.error(e);}
}

/* ══════════════════════════════════════════════════════════
   4) CLOSEOUT HRA 2025
══════════════════════════════════════════════════════════ */
async function exportCloseout25PPT(){
  if(!(await _guardAsync()))return;
  /* Selalu pakai DATA PENUH agar gambaran close/open lengkap (tidak terpengaruh filter status di layar) */
  var raw=(typeof rawCloseout25!=="undefined"&&rawCloseout25&&rawCloseout25.length)?rawCloseout25:
          (typeof filteredCO25!=="undefined"&&filteredCO25&&filteredCO25.length?filteredCO25:
          (typeof filteredCloseout25!=="undefined"?filteredCloseout25:[]));
  if(!raw.length){_toast("Tidak ada data Closeout.","warning");return;}
  _toast("Membuat PPT Closeout...","info");
  try{
    var tgl=_now();
    /* Normalisasi status: CLOSE = temuan selesai, OPEN = masih ada temuan */
    function _cz(r){
      var v=String(r.closeout!==undefined?r.closeout:(r["Closeout Status"]||r["closeout"]||"")).trim().toUpperCase();
      if(v.indexOf("CLOSE")===0||v==="SELESAI"||v==="DONE")return "CLOSE";
      if(v.indexOf("OPEN")===0||v==="BELUM")return "OPEN";
      return v;
    }
    function _jn(r){return String(r.jenis!==undefined?r.jenis:(r["Jenis"]||"")).trim().toUpperCase();}
    function _fl(r){return String(r.fleet!==undefined?r.fleet:(r["Fleet"]||"")).trim();}
    function _kp(r){return String(r.kapal!==undefined?r.kapal:(r["Nama Kapal"]||"")).trim()||"—";}

    /* ── AGREGASI PER KAPAL ──
       Kapal OPEN  = punya minimal 1 temuan OPEN (perlu tindak lanjut)
       Kapal CLOSE = semua temuannya sudah CLOSE                     */
    var shipMap={};
    raw.forEach(function(r){
      var k=_kp(r);
      if(!shipMap[k])shipMap[k]={open:0,close:0,fleet:_fl(r),jenis:_jn(r)};
      var st=_cz(r);
      if(st==="OPEN")shipMap[k].open++; else if(st==="CLOSE")shipMap[k].close++;
      if(!shipMap[k].fleet)shipMap[k].fleet=_fl(r);
      if(!shipMap[k].jenis)shipMap[k].jenis=_jn(r);
    });
    var shipNames=Object.keys(shipMap);
    var totalKapal=shipNames.length;
    var openList=shipNames.filter(function(k){return shipMap[k].open>0;});
    var kapalOpen=openList.length;
    var kapalClose=shipNames.filter(function(k){return shipMap[k].open===0&&shipMap[k].close>0;}).length;
    var pct=totalKapal>0?Math.round(kapalClose/totalKapal*100):0;
    var stC=pct>=80?C.grn:pct>=50?C.amber:C.red;
    /* item-level (info sekunder) */
    var itemClose=raw.filter(function(r){return _cz(r)==="CLOSE";}).length;
    var itemOpen=raw.filter(function(r){return _cz(r)==="OPEN";}).length;

    /* Distribusi KAPAL per fleet */
    var FLEETS=["Fleet Product I","Fleet Product II","Fleet Crude","Fleet Gas & Petchem"];
    var fleetRows=FLEETS.map(function(f){
      var cl=0,op=0;
      shipNames.forEach(function(k){if(shipMap[k].fleet===f){if(shipMap[k].open>0)op++;else if(shipMap[k].close>0)cl++;}});
      return {fleet:f,close:cl,open:op,total:cl+op};
    }).filter(function(x){return x.total>0;});
    var fleetTopOpen=fleetRows.slice().sort(function(a,b){return b.open-a.open;})[0];
    /* jenis (per kapal) */
    var hraK=shipNames.filter(function(k){return shipMap[k].jenis==="HRA";}).length;
    var ihmK=shipNames.filter(function(k){return shipMap[k].jenis==="IHM";}).length;

    var ftr=BRAND.org+" — Closeout HRA 2025 · "+tgl;
    var ROWS_PER=13;
    var numTbl=Math.max(1,Math.ceil(openList.length/ROWS_PER));
    var TOTP=5+numTbl, pr=_pres("Closeout HRA 2025 — IH Dashboard");

    _cover(pr,"CLOSEOUT\nHRA 2025","Status tindak lanjut temuan per kapal",
      "Pemantauan penyelesaian rekomendasi temuan HRA/IHM 2025 berdasarkan status kapal.",tgl,[
      {v:totalKapal,l:"Total Kapal",c:C.aqua},
      {v:kapalClose,l:"Kapal Close",c:C.grn},
      {v:kapalOpen,l:"Kapal Open",c:kapalOpen>0?C.red:C.grn}
    ],"2025");

    /* S2 Ringkasan (berbasis kapal) */
    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Status Closeout","Status penyelesaian temuan berdasarkan kapal — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.95,2.05,totalKapal,"Total Kapal",C.blue);
    _kpi(s2,pr,4.55,1.30,3.95,2.05,kapalClose,"Kapal Close",C.grn);
    _kpi(s2,pr,8.65,1.30,4.23,2.05,kapalOpen,"Kapal Open — Perlu Tindak Lanjut",kapalOpen>0?C.red:C.grn);
    /* Progress panel (kapal close) */
    s2.addShape(pr.ShapeType.roundRect,{x:0.45,y:3.55,w:12.43,h:1.85,
      fill:{color:C.wht},line:{color:C.line,width:0.75},rectRadius:0.08});
    s2.addShape(pr.ShapeType.rect,{x:0.45,y:3.55,w:12.43,h:0.08,fill:{color:stC},line:{type:"none"}});
    s2.addText("Progress Closeout Kapal",{x:0.70,y:3.78,w:8,h:0.30,fontSize:12,bold:true,color:C.ink,fontFace:"Segoe UI"});
    s2.addText(pct+"%",{x:10.5,y:3.70,w:2.2,h:0.6,fontSize:30,bold:true,color:stC,align:"right",fontFace:"Segoe UI"});
    s2.addShape(pr.ShapeType.roundRect,{x:0.70,y:4.36,w:11.93,h:0.40,fill:{color:C.line},line:{type:"none"},rectRadius:0.06});
    if(pct>0)s2.addShape(pr.ShapeType.roundRect,{x:0.70,y:4.36,w:Math.max(0.2,11.93*(pct/100)),h:0.40,fill:{color:stC},line:{type:"none"},rectRadius:0.06});
    s2.addText(kapalClose+" dari "+totalKapal+" kapal sudah CLOSE  ·  total temuan: "+raw.length+" ("+itemClose+" close / "+itemOpen+" open).",
      {x:0.70,y:4.86,w:11.93,h:0.36,fontSize:10.5,color:C.txt,fontFace:"Segoe UI"});
    _note(s2,pr,0.45,5.62,12.43,1.20,
      kapalOpen>0 ? kapalOpen+" kapal masih berstatus OPEN dan perlu ditindaklanjuti. Tetapkan PIC dan tenggat penyelesaian untuk mempercepat closure."
                  : "Seluruh kapal telah berstatus CLOSE. Pertahankan kedisiplinan tindak lanjut pada siklus HRA berikutnya.",
      kapalOpen>0?C.amber:C.grn, kapalOpen>0?C.amberL:C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    /* S3 Distribusi kapal per fleet */
    var s3=pr.addSlide(); _hdr(s3,pr,"Distribusi Kapal per Fleet","Jumlah kapal CLOSE/OPEN per fleet dan jenis temuan");
    if(fleetRows.length){
      s3.addText("Per Fleet (kapal close / total)",{x:0.45,y:1.30,w:7.5,h:0.3,fontSize:11.5,bold:true,color:C.ink,fontFace:"Segoe UI"});
      fleetRows.forEach(function(f,i){
        _row(s3,pr,0.45,1.68+i*0.92,7.5,0.78,
          f.close+"/"+f.total, f.fleet+"  —  "+f.open+" kapal open",
          f.open>0?C.amber:C.grn);
      });
    }else{
      _note(s3,pr,0.45,1.40,7.5,1.0,"Belum ada data per fleet.",C.mut,C.bg);
    }
    s3.addShape(pr.ShapeType.roundRect,{x:0.45,y:5.45,w:7.5,h:1.35,fill:{color:C.wht},line:{color:C.line,width:0.75},rectRadius:0.08});
    s3.addText("Jenis Temuan (kapal)",{x:0.65,y:5.58,w:7,h:0.28,fontSize:11,bold:true,color:C.ink,fontFace:"Segoe UI"});
    s3.addText([{text:String(hraK),options:{fontSize:24,bold:true,color:C.blue}},{text:"  HRA",options:{fontSize:12,color:C.mut}}],
      {x:0.65,y:5.92,w:3.5,h:0.7,valign:"middle",fontFace:"Segoe UI"});
    s3.addText([{text:String(ihmK),options:{fontSize:24,bold:true,color:C.pur}},{text:"  IHM",options:{fontSize:12,color:C.mut}}],
      {x:4.30,y:5.92,w:3.5,h:0.7,valign:"middle",fontFace:"Segoe UI"});
    _donut(s3,pr,8.15,1.40,4.73,5.20,[
      {label:"Kapal Close",value:kapalClose,color:C.grn},
      {label:"Kapal Open",value:kapalOpen,color:C.red}
    ],"Status Kapal");
    _ftr(s3,pr,ftr,3,TOTP);

    /* S4.. Daftar Kapal OPEN (perlu tindak lanjut) — berhalaman, tampil SEMUA */
    var headOpen=["No","Nama Kapal","Fleet","Jenis","Temuan Open"].map(function(t){return {text:t,options:{bold:true,color:C.wht,fill:{color:C.ink},align:"center"}};});
    if(kapalOpen>0){
      for(var pgI=0;pgI<numTbl;pgI++){
        var chunk=openList.slice(pgI*ROWS_PER,(pgI+1)*ROWS_PER);
        var sT=pr.addSlide();
        _hdr(sT,pr,"Kapal Perlu Tindak Lanjut"+(numTbl>1?" ("+(pgI+1)+"/"+numTbl+")":""),
          "Daftar kapal berstatus OPEN yang harus diselesaikan — total "+kapalOpen+" kapal");
        var rows=chunk.map(function(k,j){
          var idx=pgI*ROWS_PER+j+1, s=shipMap[k];
          return [
            {text:String(idx),options:{align:"center"}},
            {text:k,options:{align:"left",bold:true}},
            {text:s.fleet||"—",options:{align:"left"}},
            {text:s.jenis||"—",options:{align:"center"}},
            {text:String(s.open),options:{align:"center",bold:true,color:C.red}}
          ];
        });
        sT.addTable([headOpen].concat(rows),{x:0.45,y:1.30,w:12.43,
          colW:[0.9,5.0,3.6,1.5,1.43],border:{type:"solid",color:C.line,pt:0.5},
          fontFace:"Segoe UI",fontSize:10.5,color:C.txt,align:"center",valign:"middle",rowH:0.40,fill:{color:C.wht}});
        _ftr(sT,pr,ftr,4+pgI,TOTP);
      }
    }else{
      var sT0=pr.addSlide();
      _hdr(sT0,pr,"Kapal Perlu Tindak Lanjut","Status tindak lanjut temuan");
      _note(sT0,pr,0.45,1.50,12.43,1.4,
        "Tidak ada kapal berstatus OPEN. Seluruh "+totalKapal+" kapal telah menyelesaikan tindak lanjut temuan (CLOSE).",
        C.grn,C.grnL);
      _ftr(sT0,pr,ftr,4,TOTP);
    }

    /* Rekomendasi (AI) — halaman setelah tabel */
    var fleetRanked=fleetRows.filter(function(f){return f.open>0;}).sort(function(a,b){return b.open-a.open;});
    _slideRek(pr,"CLOSEOUT",{totalKapal:totalKapal,kapalClose:kapalClose,kapalOpen:kapalOpen,pct:pct,
      fleetTopOpen:(fleetTopOpen&&fleetTopOpen.open>0)?fleetTopOpen.fleet:null,
      fleetTopOpenN:(fleetTopOpen&&fleetTopOpen.open>0)?fleetTopOpen.open:0,
      fleetRanked:fleetRanked,
      itemOpen:itemOpen,itemClose:itemClose,total:raw.length},
      ftr,4+numTbl,TOTP,"Rekomendasi tindak lanjut per fleet · ISO 45001:2018");

    _closing(pr,"Closeout HRA 2025 · "+tgl);
    await _download(pr,"Closeout_HRA_2025_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT Closeout: "+(e&&e.message||e),"error");console.error(e);}
}

/* ══════════════════════════════════════════════════════════
   5) SUMMARY DASHBOARD
══════════════════════════════════════════════════════════ */
async function exportSummaryPPT(){
  if(!(await _guardAsync()))return;
  _toast("Membuat Summary PPT...","info");
  try{
    var tgl=_now(), TK=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var hraData=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:(typeof rawHRA!=="undefined"?rawHRA:[]);
    var datData=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:(typeof rawDAT!=="undefined"?rawDAT:[]);
    var pestData=(typeof filteredPest!=="undefined"&&filteredPest.length)?filteredPest:(typeof rawPest!=="undefined"?rawPest:[]);

    var hraDone=new Set(hraData.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
    var hraCov=TK>0?(hraDone/TK*100).toFixed(1):"0.0";
    var datCrew=datData.reduce(function(s,r){return s+(parseInt(r["Total Crew Diperiksa"]||r["Total Crew"]||0)||0);},0);
    var datPos=datData.reduce(function(s,r){return s+(parseInt(r["Jumlah Crew Positif"]||0)||0);},0);
    var datPct=datCrew>0?(((datCrew-datPos)/datCrew)*100).toFixed(1):"100.0";
    var pestCount=pestData.length;
    var budget=hraData.reduce(function(s,r){return s+(parseFloat(r["Est Budget"]||0)||0);},0);
    var ftr=BRAND.org+" — Summary Industrial Hygiene · "+tgl;
    var TOTP=4, pr=_pres("IH Dashboard — Summary Report");

    _cover(pr,"SUMMARY\nDASHBOARD","Industrial Hygiene · ringkasan kinerja",
      "Monitoring, assessment, dan pengelolaan bahaya kesehatan kerja terpadu.",tgl,[
      {v:hraDone+"/"+TK,l:"Coverage HRA",c:C.aqua},
      {v:datCrew.toLocaleString("id-ID"),l:"Crew DAT",c:C.wht},
      {v:pestCount+"x",l:"Pest Control",c:C.amber}
    ],"IH");

    var overallOk=parseFloat(hraCov)>=60&&parseFloat(datPct)>=95;
    var s2=pr.addSlide(); _hdr(s2,pr,"Overview Eksekutif","Ringkasan kinerja Industrial Hygiene — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.05,1.85,hraDone+"/"+TK,"Coverage HRA",parseFloat(hraCov)>=80?C.grn:C.amber,"");
    _kpi(s2,pr,3.62,1.30,3.05,1.85,datPct+"%","DAT Compliance",parseFloat(datPct)>=99?C.grn:C.amber,"");
    _kpi(s2,pr,6.79,1.30,3.05,1.85,pestCount+"x","Pest Control",C.teal,"");
    _kpi(s2,pr,9.96,1.30,2.92,1.85,_rp(budget),"Est. Budget HRA",C.pur,"");
    _note(s2,pr,0.45,3.35,12.43,0.78,
      (overallOk?"STATUS KESELURUHAN: BAIK — semua indikator utama dalam batas normal."
                :"STATUS KESELURUHAN: PERHATIAN — beberapa indikator perlu tindak lanjut."),
      overallOk?C.grn:C.amber, overallOk?C.grnL:C.amberL);
    var head=["Indikator","Nilai","Target","Status"].map(function(t){return {text:t,options:{bold:true,color:C.wht,fill:{color:C.ink}}};});
    var rows=[
      ["Coverage HRA & IH",hraDone+" / "+TK+" kapal ("+hraCov+"%)",">80%",parseFloat(hraCov)>=80?"OK":"Perhatian"],
      ["DAT — Compliance",datPct+"%",">99%",parseFloat(datPct)>=99?"OK":"Perhatian"],
      ["DAT — Crew Positif",datPos+" crew","0",datPos===0?"Clear":"Tindak Lanjut"],
      ["Pest Control",pestCount+" pelaksanaan",">0",pestCount>0?"Aktif":"Belum Ada"],
      ["Est. Budget HRA",_rp(budget),"—","Info"]
    ].map(function(r){return r.map(function(c,ci){return ci===0?{text:c,options:{align:"left",bold:true}}:String(c);});});
    s2.addTable([head].concat(rows),{x:0.45,y:4.32,w:12.43,
      colW:[3.9,4.0,2.0,2.53], border:{type:"solid",color:C.line,pt:0.5},
      fontFace:"Segoe UI",fontSize:10.5,color:C.txt,align:"center",valign:"middle",rowH:0.40,fill:{color:C.wht}});
    _ftr(s2,pr,ftr,2,TOTP);

    /* S3 Rekomendasi Strategis (AI) */
    _slideRek(pr,"SUMMARY",{hraCov:hraCov,datPct:datPct,datPos:datPos,pestCount:pestCount,overallOk:overallOk,budgetR:_rp(budget)},
      ftr,3,TOTP,"Sintesis lintas modul IH dari data & regulasi");

    _closing(pr,"Industrial Hygiene Summary · "+tgl);
    await _download(pr,"IH_Summary_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat Summary PPT: "+(e&&e.message||e),"error");console.error(e);}
}

/* ── Ekspos ke global (untuk onclick di index.html / script.js) ── */
/* ══════════════════════════════════════════════════════════
   6) MCU PELAUT — Medical Surveillance
   Data: filteredMCU / rawMCU (field _riskLevel, _audioKlasif,
   _spiro, _hemoStatus, _visusStatus, "Hasil Umum")
══════════════════════════════════════════════════════════ */
async function exportMCUPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredMCU!=="undefined"&&filteredMCU.length)?filteredMCU:
          (typeof rawMCU!=="undefined"?rawMCU:[]);
  if(!raw.length){_toast("Tidak ada data MCU Pelaut.","warning");return;}
  _toast("Membuat PPT MCU Pelaut...","info");
  try{
    var tgl=_now();
    var total=raw.length;
    function huOf(r){return String(r["Hasil Umum"]||"").toUpperCase();}
    var fit=raw.filter(function(r){return huOf(r)==="FIT";}).length;
    var fitB=raw.filter(function(r){return huOf(r)==="FIT BERSYARAT";}).length;
    var unfit=raw.filter(function(r){return huOf(r)==="UNFIT";}).length;
    var nihl=raw.filter(function(r){return (r._audioKlasif||"")==="NIHL";}).length;
    var spiroAbn=raw.filter(function(r){var p=r._spiro||"";return p!=="Normal"&&p!=="—"&&p!=="";}).length;
    var spiroBelum=raw.filter(function(r){return (r._spiro||"")==="—"||(r._spiro||"")==="";}).length;
    var hemoAbn=raw.filter(function(r){return (r._hemoStatus||"")==="ABNORMAL";}).length;
    var visusTL=raw.filter(function(r){return (r._visusStatus||"")==="TIDAK LAYAK";}).length;
    var visusPerhatian=raw.filter(function(r){return (r._visusStatus||"")==="PERHATIAN";}).length;
    var riskTinggi=raw.filter(function(r){return (r._riskLevel||"").toUpperCase()==="TINGGI";}).length;
    var riskKritis=raw.filter(function(r){return (r._riskLevel||"").toUpperCase()==="KRITIS";}).length;
    var fitPct=total>0?((fit/total)*100).toFixed(1):"0.0";
    var tahun="";var ts={};raw.forEach(function(r){var t=String(r["Tahun MCU"]||"").trim();if(t)ts[t]=(ts[t]||0)+1;});
    var tk=Object.keys(ts);if(tk.length===1)tahun=tk[0];
    var stC=parseFloat(fitPct)>=90?C.grn:parseFloat(fitPct)>=75?C.amber:C.red;
    var ftr=BRAND.org+" — Medical Surveillance (MCU Pelaut) · "+tgl;
    var TOTP=5, pr=_pres("Laporan MCU Pelaut — IH Dashboard");

    _cover(pr,"MEDICAL\nSURVEILLANCE","Pemantauan kesehatan pelaut (MCU)",
      "Surveilans kesehatan kerja & kelaikan medis pelaut sesuai MLC 2006.",tgl,[
      {v:total,l:"Total Pelaut",c:C.aqua},
      {v:fitPct+"%",l:"Fit Rate",c:stC},
      {v:unfit,l:"Unfit",c:unfit>0?C.red:C.grn}
    ],"MCU");

    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Eksekutif","Status kelaikan medis pelaut — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.95,1.95,fit,"FIT",C.grn,"");
    _kpi(s2,pr,4.55,1.30,3.95,1.95,fitB,"FIT Bersyarat",fitB>0?C.amber:C.grn,"");
    _kpi(s2,pr,8.65,1.30,4.23,1.95,unfit,"UNFIT",unfit>0?C.red:C.grn,"");
    _kpi(s2,pr,0.45,3.45,3.95,1.95,nihl,"Indikasi NIHL",nihl>0?C.red:C.grn,"");
    _kpi(s2,pr,4.55,3.45,3.95,1.95,spiroAbn,"Spiro Abnormal",spiroAbn>0?C.amber:C.grn,"");
    _kpi(s2,pr,8.65,3.45,4.23,1.95,(riskTinggi+riskKritis),"Risiko Tinggi/Kritis",(riskTinggi+riskKritis)>0?C.red:C.grn,"");
    _note(s2,pr,0.45,5.62,12.43,1.20,
      unfit>0||nihl>0 ? unfit+" pelaut UNFIT & "+nihl+" indikasi NIHL memerlukan tindak lanjut medis prioritas sebelum penugasan."
                      : "Status kesehatan populasi pelaut dalam kondisi baik. Lanjutkan surveilans periodik.",
      unfit>0||nihl>0?C.amber:C.grn, unfit>0||nihl>0?C.amberL:C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    var s3=pr.addSlide(); _hdr(s3,pr,"Distribusi Status & Temuan","Sebaran hasil pemeriksaan kesehatan");
    _donut(s3,pr,0.45,1.30,5.9,5.55,[
      {label:"FIT",value:fit,color:C.grn},
      {label:"FIT Bersyarat",value:fitB,color:C.amber},
      {label:"UNFIT",value:unfit,color:C.red}
    ],"Status Kelaikan Medis");
    var temuan=[["NIHL (Pendengaran)",nihl],["Spirometri Abnormal",spiroAbn],["Hematologi Abnormal",hemoAbn],["Visus Tidak Layak",visusTL]];
    var tc=[C.red,C.amber,C.blue,C.pur];
    temuan.forEach(function(t,i){_row(s3,pr,6.65,1.40+i*1.30,6.23,1.10,t[1],t[0],tc[i%tc.length]);});
    _ftr(s3,pr,ftr,3,TOTP);

    /* S4 Rekomendasi (AI) */
    _slideRek(pr,"MCU",{total:total,fit:fit,fitBersyarat:fitB,unfit:unfit,fitPct:fitPct,
      nihl:nihl,spiroAbn:spiroAbn,spiroBelum:spiroBelum,hemoAbn:hemoAbn,
      visusTidakLayak:visusTL,visusPerhatian:visusPerhatian,riskTinggi:riskTinggi,riskKritis:riskKritis,tahun:tahun},
      ftr,4,TOTP,"Disesuaikan dari status kelaikan medis, NIHL & profil risiko · MLC 2006 / STCW 2010");

    _closing(pr,"Medical Surveillance (MCU Pelaut) · "+tgl);
    await _download(pr,"Laporan_MCU_Pelaut_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT MCU: "+(e&&e.message||e),"error");console.error(e);}
}

/* ══════════════════════════════════════════════════════════
   7) SEBARAN ALKES KAPAL — Medical Equipment Readiness
   Data: filteredAlkes / rawAlkes (field _status, _kelengkapanPct,
   _expiredAED, _kapal, _fleet)
══════════════════════════════════════════════════════════ */
async function exportAlkesPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredAlkes!=="undefined"&&filteredAlkes.length)?filteredAlkes:
          (typeof rawAlkes!=="undefined"?rawAlkes:[]);
  if(!raw.length){_toast("Tidak ada data Sebaran Alkes.","warning");return;}
  _toast("Membuat PPT Sebaran Alkes...","info");
  try{
    var tgl=_now();
    var totalKapal=raw.length;
    var lengkap=raw.filter(function(r){return (r._status||"")==="LENGKAP";}).length;
    var parsial=raw.filter(function(r){return (r._status||"")==="PARSIAL";}).length;
    var tidakLengkap=raw.filter(function(r){return (r._status||"")==="TIDAK LENGKAP";}).length;
    var expired=raw.filter(function(r){return (r._status||"")==="EXPIRED";}).length;
    var aedExpired=raw.filter(function(r){return r._expiredAED===true;}).length;
    var sumPct=raw.reduce(function(s,r){return s+(parseFloat(r._kelengkapanPct)||0);},0);
    var avgPct=totalKapal>0?Math.round(sumPct/totalKapal):0;
    /* kapal kelengkapan terendah */
    var kapalKurang=raw.map(function(r){return {nama:r._kapal||r["Nama Kapal"]||"-",pct:parseFloat(r._kelengkapanPct)||0};})
      .filter(function(k){return k.pct<100;})
      .sort(function(a,b){return a.pct-b.pct;});
    var stC=avgPct>=90?C.grn:avgPct>=60?C.amber:C.red;
    var ftr=BRAND.org+" — Sebaran Alkes Kapal · "+tgl;
    var TOTP=5, pr=_pres("Laporan Sebaran Alkes — IH Dashboard");

    _cover(pr,"MEDICAL EQUIPMENT\nREADINESS","Kelengkapan alat kesehatan armada",
      "Pemantauan kesiapan alat kesehatan & tanggap darurat di kapal sesuai MLC 2006 Reg.4.1.",tgl,[
      {v:totalKapal,l:"Total Kapal",c:C.aqua},
      {v:avgPct+"%",l:"Rata-rata Kelengkapan",c:stC},
      {v:aedExpired,l:"AED Expired",c:aedExpired>0?C.red:C.grn}
    ],"ALKES");

    var s2=pr.addSlide(); _hdr(s2,pr,"Ringkasan Eksekutif","Status kelengkapan alkes armada — "+tgl);
    _kpi(s2,pr,0.45,1.30,3.95,1.95,lengkap,"Kapal Lengkap",C.grn,"");
    _kpi(s2,pr,4.55,1.30,3.95,1.95,parsial,"Parsial",parsial>0?C.amber:C.grn,"");
    _kpi(s2,pr,8.65,1.30,4.23,1.95,tidakLengkap,"Tidak Lengkap",tidakLengkap>0?C.red:C.grn,"");
    _kpi(s2,pr,0.45,3.45,3.95,1.95,avgPct+"%","Rata-rata Kelengkapan",stC,"");
    _kpi(s2,pr,4.55,3.45,3.95,1.95,aedExpired,"AED Kedaluwarsa",aedExpired>0?C.red:C.grn,"");
    _kpi(s2,pr,8.65,3.45,4.23,1.95,totalKapal,"Total Armada",C.teal,"");
    _note(s2,pr,0.45,5.62,12.43,1.20,
      aedExpired>0||tidakLengkap>0 ? aedExpired+" AED kedaluwarsa & "+tidakLengkap+" kapal tidak lengkap — perlu pengadaan prioritas untuk kesiapan tanggap darurat."
                                   : "Kelengkapan alkes armada dalam kondisi baik. Pertahankan jadwal inspeksi & kalibrasi berkala.",
      aedExpired>0||tidakLengkap>0?C.red:C.grn, aedExpired>0||tidakLengkap>0?C.redL:C.grnL);
    _ftr(s2,pr,ftr,2,TOTP);

    var s3=pr.addSlide(); _hdr(s3,pr,"Distribusi & Kapal Prioritas","Status kelengkapan & kapal yang perlu pemenuhan");
    _donut(s3,pr,0.45,1.30,5.9,5.55,[
      {label:"Lengkap",value:lengkap,color:C.grn},
      {label:"Parsial",value:parsial,color:C.amber},
      {label:"Tidak Lengkap",value:tidakLengkap,color:C.red},
      {label:"Expired",value:expired,color:C.pur}
    ],"Status Kelengkapan Alkes");
    if(kapalKurang.length){
      kapalKurang.slice(0,4).forEach(function(k,i){
        var kc=k.pct<50?C.red:k.pct<80?C.amber:C.blue;
        _row(s3,pr,6.65,1.40+i*1.30,6.23,1.10,k.pct+"%",k.nama,kc);
      });
    }else{
      _note(s3,pr,6.65,1.40,6.23,1.0,"Seluruh kapal lengkap 100%.",C.grn,C.grnL);
    }
    _ftr(s3,pr,ftr,3,TOTP);

    /* S4 Rekomendasi (AI) */
    _slideRek(pr,"ALKES",{totalKapal:totalKapal,lengkap:lengkap,parsial:parsial,
      tidakLengkap:tidakLengkap,expired:expired,aedExpired:aedExpired,avgPct:avgPct,kapalKurang:kapalKurang},
      ftr,4,TOTP,"Disesuaikan dari status kelengkapan & AED kedaluwarsa · MLC 2006 Reg.4.1 / ISM Code");

    _closing(pr,"Sebaran Alkes Kapal · "+tgl);
    await _download(pr,"Laporan_Sebaran_Alkes_"+new Date().toISOString().slice(0,10)+".pptx");
  }catch(e){_toast("Gagal membuat PPT Alkes: "+(e&&e.message||e),"error");console.error(e);}
}

if(typeof window!=="undefined"){
  window.exportDATPPT=exportDATPPT;
  window.exportHRAPPT=exportHRAPPT;
  window.exportPestPPT=exportPestPPT;
  window.exportCloseout25PPT=exportCloseout25PPT;
  window.exportSummaryPPT=exportSummaryPPT;
  window.exportMCUPPT=exportMCUPPT;
  window.exportAlkesPPT=exportAlkesPPT;
}
