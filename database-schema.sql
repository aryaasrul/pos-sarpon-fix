-- ===================================
-- COFFEE SHOP POS SYSTEM DATABASE
-- Fresh Start - Complete Schema
-- ===================================

-- 1. DROP existing tables if any (optional - uncomment if needed)
-- DROP TABLE IF EXISTS transaction_items CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS books CASCADE;
-- DROP TABLE IF EXISTS ingredients CASCADE;
-- DROP TABLE IF EXISTS menu_items CASCADE;

-- ===================================
-- CORE TABLES
-- ===================================

-- 2. INGREDIENTS TABLE (Coffee beans & other ingredients)
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('espresso_bean', 'filter_bean', 'other')),
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    pack_size_grams INTEGER NOT NULL DEFAULT 1000,
    current_stock_grams INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MENU ITEMS TABLE (All menu categories)
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('espresso_based', 'filter', 'local_proses', 'non_coffee')),
    is_active BOOLEAN DEFAULT true,
    fixed_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    profit_margin NUMERIC(4,3) NOT NULL DEFAULT 0.300, -- 30% default
    rounding_up INTEGER NOT NULL DEFAULT 1000, -- Round up to nearest 1000
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RECIPE INGREDIENTS TABLE (For espresso & filter menus with beans)
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_grams NUMERIC(6,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 5. BOOKS TABLE (Additional products)
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT UNIQUE,
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TRANSACTIONS TABLE (Sales records)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_code TEXT NOT NULL UNIQUE,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'ewallet')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRANSACTION ITEMS TABLE (Items in each transaction)
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('menu', 'book')),
    item_id INTEGER NOT NULL, -- menu_item_id or book_id
    item_name TEXT NOT NULL,
    ingredient_name TEXT, -- For coffee menus with different beans
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    hpp NUMERIC(10,2) NOT NULL DEFAULT 0, -- Harga Pokok Penjualan
    profit_per_item NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- INDEXES FOR BETTER PERFORMANCE
-- ===================================

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_recipe_ingredients_menu ON recipe_ingredients(menu_item_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_type ON transaction_items(item_type);

-- ===================================
-- RPC FUNCTIONS (Simple, Frontend-focused)
-- ===================================

-- Function 1: Calculate Non-Coffee Menu Price
CREATE OR REPLACE FUNCTION calculate_non_coffee_price(p_menu_item_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    v_fixed_cost NUMERIC;
    v_profit_margin NUMERIC;
    v_rounding_up NUMERIC;
    v_final_price NUMERIC;
BEGIN
    SELECT fixed_cost, profit_margin, rounding_up
    INTO v_fixed_cost, v_profit_margin, v_rounding_up
    FROM menu_items
    WHERE id = p_menu_item_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Simple calculation: (fixed_cost * (1 + profit_margin)) rounded up
    v_final_price := CEIL((v_fixed_cost * (1 + v_profit_margin)) / v_rounding_up) * v_rounding_up;
    
    RETURN v_final_price;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Calculate Coffee Menu Prices (with different beans)
CREATE OR REPLACE FUNCTION calculate_coffee_menu_prices(p_menu_item_id INTEGER)
RETURNS TABLE(
    ingredient_id INTEGER,
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
    -- Get menu item details
    SELECT m.fixed_cost, m.profit_margin, m.rounding_up
    INTO v_menu_fixed_cost, v_profit_margin, v_rounding_up
    FROM menu_items m
    WHERE m.id = p_menu_item_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate price for each ingredient/bean variant
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
        
        -- HPP = fixed cost + (ingredient cost per gram * quantity used)
        hpp := v_menu_fixed_cost + (rec.purchase_price * rec.quantity_grams / rec.pack_size_grams);
        
        -- Selling price = HPP * (1 + profit margin) rounded up
        sell_price := CEIL((hpp * (1 + v_profit_margin)) / v_rounding_up) * v_rounding_up;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Generate unique transaction code
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TRX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
END;
$$ LANGUAGE plpgsql;


-- ===================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- ===================================


ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Public access" ON ingredients FOR ALL USING (true);
CREATE POLICY "Public access" ON menu_items FOR ALL USING (true);
CREATE POLICY "Public access" ON recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Public access" ON books FOR ALL USING (true);
CREATE POLICY "Public access" ON transactions FOR ALL USING (true);
CREATE POLICY "Public access" ON transaction_items FOR ALL USING (true);

-- ===================================
-- RESTORE DATA ASLI KE SCHEMA BARU
-- Menggunakan backup data original kamu
-- ===================================

-- 1. INSERT INGREDIENTS (dari backup_ingredients_rows.csv)
-- Mapping: manual_brew → filter_bean, espresso → espresso_bean
INSERT INTO ingredients (id, name, category, purchase_price, pack_size_grams, current_stock_grams, created_at) VALUES
(1, 'Beans Pinara', 'filter_bean', 125000, 200, 1000, '2025-07-01 02:05:11.94087+00'),
(2, 'Beans Kuro', 'filter_bean', 140000, 200, 1000, '2025-07-01 02:05:11.94087+00'),
(3, 'Beans Kaya', 'espresso_bean', 268000, 1000, 5000, '2025-07-01 03:06:37.739299+00'),
(4, 'Beans Golddigger', 'espresso_bean', 220000, 1000, 5000, '2025-07-01 03:06:37.739299+00'),
(5, 'Beans Hayati Choco Gayo', 'espresso_bean', 230000, 1000, 5000, '2025-08-01 12:37:37.113327+00');

-- Reset sequence untuk ingredients
SELECT setval('ingredients_id_seq', (SELECT MAX(id) FROM ingredients));

-- 2. INSERT MENU ITEMS (dari backup_menu_items_rows.csv)
-- Mapping kategori berdasarkan nama menu
INSERT INTO menu_items (id, name, category, fixed_cost, profit_margin, rounding_up, created_at) VALUES
(1, 'Manual Brew', 'filter', 1600, 0.6, 1000, '2025-07-01 02:05:11.94087+00'),
(2, 'Es Kopi Susu', 'espresso_based', 6600, 0.4, 1000, '2025-07-01 03:06:37.739299+00'),
(3, 'Potion of Courage', 'espresso_based', 5330, 0.4, 1000, '2025-07-01 03:06:37.739299+00'),
(4, 'Cocoa Oat Brew', 'espresso_based', 7676, 0.4, 1000, '2025-07-01 03:06:37.739299+00'),
(5, 'Black', 'espresso_based', 1600, 0.5, 1000, '2025-07-01 03:06:37.739299+00'),
(6, 'Latte', 'espresso_based', 5054, 0.4, 1000, '2025-07-01 03:06:37.739299+00'),
(7, 'Chocolate', 'non_coffee', 7774, 0.4, 1000, '2025-07-01 03:47:03.128808+00'),
(8, 'Matcha', 'non_coffee', 10231, 0.4, 1000, '2025-07-01 03:47:03.128808+00'),
(9, 'Azure Tonic', 'non_coffee', 6710, 0.4, 1000, '2025-07-01 03:47:03.128808+00'),
(10, 'tubruk', 'local_proses', 3100, 0.4, 1000, '2025-07-01 03:47:03.128808+00');

-- Reset sequence untuk menu_items
SELECT setval('menu_items_id_seq', (SELECT MAX(id) FROM menu_items));

-- 3. INSERT RECIPE INGREDIENTS
-- Berdasarkan kategori menu, hubungkan dengan beans yang sesuai

-- ESPRESSO BASED MENUS dengan ESPRESSO BEANS
-- Es Kopi Susu (id=2) dengan semua espresso beans
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_grams) VALUES
(2, 3, 18), -- Es Kopi Susu + Beans Kaya
(2, 4, 18), -- Es Kopi Susu + Beans Golddigger  
(2, 5, 18), -- Es Kopi Susu + Beans Hayati Choco Gayo

-- Potion of Courage (id=3) dengan semua espresso beans
(3, 3, 20), -- Potion of Courage + Beans Kaya
(3, 4, 20), -- Potion of Courage + Beans Golddigger
(3, 5, 20), -- Potion of Courage + Beans Hayati Choco Gayo

-- Cocoa Oat Brew (id=4) dengan semua espresso beans
(4, 3, 18), -- Cocoa Oat Brew + Beans Kaya
(4, 4, 18), -- Cocoa Oat Brew + Beans Golddigger
(4, 5, 18), -- Cocoa Oat Brew + Beans Hayati Choco Gayo

-- Black (id=5) dengan semua espresso beans
(5, 3, 20), -- Black + Beans Kaya
(5, 4, 20), -- Black + Beans Golddigger
(5, 5, 20), -- Black + Beans Hayati Choco Gayo

-- Latte (id=6) dengan semua espresso beans
(6, 3, 18), -- Latte + Beans Kaya
(6, 4, 18), -- Latte + Beans Golddigger
(6, 5, 18), -- Latte + Beans Hayati Choco Gayo

-- FILTER MENUS dengan FILTER BEANS
-- Manual Brew (id=1) dengan filter beans
(1, 1, 25), -- Manual Brew + Beans Pinara
(1, 2, 25); -- Manual Brew + Beans Kuro


-- 4. INSERT BOOKS (dari backup_books_rows.csv - DATA ASLI)
-- Schema baru tidak ada kolom publisher, user_id
INSERT INTO books (title, author, isbn, purchase_price, selling_price, stock_quantity, description, created_at, updated_at) VALUES
('Mei Merah 1998: Kala Arwah Berkisah', NULL, NULL, 81000, 90000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Retorika Klasik', 'Aristoteles', NULL, 55250, 85000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Gerpolek', 'Tan Malaka', NULL, 29250, 45000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Timun Jelita', 'Raditya Dika', NULL, 56100, 66000, 2, 'Novel', '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Negeri Binatang', 'George Orwell', NULL, 32500, 50000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Buku Dua Sejiwa', NULL, NULL, 62100, 69000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Novel 1984', 'George Orwell', NULL, 61750, 95000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Meditasi', 'Marcus Aurelius', NULL, 42250, 65000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic One Piece 02', NULL, NULL, 36000, 45000, 2, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Sang Nabi', 'Kahlil Gibran', NULL, 29250, 45000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Ayat-Ayat Kiri', NULL, NULL, 47200, 59000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic: Dandadan 01', NULL, NULL, 40000, 50000, 2, 'Other', '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic: Dandadan 02', NULL, NULL, 40000, 50000, 2, 'Other', '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Negara Saya Kanan Atau Kiri', NULL, NULL, 45000, 50000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Aksi Massa', 'Tan Malaka', NULL, 29250, 45000, 2, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Sialnya Orang Lajang', NULL, NULL, 58500, 65000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic One Piece 01', NULL, NULL, 36000, 45000, 2, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Kenyataan itu Kontol', NULL, NULL, 67500, 75000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic: Dandadan 03', NULL, NULL, 40000, 50000, 2, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Kitab Syair Diancuk Jaran', NULL, NULL, 49500, 55000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Catatan Harian Yang Muram, Gelisah, dan Sepi', NULL, NULL, 45000, 50000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Atomic Habits: Perubahan Kecil yang Memberikan Hasil Luar Biasa', 'James Clear', NULL, 86400, 108000, 1, 'Self-Help', '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Laut Bercerita', 'Leila S. Chudori', NULL, 92000, 115000, 1, 'Novel', '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Menuju Republik Indonesia', 'Tan Malaka', NULL, 26000, 40000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Comic One Piece 03', NULL, NULL, 36000, 45000, 2, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Fihi Ma Fihi', 'Jalaluddin Rumi', NULL, 58500, 90000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Bukan 350 Tahun Dijajah', NULL, NULL, 128500, 135000, 0, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Konstitusi Athena', NULL, NULL, 45000, 50000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('Buku Lima Unsur', 'Miyamoto Musashi', NULL, 32500, 50000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00'),
('The Visual MBA', NULL, NULL, 107100, 119000, 1, NULL, '2024-12-29 08:39:55.058851+00', '2024-12-29 08:39:55.058851+00');


-- 3. MANUAL TEST calculation untuk debug
-- Test untuk Chocolate (id=7)
SELECT 
    7 as menu_id,
    'Chocolate' as menu_name,
    7774 as fixed_cost,
    0.4 as profit_margin,
    1000 as rounding_up,
    -- Manual calculation
    CEIL((7774 * (1 + 0.4)) / 1000) * 1000 as expected_price;

-- Expense tracking system setup
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    group_id VARCHAR(100),
    notes TEXT,
    category VARCHAR(100) DEFAULT 'Umum',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Expense tracking indexes --
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);

-- Expense table RLS --
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for authenticated users" ON public.expenses FOR ALL USING (true);
GRANT ALL ON public.expenses TO anon, authenticated;