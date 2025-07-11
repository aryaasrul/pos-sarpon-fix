// src/context/AuthContext.jsx - OPTIMIZED VERSION
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // === OPTIMIZED SESSION CHECK ===
    const checkUserSession = useCallback(async () => {
        try {
            setError(null);
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                setError(sessionError.message);
                setUser(null);
            } else {
                setUser(session?.user ?? null);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setError('Gagal memeriksa status login');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUserSession();

        // === OPTIMIZED AUTH STATE LISTENER ===
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);
                
                // Handle different auth events
                switch (event) {
                    case 'SIGNED_IN':
                        setUser(session?.user ?? null);
                        setError(null);
                        break;
                    case 'SIGNED_OUT':
                        setUser(null);
                        setError(null);
                        break;
                    case 'TOKEN_REFRESHED':
                        setUser(session?.user ?? null);
                        break;
                    case 'USER_UPDATED':
                        setUser(session?.user ?? null);
                        break;
                    default:
                        setUser(session?.user ?? null);
                }
                
                setLoading(false);
            }
        );

        // Cleanup listener
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [checkUserSession]);

    // === OPTIMIZED LOGIN FUNCTION ===
    const login = useCallback(async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });
            
            if (loginError) {
                throw new Error(loginError.message);
            }
            
            return data;
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // === OPTIMIZED LOGOUT FUNCTION ===
    const logout = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { error: logoutError } = await supabase.auth.signOut();
            
            if (logoutError) {
                throw new Error(logoutError.message);
            }
            
            // Force clear user state
            setUser(null);
        } catch (err) {
            console.error('Logout failed:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // === RETRY MECHANISM ===
    const retryAuth = useCallback(() => {
        setLoading(true);
        setError(null);
        checkUserSession();
    }, [checkUserSession]);

    const value = { 
        user, 
        loading, 
        error,
        login, 
        logout,
        retryAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// === CUSTOM HOOK DENGAN ERROR HANDLING ===
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
};