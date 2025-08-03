// src/components/DatabaseDebugPanel.jsx - Panel debug untuk monitor integrasi database
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

function DatabaseDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [realTimePrices, setRealTimePrices] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test koneksi database
  const testDatabaseConnection = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Basic connection
      const { data: connectionTest, error: connError } = await supabase.from('menu_items').select('count').single();
      results.push({
        test: 'Database Connection',
        status: connError ? 'FAILED' : 'PASSED',
        message: connError ? connError.message : 'Connected successfully'
      });

      // Test 2: RPC Functions
      try {
        const { data: rpcTest, error: rpcError } = await supabase.rpc('calculate_non_coffee_price', { p_menu_item_id: 1 });
        results.push({
          test: 'RPC Functions',
          status: rpcError ? 'FAILED' : 'PASSED',
          message: rpcError ? rpcError.message : `Non-coffee price calculated: ${rpcTest}`
        });
      } catch (rpcErr) {
        results.push({
          test: 'RPC Functions',
          status: 'FAILED',
          message: 'RPC functions not found or not accessible'
        });
      }

      // Test 3: Real-time subscriptions
      const channel = supabase.channel('test-channel');
      channel.subscribe((status) => {
        results.push({
          test: 'Real-time Subscriptions',
          status: status === 'SUBSCRIBED' ? 'PASSED' : 'FAILED',
          message: `Subscription status: ${status}`
        });
        channel.unsubscribe();
      });

    } catch (error) {
      results.push({
        test: 'General Database Test',
        status: 'FAILED',
        message: error.message
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  // Ambil data menu untuk comparison
  const fetchMenuData = async () => {
    try {
      // Ambil raw menu items
      const { data: items, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id');

      if (error) throw error;
      setMenuItems(items);

      // Hitung harga real-time
      const prices = [];
      for (const item of items) {
        try {
          // Cek apakah coffee atau non-coffee
          const { data: recipes } = await supabase
            .from('recipe_ingredients')
            .select('id')
            .eq('menu_item_id', item.id)
            .limit(1);

          if (recipes && recipes.length > 0) {
            // Coffee menu
            const { data: coffeePrice, error: coffeeError } = await supabase.rpc(
                  'calculate_coffee_menu_prices',  // ← NEW NAME
                  { p_menu_item_id: item.id }
            );

            if (!coffeeError && coffeePrice) {
              coffeePrice.forEach(price => {
                prices.push({
                  menu_id: item.id,
                  menu_name: item.name,
                  type: 'Coffee',
                  ingredient: price.ingredient_name,
                  calculated_price: price.sell_price,
                  hpp: price.hpp,
                  profit_margin: item.profit_margin,
                  fixed_cost: item.fixed_cost,
                  rounding_up: item.rounding_up
                });
              });
            }
          } else {
            // Non-coffee menu
            const { data: nonCoffeePrice, error: nonCoffeeError } = await supabase.rpc(
              'calculate_non_coffee_price',
              { p_menu_item_id: item.id }
            );

            if (!nonCoffeeError) {
              prices.push({
                menu_id: item.id,
                menu_name: item.name,
                type: 'Non-Coffee',
                ingredient: 'Standard',
                calculated_price: nonCoffeePrice,
                hpp: item.fixed_cost,
                profit_margin: item.profit_margin,
                fixed_cost: item.fixed_cost,
                rounding_up: item.rounding_up
              });
            }
          }
        } catch (priceError) {
          console.error('Price calculation error for', item.name, ':', priceError);
        }
      }

      setRealTimePrices(prices);
    } catch (error) {
      toast.error('Failed to fetch menu data: ' + error.message);
    }
  };

  // Force refresh harga dari database
  const forceRefreshPrices = async () => {
    try {
      toast.loading('Triggering price refresh...', { id: 'refresh' });
      
      // Trigger refresh dengan update timestamp
      const { error } = await supabase
        .from('menu_items')
        .update({ updated_at: new Date().toISOString() })
        .neq('id', 0); // Update all items

      if (error) throw error;

      toast.success('Price refresh triggered!', { id: 'refresh' });
      
      // Refresh data setelah 2 detik
      setTimeout(() => {
        fetchMenuData();
      }, 2000);

    } catch (error) {
      toast.error('Failed to refresh: ' + error.message, { id: 'refresh' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMenuData();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}
        title="Debug Database Integration"
      >
        🔧
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxHeight: '70vh',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        borderBottom: '1px solid #eee',
        background: '#f8f9fa',
        borderRadius: '12px 12px 0 0'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🔧 Database Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px', 
          flexWrap: 'wrap' 
        }}>
          <button
            onClick={testDatabaseConnection}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🧪 Test Connection
          </button>
          <button
            onClick={fetchMenuData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📊 Fetch Data
          </button>
          <button
            onClick={forceRefreshPrices}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 Force Refresh
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>🧪 Test Results</h4>
            {testResults.map((result, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: '5px',
                backgroundColor: result.status === 'PASSED' ? '#d4edda' : '#f8d7da',
                color: result.status === 'PASSED' ? '#155724' : '#721c24',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <span><strong>{result.test}:</strong> {result.message}</span>
                <span>{result.status === 'PASSED' ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Menu Items Raw Data */}
        {menuItems.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>📋 Raw Menu Items</h4>
            <div style={{ 
              maxHeight: '150px', 
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>ID</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Fixed Cost</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Profit Margin</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Rounding</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.id}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.name}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>Rp {item.fixed_cost?.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{(item.profit_margin * 100).toFixed(0)}%</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>Rp {item.rounding_up?.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calculated Prices */}
        {realTimePrices.length > 0 && (
          <div>
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>💰 Calculated Prices</h4>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Menu</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Type</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Ingredient</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>HPP</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Sell Price</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {realTimePrices.map((price, index) => (
                    <tr key={index}>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{price.menu_name}</td>
                      <td style={{ 
                        padding: '6px', 
                        border: '1px solid #ddd',
                        color: price.type === 'Coffee' ? '#8B4513' : '#228B22'
                      }}>
                        {price.type}
                      </td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{price.ingredient}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        Rp {price.hpp?.toLocaleString('id-ID')}
                      </td>
                      <td style={{ 
                        padding: '6px', 
                        border: '1px solid #ddd',
                        fontWeight: 'bold',
                        color: '#28a745'
                      }}>
                        Rp {price.calculated_price?.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                        {(price.profit_margin * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          <strong>💡 Tips Troubleshooting:</strong>
          <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Pastikan fungsi RPC sudah dibuat di Supabase SQL Editor</li>
            <li>Cek apakah profit_margin dalam format desimal (0.5 = 50%)</li>
            <li>Gunakan "Force Refresh" untuk trigger update harga</li>
            <li>Periksa log console browser untuk error detail</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default DatabaseDebugPanel;