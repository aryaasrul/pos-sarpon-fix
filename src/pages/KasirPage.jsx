// src/pages/KasirPage.jsx - Complete Polished UI
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import Cart from '../components/Cart';
import './KasirPage.css';
import ProductCard from '../components/ProductCard'; 
import '../components/ProductCard.css';

// Polished Beans Selection Modal
function BeansSelectionModal({ isOpen, onClose, menuItem, availableBeans, onSelectBean }) {
  if (!isOpen || !menuItem) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content beans-modal">
        <div className="modal-header">
          <h2>
            <img src="/icons/Filter.svg" alt="Beans" className="modal-icon" />
            Pilih Beans untuk {menuItem.name}
          </h2>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            <img src="/icons/Close-Square.svg" alt="Close" />
          </button>
        </div>
        
        <div className="beans-grid">
          {availableBeans.map(bean => (
            <button
              key={bean.ingredient_id}
              className="bean-option"
              onClick={() => onSelectBean(bean)}
            >
              <div className="bean-info">
                <div className="bean-header">
                  <img src="/icons/laporan-icon.svg" alt="Bean" className="bean-icon" />
                  <h3>{bean.ingredient_name}</h3>
                </div>
                <p className="bean-hpp">
                  <img src="/icons/database-icon.svg" alt="HPP" className="small-icon" />
                  HPP: Rp {bean.hpp.toLocaleString('id-ID')}
                </p>
                <div className="bean-price">
                  <img src="/icons/Tick-Square.svg" alt="Price" className="small-icon" />
                  Rp {bean.sell_price.toLocaleString('id-ID')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KasirPage() {
    const [displayMenu, setDisplayMenu] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('menu');
    
    // Beans selection modal states
    const [showBeansModal, setShowBeansModal] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [availableBeans, setAvailableBeans] = useState([]);

    // === FETCH MENU DATA ===
    const fetchMenuAndPrices = useCallback(async () => {
        try {
            const { data: menuItems, error: menuError } = await supabase
                .from('menu_items')
                .select('*');

            if (menuError) throw menuError;

            const finalMenu = [];

            for (const item of menuItems) {
                const { data: recipes, error: recipeError } = await supabase
                    .from('recipe_ingredients')
                    .select('id')
                    .eq('menu_item_id', item.id)
                    .limit(1);

                if (recipeError) throw recipeError;

                if (recipes && recipes.length > 0) {
                    const { data: prices, error: rpcError } = await supabase.rpc(
                        'calculate_coffee_menu_prices',
                        { p_menu_item_id: item.id }
                    );

                    if (!rpcError && prices && prices.length > 0) {
                        finalMenu.push({
                            display_id: `${item.id}-coffee`,
                            menu_name: item.name,
                            category: item.category,
                            has_variants: true,
                            beans_options: prices,
                            item_to_cart: {
                                id: `menu-${item.id}`,
                                name: item.name,
                                price: prices[0].sell_price,
                                hpp: prices[0].hpp,
                                type: 'MENU',
                                menu_item_id: item.id,
                                requires_bean_selection: true,
                                category: item.category
                            }
                        });
                    } else {
                        const fallbackPrice = Math.ceil((item.fixed_cost * (1 + item.profit_margin)) / item.rounding_up) * item.rounding_up;
                        finalMenu.push({
                            display_id: `${item.id}-coffee-fallback`,
                            menu_name: item.name,
                            category: item.category,
                            has_variants: false,
                            item_to_cart: {
                                id: `menu-${item.id}-fallback`,
                                name: item.name,
                                price: fallbackPrice,
                                hpp: item.fixed_cost,
                                type: 'MENU',
                                category: item.category
                            }
                        });
                    }
                } else {
                    const { data: nonCoffeePrice, error: nonCoffeeError } = await supabase.rpc(
                        'calculate_non_coffee_price',
                        { p_menu_item_id: item.id }
                    );

                    const finalPrice = nonCoffeePrice || Math.ceil((item.fixed_cost * (1 + item.profit_margin)) / item.rounding_up) * item.rounding_up;

                    finalMenu.push({
                        display_id: `${item.id}-non-coffee`,
                        menu_name: item.name,
                        category: item.category,
                        has_variants: false,
                        item_to_cart: {
                            id: `menu-${item.id}-non-coffee`,
                            name: item.name,
                            price: finalPrice,
                            hpp: item.fixed_cost,
                            type: 'MENU',
                            category: item.category
                        }
                    });
                }
            }
            
            setDisplayMenu(finalMenu);
        } catch (err) {
            throw new Error('Menu: ' + err.message);
        }
    }, []);

    const fetchBooks = useCallback(async () => {
        try {
            const { data: booksData, error: booksError } = await supabase
                .from('books')
                .select('*')
                .gt('stock_quantity', 0)
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

    const handleBeanSelection = (bean) => {
        const cartItem = {
            id: `menu-${selectedMenuItem.menu_item_id}-${bean.ingredient_id}`,
            name: `${selectedMenuItem.name} (${bean.ingredient_name})`,
            price: bean.sell_price,
            hpp: bean.hpp,
            type: 'MENU'
        };

        handleAddToCart(cartItem);
        setShowBeansModal(false);
        setSelectedMenuItem(null);
        setAvailableBeans([]);
    };

    const handleAddToCart = useCallback((product) => {
        if (product.requires_bean_selection) {
            const menuData = displayMenu.find(m => m.item_to_cart.id === product.id);
            if (menuData && menuData.beans_options) {
                setSelectedMenuItem(product);
                setAvailableBeans(menuData.beans_options);
                setShowBeansModal(true);
                return;
            }
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
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
    }, [displayMenu]);

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
        fetchAllData();
    }, [fetchAllData]);
    
    const currentData = activeTab === 'menu' ? displayMenu : books;
    
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return currentData;
        
        return currentData.filter(product => 
            product.item_to_cart.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentData, searchTerm]);

    const cartMap = useMemo(() => {
        return cart.reduce((map, item) => {
            map[item.id] = item.quantity;
            return map;
        }, {});
    }, [cart]);

    if (error) {
        return (
            <div className="error-state">
                <img src="/icons/Close-Square.svg" alt="Error" className="error-icon" />
                <h3>Terjadi Kesalahan</h3>
                <p>{error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    <img src="/icons/Swap.svg" alt="Retry" />
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="loading-spinner">
                    <img src="/icons/Swap.svg" alt="Loading" className="spinning" />
                </div>
                <span>Memuat data...</span>
            </div>
        );
    }

    return (
        <div className="kasir-page">
            {/* Search Bar */}
            <div className="search-bar">
                <div className="search-input-container">
                    <img src="/icons/icons-search.svg" alt="Search" className="search-icon" />
                    <input
                        type="text"
                        placeholder={`Cari ${activeTab === 'menu' ? 'menu' : 'buku'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button 
                            className="clear-search-btn"
                            onClick={() => setSearchTerm('')}
                        >
                            <img src="/icons/Close-Square.svg" alt="Clear" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="categories">
                <button 
                    className={`category-btn ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('menu');
                        setSearchTerm('');
                    }}
                >
                    <img src="/icons/laporan-icon.svg" alt="Menu" className="tab-icon" />
                    Menu ({displayMenu.length})
                </button>
                <button 
                    className={`category-btn ${activeTab === 'books' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('books');
                        setSearchTerm('');
                    }}
                >
                    <img src="/icons/orders-icon.svg" alt="Books" className="tab-icon" />
                    Buku ({books.length})
                </button>
            </div>
            
            {/* Product List */}
            <div className="product-list-container">
                {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <img 
                            src={activeTab === 'menu' ? "/icons/laporan-icon.svg" : "/icons/orders-icon.svg"} 
                            alt="Empty" 
                            className="empty-icon" 
                        />
                        <h3>Tidak ada {activeTab === 'menu' ? 'menu' : 'buku'}</h3>
                        <p>
                            {searchTerm 
                                ? `Tidak ditemukan dengan kata kunci "${searchTerm}"`
                                : `Belum ada ${activeTab === 'menu' ? 'menu' : 'buku'} yang tersedia.`
                            }
                        </p>
                        {searchTerm && (
                            <button 
                                className="clear-filter-btn"
                                onClick={() => setSearchTerm('')}
                            >
                                <img src="/icons/Filter.svg" alt="Clear" />
                                Hapus Filter
                            </button>
                        )}
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
                                showBeansIndicator={item.has_variants}
                            />
                        );
                    })
                )}
            </div>

            <Cart cart={cart} onOrderSuccess={clearCart} />
            
            {/* Beans Selection Modal */}
            <BeansSelectionModal
                isOpen={showBeansModal}
                onClose={() => {
                    setShowBeansModal(false);
                    setSelectedMenuItem(null);
                    setAvailableBeans([]);
                }}
                menuItem={selectedMenuItem}
                availableBeans={availableBeans}
                onSelectBean={handleBeanSelection}
            />
        </div>
    );
}

export default KasirPage;