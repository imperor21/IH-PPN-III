/**
 * script.js — Health PPN III Dashboard
 * DAT: bulan pelaksanaan Januari – Desember 2026
 * =============================================
 */

/* ─── KONFIGURASI ─────────────────────────────────────────── */
const CONFIG = {
  // Ganti dengan URL Google Apps Script Anda
  API_HRA: 'YOUR_APPS_SCRIPT_URL_HRA',
  API_DAT: 'YOUR_APPS_SCRIPT_URL_DAT',
  REFRESH_INTERVAL_MS: 10 * 60 * 1000,   // 10 menit
  TOTAL_KAPAL: 85,
  BIAYA_PER_KAPAL_HRA: 2500000,           // Rp 2.500.000
};

/* ─── BULAN REFERENSI ─────────────────────────────────────── */
// HRA: Mei – Desember (sesuai program awal)
const BULAN_HRA = ['Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// DAT: Januari – Desember 2026 (seluruh tahun)
const BULAN_DAT = [
  'Januari','Februari','Maret','April',
  'Mei','Juni','Juli','Agustus',
  'September','Oktober','November','Desember'
];

/* ─── STATE ───────────────────────────────────────────────── */
let hraRawData  = [];
let hraFiltered = [];
let datRawData  = [];
let datFiltered = [];
let hraChartBar, hraChartDonut, datChartBar, datChartDonut;
let hraSortState = { col: -1, asc: true };
let datSortState = { col: -1, asc: true };

/* ─── FORMAT HELPER ──────────────────────────────────────── */
function formatRupiah(n) {
  if (!n && n !== 0) return '—';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
function formatRupiahShort(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(1) + 'M';
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + 'Jt';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

/* ─── SIDEBAR NAVIGATION ──────────────────────────────────── */
document.querySelectorAll('.nav-item:not(.placeholder)').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const menu = item.dataset.menu;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + menu);
    if (page) page.classList.add('active');
    document.getElementById('pageTitle').textContent = item.dataset.title;
  });
});

document.querySelectorAll('.nav-item.placeholder').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const menu = item.dataset.menu;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + menu);
    if (page) page.classList.add('active');
    document.getElementById('pageTitle').textContent = item.dataset.title;
  });
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('expanded');
});

/* ─── REFRESH ──────────────────────────────────────────────── */
document.getElementById('btnRefresh').addEventListener('click', () => loadAllData());
setInterval(loadAllData, CONFIG.REFRESH_INTERVAL_MS);

/* ─── LOAD DATA ────────────────────────────────────────────── */
async function loadAllData() {
  showLoading(true);
  try {
    const [hraRes, datRes] = await Promise.all([
      fetchData(CONFIG.API_HRA),
      fetchData(CONFIG.API_DAT),
    ]);

    if (hraRes && hraRes.data) {
      hraRawData = hraRes.data;
    } else {
      hraRawData = generateDemoHRA();
    }

    if (datRes && datRes.data) {
      datRawData = datRes.data;
    } else {
      datRawData = generateDemoDAT();
    }

    hraFiltered = [...hraRawData];
    datFiltered = [...datRawData];

    renderHRADashboard();
    renderDATDashboard();

    document.getElementById('lastUpdated').textContent =
      'Update: ' + new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    hideError();
  } catch (err) {
    console.error(err);
    hraRawData  = generateDemoHRA();
    datRawData  = generateDemoDAT();
    hraFiltered = [...hraRawData];
    datFiltered = [...datRawData];
    renderHRADashboard();
    renderDATDashboard();
    showError('Gagal memuat data dari server. Menampilkan data demo. Periksa konfigurasi API_URL.');
  } finally {
    showLoading(false);
  }
}

async function fetchData(url) {
  if (!url || url.startsWith('YOUR_')) return null;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ─── DEMO DATA ────────────────────────────────────────────── */
const KAPAL_LIST = [
  'KM Nusa Bahari','KM Samudera Jaya','KM Pelabuhan Raya','KM Bahari Indah',
  'KM Nusa Tenggara','KM Laut Biru','KM Sinar Laut','KM Mega Bahari',
  'KM Delta Maju','KM Surya Kencana','KM Tirta Nusa','KM Bintang Laut',
  'KM Garuda Sakti','KM Cakra Bahari','KM Ombak Besar'
];
const FLEET_LIST = ['FP I','FP II','FC','FGP'];
const VENDOR_LIST = ['PT Medika Utama','CV Labkes Mandiri','PT Sehat Prima','CV Klinik Maritim'];
const STATUS_HRA  = ['Selesai','Belum','Proses'];
const HAZARD_LIST = [
  'Kebisingan','Getaran','Panas Ekstrem','Debu & Partikel','Bahan Kimia',
  'Ergonomi Buruk','Pencahayaan Kurang','Biologis (Bakteri)','Asap Mesin','Kelembaban Tinggi'
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateDemoHRA() {
  const rows = [];
  const months = BULAN_HRA;
  KAPAL_LIST.forEach((kapal, ki) => {
    const fleet = FLEET_LIST[ki % FLEET_LIST.length];
    const bulan = months[ki % months.length];
    const status = Math.random() > 0.35 ? 'Selesai' : (Math.random() > 0.5 ? 'Proses' : 'Belum');
    const hazards = HAZARD_LIST
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 4) + 1)
      .join(', ');
    rows.push({
      kapal, fleet, bulan,
      vendor: pickRandom(VENDOR_LIST),
      status,
      budget: status === 'Selesai' ? CONFIG.BIAYA_PER_KAPAL_HRA : 0,
      hazard: hazards
    });
  });
  return rows;
}

function generateDemoDAT() {
  const rows = [];
  // Gunakan BULAN_DAT (Januari – Desember 2026)
  KAPAL_LIST.forEach((kapal, ki) => {
    const fleet  = FLEET_LIST[ki % FLEET_LIST.length];
    // Distribusikan kapal ke bulan Januari-Desember
    const bulan  = BULAN_DAT[ki % BULAN_DAT.length];
    const sudah  = Math.random() > 0.3;
    const crew   = sudah ? Math.floor(Math.random() * 20) + 10 : 0;
    const positif= sudah && Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0;
    const hasil  = sudah ? (positif > 0 ? 'Ada Positif' : 'Semua Negatif') : '—';
    const tindak = positif > 0
      ? 'Dirujuk ke klinik, off-sign'
      : (sudah ? 'Tidak ada tindak lanjut' : 'Belum dilaksanakan');
    const biaya  = sudah ? crew * 75000 : 0;
    rows.push({
      kapal, fleet, bulan,
      tanggal: sudah ? `${Math.floor(Math.random()*28)+1} ${bulan} 2026` : '—',
      crew, hasil, positif, tindak, biaya, sudah
    });
  });
  return rows;
}

/* ─── HRA DASHBOARD ─────────────────────────────────────────── */
function renderHRADashboard() {
  const data = hraFiltered;
  const done   = data.filter(r => r.status === 'Selesai').length;
  const proses = data.filter(r => r.status === 'Proses').length;
  const belum  = data.filter(r => r.status === 'Belum').length;
  const budget = data.reduce((s, r) => s + (r.budget || 0), 0);
  const coverage = data.length > 0 ? ((done / CONFIG.TOTAL_KAPAL) * 100).toFixed(1) : 0;

  document.getElementById('hra-total').textContent   = CONFIG.TOTAL_KAPAL;
  document.getElementById('hra-done').textContent    = done;
  document.getElementById('hra-belum').textContent   = belum + proses;
  document.getElementById('hra-budget').textContent  = formatRupiahShort(budget);
  document.getElementById('hra-coverage').textContent= coverage + '%';

  renderHRABarChart(data);
  renderHRADonutChart(data);
  renderHRAHazard();
  renderHRATable(data);
}

function renderHRABarChart(data) {
  const countPerBulan = {};
  BULAN_HRA.forEach(b => { countPerBulan[b] = { selesai: 0, proses: 0, belum: 0 }; });
  data.forEach(r => {
    if (countPerBulan[r.bulan]) {
      if (r.status === 'Selesai')      countPerBulan[r.bulan].selesai++;
      else if (r.status === 'Proses')  countPerBulan[r.bulan].proses++;
      else                             countPerBulan[r.bulan].belum++;
    }
  });
  const labels   = BULAN_HRA;
  const selesai  = labels.map(b => countPerBulan[b].selesai);
  const proses   = labels.map(b => countPerBulan[b].proses);
  const belum    = labels.map(b => countPerBulan[b].belum);

  const ctx = document.getElementById('hraBarChart').getContext('2d');
  if (hraChartBar) hraChartBar.destroy();
  hraChartBar = new Chart(ctx, {
    type: hraBarType || 'bar',
    data: {
      labels,
      datasets: [
        { label:'Selesai', data: selesai, backgroundColor:'rgba(16,185,129,0.8)', borderRadius:4 },
        { label:'Proses',  data: proses,  backgroundColor:'rgba(245,158,11,0.8)', borderRadius:4 },
        { label:'Belum',   data: belum,   backgroundColor:'rgba(239,68,68,0.7)',  borderRadius:4 },
      ]
    },
    options: chartOptions('Jumlah Kapal')
  });
}
let hraBarType = 'bar';
function toggleHRAChartType(btn, type) {
  hraBarType = type;
  document.querySelectorAll('#page-hra .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderHRABarChart(hraFiltered);
}

function renderHRADonutChart(data) {
  const fleetCount = {};
  FLEET_LIST.forEach(f => fleetCount[f] = 0);
  data.forEach(r => { if (fleetCount[r.fleet] !== undefined) fleetCount[r.fleet]++; });
  const ctx = document.getElementById('hraDonutChart').getContext('2d');
  if (hraChartDonut) hraChartDonut.destroy();
  hraChartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: FLEET_LIST,
      datasets: [{
        data: FLEET_LIST.map(f => fleetCount[f]),
        backgroundColor: ['#3b82f6','#10b981','#f59e0b','#8b5cf6'],
        borderWidth: 2, borderColor: '#fff'
      }]
    },
    options: { ...donutOptions(), plugins: { legend: { position:'bottom' } } }
  });
}

function renderHRAHazard() {
  const bulan = document.getElementById('hra-hazard-bulan').value;
  const data  = bulan ? hraFiltered.filter(r => r.bulan === bulan) : hraFiltered;
  const hazardCount = {};
  data.forEach(r => {
    if (!r.hazard) return;
    r.hazard.split(',').forEach(h => {
      const t = h.trim();
      if (t) hazardCount[t] = (hazardCount[t] || 0) + 1;
    });
  });
  const sorted = Object.entries(hazardCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max = sorted[0]?.[1] || 1;
  const container = document.getElementById('hazardList');
  if (!sorted.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px 0">Tidak ada data hazard</p>'; return; }
  container.innerHTML = sorted.map(([name, count]) => `
    <div class="hazard-item">
      <div class="hazard-name">${name}</div>
      <div class="hazard-bar-wrap">
        <div class="hazard-bar" style="width:${(count/max*100).toFixed(0)}%"></div>
      </div>
      <div class="hazard-count">${count}</div>
    </div>
  `).join('');
}

function renderHRATable(data) {
  const tbody = document.getElementById('hraTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Tidak ada data</td></tr>';
    document.getElementById('hraTableFooter').textContent = 'Tidak ada data';
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong>${r.kapal}</strong></td>
      <td><span class="badge fleet">${r.fleet}</span></td>
      <td>${r.bulan}</td>
      <td>${r.vendor || '—'}</td>
      <td><span class="badge ${statusClass(r.status)}">${r.status}</span></td>
      <td>${r.budget ? formatRupiahShort(r.budget) : '—'}</td>
    </tr>
  `).join('');
  document.getElementById('hraTableFooter').textContent =
    `Menampilkan ${data.length} dari ${hraRawData.length} data`;
}

/* ─── DAT DASHBOARD ─────────────────────────────────────────── */
function renderDATDashboard() {
  const data   = datFiltered;
  const done   = data.filter(r => r.sudah).length;
  const belum  = data.filter(r => !r.sudah).length;
  const positif= data.reduce((s,r) => s + (r.positif||0), 0);
  const crew   = data.reduce((s,r) => s + (r.crew||0), 0);
  const biaya  = data.reduce((s,r) => s + (r.biaya||0), 0);
  const cov    = ((done / CONFIG.TOTAL_KAPAL)*100).toFixed(1);

  document.getElementById('dat-done').textContent     = done;
  document.getElementById('dat-belum').textContent    = belum;
  document.getElementById('dat-positif').textContent  = positif;
  document.getElementById('dat-crew').textContent     = crew;
  document.getElementById('dat-biaya').textContent    = formatRupiahShort(biaya);
  document.getElementById('dat-coverage').textContent = cov + '%';

  renderDATBarChart(data);
  renderDATDonutChart(data);
  renderDATTindakLanjut(data);
  renderDATTable(data);
}

function renderDATBarChart(data) {
  // Gunakan BULAN_DAT: Januari – Desember 2026
  const countPerBulan = {};
  BULAN_DAT.forEach(b => { countPerBulan[b] = { crew: 0, positif: 0 }; });
  data.forEach(r => {
    if (countPerBulan[r.bulan]) {
      countPerBulan[r.bulan].crew    += (r.crew||0);
      countPerBulan[r.bulan].positif += (r.positif||0);
    }
  });
  // Label singkat untuk chart
  const labels  = BULAN_DAT.map(b => b.slice(0,3));
  const crewArr = BULAN_DAT.map(b => countPerBulan[b].crew);
  const posArr  = BULAN_DAT.map(b => countPerBulan[b].positif);

  const ctx = document.getElementById('datBarChart').getContext('2d');
  if (datChartBar) datChartBar.destroy();
  datChartBar = new Chart(ctx, {
    type: datBarType || 'bar',
    data: {
      labels,
      datasets: [
        { label:'Crew Diperiksa', data: crewArr, backgroundColor:'rgba(59,130,246,0.8)', borderRadius:4 },
        { label:'Positif',        data: posArr,  backgroundColor:'rgba(239,68,68,0.8)',  borderRadius:4 },
      ]
    },
    options: chartOptions('Jumlah Crew')
  });
}
let datBarType = 'bar';
function toggleDATChartType(btn, type) {
  datBarType = type;
  document.querySelectorAll('#page-dat .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderDATBarChart(datFiltered);
}

function renderDATDonutChart(data) {
  const neg = data.filter(r => r.hasil === 'Semua Negatif').length;
  const pos = data.filter(r => r.hasil === 'Ada Positif').length;
  const nil = data.filter(r => r.hasil === '—').length;
  const ctx = document.getElementById('datDonutChart').getContext('2d');
  if (datChartDonut) datChartDonut.destroy();
  datChartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Semua Negatif','Ada Positif','Belum Test'],
      datasets: [{
        data: [neg, pos, nil],
        backgroundColor: ['#10b981','#ef4444','#94a3b8'],
        borderWidth: 2, borderColor: '#fff'
      }]
    },
    options: { ...donutOptions(), plugins: { legend: { position:'bottom' } } }
  });
}

function renderDATTindakLanjut(data) {
  const pos = data.filter(r => r.positif > 0);
  const container = document.getElementById('datTindakLanjut');
  if (!pos.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px 0">Tidak ada crew positif yang perlu tindak lanjut.</p>';
    return;
  }
  container.innerHTML = pos.map(r => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px">${r.kapal} <span class="badge fleet">${r.fleet}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${r.bulan} 2026 · ${r.positif} crew positif</div>
      <div style="font-size:12px;color:#d97706;margin-top:4px"><i class="fas fa-arrow-right" style="font-size:10px"></i> ${r.tindak}</div>
    </div>
  `).join('');
}

function renderDATTable(data) {
  const tbody = document.getElementById('datTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">Tidak ada data</td></tr>';
    document.getElementById('datTableFooter').textContent = 'Tidak ada data';
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong>${r.kapal}</strong></td>
      <td><span class="badge fleet">${r.fleet}</span></td>
      <td>${r.bulan} 2026</td>
      <td>${r.crew || '—'}</td>
      <td><span class="badge ${hasilClass(r.hasil)}">${r.hasil}</span></td>
      <td>${r.positif || '—'}</td>
      <td style="font-size:11px">${r.tindak}</td>
    </tr>
  `).join('');
  document.getElementById('datTableFooter').textContent =
    `Menampilkan ${data.length} dari ${datRawData.length} data`;
}

/* ─── FILTER HRA ─────────────────────────────────────────────── */
function applyHRAFilters() {
  const bulan = document.getElementById('hra-filter-bulan').value;
  const fleet = document.getElementById('hra-filter-fleet').value;
  const kapal = document.getElementById('hra-filter-kapal').value.toLowerCase();
  hraFiltered = hraRawData.filter(r =>
    (!bulan || r.bulan === bulan) &&
    (!fleet || r.fleet === fleet) &&
    (!kapal || r.kapal.toLowerCase().includes(kapal))
  );
  renderHRADashboard();
}
function clearHRAFilters() {
  document.getElementById('hra-filter-bulan').value = '';
  document.getElementById('hra-filter-fleet').value = '';
  document.getElementById('hra-filter-kapal').value = '';
  hraFiltered = [...hraRawData];
  renderHRADashboard();
}

/* ─── FILTER DAT ─────────────────────────────────────────────── */
function applyDATFilters() {
  const bulan = document.getElementById('dat-filter-bulan').value;
  const fleet = document.getElementById('dat-filter-fleet').value;
  const kapal = document.getElementById('dat-filter-kapal').value.toLowerCase();
  datFiltered = datRawData.filter(r =>
    (!bulan || r.bulan === bulan) &&
    (!fleet || r.fleet === fleet) &&
    (!kapal || r.kapal.toLowerCase().includes(kapal))
  );
  renderDATDashboard();
}
function clearDATFilters() {
  document.getElementById('dat-filter-bulan').value = '';
  document.getElementById('dat-filter-fleet').value = '';
  document.getElementById('dat-filter-kapal').value = '';
  datFiltered = [...datRawData];
  renderDATDashboard();
}

/* ─── SEARCH TABLE ──────────────────────────────────────────── */
function searchHRATable() {
  const q = document.getElementById('hra-search').value.toLowerCase();
  const filtered = q
    ? hraFiltered.filter(r =>
        r.kapal.toLowerCase().includes(q) ||
        r.fleet.toLowerCase().includes(q) ||
        r.bulan.toLowerCase().includes(q) ||
        (r.vendor||'').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      )
    : hraFiltered;
  renderHRATable(filtered);
}
function searchDATTable() {
  const q = document.getElementById('dat-search').value.toLowerCase();
  const filtered = q
    ? datFiltered.filter(r =>
        r.kapal.toLowerCase().includes(q) ||
        r.fleet.toLowerCase().includes(q) ||
        r.bulan.toLowerCase().includes(q) ||
        (r.hasil||'').toLowerCase().includes(q)
      )
    : datFiltered;
  renderDATTable(filtered);
}

/* ─── SORT TABLE ─────────────────────────────────────────────── */
function sortHRATable(col) {
  if (hraSortState.col === col) hraSortState.asc = !hraSortState.asc;
  else { hraSortState.col = col; hraSortState.asc = true; }
  const keys = ['kapal','fleet','bulan','vendor','status','budget'];
  const k = keys[col];
  hraFiltered.sort((a,b) => {
    const av = a[k] || '', bv = b[k] || '';
    return hraSortState.asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  renderHRATable(hraFiltered);
}
function sortDATTable(col) {
  if (datSortState.col === col) datSortState.asc = !datSortState.asc;
  else { datSortState.col = col; datSortState.asc = true; }
  const keys = ['kapal','fleet','bulan','crew','hasil','positif','tindak'];
  const k = keys[col];
  datFiltered.sort((a,b) => {
    const av = a[k] ?? '', bv = b[k] ?? '';
    if (typeof av === 'number') return datSortState.asc ? av-bv : bv-av;
    return datSortState.asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  renderDATTable(datFiltered);
}

/* ─── CHART OPTIONS ─────────────────────────────────────────── */
function chartOptions(yLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position:'top', labels:{ font:{ family:'Nunito', size:11 } } } },
    scales: {
      x: { ticks:{ font:{ family:'Nunito', size:10 } }, grid:{ display:false } },
      y: { ticks:{ font:{ family:'Nunito', size:10 } }, title:{ display:true, text:yLabel, font:{ size:11 } } }
    }
  };
}
function donutOptions() {
  return {
    responsive: true, maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { labels:{ font:{ family:'Nunito', size:11 } } } }
  };
}

/* ─── STATUS BADGE CLASS ──────────────────────────────────────── */
function statusClass(s) {
  if (s === 'Selesai') return 'done';
  if (s === 'Proses')  return 'proses';
  return 'belum';
}
function hasilClass(h) {
  if (h === 'Semua Negatif') return 'done';
  if (h === 'Ada Positif')   return 'belum';
  return 'proses';
}

/* ─── UI HELPERS ─────────────────────────────────────────────── */
function showLoading(v) {
  document.getElementById('loadingOverlay').style.display = v ? 'flex' : 'none';
}
function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorBanner').style.display = 'flex';
}
function hideError() {
  document.getElementById('errorBanner').style.display = 'none';
}

/* ─── INIT ───────────────────────────────────────────────────── */
loadAllData();
