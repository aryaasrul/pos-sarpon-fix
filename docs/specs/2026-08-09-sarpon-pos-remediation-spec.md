# Spec: Sarpon-POS Remediation

> Status: DRAFT — menunggu review sebelum eksekusi.
> Sumber: Audit READ-ONLY 2x (overview + verifikasi mendalam), 21 Aug 2026.

## 1. Konteks

Repo `website-toko-V2-main` adalah SPA vanilla HTML/JS/CSS + Supabase + Capacitor
Android untuk POS Toko Terang (warung kopi + buku). Production di Vercel + APK
sideload. Audit menemukan 6 kerentanan CRITICAL, 13 WARNING, beberapa minor.

Working directory saat ini **rusak** (semua file 0 byte karena insiden
filesystem 2026-07-21). Folder `.git.corrupt-20260721-1815` adalah backup `.git`
lama yang hampa. Repo `.git` saat ini sehat (fresh clone dari
`github.com/aryaasrul/pos-sarpon-fix`). Pemulihan via `git checkout -- .` aman.

## 2. Goal

Pulihkan repo ke keadaan sehat, bersihkan artefak yang berbahaya/menyesatkan,
dan perbaiki bug kritis yang ada di kode produksi—tanpa mengubah arsitektur
besar dan tanpa menyentuh security layer Supabase (Fase 3 di-skip per
instruksi user, akan menjadi plan terpisah setelah ini).

## 3. Out of Scope (Fase 3 — plan terpisah nanti)

- Perketat RLS Supabase (ganti policy public-access dengan policy berbasis
  `auth.uid()`)
- Rotasi anon key
- RBAC client-side berbasis `profiles.role`
- Pindahkan anon key ke Edge Function / middleware server
- Setup error tracking (Sentry/in-house logger)
- Perubahan CSP/headers Vercel yang bergantung keputusan RLS

Fase 3 butuh testing menyeluruh di Dashboard Supabase dan akan dirancang
terpisah supaya tidak mengganggu uptime production.

## 4. In-Scope Deliverables (Fase 0-2)

| ID | Deliverable | Severity yang ditutup |
|---|---|---|
| F0 | Working tree dipulihkan + backup terbentuk | CRITICAL #1 |
| F1.1 | `www/` berhenti di-track (sudah gitignored) | CRITICAL #5 |
| F1.2 | HTML duplikat pre-SPA di root dihapus | WARNING #16 |
| F1.3 | `SETUP.md` diganti, `README.md` dibuat | WARNING #19 |
| F1.4 | Migration 002 typo karakter Korea diperbaiki | MINOR #20 |
| F1.5 | Idempotency `create_transaction` (kritikal) | WARNING (naik, bug produksi) |
| F2.1 | `js/form-produk.js` dibungkus IIFE | WARNING #10 |
| F2.2 | Security headers di `vercel.json` (X-Frame, X-Content-Type, Referrer-Policy) | WARNING #13 |
| F2.3 | Supabase SDK di-lock exact version + SRI integrity | WARNING #17 |
| F2.4 | Trigger defunct `update_book_stock` di-clean (DDL migration file) | WARNING #9 |
| F2.5 | Index DB untuk query hot path | WARNING #11 |
| F2.6 | DDL schema self-contained di repo (000_init_schema.sql) | WARNING #7 |
| F2.7 | `js/input-manual.js` kirim `item_id: null` (FK nullable) | WARNING #12 |

## 5. Acceptance Criteria

- `git status` clean setelah Fase 0.
- Backup tarball ada di `/tmp/opencode/sarpon-pos-head-backup-*.tar.gz` +
  git tag `pre-remediation-backup`.
- `git ls-files | grep ^www/` kosong setelah F1.1.
- Tidak ada satu pun file `dashboard.html`/`katalog.html`/`riwayat.html`/
  `input-manual.html`/`tambah-pengeluaran.html`/`tambah-produk.html`/
  `ubah-produk.html`/`tambah-bean.html` di root setelah F1.2.
- `README.md` ada dan akurat (Supabase, bukan PocketBase).
- `migrations/002_*.sql` tidak lagi mengandung karakter Korea `던져`.
- Flow kasir: force timeout + retry 2x hanya menghasilkan 1 transaksi di DB.
- Buka halaman `form-produk` 2x berturut → state tidak bocor antar sesi (cek
  variabel `isEditMode`, `currentId`, `isBookMode` di `window` harus
  `undefined`).
- Vercel deploy melayani headers `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Content-Security-Policy` (verifikasi via `curl -I`).
- Tag `<script src="...supabase-js...">` di `index.html`,
  `login.html`, `loading.html` punya `integrity` + `crossorigin="anonymous"`
  + exact version (mis. `@2.62.2` atau terbaru saat eksekusi).
- File baru `migrations/000_init_schema.sql` berisi DDL semua tabel + FK +
  trigger + policy public-access (sebagai baseline; lockdown di Fase 3).
- File baru `migrations/005_cleanup_rpc_and_triggers.sql` berisi
  `DROP FUNCTION IF EXISTS update_book_stock();` + `DROP TRIGGER IF EXISTS`.
- File baru `migrations/006_add_indexes.sql` berisi 8 index dari spec.
- `js/input-manual.js:48` mengirim `item_id: null` (bukan `0`); kolom
  `transaction_items.item_id` sudah nullable (dikonfirmasi via Dashboard
  sebelum edit kode).

## 6. Risk & Rollback

- **R1**: `git checkout -- .` menimpa file untracked di working dir — aman
  karena semuanya hue 0 byte.
- **R2**: Hapus `www/` dari tracking bisa membuat build Capacitor pertama
  setelahnya perlu `npm run build` dulu. Mitigasi: jalankan `npm run build`
  lokal segera setelah F1.1.
- **R3**: Hapus HTML duplikat pre-SPA bisa break link external yang masih
  Bookmark `dashboard.html`. Mitigasi: cek Vercel analytics / webhook log
  untuk 404 minggu pertama. Rollback: `git revert <commit F1.2>`.
- **R4**: Idempotency mengubah RPC signature `create_transaction`—client
  lama (APK yang sudah ter-install) akan gagal call. Mitigasi: bikin RPC
  baru `create_transaction_v2` atau buat `p_client_request_id` parameter
  default nullable (kompatibel mundur). Spec F1.5 memilih jalur kompatibel
  mundur.
- **R5**: Index di tabel besar bisa lock singkat. Untuk volume warung kopi
  (~10rb baris),Build index online aman via `CREATE INDEX CONCURRENTLY`
  (tapi tidak bisa dijalankan dalam transaction—jalankan manual di Dashboard,
  bukan via `migrations/006` jika volume sudah besar).
- **Rollback global**: `git revert <merge remediation>` atau `git reset
  --hard pre-remediation-backup`.

## 7. Pra-syarat Eksekusi

- Akses shell ke repo.
- Akses Vercel dashboard untuk redeploy verifikasi header.
- Akses Supabase Dashboard (untuk F1.5 verifikasi kolom, F2.4-F2.6 eksekusi
  SQL manual — file migration disiapkan di repo tapi dijalankan manual).

## 8. Urutan Eksekusi

1. F0 (Task 0.1-0.3) — wajib jalan duluan, blocking.
2. F1.1 (untrack www/).
3. F1.5 (idempotency) — sebelum Fase lain karena touch RPC + client + DB.
4. F1.2, F1.3, F1.4 — paralelisabel (cleanup dokumen/hapus file).
5. F2.1 (IIFE) — code only.
6. F2.2 (vercel headers) — deploy Vercel.
7. F2.3 (SRI + lock version) — code only.
8. F2.4, F2.5, F2.6 — SQL migrations files di repo, Anda jalankan di
   Dashboard Supabase terpisah.
9. F2.7 (item_id null) — code + verifikasi kolom.

## 9. Open Questions

- APK yang sudah ter-install di field: versi berapa? Bila masih pakai `www/`
  lama (non-atomic), perlu push APK update setelah remediation jalan.
- Apakah ada 3rd-party (Google Analytics, Vercel Web Analytics) yang
  dipakai? CSP `script-src` di `vercel.json` perlu whitelist jika ada.
- Volume transactions saat ini? Tentukan apakah `CREATE INDEX CONCURRENTLY`
  wajib atau `CREATE INDEX IF NOT EXISTS` cukup.