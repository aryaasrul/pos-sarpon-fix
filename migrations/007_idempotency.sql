-- Migration 007: Idempotency untuk create_transaction
-- Mencegah double-transaction saat client retry setelah network timeout.
-- Backward compatible: p_client_request_id DEFAULT NULL, client lama
-- (tanpa key) tetap jalan seperti biasa.
--
-- Cara apply: Supabase Dashboard → SQL Editor → New query → Run
-- (Aman dijalankan ulang — pakai IF NOT EXISTS / CREATE OR REPLACE)

-- 1. Kolom idempotency key
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS client_request_id text;

-- 2. Unik bila terisi (boleh banyak NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_client_request_id
  ON transactions (client_request_id)
  WHERE client_request_id IS NOT NULL;

-- 3. Hapus signature lama (4 arg) supaya tidak ada overload ambigu,
--    lalu buat versi baru (5 arg, default NULL).
DROP FUNCTION IF EXISTS create_transaction(numeric, numeric, text, jsonb);

CREATE OR REPLACE FUNCTION create_transaction(
  p_total_amount      numeric,
  p_total_profit      numeric,
  p_payment_method    text,
  p_items             jsonb,
  p_client_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code          text;
  v_tx            transactions%ROWTYPE;
  v_rec           RECORD;
  v_ingredient_id integer;
  v_grams_total   numeric;
BEGIN
  -- 0. Idempotency: bila key sudah pernah dipakai, kembalikan transaksi lama
  --    tanpa insert ulang / tanpa kurangi stok dua kali.
  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_tx
    FROM transactions
    WHERE client_request_id = p_client_request_id;
    IF FOUND THEN
      RETURN to_jsonb(v_tx);
    END IF;
  END IF;

  -- 1. Generate kode transaksi
  SELECT generate_transaction_code() INTO v_code;

  -- 2. Insert header transaksi
  INSERT INTO transactions (total_amount, total_profit, payment_method, transaction_code, client_request_id)
  VALUES (p_total_amount, p_total_profit, p_payment_method, v_code, p_client_request_id)
  RETURNING * INTO v_tx;

  -- 3. Insert semua item sekaligus
  INSERT INTO transaction_items (
    transaction_id,
    item_type,
    item_id,
    item_name,
    ingredient_name,
    ingredient_id,
    recipe_qty_grams,
    quantity,
    unit_price,
    total_price,
    hpp,
    profit_per_item
  )
  SELECT
    v_tx.id,
    (elem ->> 'item_type')::text,
    (elem ->> 'item_id')::integer,
    (elem ->> 'item_name')::text,
    NULLIF((elem ->> 'ingredient_name'), ''),
    NULLIF((elem ->> 'ingredient_id'), '')::integer,
    COALESCE((elem ->> 'recipe_qty_grams')::numeric, 0),
    (elem ->> 'quantity')::integer,
    (elem ->> 'unit_price')::numeric,
    (elem ->> 'total_price')::numeric,
    (elem ->> 'hpp')::numeric,
    (elem ->> 'profit_per_item')::numeric
  FROM jsonb_array_elements(p_items) AS t(elem);

  -- 4. Kurangi stok per item
  FOR v_rec IN SELECT elem FROM jsonb_array_elements(p_items) AS t(elem)
  LOOP
    IF (v_rec.elem ->> 'item_type') = 'book' THEN
      -- decrement_book_stock sudah ada, throw exception jika stok kurang
      PERFORM decrement_book_stock(
        (v_rec.elem ->> 'item_id')::integer,
        (v_rec.elem ->> 'quantity')::integer
      );

    ELSIF (v_rec.elem ->> 'item_type') = 'menu'
      AND (v_rec.elem ->> 'ingredient_id') IS NOT NULL
      AND (v_rec.elem ->> 'ingredient_id') <> ''
    THEN
      v_ingredient_id := (v_rec.elem ->> 'ingredient_id')::integer;
      v_grams_total   := (v_rec.elem ->> 'recipe_qty_grams')::numeric
                         * (v_rec.elem ->> 'quantity')::integer;

      UPDATE ingredients
      SET current_stock_grams = current_stock_grams - v_grams_total
      WHERE id = v_ingredient_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Ingredient id=% tidak ditemukan', v_ingredient_id;
      END IF;
    END IF;
  END LOOP;

  RETURN to_jsonb(v_tx);
END;
$$;

COMMENT ON FUNCTION create_transaction(numeric, numeric, text, jsonb, text) IS
  'Atomic transaction insert + items + stock decrement. p_client_request_id nullable; bila diisi dan sudah ada, return transaksi lama (idempotent retry).';
