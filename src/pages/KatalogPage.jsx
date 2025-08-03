// src/pages/KatalogPage.jsx - Updated untuk Enhanced IngredientFormModal

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import IngredientFormModal from '../components/IngredientFormModal';
import MenuItemFormModal from '../components/MenuItemFormModal';
import './KatalogPage.css';
import toast from 'react-hot-toast';

function KatalogPage() {
  // State untuk data
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk UI
  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' or 'menuItems'
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngredientModalOpen, setIngredientModalOpen] = useState(false);
  const [isMenuItemModalOpen, setMenuItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Bisa ingredient atau menu item

  // Fungsi untuk mengambil semua data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ingredientsData, error: ingredientsError } = await supabase.from('ingredients').select('*').order('created_at', { ascending: false });
      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);

      const { data: menuItemsData, error: menuItemsError } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
      if (menuItemsError) throw menuItemsError;
      setMenuItems(menuItemsData || []);

    } catch (error) {
      console.error("Gagal mengambil data katalog:", error);
      toast.error("Gagal mengambil data katalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data berdasarkan pencarian
  const filteredData = () => {
    const data = activeTab === 'ingredients' ? ingredients : menuItems;
    if (!searchTerm) return data;
    
    return data.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handler untuk membuka modal
  const handleOpenModal = (item = null) => {
    setSelectedItem(item);
    if (activeTab === 'ingredients') {
      setIngredientModalOpen(true);
    } else {
      setMenuItemModalOpen(true);
    }
  };

  const handleCloseModals = () => {
    setIngredientModalOpen(false);
    setMenuItemModalOpen(false);
    setSelectedItem(null);
  };

  // Handler untuk menyimpan data - Simplified untuk enhanced modal
  const handleSave = async (formData = null) => {
    // Enhanced modal sudah handle save logic sendiri
    // Kita hanya perlu refresh data dan close modal
    handleCloseModals();
    await fetchData(); // Refresh data list
  };

  // Handler untuk menyimpan menu item (old way untuk menu items)
  const handleSaveMenuItem = async (formData) => {
    try {
      let error;

      if (selectedItem) {
        // Update data
        const { error: updateError } = await supabase.from('menu_items').update(formData).eq('id', selectedItem.id);
        error = updateError;
      } else {
        // Insert data baru
        const { error: insertError } = await supabase.from('menu_items').insert([formData]);
        error = insertError;
      }

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Menu ${selectedItem ? 'diperbarui' : 'ditambahkan'} berhasil!`);
        handleCloseModals();
        fetchData(); // Muat ulang data setelah sukses
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Gagal menyimpan menu item');
    }
  };
  
  // Handler untuk menghapus data
  const handleDelete = async (item) => {
    const itemType = activeTab === 'ingredients' ? 'bahan baku' : 'menu';
    if (window.confirm(`Yakin ingin menghapus ${itemType} "${item.name}"?`)) {
      try {
        const table = activeTab === 'ingredients' ? 'ingredients' : 'menu_items';
        const { error } = await supabase.from(table).delete().eq('id', item.id);
        
        if (error) throw error;
        
        toast.success(`${itemType} "${item.name}" berhasil dihapus`);
        fetchData();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(`Gagal menghapus ${itemType}: ${error.message}`);
      }
    }
  };

  // Helper function untuk format category display
  const getCategoryDisplay = (category) => {
    switch(category) {
      case 'espresso_bean': return '☕ Espresso Bean';
      case 'filter_bean': return '🔍 Filter Bean';
      case 'other': return '📦 Lainnya';
      default: return category;
    }
  };

  // Helper function untuk format category color
  const getCategoryColor = (category) => {
    switch(category) {
      case 'espresso_bean': return '#8B4513';
      case 'filter_bean': return '#228B22';
      case 'other': return '#888';
      default: return '#888';
    }
  };

  const currentData = filteredData();

  return (
    <div className="katalog-page">
      {/* Header */}
      <div className="katalog-header">
        <h1>Katalog</h1>
        <button onClick={() => handleOpenModal()} className="btn-add-product">
          <img src="/icons/icon-plus-input-manual.svg" alt="Tambah" />
          <span>Tambah {activeTab === 'ingredients' ? 'Bahan Baku' : 'Menu'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <div className="search-input-container">
            <img src="/icons/Search.svg" alt="Search" className="search-icon" />
            <input
              type="text"
              placeholder={`Cari ${activeTab === 'ingredients' ? 'bahan baku' : 'menu'}...`}
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
        <button className="btn-filter">
          <img src="/icons/Filter.svg" alt="Filter" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`} 
          onClick={() => {
            setActiveTab('ingredients');
            setSearchTerm('');
          }}
        >
          <img src="/icons/database-icon.svg" alt="Bahan Baku" className="tab-icon" />
          Bahan Baku ({ingredients.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'menuItems' ? 'active' : ''}`} 
          onClick={() => {
            setActiveTab('menuItems');
            setSearchTerm('');
          }}
        >
          <img src="/icons/laporan-icon.svg" alt="Menu" className="tab-icon" />
          Menu Jualan ({menuItems.length})
        </button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner">
            <img src="/icons/Loading.svg" alt="Loading" className="spinning" />
          </div>
          <p style={{ color: '#666', fontFamily: 'Axiforma', fontWeight: '500' }}>
            Memuat data katalog...
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {currentData.length === 0 ? (
            <div className="empty-state">
              <img 
                src={activeTab === 'ingredients' ? "/icons/database-icon.svg" : "/icons/laporan-icon.svg"} 
                alt="Empty" 
                className="empty-icon" 
              />
              <h3>
                {searchTerm 
                  ? `Tidak ditemukan "${searchTerm}"` 
                  : `Belum ada ${activeTab === 'ingredients' ? 'bahan baku' : 'menu'}`
                }
              </h3>
              <p>
                {searchTerm 
                  ? `Coba kata kunci lain untuk ${activeTab === 'ingredients' ? 'bahan baku' : 'menu'}`
                  : `Mulai tambahkan ${activeTab === 'ingredients' ? 'bahan baku' : 'menu'} pertama Anda`
                }
              </p>
              {!searchTerm && (
                <button onClick={() => handleOpenModal()} className="add-first-item-btn">
                  <img src="/icons/icon-plus-input-manual.svg" alt="Tambah" />
                  Tambah {activeTab === 'ingredients' ? 'Bahan Baku' : 'Menu'} Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="katalog-grid">
              {activeTab === 'ingredients' ? (
                // Daftar Bahan Baku - Enhanced display
                currentData.map(ingredient => (
                  <div key={ingredient.id} className="katalog-card">
                    <div className="katalog-card-image-placeholder">
                      <div 
                        className="category-indicator"
                        style={{ 
                          backgroundColor: getCategoryColor(ingredient.category),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          position: 'absolute',
                          top: '8px',
                          right: '8px'
                        }}
                      >
                        {ingredient.category === 'espresso_bean' ? '☕' : 
                         ingredient.category === 'filter_bean' ? '🔍' : '📦'}
                      </div>
                    </div>
                    <div className="katalog-card-details">
                      <h3>{ingredient.name}</h3>
                      <p style={{ marginBottom: '4px' }}>
                        <strong>Rp {ingredient.purchase_price?.toLocaleString('id-ID') || '0'}</strong> / {ingredient.pack_size_grams || 0}g
                      </p>
                      <p style={{ fontSize: '12px', color: getCategoryColor(ingredient.category), margin: '0 0 4px 0', fontWeight: '500' }}>
                        {getCategoryDisplay(ingredient.category)}
                      </p>
                      <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>
                        Stok: {ingredient.current_stock_grams || 0}g
                      </p>
                    </div>
                    <div className="katalog-card-actions">
                      <button 
                        onClick={() => handleOpenModal(ingredient)} 
                        className="edit-btn"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(ingredient)}
                        className="delete-btn"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                // Daftar Menu Jualan
                currentData.map(menuItem => (
                  <div key={menuItem.id} className="katalog-card">
                    <div className="katalog-card-image-placeholder">
                      <div 
                        className="category-indicator"
                        style={{ 
                          backgroundColor: menuItem.category === 'espresso_based' ? '#8B4513' : 
                                          menuItem.category === 'filter' ? '#228B22' :
                                          menuItem.category === 'local_proses' ? '#FF6B35' : '#6C5CE7',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          position: 'absolute',
                          top: '8px',
                          right: '8px'
                        }}
                      >
                        {menuItem.category === 'espresso_based' ? '☕' : 
                         menuItem.category === 'filter' ? '🔍' :
                         menuItem.category === 'local_proses' ? '🏛️' : '🥤'}
                      </div>
                    </div>
                    <div className="katalog-card-details">
                      <h3>{menuItem.name}</h3>
                      <p style={{ marginBottom: '4px' }}>
                        <strong>Biaya Tetap: Rp {menuItem.fixed_cost?.toLocaleString('id-ID') || '0'}</strong>
                      </p>
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>
                        Margin: {((menuItem.profit_margin || 0) * 100).toFixed(0)}% | Pembulatan: Rp {menuItem.rounding_up?.toLocaleString('id-ID') || '0'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#999', margin: '0', textTransform: 'capitalize' }}>
                        Kategori: {menuItem.category?.replace('_', ' ') || 'Tidak dikategorikan'}
                      </p>
                    </div>
                    <div className="katalog-card-actions">
                      <button 
                        onClick={() => handleOpenModal(menuItem)} 
                        className="edit-btn"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(menuItem)}
                        className="delete-btn"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <IngredientFormModal 
        isOpen={isIngredientModalOpen}
        onClose={handleCloseModals}
        onSave={handleSave}
        ingredient={selectedItem}
      />
      
      <MenuItemFormModal
        isOpen={isMenuItemModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveMenuItem}
        menuItem={selectedItem}
      />
    </div>
  );
}

export default KatalogPage;