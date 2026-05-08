// Navbar routing – dipakai oleh semua halaman
// Panggil setupNavbar() setelah DOM ready
// activeIndex: 0=Kasir, 1=Katalog, 2=Laporan, 3=Dashboard

const NAV_ROUTES = ['index.html', 'katalog.html', 'riwayat.html', 'dashboard.html'];

function navigateTo(url) {
  document.body.classList.add('page-exiting');
  setTimeout(() => { window.location.href = url; }, 210);
}

function setupNavbar(activeIndex) {
  const navItems = document.querySelectorAll('.navbar .nav-item');

  navItems.forEach((item, i) => {
    if (i === activeIndex) {
      item.classList.add('active');
    } else {
      item.addEventListener('click', () => navigateTo(NAV_ROUTES[i]));
    }
  });
}

// Modal helpers – smooth open/close ala Apple
function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  // double rAF ensures display:flex has painted before triggering transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.classList.add('modal-open');
    });
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('modal-open');
  modal.classList.add('modal-closing');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('modal-closing');
  }, 270);
}

function setupModalClose(modalEl) {
  modalEl.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(modalEl));
  });
  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) closeModal(modalEl);
  });
}
