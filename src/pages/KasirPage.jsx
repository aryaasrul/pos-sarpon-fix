// src/pages/KasirPage.jsx - FIXED VERSION untuk Menu Coffee & Non-Coffee
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import Cart from '../components/Cart';
import './KasirPage.css';
import ProductCard from '../components/ProductCard'; 
import '../components/ProductCard.css';

function KasirPage() {
    // State untuk menu kopi
    const [displayMenu, setDisplayMenu] = useState([]);
    // State untuk buku
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State untuk tab aktif
    const [activeTab, setActiveTab] = useState('menu'); // 'menu' atau 'books'

    // === FETCH MENU DATA (FIXED) ===
    const fetchMenuAndPrices = useCallback(async () => {
        try {
            const { data: menuItems, error: menuError } = await supabase
                .from('menu_items')
                .select('*');

            if (menuError) throw menuError;

            const finalMenu = [];

            for (const item of menuItems) {
                // Cek apakah menu ini coffee-based (punya recipe) atau non-coffee
                const { data: recipes, error: recipeError } = await supabase
                    .from('recipe_ingredients')
                    .select('id')
                    .eq('menu_item_id', item.id)
                    .limit(1);

                if (recipeError) throw recipeError;

                if (recipes && recipes.length > 0) {
                    // MENU COFFEE - pakai calculate_menu_prices
                    const { data: prices, error: rpcError } = await supabase.rpc(
                        'calculate_menu_prices',
                        { p_menu_item_id: item.id }
                    );

                    if (rpcError) throw rpcError;

                    prices.forEach(priceInfo => {
                        finalMenu.push({
                            display_id: `${item.id}-${priceInfo.ingredient_id}`,
                            menu_name: item.name,
                            ingredient_name: priceInfo.ingredient_name,
                            item_to_cart: {
                                id: `menu-${item.id}-${priceInfo.ingredient_id}`,
                                name: `${item.name} (${priceInfo.ingredient_name})`,
                                price: priceInfo.sell_price,
                                hpp: priceInfo.hpp,
                                type: 'MENU'
                            }
                        });
                    });
                } else {
                    // MENU NON-COFFEE - pakai calculate_non_coffee_price
                    const { data: nonCoffeePrice, error: nonCoffeeError } = await supabase.rpc(
                        'calculate_non_coffee_price',
                        { p_menu_item_id: item.id }
                    );

                    if (nonCoffeeError) throw nonCoffeeError;

                    finalMenu.push({
                        display_id: `${item.id}-non-coffee`,
                        menu_name: item.name,
                        ingredient_name: 'Non-Coffee',
                        item_to_cart: {
                            id: `menu-${item.id}-non-coffee`,
                            name: item.name,
                            price: nonCoffeePrice,
                            hpp: item.fixed_cost,
                            type: 'MENU'
                        }
                    });
                }
            }
            
            setDisplayMenu(finalMenu);
        } catch (err) {
            throw new Error('Menu: ' + err.message);
        }
    }, []);

    // === FETCH BOOKS DATA ===
    const fetchBooks = useCallback(async () => {
        try {
            const { data: booksData, error: booksError } = await supabase
                .from('books')
                .select('*')
                .gt('stock_quantity', 0) // Hanya yang masih ada stoknya
                .order('title');

            if (booksError) throw booksError;

            const formattedBooks = booksData.map(book => ({
                display_id: `book-${book.id}`,
                item_to_cart: {
                    id: `book-${book.id}`,
                    name: `${book.title}${book.author ? ` - ${book.author}` : ''}`,
                    price: book.selling_price,
                    hpp: book.purchase_price,
                    type: 'BOOK',
                    book_id: book.id,
                    stock: book.stock_quantity
                }
            }));

            setBooks(formattedBooks);
        } catch (err) {
            throw new Error('Books: ' + err.message);
        }
    }, []);

    // === FETCH ALL DATA ===
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([fetchMenuAndPrices(), fetchBooks()]);
        } catch (err) {
            setError('Gagal memuat data: ' + err.message);
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchMenuAndPrices, fetchBooks]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // === CART FUNCTIONS ===
    const handleAddToCart = useCallback((product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                // Check stock untuk buku
                if (product.type === 'BOOK') {
                    const newQuantity = existingItem.quantity + 1;
                    if (newQuantity > product.stock) {
                        alert(`Stok buku hanya tersedia ${product.stock} buah`);
                        return prevCart;
                    }
                }
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
        // Refresh data setelah transaksi (untuk update stok buku)
        fetchAllData();
    }, [fetchAllData]);
    
    // === CURRENT DATA BERDASARKAN TAB ===
    const currentData = activeTab === 'menu' ? displayMenu : books;
    
    // === FILTERED PRODUCTS ===
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return currentData;
        
        return currentData.filter(product => 
            product.item_to_cart.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentData, searchTerm]);

    // === CART MAP ===
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
                    onClick={fetchAllData}
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
                <span>Memuat data...</span>
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
            {/* Search Bar */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder={`Cari ${activeTab === 'menu' ? 'menu' : 'buku'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tab Navigation */}
            <div className="categories">
                <button 
                    className={`category ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('menu');
                        setSearchTerm('');
                    }}
                >
                    ☕ Menu ({displayMenu.length})
                </button>
                <button 
                    className={`category ${activeTab === 'books' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('books');
                        setSearchTerm('');
                    }}
                >
                    📚 Buku ({books.length})
                </button>
            </div>
            
            {/* Product List */}
            <div className="product-list-container">
                {filteredProducts.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        color: '#666',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        margin: '20px 0'
                    }}>
                        <h3>Tidak ada {activeTab === 'menu' ? 'menu' : 'buku'}</h3>
                        <p>
                            {searchTerm 
                                ? `Tidak ditemukan dengan kata kunci "${searchTerm}"`
                                : `Belum ada ${activeTab === 'menu' ? 'menu' : 'buku'} yang tersedia.`
                            }
                        </p>
                    </div>
                ) : (
                    filteredProducts.map(item => {
                        const quantity = cartMap[item.item_to_cart.id] || 0;
                        
                        return (
                            <ProductCard
                                key={item.display_id}
                                product={item.item_to_cart}
                                quantity={quantity}
                                onAddToCart={() => handleAddToCart(item.item_to_cart)}
                                onRemoveFromCart={() => handleRemoveFromCart(item.item_to_cart)}
                            />
                        );
                    })
                )}
            </div>

            <Cart cart={cart} onOrderSuccess={clearCart} />
        </div>
    );
}

export default KasirPage;