// src/context/AuthContext.jsx (Versi BARU dengan Supabase)

import React, { createContext, useContext, useState, useEffect } from 'react';
// Perubahan: Impor supabase, bukan axios
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fungsi ini akan dijalankan sekali saat aplikasi dimuat
        const checkUserSession = async () => {
            // Cek apakah ada sesi yang aktif dari cookie
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        checkUserSession();

        // Perubahan: Gunakan onAuthStateChange untuk mendengarkan event login/logout secara real-time
        // Ini lebih canggih dari sekadar cek localStorage
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null);
            }
        );

        // Cleanup listener saat komponen di-unmount
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Perubahan: Fungsi login menggunakan Supabase
    const login = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    // Perubahan: Fungsi logout menggunakan Supabase
    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value = { user, loading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);