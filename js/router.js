// ─── SPA Router ────────────────────────────────────────────────
// Fetch page fragments, inject ke #spa-content, panggil page init.
// Navbar tetap ada; hanya konten yang berganti.
// goTo(routeId, params) menyimpan params ke window.__routeParams
// sehingga page init bisa membaca ID/type tanpa URLSearchParams.

const ROUTES = [
  { id: 'kasir',               navIdx: 0, src: 'pages/kasir.html' },
  { id: 'katalog',             navIdx: 1, src: 'pages/katalog.html' },
  { id: 'riwayat',             navIdx: 2, src: 'pages/riwayat.html' },
  { id: 'dashboard',           navIdx: 3, src: 'pages/dashboard.html' },
  { id: 'form-produk',         navIdx: 1, src: 'pages/form-produk.html' },
  { id: 'form-bean',           navIdx: 1, src: 'pages/form-bean.html' },
  { id: 'tambah-pengeluaran',  navIdx: 2, src: 'pages/tambah-pengeluaran.html' },
  { id: 'input-manual',        navIdx: 0, src: 'pages/input-manual.html' },
];

// Route yang tidak muncul di navbar (tombol Back kembali ke navIdx-nya)
const NAV_ROUTE_COUNT = 4;

let current = null;
const cache = {};

async function fetchPage(src) {
  if (cache[src]) return cache[src];
  const res = await fetch(src);
  if (!res.ok) throw new Error('Gagal memuat halaman: ' + src);
  cache[src] = await res.text();
  return cache[src];
}

async function goTo(routeId, params = {}) {
  if (routeId === current) return;
  const route = ROUTES.find(r => r.id === routeId);
  if (!route) return;

  // Simpan params agar page init bisa baca tanpa URLSearchParams
  window.__routeParams = params;

  const content = document.getElementById('spa-content');

  // Animasi keluar
  content.classList.add('spa-exit');

  // Fetch bersamaan dengan animasi keluar
  let html;
  try {
    [html] = await Promise.all([
      fetchPage(route.src),
      new Promise(r => setTimeout(r, 190)),
    ]);
  } catch (e) {
    console.error(e);
    content.classList.remove('spa-exit');
    showToast?.('Gagal memuat halaman. Periksa koneksi.');
    return;
  }

  // Ganti konten
  content.innerHTML = html;
  content.classList.remove('spa-exit');
  content.classList.add('spa-enter');
  content.addEventListener('animationend', () => content.classList.remove('spa-enter'), { once: true });

  // Update active state navbar (hanya untuk 4 tab utama)
  document.querySelectorAll('.navbar .nav-item').forEach((item, i) => {
    item.classList.toggle('active', i === route.navIdx);
  });

  current = routeId;
  history.pushState(null, '', '#' + routeId);

  // Panggil init halaman
  const inits = {
    kasir:                 window.__kasirInit,
    katalog:               window.__katalogInit,
    riwayat:               window.__riwayatInit,
    dashboard:             window.__dashboardInit,
    'form-produk':         window.__formProdukInit,
    'form-bean':           window.__formBeanInit,
    'tambah-pengeluaran':  window.__tambahPengeluaranInit,
    'input-manual':        window.__inputManualInit,
  };
  await inits[routeId]?.();
}

window.__router = { goTo };

document.addEventListener('DOMContentLoaded', async () => {
  const navItems = document.querySelectorAll('.navbar .nav-item');
  const routeIds = ROUTES.slice(0, NAV_ROUTE_COUNT).map(r => r.id);

  // Wire navbar clicks ke router (hanya 4 tab utama)
  navItems.forEach((item, i) => {
    item.addEventListener('click', () => goTo(routeIds[i]));
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const hash  = location.hash.slice(1);
    const valid = ROUTES.find(r => r.id === hash);
    goTo(valid?.id || 'kasir');
  });

  // Rute awal dari hash URL atau default kasir
  const initHash  = location.hash.slice(1);
  const initRoute = ROUTES.find(r => r.id === initHash)?.id || 'kasir';
  await goTo(initRoute);
});
