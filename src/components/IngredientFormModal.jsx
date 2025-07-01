// src/components/IngredientFormModal.jsx

import React, { useState, useEffect } from 'react';

function IngredientFormModal({ isOpen, onClose, onSave, ingredient }) {
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [packSize, setPackSize] = useState('');

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '');
      setPurchasePrice(ingredient.purchase_price || '');
      setPackSize(ingredient.pack_size_grams || '');
    } else {
      setName('');
      setPurchasePrice('');
      setPackSize('');
    }
  }, [ingredient, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      name,
      purchase_price: parseInt(purchasePrice, 10),
      pack_size_grams: parseInt(packSize, 10),
    };
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <h2>{ingredient ? 'Edit' : 'Tambah'} Bahan Baku</h2>
          <div className="form-group">
            <label>Nama Bahan (mis: Beans Pinara)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Harga Beli (Rp)</label>
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Ukuran Kemasan (gram)</label>
            <input type="number" value={packSize} onChange={e => setPackSize(e.target.value)} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-save">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IngredientFormModal;