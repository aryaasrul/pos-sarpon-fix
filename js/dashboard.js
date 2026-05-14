(function () {
let currentRange = '7';
let customStart  = null;
let customEnd    = null;
let todayStats   = null;

async function __dashboardSetup() {
  currentRange = '7';
  customStart  = null;
  customEnd    = null;
  todayStats   = null;

  document.querySelectorAll('.dash-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;

      const customSection = document.getElementById('dash-custom-range');
      if (currentRange === 'custom') {
        customSection.style.display = 'block';
        if (!customStart) {
          const now   = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          document.getElementById('dash-date-start').value = formatDateForInput(start);
          document.getElementById('dash-date-end').value   = formatDateForInput(now);
        }
      } else {
        customSection.style.display = 'none';
        loadDashboard();
      }
    });
  });

  document.getElementById('dash-apply-custom')?.addEventListener('click', () => {
    const startVal = document.getElementById('dash-date-start').value;
    const endVal   = document.getElementById('dash-date-end').value;
    if (!startVal || !endVal)  { showToast('Pilih rentang tanggal terlebih dahulu'); return; }
    if (startVal > endVal)     { showToast('Tanggal mulai harus sebelum tanggal akhir'); return; }
    const [sy, sm, sd] = startVal.split('-').map(Number);
    const [ey, em, ed] = endVal.split('-').map(Number);
    customStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    customEnd   = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    loadDashboard();
  });

  loadTodayStats(); // fire-and-forget, update slot komisi saat selesai
  await loadDashboard();
}

window.__dashboardInit = __dashboardSetup;

if (!window.__SPA_MODE) {
  document.addEventListener('DOMContentLoaded', async function () {
    setupNavbar(3);
    await __dashboardSetup();
  });
}

// ─── LOAD DATA ────────────────────────────────────────────────

async function loadDashboard() {
  const content = document.getElementById('dash-content');
  content.innerHTML = '<p class="loading-state">Memuat data...</p>';

  let start, end;
  if (currentRange === 'custom') {
    if (!customStart || !customEnd) return;
    start = customStart;
    end   = customEnd;
  } else {
    ({ start, end } = getDashboardRange(currentRange));
  }

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

async function loadTodayStats() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  try {
    const raw  = await api.getDashboardStats(start, end);
    todayStats = {
      income: Number(raw.total_income),
      profit: Number(raw.total_profit),
      cogs:   Number(raw.total_income) - Number(raw.total_profit),
    };
  } catch (e) {
    console.error('Gagal load data hari ini:', e);
    todayStats = null;
  }
  // Update slot komisi di DOM jika sudah dirender
  const slot = document.getElementById('komisi-card-slot');
  if (slot) slot.outerHTML = renderKomisiCard();
}

// ─── KALKULASI ────────────────────────────────────────────────

function calcStats(raw, start, end) {
  const msDay      = 86400000;
  const rangeDays  = Math.max(1, Math.round((end - start) / msDay) + 1);
  const totalIncome  = Number(raw.total_income);
  const totalProfit  = Number(raw.total_profit);
  const totalExpense = Number(raw.total_expense || 0);
  return {
    totalIncome,
    totalProfit,
    totalExpense,
    hasil:      totalIncome - totalExpense,
    cogs:       totalIncome - totalProfit,
    activeDays: Number(raw.active_days),
    rangeDays,
    avgPerDay:  totalIncome / rangeDays,
    bestDay:    raw.best_day || null,
    topItems:   raw.top_items || [],
  };
}

function calcHealth(s) {
  if (s.totalIncome === 0) {
    return { level: 'no-data', label: 'Belum Ada Data', desc: 'Belum ada transaksi di periode ini.', marginPct: 0 };
  }
  const margin    = s.hasil / s.totalIncome;
  const marginPct = Math.round(margin * 100);
  let level, label, desc;

  if (margin > 0.30) {
    level = 'excellent'; label = 'Sangat Sehat';
    desc  = `Arus kas +${marginPct}% — pendapatan jauh di atas pengeluaran.`;
  } else if (margin > 0.10) {
    level = 'good'; label = 'Sehat';
    desc  = `Arus kas +${marginPct}% — kondisi keuangan baik.`;
  } else if (margin > 0) {
    level = 'warning'; label = 'Perlu Perhatian';
    desc  = `Arus kas +${marginPct}% — pengeluaran hampir menyamai pendapatan.`;
  } else {
    level = 'danger'; label = 'Merugi';
    desc  = `Arus kas ${marginPct}% — pengeluaran melebihi pendapatan.`;
  }

  return { level, label, desc, marginPct };
}

function calcKomisi(income) {
  if (income >= 150000) return 50000;
  if (income >= 100000) return 40000;
  return 30000;
}

// ─── KESEHATAN KEUANGAN ───────────────────────────────────────

function renderHealthCard(s) {
  const h = calcHealth(s);

  if (h.level === 'no-data') {
    return `
      <div class="dash-section">
        <h2 class="dash-section-title">Kesehatan Keuangan</h2>
        <div class="health-card health-no-data">
          <div class="health-card-top">
            <div class="health-badge-wrap">
              <span class="health-status-dot"></span>
              <span class="health-label">Belum Ada Data</span>
            </div>
          </div>
          <div class="health-desc">Belum ada transaksi di periode ini.</div>
        </div>
      </div>
    `;
  }

  const hasilClass = s.hasil >= 0 ? 'health-val-profit' : 'health-val-danger';

  return `
    <div class="dash-section">
      <h2 class="dash-section-title">Kesehatan Keuangan</h2>
      <div class="health-card health-${h.level}">
        <div class="health-card-top">
          <div class="health-badge-wrap">
            <span class="health-status-dot"></span>
            <span class="health-label">${h.label}</span>
          </div>
          <div class="health-margin-badge">${h.marginPct}%</div>
        </div>
        <div class="health-desc">${h.desc}</div>
        <div class="health-breakdown">
          <div class="health-row">
            <span class="health-row-label">Penjualan</span>
            <span class="health-row-val">${formatCurrency(s.totalIncome)}</span>
          </div>
          <div class="health-row">
            <span class="health-row-label">Pengeluaran</span>
            <span class="health-row-val">− ${formatCurrency(s.totalExpense)}</span>
          </div>
          <div class="health-divider"></div>
          <div class="health-row">
            <span class="health-row-label">Hasil</span>
            <span class="health-row-val ${hasilClass}">${formatCurrency(s.hasil)}</span>
          </div>
        </div>
        <div class="health-profit-info">
          Profit kotor penjualan (tanpa pengeluaran):
          <strong>${formatCurrency(s.totalProfit)}</strong>
        </div>
      </div>
    </div>
  `;
}

// ─── KOMISI BARISTA ───────────────────────────────────────────

function renderKomisiCard() {
  if (!todayStats) {
    return `
      <div id="komisi-card-slot" class="dash-section">
        <h2 class="dash-section-title">Komisi Hari Ini</h2>
        <div class="komisi-card">
          <p class="loading-state" style="padding:20px 0;text-align:center;font-size:13px">Memuat...</p>
        </div>
      </div>
    `;
  }

  const { income, profit, cogs } = todayStats;
  const komisi = calcKomisi(income);
  const sisa   = profit - komisi;
  const komisiLevel = income >= 150000 ? 'excellent' : income >= 100000 ? 'good' : 'warning';

  const sisaLabel = sisa >= 0
    ? `Sisa profit: <strong>${formatCurrency(sisa)}</strong>`
    : `<span style="color:#c62828">Profit kotor tidak cukup untuk komisi ini</span>`;

  return `
    <div id="komisi-card-slot" class="dash-section">
      <h2 class="dash-section-title">Komisi Hari Ini</h2>
      <div class="komisi-card">
        <div class="health-breakdown">
          <div class="health-row">
            <span class="health-row-label">Penjualan hari ini</span>
            <span class="health-row-val">${formatCurrency(income)}</span>
          </div>
          <div class="health-row">
            <span class="health-row-label">HPP</span>
            <span class="health-row-val">− ${formatCurrency(cogs)}</span>
          </div>
          <div class="health-divider"></div>
          <div class="health-row">
            <span class="health-row-label">Profit kotor</span>
            <span class="health-row-val health-val-profit">${formatCurrency(profit)}</span>
          </div>
        </div>
        <div class="komisi-recommendation">
          <div class="komisi-rec-label">Rekomendasi komisi</div>
          <div class="komisi-amount komisi-${komisiLevel}">${formatCurrency(komisi)}</div>
          <div class="komisi-sisa">${sisaLabel}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── RENDER UTAMA ─────────────────────────────────────────────

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
        <div class="dash-stat-label">Total Penjualan</div>
        <div class="dash-stat-value">${formatCurrency(s.totalIncome)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Rata-rata / Hari</div>
        <div class="dash-stat-value">${formatCurrency(s.avgPerDay)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Profit Kotor</div>
        <div class="dash-stat-value profit">${formatCurrency(s.totalProfit)}</div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-label">Hari Aktif</div>
        <div class="dash-stat-value">${s.activeDays} <span class="dash-stat-sub">dari ${s.rangeDays} hari</span></div>
      </div>
    </div>

    ${renderHealthCard(s)}

    ${renderKomisiCard()}

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
