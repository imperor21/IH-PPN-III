/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — Export PPT untuk HRA, DAT, Pest, Closeout
   IH Dashboard v5.0 — Pertamina Patra Niaga III
   Layout: LAYOUT_WIDE (13.3×7.5 in) — standar presentasi direksi
   Semua warna 6-digit hex. colW sum = w tabel.
═══════════════════════════════════════════════════════════════════ */

/* ══ PALETTE ══ */
var PC={
  navy:"0F2A4A", navyD:"0A1929", navyL:"1C3A5A",
  blue:"1565C0", blueL:"EBF5FF",
  teal:"0288D1", tealL:"E3F2FD",
  green:"2E7D32", greenL:"E8F5E9",
  red:"C62828",  redL:"FFEBEE",
  amber:"F59E0B",amberL:"FEF3C7",
  purple:"6A1B9A",purpleL:"F3E5F5",
  white:"FFFFFF", gray:"F4F6FA",
  text:"1E293B",  muted:"64748B",
  border:"E2E8F0"
};

var BULAN_PPT=["Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"];

function _fmtRp(n){n=parseFloat(n)||0;if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";return"Rp "+Math.round(n).toLocaleString("id-ID");}
function _now(){return new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}
function _guard(){if(typeof PptxGenJS==="undefined"){if(typeof showToast==="function")showToast("Library PPT sedang dimuat, coba lagi.","warning");return false;}return true;}

/* ── Base presentation ── */
function _pres(title){
  var p=new PptxGenJS();
  p.layout="LAYOUT_WIDE";
  p.author="IH Dashboard — Pertamina Patra Niaga III";
  p.title=title;
  return p;
}

/* ── Cover slide ── */
function _cover(pres,judul,sub,tgl,stats){
  var s=pres.addSlide();
  s.background={color:PC.navyD};
  /* Decorative shapes */
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:PC.amber},line:{color:PC.amber}});
  s.addShape(pres.ShapeType.ellipse,{x:9.8,y:0,w:4.5,h:4.5,fill:{color:PC.navyL},line:{color:PC.navyL}});
  s.addShape(pres.ShapeType.ellipse,{x:11.0,y:4.2,w:3.2,h:3.2,fill:{color:"162E42"},line:{color:"162E42"}});
  /* Branding */
  s.addText("PT PERTAMINA PATRA NIAGA  |  SATUAN KERJA REGIONAL III",
    {x:0.4,y:0.28,w:9,h:0.3,fontSize:9,bold:true,color:"CADCFC",charSpacing:1.5,fontFace:"Calibri"});
  s.addText("Divisi Industrial Hygiene & Occupational Health",
    {x:0.4,y:0.6,w:9,h:0.28,fontSize:10,color:"8899AA",fontFace:"Calibri"});
  /* Title */
  s.addText(judul,{x:0.4,y:1.15,w:9,h:1.0,fontSize:34,bold:true,color:PC.white,fontFace:"Calibri"});
  s.addText(sub,{x:0.4,y:2.22,w:9,h:0.55,fontSize:16,bold:true,color:"5BB8F5",fontFace:"Calibri"});
  s.addShape(pres.ShapeType.rect,{x:0.4,y:2.9,w:5.5,h:0.04,fill:{color:PC.amber},line:{color:PC.amber}});
  s.addText("Dihasilkan: "+tgl,{x:0.4,y:3.1,w:9,h:0.35,fontSize:11,color:"CADCFC",fontFace:"Calibri"});
  /* KPI boxes */
  stats.forEach(function(st,i){
    var bx=0.4+i*3.12;
    s.addShape(pres.ShapeType.roundRect,{x:bx,y:3.7,w:2.98,h:1.8,
      fill:{color:PC.navyL},line:{color:st.c||PC.teal,width:1.5},rectRadius:0.1});
    s.addText(st.v,{x:bx,y:3.76,w:2.98,h:0.95,
      fontSize:st.v&&st.v.length>7?20:30,bold:true,color:st.c||"5BB8F5",align:"center",fontFace:"Calibri"});
    s.addText(st.l,{x:bx,y:4.72,w:2.98,h:0.65,
      fontSize:10,color:"CADCFC",align:"center",fontFace:"Calibri",wrap:true});
  });
  s.addText("PT Pertamina Patra Niaga Regional III  •  IH Dashboard v5.0  •  "+tgl,
    {x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"});
}

/* ── Section header ── */
function _hdr(s,pres,accent,sup,main){
  s.background={color:PC.white};
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:PC.navy},line:{color:PC.navy}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:accent},line:{color:accent}});
  s.addText(sup,{x:0.25,y:0.07,w:12.5,h:0.38,fontSize:9,bold:true,color:"CADCFC",fontFace:"Calibri"});
  s.addText(main,{x:0.25,y:0.52,w:12.5,h:0.45,fontSize:14,bold:true,color:PC.white,fontFace:"Calibri"});
}

/* ── Footer ── */
function _ftr(s,pres,ref,pg,total){
  s.addShape(pres.ShapeType.rect,{x:0,y:7.15,w:13.3,h:0.35,fill:{color:PC.gray},line:{color:PC.gray}});
  s.addText(ref||"Ref: Permenaker 05/2018 | ACGIH TLV 2024 | ILO MLC 2006",
    {x:0.2,y:7.17,w:10.5,h:0.28,fontSize:7.5,color:PC.muted,fontFace:"Calibri"});
  s.addText(pg+" / "+total,
    {x:11.0,y:7.17,w:2.1,h:0.28,fontSize:8.5,color:PC.amber,bold:true,align:"right",fontFace:"Calibri"});
}

/* ── KPI box ── */
function _kpi(s,pres,x,y,w,h,label,val,col){
  s.addShape(pres.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:_lighten(col)},line:{color:col,width:1.5},rectRadius:0.08});
  var fs=String(val).length>8?16:String(val).length>5?20:26;
  s.addText(String(val),{x:x,y:y+0.1,w:w,h:h*0.58,
    fontSize:fs,bold:true,color:col,align:"center",fontFace:"Calibri"});
  s.addText(label,{x:x+0.1,y:y+h*0.62,w:w-0.2,h:h*0.36,
    fontSize:9,color:PC.muted,align:"center",fontFace:"Calibri",wrap:true});
}

/* ── Table header row ── */
function _mkH(cols){return cols.map(function(c){return{text:c,options:{bold:true,color:PC.white,fill:{color:PC.navy}}};});}

/* ══ FIX HELPER: warna background KPI dari warna 6-digit ══ */
function _lighten(col){
  var map={
    "1565C0":"EBF5FF","2E7D32":"E8F5E9","C62828":"FFEBEE",
    "E65100":"FFF3E0","6A1B9A":"F3E5F5","0288D1":"E3F2FD",
    "F59E0B":"FEF3C7","0F2A4A":"F0F4F8","7B1FA2":"F3E5F5"
  };
  return map[col]||"F4F6FA";
}

/* ═══════════════════════════════════════════
   1. EXPORT HRA — 5 Slide
═══════════════════════════════════════════ */
function exportHRAPPT(){
  if(!_guard())return;
  var data=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:(typeof rawHRA!=="undefined"?rawHRA:[]);
  if(!data.length){if(typeof showToast==="function")showToast("Tidak ada data HRA.","warning");return;}
  if(typeof showToast==="function")showToast("Membuat PPT HRA...","info");
  try{
    var pres=_pres("Laporan HRA & IH");
    var tgl=_now();
    var done=new Set(data.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
    var total=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var belum=total-done;
    var budget=data.reduce(function(s,r){return s+(parseFloat(r["Est Budget"])||0);},0);
    var cvg=total>0?((done/total)*100).toFixed(1):"0";

    /* S1 Cover */
    _cover(pres,"LAPORAN HAZARD RECOGNITION","& ASSESSMENT (HRA) — IH MONITORING",tgl,[
      {v:String(total),l:"Total Armada",c:PC.blue},
      {v:String(done),l:"Sudah HRA",c:PC.green},
      {v:cvg+"%",l:"Coverage",c:cvg>=80?PC.green:cvg>=50?PC.amber:PC.red},
      {v:_fmtRp(budget),l:"Est. Anggaran",c:PC.purple}
    ]);

    /* S2 Ringkasan Eksekutif */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.blue,"HAZARD RECOGNITION & ASSESSMENT (HRA)","Ringkasan Eksekutif — Status Pelaksanaan HRA Seluruh Armada");
    _kpi(s2,pres,0.3,1.2,2.9,1.55,"Total Armada",String(total),PC.blue);
    _kpi(s2,pres,3.4,1.2,2.9,1.55,"Sudah HRA",String(done),PC.green);
    _kpi(s2,pres,6.5,1.2,2.9,1.55,"Belum HRA",String(belum),belum>0?PC.red:PC.green);
    _kpi(s2,pres,9.6,1.2,2.9,1.55,"Coverage",cvg+"%",parseFloat(cvg)>=80?PC.green:PC.red);
    /* Progress bar */
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:2.95,w:12.7,h:0.32,fill:{color:PC.border},line:{color:PC.border}});
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:2.95,w:Math.max(0.3,12.7*(done/total)),h:0.32,
      fill:{color:parseFloat(cvg)>=80?PC.green:PC.amber},line:{color:parseFloat(cvg)>=80?PC.green:PC.amber}});
    s2.addText("Coverage "+cvg+"% — "+done+" dari "+total+" kapal telah melaksanakan HRA",
      {x:0.3,y:3.3,w:12.7,h:0.3,fontSize:10,color:PC.muted,fontFace:"Calibri"});
    /* Analisis box */
    var anaColor=parseFloat(cvg)>=80?PC.green:PC.red;
    var anaText=parseFloat(cvg)>=80
      ?"Coverage HRA "+cvg+"% mencerminkan kepatuhan yang baik terhadap Permenaker No.05/2018. Sebanyak "+done+" unit armada telah menyelesaikan siklus HRA penuh."
      :"Coverage HRA "+cvg+"% menunjukkan kesenjangan implementasi signifikan. "+belum+" unit armada belum menyelesaikan HRA — berpotensi menimbulkan blind spot dalam manajemen bahaya.";
    s2.addShape(pres.ShapeType.roundRect,{x:0.3,y:3.7,w:12.7,h:1.55,fill:{color:_lighten(anaColor)},line:{color:anaColor,width:1},rectRadius:0.08});
    s2.addText([{text:"Analisis: ",options:{bold:true,color:anaColor}},{text:anaText,options:{color:PC.text}}],
      {x:0.5,y:3.78,w:12.3,h:1.38,fontSize:11,fontFace:"Calibri",wrap:true,valign:"middle"});
    /* Est budget */
    s2.addShape(pres.ShapeType.roundRect,{x:0.3,y:5.35,w:12.7,h:1.4,fill:{color:PC.gray},line:{color:PC.border,width:0.5},rectRadius:0.08});
    s2.addText("Estimasi Anggaran Program:",{x:0.5,y:5.45,w:4,h:0.35,fontSize:10,color:PC.muted,fontFace:"Calibri"});
    s2.addText(_fmtRp(budget),{x:4.5,y:5.38,w:8.2,h:0.55,fontSize:24,bold:true,color:PC.purple,fontFace:"Calibri"});
    s2.addText("Total estimasi anggaran program HRA mencakup seluruh kegiatan pelaksanaan monitoring hazard sesuai Permenaker No.05/2018",
      {x:0.5,y:5.9,w:12.3,h:0.7,fontSize:9.5,color:PC.muted,fontFace:"Calibri",wrap:true});
    _ftr(s2,pres,"Ref: Permenaker No.05/2018 | ACGIH TLV 2024 | ISM Code | ILO MLC 2006",2,5);

    /* S3 Data Table */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.blue,"HAZARD RECOGNITION & ASSESSMENT (HRA)","Detail Data Pelaksanaan HRA per Kapal");
    var rows=[_mkH(["No","Nama Kapal","Fleet","Bulan Pelaksanaan","Vendor","Status","Est. Budget"])];
    data.slice(0,14).forEach(function(r,i){
      var ok=(r["Status"]||"").toLowerCase()==="done";
      rows.push([
        {text:String(i+1)},
        {text:String(r["Nama Kapal"]||"—"),options:{bold:true}},
        {text:String(r["Jenis Fleet"]||r["Fleet"]||"—")},
        {text:String(r["Bulan Pelaksanaan"]||"—")},
        {text:String(r["Vendor Pelaksana"]||"—")},
        {text:ok?"✓ Done":"Belum",options:{bold:true,color:ok?PC.green:PC.red}},
        {text:_fmtRp(r["Est Budget"]||0)}
      ]);
    });
    /* colW sum = 12.7 */
    s3.addTable(rows,{x:0.3,y:1.2,w:12.7,fontSize:9,fontFace:"Calibri",color:PC.text,
      border:{pt:0.5,color:PC.border},rowH:0.33,colW:[0.38,2.5,0.9,1.4,2.5,0.9,1.62]});
    if(data.length>14)s3.addText("... dan "+(data.length-14)+" data lainnya. Lihat detail lengkap di dashboard ihhealth3.com",
      {x:0.3,y:5.95,w:12.7,h:0.3,fontSize:9,color:PC.muted,italic:true,fontFace:"Calibri"});
    _ftr(s3,pres,"Ref: Permenaker No.05/2018 | ACGIH TLV 2024 | ISM Code",3,5);

    /* S4 Distribusi Fleet */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.teal,"HAZARD RECOGNITION & ASSESSMENT (HRA)","Distribusi Pelaksanaan HRA per Fleet & Status");
    var fleetMap={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    data.forEach(function(r){var f=r["Jenis Fleet"]||r["Fleet"];if(f&&fleetMap[f]!==undefined)fleetMap[f]++;});
    s4.addChart(pres.ChartType.bar,[{name:"HRA",labels:Object.keys(fleetMap),values:Object.values(fleetMap)}],{
      x:0.3,y:1.2,w:6.2,h:5.5,barDir:"col",
      chartColors:[PC.blue,PC.teal,PC.green,PC.purple],
      chartArea:{fill:{color:PC.white}},
      catAxisLabelColor:PC.muted,valAxisLabelColor:PC.muted,
      valGridLine:{color:PC.border,size:0.5},catGridLine:{style:"none"},
      showValue:true,dataLabelColor:PC.navy,dataLabelFontSize:10,dataLabelFontBold:true,
      showLegend:false,catAxisLabelFontSize:10,barGapWidthPct:50,
      title:"Jumlah HRA per Fleet",showTitle:true,titleColor:PC.navy,titleFontSize:12
    });
    /* Status doughnut */
    s4.addChart(pres.ChartType.doughnut,[{name:"Status",labels:["Sudah HRA","Belum HRA"],values:[done,belum]}],{
      x:7.0,y:1.4,w:5.8,h:4.5,
      chartColors:[PC.green,PC.red],holeSize:55,
      chartArea:{fill:{color:PC.white}},
      showPercent:true,dataLabelFontSize:11,dataLabelFontBold:true,dataLabelColor:PC.white,
      showLegend:true,legendPos:"b",legendFontSize:11,legendColor:PC.text,
      title:"Coverage HRA",showTitle:true,titleColor:PC.navy,titleFontSize:12
    });
    _ftr(s4,pres,"Ref: Permenaker No.05/2018 | ACGIH TLV 2024 | ISM Code",4,5);

    /* S5 Closing */
    var s5=pres.addSlide();
    s5.background={color:PC.navyD};
    s5.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:PC.amber},line:{color:PC.amber}});
    s5.addText("REKOMENDASI & TINDAK LANJUT",{x:0.4,y:0.6,w:12,h:0.55,fontSize:22,bold:true,color:PC.white,fontFace:"Calibri"});
    s5.addText("Hazard Recognition & Assessment — Pertamina Patra Niaga III",{x:0.4,y:1.22,w:12,h:0.35,fontSize:12,color:"5BB8F5",fontFace:"Calibri"});
    var reks=[
      {t:"Segera (0–30 Hari)",c:PC.red,bg:"1C0A0A",items:[
        belum>0?"Akselerasi jadwal HRA pada "+belum+" unit armada yang belum terlaksana":"Verifikasi dokumentasi HRA seluruh armada",
        "Review vendor pelaksana dan pastikan kompetensi sesuai standar Permenaker No.05/2018",
        "Laporkan progress coverage ke manajemen senior"
      ]},
      {t:"Jangka Pendek (1–3 Bln)",c:PC.amber,bg:"1C1200",items:[
        "Implementasi pengendalian berdasarkan temuan hazard dominan per kapal",
        "Revisi JSA untuk pekerjaan berisiko tinggi di kapal belum HRA",
        "Integrasikan hasil HRA ke dalam Ship Safety Management System"
      ]},
      {t:"Jangka Panjang (3–12 Bln)",c:PC.blue,bg:"081428",items:[
        "Target coverage 100% seluruh armada sebelum akhir tahun 2026",
        "Jadwalkan HRA periodik (min. 1 tahun sekali) sesuai Permenaker No.05/2018",
        "Penyusunan laporan IH tahunan untuk audit eksternal dan biro klasifikasi"
      ]}
    ];
    reks.forEach(function(r,i){
      var rx=0.3+i*4.35;
      s5.addShape(pres.ShapeType.roundRect,{x:rx,y:2.0,w:4.1,h:4.75,fill:{color:r.bg},line:{color:r.c,width:1.5},rectRadius:0.1});
      s5.addShape(pres.ShapeType.rect,{x:rx,y:2.0,w:4.1,h:0.5,fill:{color:r.c},line:{color:r.c}});
      s5.addText(r.t,{x:rx+0.12,y:2.04,w:3.86,h:0.42,fontSize:10,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s5.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.72+j*1.1,w:0.2,h:0.2,fill:{color:r.c},line:{color:r.c}});
        s5.addText(it,{x:rx+0.48,y:2.65+j*1.1,w:3.45,h:0.98,fontSize:10,color:"CADCFC",fontFace:"Calibri",wrap:true,valign:"middle"});
      });
    });
    s5.addText("IH Dashboard v5.0  •  ihhealth3.com  •  PT Pertamina Patra Niaga III  •  "+tgl,
      {x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"});

    pres.writeFile({fileName:"IH_HRA_"+tgl.replace(/ /g,"_")+".pptx"})
      .then(function(){if(typeof showToast==="function")showToast("PPT HRA berhasil didownload!","success");})
      .catch(function(e){if(typeof showToast==="function")showToast("Gagal: "+e.message,"error");});
  }catch(e){if(typeof showToast==="function")showToast("Error: "+e.message,"error");console.error(e);}
}

/* ═══════════════════════════════════════
   2. EXPORT DAT — 5 Slide
═══════════════════════════════════════ */
function exportDATPPT(){
  if(!_guard())return;
  var data=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:(typeof rawDAT!=="undefined"?rawDAT:[]);
  if(!data.length){if(typeof showToast==="function")showToast("Tidak ada data DAT.","warning");return;}
  if(typeof showToast==="function")showToast("Membuat PPT DAT...","info");
  try{
    var pres=_pres("Laporan Drugs & Alcohol Test");
    var tgl=_now();
    var crew=data.reduce(function(s,r){return s+(parseInt(r["Total Crew Diperiksa"])||0);},0);
    var pos=data.reduce(function(s,r){return s+(parseInt(r["Jumlah Crew Positif"])||0);},0);
    var kapal=new Set(data.map(function(r){return r["Nama Kapal"];})).size;
    var biaya=data.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"])||0);},0);
    var rate=crew>0?((pos/crew)*100).toFixed(2):"0";

    /* S1 Cover */
    _cover(pres,"LAPORAN DRUGS & ALCOHOL TEST","Pemeriksaan Narkotika, Psikotropika & Stimulan — Awak Kapal",tgl,[
      {v:String(kapal),l:"Kapal Terperiksa",c:PC.blue},
      {v:String(crew),l:"Total Crew",c:PC.teal},
      {v:String(pos),l:"Hasil Reaktif",c:pos>0?PC.red:PC.green},
      {v:rate+"%",l:"Prevalensi",c:parseFloat(rate)>0?PC.amber:PC.green}
    ]);

    /* S2 Ringkasan */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.green,"DRUGS & ALCOHOL TEST (DAT)","Ringkasan Eksekutif — Status Pemeriksaan Awak Kapal");
    _kpi(s2,pres,0.3,1.2,2.9,1.55,"Kapal Terperiksa",String(kapal),PC.green);
    _kpi(s2,pres,3.4,1.2,2.9,1.55,"Total Crew",crew>999?crew.toLocaleString("id-ID"):String(crew),PC.blue);
    _kpi(s2,pres,6.5,1.2,2.9,1.55,"Hasil Reaktif",String(pos),pos>0?PC.red:PC.green);
    _kpi(s2,pres,9.6,1.2,2.9,1.55,"Prevalensi",rate+"%",parseFloat(rate)>0?PC.amber:PC.green);
    var anaColorDAT=pos===0?PC.green:PC.red;
    var anaTxtDAT=pos===0
      ?"Program DAT mencatat zero positive rate dari "+crew.toLocaleString("id-ID")+" awak kapal yang diperiksa pada "+kapal+" unit armada. Capaian ini merupakan indikator tertinggi kepatuhan terhadap MLC 2006 Regulation 4.3."
      :"Program DAT menemukan "+pos+" awak kapal reaktif (prevalensi "+rate+"%) dari "+crew.toLocaleString("id-ID")+" yang diperiksa. Seluruh kasus wajib mendapat penanganan medis dan tindak lanjut administratif sesuai SOP perusahaan dan MLC 2006 Reg.4.3.";
    s2.addShape(pres.ShapeType.roundRect,{x:0.3,y:2.9,w:12.7,h:1.6,fill:{color:_lighten(anaColorDAT)},line:{color:anaColorDAT,width:1},rectRadius:0.08});
    s2.addText([{text:"Analisis: ",options:{bold:true,color:anaColorDAT}},{text:anaTxtDAT,options:{color:PC.text}}],
      {x:0.5,y:2.98,w:12.3,h:1.44,fontSize:11,fontFace:"Calibri",wrap:true,valign:"middle"});
    s2.addShape(pres.ShapeType.roundRect,{x:0.3,y:4.6,w:12.7,h:2.1,fill:{color:PC.gray},line:{color:PC.border,width:0.5},rectRadius:0.08});
    s2.addText("Estimasi Total Biaya Program DAT:",{x:0.5,y:4.7,w:5,h:0.38,fontSize:10,color:PC.muted,fontFace:"Calibri"});
    s2.addText(_fmtRp(biaya),{x:5.5,y:4.62,w:7.2,h:0.6,fontSize:26,bold:true,color:PC.blue,fontFace:"Calibri"});
    s2.addText("Referensi regulasi: ILO MLC 2006 Reg.4.3 • Permenaker No.05/2018 • Peraturan Menteri Perhubungan tentang kesehatan awak kapal",
      {x:0.5,y:5.28,w:12.3,h:1.28,fontSize:10,color:PC.muted,fontFace:"Calibri",wrap:true,valign:"middle"});
    _ftr(s2,pres,"Ref: ILO MLC 2006 Reg.4.3 | Permenaker 05/2018 | Permenhub",2,5);

    /* S3 Tabel per Bulan */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.green,"DRUGS & ALCOHOL TEST (DAT)","Rekapitulasi Pelaksanaan DAT per Periode");
    /* Bangun bulan list */
    var bMap={};
    data.forEach(function(r){
      var b=r["Bulan Pelaksanaan"]||"—";
      if(!bMap[b])bMap[b]={bulan:b,kapal:new Set(),crew:0,pos:0,biaya:0};
      bMap[b].kapal.add(r["Nama Kapal"]||"");
      bMap[b].crew+=parseInt(r["Total Crew Diperiksa"])||0;
      bMap[b].pos+=parseInt(r["Jumlah Crew Positif"])||0;
      bMap[b].biaya+=parseFloat(r["Est Biaya"])||0;
    });
    var bList=Object.values(bMap).sort(function(a,b){return(typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:BULAN_PPT).indexOf(a.bulan)-(typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:BULAN_PPT).indexOf(b.bulan);});
    var rows3=[_mkH(["Bulan","Kapal","Crew Diperiksa","Hasil Positif","Prevalensi","Est. Biaya","Status"])];
    bList.forEach(function(r){
      var ok=r.pos===0,rt=r.crew>0?((r.pos/r.crew)*100).toFixed(2):"0";
      rows3.push([
        {text:r.bulan,options:{bold:true}},
        {text:r.kapal.size+" unit"},
        {text:String(r.crew),options:{bold:true}},
        {text:String(r.pos),options:{bold:true,color:ok?PC.green:PC.red}},
        {text:rt+"%",options:{color:ok?PC.green:PC.red}},
        {text:_fmtRp(r.biaya)},
        {text:ok?"Negatif":"Ada Temuan",options:{bold:true,color:ok?PC.green:PC.red}}
      ]);
    });
    /* Total row */
    rows3.push([
      {text:"TOTAL",options:{bold:true,fill:{color:PC.gray}}},
      {text:kapal+" unit",options:{bold:true,fill:{color:PC.gray}}},
      {text:String(crew),options:{bold:true,fill:{color:PC.gray}}},
      {text:String(pos),options:{bold:true,color:pos>0?PC.red:PC.green,fill:{color:PC.gray}}},
      {text:rate+"%",options:{bold:true,color:pos>0?PC.red:PC.green,fill:{color:PC.gray}}},
      {text:_fmtRp(biaya),options:{bold:true,fill:{color:PC.gray}}},
      {text:"",options:{fill:{color:PC.gray}}}
    ]);
    /* colW sum = 12.7 */
    s3.addTable(rows3,{x:0.3,y:1.2,w:12.7,fontSize:10,fontFace:"Calibri",color:PC.text,
      border:{pt:0.5,color:PC.border},rowH:0.38,colW:[1.4,1.2,1.9,1.6,1.3,1.9,1.4]});
    _ftr(s3,pres,"Ref: ILO MLC 2006 Reg.4.3 | Permenaker 05/2018",3,5);

    /* S4 Trend Chart */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.teal,"DRUGS & ALCOHOL TEST (DAT)","Trend Pelaksanaan DAT & Sebaran Kapal Terperiksa");
    var bLabels=bList.map(function(b){return b.bulan;});
    var crewVals=bList.map(function(b){return b.crew;});
    var posVals=bList.map(function(b){return b.pos;});
    if(bLabels.length>0){
      s4.addChart(pres.ChartType.bar,[
        {name:"Crew Diperiksa",labels:bLabels,values:crewVals},
        {name:"Hasil Positif",labels:bLabels,values:posVals}
      ],{
        x:0.3,y:1.2,w:8.5,h:5.6,barDir:"col",barGrouping:"clustered",
        chartColors:[PC.blue,PC.red],
        chartArea:{fill:{color:PC.white}},
        catAxisLabelColor:PC.muted,valAxisLabelColor:PC.muted,
        valGridLine:{color:PC.border,size:0.5},
        showValue:true,dataLabelFontSize:9,
        showLegend:true,legendPos:"b",legendFontSize:10,
        catAxisLabelFontSize:10,barGapWidthPct:40,
        title:"Crew Diperiksa vs Hasil Positif per Bulan",showTitle:true,titleColor:PC.navy,titleFontSize:12
      });
    }
    /* Summary right */
    var sumItems=[
      {l:"Total Crew",v:crew.toLocaleString("id-ID"),c:PC.blue},
      {l:"Positif",v:String(pos),c:pos>0?PC.red:PC.green},
      {l:"Prevalensi",v:rate+"%",c:parseFloat(rate)>0?PC.amber:PC.green},
      {l:"Kapal",v:String(kapal),c:PC.teal}
    ];
    sumItems.forEach(function(st,i){
      var sy=1.2+i*1.42;
      _kpi(s4,pres,9.1,sy,3.9,1.3,st.l,st.v,st.c);
    });
    _ftr(s4,pres,"Ref: ILO MLC 2006 Reg.4.3 | Permenaker 05/2018",4,5);

    /* S5 Closing */
    var s5=pres.addSlide();
    s5.background={color:PC.navyD};
    s5.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:PC.green},line:{color:PC.green}});
    s5.addText("REKOMENDASI & TINDAK LANJUT",{x:0.4,y:0.6,w:12,h:0.55,fontSize:22,bold:true,color:PC.white,fontFace:"Calibri"});
    s5.addText("Drugs & Alcohol Test — Pertamina Patra Niaga III",{x:0.4,y:1.22,w:12,h:0.35,fontSize:12,color:"5BB8F5",fontFace:"Calibri"});
    var reksDAT=[
      {t:"Segera (0–30 Hari)",c:PC.red,items:pos>0?["Protokol medis dan administratif untuk "+pos+" awak kapal reaktif","Koordinasi medical officer kapal untuk pemeriksaan lanjutan","Dokumentasikan hasil dan laporkan ke manajemen"]
        :["Pertahankan konsistensi program DAT dengan hasil zero positive","Apresiasi komitmen seluruh ABK terhadap program bebas narkoba","Dokumentasikan sebagai evidence kepatuhan MLC 2006"]},
      {t:"Jangka Pendek (1–3 Bln)",c:PC.amber,items:[
        "Jadwalkan DAT berikutnya secara periodik sesuai kebijakan perusahaan",
        "Sosialisasi bahaya narkoba kepada seluruh ABK baru bergabung",
        "Review dan update prosedur pemeriksaan DAT"
      ]},
      {t:"Jangka Panjang (3–12 Bln)",c:PC.blue,items:[
        "Integrasikan program DAT ke dalam Ship Safety Management System",
        "Review vendor laboran: pastikan akreditasi KAN dan kompetensi forensik",
        "Laporan DAT tahunan untuk biro klasifikasi dan otoritas pelabuhan"
      ]}
    ];
    reksDAT.forEach(function(r,i){
      var rx=0.3+i*4.35;
      s5.addShape(pres.ShapeType.roundRect,{x:rx,y:2.0,w:4.1,h:4.75,fill:{color:"0A1C10"},line:{color:r.c,width:1.5},rectRadius:0.1});
      s5.addShape(pres.ShapeType.rect,{x:rx,y:2.0,w:4.1,h:0.5,fill:{color:r.c},line:{color:r.c}});
      s5.addText(r.t,{x:rx+0.12,y:2.04,w:3.86,h:0.42,fontSize:10,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s5.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.72+j*1.1,w:0.2,h:0.2,fill:{color:r.c},line:{color:r.c}});
        s5.addText(it,{x:rx+0.48,y:2.65+j*1.1,w:3.45,h:0.98,fontSize:10,color:"CADCFC",fontFace:"Calibri",wrap:true,valign:"middle"});
      });
    });
    s5.addText("IH Dashboard v5.0  •  ihhealth3.com  •  "+tgl,{x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"});

    pres.writeFile({fileName:"IH_DAT_"+tgl.replace(/ /g,"_")+".pptx"})
      .then(function(){if(typeof showToast==="function")showToast("PPT DAT berhasil didownload!","success");})
      .catch(function(e){if(typeof showToast==="function")showToast("Gagal: "+e.message,"error");});
  }catch(e){if(typeof showToast==="function")showToast("Error: "+e.message,"error");console.error(e);}
}

/* ═══════════════════════════════════════
   3. EXPORT PEST — 4 Slide
═══════════════════════════════════════ */
function exportPestPPT(){
  if(!_guard())return;
  var data=(typeof filteredPest!=="undefined"&&filteredPest.length)?filteredPest:(typeof rawPest!=="undefined"?rawPest:[]);
  if(!data.length){if(typeof showToast==="function")showToast("Tidak ada data Pest Control.","warning");return;}
  if(typeof showToast==="function")showToast("Membuat PPT Pest Control...","info");
  try{
    var pres=_pres("Laporan Pest & Rodent Control");
    var tgl=_now();
    var biaya=data.reduce(function(s,r){return s+(parseFloat(r["Est Biaya"])||0);},0);
    var lokSet=new Set(data.map(function(r){return r["Lokasi"]||"";}));

    /* S1 Cover */
    _cover(pres,"LAPORAN PEST & RODENT CONTROL","Pengendalian Vektor & Hama — Perkantoran",tgl,[
      {v:String(data.length),l:"Total Kegiatan",c:PC.purple},
      {v:String(lokSet.size),l:"Lokasi",c:PC.blue},
      {v:_fmtRp(biaya),l:"Est. Anggaran",c:PC.teal},
      {v:"Terlaksana",l:"Status",c:data.length>0?PC.green:PC.amber}
    ]);

    /* S2 Ringkasan */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.purple,"PEST & RODENT CONTROL","Ringkasan Eksekutif — Pelaksanaan Pengendalian Vektor Perkantoran");
    _kpi(s2,pres,0.3,1.2,3.9,1.55,"Total Kegiatan",String(data.length),PC.purple);
    _kpi(s2,pres,4.45,1.2,3.9,1.55,"Lokasi Terlayani",String(lokSet.size),PC.blue);
    _kpi(s2,pres,8.6,1.2,3.9,1.55,"Estimasi Anggaran",_fmtRp(biaya),PC.teal);
    var anaPest=data.length>0
      ?"Program Pest & Rodent Control perkantoran telah terlaksana sebanyak "+data.length+" kegiatan pada "+lokSet.size+" lokasi di lingkungan gedung kantor dengan total estimasi anggaran "+_fmtRp(biaya)+". Pelaksanaan ini memenuhi kewajiban sanitasi dan pengendalian vektor sesuai standar kesehatan lingkungan kerja perkantoran dan IHR 2005 WHO."
      :"Belum terdapat data pelaksanaan Pest & Rodent Control pada periode ini.";
    s2.addShape(pres.ShapeType.roundRect,{x:0.3,y:2.9,w:12.7,h:1.8,fill:{color:PC.purpleL},line:{color:PC.purple,width:1},rectRadius:0.08});
    s2.addText([{text:"Analisis: ",options:{bold:true,color:PC.purple}},{text:anaPest,options:{color:PC.text}}],
      {x:0.5,y:2.98,w:12.3,h:1.64,fontSize:11,fontFace:"Calibri",wrap:true,valign:"middle"});
    _ftr(s2,pres,"Ref: IHR 2005 WHO | Ship Sanitation Certificate | Permenaker 05/2018",2,4);

    /* S3 Tabel */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.purple,"PEST & RODENT CONTROL","Detail Pelaksanaan per Lokasi");
    var rows3=[_mkH(["No","Lokasi","Tanggal/Bulan","Temuan / Keluhan","Tindak Lanjut","Est. Biaya"])];
    data.slice(0,14).forEach(function(r,i){
      rows3.push([
        {text:String(i+1)},
        {text:String(r["Lokasi"]||"—"),options:{bold:true}},
        {text:String(r["Tanggal Pelaksanaan"]||r["Bulan"]||"—")},
        {text:String(r["Temuan / Keluhan"]||"Tidak ada temuan")},
        {text:String(r["Tindak Lanjut & Rekomendasi"]||r["Tindak Lanjut"]||"—")},
        {text:_fmtRp(r["Est Biaya"]||0)}
      ]);
    });
    /* colW sum = 12.7 */
    s3.addTable(rows3,{x:0.3,y:1.2,w:12.7,fontSize:9,fontFace:"Calibri",color:PC.text,
      border:{pt:0.5,color:PC.border},rowH:0.35,colW:[0.35,2.4,1.5,3.5,3.4,1.55]});
    if(data.length>14)s3.addText("... dan "+(data.length-14)+" data lainnya",
      {x:0.3,y:6.08,w:12.7,h:0.28,fontSize:9,color:PC.muted,italic:true,fontFace:"Calibri"});
    _ftr(s3,pres,"Ref: IHR 2005 WHO | Permenaker 05/2018",3,4);

    /* S4 Closing */
    var s4=pres.addSlide();
    s4.background={color:PC.navyD};
    s4.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:PC.purple},line:{color:PC.purple}});
    s4.addText("REKOMENDASI & TINDAK LANJUT",{x:0.4,y:0.6,w:12,h:0.55,fontSize:22,bold:true,color:PC.white,fontFace:"Calibri"});
    s4.addText("Pest & Rodent Control — Pertamina Patra Niaga III",{x:0.4,y:1.22,w:12,h:0.35,fontSize:12,color:"CE93D8",fontFace:"Calibri"});
    var reksPest=[
      ["Segera lanjutkan jadwal Pest Control rutin sesuai program tahunan","Pastikan follow-up temuan (tikus, kecoa) selesai dalam 7 hari","Laporkan hasil pelaksanaan ke manajemen gedung dan IH officer"],
      ["Review vendor pest control: pastikan bersertifikat Kementan","Pasang monitoring station permanen di area rawan tikus/kecoa","Update peta sebaran titik pengumpanan setiap kuartal"],
      ["Integrasi program pest control ke dalam IH Dashboard secara konsisten","Lakukan audit sanitasi internal minimal 1 kali per semester","Penyusunan laporan pest control tahunan untuk manajemen"]
    ];
    var titls=["Segera (0–30 Hari)","Jangka Pendek (1–3 Bln)","Jangka Panjang (3–12 Bln)"];
    var cols=[PC.red,PC.amber,PC.blue];
    reksPest.forEach(function(items,i){
      var rx=0.3+i*4.35;
      s4.addShape(pres.ShapeType.roundRect,{x:rx,y:2.0,w:4.1,h:4.75,fill:{color:"140A1C"},line:{color:cols[i],width:1.5},rectRadius:0.1});
      s4.addShape(pres.ShapeType.rect,{x:rx,y:2.0,w:4.1,h:0.5,fill:{color:cols[i]},line:{color:cols[i]}});
      s4.addText(titls[i],{x:rx+0.12,y:2.04,w:3.86,h:0.42,fontSize:10,bold:true,color:PC.white,fontFace:"Calibri"});
      items.forEach(function(it,j){
        s4.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.72+j*1.1,w:0.2,h:0.2,fill:{color:cols[i]},line:{color:cols[i]}});
        s4.addText(it,{x:rx+0.48,y:2.65+j*1.1,w:3.45,h:0.98,fontSize:10,color:"CADCFC",fontFace:"Calibri",wrap:true,valign:"middle"});
      });
    });
    s4.addText("IH Dashboard v5.0  •  ihhealth3.com  •  "+tgl,{x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"});

    pres.writeFile({fileName:"IH_Pest_"+tgl.replace(/ /g,"_")+".pptx"})
      .then(function(){if(typeof showToast==="function")showToast("PPT Pest Control berhasil didownload!","success");})
      .catch(function(e){if(typeof showToast==="function")showToast("Gagal: "+e.message,"error");});
  }catch(e){if(typeof showToast==="function")showToast("Error: "+e.message,"error");console.error(e);}
}

/* ═══════════════════════════════════════
   4. EXPORT CLOSEOUT HRA 2025 — 4 Slide
═══════════════════════════════════════ */
function exportCloseout25PPT(){
  if(!_guard())return;
  var data=(typeof filteredCO25!=="undefined"&&filteredCO25.length)?filteredCO25:(typeof rawCloseout25!=="undefined"?rawCloseout25:[]);
  if(!data.length){if(typeof showToast==="function")showToast("Tidak ada data Closeout 2025.","warning");return;}
  if(typeof showToast==="function")showToast("Membuat PPT Closeout HRA 2025...","info");
  try{
    var pres=_pres("Closeout HRA & IH 2025");
    var tgl=_now();
    var done=data.filter(function(r){var s=(r["Status"]||"").toLowerCase();return s.includes("selesai")||s==="done";}).length;
    var proses=data.filter(function(r){var s=(r["Status"]||"").toLowerCase();return s.includes("proses")||s.includes("progress");}).length;
    var belum=data.length-done-proses;

    /* S1 Cover */
    _cover(pres,"CLOSEOUT HRA & IH 2025","Penutupan Program Industrial Hygiene Tahun 2025",tgl,[
      {v:String(data.length),l:"Total Program",c:PC.amber},
      {v:String(done),l:"Selesai",c:PC.green},
      {v:String(proses),l:"Dalam Proses",c:PC.amber},
      {v:String(belum),l:"Belum",c:belum>0?PC.red:PC.green}
    ]);

    /* S2 Ringkasan */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.amber,"CLOSEOUT HRA & IH 2025","Ringkasan Status Penutupan Program IH Tahun 2025");
    _kpi(s2,pres,0.3,1.2,2.9,1.55,"Total Program",String(data.length),PC.amber);
    _kpi(s2,pres,3.4,1.2,2.9,1.55,"Selesai",String(done),PC.green);
    _kpi(s2,pres,6.5,1.2,2.9,1.55,"Dalam Proses",String(proses),PC.amber);
    _kpi(s2,pres,9.6,1.2,2.9,1.55,"Belum",String(belum),belum>0?PC.red:PC.green);
    /* Donut chart */
    if(data.length>0){
      s2.addChart(pres.ChartType.doughnut,[{name:"Status",labels:["Selesai","Dalam Proses","Belum"],values:[done,proses,belum]}],{
        x:0.8,y:2.9,w:5.5,h:4.0,
        chartColors:[PC.green,PC.amber,PC.red],holeSize:55,
        chartArea:{fill:{color:PC.gray}},
        showPercent:true,dataLabelFontSize:11,dataLabelFontBold:true,dataLabelColor:PC.white,
        showLegend:true,legendPos:"b",legendFontSize:11,legendColor:PC.text,
        title:"Status Program IH 2025",showTitle:true,titleColor:PC.navy,titleFontSize:12
      });
    }
    /* Progress summary */
    var pct=data.length>0?(done/data.length*100).toFixed(0):"0";
    s2.addShape(pres.ShapeType.roundRect,{x:6.8,y:2.9,w:6.2,h:4.0,fill:{color:PC.gray},line:{color:PC.border,width:0.5},rectRadius:0.08});
    s2.addText("Tingkat Penyelesaian",{x:7.0,y:3.05,w:5.8,h:0.38,fontSize:12,bold:true,color:PC.navy,fontFace:"Calibri"});
    s2.addText(pct+"%",{x:7.0,y:3.45,w:5.8,h:1.2,fontSize:60,bold:true,color:pct>=80?PC.green:pct>=50?PC.amber:PC.red,align:"center",fontFace:"Calibri"});
    s2.addShape(pres.ShapeType.rect,{x:7.0,y:4.8,w:5.8,h:0.28,fill:{color:PC.border},line:{color:PC.border}});
    s2.addShape(pres.ShapeType.rect,{x:7.0,y:4.8,w:Math.max(0.3,5.8*(done/Math.max(data.length,1))),h:0.28,
      fill:{color:PC.green},line:{color:PC.green}});
    s2.addText(done+" dari "+data.length+" program telah diselesaikan",{x:7.0,y:5.15,w:5.8,h:0.35,fontSize:10,color:PC.muted,fontFace:"Calibri"});
    s2.addText("Target penyelesaian seluruh program IH sebelum akhir tahun 2025. Percepat tindak lanjut untuk "+belum+" program yang belum dimulai.",
      {x:7.0,y:5.55,w:5.8,h:1.2,fontSize:10,color:PC.text,fontFace:"Calibri",wrap:true});
    _ftr(s2,pres,"Ref: Permenaker 05/2018 | ISM Code | ISO 45001:2018",2,4);

    /* S3 Tabel */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.amber,"CLOSEOUT HRA & IH 2025","Detail Status Program per Item");
    var keys=Object.keys(data[0]||{}).filter(function(k){return k&&k!=="No";}).slice(0,6);
    if(!keys.length)keys=["Program","Status","PIC","Target","Keterangan"];
    var rows3=[_mkH(["No"].concat(keys.slice(0,5)))];
    data.slice(0,14).forEach(function(r,i){
      var st=(r["Status"]||"").toLowerCase();
      var isDone=st.includes("selesai")||st==="done";
      var isProses=st.includes("proses")||st.includes("progress");
      var stCol=isDone?PC.green:isProses?PC.amber:PC.red;
      var row=[{text:String(i+1),options:{align:"center"}}];
      keys.slice(0,5).forEach(function(k,ki){
        var v=String(r[k]||"—");
        var opts=ki===keys.indexOf("Status")?{bold:true,color:stCol}:{};
        row.push({text:v,options:opts});
      });
      rows3.push(row);
    });
    var colWc=[0.38].concat(keys.slice(0,5).map(function(){return(12.32/Math.min(keys.length,5));}));
    var totalW=colWc.reduce(function(a,b){return a+b;},0);
    if(Math.abs(totalW-12.7)>0.01)colWc[colWc.length-1]+=(12.7-totalW);
    s3.addTable(rows3,{x:0.3,y:1.2,w:12.7,fontSize:9,fontFace:"Calibri",color:PC.text,
      border:{pt:0.5,color:PC.border},rowH:0.35,colW:colWc});
    if(data.length>14)s3.addText("... dan "+(data.length-14)+" item lainnya",
      {x:0.3,y:6.08,w:12.7,h:0.28,fontSize:9,color:PC.muted,italic:true,fontFace:"Calibri"});
    _ftr(s3,pres,"Ref: Permenaker 05/2018 | ISM Code",3,4);

    /* S4 Closing */
    var s4=pres.addSlide();
    s4.background={color:PC.navyD};
    s4.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:PC.amber},line:{color:PC.amber}});
    s4.addText("REKOMENDASI CLOSEOUT 2025",{x:0.4,y:0.6,w:12,h:0.55,fontSize:22,bold:true,color:PC.white,fontFace:"Calibri"});
    s4.addText("Penutupan Program IH — Pertamina Patra Niaga III",{x:0.4,y:1.22,w:12,h:0.35,fontSize:12,color:"FCD34D",fontFace:"Calibri"});
    var reksC=[
      ["Selesaikan "+belum+" program yang belum dimulai dalam 30 hari","Percepat "+proses+" program yang sedang berjalan","Dokumentasikan semua bukti penyelesaian ke sistem"],
      ["Review gap analysis program IH 2025 vs target","Jadikan lessons learned sebagai dasar program IH 2026","Update Ship Safety Management System dengan temuan 2025"],
      ["Susun laporan closeout resmi untuk audit eksternal","Biro klasifikasi dan regulator memerlukan bukti program IH","Jadikan benchmark untuk perencanaan program IH 2027"]
    ];
    var titlsC=["Segera (0–30 Hari)","Jangka Pendek (1–3 Bln)","Jangka Panjang"];
    var colsC=[PC.red,PC.amber,PC.blue];
    reksC.forEach(function(items,i){
      var rx=0.3+i*4.35;
      s4.addShape(pres.ShapeType.roundRect,{x:rx,y:2.0,w:4.1,h:4.75,fill:{color:"141006"},line:{color:colsC[i],width:1.5},rectRadius:0.1});
      s4.addShape(pres.ShapeType.rect,{x:rx,y:2.0,w:4.1,h:0.5,fill:{color:colsC[i]},line:{color:colsC[i]}});
      s4.addText(titlsC[i],{x:rx+0.12,y:2.04,w:3.86,h:0.42,fontSize:10,bold:true,color:PC.white,fontFace:"Calibri"});
      items.forEach(function(it,j){
        s4.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.72+j*1.1,w:0.2,h:0.2,fill:{color:colsC[i]},line:{color:colsC[i]}});
        s4.addText(it,{x:rx+0.48,y:2.65+j*1.1,w:3.45,h:0.98,fontSize:10,color:"CADCFC",fontFace:"Calibri",wrap:true,valign:"middle"});
      });
    });
    s4.addText("IH Dashboard v5.0  •  ihhealth3.com  •  "+tgl,{x:0,y:7.1,w:13.3,h:0.32,fontSize:8.5,color:"8899AA",align:"center",fontFace:"Calibri"});

    pres.writeFile({fileName:"IH_Closeout_2025_"+tgl.replace(/ /g,"_")+".pptx"})
      .then(function(){if(typeof showToast==="function")showToast("PPT Closeout 2025 berhasil didownload!","success");})
      .catch(function(e){if(typeof showToast==="function")showToast("Gagal: "+e.message,"error");});
  }catch(e){if(typeof showToast==="function")showToast("Error: "+e.message,"error");console.error(e);}
}
