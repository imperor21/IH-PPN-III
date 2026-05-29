/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — Premium PPT Export untuk Direksi & Manager
   IH Dashboard v5.0 — Pertamina Patra Niaga III
   Layout: LAYOUT_WIDE (13.3×7.5 in)
   Design: Navy-Gold Premium — Professional & Innovative
   Zero 8-digit hex. Zero color errors.
═══════════════════════════════════════════════════════════════════ */

var PC={
  navy:"0F2A4A", navyD:"0A1929", navyL:"1C3A5A", navyM:"162E42",
  blue:"1565C0", blueL:"EBF5FF", blueM:"1976D2",
  teal:"0288D1", tealL:"E3F2FD",
  green:"2E7D32", greenL:"E8F5E9",
  red:"C62828",   redL:"FFEBEE",
  amber:"F59E0B", amberL:"FEF3C7",
  gold:"C9973A",  goldL:"FEF9E7",
  purple:"6A1B9A",purpleL:"F3E5F5",
  orange:"E65100",orangeL:"FFF3E0",
  white:"FFFFFF", gray:"F4F6FA", lgray:"E2E8F0",
  text:"1E293B",  muted:"64748B", dimmed:"94A3B8"
};

var BULAN_PPT=["Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"];

function _fmtRp(n){
  n=parseFloat(n)||0;
  if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";
  if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";
  return"Rp "+Math.round(n).toLocaleString("id-ID");
}
function _now(){return new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}
function _guard(){
  if(typeof PptxGenJS==="undefined"){
    if(typeof showToast==="function")showToast("Library PPT sedang dimuat, coba lagi.","warning");
    return false;
  }
  return true;
}
function _pres(title){
  var p=new PptxGenJS();
  p.layout="LAYOUT_WIDE";
  p.author="IH Dashboard — Pertamina Patra Niaga III";
  p.title=title;
  return p;
}
function _lighten(col){
  var m={"1565C0":"EBF5FF","2E7D32":"E8F5E9","C62828":"FFEBEE","E65100":"FFF3E0",
    "6A1B9A":"F3E5F5","0288D1":"E3F2FD","F59E0B":"FEF3C7","0F2A4A":"F0F4F8",
    "7B1FA2":"F3E5F5","C9973A":"FEF9E7","0288D1":"E3F2FD"};
  return m[col]||"F4F6FA";
}

/* ════════════════════════════════════════════════════
   COVER SLIDE — Premium Navy-Gold
════════════════════════════════════════════════════ */
function _cover(pres, judul, sub, tgl, stats){
  var s=pres.addSlide();
  s.background={color:PC.navyD};
  /* Dekorasi geometris */
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:PC.gold},line:{color:PC.gold,width:0}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:0.04,fill:{color:PC.gold},line:{color:PC.gold,width:0}});
  s.addShape(pres.ShapeType.ellipse,{x:9.5,y:-1.2,w:5.5,h:5.5,fill:{color:PC.navyL},line:{color:PC.navyL,width:0}});
  s.addShape(pres.ShapeType.ellipse,{x:10.8,y:4.5,w:3.5,h:3.5,fill:{color:PC.navyM},line:{color:PC.navyM,width:0}});
  /* Branding kop */
  s.addText("PT PERTAMINA PATRA NIAGA  ·  SATUAN KERJA REGIONAL III",
    {x:0.3,y:0.22,w:10,h:0.3,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:2,fontFace:"Calibri"});
  s.addText("Divisi Industrial Hygiene & Occupational Health",
    {x:0.3,y:0.55,w:10,h:0.28,fontSize:10,color:"8899AA",fontFace:"Calibri"});
  /* Gold divider */
  s.addShape(pres.ShapeType.rect,{x:0.3,y:0.94,w:4.5,h:0.04,fill:{color:PC.gold},line:{color:PC.gold,width:0}});
  /* Judul */
  s.addText(judul,{x:0.3,y:1.1,w:9.2,h:1.15,
    fontSize:36,bold:true,color:PC.white,fontFace:"Calibri",lineSpacingMultiple:1.1});
  s.addText(sub,{x:0.3,y:2.3,w:9.2,h:0.55,
    fontSize:15,bold:true,color:"5BB8F5",fontFace:"Calibri"});
  s.addText("Dihasilkan: "+tgl+"   ·   IH Dashboard v5.0   ·   PT Pertamina Patra Niaga III",
    {x:0.3,y:2.92,w:9.2,h:0.32,fontSize:10,color:"8899AA",fontFace:"Calibri"});
  /* KPI stat boxes */
  stats.forEach(function(st,i){
    var bx=0.3+i*3.27;
    s.addShape(pres.ShapeType.roundRect,{x:bx,y:3.45,w:3.12,h:1.95,
      fill:{color:PC.navyL},line:{color:st.c||PC.gold,width:1.5},rectRadius:0.1});
    s.addShape(pres.ShapeType.rect,{x:bx,y:3.45,w:3.12,h:0.06,
      fill:{color:st.c||PC.gold},line:{color:st.c||PC.gold,width:0}});
    s.addText(String(st.v),{x:bx,y:3.55,w:3.12,h:0.92,
      fontSize:String(st.v).length>7?18:String(st.v).length>4?24:34,
      bold:true,color:st.c||PC.gold,align:"center",fontFace:"Calibri"});
    s.addText(String(st.l),{x:bx+0.08,y:4.5,w:2.96,h:0.82,
      fontSize:9.5,color:"CADCFC",align:"center",fontFace:"Calibri",wrap:true});
  });
  /* Footer */
  s.addText("KONFIDENSIAL  ·  UNTUK PENGGUNAAN INTERNAL  ·  "+tgl,
    {x:0,y:7.15,w:13.3,h:0.28,fontSize:8,color:"8899AA",align:"center",fontFace:"Calibri"});
}

/* ════════════════════════════════════════════════════
   HEADER tiap slide konten
════════════════════════════════════════════════════ */
function _hdr(s, pres, accent, sup, main){
  s.background={color:PC.white};
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.3,h:1.12,fill:{color:PC.navy},line:{color:PC.navy,width:0}});
  s.addShape(pres.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:accent},line:{color:accent,width:0}});
  s.addText(sup,{x:0.24,y:0.08,w:12.5,h:0.36,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:1.5,fontFace:"Calibri"});
  s.addText(main,{x:0.24,y:0.52,w:12.5,h:0.46,fontSize:14.5,bold:true,color:PC.white,fontFace:"Calibri"});
}

/* ════════════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════════════ */
function _ftr(s, pres, ref, pg, total){
  s.addShape(pres.ShapeType.rect,{x:0,y:7.18,w:13.3,h:0.32,fill:{color:PC.gray},line:{color:PC.gray,width:0}});
  s.addText(ref||"Ref: Permenaker 05/2018  •  ACGIH TLV & BEI 2024  •  ILO MLC 2006  •  ISO 45001:2018",
    {x:0.2,y:7.2,w:10.8,h:0.26,fontSize:7.5,color:PC.muted,fontFace:"Calibri"});
  s.addText(pg+" / "+total,
    {x:11.2,y:7.2,w:1.9,h:0.26,fontSize:9,color:PC.gold,bold:true,align:"right",fontFace:"Calibri"});
}

/* ════════════════════════════════════════════════════
   KPI BOX
════════════════════════════════════════════════════ */
function _kpi(s, pres, x, y, w, h, label, val, col){
  var bg=_lighten(col);
  s.addShape(pres.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:bg},line:{color:col,width:1.5},rectRadius:0.08});
  s.addShape(pres.ShapeType.rect,{x:x,y:y+h-0.06,w:w,h:0.06,
    fill:{color:col},line:{color:col,width:0}});
  var fs=String(val).length>8?16:String(val).length>5?20:26;
  s.addText(String(val),{x:x,y:y+0.08,w:w,h:h*0.56,
    fontSize:fs,bold:true,color:col,align:"center",fontFace:"Calibri"});
  s.addText(label,{x:x+0.08,y:y+h*0.6,w:w-0.16,h:h*0.38,
    fontSize:9,color:PC.muted,align:"center",fontFace:"Calibri",wrap:true});
}

/* ════════════════════════════════════════════════════
   ANALISIS BOX
════════════════════════════════════════════════════ */
function _anaBox(s, pres, x, y, w, h, col, label, body){
  var bg=_lighten(col);
  s.addShape(pres.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:bg},line:{color:col,width:0},rectRadius:0.08});
  s.addShape(pres.ShapeType.rect,{x:x,y:y,w:0.05,h:h,
    fill:{color:col},line:{color:col,width:0}});
  s.addText([
    {text:label+": ",options:{bold:true,color:col,fontSize:11}},
    {text:body,options:{color:PC.text,fontSize:11}}
  ],{x:x+0.2,y:y+0.1,w:w-0.3,h:h-0.2,fontFace:"Calibri",wrap:true,valign:"top"});
}

/* ════════════════════════════════════════════════════
   TABLE HEADER
════════════════════════════════════════════════════ */
function _mkH(cols,colWidths){
  return cols.map(function(c,i){
    return{text:c,options:{
      bold:true,color:PC.white,
      fill:{color:PC.navy},
      fontSize:9.5,
      border:{type:"none"},
      align:"center"
    }};
  });
}
function _mkR(cells, even){
  return cells.map(function(c){
    return{text:String(c.v||"—"),options:{
      fontSize:10,
      color:c.c||PC.text,
      bold:c.bold||false,
      fill:{color:even?PC.white:"F8FAFC"},
      border:{type:"none"},
      align:c.align||"left"
    }};
  });
}

/* ═══════════════════════════════════════════════════════
   EXPORT HRA — 5 Slide Premium
═══════════════════════════════════════════════════════ */
function exportHRAPPT(){
  if(!_guard())return;
  var data=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:
            (typeof rawHRA!=="undefined"?rawHRA:[]);
  if(!data.length){showToast("Tidak ada data HRA.","warning");return;}
  showToast("Membuat PPT HRA...","info");
  try{
    var tgl=_now();
    var total=data.length;
    var done=data.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).length;
    var pct=total>0?((done/total)*100).toFixed(1):"0.0";
    var totalBudget=data.reduce(function(s,r){return s+parseFloat(r["Anggaran"]||0);},0);
    var pres=_pres("Hazard Recognition & Assessment — IH Dashboard");

    /* ── Slide 1: Cover ── */
    _cover(pres,"Hazard Recognition &\nAssessment (HRA)",
      "Monitoring Pelaksanaan HRA Seluruh Armada Kapal Tanker",tgl,[
      {v:total+" unit",l:"Total Armada",c:PC.blue},
      {v:done+" unit",l:"Telah HRA",c:PC.green},
      {v:pct+"%",l:"Coverage HRA",c:(parseFloat(pct)>=80?PC.green:parseFloat(pct)>=50?PC.amber:PC.red)},
      {v:_fmtRp(totalBudget),l:"Est. Total Anggaran",c:PC.gold}
    ]);

    /* ── Slide 2: Executive Summary ── */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.blue,"HAZARD RECOGNITION & ASSESSMENT  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif Pelaksanaan HRA per Fleet");
    var fleetData={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    data.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleetData[f]!==undefined)fleetData[f]++;});
    var colorsF=[PC.blue,PC.green,PC.amber,PC.purple];
    var fKeys=Object.keys(fleetData);
    fKeys.forEach(function(f,i){
      var bx=0.3+i*3.27;
      _kpi(s2,pres,bx,1.25,3.12,1.55,f+" ("+fleetData[f]+" kapal)",fleetData[f]+" unit",colorsF[i]);
    });
    /* Status bar */
    var statuses=[
      {l:"Sudah HRA",v:done,c:PC.green},
      {l:"Belum HRA",v:total-done,c:PC.red},
      {l:"Coverage",v:pct+"%",c:parseFloat(pct)>=80?PC.green:PC.amber}
    ];
    statuses.forEach(function(st,i){
      _kpi(s2,pres,0.3+i*4.38,3.0,4.18,1.4,st.l,st.v,st.c);
    });
    var anaText=parseFloat(pct)>=80?
      "Coverage HRA "+pct+"% menunjukkan kepatuhan BAIK terhadap Permenaker 05/2018. Pertahankan jadwal HRA berkala dan dokumentasi lengkap per unit armada.":
      "Coverage HRA "+pct+"% masih memerlukan akselerasi. Dari total "+total+" unit armada, "+
      (total-done)+" unit belum menyelesaikan HRA. Prioritaskan HRA pada armada dengan hazard exposure tertinggi.";
    _anaBox(s2,pres,0.3,4.6,12.7,1.5,parseFloat(pct)>=80?PC.green:PC.red,"Analisis",anaText);
    _ftr(s2,pres,"Ref: Permenaker 05/2018 Pasal 6 Ayat 1  •  ISO 45001:2018",2,5);

    /* ── Slide 3: Tabel Detail ── */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.blue,"HAZARD RECOGNITION & ASSESSMENT  ·  DETAIL DATA","Rekapitulasi Pelaksanaan HRA per Kapal");
    var tblData=data.slice(0,14).map(function(r,i){
      var ok=(r["Status"]||"").toLowerCase()==="done";
      return _mkR([
        {v:i+1,align:"center"},
        {v:r["Nama Kapal"]||"—",bold:true},
        {v:r["Jenis Fleet"]||"—"},
        {v:r["Bulan Pelaksanaan"]||"—"},
        {v:r["Vendor Pelaksana"]||"—"},
        {v:_fmtRp(r["Anggaran"])},
        {v:ok?"✓ Done":"Belum",c:ok?PC.green:PC.red,bold:true,align:"center"}
      ],i%2===0);
    });
    s3.addTable(
      [_mkH(["No","Nama Kapal","Fleet","Bulan","Vendor","Anggaran","Status"],
             [0.4,2.4,1.0,1.0,2.0,1.5,1.0])].concat(tblData),
      {x:0.3,y:1.25,w:12.7,colW:[0.4,2.8,1.0,1.1,2.4,1.8,1.2],
       rowH:0.36,fontFace:"Calibri",
       border:{type:"none"},
       fill:{color:PC.white}}
    );
    if(data.length>14){
      s3.addText("* Menampilkan 14 dari "+data.length+" data. Lihat detail lengkap di dashboard.",
        {x:0.3,y:6.85,w:12.7,h:0.28,fontSize:9,color:PC.muted,italic:true,fontFace:"Calibri"});
    }
    _ftr(s3,pres,"",3,5);

    /* ── Slide 4: Visual Analysis per Bulan ── */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.blue,"HAZARD RECOGNITION & ASSESSMENT  ·  TREND ANALYSIS","Distribusi Pelaksanaan HRA per Bulan & Fleet");
    /* Hitung per bulan */
    var byBulan={};
    BULAN_PPT.forEach(function(b){byBulan[b]=0;});
    data.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&byBulan[b]!==undefined)byBulan[b]++;});
    /* Bar chart manual */
    var maxVal=Math.max.apply(null,Object.values(byBulan))||1;
    var chartH=3.8,chartY=1.35,chartX=0.5,chartW=7.8;
    var barW=chartW/12;
    s4.addShape(pres.ShapeType.rect,{x:chartX,y:chartY+chartH,w:chartW,h:0.02,fill:{color:PC.lgray},line:{color:PC.lgray,width:0}});
    BULAN_PPT.forEach(function(b,i){
      var v=byBulan[b]||0;
      var bh=(v/maxVal)*chartH;
      var bx=chartX+i*barW+barW*0.1;
      var by=chartY+chartH-bh;
      if(bh>0){
        s4.addShape(pres.ShapeType.rect,{x:bx,y:by,w:barW*0.8,h:bh,
          fill:{color:v===Math.max.apply(null,Object.values(byBulan))?PC.gold:PC.blue},
          line:{color:PC.white,width:0.5}});
        if(v>0)s4.addText(String(v),{x:bx,y:by-0.25,w:barW*0.8,h:0.25,
          fontSize:9,bold:true,color:PC.text,align:"center",fontFace:"Calibri"});
      }
      s4.addText(b.slice(0,3),{x:bx-barW*0.05,y:chartY+chartH+0.06,w:barW*0.9,h:0.24,
        fontSize:8,color:PC.muted,align:"center",fontFace:"Calibri"});
    });
    /* Fleet breakdown di kanan */
    fKeys.forEach(function(f,i){
      var pct2=total>0?((fleetData[f]/total)*100).toFixed(0):0;
      var fy=1.35+i*1.4;
      s4.addShape(pres.ShapeType.roundRect,{x:9.0,y:fy,w:4.0,h:1.2,
        fill:{color:_lighten(colorsF[i])},line:{color:colorsF[i],width:1.5},rectRadius:0.1});
      s4.addShape(pres.ShapeType.rect,{x:9.0,y:fy,w:0.06,h:1.2,
        fill:{color:colorsF[i]},line:{color:colorsF[i],width:0}});
      s4.addText(f,{x:9.2,y:fy+0.08,w:3.6,h:0.3,fontSize:11,bold:true,color:colorsF[i],fontFace:"Calibri"});
      s4.addText(fleetData[f]+" kapal  ("+pct2+"%)",{x:9.2,y:fy+0.42,w:3.6,h:0.6,
        fontSize:22,bold:true,color:PC.text,fontFace:"Calibri"});
    });
    _ftr(s4,pres,"",4,5);

    /* ── Slide 5: Rekomendasi ── */
    var s5=pres.addSlide();
    _hdr(s5,pres,PC.gold,"HAZARD RECOGNITION & ASSESSMENT  ·  REKOMENDASI","Rekomendasi Strategis & Program Tindak Lanjut");
    var reks=[
      {p:"Segera (0–30 Hari)",c:PC.red,items:[
        "Susun jadwal HRA prioritas untuk "+(total-done)+" unit armada yang belum HRA",
        "Koordinasikan vendor IH untuk percepatan pelaksanaan HRA",
        "Update status HRA di IH Dashboard setiap selesai pelaksanaan"
      ]},
      {p:"Jangka Pendek (1–3 Bulan)",c:PC.amber,items:[
        "Review dan validasi laporan HRA yang sudah selesai",
        "Pastikan semua temuan hazard ditindaklanjuti dengan hierarchy of control",
        "Laporkan progress HRA dalam rapat IH bulanan"
      ]},
      {p:"Jangka Panjang (3–12 Bulan)",c:PC.blue,items:[
        "Target coverage HRA 100% seluruh armada",
        "Integrasikan temuan HRA ke Ship Safety Management System (SMS)",
        "Siapkan laporan HRA tahunan untuk audit biro klasifikasi"
      ]}
    ];
    reks.forEach(function(r,i){
      var rx=0.3+i*4.38;
      s5.addShape(pres.ShapeType.roundRect,{x:rx,y:1.25,w:4.18,h:5.7,
        fill:{color:_lighten(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
      s5.addShape(pres.ShapeType.rect,{x:rx,y:1.25,w:4.18,h:0.55,
        fill:{color:r.c},line:{color:r.c,width:0}});
      s5.addText(r.p,{x:rx+0.12,y:1.28,w:3.94,h:0.5,fontSize:11,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s5.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.05+j*1.55,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
        s5.addText(it,{x:rx+0.52,y:1.98+j*1.55,w:3.52,h:1.38,fontSize:11,color:PC.text,fontFace:"Calibri",wrap:true,valign:"top"});
      });
    });
    _ftr(s5,pres,"",5,5);

    pres.writeFile({fileName:"IH_HRA_Report_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT HRA berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal membuat PPT: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════════
   EXPORT DAT — 5 Slide Premium
═══════════════════════════════════════════════════════ */
function exportDATPPT(){
  if(!_guard())return;
  var data=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:
            (typeof rawDAT!=="undefined"?rawDAT:[]);
  if(!data.length){showToast("Tidak ada data DAT.","warning");return;}
  showToast("Membuat PPT DAT...","info");
  try{
    var tgl=_now();
    var totalKapal=new Set(data.map(function(r){return r["Nama Kapal"];})).size;
    var totalCrew=data.reduce(function(s,r){return s+parseInt(r["Jumlah ABK"]||0);},0);
    var totalPositif=data.reduce(function(s,r){return s+parseInt(r["Jumlah Positif"]||0);},0);
    var rate=totalCrew>0?((totalPositif/totalCrew)*100).toFixed(2):"0.00";
    var totalBiaya=data.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
    var pres=_pres("Drugs & Alcohol Test — IH Dashboard");

    /* Slide 1: Cover */
    _cover(pres,"Drugs & Alcohol Test\n(DAT) Program",
      "Evaluasi Pemeriksaan Narkotika & Psikotropika Awak Kapal",tgl,[
      {v:totalKapal+" unit",l:"Kapal Terperiksa",c:PC.green},
      {v:totalCrew.toLocaleString("id-ID"),l:"Total Crew",c:PC.blue},
      {v:totalPositif,l:"Hasil Reaktif",c:totalPositif>0?PC.red:PC.green},
      {v:rate+"%",l:"Prevalensi",c:parseFloat(rate)>0?PC.amber:PC.green}
    ]);

    /* Slide 2: Executive Summary */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.green,"DRUGS & ALCOHOL TEST  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif Program DAT");
    _kpi(s2,pres,0.3,1.25,3.12,1.55,"Kapal Diperiksa",totalKapal+" unit",PC.green);
    _kpi(s2,pres,3.58,1.25,3.12,1.55,"Total Crew",totalCrew.toLocaleString("id-ID"),PC.blue);
    _kpi(s2,pres,6.86,1.25,3.12,1.55,"Hasil Reaktif",totalPositif+(totalPositif>0?" ABK":""),totalPositif>0?PC.red:PC.green);
    _kpi(s2,pres,10.14,1.25,3.12,1.55,"Prevalensi",rate+"%",parseFloat(rate)>0?PC.amber:PC.green);
    var anaText=totalPositif===0?
      "Program DAT menunjukkan ZERO POSITIVE RATE dari "+totalCrew.toLocaleString("id-ID")+" awak di "+totalKapal+
      " unit armada. Kepatuhan tertinggi terhadap MLC 2006 Regulation 4.3. Pertahankan konsistensi program.":
      "Ditemukan "+totalPositif+" awak reaktif (prevalensi "+rate+"%) dari "+totalCrew.toLocaleString("id-ID")+
      " awak terperiksa. Protokol medis & administratif wajib segera diterapkan sesuai SOP dan MLC 2006 Reg.4.3.";
    _anaBox(s2,pres,0.3,3.05,12.7,1.7,totalPositif>0?PC.red:PC.green,"Analisis",anaText);
    /* Compliance meter */
    var compPct=totalCrew>0?Math.round((1-totalPositif/totalCrew)*100):100;
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:5.0,w:12.7,h:0.08,fill:{color:PC.lgray},line:{color:PC.lgray,width:0}});
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:5.0,w:(compPct/100)*12.7,h:0.08,
      fill:{color:compPct>=99?PC.green:compPct>=95?PC.amber:PC.red},line:{color:PC.white,width:0}});
    s2.addText("Compliance Rate: "+compPct+"% — "+(compPct>=99?"Excellent":compPct>=95?"Good":"Needs Improvement"),
      {x:0.3,y:5.14,w:12.7,h:0.3,fontSize:11,bold:true,
      color:compPct>=99?PC.green:compPct>=95?PC.amber:PC.red,fontFace:"Calibri"});
    _ftr(s2,pres,"Ref: MLC 2006 Regulation 4.3  •  Permenhub",2,5);

    /* Slide 3: Tabel per Bulan */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.green,"DRUGS & ALCOHOL TEST  ·  REKAPITULASI","Rekapitulasi DAT per Periode");
    var bulanMap={};
    BULAN_PPT.forEach(function(b){bulanMap[b]={kapal:0,crew:0,positif:0,biaya:0};});
    data.forEach(function(r){
      var b=r["Bulan Pelaksanaan"]||"";
      if(bulanMap[b]){
        bulanMap[b].kapal++;
        bulanMap[b].crew+=parseInt(r["Jumlah ABK"]||0);
        bulanMap[b].positif+=parseInt(r["Jumlah Positif"]||0);
        bulanMap[b].biaya+=parseFloat(r["Est Biaya"]||0);
      }
    });
    var tblR=BULAN_PPT.filter(function(b){return bulanMap[b].kapal>0;}).map(function(b,i){
      var d=bulanMap[b];
      var ok=d.positif===0;
      return _mkR([
        {v:b,bold:true},
        {v:d.kapal+" unit",align:"center"},
        {v:d.crew.toLocaleString("id-ID"),align:"center"},
        {v:d.positif,c:ok?PC.green:PC.red,bold:true,align:"center"},
        {v:(d.crew>0?((d.positif/d.crew)*100).toFixed(2):0)+"%",c:ok?PC.green:PC.red,align:"center"},
        {v:_fmtRp(d.biaya),align:"right"},
        {v:ok?"✓ Negatif":"⚠ Temuan",c:ok?PC.green:PC.red,bold:true,align:"center"}
      ],i%2===0);
    });
    s3.addTable([_mkH(["Bulan","Kapal","Crew","Positif","Prevalensi","Est. Biaya","Status"])].concat(tblR),
      {x:0.3,y:1.25,w:12.7,colW:[1.5,1.3,1.3,1.1,1.3,1.7,1.5],
       rowH:0.4,fontFace:"Calibri",border:{type:"none"},fill:{color:PC.white}});
    /* Total row */
    s3.addText("TOTAL: "+totalKapal+" kapal  |  "+totalCrew.toLocaleString("id-ID")+" crew  |  "+
      totalPositif+" positif  |  "+_fmtRp(totalBiaya),
      {x:0.3,y:6.78,w:12.7,h:0.35,fontSize:11,bold:true,color:PC.navy,
       fontFace:"Calibri",fill:{color:PC.gray}});
    _ftr(s3,pres,"",3,5);

    /* Slide 4: Trend Visual */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.green,"DRUGS & ALCOHOL TEST  ·  TREND ANALYSIS","Tren Pemeriksaan DAT per Bulan");
    var bList=BULAN_PPT.filter(function(b){return bulanMap[b].kapal>0;});
    var maxC=Math.max.apply(null,bList.map(function(b){return bulanMap[b].crew;}))||1;
    var chartX=0.5,chartY=1.3,chartH=4.2,chartW=8.5;
    s4.addShape(pres.ShapeType.rect,{x:chartX,y:chartY,w:chartW,h:chartH,fill:{color:"FAFBFF"},line:{color:PC.lgray,width:0.5}});
    s4.addShape(pres.ShapeType.rect,{x:chartX,y:chartY+chartH,w:chartW,h:0.02,fill:{color:PC.navy},line:{color:PC.navy,width:0}});
    var barW2=chartW/bList.length;
    bList.forEach(function(b,i){
      var v=bulanMap[b].crew;
      var vp=bulanMap[b].positif;
      var bh=(v/maxC)*chartH*0.88;
      var bx=chartX+i*barW2+barW2*0.05;
      /* Crew bar */
      s4.addShape(pres.ShapeType.rect,{x:bx,y:chartY+chartH-bh,w:barW2*0.55,h:bh,
        fill:{color:PC.green},line:{color:PC.white,width:0.5}});
      /* Positif bar */
      if(vp>0){
        var ph=(vp/maxC)*chartH*0.88;
        s4.addShape(pres.ShapeType.rect,{x:bx+barW2*0.55,y:chartY+chartH-ph,w:barW2*0.35,h:ph,
          fill:{color:PC.red},line:{color:PC.white,width:0.5}});
      }
      s4.addText(b.slice(0,3),{x:bx,y:chartY+chartH+0.08,w:barW2*0.9,h:0.22,
        fontSize:8.5,color:PC.muted,align:"center",fontFace:"Calibri"});
      s4.addText(String(v),{x:bx,y:chartY+chartH-bh-0.22,w:barW2*0.55,h:0.22,
        fontSize:8.5,bold:true,color:PC.green,align:"center",fontFace:"Calibri"});
    });
    /* Legend */
    s4.addShape(pres.ShapeType.rect,{x:9.2,y:1.8,w:0.28,h:0.22,fill:{color:PC.green},line:{color:PC.green,width:0}});
    s4.addText("Total Crew",{x:9.55,y:1.8,w:3.2,h:0.22,fontSize:10,color:PC.text,fontFace:"Calibri"});
    s4.addShape(pres.ShapeType.rect,{x:9.2,y:2.12,w:0.28,h:0.22,fill:{color:PC.red},line:{color:PC.red,width:0}});
    s4.addText("Hasil Reaktif",{x:9.55,y:2.12,w:3.2,h:0.22,fontSize:10,color:PC.text,fontFace:"Calibri"});
    /* Summary kanan */
    _kpi(s4,pres,9.1,2.7,4.0,1.2,"Zero Positive Months",
      bList.filter(function(b){return bulanMap[b].positif===0;}).length+" bulan",PC.green);
    _kpi(s4,pres,9.1,4.1,4.0,1.2,"Bulan Ada Temuan",
      bList.filter(function(b){return bulanMap[b].positif>0;}).length+" bulan",
      bList.filter(function(b){return bulanMap[b].positif>0;}).length>0?PC.red:PC.green);
    _ftr(s4,pres,"",4,5);

    /* Slide 5: Rekomendasi */
    var s5=pres.addSlide();
    _hdr(s5,pres,PC.gold,"DRUGS & ALCOHOL TEST  ·  REKOMENDASI","Rekomendasi Tindak Lanjut Program DAT");
    var reksD=[
      {p:"Tindak Lanjut Temuan",c:PC.red,items:[
        totalPositif>0?"Laksanakan protokol medis untuk "+totalPositif+" ABK reaktif":"Pertahankan zero positive — monitoring ketat",
        "Notifikasi ke management kapal dan HR terkait temuan",
        "Dokumentasikan tindakan di sistem pencatatan DAT"
      ]},
      {p:"Penguatan Program",c:PC.amber,items:[
        "Laksanakan DAT unannounced secara berkala tiap bulan",
        "Pastikan seluruh ABK mendapat sosialisasi kebijakan DAT",
        "Review vendor laboratorium untuk akurasi dan kecepatan hasil"
      ]},
      {p:"Compliance MLC 2006",c:PC.blue,items:[
        "Dokumentasikan semua kegiatan DAT untuk keperluan PSC inspection",
        "Pastikan sertifikat drug & alcohol policy kapal up-to-date",
        "Laporkan statistik DAT dalam laporan IH tahunan"
      ]}
    ];
    reksD.forEach(function(r,i){
      var rx=0.3+i*4.38;
      s5.addShape(pres.ShapeType.roundRect,{x:rx,y:1.25,w:4.18,h:5.7,
        fill:{color:_lighten(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
      s5.addShape(pres.ShapeType.rect,{x:rx,y:1.25,w:4.18,h:0.55,fill:{color:r.c},line:{color:r.c,width:0}});
      s5.addText(r.p,{x:rx+0.12,y:1.28,w:3.94,h:0.5,fontSize:11,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s5.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.05+j*1.55,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
        s5.addText(it,{x:rx+0.52,y:1.98+j*1.55,w:3.52,h:1.38,fontSize:11,color:PC.text,fontFace:"Calibri",wrap:true,valign:"top"});
      });
    });
    _ftr(s5,pres,"",5,5);
    pres.writeFile({fileName:"IH_DAT_Report_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT DAT berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal membuat PPT: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════════
   EXPORT PEST — 5 Slide Premium
═══════════════════════════════════════════════════════ */
function exportPestPPT(){
  if(!_guard())return;
  var data=(typeof filteredPest!=="undefined"&&filteredPest.length)?filteredPest:
            (typeof rawPest!=="undefined"?rawPest:[]);
  if(!data.length){showToast("Tidak ada data Pest Control.","warning");return;}
  showToast("Membuat PPT Pest Control...","info");
  try{
    var tgl=_now();
    var totalKeg=data.length;
    var lokasiSet=new Set(data.map(function(r){return r["Nama Gedung"]||r["Lokasi"]||"";}));
    var totalLok=lokasiSet.size;
    var totalBiaya=data.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
    var pres=_pres("Pest & Rodent Control — IH Dashboard");

    /* Slide 1 Cover */
    _cover(pres,"Pest & Rodent Control\nProgram",
      "Pengendalian Vektor & Sanitasi Lingkungan Kantor",tgl,[
      {v:totalKeg+"x",l:"Total Kegiatan",c:PC.purple},
      {v:totalLok+" lok.",l:"Lokasi Kantor",c:PC.blue},
      {v:_fmtRp(totalBiaya),l:"Est. Total Biaya",c:PC.gold},
      {v:"IHR 2005",l:"Referensi WHO",c:PC.teal}
    ]);

    /* Slide 2 Summary */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.purple,"PEST & RODENT CONTROL  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif Program Pest Control");
    _kpi(s2,pres,0.3,1.25,3.12,1.55,"Total Kegiatan",totalKeg+"x",PC.purple);
    _kpi(s2,pres,3.58,1.25,3.12,1.55,"Lokasi",totalLok+" lokasi",PC.blue);
    _kpi(s2,pres,6.86,1.25,3.12,1.55,"Avg / Bulan",(totalKeg/12).toFixed(1)+"x",PC.teal);
    _kpi(s2,pres,10.14,1.25,3.12,1.55,"Total Anggaran",_fmtRp(totalBiaya),PC.gold);
    _anaBox(s2,pres,0.3,3.05,12.7,1.5,PC.purple,"Analisis",
      "Program Pest & Rodent Control terlaksana "+totalKeg+" kegiatan di "+totalLok+
      " lokasi kantor dengan estimasi biaya "+_fmtRp(totalBiaya)+". Program memenuhi kewajiban sanitasi sesuai IHR 2005 WHO dan menjaga lingkungan kerja bebas vektor penyakit.");
    /* Jenis kegiatan breakdown */
    var jenisMap={};
    data.forEach(function(r){
      var j=r["Jenis Kegiatan"]||r["Jenis"]||"Lainnya";
      jenisMap[j]=(jenisMap[j]||0)+1;
    });
    var jenisKeys=Object.keys(jenisMap).slice(0,4);
    var jColors=[PC.purple,PC.blue,PC.teal,PC.green];
    jenisKeys.forEach(function(j,i){
      _kpi(s2,pres,0.3+i*3.27,4.8,3.12,1.3,j,jenisMap[j]+"x",jColors[i]);
    });
    _ftr(s2,pres,"Ref: IHR 2005 WHO  •  Permenkes Sanitasi",2,5);

    /* Slide 3 Tabel */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.purple,"PEST & RODENT CONTROL  ·  DETAIL DATA","Rekapitulasi Kegiatan per Lokasi & Periode");
    var tblR3=data.slice(0,14).map(function(r,i){
      return _mkR([
        {v:i+1,align:"center"},
        {v:r["Nama Gedung"]||r["Lokasi"]||"—",bold:true},
        {v:r["Bulan"]||r["Bulan Pelaksanaan"]||"—"},
        {v:r["Jenis Kegiatan"]||r["Jenis"]||"—"},
        {v:r["Temuan Utama"]||r["Temuan"]||"—"},
        {v:_fmtRp(r["Est Biaya"])}
      ],i%2===0);
    });
    s3.addTable([_mkH(["No","Lokasi/Gedung","Bulan","Jenis Kegiatan","Temuan Utama","Est. Biaya"])].concat(tblR3),
      {x:0.3,y:1.25,w:12.7,colW:[0.4,2.5,1.1,2.0,4.4,2.3],
       rowH:0.4,fontFace:"Calibri",border:{type:"none"},fill:{color:PC.white}});
    if(data.length>14)s3.addText("* "+data.length+" data total — lihat detail di dashboard.",
      {x:0.3,y:6.85,w:12.7,h:0.28,fontSize:9,color:PC.muted,italic:true,fontFace:"Calibri"});
    _ftr(s3,pres,"",3,5);

    /* Slide 4 Trend */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.purple,"PEST & RODENT CONTROL  ·  TREND","Distribusi Kegiatan per Bulan");
    var bulanMapP={};
    BULAN_PPT.forEach(function(b){bulanMapP[b]={count:0,biaya:0};});
    data.forEach(function(r){
      var b=(r["Bulan"]||r["Bulan Pelaksanaan"]||"").trim();
      if(bulanMapP[b]){bulanMapP[b].count++;bulanMapP[b].biaya+=parseFloat(r["Est Biaya"]||0);}
    });
    var maxV=Math.max.apply(null,BULAN_PPT.map(function(b){return bulanMapP[b].count;}))||1;
    var cX=0.4,cY=1.3,cH=4.0,cW=12.5;
    var bwP=cW/12;
    s4.addShape(pres.ShapeType.rect,{x:cX,y:cY,w:cW,h:cH,fill:{color:"FAFBFF"},line:{color:PC.lgray,width:0.5}});
    BULAN_PPT.forEach(function(b,i){
      var v=bulanMapP[b].count;
      var bh=(v/maxV)*cH*0.85;
      var bx=cX+i*bwP+bwP*0.1;
      var cols2=["8E24AA","7B1FA2","6A1B9A","5E35B1","4527A0","3949AB","1E88E5","039BE5","00ACC1","00897B","43A047","7CB342"];
      if(v>0){
        s4.addShape(pres.ShapeType.roundRect,{x:bx,y:cY+cH-bh,w:bwP*0.8,h:bh,
          fill:{color:cols2[i]},line:{color:PC.white,width:0.5},rectRadius:0.05});
        s4.addText(String(v),{x:bx,y:cY+cH-bh-0.28,w:bwP*0.8,h:0.26,
          fontSize:10,bold:true,color:cols2[i],align:"center",fontFace:"Calibri"});
      }
      s4.addText(b.slice(0,3),{x:bx-bwP*0.05,y:cY+cH+0.08,w:bwP*0.9,h:0.24,
        fontSize:8.5,color:PC.muted,align:"center",fontFace:"Calibri"});
    });
    _ftr(s4,pres,"",4,5);

    /* Slide 5 Rekomendasi */
    var s5=pres.addSlide();
    _hdr(s5,pres,PC.gold,"PEST & RODENT CONTROL  ·  REKOMENDASI","Rekomendasi Program Pengendalian Vektor");
    var reksP=[
      {p:"Operasional Rutin",c:PC.purple,items:[
        "Laksanakan jadwal fogging & pengasapan setiap 3 bulan per lokasi",
        "Pasang perangkap tikus di area gudang dan dapur secara berkala",
        "Dokumentasikan temuan dan tindakan setiap sesi di dashboard"
      ]},
      {p:"Penguatan Program",c:PC.blue,items:[
        "Koordinasi dengan property management untuk maintenance saluran air",
        "Sosialisasi kebersihan lingkungan kerja kepada seluruh karyawan",
        "Review vendor pest control untuk kualitas bahan dan teknik"
      ]},
      {p:"Compliance & Laporan",c:PC.teal,items:[
        "Siapkan laporan pest control untuk audit internal K3",
        "Pastikan sertifikat pest control vendor masih berlaku",
        "Integrasikan data dengan laporan IH sanitasi tahunan"
      ]}
    ];
    reksP.forEach(function(r,i){
      var rx=0.3+i*4.38;
      s5.addShape(pres.ShapeType.roundRect,{x:rx,y:1.25,w:4.18,h:5.7,
        fill:{color:_lighten(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
      s5.addShape(pres.ShapeType.rect,{x:rx,y:1.25,w:4.18,h:0.55,fill:{color:r.c},line:{color:r.c,width:0}});
      s5.addText(r.p,{x:rx+0.12,y:1.28,w:3.94,h:0.5,fontSize:11,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s5.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.05+j*1.55,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
        s5.addText(it,{x:rx+0.52,y:1.98+j*1.55,w:3.52,h:1.38,fontSize:11,color:PC.text,fontFace:"Calibri",wrap:true,valign:"top"});
      });
    });
    _ftr(s5,pres,"",5,5);
    pres.writeFile({fileName:"IH_Pest_Control_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Pest Control berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal membuat PPT: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════════
   EXPORT CLOSEOUT HRA 2025 — 4 Slide Premium
═══════════════════════════════════════════════════════ */
function exportCloseout25PPT(){
  if(!_guard())return;
  var data=(typeof rawCloseout!=="undefined"?rawCloseout:[]);
  if(!data.length){showToast("Tidak ada data Closeout HRA 2025.","warning");return;}
  showToast("Membuat PPT Closeout HRA 2025...","info");
  try{
    var tgl=_now();
    var total=data.length;
    var done=data.filter(function(r){return(r["Status Tindak Lanjut"]||"").toLowerCase().includes("selesai")||
      (r["Status Tindak Lanjut"]||"").toLowerCase().includes("done");}).length;
    var pct=total>0?((done/total)*100).toFixed(0):"0";
    var pres=_pres("Closeout HRA 2025 — IH Dashboard");

    /* Slide 1 Cover */
    _cover(pres,"Closeout HRA 2025\nTracking & Status",
      "Monitoring Tindak Lanjut Temuan HRA Tahun 2025",tgl,[
      {v:total,l:"Total Temuan",c:PC.blue},
      {v:done,l:"Sudah Ditutup",c:PC.green},
      {v:total-done,l:"Open Items",c:total-done>0?PC.red:PC.green},
      {v:pct+"%",l:"Completion Rate",c:parseInt(pct)>=80?PC.green:parseInt(pct)>=50?PC.amber:PC.red}
    ]);

    /* Slide 2 Summary */
    var s2=pres.addSlide();
    _hdr(s2,pres,PC.teal,"CLOSEOUT HRA 2025  ·  STATUS OVERVIEW","Ringkasan Status Tindak Lanjut Temuan HRA 2025");
    _kpi(s2,pres,0.3,1.25,3.12,1.55,"Total Temuan",total,PC.blue);
    _kpi(s2,pres,3.58,1.25,3.12,1.55,"Closed",done,PC.green);
    _kpi(s2,pres,6.86,1.25,3.12,1.55,"Open",total-done,total-done>0?PC.red:PC.green);
    _kpi(s2,pres,10.14,1.25,3.12,1.55,"Completion",pct+"%",parseInt(pct)>=80?PC.green:PC.amber);
    /* Progress bar */
    var pw=12.7*(parseInt(pct)/100);
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:3.05,w:12.7,h:0.22,fill:{color:PC.lgray},line:{color:PC.lgray,width:0}});
    s2.addShape(pres.ShapeType.rect,{x:0.3,y:3.05,w:pw,h:0.22,
      fill:{color:parseInt(pct)>=80?PC.green:parseInt(pct)>=50?PC.amber:PC.red},line:{color:PC.white,width:0}});
    s2.addText("Completion Progress: "+pct+"% ("+done+" / "+total+" item ditutup)",
      {x:0.3,y:3.32,w:12.7,h:0.3,fontSize:11,bold:true,color:PC.navy,fontFace:"Calibri"});
    var co_ana=parseInt(pct)>=80?
      "Closeout rate "+pct+"% menunjukkan tindak lanjut yang BAIK. Pertahankan momentum untuk menyelesaikan "+
      (total-done)+" item yang masih open sebelum akhir tahun.":
      "Masih terdapat "+(total-done)+" item open dari "+total+" temuan HRA 2025. Diperlukan percepatan tindak lanjut agar target closure rate terpenuhi.";
    _anaBox(s2,pres,0.3,3.75,12.7,1.4,parseInt(pct)>=80?PC.green:PC.amber,"Status",co_ana);
    _ftr(s2,pres,"",2,4);

    /* Slide 3 Tabel */
    var s3=pres.addSlide();
    _hdr(s3,pres,PC.teal,"CLOSEOUT HRA 2025  ·  DETAIL","Daftar Status Tindak Lanjut per Temuan");
    var tblR3=data.slice(0,12).map(function(r,i){
      var isDone=(r["Status Tindak Lanjut"]||"").toLowerCase().includes("selesai")||
        (r["Status Tindak Lanjut"]||"").toLowerCase().includes("done");
      return _mkR([
        {v:i+1,align:"center"},
        {v:r["Nama Kapal"]||"—",bold:true},
        {v:r["Parameter"]||r["Temuan"]||"—"},
        {v:r["Hirarki Pengendalian"]||r["Hirarki"]||"—"},
        {v:r["PIC"]||"—"},
        {v:r["Target Tanggal"]||r["Deadline"]||"—"},
        {v:isDone?"✓ Closed":"⏳ Open",c:isDone?PC.green:PC.amber,bold:true,align:"center"}
      ],i%2===0);
    });
    s3.addTable([_mkH(["No","Kapal","Parameter/Temuan","Hirarki","PIC","Target","Status"])].concat(tblR3),
      {x:0.3,y:1.25,w:12.7,colW:[0.4,1.8,2.5,1.8,1.5,1.5,1.2],
       rowH:0.4,fontFace:"Calibri",border:{type:"none"},fill:{color:PC.white}});
    _ftr(s3,pres,"",3,4);

    /* Slide 4 Rekomendasi */
    var s4=pres.addSlide();
    _hdr(s4,pres,PC.gold,"CLOSEOUT HRA 2025  ·  ACTION PLAN","Rencana Percepatan Closeout & Verifikasi");
    var reksC=[
      {p:"Percepatan Closure",c:PC.red,items:[
        "Tetapkan PIC dan deadline untuk setiap open item",
        "Lakukan weekly follow-up untuk item yang sudah overdue",
        "Eskalasi ke manajemen jika ada kendala sumber daya"
      ]},
      {p:"Verifikasi & Validasi",c:PC.blue,items:[
        "Verifikasi efektivitas tindakan pengendalian oleh IH officer",
        "Update status di IH Dashboard setiap ada perubahan",
        "Dokumentasikan foto/evidence untuk setiap item closed"
      ]},
      {p:"Pelaporan & Arsip",c:PC.green,items:[
        "Kompilasi laporan closeout final untuk disampaikan ke manajemen",
        "Arsipkan semua dokumen tindak lanjut HRA 2025",
        "Gunakan lesson learned untuk penyempurnaan HRA 2026"
      ]}
    ];
    reksC.forEach(function(r,i){
      var rx=0.3+i*4.38;
      s4.addShape(pres.ShapeType.roundRect,{x:rx,y:1.25,w:4.18,h:5.7,
        fill:{color:_lighten(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
      s4.addShape(pres.ShapeType.rect,{x:rx,y:1.25,w:4.18,h:0.55,fill:{color:r.c},line:{color:r.c,width:0}});
      s4.addText(r.p,{x:rx+0.12,y:1.28,w:3.94,h:0.5,fontSize:11,bold:true,color:PC.white,fontFace:"Calibri"});
      r.items.forEach(function(it,j){
        s4.addShape(pres.ShapeType.ellipse,{x:rx+0.18,y:2.05+j*1.55,w:0.22,h:0.22,fill:{color:r.c},line:{color:r.c,width:0}});
        s4.addText(it,{x:rx+0.52,y:1.98+j*1.55,w:3.52,h:1.38,fontSize:11,color:PC.text,fontFace:"Calibri",wrap:true,valign:"top"});
      });
    });
    _ftr(s4,pres,"",4,4);
    pres.writeFile({fileName:"IH_Closeout_HRA_2025_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Closeout HRA 2025 berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal membuat PPT: "+e.message,"error");}
}
