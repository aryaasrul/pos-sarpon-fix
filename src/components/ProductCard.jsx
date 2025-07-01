// src/components/ProductCard.jsx
import React from 'react';
import './ProductCard.css';

function ProductCard({ product, onAddToCart, onRemoveFromCart, quantity }) {
  return (
    <div className="product-card">
      <div className="product-image-placeholder" />
      <div className="product-details">
        <h3>{product.name}</h3>
        <p>Rp {product.price.toLocaleString('id-ID')}</p>
      </div>
      <div className="quantity-control">
        <button onClick={() => onRemoveFromCart(product)}>
          <img src="/icons/icon-minus-circle.svg" alt="Kurangi" />
        </button>
        <span>{quantity}</span>
        <button onClick={() => onAddToCart(product)}>
          <img src="/icons/icon-plus-circle.svg" alt="Tambah" />
        </button>
      </div>
    </div>
  );
}

export default ProductCard;