// src/hooks/useMenuPrices.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useRealtimePrices } from './useRealtimePrices';
import toast from 'react-hot-toast';

export const useMenuPrices = () => {
  const [displayMenu, setDisplayMenu] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // === FETCH MENU WITH LATEST PRICES ===
  const fetchMenuAndPrices = useCallback(async () => {
    try {
      console.log('🔄 Fetching fresh menu prices...');
      
      // Ambil semua menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');

      if (menuError) throw menuError;

      const finalMenu = [];

      for (const item of menuItems) {
        // Cek apakah menu ini coffee-based
        const { data: recipes, error: recipeError } = await supabase
          .from('recipe_ingredients')
          .select('id')
          .eq('menu_item_id', item.id)
          .limit(1);

        if (recipeError) throw recipeError;

        if (recipes && recipes.length > 0) {
          // MENU COFFEE - pakai RPC function
          const { data: prices, error: rpcError } = await supabase.rpc(
            'calculate_menu_prices',
            { p_menu_item_id: item.id }
          );

          if (rpcError) {
            console.error('RPC Error for menu', item.name, ':', rpcError);
            
            // Fallback: hitung manual jika RPC gagal
            const fallbackPrice = Math.ceil((item.fixed_cost * (1 + item.profit_margin)) / item.rounding_up) * item.rounding_up;
            
            finalMenu.push({
              display_id: `${item.id}-fallback`,
              menu_name: item.name,
              ingredient_name: 'Fallback Price',
              updated_at: item.updated_at,
              item_to_cart: {
                id: `menu-${item.id}-fallback`,
                name: `${item.name} (Fallback)`,
                price: fallbackPrice,
                hpp: item.fixed_cost,
                type: 'MENU'
              }
            });
            continue;
          }

          prices.forEach(priceInfo => {
            finalMenu.push({
              display_id: `${item.id}-${priceInfo.ingredient_id}`,
              menu_name: item.name,
              ingredient_name: priceInfo.ingredient_name,
              updated_at: item.updated_at,
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
          // MENU NON-COFFEE
          const { data: nonCoffeePrice, error: nonCoffeeError } = await supabase.rpc(
            'calculate_non_coffee_price',
            { p_menu_item_id: item.id }
          );

          if (nonCoffeeError) {
            console.error('Non-coffee RPC Error for menu', item.name, ':', nonCoffeeError);
            
            // Fallback: hitung manual
            const fallbackPrice = Math.ceil((item.fixed_cost * (1 + item.profit_margin)) / item.rounding_up) * item.rounding_up;
            
            finalMenu.push({
              display_id: `${item.id}-non-coffee-fallback`,
              menu_name: item.name,
              ingredient_name: 'Non-Coffee (Fallback)',
              updated_at: item.updated_at,
              item_to_cart: {
                id: `menu-${item.id}-non-coffee-fallback`,
                name: `${item.name} (Fallback)`,
                price: fallbackPrice,
                hpp: item.fixed_cost,
                type: 'MENU'
              }
            });
            continue;
          }

          finalMenu.push({
            display_id: `${item.id}-non-coffee`,
            menu_name: item.name,
            ingredient_name: 'Non-Coffee',
            updated_at: item.updated_at,
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

      console.log('✅ Menu prices fetched:', finalMenu.length, 'items');
      setDisplayMenu(finalMenu);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('❌ Menu fetch error:', err);
      throw new Error('Menu: ' + err.message);
    }
  }, []);

  // === FETCH BOOKS ===
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

  // === FETCH ALL DATA ===
  const fetchAllData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchMenuAndPrices(), fetchBooks()]);
    } catch (err) {
      const errorMsg = 'Gagal memuat data: ' + err.message;
      setError(errorMsg);
      console.error('Data fetch error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [fetchMenuAndPrices, fetchBooks]);

  // === MANUAL REFRESH FUNCTION ===
  const refreshPrices = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    const refreshToast = toast.loading('Menyinkronkan harga terbaru...');
    
    try {
      await fetchAllData(false);
      toast.success('✅ Harga berhasil disinkronkan!', { id: refreshToast });
    } catch (err) {
      toast.error('❌ Gagal refresh: ' + err.message, { id: refreshToast });
    }
  }, [fetchAllData]);

  // === REALTIME UPDATE HANDLER ===
  const handleRealtimeUpdate = useCallback((table, payload) => {
    console.log(`🔔 Realtime update from ${table}:`, payload);
    
    // Auto-refresh data setelah ada perubahan
    setTimeout(() => {
      refreshPrices();
    }, 1000); // Delay 1 detik untuk memastikan database sudah terupdate
  }, [refreshPrices]);

  // Setup realtime listener
  const { isListening } = useRealtimePrices(handleRealtimeUpdate);

  return {
    displayMenu,
    books,
    loading,
    error,
    lastUpdate,
    isListening,
    fetchAllData,
    refreshPrices
  };
};