-- RPC: create_transaction
-- Menggabungkan generate_transaction_code + insert transactions + insert
-- transaction_items dalam satu database transaction.
-- Jika salah satu langkah gagal, Postgres otomatis rollback seluruhnya.
--
-- Cara apply: jalankan di Supabase Dashboard → SQL Editor → New query → Run

CREATE OR REPLACE FUNCTION create_transaction(
  p_total_amount    numeric,
  p_total_profit    numeric,
  p_payment_method  text,
  p_items           jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_tx   transactions%ROWTYPE;
BEGIN
  -- 1. Generate kode transaksi (pakai fungsi yang sudah ada)
  SELECT generate_transaction_code() INTO v_code;

  -- 2. Insert header transaksi
  INSERT INTO transactions (total_amount, total_profit, payment_method, transaction_code)
  VALUES (p_total_amount, p_total_profit, p_payment_method, v_code)
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
    (item ->> 'item_type')::text,
    (item ->> 'item_id')::integer,
    (item ->> 'item_name')::text,
    NULLIF((item ->> 'ingredient_name'), ''),
    NULLIF((item ->> 'ingredient_id'), '')::integer,
    COALESCE((item ->> 'recipe_qty_grams')::numeric, 0),
    (item ->> 'quantity')::integer,
    (item ->> 'unit_price')::numeric,
    (item ->> 'total_price')::numeric,
    (item ->> 'hpp')::numeric,
    (item ->> 'profit_per_item')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  RETURN to_jsonb(v_tx);
END;
$$;
