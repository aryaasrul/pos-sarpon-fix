import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Komponen yang dimuat langsung
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Import halaman
import KasirPage from './pages/KasirPage';
import KatalogPage from './pages/KatalogPage';
import RiwayatPage from './pages/RiwayatPage';
import BooksPage from './pages/BooksPage'; // 📚 NEW!
import LoginPage from './pages/LoginPage';

// Impor CSS utama
import './index.css'; 
import './App.css';

// Router configuration dengan route baru untuk Books
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
            { index: true, element: <KasirPage /> },
            { path: 'katalog', element: <KatalogPage /> },
            { path: 'books', element: <BooksPage /> }, // 📚 NEW ROUTE!
            { path: 'riwayat', element: <RiwayatPage /> },
        ]
      }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);