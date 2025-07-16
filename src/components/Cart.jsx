// src/components/Cart.jsx - FINAL VERSION (UUID Ready)
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

// Utility function untuk generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function Cart({ cart, onOrderSuccess }) {
  const [loading, setLoading] = useState(false);
  
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong!');
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Memproses transaksi...');
    
    try {
      // === 1. GET USER ===
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error("Sesi tidak valid: " + authError.message);
      }

      if (!user) {
        throw new Error("Silakan login untuk melakukan transaksi.");
      }

      // === 2. GENERATE TRANSACTION ID (UUID FORMAT) ===
      const transactionId = generateUUID();
      
      console.log('🔥 Processing order with UUID transaction ID:', transactionId);
      console.log('🛒 Cart items:', cart);

      // === 3. VALIDASI STOK BUKU SEBELUM TRANSAKSI ===
      const bookItems = cart.filter(item => item.type === 'BOOK');
      
      if (bookItems.length > 0) {
        console.log('📚 Validating book stock...');
        
        for (const bookItem of bookItems) {
          // Pastikan book_id ada dan valid UUID
          if (!bookItem.book_id) {
            throw new Error(`Book ID missing for item: ${bookItem.name}`);
          }

          const { data: bookData, error: bookError } = await supabase
            .from('books')
            .select('stock_quantity, title, id')
            .eq('id', bookItem.book_id)
            .single();

          if (bookError) {
            console.error('Book validation error:', bookError);
            throw new Error(`Gagal validasi buku: ${bookError.message}`);
          }

          if (!bookData) {
            throw new Error(`Buku dengan ID ${bookItem.book_id} tidak ditemukan`);
          }

          if (bookData.stock_quantity < bookItem.quantity) {
            throw new Error(`Stok buku "${bookData.title}" tidak mencukupi. Tersisa: ${bookData.stock_quantity}, diminta: ${bookItem.quantity}`);
          }
        }
        console.log('✅ Book stock validation passed');
      }

      // === 4. SIAPKAN DATA ORDER (UUID FORMAT) ===
      const orderData = cart.map(item => {
        const baseOrder = {
          transaction_id: transactionId, // UUID format untuk semua transaksi
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          hpp: item.hpp || 0,
          user_id: user.id, // UUID
          product_type: item.type, // 'MENU' atau 'BOOK'
          created_at: new Date().toISOString()
        };

        // Tambah book_id untuk produk buku (UUID format)
        if (item.type === 'BOOK' && item.book_id) {
          baseOrder.book_id = item.book_id; // UUID dari database books
        }

        return baseOrder;
      });

      console.log('📝 Order data prepared:', orderData);

      // === 5. SIMPAN TRANSAKSI KE DATABASE ===
      console.log('💾 Saving transaction to database...');
      
      const { data: insertedOrders, error: insertError } = await supabase
        .from('orders')
        .insert(orderData)
        .select();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Handle specific errors
        if (insertError.message.includes('uuid') || insertError.code === '22P02') {
          throw new Error('Format data tidak valid. Silakan refresh halaman dan coba lagi.');
        }
        
        if (insertError.message.includes('foreign key')) {
          throw new Error('Referensi data tidak valid. Silakan refresh halaman.');
        }
        
        throw new Error(`Gagal menyimpan transaksi: ${insertError.message}`);
      }

      console.log('✅ Transaction saved successfully:', insertedOrders);

      // === 6. UPDATE STOK BUKU & CATAT PERGERAKAN ===
      if (bookItems.length > 0) {
        console.log('📦 Updating book stock and recording movements...');
        
        for (const bookItem of bookItems) {
          try {
            // Update stok buku dengan raw SQL yang benar
            const { data: updateResult, error: stockUpdateError } = await supabase
              .rpc('decrement_book_stock', {
                book_id: bookItem.book_id,
                quantity_to_subtract: bookItem.quantity
              });

            // Jika RPC function tidak ada, gunakan alternative method
            if (stockUpdateError && stockUpdateError.message.includes('function')) {
              console.log('RPC function not found, using alternative update method...');
              
              // Alternative: Get current stock first, then update
              const { data: currentBook, error: fetchError } = await supabase
                .from('books')
                .select('stock_quantity, title')
                .eq('id', bookItem.book_id)
                .single();

              if (fetchError) throw new Error(`Gagal mengambil data buku: ${fetchError.message}`);

              const newStock = currentBook.stock_quantity - bookItem.quantity;
              
              if (newStock < 0) {
                throw new Error(`Stok buku "${currentBook.title}" tidak mencukupi untuk transaksi ini`);
              }

              const { data: updateData, error: updateError } = await supabase
                .from('books')
                .update({ 
                  stock_quantity: newStock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', bookItem.book_id)
                .select('stock_quantity, title');

              if (updateError) throw new Error(`Gagal update stok: ${updateError.message}`);
              
              console.log(`✅ Stock updated for ${bookItem.name}:`, updateData);
            } else if (stockUpdateError) {
              throw new Error(`Gagal update stok buku: ${stockUpdateError.message}`);
            } else {
              console.log(`✅ Stock updated via RPC for ${bookItem.name}:`, updateResult);
            }

            // Catat pergerakan stok
            const { error: movementError } = await supabase
              .from('book_stock_movements')
              .insert([{
                book_id: bookItem.book_id, // UUID
                movement_type: 'OUT',
                quantity: bookItem.quantity,
                reference_type: 'SALE',
                reference_id: transactionId, // UUID
                notes: `Penjualan - ${bookItem.name}`,
                user_id: user.id, // UUID
                created_at: new Date().toISOString()
              }]);

            if (movementError) {
              console.error('Movement record error:', movementError);
              // Log error tapi jangan gagalkan transaksi
              console.warn('Failed to record stock movement, but sale completed successfully');
            } else {
              console.log(`✅ Stock movement recorded for ${bookItem.name}`);
            }

          } catch (stockError) {
            console.error('Stock management error:', stockError);
            // Jangan gagalkan transaksi karena stock management error
            console.warn('Stock update failed but transaction saved:', stockError.message);
          }
        }
        
        console.log('✅ Book stock management completed');
      }

      // === 7. SUCCESS ===
      toast.dismiss(loadingToast);
      
      // Enhanced success message
      const menuCount = cart.filter(item => item.type === 'MENU').length;
      const bookCount = cart.filter(item => item.type === 'BOOK').length;
      
      let successMessage = `🎉 Transaksi berhasil!\n💰 Total: Rp ${total.toLocaleString('id-ID')}`;
      
      if (menuCount > 0 && bookCount > 0) {
        successMessage += `\n☕ ${menuCount} menu, 📚 ${bookCount} buku`;
      } else if (menuCount > 0) {
        successMessage += `\n☕ ${menuCount} item menu`;
      } else if (bookCount > 0) {
        successMessage += `\n📚 ${bookCount} buku`;
      }
      
      successMessage += `\n🆔 ID: ${transactionId.slice(0, 8)}...`;
      
      toast.success(successMessage, { duration: 5000 });
      
      console.log('🎉 Transaction completed successfully with UUID:', transactionId);
      
      // Clear cart dan refresh data
      onOrderSuccess();

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      
      toast.dismiss(loadingToast);
      
      // Enhanced error handling dengan konteks yang jelas
      let errorMessage = 'Gagal memproses pesanan';
      
      if (error.message.includes('Stok buku')) {
        errorMessage = `📚 ${error.message}`;
      } else if (error.message.includes('Book ID missing')) {
        errorMessage = '📚 Data buku tidak valid. Silakan refresh halaman dan coba lagi.';
      } else if (error.message.includes('uuid') || error.message.includes('Format data')) {
        errorMessage = '🔧 ' + error.message;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '🌐 Koneksi bermasalah. Periksa internet Anda dan coba lagi.';
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = '🔒 Tidak memiliki izin untuk melakukan transaksi. Silakan login ulang.';
      } else if (error.message.includes('foreign key') || error.message.includes('Referensi data')) {
        errorMessage = '🔗 Referensi data tidak valid. Silakan refresh halaman.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
      
    } finally {
      setLoading(false);
    }
  };

  // Hitung summary berdasarkan tipe
  const menuItems = cart.filter(item => item.type === 'MENU');
  const bookItems = cart.filter(item => item.type === 'BOOK');
  
  // Hitung total profit
  const totalProfit = cart.reduce((sum, item) => {
    const profit = (item.price - (item.hpp || 0)) * item.quantity;
    return sum + profit;
  }, 0);
  
  // Hitung total item per kategori
  const totalMenuQuantity = menuItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalBookQuantity = bookItems.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <div className="cart-summary">
      <div className="cart-info">
        <p>
          Total ({cart.length} item{cart.length > 1 ? 's' : ''})
          {menuItems.length > 0 && bookItems.length > 0 && (
            <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>
              ☕ {totalMenuQuantity} menu • 📚 {totalBookQuantity} buku
            </span>
          )}
          {totalProfit > 0 && (
            <span style={{ fontSize: '11px', color: '#198754', display: 'block' }}>
              💰 Est. profit: Rp {totalProfit.toLocaleString('id-ID')}
            </span>
          )}
        </p>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Rp {total.toLocaleString('id-ID')}
        </p>
      </div>
      <button 
        onClick={handleProcessOrder} 
        className="btn-process" 
        disabled={loading || cart.length === 0}
        style={{
          opacity: loading || cart.length === 0 ? 0.6 : 1,
          cursor: loading || cart.length === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? (
          <>
            <span style={{ marginRight: '8px' }}>⏳</span>
            Memproses...
          </>
        ) : (
          <>
            <span style={{ marginRight: '8px' }}>💳</span>
            Proses Pesanan
          </>
        )}
      </button>
    </div>
  );
}

export default Cart;