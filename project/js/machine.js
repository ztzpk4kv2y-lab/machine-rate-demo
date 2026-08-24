// ===== 機械詳細ロジック =====

let currentYear = 2026;
let currentMonth = 1;
let machineId = null;
let machineTrendChart = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  machineId = params.get('id');

  if (!machineId) {
    alert('機械が指定されていません');
    history.back();
    return;
  }

  const machine = MACHINES.find(m => m.id === machineId);
  if (!machine) {
    alert('機械が見つかりません');
    history.back();
    return;
  }

  document.getElementById('machine-title').textContent = machine.name;
  document.getElementById('detail-process').textContent = machine.process;
  document.getElementById('detail-name').textContent = machine.name;
  document.getElementById('detail-break').textContent = `休憩：${formatMin(machine.breakTime)}`;

  renderAll();

  document.getElementById('btn-prev-month').addEventListener('click', () => {
    if (currentMonth === 1) { currentMonth = 12; currentYear--; }
    else currentMonth--;
    renderAll();
  });

  document.getElementById('btn-next-month').addEventListener('click', () => {
    if (currentMonth === 12) { currentMonth = 1; currentYear++; }
    else currentMonth++;
    renderAll();
  });
});

function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function getMonthRecords(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return RECORDS.filter(r => r.date.startsWith(monthStr));
}

function renderAll() {
  document.getElementById('month-title').textContent = `${currentYear}年 ${currentMonth}月`;
  renderSummary();
  renderTrendChart();
  renderDailyTable();
  renderTroubleHistory();
}

// 月別サマリー
function renderSummary() {
  const stats = getMachineMonthStats(machineId, currentYear, currentMonth);
  const grid = document.getElementById('summary-grid');

  if (!stats) {
    grid.innerHTML = '<p style="color:#9ca3af;font-size:13px;">この月のデータはありません</p>';
    return;
  }

  const totalMin = Math.round(stats.totalActualHours * 60);

  const items = [
    { label: '機械稼働率', value: `${(stats.machineRate * 100).toFixed(1)}%`, desc: '1日7.5hに対する実稼働時間の割合', color: getRateColor(stats.machineRate) },
    { label: 'OEE', value: `${(stats.oee * 100).toFixed(1)}%`, desc: '稼働率×性能率×良品率。生産性を示す指標', color: getRateColor(stats.oee) },
    { label: '性能率', value: `${(stats.performanceRate * 100).toFixed(1)}%`, desc: '理論目標数に対する良品数の割合', color: getRateColor(stats.performanceRate) },
    { label: '良品率', value: `${(stats.qualityRate * 100).toFixed(1)}%`, desc: '実生産数に対する良品数の割合', color: getRateColor(stats.qualityRate) },
    { label: '完了ロット数', value: `${stats.completedLots}ロット`, desc: 'この月に完了したロットの数', color: '#2563eb' },
    { label: '実稼働時間', value: `${Math.floor(totalMin / 60)}h${totalMin % 60}m`, desc: '休憩・トラブル停止を除いた実際の稼働時間', color: '#2563eb' },
    { label: 'トラブル停止', value: stats.totalTroubleMin > 0 ? `${stats.totalTroubleMin}分` : 'なし', desc: 'トラブルによる停止時間の合計', color: stats.totalTroubleMin > 0 ? '#dc2626' : '#16a34a' },
    { label: '稼働日数', value: `${stats.operatingDays}日`, desc: '実際に稼働した日数', color: '#2563eb' },
  ];

  grid.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'summary-card';
    div.innerHTML = `
      <div class="summary-label">${item.label}</div>
      <div class="summary-value" style="color:${item.color}">${item.value}</div>
      <div class="summary-desc">${item.desc}</div>
    `;
    grid.appendChild(div);
  });
}

function getRateColor(rate) {
  if (rate >= 0.8) return '#16a34a';
  if (rate >= 0.5) return '#d97706';
  return '#dc2626';
}

// 月別推移グラフ
function renderTrendChart() {
  const labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const data = labels.map((_, i) => {
    const stats = getMachineMonthStats(machineId, currentYear, i + 1);
    return stats ? parseFloat((stats.machineRate * 100).toFixed(1)) : null;
  });

  const canvas = document.getElementById('machine-trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (machineTrendChart) machineTrendChart.destroy();

  machineTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '稼働率(%)',
        data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderWidth: 2,
        pointBackgroundColor: data.map(v =>
          v === null ? '#9ca3af' : v >= 80 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626'
        ),
        pointRadius: 6,
        tension: 0.3,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.raw !== null ? `稼働率：${ctx.raw}%` : 'データなし'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 150,
          ticks: { callback: v => v + '%' },
          grid: { color: '#f3f4f6' }
        }
      }
    }
  });
}

// 日次データ一覧
function renderDailyTable() {
  const tbody = document.getElementById('daily-tbody');
  const records = getMonthRecords(currentYear, currentMonth)
    .filter(r => r.machineId === machineId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#9ca3af;">データがありません</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  records.forEach(r => {
    const lot = LOTS.find(l => l.id === r.lotId);
    const product = PRODUCTS.find(p => p.id === lot?.productId);
    const actualProduction = Math.round(r.goodProduction / r.qualityRate);

    const dateObj = new Date(r.date);
    const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateLabel}</td>
      <td>${lot?.lotNumber || '--'}</td>
      <td style="font-size:12px">${product?.name || '--'}</td>
      <td>${r.startTime}</td>
      <td>${r.endTime}</td>
      <td>${formatMin(r.breakTime)}</td>
      <td>${r.troubleTime > 0 ? `<span style="color:#dc2626;font-weight:700">${r.troubleTime}分</span>` : '-'}</td>
      <td>${Math.floor(r.actualWorkingTime / 60)}h${r.actualWorkingTime % 60}m</td>
      <td><span class="badge ${getRateBadgeClass(r.machineRate)}">${(r.machineRate * 100).toFixed(1)}%</span></td>
      <td>${actualProduction.toLocaleString()}</td>
      <td>${(r.qualityRate * 100).toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function getRateBadgeClass(rate) {
  if (rate >= 0.8) return 'badge-green';
  if (rate >= 0.5) return 'badge-yellow';
  return 'badge-red';
}

// トラブル履歴
function renderTroubleHistory() {
  const container = document.getElementById('trouble-history');
  const records = getMonthRecords(currentYear, currentMonth)
    .filter(r => r.machineId === machineId && r.troubleTime > 0)
    .sort((a, b) => b.troubleTime - a.troubleTime);

  if (records.length === 0) {
    container.innerHTML = '<p style="color:#16a34a;font-size:14px;padding:8px 0;">✅ この月はトラブル停止なし</p>';
    return;
  }

  const totalTrouble = records.reduce((s, r) => s + r.troubleTime, 0);

  container.innerHTML = `
    <div class="trouble-summary">
      合計停止時間：<strong style="color:#dc2626">${totalTrouble}分</strong>　／　発生回数：<strong>${records.length}回</strong>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'ranking-list';

  records.forEach(r => {
    const lot = LOTS.find(l => l.id === r.lotId);
    const dateObj = new Date(r.date);
    const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    const barWidth = (r.troubleTime / records[0].troubleTime) * 100;

    list.innerHTML += `
      <div class="ranking-item">
        <div class="rank-num" style="font-size:13px;width:36px">${dateLabel}</div>
        <div class="rank-name">
          ${lot?.lotNumber || '--'}
          <div class="rank-sub">${r.startTime}〜${r.endTime}</div>
        </div>
        <div class="rank-bar-wrap">
          <div class="rank-bar-bg">
            <div class="rank-bar bar-red" style="width:${barWidth}%"></div>
          </div>
        </div>
        <div class="rank-value" style="color:#dc2626">${r.troubleTime}分</div>
      </div>
    `;
  });

  container.appendChild(list);
}
