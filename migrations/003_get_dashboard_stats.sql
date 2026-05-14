-- Migration 003: RPC get_dashboard_stats
-- Menggantikan fetch semua baris ke client dengan agregasi server-side.
-- Return: total_income, total_profit, active_days, best_day, top_items
--
-- Cara apply: jalankan di Supabase Dashboard → SQL Editor → New query → Run

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH base AS (
    SELECT
      ti.item_name,
      ti.quantity,
      ti.total_price,
      (ti.profit_per_item * ti.quantity)    AS line_profit,
      date_trunc('day', t.created_at)::date AS tx_date
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE t.created_at >= p_start
      AND t.created_at <= p_end
  ),
  totals AS (
    SELECT
      COALESCE(SUM(total_price), 0) AS total_income,
      COALESCE(SUM(line_profit),  0) AS total_profit,
      COUNT(DISTINCT tx_date)        AS active_days
    FROM base
  ),
  best_day AS (
    SELECT tx_date, SUM(total_price) AS day_total
    FROM base
    GROUP BY tx_date
    ORDER BY day_total DESC
    LIMIT 1
  ),
  top_items AS (
    SELECT
      item_name                  AS name,
      SUM(quantity)::integer     AS qty,
      SUM(total_price)           AS revenue
    FROM base
    GROUP BY item_name
    ORDER BY qty DESC
    LIMIT 7
  )
  SELECT jsonb_build_object(
    'total_income', t.total_income,
    'total_profit', t.total_profit,
    'active_days',  t.active_days,
    'best_day',     CASE
                      WHEN d.tx_date IS NOT NULL
                      THEN jsonb_build_object('date', d.tx_date, 'amount', d.day_total)
                      ELSE NULL
                    END,
    'top_items',    COALESCE(
                      (SELECT jsonb_agg(
                         jsonb_build_object('name', i.name, 'qty', i.qty, 'revenue', i.revenue)
                         ORDER BY i.qty DESC
                       ) FROM top_items i),
                      '[]'::jsonb
                    )
  )
  INTO v_result
  FROM totals t
  LEFT JOIN best_day d ON true;

  RETURN v_result;
END;
$$;
