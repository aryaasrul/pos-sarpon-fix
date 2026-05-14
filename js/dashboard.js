(function () {
let currentRange = '7';

async function __dashboardSetup() {
  currentRange = '7';

  document.querySelectorAll('.dash-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      loadDashboard();
    });
  });

  await loadDashboard();
}

window.__dashboardInit = __dashboardSetup;

if (!window.__SPA_MODE) {
  document.addEventListener('DOMContentLoaded', async function () {
    setupNavbar(3);
    await __dashboardSetup();
  });
}

async function loadDashboard() {
  const content = document.getElementById('dash-content');
  content.innerHTML = '<p class="loading-state">Memuat data...</p>';

  const { start, end } = getDashboardRange(currentRange);

  let raw;
  try {
    raw = await api.getDashboardStats(start, end);
  } catch (e) {
    console.error('Gagal memuat dashboard:', e);
    content.innerHTML = `
      <div class="error-state">
        <p>Gagal memuat data. Periksa koneksi.</p>
        <button id="dash-retry-btn">Coba Lagi</button>
      </div>
    `;
    document.getElementById('dash-retry-btn')?.addEventListener('click', loadDashboard);
    return;
  }

  const stats = calcStats(raw, start, end);
  content.innerHTML = renderDashboard(stats);
}

function calcStats(raw, start, end) {
  const msDay    = 86400000;
  const rangeDays = Math.max(1, Math.round((end - start) / msDay) + 1);
  return {
    totalIncome: Number(raw.total_income),
    totalProfit: Number(raw.total_profit),
    activeDays:  Number(raw.active_days),
    rangeDays,
    avgPerDay:   Number(raw.total_income) / rangeDays,
    bestDay:     raw.best_day || null,
    topItems:    raw.top_items || [],
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
              <div class="top-item-name">${escapeHtml(item.name)}</div>
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

})();
