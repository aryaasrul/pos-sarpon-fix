import React, { useState } from 'react';
import toast from 'react-hot-toast'; // Impor library notifikasi
import { supabase } from '../supabaseClient'; // Impor Supabase client

function Cart({ cart, onOrderSuccess }) {
  const [loading, setLoading] = useState(false);
  
  // Menghitung total harga dari item di keranjang
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Fungsi untuk memproses pesanan
  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong!'); // Gunakan toast untuk error
      return;
    }
    setLoading(true);
    
    try {
      // 1. Ambil data user yang sedang login untuk mendapatkan ID-nya
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Sesi tidak valid, silakan login ulang.");
        setLoading(false);
        return;
      }

      // 2. Format data keranjang untuk tabel 'orders' di Supabase
      const transactionId = 'txn_' + Date.now();
      const orderData = cart.map(item => ({
        transaction_id: transactionId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        hpp: item.hpp,
        user_id: user.id, // Sertakan ID pengguna yang membuat transaksi
      }));

      // 3. Kirim data pesanan ke tabel 'orders'
      const { error } = await supabase.from('orders').insert(orderData);
      
      if (error) {
        throw error; // Lemparkan error agar ditangkap oleh blok catch
      }
      
      toast.success('Pesanan berhasil disimpan!'); // Gunakan toast untuk notifikasi sukses
      onOrderSuccess(); // Panggil fungsi untuk membersihkan keranjang di parent

    } catch (error) {
      console.error('Gagal memproses pesanan:', error);
      toast.error('Gagal memproses pesanan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
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
