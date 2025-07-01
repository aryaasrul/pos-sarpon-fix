// src/pages/KatalogPage.jsx (Versi BARU dengan Supabase & Konsep Dinamis)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import IngredientFormModal from '../components/IngredientFormModal';
import MenuItemFormModal from '../components/MenuItemFormModal';
import '../Katalog.css';

function KatalogPage() {
  // State untuk data
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk UI
  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' or 'menuItems'
  const [isIngredientModalOpen, setIngredientModalOpen] = useState(false);
  const [isMenuItemModalOpen, setMenuItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Bisa ingredient atau menu item

  // Fungsi untuk mengambil semua data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ingredientsData, error: ingredientsError } = await supabase.from('ingredients').select('*');
      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData);

      const { data: menuItemsData, error: menuItemsError } = await supabase.from('menu_items').select('*');
      if (menuItemsError) throw menuItemsError;
      setMenuItems(menuItemsData);

    } catch (error) {
      console.error("Gagal mengambil data katalog:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Handler untuk menyimpan data (baik baru maupun update)
  const handleSave = async (formData) => {
    const table = activeTab === 'ingredients' ? 'ingredients' : 'menu_items';
    let error;

    if (selectedItem) {
      // Update data
      const { error: updateError } = await supabase.from(table).update(formData).eq('id', selectedItem.id);
      error = updateError;
    } else {
      // Insert data baru
      const { error: insertError } = await supabase.from(table).insert([formData]);
      error = insertError;
    }

    if (error) {
      alert(error.message);
    } else {
      handleCloseModals();
      fetchData(); // Muat ulang data setelah sukses
    }
  };
  
  // Handler untuk menghapus data
  const handleDelete = async (item) => {
    if (window.confirm(`Yakin ingin menghapus "${item.name}"?`)) {
        const table = activeTab === 'ingredients' ? 'ingredients' : 'menu_items';
        const { error } = await supabase.from(table).delete().eq('id', item.id);
        
        if (error) {
            alert(error.message);
        } else {
            fetchData();
        }
    }
  };


  return (
    <div className="katalog-page">
      <div className="katalog-header">
        <h1>Katalog</h1>
        <button onClick={() => handleOpenModal()} className="btn-add-product">
          <img src="/icons/icon-plus-input-manual.svg" alt="Tambah" />
          <span>Tambah {activeTab === 'ingredients' ? 'Bahan Baku' : 'Menu'}</span>
        </button>
      </div>

      {/* Navigasi Tab */}
      <div className="tab-container" style={{ marginBottom: '20px' }}>
          <button className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`} onClick={() => setActiveTab('ingredients')}>
            Bahan Baku
          </button>
          <button className={`tab-btn ${activeTab === 'menuItems' ? 'active' : ''}`} onClick={() => setActiveTab('menuItems')}>
            Menu Jualan
          </button>
      </div>
      
      {loading && <div>Memuat data...</div>}

      {/* Tampilan Konten berdasarkan Tab Aktif */}
      <div className="katalog-grid">
        {activeTab === 'ingredients' ? (
          // Daftar Bahan Baku
          ingredients.map(ing => (
            <div key={ing.id} className="katalog-card">
              <div className="katalog-card-details">
                <h3>{ing.name}</h3>
                <p>Rp {ing.purchase_price.toLocaleString('id-ID')} / {ing.pack_size_grams}g</p>
              </div>
              <div>
                <button onClick={() => handleOpenModal(ing)} style={{marginRight: '10px'}}>Edit</button>
                <button onClick={() => handleDelete(ing)}>Hapus</button>
              </div>
            </div>
          ))
        ) : (
          // Daftar Menu Jualan
          menuItems.map(item => (
            <div key={item.id} className="katalog-card">
              <div className="katalog-card-details">
                <h3>{item.name}</h3>
                <p>Biaya Tetap: Rp {item.fixed_cost.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <button onClick={() => handleOpenModal(item)} style={{marginRight: '10px'}}>Edit</button>
                <button onClick={() => handleDelete(item)}>Hapus</button>
              </div>
            </div>
          ))
        )}
      </div>

      <IngredientFormModal 
        isOpen={isIngredientModalOpen}
        onClose={handleCloseModals}
        onSave={handleSave}
        ingredient={selectedItem}
      />
      
      <MenuItemFormModal
        isOpen={isMenuItemModalOpen}
        onClose={handleCloseModals}
        onSave={handleSave}
        menuItem={selectedItem}
      />
    </div>
  );
}

export default KatalogPage;