// Session guard – dijalankan setelah api.js
// Dalam SPA mode, __authUpdateUI() dipanggil ulang setiap kasir di-load.

let __authSession = null;

(async function () {
  document.body.style.display = 'none';
  try {
    const session = await api.getSession();
    if (!session) { window.location.href = 'login.html'; return; }
    document.body.style.display = '';
    __authSession = session;
    __authUpdateUI();
  } catch {
    window.location.href = 'login.html';
  }
})();

function __authUpdateUI() {
  if (!__authSession) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = __authSession.user?.email?.split('@')[0] || '';

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.signOut();
      window.location.href = 'login.html';
    });
  }
}

window.__authUpdateUI = __authUpdateUI;
