// Navbar routing – dipakai oleh semua halaman
// Panggil setupNavbar() setelah DOM ready
// activeIndex: 0=Kasir, 1=Katalog, 2=Laporan

const NAV_ROUTES = ['index.html', 'katalog.html', 'riwayat.html'];

function setupNavbar(activeIndex) {
  const navItems = document.querySelectorAll('.navbar .nav-item');

  navItems.forEach((item, i) => {
    if (i === activeIndex) {
      item.classList.add('active');
    } else {
      item.addEventListener('click', () => {
        window.location.href = NAV_ROUTES[i];
      });
    }
  });
}

// Modal helpers – dipakai di katalog & form-produk
function openModal(modal) {
  if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
  if (modal) modal.style.display = 'none';
}

function setupModalClose(modalEl) {
  // Tombol × di dalam modal
  modalEl.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(modalEl));
  });
  // Klik di luar modal content
  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) closeModal(modalEl);
  });
}
