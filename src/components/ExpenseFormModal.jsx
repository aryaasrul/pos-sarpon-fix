// src/components/ExpenseFormModal.jsx

import React, { useState } from 'react';

function ExpenseFormModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount) {
      alert("Nama dan jumlah pengeluaran harus diisi.");
      return;
    }
    const formData = {
      name,
      amount: parseInt(amount, 10),
    };
    onSave(formData);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <h2>Tambah Pengeluaran Baru</h2>
          
          <div className="form-group">
            <label htmlFor="expense-name">Nama Pengeluaran</label>
            <input 
              id="expense-name" 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="expense-amount">Jumlah (Rp)</label>
            <input 
              id="expense-amount" 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              required 
            />
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

export default ExpenseFormModal;
