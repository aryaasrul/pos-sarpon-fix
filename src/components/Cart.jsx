// src/components/Cart.jsx (Versi BARU dengan Supabase)

import React, { useState } from 'react';
// Perubahan: Impor supabase, bukan axios
import { supabase } from '../supabaseClient'; 

// Menerima prop 'onOrderSuccess' untuk membersihkan keranjang dari parent component
function Cart({ cart, onOrderSuccess }) {
  const [loading, setLoading] = useState(false);
  
  // Menghitung total harga dari item di keranjang (logika ini tidak berubah)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Perubahan Total: Fungsi untuk memproses pesanan menggunakan Supabase
  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      alert('Keranjang kosong!');
      return;
    }
    setLoading(true);
    
    // Format data keranjang agar sesuai dengan tabel 'orders' di Supabase
    const transactionId = 'txn_' + Date.now(); // Buat ID transaksi unik
    const orderData = cart.map(item => ({
      transaction_id: transactionId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      hpp: item.hpp,
    }));

    try {
      // Kirim data pesanan ke tabel 'orders'
      const { error } = await supabase.from('orders').insert(orderData);
      
      // Jika ada error dari Supabase, lemparkan agar ditangkap oleh blok catch
      if (error) {
        throw error;
      }
      
      alert('Pesanan berhasil disimpan!');
      onOrderSuccess(); // Panggil fungsi untuk membersihkan keranjang di parent

    } catch (error) {
      console.error('Gagal memproses pesanan:', error);
      alert('Gagal memproses pesanan. Silakan coba lagi. Pesan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Bagian JSX untuk merender komponen tidak berubah
  return (
    <div className="cart-summary">
      <div className="cart-info">
        <p>Total ({cart.length} item)</p>
        <p>Rp {total.toLocaleString('id-ID')}</p>
      </div>
      <button 
        onClick={handleProcessOrder} 
        className="btn-process" 
        disabled={loading || cart.length === 0}
      >
        {loading ? 'Memproses...' : 'Proses Pesanan'}
      </button>
    </div>
  );
}

export default Cart;