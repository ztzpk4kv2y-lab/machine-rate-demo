// dashboard.js

let currentMonth = null;
let currentYear = null;
let currentView = 'month';

window.addEventListener('load', () => {
  const now = new Date();
  currentMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
  currentYear = now.getFullYear();
  renderDashboard();

  document.getElementById('viewMonthBtn')?.addEventListener('click', () => switchView('month'));
  document.getElementById('viewYearBtn')?.addEventListener('click', () => switchView('year'));

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
  currentView = view;
  const monthBtn = document.getElementById('viewMonthBtn');
  const yearBtn = document.getElementById('viewYearBtn');
  const yearlyView = document.getElementById('yearlyView');
  const monthlyElements = document.querySelectorAll('.monthly-only');

  if (view === 'month') {
    monthBtn?.classList.add('active');
    yearBtn?.classList.remove('active');
    if (yearlyView) yearlyView.style.display = 'none';
    monthlyElements.forEach(el => el.style.display = '');
  } else {
    monthBtn?.classList.remove('active');
    yearBtn?.classList.add('active');
    if (yearlyView) yearlyView.style.display = 'block';
    monthlyElements.forEach(el => el.style.display = 'none');
    renderYearlyView();
  }
}

function renderDashboard() {
  updateMonthDisplay();
  renderKPI();
  renderProcessMap();
  renderMachineRanking();
  renderOEERanking();
}

function updateMonthDisplay() {
  const el = document.getElementById('currentMonth');
  if (el) el.textContent = `${currentMonth.year}年 ${currentMonth.month}月`;
}

document.getElementById('prevMonth')?.addEventListener('click', () => {
  currentMonth.month--;
  if (currentMonth.month < 1) { currentMonth.month = 12; currentMonth.year--; }
  renderDashboard();
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
  currentMonth.month++;
  if (currentMonth.month > 12) { currentMonth.month = 1; currentMonth.year++; }
  renderDashboard();
});

function renderKPI() {
  const stats = MACHINES.map(m => getMachineMonthStats(m.id, currentMonth.year, currentMonth.month));
  const valid = stats.filter(s => s && s.machineRate != null);

  const rates = valid.map(s => s.machineRate * 100);
  const avg = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
  const max = rates.length ? Math.max(...rates) : 0;
  const low = rates.filter(r => r < 70).length;
  const active = valid.filter(s => s.workdayCount > 0).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('avgRate', avg.toFixed(1) + '%');
  set('maxRate', max.toFixed(1) + '%');
  set('lowCount', low + '台');
  set('activeCount', active + '台');
}

function renderProcessMap() {
  const container = document.getElementById('processMap');
  if (!container) return;

  const processes = [...new Set(MACHINES.map(m => m.process))];
  container.innerHTML = processes.map(proc => {
    const machines = MACHINES.filter(m => m.process === proc);
    const chips = machines.map(m => {
      const stats = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
      const rate = stats ? stats.machineRate * 100 : 0;
      const color = !stats ? 'nodata' : rate >= 80 ? 'good' : rate >= 50 ? 'warn' : 'bad';
      return `<a href="machine.html?id=${m.id}" class="machine-chip ${color}">${m.name}<br>${stats ? rate.toFixed(1) + '%' : 'データなし'}</a>`;
    }).join('');
    return `<div class="process-section"><div class="process-title">${proc}</div><div class="machine-chips">${chips}</div></div>`;
  }).join('');
}

function renderMachineRanking() {
  const container = document.getElementById('machineRanking');
  if (!container) return;

  const stats = MACHINES.map(m => {
    const s = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
    return { name: m.name, id: m.id, rate: s ? s.machineRate * 100 : 0 };
  }).sort((a, b) => b.rate - a.rate);

  container.innerHTML = stats.map((s, i) => `
    <a href="machine.html?id=${s.id}" class="ranking-item">
      <span class="rank-no">${i + 1}</span>
      <span class="rank-name">${s.name}</span>
      <span class="rank-value">${s.rate.toFixed(1)}%</span>
    </a>
  `).join('');
}

function renderOEERanking() {
  const container = document.getElementById('oeeRanking');
  if (!container) return;

  const stats = MACHINES.map(m => {
    const s = getMachineMonthStats(m.id, currentMonth.year, currentMonth.month);
    return { name: m.name, id: m.id, oee: s ? s.oee * 100 : 0 };
  }).sort((a, b) => b.oee - a.oee);

  container.innerHTML = stats.map((s, i) => `
    <a href="machine.html?id=${s.id}" class="ranking-item">
      <span class="rank-no">${i + 1}</span>
      <span class="rank-name">${s.name}</span>
      <span class="rank-value">${s.oee.toFixed(1)}%</span>
    </a>
  `).join('');
}

function renderYearlyView() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = `${currentYear}年`;

  const container = document.getElementById('yearlyTable');
  if (!container) return;

  let html = '<table class="yearly-table"><thead><tr><th>機械名</th>';
  for (let m = 1; m <= 12; m++) html += `<th>${m}月</th>`;
  html += '<th>年平均</th></tr></thead><tbody>';

  MACHINES.forEach(machine => {
    let sum = 0, count = 0;
    html += `<tr><td><a href="machine.html?id=${machine.id}">${machine.name}</a></td>`;

    for (let m = 1; m <= 12; m++) {
      const stats = getMachineMonthStats(machine.id, currentYear, m);
      const rate = stats ? stats.machineRate * 100 : null;
      if (rate != null) { sum += rate; count++; }
      const display = rate != null ? rate.toFixed(1) + '%' : '-';
      const colorClass = rate == null ? '' : rate >= 80 ? 'cell-good' : rate >= 50 ? 'cell-warn' : 'cell-bad';
      html += `<td class="${colorClass}">${display}</td>`;
    }

    const yearAvg = count ? (sum / count).toFixed(1) + '%' : '-';
    html += `<td class="year-avg">${yearAvg}</td></tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}
