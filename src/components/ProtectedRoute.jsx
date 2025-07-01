import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Impor custom hook kita

/**
 * Komponen ini berfungsi sebagai penjaga (guard) untuk rute-rute
 * yang hanya boleh diakses oleh pengguna yang sudah login.
 */
const ProtectedRoute = () => {
    // Ambil status user dan loading dari AuthContext
    const { user, loading } = useAuth();

    // Jika masih dalam proses pengecekan sesi, tampilkan pesan loading
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Memuat Aplikasi...
            </div>
        );
    }

    // Jika proses cek selesai dan TIDAK ADA user,
    // paksa arahkan (redirect) ke halaman login.
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Jika proses cek selesai dan ADA user,
    // tampilkan komponen halaman yang seharusnya (misal: KasirPage)
    // <Outlet /> akan merender komponen anak dari rute ini.
    return <Outlet />;
};

export default ProtectedRoute;
