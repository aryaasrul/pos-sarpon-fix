-- Migration 000: Baseline schema Sarpon-POS
-- =============================================================================
-- DDL lengkap untuk reproduce database dari nol (fresh Supabase project).
-- Disusun dari supabase-sarpon-pos.md + verifikasi pemakaian di js/*.
--
-- UNTUK PRODUCTION EXISTING: JANGAN dijalankan ulang — semua statement pakai
-- IF NOT EXISTS / CREATE OR REPLACE jadi tidak merusak, tapi file ini tujuan
-- utamanya adalah dokumentasi reproduksi + setup environment baru.
--
-- Catatan: generate_transaction_code() & decrement_book_stock() selama ini
-- dibuat manual di Dashboard (tidak ada di migration 001-004). Definisi di
-- bawah adalah rekonstruksi sesuai dokumentasi perilaku.
-- =============================================================================

BEGIN;

-- ─── TABEL ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingredients (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text        NOT NULL UNIQUE,
  category            text,                          -- espresso_bean, filter_bean, other
  purchase_price      numeric     NOT NULL DEFAULT 0, -- harga beli per pack
  pack_size_grams     integer     NOT NULL DEFAULT 1000,
  current_stock_grams integer     NOT NULL DEFAULT 0,
  is_active           boolean     NOT NULL DEFAULT true, -- dipakai js/, tidak terdokumentasi
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text        NOT NULL,
  category      text,                          -- espresso_based, filter, local_proses, non_coffee
  is_active     boolean     NOT NULL DEFAULT true,
  fixed_cost    numeric     NOT NULL DEFAULT 0,
  profit_margin numeric     NOT NULL DEFAULT 0.300,
  rounding_up   integer     NOT NULL DEFAULT 1000,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id   integer NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id  integer NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_grams numeric NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS books (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title          text NOT NULL,
  author         text,
  isbn           text UNIQUE,
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price  numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_code  text NOT NULL UNIQUE,        -- TRX-YYYYMMDD-{epoch}
  total_amount      numeric NOT NULL DEFAULT 0,
  total_profit      numeric NOT NULL DEFAULT 0,
  payment_method    text NOT NULL DEFAULT 'cash', -- cash, card, ewallet
  notes             text,
  client_request_id text,                         -- migration 007: idempotency key
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id   integer NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  item_type        text,                  -- menu, book, manual
  item_id          integer,               -- ID menu/buku; NULL untuk manual.
                                          -- Sengaja TANPA FK: target tabel
                                          -- bergantung item_type.
  item_name        text,                  -- snapshot nama saat transaksi
  ingredient_name  text,                  -- khusus kopi
  ingredient_id    integer,               -- Sengaja TANPA FK: history transaksi
                                          -- tidak boleh ikut terhapus/terblokir
                                          -- saat ingredient dihapus.
  recipe_qty_grams numeric,
  quantity         integer NOT NULL DEFAULT 1,
  unit_price       numeric NOT NULL DEFAULT 0,
  total_price      numeric NOT NULL DEFAULT 0,
  hpp              numeric NOT NULL DEFAULT 0,
  profit_per_item  numeric NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar,
  amount     numeric NOT NULL DEFAULT 0,
  group_id   varchar,
  notes      text,
  category   varchar DEFAULT 'Umum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dipakai js/api.js (getSetting/upsertSetting/getPeriodSettings) tapi tidak
-- terdokumentasi di supabase-sarpon-pos.md. Key yang dipakai:
-- opening_balance, period_start_date.
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

-- Auto-update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Format: TRX-YYYYMMDD-{epoch}. Rekonstruksi dari dokumentasi
-- (fungsi aslinya dibuat manual di Dashboard).
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'TRX-' || to_char(now(), 'YYYYMMDD') || '-' || extract(epoch from now())::bigint;
END;
$$;

-- Kurangi stok buku, throw exception jika tidak cukup.
-- Rekonstruksi dari dokumentasi perilaku di migration 002.
CREATE OR REPLACE FUNCTION decrement_book_stock(p_book_id integer, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE books
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_book_id
    AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stok buku id=% tidak cukup atau tidak ditemukan', p_book_id;
  END IF;
END;
$$;

-- ─── TRIGGERS updated_at ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_ingredients_updated_at ON ingredients;
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS (BASELINE — public access, sesuai kondisi production saat ini) ─────
-- WARNING: policy di bawah sengaja permisif untuk menyamakan baseline dengan
-- production. Lockdown berbasis auth.uid() ada di remediation Fase 3
-- (plan terpisah). Jangan deploy environment baru publik dengan policy ini.

ALTER TABLE ingredients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_public_all ON ingredients;
CREATE POLICY p_public_all ON ingredients         FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON menu_items;
CREATE POLICY p_public_all ON menu_items          FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON recipe_ingredients;
CREATE POLICY p_public_all ON recipe_ingredients  FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON books;
CREATE POLICY p_public_all ON books               FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON transactions;
CREATE POLICY p_public_all ON transactions        FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON transaction_items;
CREATE POLICY p_public_all ON transaction_items   FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON expenses;
CREATE POLICY p_public_all ON expenses            FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS p_public_all ON app_settings;
CREATE POLICY p_public_all ON app_settings        FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- Setelah ini, lanjutkan migration 001-007 sesuai urutan nomor.
