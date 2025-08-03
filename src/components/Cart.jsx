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
    const loadingToast = toast.loading('Memproses transaksi...');
    
    try {
      // === 1. GET USER (Optional - bisa skip jika tidak ada auth) ===
      // Untuk saat ini kita skip auth dulu, tapi struktur siap untuk user management
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (authError) {
        console.log('No auth user found, proceeding without user_id');
      }

      console.log('🔥 Processing order...');
      console.log('🛒 Cart items:', cart);

      // === 2. VALIDASI STOK BUKU SEBELUM TRANSAKSI ===
      const bookItems = cart.filter(item => item.type === 'BOOK');
      
      if (bookItems.length > 0) {
        console.log('📚 Validating book stock...');
        
        for (const bookItem of bookItems) {
          // Ambil ID buku dari string "book-{id}"
          const bookId = parseInt(bookItem.id.replace('book-', ''));
          
          if (!bookId || isNaN(bookId)) {
            throw new Error(`Book ID tidak valid untuk item: ${bookItem.name}`);
          }

          const { data: bookData, error: bookError } = await supabase
            .from('books')
            .select('stock_quantity, title, id')
            .eq('id', bookId)
            .single();

          if (bookError) {
            console.error('Book validation error:', bookError);
            throw new Error(`Gagal validasi buku: ${bookError.message}`);
          }

          if (!bookData) {
            throw new Error(`Buku dengan ID ${bookId} tidak ditemukan`);
          }

          if (bookData.stock_quantity < bookItem.quantity) {
            throw new Error(`Stok buku "${bookData.title}" tidak mencukupi. Tersisa: ${bookData.stock_quantity}, diminta: ${bookItem.quantity}`);
          }
        }
        console.log('✅ Book stock validation passed');
      }

      // === 3. HITUNG TOTAL PROFIT ===
      const totalProfit = cart.reduce((sum, item) => {
        const profit = (item.price - (item.hpp || 0)) * item.quantity;
        return sum + profit;
      }, 0);

      // === 4. BUAT TRANSACTION RECORD ===
      console.log('💾 Creating transaction record...');
      
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          transaction_code: `TRX-${Date.now()}`, // Generate simple transaction code
          total_amount: total,
          total_profit: totalProfit,
          payment_method: 'cash', // Default cash, bisa ditambah payment method selector nanti
          notes: `${cart.length} items - Auto generated transaction`
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction insert error:', transactionError);
        throw new Error(`Gagal membuat transaksi: ${transactionError.message}`);
      }

      const transactionId = transactionData.id;
      console.log('✅ Transaction created with ID:', transactionId);

      // === 5. BUAT TRANSACTION ITEMS ===
      console.log('📝 Creating transaction items...');
      
      const transactionItems = cart.map(item => {
        // Tentukan item_type dan item_id berdasarkan jenis item
        let itemType, itemId, itemName, ingredientName = null;
        
        if (item.type === 'BOOK') {
          itemType = 'book';
          itemId = parseInt(item.id.replace('book-', ''));
          itemName = item.name;
        } else {
          // MENU item
          itemType = 'menu';
          // Extract menu ID dari item.id yang format "menu-{menu_id}-{ingredient_id}"
          const idParts = item.id.split('-');
          if (idParts.length >= 2) {
            itemId = parseInt(idParts[1]); // menu_id
            // Cek jika ada ingredient info
            if (item.name.includes('(') && item.name.includes(')')) {
              const match = item.name.match(/\(([^)]+)\)/);
              ingredientName = match ? match[1] : null;
            }
          } else {
            itemId = parseInt(item.id.replace('menu-', ''));
          }
          itemName = item.name;
        }

        return {
          transaction_id: transactionId,
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
          ingredient_name: ingredientName,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          hpp: item.hpp || 0,
          profit_per_item: (item.price - (item.hpp || 0)) * item.quantity
        };
      });

      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)
        .select();

      if (itemsError) {
        console.error('Transaction items insert error:', itemsError);
        // Rollback transaction jika items gagal
        await supabase.from('transactions').delete().eq('id', transactionId);
        throw new Error(`Gagal menyimpan detail transaksi: ${itemsError.message}`);
      }

      console.log('✅ Transaction items created:', itemsData);

      // === 6. UPDATE STOK BUKU ===
      if (bookItems.length > 0) {
        console.log('📦 Updating book stock...');
        
        for (const bookItem of bookItems) {
          const bookId = parseInt(bookItem.id.replace('book-', ''));
          
          try {
            // Update stok langsung (schema baru tidak pakai stock_movements)
            const { error: stockUpdateError } = await supabase
              .from('books')
              .update({ 
                stock_quantity: supabase.raw(`stock_quantity - ${bookItem.quantity}`),
                updated_at: new Date().toISOString()
              })
              .eq('id', bookId);

            if (stockUpdateError) {
              console.error('Stock update error:', stockUpdateError);
              // Log error tapi jangan gagalkan transaksi
              console.warn('Failed to update book stock, but transaction completed');
            } else {
              console.log(`✅ Stock updated for book ID ${bookId}: -${bookItem.quantity}`);
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
      
      successMessage += `\n🆔 ID: ${transactionData.transaction_code}`;
      
      toast.success(successMessage, { duration: 5000 });
      
      console.log('🎉 Transaction completed successfully:', transactionData);
      
      // Clear cart dan refresh data
      onOrderSuccess();

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      
      toast.dismiss(loadingToast);
      
      // Enhanced error handling
      let errorMessage = 'Gagal memproses pesanan';
      
      if (error.message.includes('Stok buku')) {
        errorMessage = `📚 ${error.message}`;
      } else if (error.message.includes('Book ID')) {
        errorMessage = '📚 Data buku tidak valid. Silakan refresh halaman dan coba lagi.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '🌐 Koneksi bermasalah. Periksa internet Anda dan coba lagi.';
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = '🔒 Tidak memiliki izin untuk melakukan transaksi. Silakan refresh halaman.';
      } else if (error.message.includes('foreign key')) {
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
