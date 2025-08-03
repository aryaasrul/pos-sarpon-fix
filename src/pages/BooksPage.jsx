// src/pages/BooksPage.jsx - Fixed untuk Schema Database Baru
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

function BookFormModal({ isOpen, onClose, onSave, book }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    purchase_price: '',
    selling_price: '',
    stock_quantity: '',
    description: ''
  });

  useEffect(() => {
    if (book) {
      setFormData({ 
        ...book, 
        purchase_price: book.purchase_price || '', 
        selling_price: book.selling_price || '',
        stock_quantity: book.stock_quantity || ''
      });
    } else {
      setFormData({
        title: '', 
        author: '', 
        isbn: '', 
        purchase_price: '', 
        selling_price: '', 
        stock_quantity: '', 
        description: ''
      });
    }
  }, [book, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      purchase_price: parseInt(formData.purchase_price) || 0,
      selling_price: parseInt(formData.selling_price) || 0,
      stock_quantity: parseInt(formData.stock_quantity) || 0
    };
    onSave(dataToSave);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{ 
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '700px', 
        maxHeight: '90vh', 
        overflowY: 'auto',
        width: '90%'
      }}>
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '20px' }}>{book ? 'Edit' : 'Tambah'} Buku</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Judul Buku *</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => handleInputChange('title', e.target.value)} 
                required 
                placeholder="Masukkan judul buku"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Penulis</label>
              <input 
                type="text" 
                value={formData.author} 
                onChange={e => handleInputChange('author', e.target.value)} 
                placeholder="Nama penulis"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>ISBN</label>
              <input 
                type="text" 
                value={formData.isbn} 
                onChange={e => handleInputChange('isbn', e.target.value)} 
                placeholder="978-XXXXXXXXXX"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Stok Awal/Tambah Stok</label>
              <input 
                type="number" 
                value={formData.stock_quantity} 
                onChange={e => handleInputChange('stock_quantity', e.target.value)} 
                required 
                min="0"
                placeholder="Jumlah stok"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Harga Beli (Rp) *</label>
              <input 
                type="number" 
                value={formData.purchase_price} 
                onChange={e => handleInputChange('purchase_price', e.target.value)} 
                required 
                min="0"
                placeholder="Harga pembelian"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Harga Jual (Rp) *</label>
              <input 
                type="number" 
                value={formData.selling_price} 
                onChange={e => handleInputChange('selling_price', e.target.value)} 
                required 
                min="0"
                placeholder="Harga penjualan"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Deskripsi</label>
            <textarea 
              value={formData.description} 
              onChange={e => handleInputChange('description', e.target.value)}
              rows="3"
              placeholder="Deskripsi buku (opsional)"
              style={{ 
                width: '100%', 
                resize: 'vertical', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {formData.purchase_price && formData.selling_price && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '4px', 
              marginTop: '15px' 
            }}>
              <strong>Preview Keuntungan: Rp {(parseInt(formData.selling_price) - parseInt(formData.purchase_price)).toLocaleString('id-ID')}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Batal
            </button>
            <button 
              type="submit"
              style={{
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ isOpen, onClose, onSave, book }) {
  const [additionalStock, setAdditionalStock] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      book_id: book.id,
      quantity: parseInt(additionalStock),
      notes
    });
    setAdditionalStock('');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{ 
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '15px' }}>Tambah Stok: {book?.title}</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Stok saat ini: {book?.stock_quantity} buah</p>
          
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Jumlah Stok Tambahan *</label>
            <input 
              type="number" 
              value={additionalStock} 
              onChange={e => setAdditionalStock(e.target.value)} 
              required 
              min="1"
              placeholder="Jumlah yang akan ditambahkan"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Catatan</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              rows="2"
              placeholder="Catatan tambahan (opsional)"
              style={{ 
                width: '100%', 
                resize: 'vertical', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Batal
            </button>
            <button 
              type="submit"
              style={{
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Tambah Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  const fetchBooks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order(sortBy, { ascending: sortBy === 'title' });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Gagal memuat buku: ${error.message}`);
      }

      console.log('Fetched books:', data?.length || 0, 'books');
      setBooks(data || []);
      
    } catch (error) {
      console.error('Error fetching books:', error);
      setError(error.message);
      toast.error(error.message);
      
      if (sortBy !== 'created_at') {
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('books')
            .select('*');
            
          if (!fallbackError && fallbackData) {
            setBooks(fallbackData);
            setError(null);
            toast.success('Data berhasil dimuat (mode fallback)');
          }
        } catch (fallbackErr) {
          console.error('Fallback fetch also failed:', fallbackErr);
        }
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    
    const interval = setInterval(() => {
      fetchBooks(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [sortBy]);

  const handleSave = async (formData) => {
    try {
      const dataToSave = { 
        ...formData,
        updated_at: new Date().toISOString()
      };

      let result;
      if (selectedBook) {
        result = await supabase
          .from('books')
          .update(dataToSave)
          .eq('id', selectedBook.id)
          .select();
          
        if (result.error) throw result.error;
        toast.success('Buku berhasil diperbarui!');
      } else {
        result = await supabase
          .from('books')
          .insert([dataToSave])
          .select();
          
        if (result.error) throw result.error;
        toast.success('Buku berhasil ditambahkan!');
      }

      setIsModalOpen(false);
      setSelectedBook(null);
      await fetchBooks(false);
      
    } catch (error) {
      console.error('Error saving book:', error);
      
      if (error.message.includes('permission')) {
        toast.error('Tidak memiliki izin untuk menyimpan data. Silakan hubungi administrator.');
      } else if (error.message.includes('network')) {
        toast.error('Koneksi bermasalah. Periksa internet Anda.');
      } else {
        toast.error('Gagal menyimpan buku: ' + error.message);
      }
    }
  };

  // === FIXED: handleAddStock - Remove book_stock_movements ===
  const handleAddStock = async (stockData) => {
    try {
      // === SIMPLIFIED VERSION - No stock movements tracking ===
      
      // Update stok langsung tanpa catat pergerakan
      const { error: updateError } = await supabase
        .from('books')
        .update({ 
          stock_quantity: selectedBook.stock_quantity + stockData.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockData.book_id);

      if (updateError) throw updateError;

      toast.success(`Stok berhasil ditambahkan! +${stockData.quantity} buah`);
      setIsStockModalOpen(false);
      setSelectedBook(null);
      fetchBooks(); // Refresh data
      
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Gagal menambah stok: ' + error.message);
    }
  };

  const handleDelete = async (book) => {
    const confirmMessage = `Yakin ingin menghapus buku "${book.title}"?\n\n⚠️ Data ini akan terhapus permanen dan tidak bisa dikembalikan!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);

      if (error) throw error;
      
      toast.success(`Buku "${book.title}" berhasil dihapus!`);
      await fetchBooks(false);
      
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Gagal menghapus buku: ' + error.message);
    }
  };

  const handleRefresh = () => {
    toast.loading('Menyinkronkan data...', { id: 'refresh' });
    fetchBooks().then(() => {
      toast.success('Data berhasil disinkronkan!', { id: 'refresh' });
    });
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (book.isbn && book.isbn.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const totalBooks = books.length;
  const totalStock = books.reduce((sum, book) => sum + book.stock_quantity, 0);
  const totalValue = books.reduce((sum, book) => sum + (book.selling_price * book.stock_quantity), 0);
  const lowStockBooks = books.filter(book => book.stock_quantity <= 5).length;

  if (error && !books.length) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        color: '#dc3545'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <h3>Terjadi Kesalahan</h3>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            onClick={() => fetchBooks()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Coba Lagi
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #000',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span>Memuat data buku...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📚 Manajemen Buku</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleRefresh}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Sync
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Tambah Buku
          </button>
        </div>
      </div>

      <div style={{ 
        marginBottom: '20px',
        padding: '8px 12px',
        backgroundColor: books.length > 0 ? '#d4edda' : '#f8d7da',
        color: books.length > 0 ? '#155724' : '#721c24',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {books.length > 0 ? 
          `✅ Terhubung - ${books.length} buku dimuat` : 
          '⚠️ Belum ada data atau koneksi bermasalah'
        }
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '25px' 
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{totalBooks}</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Total Buku</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{totalStock}</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Total Stok</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>Rp {totalValue.toLocaleString('id-ID')}</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Nilai Inventori</p>
        </div>
        <div style={{ 
          background: lowStockBooks > 0 ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          color: lowStockBooks > 0 ? 'white' : '#333',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{lowStockBooks}</h3>
          <p style={{ margin: 0, opacity: 0.9 }}>Stok Rendah (≤5)</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '15px', 
        marginBottom: '20px',
        alignItems: 'end'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cari Buku</label>
          <input
            type="text"
            placeholder="Cari judul, penulis, atau ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #ddd', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Urutkan</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #ddd', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="created_at">Terbaru</option>
            <option value="title">Judul A-Z</option>
            <option value="stock_quantity">Stok Terendah</option>
          </select>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📚</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>
            {searchTerm ? 'Tidak ditemukan' : 'Belum ada buku'}
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#6c757d' }}>
            {searchTerm ? 
              'Coba ubah kata kunci pencarian' : 
              'Mulai tambahkan buku pertama untuk koleksi toko Anda'
            }
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              + Tambah Buku Pertama
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredBooks.map(book => (
            <div key={book.id} style={{
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
            }}
            >
              {book.stock_quantity <= 5 && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: book.stock_quantity === 0 ? '#dc3545' : '#ffc107',
                  color: book.stock_quantity === 0 ? 'white' : '#000',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {book.stock_quantity === 0 ? 'HABIS' : 'STOK RENDAH'}
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '18px', 
                  lineHeight: '1.3',
                  color: '#212529'
                }}>
                  {book.title}
                </h3>
                {book.author && (
                  <p style={{ 
                    margin: '0 0 5px 0', 
                    color: '#6c757d', 
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    oleh {book.author}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '10px',
                  fontSize: '14px'
                }}>
                  <div>
                    <span style={{ color: '#6c757d' }}>Harga Beli:</span>
                    <div style={{ fontWeight: 'bold', color: '#dc3545' }}>
                      Rp {book.purchase_price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>Harga Jual:</span>
                    <div style={{ fontWeight: 'bold', color: '#198754' }}>
                      Rp {book.selling_price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>Stok:</span>
                    <div style={{ 
                      fontWeight: 'bold',
                      color: book.stock_quantity > 5 ? '#198754' : book.stock_quantity > 0 ? '#ffc107' : '#dc3545'
                    }}>
                      {book.stock_quantity} buah
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#6c757d' }}>Profit/unit:</span>
                    <div style={{ fontWeight: 'bold', color: '#0d6efd' }}>
                      Rp {(book.selling_price - book.purchase_price).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {book.description && (
                <div style={{ 
                  marginBottom: '15px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: '1.4'
                }}>
                  {book.description.length > 120 ? 
                    `${book.description.substring(0, 120)}...` : 
                    book.description
                  }
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    setSelectedBook(book);
                    setIsModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => {
                    setSelectedBook(book);
                    setIsStockModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#198754',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  📦 +Stok
                </button>
                <button 
                  onClick={() => handleDelete(book)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BookFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBook(null);
        }}
        onSave={handleSave}
        book={selectedBook}
      />

      <StockModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setSelectedBook(null);
        }}
        onSave={handleAddStock}
        book={selectedBook}
      />
    </div>
  );
}

export default BooksPage;