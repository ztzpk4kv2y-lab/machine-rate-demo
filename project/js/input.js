// ===== 入力画面ロジック =====

let selectedMachineId = null;
let selectedLotId = null;
let isNewLot = false;
let lunchBreak = -1;
let eveningBreak = -1;
let lastUsedDate = null;


document.addEventListener('DOMContentLoaded', () => {
  initOnlineStatus();
  renderMachineGrid();
  setTodayDate();
  bindFormEvents();
  bindBreakToggle();
});

// オンライン状態
function initOnlineStatus() {
  const badge = document.getElementById('online-status');
  function update() {
    if (navigator.onLine) {
      badge.textContent = '● オンライン';
      badge.className = 'status-badge online';
    } else {
      badge.textContent = '● オフライン中 - 自動保存されます';
      badge.className = 'status-badge offline';
    }
  }
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

// 今日の日付をセット
function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('input-date').value = today;
}

// STEP1: 機械グリッド描画
function renderMachineGrid() {
  const grid = document.getElementById('machine-grid');
  grid.innerHTML = '';
  MACHINES.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'machine-btn';
    btn.innerHTML = `<span class="process-label">${m.process}</span>${m.name}`;
    btn.addEventListener('click', () => selectMachine(m.id, btn));
    grid.appendChild(btn);
  });
}

// 機械選択
function selectMachine(machineId, btnEl) {
  selectedMachineId = machineId;
  const machine = MACHINES.find(m => m.id === machineId);
  document.querySelectorAll('.machine-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  document.getElementById('selected-machine-label').textContent =
    `選択中：${machine.process} - ${machine.name}`;
  renderActiveLots(machineId);
  showStep('step2');
}

// 進行中ロット描画
function renderActiveLots(machineId) {
  const container = document.getElementById('active-lots');
  const activeLots = LOTS.filter(l => l.machineId === machineId && l.status === '進行中');

  if (activeLots.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;font-size:13px;padding:8px 0;">進行中のロットはありません</p>';
    return;
  }

  container.innerHTML = '<p style="font-size:13px;font-weight:600;color:#4b5563;margin-bottom:8px;">進行中のロット</p>';
  activeLots.forEach(lot => {
    const product = PRODUCTS.find(p => p.id === lot.productId);
    const card = document.createElement('div');
    card.className = 'lot-card';
    card.innerHTML = `
      <div class="lot-card-title">🔄 ${lot.lotNumber}</div>
      <div class="lot-card-sub">${product?.name || ''}</div>
      <div class="lot-card-sub">開始日：${lot.startDate}</div>
    `;
    card.addEventListener('click', () => selectLot(lot.id, card));
    container.appendChild(card);
  });
}

// ロット選択
function selectLot(lotId, cardEl) {
  selectedLotId = lotId;
  isNewLot = false;
  const lot = LOTS.find(l => l.id === lotId);
  const product = PRODUCTS.find(p => p.id === lot.productId);
  const machine = MACHINES.find(m => m.id === selectedMachineId);
  document.querySelectorAll('.lot-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  document.getElementById('product-group').classList.add('hidden');
  document.getElementById('lot-number-group').classList.add('hidden');
  document.getElementById('selected-info-label').textContent =
    `${machine.name} ／ ${lot.lotNumber} ／ ${product?.name || ''}`;
  showStep('step3');
}

// 新規ロット
document.getElementById('btn-new-lot').addEventListener('click', () => {
  selectedLotId = null;
  isNewLot = true;
  const machine = MACHINES.find(m => m.id === selectedMachineId);
  document.getElementById('product-group').classList.remove('hidden');
  document.getElementById('lot-number-group').classList.remove('hidden');
  const select = document.getElementById('input-product');
  select.innerHTML = '<option value="">選択してください</option>';
  PRODUCTS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name}（${(p.shotCount ?? 0).toLocaleString()}shot/h）`;
    select.appendChild(opt);
  });
  document.getElementById('selected-info-label').textContent =
    `${machine.name} ／ 新規ロット`;
  showStep('step3');
});

// 休憩トグル
function bindBreakToggle() {
  document.querySelectorAll('.break-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const val = parseInt(btn.dataset.val);
      document.querySelectorAll(`.break-btn[data-type="${type}"]`).forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      if (type === 'lunch') lunchBreak = val;
      if (type === 'evening') eveningBreak = val;
      updateBreakTotal();
      updatePreview();
      document.getElementById('break-box').classList.remove('break-error');
    });
  });
}

// 休憩合計表示
function updateBreakTotal() {
  const display = document.getElementById('break-total-display');
  if (lunchBreak === -1 || eveningBreak === -1) {
    display.textContent = '-- 選択してください';
    document.getElementById('break-hidden').value = -1;
    return;
  }
  const total = lunchBreak + eveningBreak;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}（${total}分）`
    : `0:${String(m).padStart(2, '0')}（${total}分）`;
  display.textContent = timeStr;
  document.getElementById('break-hidden').value = total;
}

// リアルタイムプレビュー
function bindFormEvents() {
  ['input-start', 'input-end', 'input-trouble'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
  });
}

function updatePreview() {
  const start = document.getElementById('input-start').value;
  const end = document.getElementById('input-end').value;
  const breakTime = parseInt(document.getElementById('break-hidden').value);
  const trouble = parseInt(document.getElementById('input-trouble').value || 0);

  if (!start || !end || breakTime === -1) return;

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const workingMin = Math.max(0, (endMin - startMin) - breakTime - trouble);
  const machineRate = workingMin / (7.5 * 60);

  document.getElementById('prev-working-time').textContent =
    `${Math.floor(workingMin / 60)}h${workingMin % 60}m`;
  document.getElementById('prev-machine-rate').textContent =
    `${(machineRate * 100).toFixed(1)}%`;

  const rateEl = document.getElementById('prev-machine-rate');
  if (machineRate >= 0.8) rateEl.style.color = '#16a34a';
  else if (machineRate >= 0.5) rateEl.style.color = '#d97706';
  else rateEl.style.color = '#dc2626';
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// フォーム送信
document.getElementById('input-form').addEventListener('submit', (e) => {
  e.preventDefault();

  // 休憩未選択チェック
  if (lunchBreak === -1 || eveningBreak === -1) {
    document.getElementById('break-box').classList.add('break-error');
    showErrorPopup('休憩時間を選択してください。\n昼休憩・夕方休憩の両方を選択する必要があります。');
    return;
  }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '保存中...';

  const date = document.getElementById('input-date').value;
  lastUsedDate = date;
  const startTime = document.getElementById('input-start').value;
  const endTime = document.getElementById('input-end').value;
  const breakTime = parseInt(document.getElementById('break-hidden').value);
  const troubleTime = parseInt(document.getElementById('input-trouble').value || 0);
  const troubleReason = document.getElementById('input-trouble-reason').value.trim();
  const overtimeTime = parseInt(document.getElementById('input-overtime').value || 0);
  const goodProduction = parseInt(document.getElementById('input-good').value || 0);
  const note = document.getElementById('input-note').value.trim();
  const lotComplete = document.getElementById('input-lot-complete').checked;

  if (isNewLot) {
    const productId = document.getElementById('input-product').value;
    const lotNumber = document.getElementById('input-lot-number').value;
    if (!productId || !lotNumber) {
      showErrorPopup('製品とロット番号を入力してください。');
      btn.disabled = false;
      btn.textContent = '入力を保存する';
      return;
    }
    const newLot = {
      id: 'l' + Date.now(),
      machineId: selectedMachineId,
      productId,
      lotNumber,
      startDate: date,
      endDate: lotComplete ? date : null,
      status: lotComplete ? '完了' : '進行中',
      completedDate: lotComplete ? date : null,
    };
    LOTS.push(newLot);
    selectedLotId = newLot.id;
  } else if (lotComplete && selectedLotId) {
    const lot = LOTS.find(l => l.id === selectedLotId);
    if (lot) {
      lot.status = '完了';
      lot.endDate = date;
      lot.completedDate = date;
    }
  }

  const newRecord = {
    id: 'r' + Date.now(),
    lotId: selectedLotId,
    machineId: selectedMachineId,
    date,
    startTime,
    endTime,
    breakTime,
    troubleTime,
    troubleReason,
    overtimeTime,
    goodProduction,
    note,
  };
  RECORDS.push(newRecord);

  setTimeout(() => {
    showStep('step-complete');
    btn.disabled = false;
    btn.textContent = '入力を保存する';
  }, 600);
});

// エラーポップアップ
function showErrorPopup(message) {
  const existing = document.getElementById('error-popup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'error-popup';
  popup.className = 'error-popup';
  popup.innerHTML = `
    <div class="error-popup-inner">
      <div class="error-popup-icon">⚠️</div>
      <div class="error-popup-message">${message.replace(/\n/g, '<br>')}</div>
      <button class="btn btn-primary" onclick="document.getElementById('error-popup').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// 同じ機械で別ロットを入力
document.getElementById('btn-continue-lot')?.addEventListener('click', () => {
  selectedLotId = null;
  isNewLot = false;
  lunchBreak = -1;
  eveningBreak = -1;
  document.getElementById('input-form').reset();
  document.getElementById('break-hidden').value = -1;
  document.getElementById('break-total-display').textContent = '-- 選択してください';
  document.querySelectorAll('.break-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('break-box').classList.remove('break-error');
  document.getElementById('input-date').value = lastUsedDate;
  document.getElementById('input-trouble-reason').value = '';
  const machine = MACHINES.find(m => m.id === selectedMachineId);
  document.getElementById('selected-machine-label').textContent =
    `選択中：${machine.process} - ${machine.name}`;
  renderActiveLots(selectedMachineId);
  showStep('step2');
});

// 別の機械を選ぶ
document.getElementById('btn-back').addEventListener('click', () => {
  selectedMachineId = null;
  selectedLotId = null;
  isNewLot = false;
  lunchBreak = -1;
  eveningBreak = -1;
  document.getElementById('input-form').reset();
  document.getElementById('break-hidden').value = -1;
  document.getElementById('break-total-display').textContent = '-- 選択してください';
  document.querySelectorAll('.break-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('break-box').classList.remove('break-error');
  document.getElementById('input-trouble-reason').value = '';
  setTodayDate();
  document.querySelectorAll('.machine-btn').forEach(b => b.classList.remove('selected'));
  showStep('step1');
});

function showStep(stepId) {
  ['step1', 'step2', 'step3', 'step-complete'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
