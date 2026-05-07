// Session guard – dijalankan setelah api.js
document.body.style.display = 'none';

(async function () {
  try {
    const session = await api.getSession();

    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    document.body.style.display = '';

    const nameEl = document.getElementById('user-name');
    if (nameEl) {
      nameEl.textContent = session.user?.email?.split('@')[0] || '';
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api.signOut();
        window.location.href = 'login.html';
      });
    }
  } catch {
    window.location.href = 'login.html';
  }
})();
