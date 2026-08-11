# POS Toko Terang (Sarpon-POS)

Aplikasi POS untuk warung kopi + toko buku. SPA vanilla HTML/JS/CSS +
Supabase (Postgres) sebagai backend, Capacitor untuk build APK Android.

## Stack

- Frontend: vanilla JS (custom SPA router di `js/router.js`)
- Backend: Supabase (Postgres + RPC functions)
- Mobile: Capacitor 6 (Android)
- Hosting web: Vercel (static)
- Tidak ada framework UI library; CSS murni.

## Struktur

```
index.html              # entry SPA
login.html              # halaman login standalone
pages/                  # fragment HTML per route (di-load oleh router)
js/
  api.js                # data layer Supabase facade
  auth.js               # session guard
  router.js             # SPA hash router
  utils.js              # helper (escape HTML, format harga, calc menu price)
  error-handler.js      # global error handler
  kasir.js              # halaman kasir
  katalog.js            # katalog produk & menu
  riwayat.js            # riwayat transaksi
  dashboard.js          # dashboard owner
  form-produk.js        # form tambah/ubah menu
  tambah-bean.js        # form tambah ingredient
  tambah-pengeluaran.js # form tambah pengeluaran
  input-manual.js       # transaksi manual lepas
  login.js              # login page
  nav.js                # navbar + modal helper
css/
  base.css              # reset + variabel
  components.css        # komponen UI
migrations/
  000_init_schema.sql   # baseline DDL (untuk reproduce database)
  001_*.sql             # create_transaction RPC (atomic)
  002_*.sql             # + stock decrement
  003_*.sql             # get_dashboard_stats RPC
  004_*.sql             # + total_expense
  005_cleanup_*.sql     # drop trigger/RPC defunct
  006_add_indexes.sql   # index hot path
  007_idempotency.sql   # client_request_id UNIQUE di transactions
supabase-sarpon-pos.md  # dokumentasi schema & business logic
vercel.json             # config Vercel + security headers
capacitor.config.json   # config Capacitor Android
```

## Setup Lokal

1. Pastikan Node 18+ terinstall.
2. `npm install` (untuk Capacitor CLI).
3. Buka Supabase project Anda (URL project saat ini:
   `https://rnohilsczuqdcsquhpmp.supabase.co` — ganti bila project lain).
4. Jalankan `migrations/000_init_schema.sql` sampai `migrations/007_idempotency.sql`
   di SQL Editor Dashboard Supabase sesuai urutan angka.
5. Buat user admin via Dashboard → Authentication → Users → Add user.
6. Set `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `js/api.js` (atau environment
   analog — di plan remediation terpisah akan dipindah ke env).
7. Serve web: `npx serve .` lalu buka di browser.

## Build APK Android

```bash
npm run build          # rsync root -> www/
npx cap sync android
npx cap open android
```
Di Android Studio: Build → Generate Signed APK.

## Deploy Web

Vercel auto-deploy dari branch `main`. Konfigurasi di `vercel.json`.

## Dokumentasi

- `supabase-sarpon-pos.md`: schema, RPC functions, business logic.
- `docs/specs/`: spec perubahan besar.
- `docs/plans/`: implementation plan perubahan besar.