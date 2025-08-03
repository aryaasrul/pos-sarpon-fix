// src/components/RPCDebugger.jsx - Component untuk debug RPC functions
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

function RPCDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test RPC functions step by step
  const testRPCFunctions = async () => {
    setLoading(true);
    const results = [];

    try {
      // 1. Test basic connection
      console.log('🧪 Testing basic database connection...');
      const { data: basicTest, error: basicError } = await supabase
        .from('menu_items')
        .select('id, name, fixed_cost, profit_margin, rounding_up')
        .limit(3);

      results.push({
        test: '1. Basic Connection',
        status: basicError ? 'FAILED' : 'PASSED',
        message: basicError ? basicError.message : `Found ${basicTest.length} menu items`,
        data: basicTest
      });

      if (basicError) {
        setTestResults(results);
        setLoading(false);
        return;
      }

      // 2. Check table structures
      console.log('🧪 Checking table structures...');
      
      // Check recipe_ingredients structure
      const { data: recipeColumns, error: recipeColError } = await supabase
        .rpc('exec', { 
          query: `SELECT column_name, data_type 
                  FROM information_schema.columns 
                  WHERE table_name = 'recipe_ingredients' 
                    AND table_schema = 'public'
                  ORDER BY ordinal_position;`
        });

      results.push({
        test: '2A. Recipe Ingredients Table Structure',
        status: recipeColError ? 'FAILED' : 'PASSED',
        message: recipeColError ? recipeColError.message : `Columns found: ${recipeColumns?.length || 0}`,
        data: recipeColumns
      });

      // Check ingredients structure  
      const { data: ingredientColumns, error: ingredientColError } = await supabase
        .rpc('exec', {
          query: `SELECT column_name, data_type 
                  FROM information_schema.columns 
                  WHERE table_name = 'ingredients' 
                    AND table_schema = 'public'
                  ORDER BY ordinal_position;`
        });

      results.push({
        test: '2B. Ingredients Table Structure',
        status: ingredientColError ? 'FAILED' : 'PASSED',
        message: ingredientColError ? ingredientColError.message : `Columns found: ${ingredientColumns?.length || 0}`,
        data: ingredientColumns
      });

      // 3. Test sample data
      console.log('🧪 Testing sample data...');
      const { data: recipeData, error: recipeDataError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .limit(3);

      results.push({
        test: '3. Recipe Ingredients Sample Data',
        status: recipeDataError ? 'FAILED' : 'PASSED',
        message: recipeDataError ? recipeDataError.message : `Found ${recipeData?.length || 0} recipe records`,
        data: recipeData
      });

      // 4. Test function existence
      console.log('🧪 Testing RPC function existence...');
      const { data: functions, error: funcError } = await supabase
        .rpc('exec', {
          query: `SELECT routine_name, routine_type 
                  FROM information_schema.routines 
                  WHERE routine_schema = 'public' 
                    AND routine_name LIKE 'calculate%'
                  ORDER BY routine_name;`
        });

      results.push({
        test: '4. RPC Function Existence',
        status: funcError ? 'FAILED' : 'PASSED',
        message: funcError ? funcError.message : `Found functions: ${functions?.map(f => f.routine_name).join(', ') || 'None'}`,
        data: functions
      });

      // 5. Test calculate_non_coffee_price function
      console.log('🧪 Testing calculate_non_coffee_price...');
      if (basicTest && basicTest.length > 0) {
        const testMenuItem = basicTest[0];
        
        try {
          const { data: nonCoffeeResult, error: nonCoffeeError } = await supabase.rpc(
            'calculate_non_coffee_price',
            { p_menu_item_id: testMenuItem.id }
          );

          results.push({
            test: '5. Non-Coffee Price Calculation',
            status: nonCoffeeError ? 'FAILED' : 'PASSED',
            message: nonCoffeeError ? nonCoffeeError.message : `Price for "${testMenuItem.name}": Rp ${nonCoffeeResult?.toLocaleString('id-ID')}`,
            data: { 
              input: testMenuItem, 
              result: nonCoffeeResult,
              expected: Math.ceil((testMenuItem.fixed_cost * (1 + testMenuItem.profit_margin)) / testMenuItem.rounding_up) * testMenuItem.rounding_up
            }
          });
        } catch (rpcErr) {
          results.push({
            test: '5. Non-Coffee Price Calculation',
            status: 'FAILED',
            message: `RPC Error: ${rpcErr.message}`,
            data: { input: testMenuItem, error: rpcErr }
          });
        }
      }

      // 6. Test calculate_menu_prices function (if recipe data exists)
      console.log('🧪 Testing calculate_menu_prices...');
      if (recipeData && recipeData.length > 0) {
        const testMenuWithRecipe = recipeData[0];
        
        try {
          const { data: coffeePrices, error: coffeeError } = await supabase.rpc(
            'calculate_menu_prices',
            { p_menu_item_id: testMenuWithRecipe.menu_item_id }
          );

          results.push({
            test: '6. Coffee Menu Price Calculation',
            status: coffeeError ? 'FAILED' : 'PASSED',
            message: coffeeError ? coffeeError.message : `Calculated ${coffeePrices?.length || 0} price variants`,
            data: { input: testMenuWithRecipe, result: coffeePrices }
          });
        } catch (rpcErr) {
          results.push({
            test: '6. Coffee Menu Price Calculation',
            status: 'FAILED',
            message: `RPC Error: ${rpcErr.message}`,
            data: { input: testMenuWithRecipe, error: rpcErr }
          });
        }
      } else {
        results.push({
          test: '6. Coffee Menu Price Calculation',
          status: 'SKIPPED',
          message: 'No recipe data found - all menus will be treated as non-coffee',
          data: null
        });
      }

    } catch (globalError) {
      results.push({
        test: 'Global Test',
        status: 'FAILED',
        message: globalError.message,
        data: globalError
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  // Create missing RPC functions
  const createRPCFunctions = async () => {
    try {
      toast.loading('Creating RPC functions...', { id: 'create-rpc' });

      // Function 1: calculate_non_coffee_price
      const nonCoffeeFunction = `
        CREATE OR REPLACE FUNCTION calculate_non_coffee_price(p_menu_item_id INT)
        RETURNS NUMERIC AS $$
        DECLARE
            v_fixed_cost NUMERIC;
            v_profit_margin NUMERIC;
            v_rounding_up NUMERIC;
            v_base_price NUMERIC;
            v_final_price NUMERIC;
        BEGIN
            -- Log untuk debugging
            RAISE NOTICE 'Calculating non-coffee price for menu_item_id: %', p_menu_item_id;
            
            SELECT fixed_cost, profit_margin, rounding_up
            INTO v_fixed_cost, v_profit_margin, v_rounding_up
            FROM menu_items
            WHERE id = p_menu_item_id;
            
            IF NOT FOUND THEN
                RAISE NOTICE 'Menu item not found with id: %', p_menu_item_id;
                RETURN 0;
            END IF;
            
            -- Log values
            RAISE NOTICE 'Fixed cost: %, Profit margin: %, Rounding: %', v_fixed_cost, v_profit_margin, v_rounding_up;
            
            v_base_price := v_fixed_cost * (1 + v_profit_margin);
            v_final_price := CEIL(v_base_price / v_rounding_up) * v_rounding_up;
            
            RAISE NOTICE 'Base price: %, Final price: %', v_base_price, v_final_price;
            
            RETURN v_final_price;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Function 2: calculate_menu_prices
      const coffeeFunction = `
        CREATE OR REPLACE FUNCTION calculate_menu_prices(p_menu_item_id INT)
        RETURNS TABLE(
            ingredient_id INT,
            ingredient_name TEXT,
            hpp NUMERIC,
            sell_price NUMERIC
        ) AS $$
        DECLARE
            v_menu_fixed_cost NUMERIC;
            v_profit_margin NUMERIC;
            v_rounding_up NUMERIC;
            rec RECORD;
        BEGIN
            RAISE NOTICE 'Calculating coffee menu prices for menu_item_id: %', p_menu_item_id;
            
            SELECT m.fixed_cost, m.profit_margin, m.rounding_up
            INTO v_menu_fixed_cost, v_profit_margin, v_rounding_up
            FROM menu_items m
            WHERE m.id = p_menu_item_id;
            
            IF NOT FOUND THEN
                RAISE NOTICE 'Menu item not found with id: %', p_menu_item_id;
                RETURN;
            END IF;
            
            FOR rec IN
                SELECT 
                    ri.ingredient_id,
                    i.name as ingredient_name,
                    ri.quantity_grams,
                    i.purchase_price,
                    i.pack_size_grams
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.menu_item_id = p_menu_item_id
            LOOP
                ingredient_id := rec.ingredient_id;
                ingredient_name := rec.ingredient_name;
                hpp := v_menu_fixed_cost + (rec.purchase_price * rec.quantity_grams / rec.pack_size_grams);
                sell_price := CEIL((hpp * (1 + v_profit_margin)) / v_rounding_up) * v_rounding_up;
                
                RAISE NOTICE 'Ingredient: %, HPP: %, Sell price: %', ingredient_name, hpp, sell_price;
                
                RETURN NEXT;
            END LOOP;
            
            RETURN;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Execute both functions
      const { error: error1 } = await supabase.rpc('exec', { query: nonCoffeeFunction });
      const { error: error2 } = await supabase.rpc('exec', { query: coffeeFunction });

      if (error1 || error2) {
        throw new Error(error1?.message || error2?.message);
      }

      toast.success('RPC functions created successfully!', { id: 'create-rpc' });
      
      // Re-test after creation
      setTimeout(() => {
        testRPCFunctions();
      }, 1000);

    } catch (error) {
      toast.error(`Failed to create RPC functions: ${error.message}`, { id: 'create-rpc' });
      console.error('RPC Creation Error:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '90px',
          left: '20px',
          background: '#dc3545',
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
        title="Debug RPC Functions"
      >
        🐛
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      zIndex: 1001,
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        borderBottom: '1px solid #eee',
        background: '#dc3545',
        color: 'white',
        borderRadius: '12px 12px 0 0'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🐛 RPC Function Debugger</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            color: 'white'
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
            onClick={testRPCFunctions}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Testing...' : '🧪 Test RPC Functions'}
          </button>
          <button
            onClick={createRPCFunctions}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔧 Create/Fix RPC Functions
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '15px' }}>🧪 Test Results</h4>
            {testResults.map((result, index) => (
              <div key={index} style={{
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: result.status === 'PASSED' ? '#d4edda' : '#f8d7da',
                color: result.status === 'PASSED' ? '#155724' : '#721c24',
                borderRadius: '6px',
                border: `1px solid ${result.status === 'PASSED' ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <strong style={{ fontSize: '14px' }}>{result.test}</strong>
                  <span style={{ fontSize: '16px' }}>
                    {result.status === 'PASSED' ? '✅' : '❌'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                  {result.message}
                </div>
                {result.data && (
                  <details style={{ fontSize: '11px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      View Data
                    </summary>
                    <pre style={{ 
                      background: 'rgba(0,0,0,0.1)', 
                      padding: '10px', 
                      borderRadius: '4px',
                      marginTop: '8px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          <strong>🔧 Troubleshooting Steps:</strong>
          <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Klik "Test RPC Functions" untuk diagnosa masalah</li>
            <li>Jika ada yang FAILED, klik "Create/Fix RPC Functions"</li>
            <li>Pastikan profit_margin dalam format desimal (0.5 bukan 50)</li>
            <li>Periksa apakah tabel recipe_ingredients dan ingredients ada data</li>
            <li>Refresh halaman kasir setelah fixing</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default RPCDebugger;