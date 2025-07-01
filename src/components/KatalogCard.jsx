// src/components/KatalogCard.jsx

import React from 'react';

function KatalogCard({ product, onOptionsClick }) {
  return (
    <div className="katalog-card">
      <div className="katalog-card-image-placeholder" />
      <div className="katalog-card-details">
        <h3>{product.name}</h3>
        <p>Rp {product.price.toLocaleString('id-ID')}</p>
      </div>
      <button className="katalog-card-options-btn" onClick={() => onOptionsClick(product)}>
        <img src="/icons/More-Square.svg" alt="Opsi" />
      </button>
    </div>
  );
}

export default KatalogCard;