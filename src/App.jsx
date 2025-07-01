// src/App.jsx (Versi BARU & FIX - Bypass Login)

import KasirPage from './pages/KasirPage';
import './App.css';

function App() {
  // Langsung tampilkan halaman kasir, tidak perlu cek login lagi.
  return (
    <div>
      <KasirPage />
    </div>
  );
}

// BARIS YANG HILANG SEBELUMNYA, SEKARANG SUDAH DITAMBAHKAN
export default App;