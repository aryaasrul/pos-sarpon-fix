// src/pages/BooksPage.jsx - Updated dengan styling seragam

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './BooksPage.css';

// Book Form Modal Component
function BookFormModal({ isOpen, onClose, onSave, book = null }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');

  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setIsbn(book.isbn || '');
      setPurchasePrice(book.purchase_price?.toString() || '');
      setSellingPrice(book.selling_price?.toString() || '');
      setStockQuantity(book.stock_quantity?.toString() || '');
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQuantity('');
    }
  }, [book, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title,
      author,
      isbn,
      purchase_price: parseFloat(purchasePrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      stock_quantity: parseInt(stockQuantity) || 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{book ? 'Edit Buku' : 'Tambah Buku Baru'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src="/icons/Close-Square.svg" alt="Close" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Judul Buku *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul buku"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Penulis</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Masukkan nama penulis"
            />
          </div>
          
          <div className="form-group">
            <label>ISBN</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Masukkan ISBN"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Harga Beli *</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Harga Jual *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Stok Awal</label>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Batal
            </button>
            <button type="submit" className="save-btn">
              {book ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Stock Modal Component
function AddStockModal({ isOpen, onClose, onSave, book }) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuantity('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (quantity && parseInt(quantity) > 0) {
      onSave(parseInt(quantity), notes);
    }
  };

  if (!isOpen || !book) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Tambah Stok: {book.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src="/icons/Close-Square.svg" alt="Close" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Stok Saat Ini</label>
            <input
              type="text"
              value={`${book.stock_quantity} unit`}
              disabled
            />
          </div>
          
          <div className="form-group">
            <label>Tambah Stok *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Jumlah yang akan ditambahkan"
              min="1"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Batal
            </button>
            <button type="submit" className="save-btn">
              Tambah Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main BooksPage Component
function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .order(sortBy, { ascending: sortBy === 'title' });
      
      if (fetchError) throw fetchError;
      
      setBooks(data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [sortBy]);

  const handleSaveBook = async (bookData) => {
    try {
      let error;
      
      if (selectedBook) {
        const { error: updateError } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', selectedBook.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('books')
          .insert([bookData]);
        error = insertError;
      }

      if (error) throw error;
      
      setIsModalOpen(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err) {
      console.error('Error saving book:', err);
      alert(`Gagal menyimpan buku: ${err.message}`);
    }
  };

  const handleDeleteBook = async (book) => {
    if (window.confirm(`Yakin ingin menghapus buku "${book.title}"?`)) {
      try {
        const { error } = await supabase
          .from('books')
          .delete()
          .eq('id', book.id);

        if (error) throw error;
        
        fetchBooks();
      } catch (err) {
        console.error('Error deleting book:', err);
        alert(`Gagal menghapus buku: ${err.message}`);
      }
    }
  };

  const handleAddStock = async (quantity, notes) => {
    try {
      const newStock = selectedBook.stock_quantity + quantity;
      
      const { error } = await supabase
        .from('books')
        .update({ stock_quantity: newStock })
        .eq('id', selectedBook.id);

      if (error) throw error;
      
      setIsStockModalOpen(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err) {
      console.error('Error adding stock:', err);
      alert(`Gagal menambah stok: ${err.message}`);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (book.isbn && book.isbn.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Calculate statistics
  const totalBooks = books.length;
  const totalStock = books.reduce((sum, book) => sum + book.stock_quantity, 0);
  const totalValue = books.reduce((sum, book) => sum + (book.selling_price * book.stock_quantity), 0);
  const lowStockBooks = books.filter(book => book.stock_quantity <= 5).length;

  if (error && !books.length) {
    return (
      <div className="books-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Terjadi Kesalahan</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchBooks} className="retry-btn">
              🔄 Coba Lagi
            </button>
            <button onClick={() => window.location.reload()} className="refresh-btn">
              🔄 Refresh Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="books-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <img src="/icons/Loading.svg" alt="Loading" className="spinning" />
          </div>
          <p className="loading-text">Memuat data buku...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="books-page">
      {/* Header */}
      <div className="books-header">
        <h1>Manajemen Buku</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-add-book">
          <img src="/icons/icon-plus-input-manual.svg" alt="Tambah" />
          <span>Tambah Buku</span>
        </button>
      </div>

      {/* Connection Status */}
      <div className={`connection-status ${books.length > 0 ? 'connected' : 'disconnected'}`}>
        {books.length > 0 ? 
          `✅ Terhubung - ${books.length} buku dimuat` : 
          '⚠️ Belum ada data atau koneksi bermasalah'
        }
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total-books">
          <div className="stat-number">{totalBooks}</div>
          <div className="stat-label">Total Buku</div>
        </div>
        <div className="stat-card total-stock">
          <div className="stat-number">{totalStock}</div>
          <div className="stat-label">Total Stok</div>
        </div>
        <div className="stat-card total-value">
          <div className="stat-number">Rp {totalValue.toLocaleString('id-ID')}</div>
          <div className="stat-label">Nilai Inventori</div>
        </div>
        <div className="stat-card low-stock">
          <div className="stat-number">{lowStockBooks}</div>
          <div className="stat-label">Stok Rendah (≤5)</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-container">
        <div className="search-group">
          <label>Cari Buku</label>
          <div className="search-input-container">
            <img src="/icons/Search.svg" alt="Search" className="search-icon" />
            <input
              type="text"
              placeholder="Cari judul, penulis, atau ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                <img src="/icons/Close-Square.svg" alt="Clear" />
              </button>
            )}
          </div>
        </div>
        <div className="sort-group">
          <label>Urutkan</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Terbaru</option>
            <option value="title">Judul A-Z</option>
            <option value="stock_quantity">Stok Terendah</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {filteredBooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>
            {searchTerm ? 'Tidak ditemukan' : 'Belum ada buku'}
          </h3>
          <p>
            {searchTerm ? 
              'Coba ubah kata kunci pencarian' : 
              'Mulai tambahkan buku pertama untuk koleksi toko Anda'
            }
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="add-first-book-btn"
            >
              + Tambah Buku Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="books-grid">
          {filteredBooks.map(book => (
            <div key={book.id} className="book-card">
              {/* Stock Badge */}
              {book.stock_quantity <= 5 && (
                <div className={`stock-badge ${book.stock_quantity === 0 ? 'out-of-stock' : 'low-stock'}`}>
                  {book.stock_quantity === 0 ? 'HABIS' : 'STOK RENDAH'}
                </div>
              )}

              {/* Book Info */}
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                {book.author && (
                  <p className="book-author">oleh {book.author}</p>
                )}
                {book.isbn && (
                  <p className="book-isbn">ISBN: {book.isbn}</p>
                )}
              </div>

              {/* Book Details */}
              <div className="book-details">
                <div className="detail-item">
                  <div className="detail-label">Harga Beli</div>
                  <div className="detail-value price-buy">
                    Rp {book.purchase_price.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Harga Jual</div>
                  <div className="detail-value price-sell">
                    Rp {book.selling_price.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Stok</div>
                  <div className={`detail-value ${
                    book.stock_quantity > 5 ? 'stock-good' : 
                    book.stock_quantity > 0 ? 'stock-low' : 'stock-out'
                  }`}>
                    {book.stock_quantity} unit
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Profit/Unit</div>
                  <div className="detail-value">
                    Rp {(book.selling_price - book.purchase_price).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="book-actions">
                <button 
                  onClick={() => {
                    setSelectedBook(book);
                    setIsModalOpen(true);
                  }}
                  className="edit-book-btn"
                >
                  Edit
                </button>
                <button 
                  onClick={() => {
                    setSelectedBook(book);
                    setIsStockModalOpen(true);
                  }}
                  className="add-stock-btn"
                >
                  + Stok
                </button>
                <button 
                  onClick={() => handleDeleteBook(book)}
                  className="delete-book-btn"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <BookFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBook(null);
        }}
        onSave={handleSaveBook}
        book={selectedBook}
      />

      <AddStockModal
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