// dashboard.js

let currentMonth = { year: 2026, month: 1 };
let currentYear = 2026;
let currentMetric = 'rate';

window.addEventListener('load', () => {
  renderDashboard();

  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentMonth.month--;
    if (currentMonth.month < 1) { currentMonth.month = 12; currentMonth.year--; }
    renderDashboard();
  });

  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentMonth.month++;
    if (currentMonth.month > 12) { currentMonth.month = 1; currentMonth.year++; }
    renderDashboard();
  });

  document.getElementById('viewMonthBtn')?.addEventListener('click', () => switchView('month'));
  document.getElementById('viewYearBtn')?.addEventListener('click', () => switchView('year'));
  document.getElementById('metricRateBtn')?.addEventListener('click', () => switchMetric('rate'));
  document.getElementById('metricOeeBtn')?.addEventListener('click', () => switchMetric('oee'));

  document.getElementById('prevYear')?.addEventListener('click', () => {
    currentYear--;
    renderYearlyView();
  });

  document.getElementById('nextYear')?.addEventListener('click', () => {
    currentYear++;
    renderYearlyView();
  });
});

function switchView(view) {
  const monthBtn = document.getElementById('viewMonthBtn');
  const yearBtn = document.getElementById('viewYearBtn');
  const yearlyView = document.getElementById('yearlyView');
  const monthlyOnly = document.querySelectorAll('.monthly-only');

  if (view === 'month') {
    monthBtn?.classList.add('active');
    yearBtn?.classList.remove('active');
    if (yearlyView) yearlyView.style.display = 'none';
    monthlyOnly.forEach(el => el.style.display = '');
  } else {
    monthBtn?.classList.remove('active');
    yearBtn?.classList.add('active');
    if (yearlyView) yearlyView.style.display = 'block';
    monthlyOnly.forEach(el => el.style.display = 'none');
    renderYearlyView();
  }
}

function switchMetric(metric) {
  currentMetric = metric;
  const rateBtn = document.getElementById('metricRateBtn');
  const oeeBtn = document.getElementById('metricOeeBtn');
  const title = document.getElementById('yearlyTableTitle');

  if (metric === 'rate') {
    rateBtn?.classList.add('active');
    oeeBtn?.classList.remove('active');
    if (title) title.textContent = '年間　稼働率比較';
  } else {
    rateBtn?.classList.remove('active');
    oeeBtn?.classList.add('active');
    if (title) title.textContent = '年間　OEE比較';
  }
  renderYearlyView();
}

function renderDashboard() {
  const titleEl = document.getElementById('month-title');
  if (titleEl) titleEl.textContent = `${currentMonth.year}年 ${currentMonth.month}月`;

  renderKPI();
  renderProcessMap();
  renderOEERanking();
  renderRateRanking();
  renderTrendChart();
  renderDetailTable();
  renderProductTable();
  renderTroubleRanking();
}

function renderKPI() {
  const stats = MACHINES.map(m => ({
    machine: m,
    stat: getMachineMonthStats(m.id, currentMonth.year, currentMonth.month)
  })).filter(x => x.stat !== null);

  const rates = stats.map(x => x.stat.machineRate * 100);
  const avg = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

  let maxRate = 0, maxName = '--';
  stats.forEach(x => {
    const r = x.stat.machineRate * 100;
    if (r > maxRate) { maxRate = r; maxName = x.machine.name; }
  });

  const low = rates.filter(r => r < 50).length;
  const active = stats.filter(x => x.stat.operatingDays > 0).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('kpi-avg', avg.toFixed(1) + '%');
  set('kpi-max', maxRate.toFixed(1) + '%');
  set('kpi-max-name', maxName);
  set('kpi-low', low + '台');
  set('kpi-active', active + '台');
}

function renderProcessMap() {
  const container = document.getElementById('process-map');
  if (!container) return;

  const processes = [...new Set(MACHINES.map(m => m.process))];
  container.innerHTML = processes.map(proc => {
    const machines = MACHINES.filter(m => m.process === proc);
    const chips = machines.map(m => {
      const stat = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
      if (!stat) {
        return `<a href="machine.html?id=${m.id}" style="display:inline-block;margin:4px;padding:8px 12px;border-radius:8px;background:#e5e7eb;color:#374151;text-decoration:none;">${m.name}<br>データなし</a>`;
      }
      const rate = stat.machineRate * 100;
      const bg = rate >= 80 ? '#dcfce7' : rate >= 50 ? '#fef9c3' : '#fee2e2';
      const color = rate >= 80 ? '#166534' : rate >= 50 ? '#854d0e' : '#991b1b';
      return `<a href="machine.html?id=${m.id}" style="display:inline-block;margin:4px;padding:8px 12px;border-radius:8px;background:${bg};color:${color};text-decoration:none;font-weight:bold;">${m.name}<br>${rate.toFixed(1)}%</a>`;
    }).join('');
    return `<div style="margin-bottom:16px;"><div style="font-weight:bold;margin-bottom:6px;">${proc}</div><div>${chips}</div></div>`;
  }).join('');
}

function renderOEERanking() {
  const container = document.getElementById('oee-ranking');
  if (!container) return;

  const stats = MACHINES.map(m => {
    const s = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
    return { name: m.name, id: m.id, oee: s ? s.oee * 100 : 0, hasData: !!s };
  }).sort((a, b) => b.oee - a.oee);

  container.innerHTML = stats.map((s, i) => `
    <a href="machine.html?id=${s.id}" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;text-decoration:none;color:#111827;">
      <span>${i + 1}. ${s.name}</span>
      <span style="font-weight:bold;">${s.hasData ? s.oee.toFixed(1) + '%' : 'データなし'}</span>
    </a>
  `).join('');
}

function renderRateRanking() {
  const container = document.getElementById('rate-ranking');
  if (!container) return;

  const stats = MACHINES.map(m => {
    const s = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
    return { name: m.name, id: m.id, rate: s ? s.machineRate * 100 : 0, hasData: !!s };
  }).sort((a, b) => b.rate - a.rate);

  container.innerHTML = stats.map((s, i) => `
    <a href="machine.html?id=${s.id}" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;text-decoration:none;color:#111827;">
      <span>${i + 1}. ${s.name}</span>
      <span style="font-weight:bold;">${s.hasData ? s.rate.toFixed(1) + '%' : 'データなし'}</span>
    </a>
  `).join('');
}

let trendChartInstance = null;

function renderTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = [];
  const data = [];
  for (let m = 1; m <= 6; m++) {
    const monthStats = MACHINES.map(mc => getMachineMonthStats(mc.id, currentMonth.year, m)).filter(s => s !== null);
    const rates = monthStats.map(s => s.machineRate * 100);
    const avg = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : null;
    labels.push(`${m}月`);
    data.push(avg !== null ? avg.toFixed(1) : null);
  }

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '工場平均稼働率(%)',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      scales: { y: { min: 0, max: 120 } }
    }
  });
}

function renderDetailTable() {
  const tbody = document.getElementById('detail-tbody');
  if (!tbody) return;

  tbody.innerHTML = MACHINES.map(m => {
    const s = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
    if (!s) {
      return `<tr><td>${m.process}</td><td>${m.name}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>データなし</td></tr>`;
    }
    const rate = (s.machineRate * 100).toFixed(1);
    const oee = (s.oee * 100).toFixed(1);
    const quality = (s.qualityRate * 100).toFixed(1);
    const status = s.machineRate * 100 >= 80 ? '良好' : s.machineRate * 100 >= 50 ? '注意' : '要確認';
    return `<tr>
      <td>${m.process}</td>
      <td><a href="machine.html?id=${m.id}">${m.name}</a></td>
      <td>${rate}%</td>
      <td>${oee}%</td>
      <td>${quality}%</td>
      <td>${s.totalTroubleMin}分</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

function renderProductTable() {
  const tbody = document.getElementById('product-tbody');
  if (!tbody) return;

  const monthStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;

  tbody.innerHTML = PRODUCTS.map(p => {
    const recs = RECORDS.filter(r => r.productId === p.id && r.date.startsWith(monthStr));
    if (recs.length === 0) {
      return `<tr><td>${p.name}</td><td>0</td><td>-</td><td>-</td><td>-</td></tr>`;
    }
    const lots = new Set(recs.map(r => r.lotId)).size;
    const totalGood = recs.reduce((s, r) => s + r.goodProduction, 0);
    const totalRaw = recs.reduce((s, r) => s + Math.round(r.goodProduction / r.qualityRate), 0);
    const qualityRate = totalRaw > 0 ? (totalGood / totalRaw * 100).toFixed(1) : '-';

    return `<tr>
      <td>${p.name}</td>
      <td>${lots}</td>
      <td>${totalRaw.toLocaleString()}</td>
      <td>${totalGood.toLocaleString()}</td>
      <td>${qualityRate}%</td>
    </tr>`;
  }).join('');
}

function renderTroubleRanking() {
  const container = document.getElementById('trouble-ranking');
  if (!container) return;

  const monthStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;

  const stats = MACHINES.map(m => {
    const total = RECORDS.filter(r => r.machineId === m.id && r.date.startsWith(monthStr))
      .reduce((s, r) => s + r.troubleTime, 0);
    return { name: m.name, id: m.id, total };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  if (stats.length === 0) {
    container.innerHTML = '<p style="color:#6b7280;">この月はトラブル停止の記録がありません。</p>';
    return;
  }

  container.innerHTML = stats.map((s, i) => `
    <a href="machine.html?id=${s.id}" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb;text-decoration:none;color:#111827;">
      <span>${i + 1}. ${s.name}</span>
      <span style="font-weight:bold;color:#dc2626;">${s.total}分</span>
    </a>
  `).join('');
}

function renderYearlyView() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = `${currentYear}年`;

  const container = document.getElementById('yearlyTable');
  if (!container) return;

  let html = '<table class="data-table"><thead><tr><th>機械名</th>';
  for (let m = 1; m <= 12; m++) html += `<th>${m}月</th>`;
  html += '<th>年平均</th></tr></thead><tbody>';

  MACHINES.forEach(machine => {
    let sum = 0, count = 0;
    html += `<tr><td><a href="machine.html?id=${machine.id}">${machine.name}</a></td>`;

    for (let m = 1; m <= 12; m++) {
      const stats = getMachineMonthStats(machine.id, currentYear, m);
      const value = stats ? (currentMetric === 'rate' ? stats.machineRate : stats.oee) * 100 : null;
      if (value != null) { sum += value; count++; }
      const display = value != null ? value.toFixed(1) + '%' : '-';
      const bg = value == null ? '' : value >= 80 ? 'background:#dcfce7;' : value >= 50 ? 'background:#fef9c3;' : 'background:#fee2e2;';
      html += `<td style="${bg}">${display}</td>`;
    }

    const yearAvg = count ? (sum / count).toFixed(1) + '%' : '-';
    html += `<td style="font-weight:bold;background:#f1f5f9;">${yearAvg}</td></tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}
