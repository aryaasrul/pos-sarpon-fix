import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // 1. Impor AuthProvider

// Impor komponen
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute'; // 2. Impor ProtectedRoute
import KasirPage from './pages/KasirPage';
import KatalogPage from './pages/KatalogPage';
import RiwayatPage from './pages/RiwayatPage';
import LoginPage from './pages/LoginPage'; // 3. Pastikan LoginPage diimpor

// Impor CSS utama
import './index.css'; 
import './App.css';

// Mendefinisikan semua rute/halaman aplikasi
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />, // 4. Bungkus rute utama dengan ProtectedRoute
    children: [
      {
        element: <MainLayout />,
        children: [
            { index: true, element: <KasirPage /> },
            { path: 'katalog', element: <KatalogPage /> },
            { path: 'riwayat', element: <RiwayatPage /> },
        ]
      }
    ]
  },
  {
    path: '/login', // 5. Buat rute untuk login di luar proteksi
    element: <LoginPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 6. Bungkus RouterProvider dengan AuthProvider */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
