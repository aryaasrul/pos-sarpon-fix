// src/components/ProductList.jsx

import React from 'react';
import ProductCard from './ProductCard'; // Import komponen kartu

function ProductList({ products, cart, onAddToCart, onRemoveFromCart }) {
  return (
    <div className="product-list-container">
      {products.map((product) => {
        // Cari item ini di keranjang untuk mendapatkan jumlahnya
        const cartItem = cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;

        return (
          <ProductCard
            key={product.id}
            product={product}
            quantity={quantity}
            onAddToCart={onAddToCart}
            onRemoveFromCart={onRemoveFromCart}
          />
        );
      })}
    </div>
  );
}

export default ProductList;