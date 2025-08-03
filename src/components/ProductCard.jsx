// src/components/ProductCard.jsx - Polished Version
import React from 'react';

function ProductCard({ product, quantity, onAddToCart, onRemoveFromCart, showBeansIndicator = false }) {
  return (
    <div className="product-card">
      <div className="product-info">
        <h3 className="product-name">
          {product.name}
          {showBeansIndicator && (
            <span className="beans-badge">
              <img src="/icons/Filter.svg" alt="Beans" className="beans-icon" />
              Pilih Beans
            </span>
          )}
        </h3>
        <div className="product-price">
          <img src="/icons/Tick-Square.svg" alt="Price" className="price-icon" />
          Rp {product.price.toLocaleString('id-ID')}
        </div>
        {product.type === 'BOOK' && product.stock && (
          <div className="product-stock">
            <img src="/icons/database-icon.svg" alt="Stock" className="stock-icon" />
            Stok: {product.stock}
          </div>
        )}
      </div>
      
      <div className="product-actions">
        {quantity > 0 ? (
          <div className="quantity-controls">
            <button 
              className="quantity-btn decrease" 
              onClick={onRemoveFromCart}
            >
              <img src="/icons/icon-minus-circle.svg" alt="Remove" />
            </button>
            <span className="quantity">{quantity}</span>
            <button 
              className="quantity-btn increase" 
              onClick={onAddToCart}
            >
              <img src="/icons/icon-plus-circle.svg" alt="Add" />
            </button>
          </div>
        ) : (
          <button 
            className="add-btn" 
            onClick={onAddToCart}
          >
            <img 
              src={showBeansIndicator ? "/icons/Filter.svg" : "/icons/Plus-square.svg"} 
              alt="Add" 
              className="add-icon"
            />
            {showBeansIndicator ? 'Pilih' : 'Tambah'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;