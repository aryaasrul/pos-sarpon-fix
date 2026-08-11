// Flag SPA mode — harus di-load sebelum page JS lain (kasir.js, form-produk.js, dst)
// supaya mereka tidak mendaftarkan handler standalone (DOMContentLoaded).
// Dipisah dari inline <script> agar CSP script-src tidak butuh 'unsafe-inline'.
window.__SPA_MODE = true;
