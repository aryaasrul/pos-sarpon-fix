// src/components/MenuItemFormModal.jsx

import React, { useState, useEffect } from 'react';

function MenuItemFormModal({ isOpen, onClose, onSave, menuItem }) {
  const [name, setName] = useState('');
  const [fixedCost, setFixedCost] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [roundingUp, setRoundingUp] = useState('');

  useEffect(() => {
    if (menuItem) {
      setName(menuItem.name || '');
      setFixedCost(menuItem.fixed_cost || '');
      setProfitMargin(menuItem.profit_margin || '');
      setRoundingUp(menuItem.rounding_up || '');
    } else {
      setName('');
      setFixedCost('1600');
      setProfitMargin('0.5');
      setRoundingUp('500');
    }
  }, [menuItem, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      name,
      fixed_cost: parseInt(fixedCost, 10),
      profit_margin: parseFloat(profitMargin),
      rounding_up: parseInt(roundingUp, 10)
    };
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <h2>{menuItem ? 'Edit' : 'Tambah'} Menu Jualan</h2>
          <div className="form-group">
            <label>Nama Menu (mis: Manual Brew)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Biaya Tetap (Rp)</label>
            <input type="number" value={fixedCost} onChange={e => setFixedCost(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Margin Profit (contoh: 0.5 untuk 50%)</label>
            <input type="number" step="0.01" value={profitMargin} onChange={e => setProfitMargin(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Pembulatan Harga (contoh: 500)</label>
            <input type="number" step="100" value={roundingUp} onChange={e => setRoundingUp(e.target.value)} required />
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

export default MenuItemFormModal;