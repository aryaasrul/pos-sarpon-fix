import React from 'react';
import { useAuth } from '../context/AuthContext'; // 1. Impor useAuth

function Header() {
  const { user, logout } = useAuth(); // 2. Ambil data user dan fungsi logout

  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/logo/logo.png" alt="Logo Terang" className="header-logo" />
        <h1>Terang</h1>
      </div>
      <div className="header-actions" style={{ alignItems: 'center' }}>
        {/* Tampilkan nama user dan tombol logout jika user sudah login */}
        {user ? (
          <>
            <span style={{ marginRight: '15px', fontWeight: '500' }}>
              Halo, {user.email}
            </span>
            <button 
              onClick={logout} 
              className="header-button" 
              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {/* Opsi jika ingin menampilkan sesuatu saat belum login */}
            <button className="header-button">Printer</button>
            <button className="header-button">Input Manual</button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
