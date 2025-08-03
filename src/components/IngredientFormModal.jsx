// src/components/IngredientFormModal.jsx - Enhanced dengan Auto-Recipe Creation

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

function IngredientFormModal({ isOpen, onClose, onSave, ingredient }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('filter_bean');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [packSize, setPackSize] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [autoCreateRecipe, setAutoCreateRecipe] = useState(true);
  const [defaultQuantity, setDefaultQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '');
      setCategory(ingredient.category || 'filter_bean');
      setPurchasePrice(ingredient.purchase_price || '');
      setPackSize(ingredient.pack_size_grams || '');
      setCurrentStock(ingredient.current_stock_grams || '');
      setAutoCreateRecipe(false); // Disable auto-create for edit mode
      setDefaultQuantity('');
    } else {
      // Reset untuk mode tambah baru
      setName('');
      setCategory('filter_bean');
      setPurchasePrice('');
      setPackSize('1000');
      setCurrentStock('0');
      setAutoCreateRecipe(true);
      setDefaultQuantity('25'); // Default untuk filter beans
    }
  }, [ingredient, isOpen]);

  // Update default quantity berdasarkan category
  useEffect(() => {
    if (!ingredient) { // Hanya untuk mode add new
      if (category === 'espresso_bean') {
        setDefaultQuantity('18');
      } else if (category === 'filter_bean') {
        setDefaultQuantity('25');
      } else {
        setDefaultQuantity('10');
      }
    }
  }, [category, ingredient]);

  const createAutoRecipes = async (ingredientId, ingredientCategory, quantity) => {
    try {
      console.log(`🔄 Creating auto-recipes for ingredient ${ingredientId}, category: ${ingredientCategory}`);
      
      let menuIds = [];
      
      if (ingredientCategory === 'espresso_bean') {
        // Auto-add ke semua menu espresso-based
        const { data: espressoMenus, error: menuError } = await supabase
          .from('menu_items')
          .select('id, name')
          .eq('category', 'espresso_based');

        if (menuError) throw menuError;
        
        menuIds = espressoMenus.map(menu => ({
          id: menu.id,
          name: menu.name
        }));
        
      } else if (ingredientCategory === 'filter_bean') {
        // Auto-add ke semua menu filter
        const { data: filterMenus, error: menuError } = await supabase
          .from('menu_items')
          .select('id, name')
          .eq('category', 'filter');

        if (menuError) throw menuError;
        
        menuIds = filterMenus.map(menu => ({
          id: menu.id,
          name: menu.name
        }));
      }

      if (menuIds.length === 0) {
        console.log('⚠️ No matching menus found for category:', ingredientCategory);
        return;
      }

      // Create recipe entries
      const recipeEntries = menuIds.map(menu => ({
        menu_item_id: menu.id,
        ingredient_id: ingredientId,
        quantity_grams: parseFloat(quantity)
      }));

      const { error: recipeError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeEntries);

      if (recipeError) {
        // Handle duplicate entries gracefully
        if (recipeError.code === '23505') { // Unique constraint violation
          console.log('⚠️ Some recipes already exist, skipping duplicates');
          toast.success(`Beans berhasil ditambahkan! (Beberapa resep sudah ada)`);
        } else {
          throw recipeError;
        }
      } else {
        console.log(`✅ Created ${recipeEntries.length} recipe entries`);
        toast.success(`Beans berhasil ditambahkan ke ${menuIds.length} menu!`);
      }

    } catch (error) {
      console.error('Error creating auto-recipes:', error);
      toast.error(`Recipe creation gagal: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = {
        name: name.trim(),
        category,
        purchase_price: parseFloat(purchasePrice) || 0,
        pack_size_grams: parseInt(packSize, 10) || 1000,
        current_stock_grams: parseInt(currentStock, 10) || 0,
      };

      if (ingredient) {
        // Mode Edit - Update existing ingredient
        const { error: updateError } = await supabase
          .from('ingredients')
          .update(formData)
          .eq('id', ingredient.id);

        if (updateError) throw updateError;

        toast.success(`Bahan baku "${name}" berhasil diperbarui!`);
        
      } else {
        // Mode Add New - Insert new ingredient
        const { data: newIngredient, error: insertError } = await supabase
          .from('ingredients')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;

        console.log('✅ New ingredient created:', newIngredient);

        // Auto-create recipes if enabled
        if (autoCreateRecipe && defaultQuantity) {
          await createAutoRecipes(newIngredient.id, category, defaultQuantity);
        }

        toast.success(`Bahan baku "${name}" berhasil ditambahkan!`);
      }

      // Call parent onSave untuk refresh data
      onSave();
      
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{ingredient ? 'Edit' : 'Tambah'} Bahan Baku</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <img src="/icons/Close-Square.svg" alt="Close" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nama Bahan */}
          <div className="form-group">
            <label>Nama Bahan *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Contoh: Beans Pinara Premium"
              required 
            />
          </div>

          {/* Category Selection */}
          <div className="form-group">
            <label>Kategori Bahan *</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="filter_bean">Filter Bean (Manual Brew)</option>
              <option value="espresso_bean">Espresso Bean (Mesin Espresso)</option>
              <option value="other">Lainnya</option>
            </select>
            <small className="form-help">
              {category === 'filter_bean' && '🔹 Akan otomatis ditambahkan ke menu Filter'}
              {category === 'espresso_bean' && '🔹 Akan otomatis ditambahkan ke menu Espresso-based'}
              {category === 'other' && '🔹 Tidak akan ditambahkan ke menu secara otomatis'}
            </small>
          </div>

          {/* Form Row untuk Price dan Pack Size */}
          <div className="form-row">
            <div className="form-group">
              <label>Harga Beli (Rp) *</label>
              <input 
                type="number" 
                value={purchasePrice} 
                onChange={e => setPurchasePrice(e.target.value)} 
                placeholder="125000"
                min="0"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Ukuran Kemasan (gram) *</label>
              <input 
                type="number" 
                value={packSize} 
                onChange={e => setPackSize(e.target.value)} 
                placeholder="1000"
                min="1"
                required 
              />
            </div>
          </div>

          {/* Current Stock */}
          <div className="form-group">
            <label>Stok Awal (gram)</label>
            <input 
              type="number" 
              value={currentStock} 
              onChange={e => setCurrentStock(e.target.value)} 
              placeholder="0"
              min="0"
            />
          </div>

          {/* Auto Recipe Creation (Only for new ingredients) */}
          {!ingredient && (category === 'filter_bean' || category === 'espresso_bean') && (
            <>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={autoCreateRecipe} 
                    onChange={e => setAutoCreateRecipe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Otomatis tambahkan ke menu yang sesuai
                </label>
                <small className="form-help">
                  ✨ Beans akan langsung tersedia di halaman kasir dengan perhitungan harga otomatis
                </small>
              </div>

              {autoCreateRecipe && (
                <div className="form-group">
                  <label>Takaran Default per Menu (gram)</label>
                  <input 
                    type="number" 
                    value={defaultQuantity} 
                    onChange={e => setDefaultQuantity(e.target.value)} 
                    placeholder={category === 'espresso_bean' ? '18' : '25'}
                    min="1"
                    step="0.5"
                  />
                  <small className="form-help">
                    {category === 'espresso_bean' 
                      ? '☕ Standar espresso: 18-20 gram per shot' 
                      : '🔍 Standar manual brew: 20-30 gram per cup'
                    }
                  </small>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={loading}>
              Batal
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Menyimpan...' : (ingredient ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IngredientFormModal;