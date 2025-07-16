// src/main.jsx - FINAL VERSION dengan Lazy Loading & Error Handling
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Core components (tidak di-lazy karena selalu dibutuhkan)
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// 🚀 LAZY LOADING - Pages di-import secara lazy untuk performance
const KasirPage = React.lazy(() => import('./pages/KasirPage'));
const KatalogPage = React.lazy(() => import('./pages/KatalogPage'));
const RiwayatPage = React.lazy(() => import('./pages/RiwayatPage'));
const BooksPage = React.lazy(() => import('./pages/BooksPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));

// CSS utama
import './index.css'; 
import './App.css';

// ============================================
// LOADING COMPONENT - Komponen loading yang menarik
// ============================================
const PageLoader = ({ message = "Memuat halaman..." }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '60vh',
    flexDirection: 'column',
    gap: '20px'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #000',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '10px'
    }}></div>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ 
        color: '#666', 
        fontSize: '16px',
        fontWeight: '500'
      }}>
        {message}
      </span>
      <div style={{
        display: 'flex',
        gap: '4px'
      }}>
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#666',
              borderRadius: '50%',
              animation: `pulse 1.5s ease-in-out ${dot * 0.2}s infinite alternate`
            }}
          />
        ))}
      </div>
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0% { opacity: 0.3; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);

// ============================================
// ERROR BOUNDARY - Handle lazy loading errors
// ============================================
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '60px 40px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          margin: '20px',
          color: '#dc3545'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 15px 0', color: '#dc3545' }}>
            Gagal Memuat Halaman
          </h2>
          <p style={{ 
            margin: '0 0 25px 0', 
            color: '#6c757d',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Terjadi kesalahan saat memuat komponen. Ini mungkin karena koneksi internet atau masalah teknis.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              🔄 Refresh Halaman
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              🏠 Kembali ke Beranda
            </button>
          </div>
          
          {/* Debug info (hanya tampil di development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '20px', 
              textAlign: 'left', 
              backgroundColor: '#f1f3f4',
              padding: '15px',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Debug Info (Development Only)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#721c24' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// 404 ERROR PAGE COMPONENT
// ============================================
const NotFoundPage = () => (
  <div style={{ 
    padding: '60px 40px', 
    textAlign: 'center',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  }}>
    <div style={{ fontSize: '120px', marginBottom: '20px' }}>🔍</div>
    <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#343a40' }}>404</h1>
    <h2 style={{ fontSize: '24px', margin: '0 0 15px 0', color: '#6c757d' }}>
      Halaman Tidak Ditemukan
    </h2>
    <p style={{ 
      color: '#6c757d', 
      marginBottom: '30px', 
      fontSize: '16px',
      maxWidth: '500px',
      lineHeight: '1.5'
    }}>
      Halaman yang Anda cari tidak ada atau telah dipindahkan. 
      Mungkin URL salah ketik atau halaman sudah tidak tersedia.
    </p>
    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <button 
        onClick={() => window.location.href = '/'}
        style={{
          padding: '15px 30px',
          backgroundColor: '#000',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        🏠 Kembali ke Beranda
      </button>
      <button 
        onClick={() => window.history.back()}
        style={{
          padding: '15px 30px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        ⬅️ Halaman Sebelumnya
      </button>
    </div>
  </div>
);

// ============================================
// ROUTER CONFIGURATION
// ============================================
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { 
            index: true, 
            element: (
              <LazyErrorBoundary>
                <Suspense fallback={<PageLoader message="Memuat halaman kasir..." />}>
                  <KasirPage />
                </Suspense>
              </LazyErrorBoundary>
            )
          },
          { 
            path: 'katalog', 
            element: (
              <LazyErrorBoundary>
                <Suspense fallback={<PageLoader message="Memuat katalog menu..." />}>
                  <KatalogPage />
                </Suspense>
              </LazyErrorBoundary>
            )
          },
          { 
            path: 'books', 
            element: (
              <LazyErrorBoundary>
                <Suspense fallback={<PageLoader message="Memuat manajemen buku..." />}>
                  <BooksPage />
                </Suspense>
              </LazyErrorBoundary>
            )
          },
          { 
            path: 'riwayat', 
            element: (
              <LazyErrorBoundary>
                <Suspense fallback={<PageLoader message="Memuat riwayat transaksi..." />}>
                  <RiwayatPage />
                </Suspense>
              </LazyErrorBoundary>
            )
          },
        ]
      }
    ]
  },
  {
    path: '/login',
    element: (
      <LazyErrorBoundary>
        <Suspense fallback={<PageLoader message="Memuat halaman login..." />}>
          <LoginPage />
        </Suspense>
      </LazyErrorBoundary>
    ),
  },
  // Catch-all route untuk 404
  {
    path: '*',
    element: <NotFoundPage />,
  }
]);

// ============================================
// RENDER APPLICATION
// ============================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster 
        position="top-center"
        toastOptions={{
          // Default toast settings
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '500px'
          },
          
          // Loading toast settings
          loading: {
            duration: Infinity,
            style: {
              background: '#0d6efd',
              color: '#fff'
            }
          },
          
          // Success toast settings
          success: {
            duration: 4000,
            style: {
              background: '#198754',
              color: '#fff'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#198754'
            }
          },
          
          // Error toast settings
          error: {
            duration: 6000,
            style: {
              background: '#dc3545',
              color: '#fff',
              maxWidth: '600px'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#dc3545'
            }
          }
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);