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

// ─── DATE RANGE ───────────────────────────────────────────────

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
