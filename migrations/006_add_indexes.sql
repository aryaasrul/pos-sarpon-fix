-- Migration 006: Index untuk query hot path
-- Volume data masih kecil-menengah, jadi CREATE INDEX IF NOT EXISTS biasa cukup
-- (tidak perlu CONCURRENTLY). Aman dijalankan ulang.
--
-- Cara apply: Supabase Dashboard → SQL Editor → New query → Run

-- Riwayat transaksi: filter + sort by created_at
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions (created_at DESC);

-- Filter by payment method di dashboard/laporan
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON transactions (payment_method);

-- Join transaction_items -> transactions (FK tanpa index = seq scan)
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items (transaction_id);

-- Agregasi dashboard by date range
CREATE INDEX IF NOT EXISTS idx_transaction_items_created_at
  ON transaction_items (created_at DESC);

-- Riwayat pengeluaran
CREATE INDEX IF NOT EXISTS idx_expenses_created_at
  ON expenses (created_at DESC);

-- Join resep -> menu / ingredient
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_menu_item_id
  ON recipe_ingredients (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
  ON recipe_ingredients (ingredient_id);

-- Katalog: filter menu aktif per kategori (partial index)
CREATE INDEX IF NOT EXISTS idx_menu_items_active_category
  ON menu_items (category) WHERE is_active = true;
