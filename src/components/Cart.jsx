// src/components/Cart.jsx - Enhanced untuk Books
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

function Cart({ cart, onOrderSuccess }) {
  const [loading, setLoading] = useState(false);
  
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong!');
      return;
    }
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Sesi tidak valid, silakan login ulang.");
        setLoading(false);
        return;
      }

      const transactionId = 'txn_' + Date.now();
      
      // Pisahkan data berdasarkan tipe produk
      const orderData = cart.map(item => {
        const baseOrder = {
          transaction_id: transactionId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          hpp: item.hpp,
          user_id: user.id,
          product_type: item.type, // 'MENU' atau 'BOOK'
        };

        // Tambah book_id untuk produk buku
        if (item.type === 'BOOK') {
          baseOrder.book_id = item.book_id;
        }

        return baseOrder;
      });

      // === VALIDASI STOK BUKU SEBELUM TRANSAKSI ===
      const bookItems = cart.filter(item => item.type === 'BOOK');
      if (bookItems.length > 0) {
        for (const bookItem of bookItems) {
          const { data: bookData, error: bookError } = await supabase
            .from('books')
            .select('stock_quantity, title')
            .eq('id', bookItem.book_id)
            .single();

          if (bookError) throw bookError;

          if (bookData.stock_quantity < bookItem.quantity) {
            throw new Error(`Stok buku "${bookData.title}" tidak mencukupi. Tersisa: ${bookData.stock_quantity}`);
          }
        }
      }

      // === SIMPAN TRANSAKSI ===
      const { error } = await supabase.from('orders').insert(orderData);
      
      if (error) throw error;
      
      toast.success(`Transaksi berhasil! Total: Rp ${total.toLocaleString('id-ID')}`);
      onOrderSuccess();

    } catch (error) {
      console.error('Gagal memproses pesanan:', error);
      toast.error('Gagal memproses pesanan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hitung summary berdasarkan tipe
  const menuItems = cart.filter(item => item.type === 'MENU');
  const bookItems = cart.filter(item => item.type === 'BOOK');
  
  return (
    <div className="cart-summary">
      <div className="cart-info">
        <p>
          Total ({cart.length} item)
          {menuItems.length > 0 && bookItems.length > 0 && (
            <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>
              {menuItems.length} menu • {bookItems.length} buku
            </span>
          )}
        </p>
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