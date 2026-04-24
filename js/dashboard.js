let currentRange = '7';

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(3);

  document.querySelectorAll('.dash-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      loadDashboard();
    });
  });

  await loadDashboard();
});

function getRange(range) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start;

  if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    const days = parseInt(range);
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0, 0);
  }
  return { start, end };
}

async function loadDashboard() {
  const content = document.getElementById('dash-content');
  content.innerHTML = '<p class="loading-state">Memuat data...</p>';

  const { start, end } = getRange(currentRange);

  let items;
  try {
    items = await api.getDashboardData(start, end);
  } catch (e) {
    console.error('Gagal memuat dashboard:', e);
    content.innerHTML = `
      <div class="error-state">
        <p>Gagal memuat data. Periksa koneksi.</p>
        <button onclick="loadDashboard()">Coba Lagi</button>
      </div>
    `;
    return;
  }

  const stats = calcStats(items, start, end);
  content.innerHTML = renderDashboard(stats);
}

function calcStats(items, start, end) {
  const totalIncome = items.reduce((s, i) => s + Number(i.total_price), 0);
  const totalProfit = items.reduce((s, i) => s + Number(i.profit_per_item || 0), 0);

  const daySet = new Set();
  const byDay = {};
  items.forEach(i => {
    const date = i.transactions.created_at.slice(0, 10);
    daySet.add(date);
    byDay[date] = (byDay[date] || 0) + Number(i.total_price);
  });

  const activeDays = daySet.size || 1;
  const avgPerDay = totalIncome / activeDays;

  // Total distinct transactions (via unique combos not available, so count all item records as approximation)
  // Better: count unique transactions days with income
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  // Item popularity by quantity
  const itemMap = {};
  items.forEach(i => {
    const key = i.item_name;
    if (!itemMap[key]) itemMap[key] = { name: i.item_name, qty: 0, revenue: 0 };
    itemMap[key].qty += Number(i.quantity);
    itemMap[key].revenue += Number(i.total_price);
  });
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7);

  // Days in range for avg
  const msDay = 86400000;
  const rangeDays = Math.max(1, Math.round((end - start) / msDay) + 1);

  return {
    totalIncome,
    totalProfit,
    avgPerDay: totalIncome / rangeDays,
    activeDays,
    rangeDays,
    bestDay: bestDay ? { date: bestDay[0], amount: bestDay[1] } : null,
    topItems,
    byDay,
  };
}

function renderDashboard(s) {
  const bestDayStr = s.bestDay
    ? `${formatDateLong(new Date(s.bestDay.date + 'T12:00:00'))} · ${formatCurrency(s.bestDay.amount)}`
    : '–';

  const maxQty = s.topItems[0]?.qty || 1;

  const topItemsHtml = s.topItems.length === 0
    ? '<p class="empty-state" style="padding:24px 0">Belum ada transaksi.</p>'
    : s.topItems.map((item, i) => {
        const barWidth = Math.round((item.qty / maxQty) * 100);
        return `
          <div class="top-item-row">
            <div class="top-item-rank">${i + 1}</div>
            <div class="top-item-info">
              <div class="top-item-name">${item.name}</div>
              <div class="top-item-bar-wrap">
                <div class="top-item-bar" style="width:${barWidth}%"></div>
              </div>
            </div>
            <div class="top-item-meta">
              <div class="top-item-qty">${item.qty}x</div>
              <div class="top-item-rev">${formatCurrency(item.revenue)}</div>
            </div>
          </div>
        `;
      }).join('');

  return `
    <div class="dash-stats-grid">
      <div class="dash-stat-card">
        <div class="dash-stat-label">Total Pemasukan</div>
        <div class="dash-stat-value">${formatCurrency(s.totalIncome)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Rata-rata / Hari</div>
        <div class="dash-stat-value">${formatCurrency(s.avgPerDay)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Total Profit</div>
        <div class="dash-stat-value profit">${formatCurrency(s.totalProfit)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Hari Aktif</div>
        <div class="dash-stat-value">${s.activeDays} <span class="dash-stat-sub">dari ${s.rangeDays} hari</span></div>
      </div>
    </div>

    ${s.bestDay ? `
    <div class="dash-section">
      <div class="dash-best-day">
        <span class="dash-section-label">Hari Terbaik</span>
        <span class="dash-best-day-val">${bestDayStr}</span>
      </div>
    </div>
    ` : ''}

    <div class="dash-section">
      <h2 class="dash-section-title">Item Terlaris</h2>
      <div class="top-items-list">
        ${topItemsHtml}
      </div>
    </div>
  `;
}

function formatDateLong(date) {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}
