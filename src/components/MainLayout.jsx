// src/components/MainLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar'; // Kita akan buat/modifikasi Navbar

function MainLayout() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet /> {/* Halaman akan dirender di sini */}
      </main>
      <Navbar />
    </div>
  );
}

export default MainLayout;
