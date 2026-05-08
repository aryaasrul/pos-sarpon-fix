// ─── SPA Router ────────────────────────────────────────────────
// Fetch page fragments, inject ke #spa-content, panggil page init.
// Navbar tetap ada; hanya konten yang berganti.

const ROUTES = [
  { id: 'kasir',     navIdx: 0, src: 'pages/kasir.html' },
  { id: 'katalog',   navIdx: 1, src: 'pages/katalog.html' },
  { id: 'riwayat',   navIdx: 2, src: 'pages/riwayat.html' },
  { id: 'dashboard', navIdx: 3, src: 'pages/dashboard.html' },
];

let current = null;
const cache = {};

async function fetchPage(src) {
  if (cache[src]) return cache[src];
  const res = await fetch(src);
  if (!res.ok) throw new Error('Gagal memuat halaman: ' + src);
  cache[src] = await res.text();
  return cache[src];
}

async function goTo(routeId) {
  if (routeId === current) return;
  const route = ROUTES.find(r => r.id === routeId);
  if (!route) return;

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

  // Update active state navbar
  document.querySelectorAll('.navbar .nav-item').forEach((item, i) => {
    item.classList.toggle('active', i === route.navIdx);
  });

  current = routeId;
  history.pushState(null, '', '#' + routeId);

  // Panggil init halaman
  const inits = {
    kasir:    window.__kasirInit,
    katalog:  window.__katalogInit,
    riwayat:  window.__riwayatInit,
    dashboard:window.__dashboardInit,
  };
  await inits[routeId]?.();
}

window.__router = { goTo };

document.addEventListener('DOMContentLoaded', async () => {
  const navItems  = document.querySelectorAll('.navbar .nav-item');
  const routeIds  = ROUTES.map(r => r.id);

  // Wire navbar clicks ke router
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
