/* ═══════════════════════════════════════════════════════════════════
   ppt_export.js — IH Dashboard v5.0
   Design: Sesuai Laporan_DAT_Mei_2026.pptx (desain asli)
   Palette: Navy dark + Cyan accent + White cards
   Layout: LAYOUT_WIDE 13.33 × 7.5 in
   ✓ Zero 8-digit hex ✓ colW sum = w ✓ Zero error
═══════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ PALETTE PERTAMINA — dari mockup Pak Diyon ══ */
var C={
  navD:"002060",  /* Navy gelap Pertamina */
  nav: "003195",  /* Navy medium */
  nav2:"184799",  /* Navy terang */
  red: "E62129",  /* Merah Pertamina */
  cyan:"00B0F0",  /* Biru terang Pertamina */
  blue:"0159B9",  /* Biru medium */
  gold:"FFC000",  /* Kuning/Gold */
  grn: "9CC82B",  /* Hijau Pertamina */
  pos: "2DC653",  /* Hijau positif */
  wht: "FFFFFF",
  gry: "F5F8FC",  /* bg slide */
  lgr: "D6E4F0",  /* border */
  cgr: "DDEEFF",  /* circle bg */
  ora: "FB8C00",  /* oranye */
  pur: "5C35A0",  /* ungu */
  muted:"6B7A8D",
  txt: "1A2B45",
  drkblu:"00498C"
};

var BULAN=["Januari","Februari","Maret","April","Mei","Juni",
           "Juli","Agustus","September","Oktober","November","Desember"];
var BULAN_S=["Jan","Feb","Mar","Apr","Mei","Jun",
             "Jul","Ags","Sep","Okt","Nov","Des"];

function _rp(n){
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
  }return true;
}
async function _guardAsync(){
  if(typeof _awaitPptx==="function"){
    var ok=await _awaitPptx();
    if(!ok){if(typeof showToast==="function")showToast("Library PPT gagal dimuat. Coba refresh.","error");return false;}
    return true;
  }
  return _guard();
}
function _pres(t){
  var p=new PptxGenJS();
  p.layout="LAYOUT_WIDE";
  p.author="IH Dashboard v5.0 — PT Pertamina Patra Niaga";
  p.title=t;
  return p;
}
function _fs(v){var s=String(v);return s.length>8?18:s.length>5?24:s.length>3?32:40;}

/* ════════════════════════════════════════════════════
   SLIDE HELPERS — sesuai desain asli
════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   Header — Pertamina style (dari mockup Pak Diyon)
   Merah full-width atas + logo box + gold accent
════════════════════════════════════════════════════ */
function _hdr(s,pr,title,sub){
  s.background={color:C.gry};
  /* Header bar merah */
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.33,h:0.82,
    fill:{color:C.red},line:{color:C.red,width:0}});
  /* Gold accent bawah header */
  s.addShape(pr.ShapeType.rect,{x:0,y:0.80,w:13.33,h:0.04,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  /* Logo box kiri */
  s.addShape(pr.ShapeType.rect,{x:0.22,y:0.09,w:1.08,h:0.62,
    fill:{color:C.wht},line:{color:C.gold,width:1}});
  s.addText("⚓",{x:0.22,y:0.09,w:1.08,h:0.62,
    fontSize:22,align:"center",valign:"middle",fontFace:"Segoe UI Emoji"});
  /* Title di header */
  /* Auto-scale title jika panjang > 45 karakter */
  var hdrFs=title.length>55?14:title.length>45?16:20;
  s.addText(title,{x:1.46,y:0.08,w:9.2,h:0.42,
    fontSize:hdrFs,bold:true,color:C.wht,fontFace:"Century Gothic",charSpacing:0.2});
  if(sub)s.addText(sub,{x:1.46,y:0.50,w:9.2,h:0.28,
    fontSize:9.5,color:"FFCCCC",italic:true,fontFace:"Segoe UI"});
  /* Pertamina badge kanan */
  s.addShape(pr.ShapeType.rect,{x:10.98,y:0.10,w:2.12,h:0.60,
    fill:{color:C.navD},line:{color:C.gold,width:1}});
  s.addText("PERTAMINA\nPATRA NIAGA",{x:10.98,y:0.10,w:2.12,h:0.60,
    fontSize:8.5,bold:true,color:C.gold,align:"center",valign:"middle",
    fontFace:"Century Gothic",lineSpacingMultiple:1.1});
  /* Subheader navy band */
  s.addShape(pr.ShapeType.rect,{x:0,y:0.84,w:4.8,h:0.44,
    fill:{color:C.navD},line:{color:C.navD,width:0}});
  s.addShape(pr.ShapeType.rect,{x:4.8,y:0.84,w:8.53,h:0.44,
    fill:{color:C.nav2},line:{color:C.nav2,width:0}});
  /* Footer merah */
  s.addShape(pr.ShapeType.rect,{x:0,y:7.20,w:13.33,h:0.30,
    fill:{color:C.red},line:{color:C.red,width:0}});
}

/* Footer text + page number — overlay di atas red bar */
function _ftr(s,pr,label,pg,tot){
  s.addText(label,{x:0.25,y:7.22,w:10.5,h:0.24,
    fontSize:8.5,color:C.wht,fontFace:"Segoe UI",italic:true});
  s.addText(pg+" / "+tot,{x:11.5,y:7.22,w:1.6,h:0.24,
    fontSize:9,bold:true,color:C.gold,align:"right",fontFace:"Century Gothic"});
}

/* KPI Card — style slide 2: white card, colored top bar, circle icon */
function _kpiCard(s,pr,x,y,w,h,icon,val,lbl,clr,ibg,acl){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.lgr,width:0.5},rectRadius:0.08,
    shadow:{type:"outer",color:"000000",blur:5,offset:2,angle:135,opacity:0.08}});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:0.07,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:x+w/2-0.45,y:y+0.18,w:0.9,h:0.9,
    fill:{color:ibg||C.navD},line:{color:clr,width:1.5}});
  s.addText(icon,{x:x+w/2-0.45,y:y+0.22,w:0.9,h:0.8,
    fontSize:22,align:"center",fontFace:"Segoe UI Emoji"});
  s.addText(String(val),{x:x,y:y+1.22,w:w,h:0.65,
    fontSize:_fs(val),bold:true,color:C.navD,align:"center",fontFace:"Century Gothic"});
  s.addText(lbl,{x:x+0.05,y:y+1.9,w:w-0.1,h:0.35,
    fontSize:9.5,color:C.muted,align:"center",fontFace:"Segoe UI",wrap:true});
}

/* Alert banner — merah/kuning */
function _alert(s,pr,x,y,w,h,icon,txt,clr,bg){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:bg||C.gry},line:{color:clr,width:1.5},rectRadius:0.08});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:w,h:0.07,
    fill:{color:clr},line:{color:clr,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:x+(w-0.58)/2,y:y+0.15,w:0.58,h:0.58,
    fill:{color:clr},line:{color:clr,width:0}});
  s.addText(icon,{x:x+(w-0.58)/2,y:y+0.16,w:0.58,h:0.52,
    fontSize:18,align:"center",fontFace:"Segoe UI Emoji"});
  s.addText(txt,{x:x+0.1,y:y+0.86,w:w-0.2,h:h-1.0,
    fontSize:10.5,color:C.navD,align:"center",fontFace:"Segoe UI",
    wrap:true,valign:"top"});
}

/* KPI row style slide 4: left circle + big number + label, colored top */
function _kpiRow(s,pr,x,y,w,h,icon,val,txt,clr,ibg){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.wht},line:{color:C.lgr,width:0.5},rectRadius:0.06});
  s.addShape(pr.ShapeType.rect,{x:x,y:y,w:0.07,h:h,
    fill:{color:clr},line:{color:clr,width:0}});
  s.addShape(pr.ShapeType.ellipse,{x:x+0.18,y:y+(h-0.52)/2,w:0.52,h:0.52,
    fill:{color:ibg||C.navD},line:{color:clr,width:1}});
  s.addText(String(val),{x:x+0.9,y:y+0.08,w:w-1.0,h:h*0.55,
    fontSize:_fs(val),bold:true,color:C.navD,fontFace:"Century Gothic"});
  s.addText(txt,{x:x+0.9,y:y+h*0.55,w:w-1.0,h:h*0.42,
    fontSize:10.5,color:C.muted,fontFace:"Segoe UI",wrap:true});
}

/* Rekomendasi card style slide 8: navy bg, numbered circle, left border */
function _rekCard(s,pr,x,y,w,h,num,txt){
  s.addShape(pr.ShapeType.roundRect,{x:x,y:y,w:w,h:h,
    fill:{color:C.navD},line:{color:C.gold,width:1},rectRadius:0.08});
  s.addShape(pr.ShapeType.ellipse,{x:x+0.18,y:y+(h-0.60)/2,w:0.60,h:0.60,
    fill:{color:C.red},line:{color:C.gold,width:1}});
  s.addText(String(num),{x:x+0.18,y:y+(h-0.60)/2,w:0.60,h:0.60,
    fontSize:18,bold:true,color:C.wht,align:"center",fontFace:"Century Gothic"});
  s.addText(txt,{x:x+0.92,y:y+0.1,w:w-1.06,h:h-0.2,
    fontSize:12,color:C.wht,fontFace:"Segoe UI",wrap:true,valign:"middle"});
}

/* Bar chart — mirip slide 3 */
function _barChart(s,pr,x,y,w,h,data,col,title){
  if(title)s.addText(title,{x:x,y:y-0.28,w:w,h:0.26,
    fontSize:11,bold:true,color:C.txt,fontFace:"Segoe UI"});
  var vals=data.map(function(d){return d.v||0;});
  var mx=Math.max.apply(null,vals)||1;
  var n=data.length; var bw=w/n; var pad=bw*0.18;
  /* Grid */
  [0.25,0.5,0.75,1.0].forEach(function(f){
    var gy=y+h-f*h*0.88;
    s.addShape(pr.ShapeType.rect,{x:x,y:gy,w:w,h:0.01,
      fill:{color:C.lgr},line:{color:C.lgr,width:0}});
  });
  data.forEach(function(d,i){
    var v=d.v||0; var bh=(v/mx)*h*0.88;
    var bx=x+i*bw+pad;
    var bc=d.c||col||C.cyan;
    if(bh>0){
      s.addShape(pr.ShapeType.roundRect,{x:bx,y:y+h-bh,w:bw-pad*2,h:bh,
        fill:{color:bc},line:{color:C.wht,width:0.5},rectRadius:0.04});
      s.addText(String(v),{x:bx,y:y+h-bh-0.3,w:bw-pad*2,h:0.28,
        fontSize:10,bold:true,color:bc,align:"center",fontFace:"Segoe UI"});
    } else {
      s.addText("0",{x:bx,y:y+h-0.32,w:bw-pad*2,h:0.28,
        fontSize:9,color:C.muted,align:"center",fontFace:"Segoe UI"});
    }
    s.addText(d.lbl,{x:bx-pad,y:y+h+0.06,w:bw,h:0.28,
      fontSize:8.5,color:C.muted,align:"center",fontFace:"Segoe UI"});
  });
  s.addShape(pr.ShapeType.rect,{x:x,y:y+h,w:w,h:0.03,
    fill:{color:C.txt},line:{color:C.txt,width:0}});
}

/* Donut chart — mirip slide 3 */
function _donutChart(s,pr,cx,cy,r,neg,pos,title){
  if(title)s.addText(title,{x:cx-r-0.5,y:cy-r-0.52,w:(r+0.5)*2,h:0.35,
    fontSize:12,bold:true,color:C.txt,align:"center",fontFace:"Segoe UI"});
  var tot=neg+pos||1;
  var negPct=Math.round(neg/tot*100);
  var posPct=Math.round(pos/tot*100);
  /* Outer ring — cyan (negatif) */
  s.addShape(pr.ShapeType.ellipse,{x:cx-r,y:cy-r,w:r*2,h:r*2,
    fill:{color:C.cyan},line:{color:C.cyan,width:0}});
  /* Positif arc — red segment */
  if(pos>0&&posPct<100){
    var segR=r*0.96;
    s.addShape(pr.ShapeType.ellipse,{x:cx-segR*0.22,y:cy-r*0.98,w:segR*0.45,h:r*0.45,
      fill:{color:C.red},line:{color:C.red,width:0}});
  }
  /* White center hole */
  var hr=r*0.6;
  s.addShape(pr.ShapeType.ellipse,{x:cx-hr,y:cy-hr,w:hr*2,h:hr*2,
    fill:{color:C.wht},line:{color:C.lgr,width:1}});
  /* Center text */
  s.addText(negPct+"%",{x:cx-hr,y:cy-0.3,w:hr*2,h:0.6,
    fontSize:22,bold:true,color:C.cyan,align:"center",fontFace:"Segoe UI"});
  /* Legend */
  var ly=cy+r+0.18;
  s.addShape(pr.ShapeType.rect,{x:cx-1.1,y:ly,w:0.2,h:0.18,
    fill:{color:C.cyan},line:{color:C.cyan,width:0}});
  s.addText("Negatif",{x:cx-0.86,y:ly-0.02,w:1.1,h:0.22,
    fontSize:10,color:C.txt,fontFace:"Segoe UI"});
  s.addShape(pr.ShapeType.rect,{x:cx+0.28,y:ly,w:0.2,h:0.18,
    fill:{color:C.red},line:{color:C.red,width:0}});
  s.addText("Positif",{x:cx+0.52,y:ly-0.02,w:0.9,h:0.22,
    fontSize:10,color:C.txt,fontFace:"Segoe UI"});
}

/* ════════════════════════════════════════════════════
   COVER — style slide 1 asli
════════════════════════════════════════════════════ */
function _cover(pr,judul1,judul2,sub,periode,kpis,watermark){
  var s=pr.addSlide();
  s.background={color:C.navD};
  /* Header merah */
  s.addShape(pr.ShapeType.rect,{x:0,y:0,w:13.33,h:0.82,
    fill:{color:C.red},line:{color:C.red,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0,y:0.80,w:13.33,h:0.04,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  s.addShape(pr.ShapeType.rect,{x:0.22,y:0.09,w:1.08,h:0.62,
    fill:{color:C.wht},line:{color:C.gold,width:1}});
  s.addText("⚓",{x:0.22,y:0.09,w:1.08,h:0.62,
    fontSize:22,align:"center",valign:"middle",fontFace:"Segoe UI Emoji"});
  s.addText("IH Dashboard — PT Pertamina Patra Niaga",{x:1.46,y:0.10,w:8.2,h:0.36,
    fontSize:12,bold:true,color:C.wht,fontFace:"Century Gothic",charSpacing:0.5});
  s.addText("Industrial Hygiene · Health Division · Satuan Kerja Regional III",{x:1.46,y:0.48,w:8.2,h:0.26,
    fontSize:9,color:"FFCCCC",italic:true,fontFace:"Segoe UI"});
  s.addShape(pr.ShapeType.rect,{x:10.98,y:0.10,w:2.12,h:0.60,
    fill:{color:C.navD},line:{color:C.gold,width:1}});
  s.addText("PERTAMINA\nPATRA NIAGA",{x:10.98,y:0.10,w:2.12,h:0.60,
    fontSize:8.5,bold:true,color:C.gold,align:"center",valign:"middle",
    fontFace:"Century Gothic",lineSpacingMultiple:1.1});
  /* Area kiri navy (konten) */
  s.addShape(pr.ShapeType.rect,{x:0,y:0.84,w:7.7,h:6.66,
    fill:{color:C.navD},line:{color:C.navD,width:0}});
  /* Area kanan biru terang */
  s.addShape(pr.ShapeType.rect,{x:7.7,y:0.84,w:5.63,h:6.66,
    fill:{color:C.nav2},line:{color:C.nav2,width:0}});
  /* Garis pemisah gold yang tegas */
  s.addShape(pr.ShapeType.rect,{x:7.68,y:0.84,w:0.06,h:6.66,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  /* Dekorasi lingkaran di area kanan */
  s.addShape(pr.ShapeType.ellipse,{x:8.5,y:-0.5,w:3.8,h:3.8,
    fill:{color:C.navD},line:{color:C.navD,width:0},transparency:40});
  s.addShape(pr.ShapeType.ellipse,{x:10.5,y:4.0,w:3.5,h:3.5,
    fill:{color:C.navD},line:{color:C.navD,width:0},transparency:40});
  /* Watermark */
  if(watermark){
    s.addText(watermark,{x:7.76,y:1.5,w:5.5,h:4.8,
      fontSize:52,bold:true,color:C.nav2,fontFace:"Century Gothic",
      valign:"middle",align:"center",lineSpacingMultiple:0.8});
  }
  /* Gold accent vertical line */
  s.addShape(pr.ShapeType.rect,{x:0.30,y:1.25,w:0.09,h:4.1,
    fill:{color:C.gold},line:{color:C.gold,width:0}});
  /* Judul */
  s.addText(judul1,{x:0.56,y:1.25,w:6.8,h:1.15,
    fontSize:52,bold:true,color:C.wht,fontFace:"Century Gothic",charSpacing:1});
  s.addText(judul2,{x:0.56,y:2.42,w:6.8,h:0.80,
    fontSize:26,bold:true,color:C.gold,fontFace:"Century Gothic",charSpacing:0.5});
  s.addText(sub,{x:0.56,y:3.30,w:6.8,h:0.40,
    fontSize:12,color:"B0C4DE",italic:true,fontFace:"Segoe UI"});
  /* Periode badge */
  s.addShape(pr.ShapeType.roundRect,{x:0.56,y:3.88,w:3.0,h:0.50,
    fill:{color:C.red},line:{color:C.gold,width:1.5},rectRadius:0.04});
  s.addText(periode.toUpperCase(),{x:0.56,y:3.88,w:3.0,h:0.50,
    fontSize:12,bold:true,color:C.wht,align:"center",charSpacing:1.5,
    fontFace:"Century Gothic"});
  /* KPI boxes */
  (kpis||[]).forEach(function(k,i){
    var bx=0.56+i*2.28;
    s.addShape(pr.ShapeType.roundRect,{x:bx,y:4.58,w:2.10,h:1.48,
      fill:{color:C.nav},line:{color:C.gold,width:1},rectRadius:0.06});
    s.addShape(pr.ShapeType.rect,{x:bx,y:4.58,w:2.10,h:0.07,
      fill:{color:C.gold},line:{color:C.gold,width:0}});
    s.addText(String(k.v),{x:bx,y:4.67,w:2.10,h:0.72,
      fontSize:_fs(k.v),bold:true,color:k.c||C.gold,align:"center",
      fontFace:"Century Gothic"});
    s.addText(k.l,{x:bx+0.06,y:5.42,w:1.98,h:0.50,
      fontSize:9.5,color:"B0C4DE",align:"center",fontFace:"Segoe UI",wrap:true});
  });
  /* Footer */
  s.addShape(pr.ShapeType.rect,{x:0,y:7.20,w:13.33,h:0.30,
    fill:{color:C.red},line:{color:C.red,width:0}});
  s.addText("Prepared by: IH Officer  ·  "+_now()+"  ·  CONFIDENTIAL",{
    x:0.28,y:7.22,w:8.0,h:0.24,fontSize:8.5,color:C.wht,
    italic:true,fontFace:"Segoe UI"});
  s.addText("IH DASHBOARD v5.0",{x:9.5,y:7.22,w:3.6,h:0.24,
    fontSize:8.5,bold:true,color:C.gold,align:"right",fontFace:"Century Gothic"});
}

/* ════════════════════════════════════════════════════
   1. EXPORT DAT — 8 Slide
════════════════════════════════════════════════════ */
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
        {text:String(r["Nama Kapal"]||"—"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Jenis Fleet"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Bulan Pelaksanaan"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Total Crew Diperiksa"]||0),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:isPos?"⚠ Positif":"✓ Negatif",options:{fontSize:10,bold:true,color:isPos?C.red:C.grn,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Jumlah Crew Positif"]||0),options:{fontSize:10,bold:isPos,color:isPos?C.red:C.grn,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String((r["Tindak Lanjut"]||"—")).slice(0,35),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}}
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

    pr.writeFile({fileName:"Laporan_DAT_"+periodeLabel.replace(/ /g,"_")+".pptx"});
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
        {text:String(r["Nama Kapal"]||"—"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Jenis Fleet"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Bulan Pelaksanaan"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Vendor Pelaksana"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
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
    pr.writeFile({fileName:"Laporan_HRA_"+tgl.replace(/ /g,"_")+".pptx"});
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
    var hamaDom=hamaTop.length?hamaTop[0][0].charAt(0).toUpperCase()+hamaTop[0][0].slice(1):"—";
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
        {text:String(r["Lokasi"]||"—"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Bulan"]||r["Bulan Pelaksanaan"]||"—"),options:{fontSize:10,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Jenis Kegiatan"]||"—").slice(0,28),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Temuan / Keluhan"]||"—").slice(0,30),options:{fontSize:10,fill:{color:ev},border:{type:"none"}}},
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
    pr.writeFile({fileName:"Laporan_Pest_Control_"+tgl.replace(/ /g,"_")+".pptx"});
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
        {text:String(r["Nama Kapal"]||"—"),options:{fontSize:10,bold:true,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Parameter"]||r["Temuan"]||"—").slice(0,28),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["Hirarki Pengendalian"]||r["Hirarki"]||"—").slice(0,22),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"}}},
        {text:String(r["PIC"]||"—"),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"},align:"center"}},
        {text:String(r["Target Tanggal"]||r["Deadline"]||"—"),options:{fontSize:9.5,fill:{color:ev},border:{type:"none"},align:"center"}},
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
    pr.writeFile({fileName:"Laporan_Closeout_HRA_2025_"+tgl.replace(/ /g,"_")+".pptx"});
    showToast("PPT Closeout HRA 2025 berhasil didownload!","success");
  }catch(e){console.error(e);showToast("Gagal PPT Closeout: "+e.message,"error");}
}
