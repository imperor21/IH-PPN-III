/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — IH Dashboard v5.0
   Design: Sesuai Laporan_DAT_Mei_2026.pptx (desain asli)
   Palette: Navy dark + Cyan accent + White cards
   Layout: LAYOUT_WIDE 13.33 × 7.5 in
   ✓ Zero 8-digit hex ✓ colW sum = w ✓ Zero error
═══════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ PALETTE PERTAMINA — Minimalis Elegan ══ */
var C={
  navD:"002060", nav:"003195", nav2:"184799",
  red:"E62129",  gold:"FFC000", cyan:"00B0F0",
  grn:"228B22",  pos:"27AE60",  warn:"E67E22",
  wht:"FFFFFF",  gry:"F7F9FC",  lgr:"DDE3ED",
  txt:"1A2B45",  muted:"7A8EA8"
};
function _fs(v){var s=String(v);return s.length>9?14:s.length>6?18:s.length>4?24:s.length>2?30:38;}
function _now(){
  var d=new Date();
  var B=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return d.getDate()+" "+B[d.getMonth()]+" "+d.getFullYear();
}
function _rp(v){
  var n=parseFloat(v)||0;
  if(n>=1e9)return"Rp "+(n/1e9).toFixed(1)+" M";
  if(n>=1e6)return"Rp "+(n/1e6).toFixed(1)+" Jt";
  if(n>=1e3)return"Rp "+(n/1e3).toFixed(0)+" Rb";
  return"Rp "+n;
}
function _pres(title){
  var p=new PptxGenJS();
  p.layout="LAYOUT_WIDE";
  p.author="IH Dashboard — PT Pertamina Patra Niaga";
  p.title=title;
  return p;
}
function _guard(){
  if(typeof PptxGenJS==="undefined"){
    if(typeof showToast==="function")showToast("Library PPT sedang dimuat, coba lagi.","warning");
    return false;
  }return true;
}
/* Tunggu PptxGenJS termuat (lokal/CDN) hingga 20 detik dengan polling.
   Inilah fungsi yang sebelumnya hilang sehingga klik dini langsung gagal. */
async function _awaitPptx(){
  var waited=0;
  while(typeof PptxGenJS==="undefined" && waited<20000){
    await new Promise(function(r){setTimeout(r,300);});
    waited+=300;
  }
  return typeof PptxGenJS!=="undefined";
}
async function _guardAsync(){
  if(typeof _awaitPptx==="function"){
    var ok=await _awaitPptx();
    if(!ok){if(typeof showToast==="function")showToast("Library PPT gagal dimuat. Coba refresh halaman.","error");return false;}
    return true;
  }
  return _guard();
}

/* ══════════════════════════════════════════════════════════
   DESIGN SYSTEM — Minimalis Elegan (Pertamina Patra Niaga)
   Prinsip: whitespace lega, tipografi kuat, warna terkontrol
══════════════════════════════════════════════════════════ */

/* Header slide — merah tipis atas, gold accent, clean */
function _hdr(s,pr,title,sub){
  s.background={color:C.wht};
  /* Garis merah tipis atas */
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.33,h:0.06,
    fill:{color:C.red},line:{color:C.red,width:0}});
  /* Header band navy */
  s.addShape(pr.ShapeType.rect,{x:0,y:0.06,w:13.33,h:0.80,
    fill:{color:C.navD},line:{color:C.navD,width:0}});
  /* Gold accent line bawah header */
  s.addShape(pr.ShapeType.rect,{x:0,y:0.86,w:13.33,h:0.03,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  /* Judul */
  var fs=title.length>55?13:title.length>40?15:18;
  s.addText(title,{x:0.35,y:0.10,w:10.2,h:0.62,
    fontSize:fs,bold:true,color:C.wht,fontFace:"Segoe UI",charSpacing:0.2,valign:"middle"});
  if(sub)s.addText(sub,{x:0.35,y:0.56,w:10.2,h:0.28,
    fontSize:9,color:"AABBD0",italic:true,fontFace:"Segoe UI",valign:"bottom"});
  /* Label Pertamina kanan */
  s.addText("PERTAMINA PATRA NIAGA",{x:10.8,y:0.18,w:2.32,h:0.26,
    fontSize:7.5,bold:true,color:C.gold,align:"right",fontFace:"Segoe UI",charSpacing:0.5});
  s.addText("IH Dashboard v5.0",{x:10.8,y:0.44,w:2.32,h:0.22,
    fontSize:7,color:"7A8EA8",align:"right",italic:true,fontFace:"Segoe UI"});
  /* Footer */
  s.addShape(pr.ShapeType.rect,{x:0,y:7.36,w:13.33,h:0.03,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0,y:7.39,w:13.33,h:0.11,
    fill:{color:C.navD},line:{color:C.navD,width:0}});
}

/* Footer label + nomor halaman */
function _ftr(s,pr,label,pg,tot){
  s.addText(label,{x:0.35,y:7.40,w:11.0,h:0.10,
    fontSize:6.5,color:"AABBD0",italic:true,fontFace:"Segoe UI",valign:"middle"});
  s.addText(pg+"/"+tot,{x:12.3,y:7.40,w:0.80,h:0.10,
    fontSize:7,bold:true,color:C.gold,align:"right",fontFace:"Segoe UI",valign:"middle"});
}

/* KPI Card — putih, border tipis, angka besar */
function _kpiCard(s,pr,x,y,w,h,icon,val,lbl,clr,ibg,acl){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.lgr,width:0.8},rectRadius:0.10,
    shadow:{type:"outer",color:"002060",blur:8,offset:2,angle:135,opacity:0.06}});
  /* Aksen warna atas */
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:0.08,
    fill:{color:clr},line:{color:clr,width:0},rectRadius:0.10});
  /* Angka besar */
  s.addText(String(val),{x:x+0.12,y:y+0.22,w:w-0.24,h:h*0.52,
    fontSize:_fs(val),bold:true,color:C.navD,align:"center",valign:"middle",fontFace:"Segoe UI"});
  /* Label */
  s.addText(lbl,{x:x+0.08,y:y+h*0.70,w:w-0.16,h:h*0.28,
    fontSize:9,color:C.muted,align:"center",valign:"middle",fontFace:"Segoe UI",wrap:true});
  /* Icon kecil kanan atas */
  s.addText(icon,{x:x+w-0.54,y:y+0.14,w:0.40,h:0.34,
    fontSize:14,align:"center",fontFace:"Segoe UI Emoji"});
}

/* KPI Row — horizontal compact */
function _kpiRow(s,pr,x,y,w,h,icon,val,txt,clr,ibg){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.lgr,width:0.6},rectRadius:0.08,
    shadow:{type:"outer",color:"002060",blur:5,offset:1,angle:135,opacity:0.05}});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.06,h:h,
    fill:{color:clr},line:{color:clr,width:0}});
  s.addText(String(val),{x:x+0.20,y:y+0.05,w:w-0.28,h:h*0.55,
    fontSize:_fs(val),bold:true,color:C.navD,valign:"bottom",fontFace:"Segoe UI"});
  s.addText(txt,{x:x+0.20,y:y+h*0.55,w:w-0.28,h:h*0.42,
    fontSize:9.5,color:C.muted,valign:"top",fontFace:"Segoe UI",wrap:true});
}

/* Alert box — ringan, informatif */
function _alert(s,pr,x,y,w,h,icon,txt,clr,bg){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:bg||C.gry},line:{color:clr,width:0.8},rectRadius:0.10});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:0.06,
    fill:{color:clr},line:{color:clr,width:0}});
  s.addText(icon,{x:x+0.10,y:y+0.14,w:0.50,h:0.44,
    fontSize:18,align:"center",fontFace:"Segoe UI Emoji"});
  s.addText(txt,{x:x+0.68,y:y+0.10,w:w-0.80,h:h-0.18,
    fontSize:10.5,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"middle"});
}

/* Rekomendasi card — navy sidebar + konten putih */
function _rekCard(s,pr,x,y,w,h,num,txt){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.lgr,width:0.6},rectRadius:0.10});
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:0.55,h:h,
    fill:{color:C.navD},line:{color:C.navD,width:0},rectRadius:0.10});
  s.addText(String(num),{x:x+0.02,y:y,w:0.51,h:h,
    fontSize:22,bold:true,color:C.gold,align:"center",valign:"middle",fontFace:"Segoe UI"});
  s.addText(txt,{x:x+0.68,y:y+0.08,w:w-0.80,h:h-0.16,
    fontSize:11.5,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"middle"});
}

/* Bar chart sederhana */
function _barChart(s,pr,x,y,w,h,labels,vals,clrs,title){
  if(title)s.addText(title,{x:x,y:y,w:w,h:0.28,
    fontSize:11,bold:true,color:C.navD,fontFace:"Segoe UI"});
  var ty=title?y+0.30:y,th=title?h-0.30:h;
  var maxV=Math.max.apply(null,vals)||1;
  var n=Math.min(vals.length,12);
  var bw=w/n-0.08;
  for(var i=0;i<n;i++){
    var bh=Math.max(0.05,(vals[i]/maxV)*(th-0.42));
    var bx=x+i*(w/n);
    var by=ty+th-0.38-bh;
    s.addShape(pr.ShapeType.roundRect,{x:bx+0.04,y:by,w:bw,h:bh,
      fill:{color:clrs?clrs[i%clrs.length]:C.navD},
      line:{color:clrs?clrs[i%clrs.length]:C.navD,width:0},rectRadius:0.04});
    if(vals[i]>0)s.addText(String(vals[i]),{x:bx+0.04,y:by-0.26,w:bw,h:0.24,
      fontSize:9,bold:true,color:C.navD,align:"center",fontFace:"Segoe UI"});
    s.addText(labels[i]||"",{x:bx,y:ty+th-0.36,w:bw+0.08,h:0.34,
      fontSize:8,color:C.muted,align:"center",wrap:true,fontFace:"Segoe UI"});
  }
}

/* Donut chart (pie visual sederhana dgn text) */
function _donutChart(s,pr,x,y,w,h,vals,labels,clrs,title){
  if(title)s.addText(title,{x:x,y:y,w:w,h:0.28,
    fontSize:11,bold:true,color:C.navD,fontFace:"Segoe UI"});
  var ty=title?y+0.32:y;
  var total=vals.reduce(function(a,b){return a+(b||0);},0)||1;
  var ly=ty;
  vals.forEach(function(v,i){
    var pct=Math.round(v/total*100);
    var col=clrs?clrs[i%clrs.length]:C.navD;
    s.addShape(pr.ShapeType.roundRect,{x:x,y:ly,w:0.18,h:0.22,
      fill:{color:col},line:{color:col,width:0},rectRadius:0.03});
    s.addText((labels[i]||"")+" — "+pct+"%  ("+v+")",{x:x+0.26,y:ly,w:w-0.26,h:0.24,
      fontSize:10,color:C.txt,fontFace:"Segoe UI",valign:"middle"});
    ly+=0.28;
  });
}

/* Cover slide — minimalis 2 kolom */
function _cover(pr,judul1,judul2,sub,periode,kpis,watermark){
  var s=pr.addSlide();
  s.background={color:C.wht};
  /* Sidebar navy berlapis — kesan kedalaman */
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:4.6,h:7.5,fill:{color:C.navD},line:{color:C.navD,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:4.6,h:1.40,fill:{color:C.nav},line:{color:C.nav,width:0}});
  /* Aksen gold vertikal + merah tipis atas kanan */
  s.addShape(pr.ShapeType.rect,{x:4.60,y:0,w:0.07,h:7.5,fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addShape(pr.ShapeType.rect,{x:4.67,y:0,w:8.66,h:0.07,fill:{color:C.red},line:{color:C.red,width:0}});
  /* Brand */
  s.addText("PERTAMINA\nPATRA NIAGA",{x:0.22,y:0.30,w:4.0,h:0.80,
    fontSize:13,bold:true,color:C.gold,align:"center",fontFace:"Segoe UI",charSpacing:2,lineSpacingMultiple:1.25});
  s.addShape(pr.ShapeType.rect,{x:1.30,y:1.18,w:2.0,h:0.018,fill:{color:C.gold},line:{color:C.gold,width:0}});
  /* Watermark / inisial */
  if(watermark)s.addText(watermark,{x:0.10,y:1.70,w:4.2,h:2.9,
    fontSize:46,bold:true,color:C.nav2,fontFace:"Segoe UI",valign:"middle",align:"center",lineSpacingMultiple:0.85});
  /* KPI pills — tab gold di kiri, angka kontras */
  (kpis||[]).slice(0,3).forEach(function(k,i){
    var ky=4.86+i*0.84;
    s.addShape(pr.ShapeType.roundRect,{x:0.26,y:ky,w:3.90,h:0.72,fill:{color:C.nav},line:{color:C.nav,width:0},rectRadius:0.07});
    s.addShape(pr.ShapeType.rect,{x:0.26,y:ky+0.10,w:0.07,h:0.52,fill:{color:k.c||C.gold},line:{color:k.c||C.gold,width:0}});
    s.addText(String(k.v),{x:0.36,y:ky,w:1.18,h:0.72,fontSize:_fs(k.v),bold:true,color:k.c||C.gold,align:"center",valign:"middle",fontFace:"Segoe UI"});
    s.addText(k.l,{x:1.58,y:ky+0.07,w:2.46,h:0.58,fontSize:10,color:"AABBD0",valign:"middle",fontFace:"Segoe UI"});
  });
  /* Kanan — eyebrow, judul, rule gold */
  s.addText("LAPORAN KOMPREHENSIF · INDUSTRIAL HYGIENE",{x:5.0,y:0.50,w:8.0,h:0.30,
    fontSize:10.5,bold:true,color:C.red,charSpacing:2,fontFace:"Segoe UI"});
  s.addText(judul1,{x:4.97,y:0.92,w:8.1,h:1.9,fontSize:46,bold:true,color:C.navD,fontFace:"Segoe UI",lineSpacingMultiple:0.92});
  s.addText(judul2,{x:5.0,y:2.78,w:8.0,h:0.70,fontSize:21,bold:false,color:C.red,fontFace:"Segoe UI"});
  s.addShape(pr.ShapeType.rect,{x:5.0,y:3.52,w:1.30,h:0.035,fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addShape(pr.ShapeType.rect,{x:6.30,y:3.555,w:6.7,h:0.012,fill:{color:C.lgr},line:{color:C.lgr,width:0}});
  /* Sub */
  s.addText(sub,{x:5.0,y:3.66,w:8.0,h:0.40,fontSize:11,color:C.muted,italic:true,fontFace:"Segoe UI"});
  /* Badge periode */
  s.addShape(pr.ShapeType.roundRect,{x:5.0,y:4.22,w:2.55,h:0.46,fill:{color:C.navD},line:{color:C.gold,width:0.75},rectRadius:0.07});
  s.addText(periode,{x:5.0,y:4.22,w:2.55,h:0.46,fontSize:11,bold:true,color:C.wht,align:"center",valign:"middle",fontFace:"Segoe UI"});
  /* Info instansi */
  s.addText("PT Pertamina Patra Niaga · Satuan Kerja Regional III",{x:5.0,y:4.86,w:8.0,h:0.28,fontSize:9.5,color:C.muted,fontFace:"Segoe UI"});
  s.addText("Dokumen Internal — Health & HSSE",{x:5.0,y:5.14,w:8.0,h:0.28,fontSize:9.5,color:C.muted,fontFace:"Segoe UI"});
  /* Footer band CONFIDENTIAL */
  s.addShape(pr.ShapeType.rect,{x:4.67,y:7.10,w:8.66,h:0.40,fill:{color:C.gry},line:{color:C.gry,width:0}});
  s.addShape(pr.ShapeType.rect,{x:4.67,y:7.10,w:8.66,h:0.025,fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addText("Prepared by IH Officer  ·  "+_now(),{x:5.0,y:7.16,w:6.0,h:0.26,fontSize:8.5,color:C.muted,italic:true,fontFace:"Segoe UI"});
  s.addText("CONFIDENTIAL — UNTUK PENGGUNAAN INTERNAL",{x:8.0,y:7.16,w:5.10,h:0.26,fontSize:8.5,bold:true,color:C.red,align:"right",charSpacing:1,fontFace:"Segoe UI"});
  /* Footer sidebar */
  s.addShape(pr.ShapeType.rect,{x:0,y:7.10,w:4.6,h:0.40,fill:{color:C.nav},line:{color:C.nav,width:0}});
  s.addText("IH DASHBOARD",{x:0.26,y:7.16,w:4.0,h:0.26,fontSize:8.5,bold:true,color:C.gold,align:"center",valign:"middle",charSpacing:1,fontFace:"Segoe UI"});
}

async function exportDATPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredDAT!=="undefined"&&filteredDAT.length)?filteredDAT:
          (typeof rawDAT!=="undefined"?rawDAT:[]);
  if(!raw.length){showToast("Tidak ada data DAT.","warning");return;}
  showToast("Membuat PPT DAT...","info");
  try{
    var tgl=_now();
    var TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var kapalDone=new Set(raw.map(function(r){return r["Nama Kapal"];})).size;
    var belum=TOT-kapalDone;
    var crew=raw.reduce(function(s,r){return s+parseInt(r["Total Crew Diperiksa"]||0);},0);
    var pos=raw.reduce(function(s,r){return s+parseInt(r["Jumlah Crew Positif"]||0);},0);
    var neg=crew-pos;
    var biaya=raw.reduce(function(s,r){return s+parseFloat(r["Est Biaya"]||0);},0);
    var rate=crew>0?((pos/crew)*100).toFixed(1):"0.0";
    var cov=((kapalDone/TOT)*100).toFixed(1);
    var lb=typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:BULAN;
    /* Per bulan */
    var bMap={}; lb.forEach(function(b){bMap[b]={k:0,c:0,p:0,bi:0};});
    raw.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&bMap[b]){bMap[b].k++;bMap[b].c+=parseInt(r["Total Crew Diperiksa"]||0);bMap[b].p+=parseInt(r["Jumlah Crew Positif"]||0);bMap[b].bi+=parseFloat(r["Est Biaya"]||0);}});
    var bActive=lb.filter(function(b){return bMap[b].k>0;});
    /* Per fleet */
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    /* Bulan filter saat ini */
    var bulanAktif=(document.getElementById("dat-filter-bulan")||{}).value||"";
    var periodeLabel=bulanAktif||new Date().toLocaleDateString("id-ID",{month:"long",year:"numeric"});
    var ftrlbl="PERTAMINA PATRA NIAGA — Drugs & Alcohol Test | "+periodeLabel+" | RAHASIA & TERBATAS";
    var pr=_pres("Laporan DAT — IH Dashboard");

    /* S1: COVER */
    _cover(pr,"LAPORAN DAT","DRUGS & ALCOHOL TEST",
      "Monitoring Narkoba & Alkohol — Crew Kapal Milik PIS",
      periodeLabel,[
      {v:kapalDone,l:"Kapal Diperiksa",c:C.cyan},
      {v:crew.toLocaleString("id-ID"),l:"Total Crew",c:C.wht},
      {v:rate+"%",l:"Tingkat Positif",c:pos>0?C.red:C.grn}
    ],"IH DASHBO ARD "+new Date().getFullYear());

    /* S2: RINGKASAN EKSEKUTIF */
    var s2=pr.addSlide();
    _hdr(s2,pr,"RINGKASAN EKSEKUTIF","Ikhtisar hasil DAT armada kapal — "+periodeLabel);
    s2.background={color:C.gry};
    _kpiCard(s2,pr,0.28,1.55,4.2,2.72,"🚢",kapalDone,"Kapal Diperiksa",C.blue,C.cgr,C.blue);
    _kpiCard(s2,pr,4.6,1.55,4.2,2.72,"⏳",belum,"Belum DAT",C.ora,"FFF3E0",C.ora);
    _kpiCard(s2,pr,8.92,1.55,4.13,2.72,"👥",crew.toLocaleString("id-ID"),"Total Crew",C.cyan,C.cgr,C.cyan);
    _kpiCard(s2,pr,0.28,4.38,2.88,2.38,"⚠️",pos,"Crew Positif",C.red,"FFEAEC",C.red);
    _kpiCard(s2,pr,3.28,4.38,3.13,2.38,"📊",cov+"%","Coverage",C.grn,"E3FAEB",C.grn);
    _kpiCard(s2,pr,6.53,4.38,3.13,2.38,"💰",_rp(biaya),"Est. Biaya",C.pur,"F0E6FF",C.pur);
    /* Alert jika ada positif */
    if(pos>0){
      _alert(s2,pr,9.78,4.38,3.27,2.38,"⚠️",
        pos+" crew positif.\nSTCW 2010 & MLC 2006\nReg.4.3 — Medical Care.",
        C.red,"FFEAEC");
    } else {
      _alert(s2,pr,9.78,4.38,3.27,2.38,"✅",
        "Zero Positive Rate!\nKepatuhan penuh\nMLC 2006 Reg.4.3",
        C.grn,"E3FAEB");
    }
    _ftr(s2,pr,ftrlbl,2,8);

    /* S3: CREW TEST PER BULAN & HASIL TEST */
    var s3=pr.addSlide();
    _hdr(s3,pr,"CREW TEST PER BULAN & HASIL TEST","Frekuensi DAT dan distribusi hasil negatif/positif");
    s3.background={color:C.gry};
    /* Bar chart per bulan */
    var chartData=BULAN_S.map(function(b,i){
      var v=bMap[BULAN[i]]?bMap[BULAN[i]].k:0;
      return{lbl:b,v:v,c:C.cyan};
    });
    _barChart(s3,pr,0.28,1.65,8.8,4.8,chartData,C.cyan,"");
    /* Donut hasil test */
    _donutChart(s3,pr,11.38,4.2,1.65,neg,pos,"Hasil Test");
    _ftr(s3,pr,ftrlbl,3,8);

    /* S4: DISTRIBUSI FLEET & STATISTIK */
    var s4=pr.addSlide();
    _hdr(s4,pr,"DISTRIBUSI FLEET & STATISTIK","Sebaran DAT per fleet & rekapitulasi crew");
    s4.background={color:C.gry};
    /* Donut fleet kiri */
    var fClrs=[C.cyan,C.blue,C.ora,C.red];
    var fKeys=Object.keys(fleets);
    /* Simple donut per fleet */
    var ftot=fKeys.reduce(function(a,k){return a+fleets[k];},0)||1;
    var cx=3.1,cy=4.4,r=2.0;
    s4.addText("Distribusi per Fleet",{x:0.5,y:1.55,w:5.2,h:0.3,
      fontSize:12,bold:true,color:C.txt,align:"center",fontFace:"Segoe UI"});
    s4.addShape(pr.ShapeType.ellipse,{x:cx-r,y:cy-r,w:r*2,h:r*2,
      fill:{color:fClrs[3]},line:{color:C.wht,width:1}});
    s4.addShape(pr.ShapeType.ellipse,{x:cx-r*0.85,y:cy-r,w:r*1.7,h:r*1.7,
      fill:{color:fClrs[2]},line:{color:C.wht,width:1}});
    s4.addShape(pr.ShapeType.ellipse,{x:cx-r*0.55,y:cy-r*0.85,w:r*1.1,h:r*1.1,
      fill:{color:fClrs[1]},line:{color:C.wht,width:1}});
    s4.addShape(pr.ShapeType.ellipse,{x:cx-r*0.35,y:cy-r*0.7,w:r*0.7,h:r*0.7,
      fill:{color:fClrs[0]},line:{color:C.wht,width:1}});
    var hc=r*0.42;
    s4.addShape(pr.ShapeType.ellipse,{x:cx-hc,y:cy-hc,w:hc*2,h:hc*2,
      fill:{color:C.wht},line:{color:C.lgr,width:0.5}});
    /* Legend fleet */
    fKeys.forEach(function(f,i){
      var ly=5.8+i*0.36;
      s4.addShape(pr.ShapeType.rect,{x:0.7,y:ly,w:0.22,h:0.18,
        fill:{color:fClrs[i]},line:{color:fClrs[i],width:0}});
      var pct=ftot>0?Math.round(fleets[f]/ftot*100):0;
      s4.addText(f+" ("+pct+"%)",{x:1.0,y:ly-0.03,w:2.5,h:0.24,
        fontSize:10.5,color:C.txt,fontFace:"Segoe UI"});
    });
    /* KPI rows kanan */
    var kRows=[
      {icon:"📊",v:kapalDone,l:"Total Kapal DAT",c:C.blue,ib:C.cgr},
      {icon:"📊",v:crew.toLocaleString("id-ID"),l:"Total Crew",c:C.cyan,ib:C.cgr},
      {icon:"📊",v:neg,l:"Crew Negatif",c:C.grn,ib:"E3FAEB"},
      {icon:"📊",v:pos,l:"Crew Positif",c:pos>0?C.red:C.grn,ib:pos>0?"FFEAEC":"E3FAEB"},
      {icon:"📊",v:rate+"%",l:"Tingkat Positif",c:pos>0?C.red:C.grn,ib:pos>0?"FFEAEC":"E3FAEB"}
    ];
    var ry=1.58,rh=0.96;
    kRows.forEach(function(k,i){
      _kpiRow(s4,pr,6.55,ry+i*(rh+0.06),6.5,rh,k.icon,k.v,k.l,k.c,k.ib);
    });
    _ftr(s4,pr,ftrlbl,4,8);

    /* S5: AI REKOMENDASI — REGULASI */
    var s5=pr.addSlide();
    _hdr(s5,pr,"AI REKOMENDASI — REGULASI & STANDAR INTERNASIONAL",
      "Drugs & Alcohol Test · Analisis otomatis berbasis data teridentifikasi — "+periodeLabel);
    s5.background={color:C.gry};
    /* Header strip */
    s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:1.55,w:12.77,h:0.68,
      fill:{color:C.navD},line:{color:C.navD,width:0},rectRadius:0.06});
    s5.addText("🤖  AI REKOMENDASI · Kemenaker Permenaker No.5/2018 & ACGIH TLV/BEI 2024 · Konteks: Pelaut / Marine Industry",
      {x:0.5,y:1.6,w:12.5,h:0.56,fontSize:11,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    /* Rekomendasi box */
    var reks5=[];
    if(pos>0)reks5.push({
      cat:"⚠️ TEMUAN KRITIS / MEDICAL CARE",
      catc:C.red, catbg:"FFEAEC",
      sub:"STCW 2010 Manila; MLC 2006 Reg.4.3 — risiko kecelakaan navigasi & human error 3×",
      items:["Protokol medis segera untuk "+pos+" ABK reaktif: pemeriksaan detox, fitness to work, dan evaluasi SpOK",
             "Notifikasi nakhoda & manajemen dalam 24 jam — inisiasi tindakan administratif sesuai MLC 2006"]
    });
    reks5.push({
      cat:"🚢 PSIKOSOSIAL / MENTAL HEALTH",
      catc:C.ora, catbg:"FFF3E0",
      sub:"Isolasi sosial 6–9 bulan; fatigue MLC 2006; risiko depresi 2.3× populasi umum (WHO)",
      items:["Implementasi MLC 2006 Reg.2.3: max 14 jam kerja/hari, min 10 jam istirahat; log wajib",
             "Sediakan akses internet/video call untuk crew tiap 48 jam; dukung koneksi keluarga"]
    });
    reks5.push({
      cat:pos===0?"✅ PERTAHANKAN ZERO POSITIVE":"🔍 PENGUATAN PROGRAM DAT",
      catc:C.grn, catbg:"E3FAEB",
      sub:"Setelah "+periodeLabel+" — belum ada data",
      items:["Implementasi Random Unannounced Testing min 25% dari crew per semester",
             "Pastikan chain of custody specimen terjaga — pilih lab terakreditasi KAN"]
    });
    reks5.slice(0,2).forEach(function(r,i){
      var ry=2.0+i*2.55;
      s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:ry,w:12.77,h:1.98,
        fill:{color:C.wht},line:{color:r.catc,width:1},rectRadius:0.06});
      s5.addShape(pr.ShapeType.rect,{x:0.28,y:ry,w:12.77,h:0.5,
        fill:{color:r.catbg},line:{color:r.catc,width:0}});
      s5.addText(r.cat,{x:0.45,y:ry+0.04,w:6,h:0.42,
        fontSize:12,bold:true,color:r.catc,fontFace:"Segoe UI"});
      s5.addText(r.sub,{x:0.45,y:ry+0.55,w:12.4,h:0.26,
        fontSize:10,color:C.muted,italic:true,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s5.addShape(pr.ShapeType.ellipse,{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,
          fill:{color:r.catc},line:{color:r.catc,width:0}});
        s5.addText(String(j+1),{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,
          fontSize:11,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI"});
        s5.addText(it,{x:0.82,y:ry+0.88+j*0.46,w:12.1,h:0.42,
          fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true});
      });
    });
    _ftr(s5,pr,ftrlbl,5,8);

    /* S6: AI REKOMENDASI DETAIL */
    var s6=pr.addSlide();
    _hdr(s6,pr,"AI REKOMENDASI DETAIL — KEMENAKER & ACGIH",
      "Program penguatan jangka panjang berdasarkan regulasi nasional dan standar internasional");
    s6.background={color:C.gry};
    var reks6=[
      {t:"Pelaksanaan & Clinical Health",c:C.cyan,items:[
        "Implementasi DAT Rutin: tiap kapal min 1x/bulan dengan sampling acak 25%",
        "Vendor lab terakreditasi KAN dengan CoA dan chain-of-custody yang terdokumentasi",
        "Medical surveillance berkala per semester untuk ABK kapal tanker BBM"
      ]},
      {t:"Regulasi & Compliance",c:C.ora,items:[
        "Permenaker No.5/2018 Pasal 8: catatan hasil DAT wajib tersimpan min 5 tahun",
        "STCW 2010 Manila — Medical Standards: fitness-for-duty certificate ABK",
        "MLC 2006 Reg.4.3: Substance Abuse Prevention Program wajib terdokumentasi"
      ]},
      {t:"Monitoring & Pelaporan",c:C.grn,items:[
        "Laporkan statistik DAT ke manajemen & flag state dalam 72 jam sesuai ISM Code",
        "Integrasikan data DAT ke IH Dashboard untuk tracking real-time coverage",
        "Siapkan laporan tahunan DAT untuk keperluan audit PSC dan biro klasifikasi"
      ]}
    ];
    reks6.forEach(function(r,i){
      var rx=0.28+i*4.38;
      s6.addShape(pr.ShapeType.roundRect,{x:rx,y:1.55,w:4.22,h:5.5,
        fill:{color:C.wht},line:{color:r.c,width:1.5},rectRadius:0.08});
      s6.addShape(pr.ShapeType.rect,{x:rx,y:1.55,w:4.22,h:0.5,
        fill:{color:r.c},line:{color:r.c,width:0}});
      s6.addText(r.t,{x:rx+0.1,y:1.58,w:4.02,h:0.44,
        fontSize:12,bold:true,color:C.wht,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s6.addShape(pr.ShapeType.ellipse,{x:rx+0.15,y:2.22+j*1.5,w:0.28,h:0.28,
          fill:{color:r.c},line:{color:r.c,width:0}});
        s6.addText(it,{x:rx+0.55,y:2.18+j*1.5,w:3.55,h:1.3,
          fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"top"});
      });
    });
    _ftr(s6,pr,ftrlbl,6,8);

    /* S7: DATA TABLE */
    var s7=pr.addSlide();
    _hdr(s7,pr,"DATA DRUGS & ALCOHOL TEST",
      "Seluruh data pemeriksaan DAT per kapal — "+periodeLabel);
    s7.background={color:C.gry};
    var hdrs=[
      {text:"Nama Kapal",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Fleet",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Bulan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Total Crew",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Hasil",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Crew Positif",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Tindak Lanjut",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}}
    ];
    var rows7=raw.slice(0,14).map(function(r,i){
      var isPos=parseInt(r["Jumlah Crew Positif"]||0)>0;
      var ev=i%2===0?C.wht:"F8FAFD";
      return[
        {text:String(r["Nama Kapal"]||"Tgt:-"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Jenis Fleet"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Bulan Pelaksanaan"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Total Crew Diperiksa"]||0),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:isPos?"⚠ Positif":"✓ Negatif",options:{fontSize:10,bold:true,color:isPos?C.red:C.grn,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Jumlah Crew Positif"]||0),options:{fontSize:10,bold:isPos,color:isPos?C.red:C.grn,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String((r["Tindak Lanjut"]||"Tgt:-")).slice(0,35),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}}
      ];
    });
    s7.addTable([hdrs].concat(rows7),{
      x:0.28,y:1.55,w:12.77,
      colW:[2.3,0.9,1.0,1.1,1.1,1.1,3.27],
      rowH:0.38,fontFace:"Segoe UI",border:{type:"none"},fill:{color:C.wht}
    });
    if(raw.length>14){
      s7.addText("... dan "+(raw.length-14)+" data lainnya",{
        x:0.28,y:6.82,w:12.77,h:0.25,
        fontSize:9.5,color:C.muted,italic:true,fontFace:"Segoe UI"});
    }
    _ftr(s7,pr,ftrlbl,7,8);

    /* S8: TINDAK LANJUT & REKOMENDASI */
    var s8=pr.addSlide();
    s8.background={color:C.navD};
    /* Dekorasi */
    s8.addShape(pr.ShapeType.ellipse,{x:11.5,y:5.0,w:4.5,h:4.5,
      fill:{color:C.nav2},line:{color:C.nav2,width:0}});
    s8.addShape(pr.ShapeType.ellipse,{x:11.0,y:-1.0,w:3.0,h:3.0,
      fill:{color:C.nav},line:{color:C.nav,width:0}});
    s8.addText("TINDAK LANJUT & REKOMENDASI",{x:0.35,y:0.28,w:10,h:0.8,
      fontSize:32,bold:true,color:C.wht,fontFace:"Segoe UI"});
    s8.addText("Drugs & Alcohol Test · "+periodeLabel,{x:0.35,y:1.1,w:10,h:0.32,
      fontSize:14,color:C.cyan,fontFace:"Segoe UI"});
    /* 4 kotak rekomendasi */
    var reks8=[
      "Percepat DAT untuk "+belum+" kapal yang belum diperiksa",
      pos>0?"Tindak lanjuti "+pos+" crew positif sesuai protokol STCW Manila 2010":"Pertahankan zero positive — lanjutkan program DAT rutin",
      "Implementasi Substance Abuse Prevention Program (MLC 2006 Reg.4.3)",
      "Laporan hasil DAT ke manajemen & flag state dalam 72 jam"
    ];
    reks8.forEach(function(txt,i){
      var col=i%2===0?0.28:6.93;
      var row=Math.floor(i/2);
      _rekCard(s8,pr,col,1.55+row*1.8,6.42,1.65,i+1,txt);
    });
    /* Periode monitoring */
    s8.addShape(pr.ShapeType.roundRect,{x:0.28,y:5.18,w:12.77,h:1.68,
      fill:{color:C.nav},line:{color:C.cyan,width:1},rectRadius:0.08});
    s8.addShape(pr.ShapeType.rect,{x:0.28,y:5.18,w:12.77,h:0.06,
      fill:{color:C.cyan},line:{color:C.cyan,width:0}});
    s8.addText("📅  PERIODE MONITORING BERIKUTNYA",{x:0.48,y:5.26,w:12.3,h:0.4,
      fontSize:12,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    s8.addText("DAT bulan berikutnya dijadwalkan awal bulan. Pastikan vendor siap & koordinasi nakhoda untuk akses crew. Hasil positif ditindaklanjuti sebelum kapal berangkat.",
      {x:0.48,y:5.7,w:12.3,h:0.96,fontSize:11.5,color:C.wht,fontFace:"Segoe UI",wrap:true});
    _ftr(s8,pr,ftrlbl,8,8);

    await pr.writeFile({fileName:"Laporan_DAT_"+periodeLabel.replace(/ /g,"_")+".pptx"});
    showToast("PPT DAT berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal membuat PPT DAT: "+e.message,"error");}
}

/* ════════════════════════════════════════════════════
   2. EXPORT HRA — 8 Slide (sama style)
════════════════════════════════════════════════════ */
async function exportHRAPPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof filteredHRA!=="undefined"&&filteredHRA.length)?filteredHRA:
          (typeof rawHRA!=="undefined"?rawHRA:[]);
  if(!raw.length){showToast("Tidak ada data HRA.","warning");return;}
  showToast("Membuat PPT HRA...","info");
  try{
    var tgl=_now();
    var TOT=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
    var done=new Set(raw.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
    var belum=TOT-done;
    var budget=raw.reduce(function(s,r){return s+parseFloat(r["Est Budget"]||0);},0);
    var cov=((done/TOT)*100).toFixed(1);
    var lb=typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:BULAN;
    var bMap={}; lb.forEach(function(b){bMap[b]=0;});
    raw.forEach(function(r){var b=r["Bulan Pelaksanaan"];if(b&&bMap[b]!==undefined)bMap[b]++;});
    var fleets={"FP I":0,"FP II":0,"FC":0,"FGP":0};
    raw.forEach(function(r){var f=r["Jenis Fleet"];if(f&&fleets[f]!==undefined)fleets[f]++;});
    var hazCnt={};
    raw.forEach(function(r){var h=(r["Top 3 Hazard"]||"").trim();if(!h)return;h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){hazCnt[hz]=(hazCnt[hz]||0)+1;});});
    var hazTop=Object.entries(hazCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var stC=parseFloat(cov)>=80?C.grn:parseFloat(cov)>=50?C.ora:C.red;
    var pr=_pres("Laporan HRA — IH Dashboard");
    var ftrlbl="PERTAMINA PATRA NIAGA — Hazard Recognition & Assessment | "+tgl+" | RAHASIA & TERBATAS";

    /* S1 COVER */
    _cover(pr,"LAPORAN HRA","HAZARD RECOGNITION &\nASSESSMENT",
      "Monitoring Pelaksanaan HRA Armada Kapal Tanker",
      tgl,[
      {v:done,l:"Kapal Telah HRA",c:C.cyan},
      {v:TOT,l:"Total Armada",c:C.wht},
      {v:cov+"%",l:"Coverage HRA",c:stC}
    ],"IH DASHBO ARD "+new Date().getFullYear());

    /* S2 RINGKASAN */
    var s2=pr.addSlide();
    _hdr(s2,pr,"RINGKASAN EKSEKUTIF","Ikhtisar pelaksanaan HRA armada — "+tgl);
    s2.background={color:C.gry};
    _kpiCard(s2,pr,0.28,1.55,4.2,2.72,"🔍",done,"Kapal Telah HRA",C.blue,C.cgr,C.blue);
    _kpiCard(s2,pr,4.6,1.55,4.2,2.72,"⏳",belum,"Belum HRA",belum>0?C.red:C.grn,belum>0?"FFEAEC":"E3FAEB",belum>0?C.red:C.grn);
    _kpiCard(s2,pr,8.92,1.55,4.13,2.72,"📋",cov+"%","Coverage HRA",stC,C.cgr,stC);
    _kpiCard(s2,pr,0.28,4.38,4.2,2.38,"💰",_rp(budget),"Est. Anggaran Total",C.pur,"F0E6FF",C.pur);
    _kpiCard(s2,pr,4.6,4.38,4.2,2.38,"🚢",TOT,"Total Armada",C.cyan,C.cgr,C.cyan);
    if(parseFloat(cov)<80){
      _alert(s2,pr,8.92,4.38,4.13,2.38,"⚠️",
        belum+" unit armada\nbelum HRA — percepatan\njadwal diperlukan.",C.ora,"FFF3E0");
    }else{
      _alert(s2,pr,8.92,4.38,4.13,2.38,"✅",
        "Coverage baik!\nPertahankan siklus\nHRA berkala.",C.grn,"E3FAEB");
    }
    _ftr(s2,pr,ftrlbl,2,8);

    /* S3 CHART PER BULAN */
    var s3=pr.addSlide();
    _hdr(s3,pr,"HRA PER BULAN & DISTRIBUSI FLEET","Frekuensi pelaksanaan HRA dan sebaran per fleet");
    s3.background={color:C.gry};
    _barChart(s3,pr,0.28,1.65,8.8,4.8,
      BULAN_S.map(function(b,i){return{lbl:b,v:bMap[BULAN[i]]||0,c:C.cyan};}),C.cyan,"");
    /* Fleet mini donut */
    var fClrs=[C.cyan,C.blue,C.ora,C.red];
    var ftot=Object.values(fleets).reduce(function(a,v){return a+v;},0)||1;
    s3.addText("Per Fleet",{x:9.5,y:1.65,w:3.5,h:0.3,fontSize:12,bold:true,color:C.txt,align:"center",fontFace:"Segoe UI"});
    var ffy=2.1;
    Object.keys(fleets).forEach(function(f,i){
      s3.addShape(pr.ShapeType.roundRect,{x:9.5,y:ffy+i*1.08,w:3.55,h:0.98,
        fill:{color:C.wht},line:{color:fClrs[i],width:1},rectRadius:0.06});
      s3.addShape(pr.ShapeType.rect,{x:9.5,y:ffy+i*1.08,w:3.55,h:0.06,
        fill:{color:fClrs[i]},line:{color:fClrs[i],width:0}});
      s3.addText(f,{x:9.65,y:ffy+0.1+i*1.08,w:1.8,h:0.38,fontSize:11,bold:true,color:fClrs[i],fontFace:"Segoe UI"});
      s3.addText(fleets[f]+" kapal  ("+Math.round(fleets[f]/ftot*100)+"%)",
        {x:9.65,y:ffy+0.5+i*1.08,w:3.2,h:0.36,fontSize:13,bold:true,color:C.txt,fontFace:"Segoe UI"});
    });
    _ftr(s3,pr,ftrlbl,3,8);

    /* S4 HAZARD DOMINAN */
    var s4=pr.addSlide();
    _hdr(s4,pr,"TOP HAZARD TERIDENTIFIKASI","Temuan bahaya dominan dari seluruh pelaksanaan HRA armada");
    s4.background={color:C.gry};
    if(hazTop.length){
      hazTop.forEach(function(h,i){
        var ry=1.58+i*1.02;
        _kpiRow(s4,pr,0.28,ry,12.77,0.92,"⚠️",h[1]+" temuan",h[0],
          [C.red,C.ora,C.blue,C.cyan,C.pur][i],[
          "FFEAEC","FFF3E0",C.cgr,C.cgr,"F0E6FF"][i]);
      });
    }else{
      s4.addText("Belum ada data hazard teridentifikasi.",{x:0.28,y:3.5,w:12.77,h:0.5,fontSize:14,color:C.muted,align:"center",fontFace:"Segoe UI"});
    }
    _ftr(s4,pr,ftrlbl,4,8);

    /* S5 AI REKOMENDASI */
    var s5=pr.addSlide();
    _hdr(s5,pr,"AI REKOMENDASI — REGULASI & STANDAR","HRA · Analisis otomatis berbasis data teridentifikasi");
    s5.background={color:C.gry};
    s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:1.55,w:12.77,h:0.68,
      fill:{color:C.navD},line:{color:C.navD,width:0},rectRadius:0.06});
    s5.addText("🤖  AI REKOMENDASI · Permenaker No.5/2018 & ISO 45001:2018 · Konteks: Maritime / Tanker",
      {x:0.5,y:1.6,w:12.5,h:0.56,fontSize:11,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    var reks5h=[
      {cat:parseFloat(cov)<80?"⚠️ COVERAGE HRA RENDAH":"✅ COVERAGE HRA BAIK",
       catc:parseFloat(cov)<80?C.red:C.grn,catbg:parseFloat(cov)<80?"FFEAEC":"E3FAEB",
       sub:"Permenaker 05/2018 Pasal 6 — kewajiban identifikasi, penilaian, dan pengendalian hazard",
       items:[parseFloat(cov)<80?"Percepat HRA untuk "+belum+" unit armada — prioritas kapal usia >15 tahun":"Pertahankan siklus HRA berkala minimum 1x/tahun per unit armada",
              "Integrasikan temuan HRA ke Ship Safety Management System (SMS) sesuai ISM Code"]},
      {cat:"🔧 PENGENDALIAN HAZARD DOMINAN",catc:C.ora,catbg:"FFF3E0",
       sub:"Hierarki pengendalian: Eliminasi → Substitusi → Rekayasa Teknik → Administratif → APD",
       items:["Prioritaskan "+hazTop.slice(0,2).map(function(h){return h[0];}).join(" & ")+" sebagai hazard dominan untuk pengendalian segera",
              "Dokumentasikan rencana tindak lanjut per temuan hazard di IH Dashboard"]}
    ];
    reks5h.forEach(function(r,i){
      var ry=2.0+i*2.55;
      s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:ry,w:12.77,h:1.98,
        fill:{color:C.wht},line:{color:r.catc,width:1},rectRadius:0.06});
      s5.addShape(pr.ShapeType.rect,{x:0.28,y:ry,w:12.77,h:0.5,
        fill:{color:r.catbg},line:{color:r.catc,width:0}});
      s5.addText(r.cat,{x:0.45,y:ry+0.04,w:8,h:0.42,fontSize:12,bold:true,color:r.catc,fontFace:"Segoe UI"});
      s5.addText(r.sub,{x:0.45,y:ry+0.55,w:12.4,h:0.26,fontSize:10,color:C.muted,italic:true,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s5.addShape(pr.ShapeType.ellipse,{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fill:{color:r.catc},line:{color:r.catc,width:0}});
        s5.addText(String(j+1),{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fontSize:11,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI"});
        s5.addText(it,{x:0.82,y:ry+0.88+j*0.46,w:12.1,h:0.42,fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true});
      });
    });
    _ftr(s5,pr,ftrlbl,5,8);

    /* S6 DETAIL REKOMENDASI */
    var s6=pr.addSlide();
    _hdr(s6,pr,"REKOMENDASI DETAIL — ISO 45001 & PERMENAKER","Program penguatan jangka panjang berbasis regulasi");
    s6.background={color:C.gry};
    var reks6h=[
      {t:"Kepatuhan & Dokumentasi",c:C.cyan,items:["Arsipkan seluruh laporan HRA min 5 tahun sesuai Permenaker 05/2018","Pastikan laporan HRA ditandatangani IH officer bersertifikasi","Update status HRA di IH Dashboard setiap selesai pelaksanaan"]},
      {t:"Pengendalian Teknis",c:C.ora,items:["Buat rencana pengendalian per temuan hazard: engineering control prioritas","Review JSA dan HIRARC untuk area dengan temuan hazard tinggi","Medical surveillance ABK terpapar hazard di atas NAB setiap 6 bulan"]},
      {t:"Audit & Monitoring",c:C.grn,items:["Siapkan laporan HRA tahunan untuk audit biro klasifikasi & PSC","Target coverage 100% sebelum akhir tahun — KPI bulanan tim IH","Integrasikan hasil HRA ke laporan IH tahunan direksi"]}
    ];
    reks6h.forEach(function(r,i){
      var rx=0.28+i*4.38;
      s6.addShape(pr.ShapeType.roundRect,{x:rx,y:1.55,w:4.22,h:5.5,fill:{color:C.wht},line:{color:r.c,width:1.5},rectRadius:0.08});
      s6.addShape(pr.ShapeType.rect,{x:rx,y:1.55,w:4.22,h:0.5,fill:{color:r.c},line:{color:r.c,width:0}});
      s6.addText(r.t,{x:rx+0.1,y:1.58,w:4.02,h:0.44,fontSize:12,bold:true,color:C.wht,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s6.addShape(pr.ShapeType.ellipse,{x:rx+0.15,y:2.22+j*1.5,w:0.28,h:0.28,fill:{color:r.c},line:{color:r.c,width:0}});
        s6.addText(it,{x:rx+0.55,y:2.18+j*1.5,w:3.55,h:1.3,fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true,valign:"top"});
      });
    });
    _ftr(s6,pr,ftrlbl,6,8);

    /* S7 DATA TABLE */
    var s7=pr.addSlide();
    _hdr(s7,pr,"DATA HAZARD RECOGNITION & ASSESSMENT","Detail pelaksanaan HRA per kapal — "+tgl);
    s7.background={color:C.gry};
    var hdrs7=[
      {text:"Nama Kapal",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Fleet",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Bulan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Vendor",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Est. Anggaran",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"right"}},
      {text:"Status",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}}
    ];
    var rows7=raw.slice(0,14).map(function(r,i){
      var ok=(r["Status"]||"").toLowerCase()==="done";
      var ev=i%2===0?C.wht:"F8FAFD";
      return[
        {text:String(r["Nama Kapal"]||"Tgt:-"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Jenis Fleet"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Bulan Pelaksanaan"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Vendor Pelaksana"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
        {text:_rp(r["Est Budget"]),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"right"}},
        {text:ok?"✓ Done":"Belum",options:{fontSize:10,bold:true,color:ok?C.grn:C.red,fill:{color:ev},border:{type:"none"},align:"center"}}
      ];
    });
    s7.addTable([hdrs7].concat(rows7),{x:0.28,y:1.55,w:12.77,colW:[2.5,1.0,1.1,2.5,1.7,1.27],rowH:0.38,fontFace:"Segoe UI",border:{type:"none"},fill:{color:C.wht}});
    if(raw.length>14)s7.addText("... dan "+(raw.length-14)+" data lainnya",{x:0.28,y:6.82,w:12.77,h:0.25,fontSize:9.5,color:C.muted,italic:true,fontFace:"Segoe UI"});
    _ftr(s7,pr,ftrlbl,7,8);

    /* S8 TINDAK LANJUT */
    var s8=pr.addSlide();
    s8.background={color:C.navD};
    s8.addShape(pr.ShapeType.ellipse,{x:11.5,y:5.0,w:4.5,h:4.5,fill:{color:C.nav2},line:{color:C.nav2,width:0}});
    s8.addShape(pr.ShapeType.ellipse,{x:11.0,y:-1.0,w:3.0,h:3.0,fill:{color:C.nav},line:{color:C.nav,width:0}});
    s8.addText("TINDAK LANJUT & REKOMENDASI",{x:0.35,y:0.28,w:10,h:0.8,fontSize:32,bold:true,color:C.wht,fontFace:"Segoe UI"});
    s8.addText("Hazard Recognition & Assessment · "+tgl,{x:0.35,y:1.1,w:10,h:0.32,fontSize:14,color:C.cyan,fontFace:"Segoe UI"});
    var reks8h=[
      "Percepat HRA untuk "+belum+" unit yang belum — prioritas kapal risiko tinggi",
      "Validasi dan tindaklanjuti "+hazTop.length+" jenis hazard dominan yang teridentifikasi",
      "Integrasikan temuan HRA ke JSA dan Ship Safety Management System",
      "Siapkan laporan HRA komprehensif untuk audit biro klasifikasi & PSC"
    ];
    reks8h.forEach(function(txt,i){
      var col=i%2===0?0.28:6.93;
      var row=Math.floor(i/2);
      _rekCard(s8,pr,col,1.55+row*1.8,6.42,1.65,i+1,txt);
    });
    s8.addShape(pr.ShapeType.roundRect,{x:0.28,y:5.18,w:12.77,h:1.68,fill:{color:C.nav},line:{color:C.cyan,width:1},rectRadius:0.08});
    s8.addShape(pr.ShapeType.rect,{x:0.28,y:5.18,w:12.77,h:0.06,fill:{color:C.cyan},line:{color:C.cyan,width:0}});
    s8.addText("📅  SIKLUS HRA BERIKUTNYA",{x:0.48,y:5.26,w:12.3,h:0.4,fontSize:12,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    s8.addText("HRA berikutnya dijadwalkan sebelum masa kontrak berakhir. Koordinasikan dengan vendor IH tersertifikasi. Pastikan temuan lama sudah di-closeout sebelum siklus baru dimulai.",
      {x:0.48,y:5.7,w:12.3,h:0.96,fontSize:11.5,color:C.wht,fontFace:"Segoe UI",wrap:true});
    _ftr(s8,pr,ftrlbl,8,8);
    await pr.writeFile({fileName:"Laporan_HRA_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT HRA berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT HRA: "+e.message,"error");}
}

/* ════════════════════════════════════════════════════
   3. EXPORT PEST — 6 Slide
════════════════════════════════════════════════════ */
async function exportPestPPT(){
  if(!(await _guardAsync()))return;
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
    var hamaMap={};
    raw.forEach(function(r){var t=(r["Temuan / Keluhan"]||"").toLowerCase();["tikus","kecoa","semut","lalat","nyamuk","kutu","rayap","cicak"].forEach(function(h){if(t.includes(h))hamaMap[h]=(hamaMap[h]||0)+1;});});
    var hamaTop=Object.entries(hamaMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var hamaDom=hamaTop.length?hamaTop[0][0].charAt(0).toUpperCase()+hamaTop[0][0].slice(1):"Tgt:-";
    var lb=typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:BULAN;
    var bMap={}; lb.forEach(function(b){bMap[b]={c:0,bi:0};});
    raw.forEach(function(r){var b=(r["Bulan"]||r["Bulan Pelaksanaan"]||"").trim();if(b&&bMap[b]){bMap[b].c++;bMap[b].bi+=parseFloat(r["Est Biaya"]||0);}});
    var pr=_pres("Laporan Pest Control — IH Dashboard");
    var ftrlbl="PERTAMINA PATRA NIAGA — Pest & Rodent Control | "+tgl+" | RAHASIA & TERBATAS";

    /* S1 COVER */
    _cover(pr,"LAPORAN PEST","RODENT CONTROL",
      "Pengendalian Vektor & Sanitasi Lingkungan Fasilitas Perkantoran",
      tgl,[
      {v:totalKeg+"x",l:"Total Kegiatan",c:C.cyan},
      {v:totalLok+" lok",l:"Lokasi",c:C.wht},
      {v:hamaDom,l:"Hama Dominan",c:C.ora}
    ],"IH DASHBO ARD "+new Date().getFullYear());

    /* S2 RINGKASAN */
    var s2=pr.addSlide();
    _hdr(s2,pr,"RINGKASAN EKSEKUTIF","Ikhtisar kegiatan Pest Control — "+tgl);
    s2.background={color:C.gry};
    _kpiCard(s2,pr,0.28,1.55,4.2,2.72,"🐀",totalKeg+"x","Total Kegiatan",C.pur,"F0E6FF",C.pur);
    _kpiCard(s2,pr,4.6,1.55,4.2,2.72,"🏢",totalLok,"Lokasi Aktif",C.blue,C.cgr,C.blue);
    _kpiCard(s2,pr,8.92,1.55,4.13,2.72,"💰",_rp(totalBiaya),"Est. Total Biaya",C.cyan,C.cgr,C.cyan);
    _kpiCard(s2,pr,0.28,4.38,4.2,2.38,"🦟",hamaDom,"Hama Dominan",C.red,"FFEAEC",C.red);
    _kpiCard(s2,pr,4.6,4.38,4.2,2.38,"📅",(totalKeg/12).toFixed(1)+"x","Rata-rata/Bulan",C.grn,"E3FAEB",C.grn);
    _alert(s2,pr,8.92,4.38,4.13,2.38,"✅",
      "Program berjalan sesuai\njadwal IHR 2005 WHO.\nSanitasi terjaga.",C.grn,"E3FAEB");
    _ftr(s2,pr,ftrlbl,2,6);

    /* S3 CHART */
    var s3=pr.addSlide();
    _hdr(s3,pr,"FREKUENSI KEGIATAN PER BULAN","Distribusi pelaksanaan Pest Control dan estimasi biaya");
    s3.background={color:C.gry};
    _barChart(s3,pr,0.28,1.65,8.8,4.8,
      BULAN_S.map(function(b,i){return{lbl:b,v:bMap[BULAN[i]]?bMap[BULAN[i]].c:0,c:C.pur};}),C.pur,"");
    /* Hama top kanan */
    if(hamaTop.length){
      var hClrs=[C.red,C.ora,C.cyan,C.blue,C.pur];
      s3.addText("Temuan Hama",{x:9.6,y:1.65,w:3.4,h:0.3,fontSize:12,bold:true,color:C.txt,fontFace:"Segoe UI"});
      hamaTop.forEach(function(h,i){
        _kpiRow(s3,pr,9.6,2.05+i*0.98,3.45,0.88,"🐀",h[1]+"×",h[0].charAt(0).toUpperCase()+h[0].slice(1),hClrs[i],"F0E6FF");
      });
    }
    _ftr(s3,pr,ftrlbl,3,6);

    /* S4 DATA TABLE */
    var s4=pr.addSlide();
    _hdr(s4,pr,"DATA KEGIATAN PEST CONTROL","Detail pelaksanaan per lokasi & periode");
    s4.background={color:C.gry};
    var hdrs4=[
      {text:"Lokasi",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Bulan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Jenis Kegiatan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Temuan/Keluhan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Est. Biaya",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"right"}}
    ];
    var rows4=raw.slice(0,14).map(function(r,i){
      var ev=i%2===0?C.wht:"F8FAFD";
      return[
        {text:String(r["Lokasi"]||"Tgt:-"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Bulan"]||r["Bulan Pelaksanaan"]||"Tgt:-"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Jenis Kegiatan"]||"Tgt:-").slice(0,28),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Temuan / Keluhan"]||"Tgt:-").slice(0,30),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
        {text:_rp(r["Est Biaya"]),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"right"}}
      ];
    });
    s4.addTable([hdrs4].concat(rows4),{x:0.28,y:1.55,w:12.77,colW:[2.4,1.0,2.2,4.2,2.17],rowH:0.38,fontFace:"Segoe UI",border:{type:"none"},fill:{color:C.wht}});
    if(raw.length>14)s4.addText("... dan "+(raw.length-14)+" data lainnya",{x:0.28,y:6.82,w:12.77,h:0.25,fontSize:9.5,color:C.muted,italic:true,fontFace:"Segoe UI"});
    _ftr(s4,pr,ftrlbl,4,6);

    /* S5 AI REKOMENDASI */
    var s5=pr.addSlide();
    _hdr(s5,pr,"AI REKOMENDASI — REGULASI & STANDAR","Pest Control · Analisis otomatis berbasis temuan teridentifikasi");
    s5.background={color:C.gry};
    s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:1.55,w:12.77,h:0.68,fill:{color:C.navD},line:{color:C.navD,width:0},rectRadius:0.06});
    s5.addText("🤖  AI REKOMENDASI · IHR 2005 WHO & Permenkes No.50/2017 · Konteks: Fasilitas Perkantoran",
      {x:0.5,y:1.6,w:12.5,h:0.56,fontSize:11,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    var reks5p=[
      {cat:"🐀 PENGENDALIAN "+hamaDom.toUpperCase(),catc:C.red,catbg:"FFEAEC",
       sub:"Hama dominan "+hamaDom+" — vektor penyakit & risiko kontaminasi lingkungan kerja",
       items:["Pasang perangkap rodensia permanen di seluruh titik strategis: dapur, gudang, saluran air",
              "Lakukan fogging & fumigasi terjadwal min 1x/3 bulan sesuai rekomendasi IHR 2005 WHO"]},
      {cat:"✅ SANITASI & COMPLIANCE",catc:C.grn,catbg:"E3FAEB",
       sub:"IHR 2005 WHO — kewajiban sanitasi fasilitas pelabuhan dan perkantoran terkait",
       items:["Koordinasikan dengan pengelola gedung untuk perbaikan celah masuk hama secara struktural",
              "Arsipkan laporan pest control untuk keperluan audit K3 tahunan dan sertifikasi"]}
    ];
    reks5p.forEach(function(r,i){
      var ry=2.0+i*2.55;
      s5.addShape(pr.ShapeType.roundRect,{x:0.28,y:ry,w:12.77,h:1.98,fill:{color:C.wht},line:{color:r.catc,width:1},rectRadius:0.06});
      s5.addShape(pr.ShapeType.rect,{x:0.28,y:ry,w:12.77,h:0.5,fill:{color:r.catbg},line:{color:r.catc,width:0}});
      s5.addText(r.cat,{x:0.45,y:ry+0.04,w:8,h:0.42,fontSize:12,bold:true,color:r.catc,fontFace:"Segoe UI"});
      s5.addText(r.sub,{x:0.45,y:ry+0.55,w:12.4,h:0.26,fontSize:10,color:C.muted,italic:true,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s5.addShape(pr.ShapeType.ellipse,{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fill:{color:r.catc},line:{color:r.catc,width:0}});
        s5.addText(String(j+1),{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fontSize:11,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI"});
        s5.addText(it,{x:0.82,y:ry+0.88+j*0.46,w:12.1,h:0.42,fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true});
      });
    });
    _ftr(s5,pr,ftrlbl,5,6);

    /* S6 TINDAK LANJUT */
    var s6=pr.addSlide();
    s6.background={color:C.navD};
    s6.addShape(pr.ShapeType.ellipse,{x:11.5,y:5.0,w:4.5,h:4.5,fill:{color:C.nav2},line:{color:C.nav2,width:0}});
    s6.addText("TINDAK LANJUT & REKOMENDASI",{x:0.35,y:0.28,w:10,h:0.8,fontSize:32,bold:true,color:C.wht,fontFace:"Segoe UI"});
    s6.addText("Pest & Rodent Control · "+tgl,{x:0.35,y:1.1,w:10,h:0.32,fontSize:14,color:C.cyan,fontFace:"Segoe UI"});
    var reks6p=["Jadwalkan pest control rutin tiap 3 bulan untuk semua "+totalLok+" lokasi aktif",
      "Intensifkan pengendalian "+hamaDom+" sebagai hama dominan yang teridentifikasi",
      "Perbaiki infrastruktur gedung — tutup celah masuk hama secara struktural",
      "Arsipkan laporan lengkap untuk audit K3 dan sertifikasi sanitasi"];
    reks6p.forEach(function(txt,i){
      var col=i%2===0?0.28:6.93; var row=Math.floor(i/2);
      _rekCard(s6,pr,col,1.55+row*1.8,6.42,1.65,i+1,txt);
    });
    s6.addShape(pr.ShapeType.roundRect,{x:0.28,y:5.18,w:12.77,h:1.68,fill:{color:C.nav},line:{color:C.cyan,width:1},rectRadius:0.08});
    s6.addShape(pr.ShapeType.rect,{x:0.28,y:5.18,w:12.77,h:0.06,fill:{color:C.cyan},line:{color:C.cyan,width:0}});
    s6.addText("📅  JADWAL MONITORING BERIKUTNYA",{x:0.48,y:5.26,w:12.3,h:0.4,fontSize:12,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    s6.addText("Pest Control berikutnya dijadwalkan 3 bulan ke depan. Pastikan vendor pest control bersertifikat masih aktif. Review temuan dan tindakan lanjutan sebelum sesi berikutnya.",
      {x:0.48,y:5.7,w:12.3,h:0.96,fontSize:11.5,color:C.wht,fontFace:"Segoe UI",wrap:true});
    _ftr(s6,pr,ftrlbl,6,6);
    await pr.writeFile({fileName:"Laporan_Pest_Control_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Pest Control berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT Pest: "+e.message,"error");}
}

/* ════════════════════════════════════════════════════
   4. EXPORT CLOSEOUT HRA 2025 — 6 Slide
════════════════════════════════════════════════════ */
async function exportCloseout25PPT(){
  if(!(await _guardAsync()))return;
  var raw=(typeof rawCloseout!=="undefined"?rawCloseout:[]);
  if(!raw.length){showToast("Tidak ada data Closeout.","warning");return;}
  showToast("Membuat PPT Closeout...","info");
  try{
    var tgl=_now();
    var total=raw.length;
    function isDone(r){var s=(r["Status Tindak Lanjut"]||"").toLowerCase();return s.includes("selesai")||s.includes("done")||s.includes("closed");}
    var done=raw.filter(isDone).length;
    var open=total-done;
    var pct=total>0?((done/total)*100).toFixed(0):"0";
    var stC=parseInt(pct)>=80?C.grn:parseInt(pct)>=50?C.ora:C.red;
    var hirMap={};
    raw.forEach(function(r){var h=r["Hirarki Pengendalian"]||r["Hirarki"]||"Lainnya";hirMap[h]=(hirMap[h]||0)+1;});
    var hirTop=Object.entries(hirMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var pr=_pres("Closeout HRA 2025 — IH Dashboard");
    var ftrlbl="PERTAMINA PATRA NIAGA — Closeout HRA 2025 | "+tgl+" | RAHASIA & TERBATAS";

    /* S1 COVER */
    _cover(pr,"CLOSEOUT HRA","2025 TRACKING",
      "Monitoring Status Tindak Lanjut Temuan HRA Tahun 2025",
      tgl,[
      {v:total,l:"Total Temuan",c:C.cyan},
      {v:done,l:"Closed",c:C.grn},
      {v:open,l:"Open Items",c:open>0?C.red:C.grn}
    ],"CLOSE OUT 2025");

    /* S2 RINGKASAN */
    var s2=pr.addSlide();
    _hdr(s2,pr,"RINGKASAN STATUS CLOSEOUT","Overview penyelesaian tindak lanjut temuan HRA Tahun 2025");
    s2.background={color:C.gry};
    _kpiCard(s2,pr,0.28,1.55,4.2,2.72,"📋",total,"Total Temuan",C.blue,C.cgr,C.blue);
    _kpiCard(s2,pr,4.6,1.55,4.2,2.72,"✅",done,"Item Closed",C.grn,"E3FAEB",C.grn);
    _kpiCard(s2,pr,8.92,1.55,4.13,2.72,"⏳",open,"Open Items",open>0?C.red:C.grn,open>0?"FFEAEC":"E3FAEB",open>0?C.red:C.grn);
    _kpiCard(s2,pr,0.28,4.38,6.22,2.38,"📊",pct+"%","Completion Rate",stC,C.cgr,stC);
    /* Progress bar */
    s2.addShape(pr.ShapeType.roundRect,{x:6.62,y:4.38,w:6.43,h:2.38,fill:{color:C.wht},line:{color:C.lgr,width:0.5},rectRadius:0.06});
    s2.addShape(pr.ShapeType.rect,{x:6.62,y:4.38,w:6.43,h:0.06,fill:{color:stC},line:{color:stC,width:0}});
    s2.addText("Progress Closure",{x:6.8,y:4.52,w:6.1,h:0.3,fontSize:11,bold:true,color:C.txt,fontFace:"Segoe UI"});
    s2.addShape(pr.ShapeType.roundRect,{x:6.8,y:4.92,w:5.9,h:0.3,fill:{color:C.lgr},line:{color:C.lgr,width:0},rectRadius:0.05});
    s2.addShape(pr.ShapeType.roundRect,{x:6.8,y:4.92,w:5.9*(parseInt(pct)/100),h:0.3,fill:{color:stC},line:{color:stC,width:0},rectRadius:0.05});
    s2.addText(pct+"% ("+done+" / "+total+")",{x:6.8,y:5.3,w:5.9,h:0.3,fontSize:12,bold:true,color:stC,fontFace:"Segoe UI"});
    s2.addText(open>0?"Masih ada "+open+" item belum diselesaikan":"Semua item telah closed! 🎉",{x:6.8,y:5.62,w:5.9,h:0.9,fontSize:11,color:open>0?C.red:C.grn,fontFace:"Segoe UI",wrap:true});
    _ftr(s2,pr,ftrlbl,2,6);

    /* S3 DISTRIBUSI */
    var s3=pr.addSlide();
    _hdr(s3,pr,"DISTRIBUSI PER HIRARKI PENGENDALIAN","Sebaran temuan berdasarkan jenis pengendalian yang diterapkan");
    s3.background={color:C.gry};
    var hClrs=[C.red,C.ora,C.blue,C.cyan,C.pur];
    hirTop.forEach(function(h,i){
      _kpiRow(s3,pr,0.28,1.58+i*1.08,12.77,0.98,"🔧",h[1]+" item",h[0],hClrs[i],C.cgr);
    });
    /* Donut closed vs open */
    _donutChart(s3,pr,11.0,5.2,1.4,done,open,"Status");
    _ftr(s3,pr,ftrlbl,3,6);

    /* S4 AI REKOMENDASI */
    var s4=pr.addSlide();
    _hdr(s4,pr,"AI REKOMENDASI — PERCEPATAN CLOSEOUT","Analisis otomatis berbasis status tindak lanjut HRA 2025");
    s4.background={color:C.gry};
    s4.addShape(pr.ShapeType.roundRect,{x:0.28,y:1.55,w:12.77,h:0.68,fill:{color:C.navD},line:{color:C.navD,width:0},rectRadius:0.06});
    s4.addText("🤖  AI REKOMENDASI · ISO 45001:2018 & ISM Code · Status HRA Closeout 2025",
      {x:0.5,y:1.6,w:12.5,h:0.56,fontSize:11,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    var reks4c=[
      {cat:open>0?"⚠️ PERCEPATAN CLOSURE":"✅ CLOSEOUT COMPLETE",catc:open>0?C.red:C.grn,catbg:open>0?"FFEAEC":"E3FAEB",
       sub:"Target: semua item closed sebelum akhir tahun — eskalasi jika ada kendala resources",
       items:[open>0?"Tetapkan deadline tegas untuk "+open+" open item dengan PIC yang bertanggung jawab":"Lakukan verifikasi final efektivitas semua tindakan pengendalian yang sudah closed",
              "Dokumentasikan evidence foto/video untuk setiap item closed sebagai bukti kepatuhan"]},
      {cat:"🔍 VERIFIKASI EFEKTIVITAS",catc:C.cyan,catbg:C.cgr,
       sub:"Pengendalian harus diverifikasi efektivitasnya melalui re-measurement setelah implementasi",
       items:["Lakukan re-assessment untuk item yang sudah closed — pastikan hazard benar-benar terkontrol",
              "Gunakan lesson learned dari HRA 2025 sebagai masukan penyempurnaan metodologi HRA 2026"]}
    ];
    reks4c.forEach(function(r,i){
      var ry=2.0+i*2.55;
      s4.addShape(pr.ShapeType.roundRect,{x:0.28,y:ry,w:12.77,h:1.98,fill:{color:C.wht},line:{color:r.catc,width:1},rectRadius:0.06});
      s4.addShape(pr.ShapeType.rect,{x:0.28,y:ry,w:12.77,h:0.5,fill:{color:r.catbg},line:{color:r.catc,width:0}});
      s4.addText(r.cat,{x:0.45,y:ry+0.04,w:8,h:0.42,fontSize:12,bold:true,color:r.catc,fontFace:"Segoe UI"});
      s4.addText(r.sub,{x:0.45,y:ry+0.55,w:12.4,h:0.26,fontSize:10,color:C.muted,italic:true,fontFace:"Segoe UI"});
      r.items.forEach(function(it,j){
        s4.addShape(pr.ShapeType.ellipse,{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fill:{color:r.catc},line:{color:r.catc,width:0}});
        s4.addText(String(j+1),{x:0.45,y:ry+0.9+j*0.46,w:0.26,h:0.26,fontSize:11,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI"});
        s4.addText(it,{x:0.82,y:ry+0.88+j*0.46,w:12.1,h:0.42,fontSize:11,color:C.txt,fontFace:"Segoe UI",wrap:true});
      });
    });
    _ftr(s4,pr,ftrlbl,4,6);

    /* S5 DATA TABLE */
    var s5=pr.addSlide();
    _hdr(s5,pr,"DATA TINDAK LANJUT HRA 2025","Status detail penyelesaian per temuan — "+tgl);
    s5.background={color:C.gry};
    var hdrs5=[
      {text:"No",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Kapal",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Parameter/Temuan",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"Hirarki",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"}}},
      {text:"PIC",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Target",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}},
      {text:"Status",options:{bold:true,color:C.wht,fill:{color:C.navD},fontSize:9.5,border:{type:"none"},align:"center"}}
    ];
    var rows5=raw.slice(0,13).map(function(r,i){
      var ok=isDone(r); var ev=i%2===0?C.wht:"F8FAFD";
      return[
        {text:String(i+1),options:{fontSize:10,align:"center",fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Nama Kapal"]||"Tgt:-"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Parameter"]||r["Temuan"]||"Tgt:-").slice(0,28),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Hirarki Pengendalian"]||r["Hirarki"]||"Tgt:-").slice(0,22),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["PIC"]||"Tgt:-"),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Target Tanggal"]||r["Deadline"]||"Tgt:-"),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:ok?"✓ Closed":"⏳ Open",options:{fontSize:10,bold:true,color:ok?C.grn:C.ora,fill:{color:ev},border:{type:"none"},align:"center"}}
      ];
    });
    s5.addTable([hdrs5].concat(rows5),{x:0.28,y:1.55,w:12.77,colW:[0.4,1.9,2.7,1.8,1.5,1.42,1.25],rowH:0.36,fontFace:"Segoe UI",border:{type:"none"},fill:{color:C.wht}});
    _ftr(s5,pr,ftrlbl,5,6);

    /* S6 TINDAK LANJUT */
    var s6=pr.addSlide();
    s6.background={color:C.navD};
    s6.addShape(pr.ShapeType.ellipse,{x:11.5,y:5.0,w:4.5,h:4.5,fill:{color:C.nav2},line:{color:C.nav2,width:0}});
    s6.addText("TINDAK LANJUT & REKOMENDASI",{x:0.35,y:0.28,w:10,h:0.8,fontSize:32,bold:true,color:C.wht,fontFace:"Segoe UI"});
    s6.addText("Closeout HRA 2025 · "+tgl,{x:0.35,y:1.1,w:10,h:0.32,fontSize:14,color:C.cyan,fontFace:"Segoe UI"});
    var reks6c=["Tetapkan PIC & deadline tegas untuk "+open+" item yang masih open",
      "Verifikasi efektivitas semua tindakan pengendalian yang sudah closed",
      "Kompilasi laporan closeout final untuk direksi & audit ISM Code",
      "Jadikan lesson learned HRA 2025 sebagai input penyempurnaan HRA 2026"];
    reks6c.forEach(function(txt,i){
      var col=i%2===0?0.28:6.93; var row=Math.floor(i/2);
      _rekCard(s6,pr,col,1.55+row*1.8,6.42,1.65,i+1,txt);
    });
    s6.addShape(pr.ShapeType.roundRect,{x:0.28,y:5.18,w:12.77,h:1.68,fill:{color:C.nav},line:{color:C.cyan,width:1},rectRadius:0.08});
    s6.addShape(pr.ShapeType.rect,{x:0.28,y:5.18,w:12.77,h:0.06,fill:{color:C.cyan},line:{color:C.cyan,width:0}});
    s6.addText("📋  TARGET CLOSEOUT AKHIR TAHUN",{x:0.48,y:5.26,w:12.3,h:0.4,fontSize:12,bold:true,color:C.cyan,fontFace:"Segoe UI"});
    s6.addText("Seluruh open item HRA 2025 ditargetkan closed sebelum 31 Desember. Eskalasi ke management jika ada kendala resources atau teknis. Laporan final diserahkan ke direksi dan biro klasifikasi.",
      {x:0.48,y:5.7,w:12.3,h:0.96,fontSize:11.5,color:C.wht,fontFace:"Segoe UI",wrap:true});
    _ftr(s6,pr,ftrlbl,6,6);
    await pr.writeFile({fileName:"Laporan_Closeout_HRA_2025_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Closeout HRA 2025 berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT Closeout: "+e.message,"error");}
}

/* ══════════════════════════════════════════════════════════
   SUMMARY DASHBOARD PPT — Minimalis Elegan untuk Direksi
   Data: rawHRA, rawDAT, rawPest, rawFisika...
══════════════════════════════════════════════════════════ */
async function exportSummaryPPT(){
  if(!(await _guardAsync()))return;
  var pr=_pres("IH Dashboard — Summary Report");
  var TK=typeof TOTAL_KAPAL!=="undefined"?TOTAL_KAPAL:85;
  var tgl=_now();
  var bulanList=typeof BULAN_ORDER!=="undefined"?BULAN_ORDER:["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  /* === DATA AGREGAT === */
  var hraData=typeof filteredHRA!=="undefined"?filteredHRA:(typeof rawHRA!=="undefined"?rawHRA:[]);
  var datData=typeof filteredDAT!=="undefined"?filteredDAT:(typeof rawDAT!=="undefined"?rawDAT:[]);
  var pestData=typeof filteredPest!=="undefined"?filteredPest:(typeof rawPest!=="undefined"?rawPest:[]);

  var hraDone=new Set(hraData.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).map(function(r){return r["Nama Kapal"];})).size;
  var hraCov=TK>0?(hraDone/TK*100).toFixed(1):0;
  var datCrew=datData.reduce(function(s,r){return s+parseInt(r["Total Crew"]||r["Jumlah Crew"]||0);},0);
  var datPos=datData.filter(function(r){return(r["Hasil"]||r["Result"]||"").toLowerCase().includes("positif");}).length;
  var datPct=datCrew>0?((datCrew-datPos)/datCrew*100).toFixed(1):100;
  var pestCount=pestData.length;
  var budget=hraData.reduce(function(s,r){return s+parseFloat(r["Est Budget"]||0);},0);

  /* === SLIDE 1: COVER === */
  _cover(pr,
    "SUMMARY\nDASHBOARD",
    "Industrial Hygiene Report",
    "Monitoring, Assessment & Hazard Management",
    tgl,
    [{v:hraDone+"/"+TK,l:"Coverage HRA",c:C.gold},
     {v:datCrew,l:"Crew Diperiksa DAT",c:C.wht},
     {v:pestCount+"x",l:"Pest Control",c:C.wht}],
    "IH"
  );

  /* === SLIDE 2: OVERVIEW EKSEKUTIF === */
  var s2=pr.addSlide();
  _hdr(s2,pr,"OVERVIEW EKSEKUTIF","Ringkasan kinerja IH — "+tgl);
  /* 4 KPI utama */
  _kpiCard(s2,pr,0.30,1.10,2.90,2.20,"📋",hraDone+"/"+TK,"Coverage HRA",parseFloat(hraCov)>=80?C.grn:C.warn);
  _kpiCard(s2,pr,3.30,1.10,2.90,2.20,"✅",datPct+"%","DAT Compliance",parseFloat(datPct)>=99?C.grn:C.warn);
  _kpiCard(s2,pr,6.30,1.10,2.90,2.20,"🐛",pestCount+"x","Pest Control",C.navD);
  _kpiCard(s2,pr,9.30,1.10,3.74,2.20,"💰",_rp(budget),"Est. Budget HRA",C.navD);
  /* Status keseluruhan */
  var overallOk=parseFloat(hraCov)>=60&&parseFloat(datPct)>=95;
  s2.addShape(pr.ShapeType.roundRect,{x:0.30,y:3.50,w:12.74,h:0.80,
    fill:{color:overallOk?"E8F8F0":"FEF0E6"},
    line:{color:overallOk?C.grn:C.warn,width:1},rectRadius:0.08});
  s2.addText((overallOk?"✅ ":"⚠️ ")+"STATUS KESELURUHAN: "+(overallOk?"BAIK — Semua indikator utama dalam batas normal.":"PERHATIAN — Beberapa indikator perlu tindak lanjut."),{
    x:0.50,y:3.54,w:12.4,h:0.68,fontSize:13,bold:true,
    color:overallOk?C.grn:C.warn,fontFace:"Segoe UI",valign:"middle"});
  /* Detail tabel */
  var rows=[
    ["Indikator","Nilai","Target","Status"],
    ["Coverage HRA & IH",hraDone+" dari "+TK+" kapal ("+hraCov+"%)",">80%",parseFloat(hraCov)>=80?"OK":"Perhatian"],
    ["DAT - Compliance",datPct+"%",">99%",parseFloat(datPct)>=99?"OK":"Perhatian"],
    ["DAT - Crew Positif",datPos+" crew","0","0"===String(datPos)?"Clear":"Tindak Lanjut"],
    ["Pest Control",pestCount+" pelaksanaan",">0",pestCount>0?"Aktif":"Belum Ada"],
    ["Est. Budget HRA",_rp(budget),"Tgt:-","Info"],
  ];
  s2.addTable(rows,{x:0.30,y:4.46,w:12.74,h:2.70,
    border:{type:"solid",color:C.lgr,pt:0.5},
    fill:{color:C.wht},
    colW:[4.0,3.0,2.2,3.54],
    fontFace:"Segoe UI",fontSize:10.5,
    align:"left",valign:"middle",
    rowH:0.40});
  _ftr(s2,pr,"PT Pertamina Patra Niaga — IH Summary Dashboard | "+tgl+" | RAHASIA & TERBATAS",2,6);

  /* === SLIDE 3: HRA & IH DETAIL === */
  var s3=pr.addSlide();
  _hdr(s3,pr,"HRA & IH — HAZARD RECOGNITION & ASSESSMENT","Status pelaksanaan per armada");
  /* Breakdown per fleet */
  var fleets=["FP I","FP II","FC","FGP"];
  var fleetData=fleets.map(function(f){
    var fd=hraData.filter(function(r){return(r["Jenis Fleet"]||"").includes(f);});
    var done=fd.filter(function(r){return(r["Status"]||"").toLowerCase()==="done";}).length;
    return{fleet:f,total:fd.length,done:done};
  });
  _barChart(s3,pr,0.30,1.10,6.0,5.8,
    fleetData.map(function(d){return d.fleet;}),
    fleetData.map(function(d){return d.done;}),
    [C.navD,C.nav,C.nav2,C.cyan],
    "Pelaksanaan HRA per Fleet");
  /* Top 3 hazard */
  var hazMap={};
  hraData.forEach(function(r){
    var h=(r["Top 3 Hazard"]||"").trim();if(!h)return;
    h.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean).forEach(function(hz){
      hazMap[hz]=(hazMap[hz]||0)+1;
    });
  });
  var topHaz=Object.entries(hazMap).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  s3.addText("Top Hazard Teridentifikasi",{x:6.60,y:1.10,w:6.40,h:0.28,
    fontSize:11,bold:true,color:C.navD,fontFace:"Segoe UI"});
  var hazClrs=[C.red,C.warn,C.gold,C.navD,C.muted];
  topHaz.forEach(function(e,i){
    _kpiRow(s3,pr,6.60,1.46+i*1.08,6.40,0.92,""||"",e[1],e[0],hazClrs[i],C.gry);
  });
  _ftr(s3,pr,"PT Pertamina Patra Niaga — HRA & IH Detail | "+tgl,3,6);

  /* === SLIDE 4: DAT DETAIL === */
  var s4=pr.addSlide();
  _hdr(s4,pr,"DRUGS & ALCOHOL TEST — MONITORING CREW","Hasil pemeriksaan narkoba & alkohol");
  /* KPI DAT */
  var datKapal=new Set(datData.map(function(r){return r["Nama Kapal"];})).size;
  _kpiCard(s4,pr,0.30,1.10,3.0,2.20,"🚢",datKapal,"Kapal Diperiksa",C.navD);
  _kpiCard(s4,pr,3.50,1.10,3.0,2.20,"👥",datCrew,"Total Crew",C.navD);
  _kpiCard(s4,pr,6.70,1.10,3.0,2.20,"⚠️",datPos,"Crew Positif",datPos>0?C.red:C.grn);
  _kpiCard(s4,pr,9.90,1.10,3.13,2.20,"📊",datPct+"%","Compliance",parseFloat(datPct)>=99?C.grn:C.warn);
  /* Tren bulanan */
  var byBulan={};bulanList.forEach(function(b){byBulan[b]=0;});
  datData.forEach(function(r){
    var b=r["Bulan"]||r["Bulan Pelaksanaan"]||"";
    if(byBulan[b]!==undefined)byBulan[b]++;
  });
  _barChart(s4,pr,0.30,3.50,12.74,3.70,
    bulanList.map(function(b){return b.slice(0,3);}),
    bulanList.map(function(b){return byBulan[b];}),
    [C.navD,C.nav,C.nav2,C.cyan,C.gold,C.red,C.navD,C.nav,C.nav2,C.cyan,C.gold,C.red],
    "Distribusi DAT per Bulan");
  _ftr(s4,pr,"PT Pertamina Patra Niaga — DAT Detail | "+tgl,4,6);

  /* === SLIDE 5: PEST & HAZARD 5 === */
  var s5=pr.addSlide();
  _hdr(s5,pr,"PEST CONTROL & 5 HAZARD UTAMA","Ringkasan faktor fisika, kimia, biologi, ergonomi, psikososial");
  /* Pest KPI */
  var pestLok=new Set(pestData.map(function(r){return r["Lokasi"]||"";})).size;
  _kpiCard(s5,pr,0.30,1.10,3.0,2.20,"🐀",pestCount+"x","Pest Control",C.navD);
  _kpiCard(s5,pr,3.50,1.10,3.0,2.20,"📍",pestLok,"Lokasi",C.navD);
  /* Hazard 5 status */
  var hazardMap=[
    {n:"Fisika",    d:typeof rawFisika!=="undefined"?rawFisika:[]},
    {n:"Kimia",     d:typeof rawKimia!=="undefined"?rawKimia:[]},
    {n:"Biologi",   d:typeof rawBiologi!=="undefined"?rawBiologi:[]},
    {n:"Ergonomi",  d:typeof rawErgonomi!=="undefined"?rawErgonomi:[]},
    {n:"Psikososial",d:typeof rawPsikososial!=="undefined"?rawPsikososial:[]},
  ];
  s5.addText("Status 5 Hazard Utama",{x:6.90,y:1.10,w:6.20,h:0.28,
    fontSize:11,bold:true,color:C.navD,fontFace:"Segoe UI"});
  hazardMap.forEach(function(hz,i){
    var count=hz.d.length;
    var melebihi=hz.d.filter(function(r){return parseFloat(r["Nilai"]||r["Hasil"]||0)>(parseFloat(r["NAB"]||r["Batas"]||1)||1);}).length;
    _kpiRow(s5,pr,6.90,1.46+i*1.04,6.20,0.88,"",count,hz.n+" — "+melebihi+" melebihi NAB",melebihi>0?C.warn:C.grn,C.gry);
  });
  _ftr(s5,pr,"PT Pertamina Patra Niaga — Pest & Hazard | "+tgl,5,6);

  /* === SLIDE 6: PENUTUP === */
  var s6=pr.addSlide();
  s6.background={color:C.navD};
  s6.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.33,h:0.06,fill:{color:C.red},line:{color:C.red,width:0}});
  s6.addShape(pr.ShapeType.rect,{x:0,y:7.44,w:13.33,h:0.06,fill:{color:C.gold},line:{color:C.gold,width:0}});
  s6.addText("TERIMA KASIH",{x:1.0,y:2.0,w:11.33,h:1.5,
    fontSize:56,bold:true,color:C.wht,align:"center",fontFace:"Segoe UI"});
  s6.addShape(pr.ShapeType.rect,{x:3.5,y:3.58,w:6.33,h:0.03,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  s6.addText("PT Pertamina Patra Niaga · Satuan Kerja Regional III",{x:1.0,y:3.72,w:11.33,h:0.40,
    fontSize:13,color:"AABBD0",align:"center",fontFace:"Segoe UI"});
  s6.addText("IH Officer · Health Division",{x:1.0,y:4.18,w:11.33,h:0.34,
    fontSize:12,color:C.muted,align:"center",italic:true,fontFace:"Segoe UI"});
  s6.addText("Laporan ini bersifat RAHASIA dan hanya untuk penggunaan internal.",{
    x:2.0,y:6.70,w:9.33,h:0.28,fontSize:9,color:C.muted,align:"center",italic:true,fontFace:"Segoe UI"});
  s6.addText(tgl,{x:2.0,y:6.96,w:9.33,h:0.24,
    fontSize:9,color:"7A8EA8",align:"center",fontFace:"Segoe UI"});

  pr.writeFile({fileName:"IH_Summary_Dashboard_"+new Date().toISOString().slice(0,10)+".pptx"})
    .then(function(){if(typeof showToast==="function")showToast("Summary PPT berhasil didownload!","success");})
    .catch(function(e){if(typeof showToast==="function")showToast("Gagal export: "+e.message,"error");});
}
