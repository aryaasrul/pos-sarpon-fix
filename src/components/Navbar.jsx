// src/components/Navbar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css'; // Pastikan file CSS ini diimpor

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-item">
        {/* Ikon untuk halaman Kasir */}
        <img src="/icons/orders-icon.svg" alt="Kasir" />
      </NavLink>
      <NavLink to="/katalog" className="nav-item">
        {/* Ikon untuk halaman Katalog */}
        <img src="/icons/database-icon.svg" alt="Katalog" />
      </NavLink>
      <NavLink to="/riwayat" className="nav-item">
        {/* Ikon untuk halaman Riwayat */}
        <img src="/icons/laporan-icon.svg" alt="Riwayat" />
      </NavLink>
    </nav>
  );
}

export default Navbar;
