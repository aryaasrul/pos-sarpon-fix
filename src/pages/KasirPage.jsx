// src/pages/KasirPage.jsx (Versi BARU dengan Supabase)

import { useState, useEffect } from 'react';
// Perubahan: Impor client supabase, bukan axios
import { supabase } from '../supabaseClient'; 
// Perubahan: Komponen ProductList lama mungkin tidak cocok, jadi kita sederhanakan renderingnya di sini
// import ProductList from '../components/ProductList'; 
import Cart from '../components/Cart';
import './KasirPage.css';
// Perubahan: Impor ProductCard untuk digunakan kembali
import ProductCard from '../components/ProductCard'; 
import '../components/ProductCard.css'; // Pastikan CSS-nya juga diimpor

function KasirPage() {
    // Perubahan: State untuk menampung data menu yang sudah diolah dengan harga dinamis
    const [displayMenu, setDisplayMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    // State untuk UI lainnya bisa dipertahankan
    const [searchTerm, setSearchTerm] = useState('');

    // Perubahan Total: Logika pengambilan data dari Supabase
    useEffect(() => {
        const fetchMenuAndPrices = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Ambil semua item dari tabel menu
                const { data: menuItems, error: menuError } = await supabase
                    .from('menu_items')
                    .select('*');

                if (menuError) throw menuError;

                // Array untuk menampung hasil akhir yang akan ditampilkan
                const finalMenu = [];

                // 2. Untuk setiap item menu, panggil fungsi kalkulasi harga
                for (const item of menuItems) {
                    const { data: prices, error: rpcError } = await supabase.rpc(
                        'calculate_menu_prices',
                        { p_menu_item_id: item.id }
                    );

                    if (rpcError) throw rpcError;

                    // 3. Gabungkan data menu dengan hasil harganya
                    // Ini akan membuat item terpisah untuk setiap pilihan beans
                    prices.forEach(priceInfo => {
                        finalMenu.push({
                            // id unik untuk keperluan React
                            display_id: `${item.id}-${priceInfo.ingredient_id}`, 
                            menu_name: item.name,
                            ingredient_name: priceInfo.ingredient_name,
                            // Informasi ini yang akan dimasukkan ke keranjang
                            item_to_cart: {
                                id: `${item.id}-${priceInfo.ingredient_id}`,
                                name: `${item.name} (${priceInfo.ingredient_name})`,
                                price: priceInfo.sell_price,
                                hpp: priceInfo.hpp, // Kita simpan juga HPP-nya
                            }
                        });
                    });
                }
                
                setDisplayMenu(finalMenu);

            } catch (err) {
                setError('Gagal memuat data menu.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuAndPrices();
    }, []);

    // Perubahan: Logika untuk menambah item ke keranjang
    const handleAddToCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
    };

    const handleRemoveFromCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem?.quantity > 1) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity - 1 } : item
                );
            } else {
                return prevCart.filter((item) => item.id !== product.id);
            }
        });
    };
    
    const clearCart = () => {
        setCart([]);
    };
    
    // Logika filter berdasarkan pencarian
    const filteredProducts = displayMenu.filter(product => 
        product.item_to_cart.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div>Memuat menu...</div>;
    if (error) return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;

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
            
            {/* Perubahan: Kita render langsung di sini, bukan lewat ProductList */}
            <div className="product-list-container">
                 {filteredProducts.map(menuItem => {
                    const cartItem = cart.find(item => item.id === menuItem.item_to_cart.id);
                    const quantity = cartItem ? cartItem.quantity : 0;
                    
                    return (
                        <ProductCard
                            key={menuItem.display_id}
                            // product yang dikirim ke component card adalah object siap pakai
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