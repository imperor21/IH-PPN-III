/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — IH Dashboard v5.0 Premium PPT
   PT Pertamina Patra Niaga III — Presentasi Direksi & VP
   ✓ Data real dari dashboard  ✓ Chart visual  ✓ Bahasa akademis
   ✓ Zero 8-digit hex  ✓ colW sum = w
═══════════════════════════════════════════════════════════════════ */
"use strict";
var PC={
  navy:"0F2A4A", navD:"0A1929", navL:"1C3A5A", nav2:"162E42",
  blue:"1565C0", bluL:"EBF5FF",
  teal:"0288D1", teaL:"E3F2FD",
  grn:"2E7D32",  grnL:"E8F5E9",
  red:"C62828",  redL:"FFEBEE",
  amb:"F59E0B",  amL:"FEF3C7",
  gld:"C9973A",  gldL:"FEF9E7",
  pur:"6A1B9A",  purL:"F3E5F5",
  ora:"E65100",  oraL:"FFF3E0",
  wht:"FFFFFF",  gry:"F4F6FA",
  lgr:"E2E8F0",  txt:"1E293B",
  mut:"64748B",  dim:"94A3B8"
};
var BULAN_PPT=["Jan","Feb","Mar","Apr","Mei","Jun",
               "Jul","Ags","Sep","Okt","Nov","Des"];
var BULAN_FULL=["Januari","Februari","Maret","April","Mei","Juni",
                "Juli","Agustus","September","Oktober","November","Desember"];

/* ── Helpers ── */
function _rp(n){n=parseFloat(n)||0;if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";return"Rp "+Math.round(n).toLocaleString("id-ID");}
function _now(){return new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}
function _guard(){if(typeof PptxGenJS==="undefined"){if(typeof showToast==="function")showToast("Library PPT sedang dimuat, coba lagi.","warning");return false;}return true;}
function _pres(t){var p=new PptxGenJS();p.layout="LAYOUT_WIDE";p.author="IH Dashboard v5.0 — PT Pertamina Patra Niaga III";p.title=t;return p;}
function _bg(col){var m={"1565C0":"EBF5FF","2E7D32":"E8F5E9","C62828":"FFEBEE","E65100":"FFF3E0","6A1B9A":"F3E5F5","0288D1":"E3F2FD","F59E0B":"FEF3C7","C9973A":"FEF9E7","7B1FA2":"F3E5F5","0F2A4A":"F0F4F8","AD1457":"FCE4EC"};return m[col]||"F4F6FA";}
function _fs(s){return String(s).length>9?14:String(s).length>6?19:String(s).length>4?24:30;}

/* ════════════════════════════════════════
   COVER — Premium navy-gold dengan dekor
════════════════════════════════════════ */
function _cover(pr,judul,sub,tgl,kpis){
  var s=pr.addSlide();
  s.background={color:PC.navD};
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.08,h:7.5,fill:{color:PC.gld},line:{color:PC.gld,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:0.05,fill:{color:PC.gld},line:{color:PC.gld,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:9.0,y:-1.8,w:6.5,h:6.5,fill:{color:PC.navL},line:{color:PC.navL,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:10.5,y:5.0,w:4.0,h:4.0,fill:{color:PC.nav2},line:{color:PC.nav2,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:-1.0,y:5.5,w:3.5,h:3.5,fill:{color:PC.navL},line:{color:PC.navL,width:0}});
  /* Kop instansi */
  s.addText("PT PERTAMINA PATRA NIAGA  ·  SATUAN KERJA REGIONAL III",
    {x:0.28,y:0.2,w:10,h:0.28,fontSize:8.5,bold:true,color:"CADCFC",charSpacing:2,fontFace:"Calibri"});
  s.addText("Divisi Industrial Hygiene & Occupational Health  ·  IH Dashboard v5.0",
    {x:0.28,y:0.5,w:10,h:0.26,fontSize:9.5,color:"8899AA",fontFace:"Calibri"});
  s.addShape(pr.ShapeType.rect,{x:0.28,y:0.85,w:5.0,h:0.04,fill:{color:PC.gld},line:{color:PC.gld,width:0}});
  /* Judul */
  s.addText(judul,{x:0.28,y:1.02,w:9.0,h:1.1,fontSize:34,bold:true,color:PC.wht,
    fontFace:"Calibri",lineSpacingMultiple:1.1});
  s.addText(sub,{x:0.28,y:2.2,w:9.0,h:0.52,fontSize:14,bold:true,color:"5BB8F5",fontFace:"Calibri"});
  s.addText("Dihasilkan: "+tgl+"   ·   Data: IH Dashboard Real-Time   ·   Konfidensial — Internal",
    {x:0.28,y:2.8,w:9.0,h:0.3,fontSize:9.5,color:"8899AA",fontFace:"Calibri"});
  /* KPI 4 boxes */
  (kpis||[]).forEach(function(k,i){
    var bx=0.28+i*3.28;
    s.addShape(pr.ShapeType.roundRect,{x:bx,y:3.3,w:3.13,h:2.1,
      fill:{color:PC.navL},line:{color:k.c||PC.gld,width:1.5},rectRadius:0.1});
    s.addShape(pr.ShapeType.rect,{x:bx,y:3.3,w:3.13,h:0.06,
      fill:{color:k.c||PC.gld},line:{color:k.c||PC.gld,width:0}});
    s.addText(String(k.v),{x:bx,y:3.4,w:3.13,h:1.0,fontSize:_fs(k.v),
      bold:true,color:k.c||PC.gld,align:"center",fontFace:"Calibri"});
    s.addText(String(k.l),{x:bx+0.08,y:4.44,w:2.97,h:0.88,fontSize:9.5,
      color:"CADCFC",align:"center",fontFace:"Calibri",wrap:true});
  });
  s.addText("KONFIDENSIAL  ·  UNTUK PENGGUNAAN INTERNAL  ·  "+tgl,
    {x:0,y:7.14,w:13.3,h:0.28,fontSize:8,color:"445566",align:"center",fontFace:"Calibri"});
}

/* ════════════════════════════════════════
   HEADER slide konten
════════════════════════════════════════ */
function _hdr(s,pr,acc,sup,main){
  s.background={color:PC.wht};
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.3,h:1.1,fill:{color:PC.navy},line:{color:PC.navy,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:0.07,h:7.5,fill:{color:acc},line:{color:acc,width:0}});
  s.addText(sup,{x:0.22,y:0.08,w:12.8,h:0.35,fontSize:8.5,bold:true,
    color:"CADCFC",charSpacing:1.5,fontFace:"Calibri"});
  s.addText(main,{x:0.22,y:0.5,w:12.8,h:0.46,fontSize:14,bold:true,
    color:PC.wht,fontFace:"Calibri"});
}

/* ════════════════════════════════════════
   FOOTER
════════════════════════════════════════ */
function _ftr(s,pr,ref,pg,tot){
  s.addShape(pr.ShapeType.rect,{x:0,y:7.18,w:13.3,h:0.32,fill:{color:PC.gry},line:{color:PC.gry,width:0}});
  s.addText(ref||"Permenaker 05/2018  •  ACGIH TLV&BEI 2024  •  ILO MLC 2006  •  ISO 45001:2018",
    {x:0.2,y:7.2,w:10.9,h:0.26,fontSize:7.5,color:PC.mut,fontFace:"Calibri"});
  s.addText(pg+" / "+tot,{x:11.3,y:7.2,w:1.8,h:0.26,
    fontSize:9,color:PC.gld,bold:true,align:"right",fontFace:"Calibri"});
}

/* ════════════════════════════════════════
   KPI BOX
════════════════════════════════════════ */
function _kpi(s,pr,x,y,w,h,lbl,val,col){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:_bg(col)},line:{color:col,width:1.5},rectRadius:0.08});
  s.addShape(pr.ShapeType.rect,{x:x,y:y+h-0.06,w:w,h:0.06,
    fill:{color:col},line:{color:col,width:0}});
  s.addText(String(val),{x:x,y:y+0.07,w:w,h:h*0.56,
    fontSize:_fs(val),bold:true,color:col,align:"center",fontFace:"Calibri"});
  s.addText(lbl,{x:x+0.08,y:y+h*0.6,w:w-0.16,h:h*0.38,
    fontSize:9,color:PC.mut,align:"center",fontFace:"Calibri",wrap:true});
}

/* ════════════════════════════════════════
   ANALISIS BOX — narasi akademis
════════════════════════════════════════ */
function _ana(s,pr,x,y,w,h,col,title,body){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:_bg(col)},line:{color:col,width:0},rectRadius:0.08});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.06,h:h,
    fill:{color:col},line:{color:col,width:0}});
  s.addText([
    {text:title+": ",options:{bold:true,color:col,fontSize:11}},
    {text:body,options:{color:PC.txt,fontSize:11}}
  ],{x:x+0.2,y:y+0.1,w:w-0.3,h:h-0.2,fontFace:"Calibri",wrap:true,valign:"top"});
}

/* ════════════════════════════════════════
   BAR CHART — rendered natively di PPT
   data: [{lbl,v,c}]  maxV: optional
════════════════════════════════════════ */
function _barChart(s,pr,x,y,w,h,data,title,accent){
  /* Background */
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:h,
    fill:{color:"FAFBFF"},line:{color:PC.lgr,width:0.5}});
  if(title)s.addText(title,{x:x,y:y-0.28,w:w,h:0.26,
    fontSize:10,bold:true,color:PC.navy,fontFace:"Calibri"});
  var vals=data.map(function(d){return d.v||0;});
  var mx=Math.max.apply(null,vals)||1;
  var n=data.length;
  var bw=w/n;
  var pad=bw*0.15;
  /* Grid lines */
  [0.25,0.5,0.75,1.0].forEach(function(f){
    var gy=y+h-(f*h*0.88);
    s.addShape(pr.ShapeType.rect,{x:x,y:gy,w:w,h:0.01,
      fill:{color:PC.lgr},line:{color:PC.lgr,width:0}});
    s.addText(Math.round(mx*f),{x:x-0.38,y:gy-0.12,w:0.36,h:0.24,
      fontSize:7.5,color:PC.dim,align:"right",fontFace:"Calibri"});
  });
  /* Bars */
  data.forEach(function(d,i){
    var v=d.v||0;
    var bh=(v/mx)*h*0.88;
    var bx=x+i*bw+pad;
    var by=y+h-bh;
    var col=d.c||(v===Math.max.apply(null,vals)?PC.gld:accent||PC.blue);
    if(bh>0){
      s.addShape(pr.ShapeType.roundRect,{x:bx,y:by,w:bw-pad*2,h:bh,
        fill:{color:col},line:{color:PC.wht,width:0.5},rectRadius:0.04});
      if(v>0)s.addText(String(v),{x:bx,y:by-0.26,w:bw-pad*2,h:0.24,
        fontSize:8.5,bold:true,color:col,align:"center",fontFace:"Calibri"});
    }
    s.addText(d.lbl,{x:bx-pad*0.5,y:y+h+0.04,w:bw,h:0.22,
      fontSize:8,color:PC.mut,align:"center",fontFace:"Calibri"});
  });
  /* X axis */
  s.addShape(pr.ShapeType.rect,{x:x,y:y+h,w:w,h:0.03,
    fill:{color:PC.navy},line:{color:PC.navy,width:0}});
}

/* ════════════════════════════════════════
   DONUT CHART — manual dengan arc shapes
   segments: [{lbl,v,c}]
════════════════════════════════════════ */
function _donut(s,pr,cx,cy,r,segments,title){
  if(title)s.addText(title,{x:cx-r-0.1,y:cy-r-0.32,w:(r+0.1)*2,h:0.28,
    fontSize:10,bold:true,color:PC.navy,align:"center",fontFace:"Calibri"});
  var total=segments.reduce(function(a,d){return a+(d.v||0);},0)||1;
  /* Draw donut as stacked circles + white center */
  var startDeg=0;
  segments.forEach(function(seg,i){
    var pct=(seg.v||0)/total;
    if(pct<0.01)return;
    var deg=pct*360;
    /* Approximate arc with a rounded rect positioned around center */
    var midDeg=(startDeg+deg/2)*Math.PI/180;
    var dist=r*0.7;
    var sx=cx+dist*Math.sin(midDeg)-r*pct;
    var sy=cy-dist*Math.cos(midDeg)-r*pct;
    s.addShape(pr.ShapeType.ellipse,{x:sx,y:sy,w:r*pct*2,h:r*pct*2,
      fill:{color:seg.c||PC.blue},line:{color:PC.wht,width:1}});
    startDeg+=deg;
  });
  /* White center hole */
  s.addShape(pr.ShapeType.ellipse,{x:cx-r*0.45,y:cy-r*0.45,w:r*0.9,h:r*0.9,
    fill:{color:PC.wht},line:{color:PC.lgr,width:0.5}});
  /* Center text */
  s.addText(String(total),{x:cx-r*0.45,y:cy-r*0.25,w:r*0.9,h:r*0.5,
    fontSize:18,bold:true,color:PC.navy,align:"center",fontFace:"Calibri"});
  /* Legend */
  segments.forEach(function(seg,i){
    var lx=cx+r+0.15;
    var ly=cy-r*0.5+i*0.38;
    s.addShape(pr.ShapeType.rect,{x:lx,y:ly+0.04,w:0.2,h:0.2,
      fill:{color:seg.c||PC.blue},line:{color:seg.c||PC.blue,width:0}});
    s.addText(seg.lbl+": "+seg.v+(total>0?" ("+Math.round(seg.v/total*100)+"%)":""),
      {x:lx+0.26,y:ly,w:2.5,h:0.28,fontSize:9.5,color:PC.txt,fontFace:"Calibri"});
  });
}

/* ════════════════════════════════════════
   HORIZONTAL BAR — untuk ranking
   items: [{lbl,v,max}]
════════════════════════════════════════ */
function _hbar(s,pr,x,y,w,items,accent){
  var mx=items.reduce(function(a,d){return Math.max(a,d.v||0);},1);
  items.forEach(function(d,i){
    var iy=y+i*0.52;
    var bw=((d.v||0)/mx)*(w-1.4);
    var col=d.c||(i===0?PC.gld:accent||PC.blue);
    s.addText(String(d.lbl).length>20?String(d.lbl).slice(0,19)+"…":String(d.lbl),
      {x:x,y:iy,w:1.3,h:0.38,fontSize:9.5,color:PC.txt,fontFace:"Calibri",valign:"middle"});
    s.addShape(pr.ShapeType.rect,{x:x+1.38,y:iy+0.07,w:w-1.4,h:0.24,
      fill:{color:PC.lgr},line:{color:PC.lgr,width:0}});
    if(bw>0)s.addShape(pr.ShapeType.roundRect,{x:x+1.38,y:iy+0.07,w:bw,h:0.24,
      fill:{color:col},line:{color:col,width:0},rectRadius:0.03});
    s.addText(String(d.v),{x:x+1.38+bw+0.04,y:iy,w:0.5,h:0.38,
      fontSize:9.5,bold:true,color:col,fontFace:"Calibri"});
  });
}

/* ════════════════════════════════════════
   PROGRESS BAR — compliance meter
════════════════════════════════════════ */
function _progress(s,pr,x,y,w,pct,col,label){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:0.28,
    fill:{color:PC.lgr},line:{color:PC.lgr,width:0},rectRadius:0.06});
  if(pct>0)s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:Math.min(pct/100,1)*w,h:0.28,
    fill:{color:col},line:{color:col,width:0},rectRadius:0.06});
  s.addText(label+" — "+Math.round(pct)+"%",{x:x,y:y+0.32,w:w,h:0.26,
    fontSize:10,bold:true,color:col,fontFace:"Calibri"});
}

/* ════════════════════════════════════════
   TABLE — colW must sum = w
════════════════════════════════════════ */
function _tbl(s,pr,x,y,w,hdrs,rows,colW){
  var H=hdrs.map(function(h){
    return{text:h,options:{bold:true,color:PC.wht,fill:{color:PC.navy},
      fontSize:9.5,border:{type:"none"},align:"center"}};
  });
  s.addTable([H].concat(rows),{x:x,y:y,w:w,colW:colW,
    rowH:0.36,fontFace:"Calibri",border:{type:"none"},fill:{color:PC.wht}});
}
function _row(cells,even){
  return cells.map(function(c){
    return{text:String(c.v||"—"),options:{
      fontSize:c.fs||10,color:c.c||PC.txt,bold:c.b||false,
      fill:{color:even?PC.wht:"F8FAFC"},border:{type:"none"},align:c.a||"left"
    }};
  });
}

/* ════════════════════════════════════════
   REKOMENDASI 3 KOLOM
════════════════════════════════════════ */
function _reks(s,pr,reks){
  reks.forEach(function(r,i){
    var rx=0.28+i*4.38;
    s.addShape(pr.ShapeType.roundRect,{x:rx,y:1.25,w:4.2,h:5.75,
      fill:{color:_bg(r.c)},line:{color:r.c,width:0},rectRadius:0.1});
    s.addShape(pr.ShapeType.rect,{x:rx,y:1.25,w:4.2,h:0.56,
      fill:{color:r.c},line:{color:r.c,width:0}});
    s.addText(r.p,{x:rx+0.12,y:1.29,w:3.96,h:0.48,
      fontSize:11,bold:true,color:PC.wht,fontFace:"Calibri"});
    r.items.forEach(function(it,j){
      s.addShape(pr.ShapeType.ellipse,{x:rx+0.18,y:2.08+j*1.56,w:0.22,h:0.22,
        fill:{color:r.c},line:{color:r.c,width:0}});
      s.addText(it,{x:rx+0.52,y:2.01+j*1.56,w:3.56,h:1.44,
        fontSize:11,color:PC.txt,fontFace:"Calibri",wrap:true,valign:"top"});
    });
  });
}

/* ═══════════════════════════════════════════════════
   1. HRA — 5 Slide Premium + Chart
═══════════════════════════════════════════════════ */
function exportHRAPPT(){
  if(!_guard())return;
  var raw=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:
          (typeof rawHRA!=="undefined"?rawHRA:[]);
  if(!raw.length){showToast("Tidak ada data HRA.","warning");return;}
  showToast("Membuat PPT HRA...","info");
  try{
    var tgl=_now();
    var TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var done=new Set(raw.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
    var pct=((done/TOT)*100).toFixed(1);
    var budget=raw.reduce(function(s,r){return s+parseFloat(r["Est Budget"]||0);},0);
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    var byBulan={};
    BULAN_FULL.forEach(function(b){byBulan[b]=0;});
    raw.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&byBulan[b]!==undefined)byBulan[b]++;});
    /* Hazard dominan */
    var hazCnt={};
    raw.forEach(function(r){var h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){hazCnt[hz]=(hazCnt[hz]||0)+1;});});
    var hazTop=Object.entries(hazCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var stC=parseFloat(pct)>=80?PC.grn:parseFloat(pct)>=50?PC.amb:PC.red;
    var pr=_pres("Hazard Recognition & Assessment — IH Dashboard");

    /* ─ S1: COVER ─ */
    _cover(pr,"Hazard Recognition &\nAssessment (HRA)",
      "Evaluasi Komprehensif Identifikasi, Penilaian & Pengendalian Bahaya Kerja Armada",tgl,[
      {v:TOT+" unit",l:"Total Armada\nTerdaftar",c:PC.blue},
      {v:done+" unit",l:"Armada Telah\nLaksanakan HRA",c:PC.grn},
      {v:pct+"%",l:"Coverage HRA\nvs Total Armada",c:stC},
      {v:_rp(budget),l:"Estimasi Total\nAnggaran HRA",c:PC.gld}
    ]);

    /* ─ S2: EXECUTIVE SUMMARY + Chart ─ */
    var s2=pr.addSlide();
    _hdr(s2,pr,PC.blue,"HRA & INDUSTRIAL HYGIENE  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif — Status Pelaksanaan HRA & Distribusi per Fleet");
    /* KPI row */
    _kpi(s2,pr,0.22,1.22,2.95,1.5,"Kapal Telah HRA",done+" unit",PC.grn);
    _kpi(s2,pr,3.27,1.22,2.95,1.5,"Kapal Belum HRA",(TOT-done)+" unit",(TOT-done>0)?PC.red:PC.grn);
    _kpi(s2,pr,6.32,1.22,2.95,1.5,"Coverage Rate",pct+"%",stC);
    _kpi(s2,pr,9.37,1.22,2.95,1.5,"Est. Anggaran",_rp(budget),PC.gld);
    /* Progress bar */
    _progress(s2,pr,0.22,2.9,12.86,parseFloat(pct),stC,"Progress Coverage HRA");
    /* Bar chart distribusi per bulan */
    var bulanData=BULAN_PPT.map(function(b,i){return{lbl:b,v:byBulan[BULAN_FULL[i]]||0};});
    _barChart(s2,pr,0.22,3.42,7.8,2.88,bulanData,"Distribusi Pelaksanaan HRA per Bulan",PC.blue);
    /* Fleet donut kanan */
    _donut(s2,pr,11.1,4.9,1.2,[
      {lbl:"FP I",v:fleets["FP I"],c:PC.blue},
      {lbl:"FP II",v:fleets["FP II"],c:PC.grn},
      {lbl:"FC",v:fleets["FC"],c:PC.amb},
      {lbl:"FGP",v:fleets["FGP"],c:PC.pur}
    ],"Per Fleet");
    _ftr(s2,pr,"Permenaker 05/2018 Pasal 6  •  ISO 45001:2018 Klausul 8",2,5);

    /* ─ S3: DATA TABLE ─ */
    var s3=pr.addSlide();
    _hdr(s3,pr,PC.blue,"HRA & INDUSTRIAL HYGIENE  ·  DATA PELAKSANAAN","Rekapitulasi Detail Pelaksanaan HRA per Unit Armada");
    var rows3=raw.slice(0,13).map(function(r,i){
      var ok=(r["Status"]||"").toLowerCase()==="done";
      return _row([
        {v:i+1,a:"center"},
        {v:r["Nama Kapal"]||"—",b:true},
        {v:r["Jenis Fleet"]||"—",c:PC.blue},
        {v:r["Bulan Pelaksanaan"]||"—"},
        {v:r["Vendor Pelaksana"]||"—"},
        {v:_rp(r["Est Budget"])},
        {v:ok?"✓ Done":"Belum",c:ok?PC.grn:PC.red,b:true,a:"center"}
      ],i%2===0);
    });
    _tbl(s3,pr,0.22,1.25,12.86,
      ["No","Nama Kapal","Fleet","Bulan","Vendor Pelaksana","Est. Anggaran","Status"],
      rows3,[0.38,2.7,0.9,1.05,2.5,1.68,1.1]);
    if(raw.length>13)s3.addText("* Menampilkan 13 dari "+raw.length+" data. Detail lengkap tersedia di IH Dashboard.",
      {x:0.22,y:6.82,w:12.86,h:0.26,fontSize:9,color:PC.mut,italic:true,fontFace:"Calibri"});
    _ftr(s3,pr,"",3,5);

    /* ─ S4: ANALISIS HAZARD DOMINAN ─ */
    var s4=pr.addSlide();
    _hdr(s4,pr,PC.blue,"HRA & INDUSTRIAL HYGIENE  ·  ANALISIS TEMUAN","Distribusi Hazard Dominan & Analisis Gap Coverage HRA");
    /* Analisis teks akademis */
    var anaHRA=parseFloat(pct)>=80?
      "Coverage HRA sebesar "+pct+"% dari "+TOT+" unit armada menunjukkan kepatuhan substansial terhadap Permenaker No.05/2018 Pasal 6 Ayat (1). Dari total "+done+" unit yang telah melaksanakan HRA, seluruh proses dilaksanakan oleh vendor IH tersertifikasi dengan estimasi anggaran "+_rp(budget)+". Disarankan mempertahankan siklus HRA berkala minimal satu kali per tahun sesuai rekomendasi hierarki pengendalian ISO 45001:2018.":
      "Coverage HRA sebesar "+pct+"% dari "+TOT+" unit armada mengindikasikan terdapat "+
      (TOT-done)+" unit belum menjalani proses identifikasi, penilaian, dan pengendalian hazard secara sistematis. Kesenjangan ini berpotensi menimbulkan blind spot dalam manajemen risiko kesehatan kerja ABK sesuai ketentuan Permenaker No.05/2018 Pasal 6 Ayat (1) dan menghadirkan eksposur hukum administratif bagi perusahaan.";
    _ana(s4,pr,0.22,1.25,12.86,1.5,stC,"Analisis Akademis",anaHRA);
    /* Top hazard horizontal bar */
    if(hazTop.length){
      s4.addText("Top "+hazTop.length+" Hazard Dominan Ditemukan pada HRA",
        {x:0.22,y:2.98,w:8,h:0.28,fontSize:10.5,bold:true,color:PC.navy,fontFace:"Calibri"});
      _hbar(s4,pr,0.22,3.36,8.0,hazTop.map(function(h){return{lbl:h[0],v:h[1],c:PC.blue};}),PC.blue);
    }
    /* Fleet breakdown kanan */
    s4.addText("Distribusi per Fleet",{x:8.8,y:2.98,w:4.3,h:0.28,fontSize:10.5,bold:true,color:PC.navy,fontFace:"Calibri"});
    var fClrs=[PC.blue,PC.grn,PC.amb,PC.pur];
    Object.keys(fleets).forEach(function(f,i){
      var fy=3.36+i*0.92;
      s4.addShape(pr.ShapeType.roundRect,{x:8.8,y:fy,w:4.3,h:0.82,
        fill:{color:_bg(fClrs[i])},line:{color:fClrs[i],width:1},rectRadius:0.07});
      s4.addText(f,{x:9.0,y:fy+0.05,w:2.0,h:0.3,fontSize:10,bold:true,color:fClrs[i],fontFace:"Calibri"});
      s4.addText(fleets[f]+" kapal",{x:9.0,y:fy+0.38,w:2.0,h:0.3,fontSize:14,bold:true,color:PC.txt,fontFace:"Calibri"});
      var fpct=TOT>0?Math.round(fleets[f]/TOT*100):0;
      s4.addText(fpct+"%",{x:11.2,y:fy+0.12,w:1.7,h:0.56,fontSize:22,bold:true,color:fClrs[i],align:"right",fontFace:"Calibri"});
    });
    _ftr(s4,pr,"",4,5);

    /* ─ S5: REKOMENDASI ─ */
    var s5=pr.addSlide();
    _hdr(s5,pr,PC.gld,"HRA & INDUSTRIAL HYGIENE  ·  REKOMENDASI STRATEGIS","Rekomendasi Berdasarkan Analisis Gap & Hierarki Pengendalian ISO 45001:2018");
    _reks(s5,pr,[
      {p:"Segera (0–30 Hari)",c:PC.red,items:[
        "Susun jadwal HRA prioritas untuk "+(TOT-done)+" unit armada yang belum melaksanakan HRA berdasarkan usia kapal dan profil hazard",
        "Koordinasikan pengadaan vendor IH tersertifikasi untuk percepatan pelaksanaan HRA sisa armada",
        "Update status pelaksanaan HRA secara berkala di IH Dashboard"
      ]},
      {p:"Jangka Pendek (1–3 Bulan)",c:PC.amb,items:[
        "Validasi laporan HRA yang sudah selesai — pastikan semua temuan hazard memiliki rencana pengendalian HIRARC",
        "Laksanakan review bersama lintas departemen untuk temuan hazard risiko tinggi",
        "Integrasikan rekomendasi HRA ke dalam JSA dan SOP operasional kapal"
      ]},
      {p:"Jangka Panjang (3–12 Bulan)",c:PC.blue,items:[
        "Target coverage HRA 100% seluruh armada sebelum akhir tahun — tetapkan KPI bulanan",
        "Kembangkan program HRA berbasis risiko prioritas sebagai bagian dari SMS kapal sesuai ISM Code",
        "Siapkan laporan HRA tahunan komprehensif untuk keperluan audit biro klasifikasi dan PSC"
      ]}
    ]);
    _ftr(s5,pr,"",5,5);

    pr.writeFile({fileName:"IH_HRA_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT HRA berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT HRA: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════
   2. DAT — 5 Slide Premium + Chart
═══════════════════════════════════════════════════ */
function exportDATPPT(){
  if(!_guard())return;
  var raw=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:
          (typeof rawDAT!=="undefined"?rawDAT:[]);
  if(!raw.length){showToast("Tidak ada data DAT.","warning");return;}
  showToast("Membuat PPT DAT...","info");
  try{
    var tgl=_now();
    var TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var kapalDone=new Set(raw.map(function(r){return r["Nama Kapal"];})).size;
    var totalCrew=raw.reduce(function(s,r){return s+parseInt(r["Total Crew Diperiksa"]||0);},0);
    var totalPos=raw.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
    var totalBiaya=raw.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
    var prevalensi=totalCrew>0?((totalPos/totalCrew)*100).toFixed(2):"0.00";
    var coverage=((kapalDone/TOT)*100).toFixed(1);
    /* Per bulan */
    var byBulan={};
    BULAN_FULL.forEach(function(b){byBulan[b]={k:0,c:0,p:0,bi:0};});
    raw.forEach(function(r){
      var b=r["Bulan Pelaksanaan"];
      if(b&&byBulan[b]){
        byBulan[b].k++;
        byBulan[b].c+=parseInt(r["Total Crew Diperiksa"]||0);
        byBulan[b].p+=parseInt(r["Jumlah Crew Positif"]||0);
        byBulan[b].bi+=parseFloat(r["Est Biaya"]||0);
      }
    });
    var bActive=BULAN_FULL.filter(function(b){return byBulan[b].k>0;});
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    var stC=totalPos===0?PC.grn:parseFloat(prevalensi)<1?PC.amb:PC.red;
    var compRate=totalCrew>0?((1-totalPos/totalCrew)*100).toFixed(1):"100.0";
    var pr=_pres("Drugs & Alcohol Test — IH Dashboard");

    /* S1: COVER */
    _cover(pr,"Program Pemeriksaan\nNarkotika & Psikotropika",
      "Evaluasi Komprehensif Drug & Alcohol Test (DAT) Awak Kapal Armada Tanker",tgl,[
      {v:kapalDone+" unit",l:"Armada\nTerperiksa",c:PC.grn},
      {v:totalCrew.toLocaleString("id-ID"),l:"Total Crew\nDiperiksa",c:PC.blue},
      {v:totalPos+" ABK",l:"Hasil\nReaktif",c:stC},
      {v:prevalensi+"%",l:"Prevalensi\nReaktif",c:stC}
    ]);

    /* S2: EXECUTIVE SUMMARY + Chart */
    var s2=pr.addSlide();
    _hdr(s2,pr,PC.grn,"DRUGS & ALCOHOL TEST  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif — Program DAT & Analisis Prevalensi Reaktif");
    _kpi(s2,pr,0.22,1.22,2.95,1.5,"Coverage DAT",coverage+"%",(parseFloat(coverage)>=80?PC.grn:PC.amb));
    _kpi(s2,pr,3.27,1.22,2.95,1.5,"Total Crew",totalCrew.toLocaleString("id-ID"),PC.blue);
    _kpi(s2,pr,6.32,1.22,2.95,1.5,"Compliance Rate",compRate+"%",(parseFloat(compRate)>=99?PC.grn:PC.amb));
    _kpi(s2,pr,9.37,1.22,2.95,1.5,"Est. Biaya",_rp(totalBiaya),PC.gld);
    _progress(s2,pr,0.22,2.9,12.86,parseFloat(compRate),
      parseFloat(compRate)>=99?PC.grn:PC.amb,"Compliance Rate (Negatif / Total Crew)");
    /* Dual bar: crew vs positif per bulan */
    var crewData=BULAN_PPT.map(function(b,i){return{lbl:b,v:byBulan[BULAN_FULL[i]].c||0,c:PC.grn};});
    var posData=BULAN_PPT.map(function(b,i){return{lbl:b,v:byBulan[BULAN_FULL[i]].p||0,c:PC.red};});
    _barChart(s2,pr,0.22,3.42,7.8,2.88,crewData,"Jumlah Crew Terperiksa per Bulan",PC.grn);
    /* Positif overlay sederhana */
    _barChart(s2,pr,8.3,3.42,4.5,2.88,
      BULAN_PPT.map(function(b,i){return{lbl:b,v:byBulan[BULAN_FULL[i]].p||0,c:PC.red};}),
      "Hasil Reaktif per Bulan",PC.red);
    _ftr(s2,pr,"MLC 2006 Reg.4.3  •  Permenhub KM.5 Tahun 2016  •  ISO 45001:2018",2,5);

    /* S3: TABEL PER BULAN */
    var s3=pr.addSlide();
    _hdr(s3,pr,PC.grn,"DRUGS & ALCOHOL TEST  ·  REKAPITULASI PERIODIK","Rekapitulasi Hasil DAT per Periode — Data Aktual Dashboard");
    var rows3=bActive.map(function(b,i){
      var d=byBulan[b];
      var ok=d.p===0;
      var rat=d.c>0?((d.p/d.c)*100).toFixed(2):"0.00";
      return _row([
        {v:b,b:true},{v:d.k+" unit",a:"center"},
        {v:d.c.toLocaleString("id-ID"),a:"right"},
        {v:d.p,c:ok?PC.grn:PC.red,b:true,a:"center"},
        {v:rat+"%",c:ok?PC.grn:PC.red,a:"center"},
        {v:_rp(d.bi),a:"right"},
        {v:ok?"✓ Negatif":"⚠ Ada Temuan",c:ok?PC.grn:PC.red,b:true,a:"center"}
      ],i%2===0);
    });
    /* Total row */
    var totRow=_row([
      {v:"TOTAL",b:true},{v:kapalDone+" unit",b:true,a:"center"},
      {v:totalCrew.toLocaleString("id-ID"),b:true,a:"right"},
      {v:totalPos,c:totalPos>0?PC.red:PC.grn,b:true,a:"center"},
      {v:prevalensi+"%",c:totalPos>0?PC.red:PC.grn,b:true,a:"center"},
      {v:_rp(totalBiaya),b:true,a:"right"},
      {v:totalPos===0?"✓ Zero Positive":"⚠ Ada Temuan",c:totalPos===0?PC.grn:PC.red,b:true,a:"center"}
    ],false);
    _tbl(s3,pr,0.22,1.25,12.86,
      ["Bulan","Kapal","Total Crew","Positif","Prevalensi","Est. Biaya","Status"],
      rows3.concat([totRow]),[1.3,1.1,1.35,1.05,1.15,1.56,1.6]);
    _ftr(s3,pr,"",3,5);

    /* S4: ANALISIS RISIKO */
    var s4=pr.addSlide();
    _hdr(s4,pr,PC.grn,"DRUGS & ALCOHOL TEST  ·  ANALISIS RISIKO","Analisis Epidemiologis Prevalensi Reaktif & Implikasi Regulasi Maritim");
    var anaDAT=totalPos===0?
      "Program DAT Tahun "+new Date().getFullYear()+" berhasil mencatat zero positive rate dari "+
      totalCrew.toLocaleString("id-ID")+" awak kapal yang diperiksa di "+kapalDone+" unit armada. Pencapaian ini merepresentasikan kepatuhan penuh terhadap MLC 2006 Regulation 4.3 dan Permenhub KM.5 Tahun 2016. Prevalensi 0% berada jauh di bawah benchmark internasional (ILO: <1% untuk armada tanker). Konsistensi program rekomendasikan untuk dipertahankan.":
      "Teridentifikasi "+totalPos+" awak kapal (prevalensi "+prevalensi+"%) menunjukkan hasil reaktif dari total "+
      totalCrew.toLocaleString("id-ID")+" awak terperiksa di "+kapalDone+" unit armada. Temuan ini melebihi threshold zero tolerance yang ditetapkan MLC 2006 Regulation 4.3 dan berimplikasi langsung terhadap keselamatan navigasi serta aspek legal operasional kapal. Diperlukan tindak lanjut medis dan administratif segera.";
    _ana(s4,pr,0.22,1.25,12.86,1.55,stC,"Analisis Epidemiologis",anaDAT);
    /* Monthly trend visual */
    var trendD=bActive.map(function(b){
      return{lbl:b.slice(0,3),v:byBulan[b].p,c:byBulan[b].p>0?PC.red:PC.grn};
    });
    if(trendD.length)_barChart(s4,pr,0.22,3.0,8.0,3.6,trendD,"Tren Temuan Reaktif per Bulan",PC.red);
    /* Fleet breakdown */
    s4.addText("Distribusi DAT per Fleet",{x:8.7,y:3.0,w:4.4,h:0.28,fontSize:10.5,bold:true,color:PC.navy,fontFace:"Calibri"});
    var fClrs2=[PC.blue,PC.grn,PC.amb,PC.pur];
    Object.keys(fleets).forEach(function(f,i){
      var fy=3.38+i*0.88;
      _kpi(s4,pr,8.7,fy,4.4,0.78,f,fleets[f]+" kapal",fClrs2[i]);
    });
    _ftr(s4,pr,"",4,5);

    /* S5: REKOMENDASI */
    var s5=pr.addSlide();
    _hdr(s5,pr,PC.gld,"DRUGS & ALCOHOL TEST  ·  REKOMENDASI STRATEGIS","Rekomendasi Tindak Lanjut Program DAT & Penguatan Kepatuhan MLC 2006");
    _reks(s5,pr,[
      {p:totalPos>0?"Tindak Lanjut Segera":"Pertahankan Capaian",c:PC.red,items:[
        totalPos>0?"Laksanakan protokol medis komprehensif untuk "+totalPos+" ABK reaktif: konsultasi SpOK, rujukan rehabilitasi, dan pembatasan tugas navigasi":"Pertahankan program DAT unannounced minimal bulanan untuk mempertahankan zero positive rate",
        totalPos>0?"Notifikasi formal ke Nakhoda dan Superintendent terkait status ABK reaktif sesuai prosedur":"Sosialisasi rutin kebijakan anti-narkoba dan konsekuensi hukumnya kepada seluruh ABK",
        "Dokumentasikan seluruh tindakan di IH Dashboard sebagai bukti compliance ISM Code"
      ]},
      {p:"Penguatan Program",c:PC.amb,items:[
        "Implementasikan metode Randomized Drug Testing dengan minimal 25% sampel unannounced dari total ABK per semester",
        "Review dan perbarui kebijakan Drug & Alcohol Policy kapal — selaraskan dengan MLC 2006 Reg.4.3 dan Permenhub",
        "Audit vendor laboratorium: validasi akreditasi, CoA alat, dan chain of custody specimen"
      ]},
      {p:"Compliance Jangka Panjang",c:PC.blue,items:[
        "Dokumentasikan statistik DAT dalam laporan IH tahunan untuk keperluan Port State Control (PSC) inspection",
        "Pastikan Drug & Alcohol Policy terpampang di area strategis seluruh unit armada",
        "Kembangkan program Employee Assistance Program (EAP) untuk ABK berisiko"
      ]}
    ]);
    _ftr(s5,pr,"",5,5);
    pr.writeFile({fileName:"IH_DAT_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT DAT berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT DAT: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════
   3. PEST & RODENT — 5 Slide Premium + Chart
═══════════════════════════════════════════════════ */
function exportPestPPT(){
  if(!_guard())return;
  var raw=(typeof filteredPest!=="undefined"&&filteredPest.length)?filteredPest:
          (typeof rawPest!=="undefined"?rawPest:[]);
  if(!raw.length){showToast("Tidak ada data Pest Control.","warning");return;}
  showToast("Membuat PPT Pest Control...","info");
  try{
    var tgl=_now();
    var totalKeg=raw.length;
    var lokSet=new Set(raw.map(function(r){return(r["Lokasi"]||"").trim();}));
    var totalLok=lokSet.size;
    var totalBiaya=raw.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
    /* Temuan hama dominan */
    var hamaMap={};
    raw.forEach(function(r){
      var t=(r["Temuan / Keluhan"]||"").toLowerCase();
      ["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(function(h){
        if(t.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;
      });
    });
    var hamaTop=Object.entries(hamaMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    /* Per bulan */
    var byBulan={};
    BULAN_FULL.forEach(function(b){byBulan[b]={c:0,bi:0};});
    raw.forEach(function(r){
      var b=(r["Bulan"]||r["Bulan Pelaksanaan"]||"").trim();
      if(b&&byBulan[b]){byBulan[b].c++;byBulan[b].bi+=parseFloat(r["Est Biaya"]||0);}
    });
    var pr=_pres("Pest & Rodent Control — IH Dashboard");

    /* S1: COVER */
    _cover(pr,"Program Pengendalian\nVektor & Hama",
      "Evaluasi Kegiatan Pest & Rodent Control Fasilitas Perkantoran Pertamina",tgl,[
      {v:totalKeg+"x",l:"Total\nKegiatan",c:PC.pur},
      {v:totalLok+" lok.",l:"Lokasi\nTerprogram",c:PC.blue},
      {v:_rp(totalBiaya),l:"Estimasi\nTotal Anggaran",c:PC.gld},
      {v:"IHR 2005",l:"Referensi\nStandar WHO",c:PC.teal}
    ]);

    /* S2: EXECUTIVE SUMMARY */
    var s2=pr.addSlide();
    _hdr(s2,pr,PC.pur,"PEST & RODENT CONTROL  ·  EXECUTIVE SUMMARY","Ringkasan Eksekutif — Program Pengendalian Vektor & Sanitasi Lingkungan Kerja");
    _kpi(s2,pr,0.22,1.22,2.95,1.5,"Total Kegiatan",totalKeg+"x",PC.pur);
    _kpi(s2,pr,3.27,1.22,2.95,1.5,"Lokasi Aktif",totalLok+" lokasi",PC.blue);
    _kpi(s2,pr,6.32,1.22,2.95,1.5,"Rata-rata/Bulan",(totalKeg/12).toFixed(1)+"x/bln",PC.teal);
    _kpi(s2,pr,9.37,1.22,2.95,1.5,"Total Anggaran",_rp(totalBiaya),PC.gld);
    _ana(s2,pr,0.22,2.9,12.86,1.4,PC.pur,"Analisis",
      "Program Pest & Rodent Control terlaksana "+totalKeg+" kegiatan di "+totalLok+
      " lokasi fasilitas perkantoran dengan total estimasi biaya "+_rp(totalBiaya)+
      ". Program ini memenuhi kewajiban sanitasi dan pengendalian vektor penyakit sesuai International Health Regulations (IHR) 2005 WHO serta mendukung terciptanya lingkungan kerja yang sehat dan produktif.");
    /* Bar chart per bulan */
    _barChart(s2,pr,0.22,4.48,12.86,2.46,
      BULAN_PPT.map(function(b,i){return{lbl:b,v:byBulan[BULAN_FULL[i]].c||0};}),
      "Frekuensi Kegiatan per Bulan",PC.pur);
    _ftr(s2,pr,"IHR 2005 WHO  •  Permenkes No.50 Tahun 2017  •  ISO 45001:2018",2,5);

    /* S3: TABEL DATA */
    var s3=pr.addSlide();
    _hdr(s3,pr,PC.pur,"PEST & RODENT CONTROL  ·  DATA KEGIATAN","Rekapitulasi Detail Kegiatan Pest Control per Lokasi & Periode");
    var rows3=raw.slice(0,13).map(function(r,i){
      return _row([
        {v:i+1,a:"center"},
        {v:r["Lokasi"]||"—",b:true},
        {v:r["Bulan"]||r["Bulan Pelaksanaan"]||"—"},
        {v:r["Jenis Kegiatan"]||"—"},
        {v:(r["Temuan / Keluhan"]||"—").slice(0,40)},
        {v:_rp(r["Est Biaya"]),a:"right"}
      ],i%2===0);
    });
    _tbl(s3,pr,0.22,1.25,12.86,
      ["No","Lokasi","Bulan","Jenis Kegiatan","Temuan / Keluhan","Est. Biaya"],
      rows3,[0.38,2.2,1.0,2.0,5.5,1.78]);
    if(raw.length>13)s3.addText("* "+raw.length+" data total. Lihat detail lengkap di dashboard.",
      {x:0.22,y:6.82,w:12.86,h:0.26,fontSize:9,color:PC.mut,italic:true,fontFace:"Calibri"});
    _ftr(s3,pr,"",3,5);

    /* S4: ANALISIS TEMUAN HAMA */
    var s4=pr.addSlide();
    _hdr(s4,pr,PC.pur,"PEST & RODENT CONTROL  ·  ANALISIS TEMUAN","Distribusi Temuan Hama Dominan & Tren Kegiatan Pengendalian");
    if(hamaTop.length){
      s4.addText("Distribusi Temuan Hama Dominan",
        {x:0.22,y:1.25,w:8,h:0.28,fontSize:11,bold:true,color:PC.navy,fontFace:"Calibri"});
      _hbar(s4,pr,0.22,1.6,7.8,hamaTop.map(function(h){
        return{lbl:h[0].charAt(0).toUpperCase()+h[0].slice(1),v:h[1]};
      }),PC.pur);
    }
    /* Biaya per bulan */
    var biayaData=BULAN_PPT.map(function(b,i){
      return{lbl:b,v:Math.round(byBulan[BULAN_FULL[i]].bi/1e6)||0,c:PC.gld};
    });
    _barChart(s4,pr,0.22,4.1,12.86,2.75,biayaData,"Estimasi Biaya per Bulan (Juta Rp)",PC.gld);
    _ftr(s4,pr,"",4,5);

    /* S5: REKOMENDASI */
    var s5=pr.addSlide();
    _hdr(s5,pr,PC.gld,"PEST & RODENT CONTROL  ·  REKOMENDASI STRATEGIS","Rekomendasi Program Pengendalian Vektor Terintegrasi");
    _reks(s5,pr,[
      {p:"Pengendalian Rutin",c:PC.pur,items:[
        hamaTop.length?"Prioritaskan pengendalian "+hamaTop.slice(0,2).map(function(h){return h[0];}).join(" dan ")+" sebagai vektor dominan yang ditemukan":"Pertahankan jadwal pengendalian rutin yang sudah berjalan",
        "Laksanakan fogging dan fumigasi terjadwal minimal satu kali setiap 3 bulan per lokasi",
        "Pasang perangkap rodensia permanen di titik-titik strategis: dapur, gudang, dan saluran pembuangan"
      ]},
      {p:"Penguatan Infrastruktur",c:PC.blue,items:[
        "Koordinasikan dengan pengelola gedung untuk perbaikan struktural yang menjadi titik masuk hama: celah dinding, saluran air terbuka, dan ventilasi tidak bertutup",
        "Evaluasi dan tingkatkan standar sanitasi dapur dan kantin kantor secara berkala",
        "Tingkatkan kesadaran karyawan tentang kebersihan lingkungan dan pencegahan kontaminasi"
      ]},
      {p:"Compliance & Dokumentasi",c:PC.teal,items:[
        "Siapkan laporan Pest Control triwulanan sebagai bukti kepatuhan IHR 2005 WHO untuk keperluan audit K3 dan sertifikasi",
        "Pastikan sertifikat perusahaan pest control vendor masih berlaku dan tercatat di IH Dashboard",
        "Integrasikan data temuan hama ke dalam penilaian risiko kesehatan kerja tahunan"
      ]}
    ]);
    _ftr(s5,pr,"",5,5);
    pr.writeFile({fileName:"IH_Pest_Control_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Pest Control berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT Pest: "+e.message,"error");}
}

/* ═══════════════════════════════════════════════════
   4. CLOSEOUT HRA 2025 — 4 Slide Premium
═══════════════════════════════════════════════════ */
function exportCloseout25PPT(){
  if(!_guard())return;
  var raw=(typeof rawCloseout!=="undefined"?rawCloseout:[]);
  if(!raw.length){showToast("Tidak ada data Closeout HRA 2025.","warning");return;}
  showToast("Membuat PPT Closeout HRA 2025...","info");
  try{
    var tgl=_now();
    var total=raw.length;
    function isDone(r){var s=(r["Status Tindak Lanjut"]||"").toLowerCase();return s.includes("selesai")||s.includes("done")||s.includes("closed");}
    var done=raw.filter(isDone).length;
    var open=total-done;
    var pct=total>0?((done/total)*100).toFixed(0):"0";
    var stC=parseInt(pct)>=80?PC.grn:parseInt(pct)>=50?PC.amb:PC.red;
    /* Per hirarki */
    var hirMap={};
    raw.forEach(function(r){var h=r["Hirarki Pengendalian"]||r["Hirarki"]||"Lainnya";hirMap[h]=(hirMap[h]||0)+1;});
    var hirTop=Object.entries(hirMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var pr=_pres("Closeout HRA 2025 — IH Dashboard");

    /* S1: COVER */
    _cover(pr,"Closeout & Tracking\nTindak Lanjut HRA 2025",
      "Monitoring Status Penyelesaian Temuan Hazard Hasil HRA Tahun 2025",tgl,[
      {v:total,l:"Total\nTemuan HRA",c:PC.blue},
      {v:done,l:"Item\nClosed",c:PC.grn},
      {v:open,l:"Open\nItems",c:open>0?PC.red:PC.grn},
      {v:pct+"%",l:"Completion\nRate",c:stC}
    ]);

    /* S2: STATUS + CHART */
    var s2=pr.addSlide();
    _hdr(s2,pr,PC.teal,"CLOSEOUT HRA 2025  ·  STATUS OVERVIEW","Dashboard Status Penyelesaian Tindak Lanjut Temuan HRA Tahun 2025");
    _kpi(s2,pr,0.22,1.22,3.05,1.5,"Total Temuan",total,PC.blue);
    _kpi(s2,pr,3.37,1.22,3.05,1.5,"Closed",done,PC.grn);
    _kpi(s2,pr,6.52,1.22,3.05,1.5,"Open / Pending",open,open>0?PC.red:PC.grn);
    _kpi(s2,pr,9.67,1.22,3.15,1.5,"Completion Rate",pct+"%",stC);
    _progress(s2,pr,0.22,2.9,12.86,parseFloat(pct),stC,"Completion Progress ("+done+" / "+total+" item closed)");
    /* Donut closed vs open */
    _donut(s2,pr,3.5,5.5,1.5,[
      {lbl:"Closed",v:done,c:PC.grn},
      {lbl:"Open",v:open,c:PC.red}
    ],"Status Closure");
    /* Hirarki distribution */
    if(hirTop.length){
      s2.addText("Distribusi per Hirarki Pengendalian",
        {x:6.5,y:3.65,w:6.5,h:0.28,fontSize:10.5,bold:true,color:PC.navy,fontFace:"Calibri"});
      _hbar(s2,pr,6.5,4.0,6.5,hirTop.map(function(h){return{lbl:h[0],v:h[1]};}),PC.teal);
    }
    _ftr(s2,pr,"ISO 45001:2018  •  ISM Code  •  Permenaker 05/2018",2,4);

    /* S3: TABEL DETAIL */
    var s3=pr.addSlide();
    _hdr(s3,pr,PC.teal,"CLOSEOUT HRA 2025  ·  DAFTAR TINDAK LANJUT","Status Detail Penyelesaian Temuan per Kapal & Parameter Hazard");
    var rows3=raw.slice(0,12).map(function(r,i){
      var ok=isDone(r);
      return _row([
        {v:i+1,a:"center"},
        {v:r["Nama Kapal"]||"—",b:true},
        {v:(r["Parameter"]||r["Temuan"]||"—").slice(0,28)},
        {v:r["Hirarki Pengendalian"]||r["Hirarki"]||"—"},
        {v:r["PIC"]||"—"},
        {v:r["Target Tanggal"]||r["Deadline"]||"—"},
        {v:ok?"✓ Closed":"⏳ Open",c:ok?PC.grn:PC.amb,b:true,a:"center"}
      ],i%2===0);
    });
    _tbl(s3,pr,0.22,1.25,12.86,
      ["No","Kapal","Parameter/Temuan","Hirarki","PIC","Target","Status"],
      rows3,[0.38,1.9,2.8,1.8,1.5,1.43,1.25]);
    _ftr(s3,pr,"",3,4);

    /* S4: REKOMENDASI */
    var s4=pr.addSlide();
    _hdr(s4,pr,PC.gld,"CLOSEOUT HRA 2025  ·  ACTION PLAN","Rencana Percepatan Penutupan Temuan & Verifikasi Efektivitas Pengendalian");
    _reks(s4,pr,[
      {p:"Percepatan Closure",c:PC.red,items:[
        open>0?"Tetapkan PIC dan deadline tegas untuk "+open+" open item — eskalasi ke Superintendent jika melebihi target":"Seluruh temuan telah closed — lakukan verifikasi akhir efektivitas pengendalian",
        "Lakukan weekly follow-up meeting untuk item yang sudah melampaui target tanggal penyelesaian",
        "Sediakan resources dan anggaran yang diperlukan untuk implementasi tindakan pengendalian teknik"
      ]},
      {p:"Verifikasi Efektivitas",c:PC.blue,items:[
        "Verifikasi efektivitas setiap tindakan pengendalian melalui re-measurement atau re-assessment oleh IH officer",
        "Dokumentasikan evidence foto/video untuk setiap item closed di IH Dashboard sebagai bukti objektif",
        "Lakukan inspection lapangan untuk memastikan pengendalian diimplementasikan sesuai rekomendasi HRA"
      ]},
      {p:"Pelaporan & Lesson Learned",c:PC.grn,items:[
        "Kompilasi laporan closeout final untuk disampaikan kepada manajemen sebagai bahan evaluasi program K3",
        "Arsipkan seluruh dokumen tindak lanjut HRA 2025 sebagai referensi audit ISM Code dan biro klasifikasi",
        "Gunakan lesson learned dari temuan HRA 2025 sebagai masukan penyempurnaan metodologi HRA 2026"
      ]}
    ]);
    _ftr(s4,pr,"",4,4);
    pr.writeFile({fileName:"IH_Closeout_HRA_2025_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Closeout HRA 2025 berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT Closeout: "+e.message,"error");}
}
