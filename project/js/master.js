// ===== マスタ管理ロジック =====

document.addEventListener('DOMContentLoaded', () => {
  renderMachineTable();
  renderProductTable();
  bindTabEvents();
  bindFormEvents();
});

// タブ切り替え
function bindTabEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tab-machines').classList.toggle('hidden', tab !== 'machines');
      document.getElementById('tab-products').classList.toggle('hidden', tab !== 'products');
    });
  });
}

// フォームイベント
function bindFormEvents() {
  document.getElementById('machine-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const process = document.getElementById('m-process').value.trim();
    const name = document.getElementById('m-name').value.trim();
    const breakTime = parseInt(document.getElementById('m-break').value);
    if (!process || !name) return;
    MACHINES.push({ id: 'm' + Date.now(), process, name, breakTime });
    renderMachineTable();
    e.target.reset();
  });

  document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('p-name').value.trim();
    const shotCount = parseInt(document.getElementById('p-shot').value);
    if (!name || !shotCount) return;
    PRODUCTS.push({ id: 'p' + Date.now(), name, shotCount });
    renderProductTable();
    e.target.reset();
  });
}

// 機械テーブル
function renderMachineTable() {
  const tbody = document.getElementById('machine-tbody');
  tbody.innerHTML = '';
  MACHINES.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.process}</td>
      <td>${m.name}</td>
      <td>${m.breakTime === 60 ? '1:00' : '0:15'}</td>
      <td><button class="btn btn-danger" onclick="deleteMachine('${m.id}')">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// 品目テーブル
function renderProductTable() {
  const tbody = document.getElementById('product-tbody');
  tbody.innerHTML = '';
  PRODUCTS.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.shotCount.toLocaleString()}</td>
      <td><button class="btn btn-danger" onclick="deleteProduct('${p.id}')">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteMachine(id) {
  if (!confirm('削除しますか？')) return;
  const idx = MACHINES.findIndex(m => m.id === id);
  if (idx !== -1) MACHINES.splice(idx, 1);
  renderMachineTable();
}

function deleteProduct(id) {
  if (!confirm('削除しますか？')) return;
  const idx = PRODUCTS.findIndex(p => p.id === id);
  if (idx !== -1) PRODUCTS.splice(idx, 1);
  renderProductTable();
}
