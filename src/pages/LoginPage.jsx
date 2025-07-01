import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Ganti fungsi handleLogin di dalam file src/pages/LoginPage.jsx

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Perubahan: Memanggil fungsi login baru dari context
            await login(email, password);
            // Supabase akan otomatis mengarahkan jika login berhasil (melalui onAuthStateChange)
            navigate('/'); 
        } catch (err) {
            console.error('Login gagal:', err);
            // Perubahan: Mengambil pesan error dari Supabase
            setError(err.message || 'Email atau password salah.');
            setLoading(false);
        }
    };

  // Sisa kode JSX untuk form tetap sama
  return (
    <div className="login-container" style={{
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#f5f5f5'
    }}>
      <form onSubmit={handleLogin} className="login-form" style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Login Kasir</h2>
        
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '5px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '5px' }}
          />
        </div>

        {error && <p className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
        
        <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            opacity: loading ? 0.7 : 1
        }}>
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
