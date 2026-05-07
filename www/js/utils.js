// ─── FORMAT ANGKA ─────────────────────────────────────────────

function formatNumber(number) {
  return Number(number || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatCurrency(amount) {
  return 'Rp ' + formatNumber(amount);
}

function formatRupiah(input) {
  let value = input.value.replace(/\D/g, '');
  input.value = value ? 'Rp ' + parseInt(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}

function parseRupiah(str) {
  if (!str) return 0;
  return parseInt(str.replace(/\D/g, '')) || 0;
}

// ─── FORMAT TANGGAL ───────────────────────────────────────────

const DAY_NAMES   = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                     'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatDateLong(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── KATEGORI MENU ────────────────────────────────────────────

const CATEGORY_LABELS = {
  espresso_based: 'Espresso Based',
  filter:         'Filter',
  local_proses:   'Local Proses',
  non_coffee:     'Non Coffee',
};

const COFFEE_CATEGORIES = ['espresso_based', 'filter', 'local_proses'];

function isCoffeeCategory(category) {
  return COFFEE_CATEGORIES.includes(category);
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

// ─── KATEGORI BEANS ───────────────────────────────────────────

const BEAN_CATEGORY_LABELS = {
  espresso_bean: 'Espresso Bean',
  filter_bean:   'Filter Bean',
  other:         'Lainnya',
};

function getBeanCategoryLabel(category) {
  return BEAN_CATEGORY_LABELS[category] || category;
}

function extractUniqueCategories(items) {
  const set = new Set(['Semua Produk']);
  items.forEach(p => {
    if (p._type === 'book') {
      set.add('Buku');
    } else if (p.category) {
      set.add(getCategoryLabel(p.category));
    }
  });
  return Array.from(set);
}

// ─── TOAST ────────────────────────────────────────────────────

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── KALKULASI HARGA ─────────────────────────────────────────

function calcMenuPrice(menuItem, ingredient = null, quantityGrams = 0) {
  const fixed    = Number(menuItem.fixed_cost)    || 0;
  const margin   = Number(menuItem.profit_margin) || 0;
  const rounding = Number(menuItem.rounding_up)   || 1000;

  let hpp = fixed;
  if (ingredient && quantityGrams > 0) {
    hpp += (Number(ingredient.purchase_price) * quantityGrams) / Number(ingredient.pack_size_grams);
  }

  const sell = Math.ceil(hpp * (1 + margin) / rounding) * rounding;
  return { hpp, sell };
}

// ─── DATE RANGE ──────────────────────────────────────────────

function getDashboardRange(range) {
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

function getDateRange(filterType) {
  const now      = new Date();
  const endDate  = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(now);

  switch (filterType) {
    case 'Hari Ini':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'Kemarin':
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'Seminggu Terakhir':
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'Bulan Ini':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'Bulan Lalu':
      startDate.setMonth(now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
  }
  return { startDate, endDate };
}
