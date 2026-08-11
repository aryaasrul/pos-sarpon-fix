-- Migration 005: Cleanup trigger/function defunct
-- update_book_stock mereferensikan tabel/kolom yang tidak ada
-- (book_stock_movements, product_type, book_id) dan tidak pernah di-attach.
-- Logika stok buku sudah ditangani RPC decrement_book_stock + create_transaction.
--
-- Cara apply: Supabase Dashboard → SQL Editor → New query → Run
-- (Aman dijalankan ulang — pakai IF EXISTS)

DROP TRIGGER IF EXISTS update_book_stock ON books;
DROP FUNCTION IF EXISTS update_book_stock();

-- Catatan: RPC overloaded calculate_menu_prices / calculate_non_coffee_price
-- (3 versi masing-masing) sengaja TIDAK di-drop di migration ini karena perlu
-- verifikasi manual signature mana yang masih dipakai. Harga saat ini dihitung
-- di client (js/utils.js), jadi kandidat cleanup di migration berikutnya.
