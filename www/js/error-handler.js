// Global error handler – tangkap semua unhandled rejection & error
// Dimuat sebelum script lain di setiap halaman

window.addEventListener('unhandledrejection', function (e) {
  // Supabase network errors sering muncul sebagai unhandledrejection
  const msg = e.reason?.message || String(e.reason) || 'Unknown error';
  console.error('[Global] Unhandled Promise rejection:', msg);

  // Jangan tampilkan toast untuk error autentikasi (ditangani auth.js)
  if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('auth')) return;

  // Hanya tampilkan toast jika fungsi sudah tersedia
  if (typeof showToast === 'function') {
    showToast('Terjadi kesalahan. Periksa koneksi internet.');
  }

  e.preventDefault();
});

window.addEventListener('error', function (e) {
  // Abaikan error dari CDN / resource load failure
  if (e.filename && !e.filename.includes(window.location.hostname)) return;
  console.error('[Global] Unhandled error:', e.message, 'at', e.filename, e.lineno);
});
