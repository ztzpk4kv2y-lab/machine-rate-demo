// =============================================
// data.js - 機械稼働率管理システム サンプルデータ
// =============================================

// 機械マスタ
const MACHINES = [
  { id: 'M001', name: 'AQUARIUS G-J6', process: '打錠工程', breakTime: 75 },
  { id: 'M002', name: 'AQUARIUS G-J2', process: '打錠工程', breakTime: 75 },
  { id: 'M003', name: 'VIRGO19', process: '打錠工程', breakTime: 75 },
  { id: 'M004', name: 'LIBRA2', process: '打錠工程', breakTime: 75 },
  { id: 'M005', name: 'TVIS-NS-VA2 4号機', process: '選別工程', breakTime: 75 },
  { id: 'M006', name: '給袋包装機1号ライン', process: '充填包装工程', breakTime: 75 },
  { id: 'M007', name: '給袋包装機2号ライン', process: '充填包装工程', breakTime: 75 },
  { id: 'M008', name: '新カートナー', process: '包装工程', breakTime: 75 },
  { id: 'M009', name: '旧カートナー', process: '包装工程', breakTime: 75 },
  { id: 'M010', name: '新ライン', process: '包装工程', breakTime: 75 },
  { id: 'M011', name: 'NIS-100SS 1号機', process: '包装工程', breakTime: 75 },
  { id: 'M012', name: 'NIS-100SS 2号機', process: '包装工程', breakTime: 75 },
  { id: 'M013', name: 'NIS-100SS 3号機', process: '包装工程', breakTime: 75 },
  { id: 'M014', name: 'シュリンク', process: '包装工程', breakTime: 75 }
];

// 製品マスタ
const PRODUCTS = [
  { id: 'P001', name: '製品アルファ', theoreticalOutput: 5000 },
  { id: 'P002', name: '製品ベータ', theoreticalOutput: 3000 },
  { id: 'P003', name: '製品ガンマ', theoreticalOutput: 8000 },
  { id: 'P004', name: '製品デルタ', theoreticalOutput: 2000 },
  { id: 'P005', name: '製品イプシロン', theoreticalOutput: 6000 }
];

// 稼働日マスタ（2026年1〜6月）
const WORKDAYS = generateWorkdays(2026, 1, 6);

function generateWorkdays(year, startMonth, endMonth) {
  const days = [];
  for (let m = startMonth; m <= endMonth; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m - 1, d);
      const dow = date.getDay();
      if (dow !== 0 && dow !== 6) {
        days.push(`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
    }
  }
  return days;
}

// レコード生成
const LOTS = [];
const RECORDS = [];

let lotSeq = 1;
let recSeq = 1;

// 機械ごとに半年分のレコードを生成
MACHINES.forEach(machine => {
  WORKDAYS.forEach(date => {
    // 約80%の確率で稼働
    if (Math.random() > 0.20) {
      const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];

      // 開始・終了時間（8:30〜17:00の範囲で変動）
      const startHour = 8;
      const startMin = Math.random() > 0.3 ? 30 : 0;
      const endHour = Math.random() > 0.2 ? 17 : 16;
      const endMin = Math.floor(Math.random() * 4) * 15;

      const startTime = `${String(startHour).padStart(2,'0')}:${String(startMin).padStart(2,'0')}`;
      const endTime = `${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}`;

      // 稼働時間（分）
      const totalMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const breakMin = machine.breakTime;
      const troubleMin = Math.random() > 0.7 ? Math.floor(Math.random() * 60) : 0;
      const actualMin = Math.max(0, totalMin - breakMin - troubleMin);
      const actualHours = actualMin / 60;

      // 稼働率（実稼働時間 ÷ 7.5h）
      const machineRate = Math.min(actualHours / 7.5, 1.2);

      // 理論目標・良品数
      const theoreticalTarget = Math.round(product.theoreticalOutput * actualHours);
      const performanceRate = 0.70 + Math.random() * 0.20; // 70〜90%
      const qualityRate = 0.95 + Math.random() * 0.04;     // 95〜99%
      const goodProduction = Math.round(theoreticalTarget * performanceRate * qualityRate);

      // ロット
      const lotId = `LOT-${String(lotSeq).padStart(4,'0')}`;
      lotSeq++;

      LOTS.push({
        id: lotId,
        machineId: machine.id,
        productId: product.id,
        lotNumber: lotId,
        date: date,
        status: 'completed'
      });

      RECORDS.push({
        id: `REC-${String(recSeq).padStart(5,'0')}`,
        lotId: lotId,
        machineId: machine.id,
        productId: product.id,
        date: date,
        startTime: startTime,
        endTime: endTime,
        breakTime: breakMin,
        troubleTime: troubleMin,
        actualWorkingTime: actualMin,
        machineRate: machineRate,
        theoreticalTarget: theoreticalTarget,
        goodProduction: goodProduction,
        performanceRate: performanceRate,
        qualityRate: qualityRate,
        oee: machineRate * performanceRate * qualityRate,
        note: troubleMin > 0 ? 'トラブル停止あり' : ''
      });

      recSeq++;
    }
  });
});

// =============================================
// 集計関数
// =============================================

function getMachineMonthStats(machineId, year, month) {
  const monthStr = `${year}-${String(month).padStart(2,'0')}`;
  const recs = RECORDS.filter(r => r.machineId === machineId && r.date.startsWith(monthStr));
  if (recs.length === 0) return null;

  const workdayCount = WORKDAYS.filter(d => d.startsWith(monthStr)).length;
  const totalActualMin = recs.reduce((s, r) => s + r.actualWorkingTime, 0);
  const totalPlannedMin = workdayCount * 7.5 * 60;
  const totalGood = recs.reduce((s, r) => s + r.goodProduction, 0);
  const totalTheoretical = recs.reduce((s, r) => s + r.theoreticalTarget, 0);
  const totalTrouble = recs.reduce((s, r) => s + r.troubleTime, 0);
  const completedLots = LOTS.filter(l => l.machineId === machineId && l.date.startsWith(monthStr) && l.status === 'completed').length;

  const avgMachineRate = totalActualMin / totalPlannedMin;
  const avgPerformanceRate = totalTheoretical > 0 ? Math.min(totalGood / totalTheoretical, 1) : 0;
  const avgQualityRate = recs.reduce((s, r) => s + r.qualityRate, 0) / recs.length;
  const oee = avgMachineRate * avgPerformanceRate * avgQualityRate;

  return {
    machineId,
    year,
    month,
    workdayCount,
    operatingDays: recs.length,
    totalActualHours: totalActualMin / 60,
    machineRate: avgMachineRate,
    performanceRate: avgPerformanceRate,
    qualityRate: avgQualityRate,
    oee: oee,
    totalGoodProduction: totalGood,
    totalTheoreticalTarget: totalTheoretical,
    totalTroubleMin: totalTrouble,
    completedLots: completedLots
  };
}

function getFactoryMonthStats(year, month) {
  return MACHINES.map(m => getMachineMonthStats(m.id, year, month)).filter(s => s !== null);
}

function getMachineAllStats(machineId) {
  const results = [];
  for (let m = 1; m <= 6; m++) {
    const stat = getMachineMonthStats(machineId, 2026, m);
    if (stat) results.push(stat);
  }
  return results;
}

function getTroubleRecords(machineId) {
  return RECORDS.filter(r => r.machineId === machineId && r.troubleTime > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getDailyRecords(machineId) {
  return RECORDS.filter(r => r.machineId === machineId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

