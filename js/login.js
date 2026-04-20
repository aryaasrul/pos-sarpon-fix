document.addEventListener('DOMContentLoaded', function () {
  const emailInput   = document.getElementById('email');
  const passInput    = document.getElementById('kode');
  const loginBtn     = document.getElementById('btn-login');
  const errorMsg     = document.getElementById('error-message');
  const togglePassBtn = document.getElementById('toggle-password');
  const eyeIcon      = document.getElementById('eye-icon');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function hideError() {
    errorMsg.style.display = 'none';
  }

  async function login() {
    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email)    { showError('Masukkan email'); return; }
    if (!password) { showError('Masukkan password'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Masuk...';
    hideError();

    try {
      await api.signIn(email, password);
      window.location.href = 'loading.html';
    } catch (e) {
      showError('Email atau password salah');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Masuk';
    }
  }

  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      if (eyeIcon) eyeIcon.src = isPass ? 'icons/eye-slash.svg' : 'icons/eye.svg';
    });
  }

  loginBtn?.addEventListener('click', login);
  passInput?.addEventListener('keyup', e => { if (e.key === 'Enter') login(); });
});
