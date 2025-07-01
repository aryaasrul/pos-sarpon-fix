// src/components/OptionModal.jsx

import React from 'react';

function OptionModal({ isOpen, onClose, onEdit, onDelete }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content option-modal" onClick={e => e.stopPropagation()}>
        <h2>Opsi Produk</h2>
        <button className="option-btn" onClick={onEdit}>Edit Produk</button>
        <button className="option-btn danger" onClick={onDelete}>Hapus Produk</button>
      </div>
    </div>
  );
}

export default OptionModal;
