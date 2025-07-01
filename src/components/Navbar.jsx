// src/components/Navbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css'; // PASTIKAN ANDA MENGIMPOR FILE CSS INI

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-item">
        <img src="/icons/orders-icon.svg" alt="Kasir" />
      </NavLink>
      <NavLink to="/katalog" className="nav-item">
        <img src="/icons/database-icon.svg" alt="Katalog" />
      </NavLink>
      <NavLink to="/riwayat" className="nav-item">
        <img src="/icons/laporan-icon.svg" alt="Riwayat" />
      </NavLink>
    </nav>
  );
}

export default Navbar;
