// src/pages/KasirPage.jsx - OPTIMIZED VERSION
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import Cart from '../components/Cart';
import './KasirPage.css';
import ProductCard from '../components/ProductCard'; 
import '../components/ProductCard.css';

function KasirPage() {
    const [displayMenu, setDisplayMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // === OPTIMIZED DATA FETCHING ===
    const fetchMenuAndPrices = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Parallel fetch untuk performance
            const { data: menuItems, error: menuError } = await supabase
                .from('menu_items')
                .select('*');

            if (menuError) throw menuError;

            const finalMenu = [];

            // Batch RPC calls untuk performance
            const pricePromises = menuItems.map(async (item) => {
                const { data: prices, error: rpcError } = await supabase.rpc(
                    'calculate_menu_prices',
                    { p_menu_item_id: item.id }
                );

                if (rpcError) throw rpcError;
                return { item, prices };
            });

            const results = await Promise.all(pricePromises);

            results.forEach(({ item, prices }) => {
                prices.forEach(priceInfo => {
                    finalMenu.push({
                        display_id: `${item.id}-${priceInfo.ingredient_id}`,
                        menu_name: item.name,
                        ingredient_name: priceInfo.ingredient_name,
                        item_to_cart: {
                            id: `${item.id}-${priceInfo.ingredient_id}`,
                            name: `${item.name} (${priceInfo.ingredient_name})`,
                            price: priceInfo.sell_price,
                            hpp: priceInfo.hpp,
                        }
                    });
                });
            });
            
            setDisplayMenu(finalMenu);

        } catch (err) {
            setError('Gagal memuat data menu: ' + err.message);
            console.error('Menu fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenuAndPrices();
    }, [fetchMenuAndPrices]);

    // === OPTIMIZED CART FUNCTIONS ===
    const handleAddToCart = useCallback((product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id 
                        ? { ...item, quantity: item.quantity + 1 } 
                        : item
                );
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
    }, []);

    const handleRemoveFromCart = useCallback((product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem?.quantity > 1) {
                return prevCart.map((item) =>
                    item.id === product.id 
                        ? { ...item, quantity: item.quantity - 1 } 
                        : item
                );
            } else {
                return prevCart.filter((item) => item.id !== product.id);
            }
        });
    }, []);
    
    const clearCart = useCallback(() => {
        setCart([]);
    }, []);
    
    // === MEMOIZED FILTERED PRODUCTS ===
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return displayMenu;
        
        return displayMenu.filter(product => 
            product.item_to_cart.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [displayMenu, searchTerm]);

    // === MEMOIZED CART MAP ===
    const cartMap = useMemo(() => {
        return cart.reduce((map, item) => {
            map[item.id] = item.quantity;
            return map;
        }, {});
    }, [cart]);

    // === ERROR STATE ===
    if (error) {
        return (
            <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                color: '#dc3545'
            }}>
                <h3>Terjadi Kesalahan</h3>
                <p>{error}</p>
                <button 
                    onClick={fetchMenuAndPrices}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    // === LOADING STATE ===
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '50vh',
                flexDirection: 'column',
                gap: '15px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #000',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <span>Memuat menu...</span>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="kasir-page">
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Cari Produk..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="product-list-container">
                 {filteredProducts.map(menuItem => {
                    const quantity = cartMap[menuItem.item_to_cart.id] || 0;
                    
                    return (
                        <ProductCard
                            key={menuItem.display_id}
                            product={menuItem.item_to_cart}
                            quantity={quantity}
                            onAddToCart={() => handleAddToCart(menuItem.item_to_cart)}
                            onRemoveFromCart={() => handleRemoveFromCart(menuItem.item_to_cart)}
                        />
                    );
                })}
            </div>

            <Cart cart={cart} onOrderSuccess={clearCart} />
        </div>
    );
}

export default KasirPage;