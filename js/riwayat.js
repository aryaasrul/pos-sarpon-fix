let currentFilter  = 'Seminggu Terakhir';
let activeTab      = 'pemasukan';
let currentBalance = 0;

const PAGE_LIMIT = 20;
let orderPage    = 0;
let orderTotal   = 0;
let expensePage  = 0;
let expenseTotal = 0;

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(2);

  document.getElementById('tab-pemasukan')?.addEventListener('click',  () => setActiveTab('pemasukan'));
  document.getElementById('tab-pengeluaran')?.addEventListener('click', () => setActiveTab('pengeluaran'));
  document.getElementById('btn-add-expense')
    ?.addEventListener('click', () => window.location.href = 'tambah-pengeluaran.html');

  document.querySelector('.period-btn')?.addEventListener('click', toggleFilterDropdown);
  document.querySelectorAll('.filter-option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentFilter = opt.textContent.trim();
      document.querySelector('.period-btn span').textContent = currentFilter;
      toggleFilterDropdown();
      loadActiveTab();
    });
  });

  document.addEventListener('click', e => {
    const dropdown = document.querySelector('.filter-dropdown');
    if (dropdown?.classList.contains('show') &&
        !e.target.closest('.period-btn') &&
        !e.target.closest('.filter-dropdown')) {
      dropdown.classList.remove('show');
    }
  });

  document.addEventListener('click', e => {
    const header = e.target.closest('.order-header, .expense-header');
    if (header) toggleItem(header.closest('.order-item, .expense-item'));
  });

  await init();
});

async function init() {
  try {
    currentBalance = await api.getBalance();
  } catch (e) {
    console.error('Gagal hitung saldo:', e);
  }
  await loadActiveTab();
}

function setActiveTab(tab) {
  activeTab = tab;
  const isPemasukan = tab === 'pemasukan';
  document.getElementById('tab-pemasukan').classList.toggle('active', isPemasukan);
  document.getElementById('tab-pengeluaran').classList.toggle('active', !isPemasukan);
  document.getElementById('pemasukan-content').style.display  = isPemasukan ? 'block' : 'none';
  document.getElementById('pengeluaran-content').style.display = isPemasukan ? 'none' : 'block';
  loadActiveTab();
}

async function loadActiveTab() {
  if (activeTab === 'pemasukan') {
    orderPage = 0;
    await loadOrders();
  } else {
    expensePage = 0;
    await loadExpenses();
  }
}

function toggleFilterDropdown() {
  document.querySelector('.filter-dropdown')?.classList.toggle('show');
}

// ─── PEMASUKAN ────────────────────────────────────────────────

async function loadOrders(append = false) {
  const { startDate, endDate } = getDateRange(currentFilter);
  const list = document.querySelector('.order-list');

  if (!append) list.innerHTML = '<p class="loading-state">Memuat data...</p>';

  try {
    const { data: transactions, count } = await api.getTransactions(startDate, endDate, orderPage, PAGE_LIMIT);
    orderTotal = count;

    if (!append) list.innerHTML = '';
    if (!transactions.length && !append) { renderEmpty(list, 'transaksi'); return; }

    // Hapus tombol load-more lama jika ada
    document.getElementById('btn-load-more-order')?.remove();

    renderGrouped(list, groupByDate(transactions, 'created_at'), 'order');

    if (orderPage * PAGE_LIMIT + transactions.length < orderTotal) {
      const btn = document.createElement('button');
      btn.id = 'btn-load-more-order';
      btn.className = 'btn-load-more';
      btn.textContent = `Muat Lebih Banyak (${orderTotal - (orderPage * PAGE_LIMIT + transactions.length)} lagi)`;
      btn.addEventListener('click', () => {
        orderPage++;
        loadOrders(true);
      });
      list.after(btn);
    }
  } catch (e) {
    console.error('Error load transaksi:', e);
    renderError(list, () => loadOrders());
  }
}

// ─── PENGELUARAN ──────────────────────────────────────────────

async function loadExpenses(append = false) {
  const { startDate, endDate } = getDateRange(currentFilter);
  const list = document.querySelector('.expense-list');

  if (!append) list.innerHTML = '<p class="loading-state">Memuat data...</p>';

  try {
    const { data: expenses, count } = await api.getExpenses(startDate, endDate, expensePage, PAGE_LIMIT);
    expenseTotal = count;

    if (!append) list.innerHTML = '';
    if (!expenses.length && !append) { renderEmpty(list, 'pengeluaran'); return; }

    document.getElementById('btn-load-more-expense')?.remove();

    renderGrouped(list, groupByDate(expenses, 'created_at'), 'expense');

    if (expensePage * PAGE_LIMIT + expenses.length < expenseTotal) {
      const btn = document.createElement('button');
      btn.id = 'btn-load-more-expense';
      btn.className = 'btn-load-more';
      btn.textContent = `Muat Lebih Banyak (${expenseTotal - (expensePage * PAGE_LIMIT + expenses.length)} lagi)`;
      btn.addEventListener('click', () => {
        expensePage++;
        loadExpenses(true);
      });
      list.after(btn);
    }
  } catch (e) {
    console.error('Error load pengeluaran:', e);
    renderError(list, () => loadExpenses());
  }
}

// ─── GROUP BY DATE ────────────────────────────────────────────

function groupByDate(items, dateField) {
  const groups = {};
  items.forEach(item => {
    const d   = new Date(item[dateField]);
    const key = d.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = { date: d, items: [], total: 0, profit: 0 };
    groups[key].items.push(item);

    if ('total_amount' in item) {
      // transaction
      groups[key].total  += Number(item.total_amount);
      groups[key].profit += Number(item.total_profit);
    } else {
      // expense
      groups[key].total += Number(item.amount);
    }
  });
  return groups;
}

// ─── RENDER ───────────────────────────────────────────────────

function renderGrouped(container, groups, type) {
  container.innerHTML = '';
  Object.keys(groups).sort().reverse().forEach((key, i) => {
    container.appendChild(createGroupItem(groups[key], type, i === 0));
  });
}

function createGroupItem(group, type, expanded) {
  const isOrder = type === 'order';
  const el = document.createElement('div');
  el.className = (isOrder ? 'order-item' : 'expense-item') + (expanded ? ' expanded' : '');

  const totalStr  = formatCurrency(group.total);
  const profitStr = isOrder ? formatCurrency(group.profit) : formatCurrency(currentBalance);

  el.innerHTML = `
    <div class="${isOrder ? 'order' : 'expense'}-header">
      <div class="date">${formatDateLong(group.date)}</div>
      <button class="toggle-btn" aria-label="${expanded ? 'Tutup' : 'Buka'}">
        <img src="icons/${expanded ? 'Arrow-Up-2' : 'Arrow-Down-2'}.svg" alt="">
      </button>
    </div>
    <div class="${isOrder ? 'order' : 'expense'}-summary${expanded ? '' : ' collapsed'}">
      <div class="summary-row">
        <span class="summary-label">${isOrder ? 'Total Transaksi' : 'Total Pengeluaran'}</span>
        <span class="summary-value">${isOrder ? '+' : '-'}${totalStr}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">${isOrder ? 'Total Laba' : 'Sisa Saldo'}</span>
        <span class="summary-value">${isOrder ? '+' : ''}${profitStr}</span>
      </div>
    </div>
    <div class="${isOrder ? 'order' : 'expense'}-details" style="display:${expanded ? 'block' : 'none'}">
      ${buildDetailRows(group.items, isOrder)}
    </div>
    <div class="${isOrder ? 'order' : 'expense'}-actions" style="display:${expanded ? 'flex' : 'none'}">
      <button class="share-btn" aria-label="Unduh"><img src="icons/Download.svg" alt="Unduh"></button>
    </div>
  `;

  return el;
}

function buildDetailRows(items, isOrder) {
  if (isOrder) {
    // Gabungkan semua transaction_items dari semua transaksi hari ini
    const combined = {};
    items.forEach(tx => {
      (tx.transaction_items || []).forEach(item => {
        const key = item.ingredient_name
          ? `${item.item_name} (${item.ingredient_name})`
          : item.item_name;
        if (!combined[key]) combined[key] = { name: key, qty: 0, subtotal: 0 };
        combined[key].qty     += item.quantity;
        combined[key].subtotal += Number(item.total_price);
      });
    });
    return Object.values(combined).map(item => `
      <div class="order-detail-item">
        <span class="item-name">${item.qty}x ${item.name}</span>
        <span class="item-price">+${formatCurrency(item.subtotal)}</span>
      </div>
    `).join('');
  } else {
    // Expenses
    return items.map(item => `
      <div class="expense-detail-item">
        <span class="item-name">${item.name}</span>
        <span class="item-price">-${formatCurrency(Number(item.amount))}</span>
      </div>
    `).join('');
  }
}

// ─── TOGGLE EXPAND ────────────────────────────────────────────

function toggleItem(el) {
  if (!el) return;
  const isOrder  = el.classList.contains('order-item');
  const prefix   = isOrder ? 'order' : 'expense';
  const expanded = el.classList.toggle('expanded');
  const arrowImg = el.querySelector('.toggle-btn img');
  const details  = el.querySelector(`.${prefix}-details`);
  const actions  = el.querySelector(`.${prefix}-actions`);
  const summary  = el.querySelector(`.${prefix}-summary`);

  if (arrowImg) arrowImg.src = `icons/${expanded ? 'Arrow-Up-2' : 'Arrow-Down-2'}.svg`;
  if (details)  details.style.display  = expanded ? 'block' : 'none';
  if (actions)  actions.style.display  = expanded ? 'flex'  : 'none';
  if (summary)  summary.classList.toggle('collapsed', !expanded);
}

// ─── STATES ───────────────────────────────────────────────────

function renderEmpty(container, label) {
  container.innerHTML = `<p class="empty-state">Tidak ada ${label} untuk periode ini.</p>`;
}

function renderError(container, retryFn) {
  container.innerHTML = `
    <div class="error-state">
      <p>Terjadi kesalahan saat memuat data.</p>
      <button id="retry-btn">Coba Lagi</button>
    </div>
  `;
  document.getElementById('retry-btn')?.addEventListener('click', retryFn);
}
