# Sarpon-POS Remediation Plan (Fase 0-2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulihkan repo Sarpon-POS dari kondisi rusak (working tree 0 byte), bersihkan artefak berbahaya/menyesatkan, dan perbaiki 1 bug produksi kritis (double-transaction saat network timeout) — tanpa menyentuh security layer Supabase.

**Architecture:** Tidak ada perubahan arsitektur. Tetap SPA vanilla HTML/JS/CSS + Supabase (+ Capacitor Android). Perubahan baterai: hapus build artifact duplicate, rapikan kode, tambah migration files DDL, lock dependency, tambah security headers static.

**Tech Stack:** Vanilla HTML/JS/CSS, Supabase-js v2 (via CDN), Capacitor 6, Vercel static hosting, Postgres (Supabase). Tidak ada framework test dalam fase ini (akan masuk Fase 3 plan terpisah).

**Spec file:** `<repo>/docs/superpowers/specs/2026-08-09-sarpon-pos-remediation-spec.md` — baca sebelum eksekusi. Verifikasi Acceptance Criteria di sana setelah selesai.

## Global Constraints

- **READ-ONLY-ONLY dilarang sampai Fase 0 selesai.** Setelah Fase 0 selesai, working tree harus sehat dulu sebelum ada edit apapun.
- **Jangan commit secret apapun**. Anon key yang ada tetap publik by-design sampai Fase 3 (di-skip); tidak ada rotasi di plan ini.
- **Jangan sentuh RLS/policy Supabase.** Itu Fase 3 plan terpisah.
- **Jangan tambah dependency npm baru** selain yang sudah ada (`@capacitor/*`).
- **Jangan edit file `www/`**. Direktori itu akan untrack di F1.1 dan regenerate via `npm run build` bila perlu APK baru.
- **Setiap task diakhiri commit terpisah** dengan pesan `chore:`, `fix:`, atau `feat:` mengikuti conventional commits.
- **Tiap langkah verifikasi wajib dijalankan** sebelum commit.
- **Untuk SQL migration file** yang dibuat di repo: file disiapkan & dicommit, tapi eksekusi di Dashboard Supabase dilakukan oleh Anda (manual) — kecuali DDL schema & index di F2.5/F2.6 yang harus Anda jalankan di Dashboard untuk verifikasi.

**File numbering untuk migration:** pakai nomor yang tidak bentrok dengan yang sudah ada (`001-004`). Yang dipakai di plan: `000` (baseline schema, paling awal), `005` (cleanup), `006` (index), `007` (idempotency). Walaupun `000` lebih kecil dari `001`, file ini baseline reproduksi schema dan ditaruh sebagai dokumen referensi (tidak wajib dijalankan ulang di production yang sudah existing — hanya untuk setup baru/audit).

---

## Fase 0 — Stabilisasi & Backup

### Task 0.1: Verifikasi integritas git & restore working tree

**Files:**
- Tidak ada file yang di-edit. Hanya git commands.

**Interfaces:** N/A (tahap pra-setup).

- [ ] **Step 1: Verifikasi .git sehat**

```bash
cd /data/Documents/website-toko-V2-main
git fsck --full --strict
```
Expected: tidak ada output (exit 0). Jika ada error → STOP, jangan lanjut.

- [ ] **Step 2: Cek status sebelum restore**

```bash
git status --short | head -20
git stash list
git reflog -5
```
Expected: banyak file `M`/`D` (karena working dir 0 byte), stash kosong, reflog hanya entry clone.

- [ ] **Step 3: Restore semua tracked file ke HEAD**

```bash
git checkout -- .
git status
```
Expected: `nothing to commit, working tree clean` (atau hanya untracked `.claude`, `.mcp.json`, `android/`, `www/.claude`, `.DS_Store`).

- [ ] **Step 4: Verifikasi konten file inti ada isinya**

```bash
wc -l js/api.js js/auth.js js/kasir.js router.js css/components.css migrations/002_create_transaction_with_stock.sql 2>/dev/null || true
ls -la index.html login.html package.json supabase-sarpon-pos.md
```
Expected: setiap file punya >0 byte, jumlah baris >10 untuk file kode.

- [ ] **Step 5: Tidak perlu commit** — task ini tidak mengubah repositori, hanya working tree.

### Task 0.2: Backup state HEAD

**Files:**
- Tidak ada file repo. Output: git tag + tarball di `/tmp/opencode/`.

**Interfaces:** Menghasilkan `pre-remediation-backup` tag (dipakai Task rollback global).

- [ ] **Step 1: Buat git tag di HEAD**

```bash
git tag pre-remediation-backup HEAD
git tag --list | grep pre-remediation
```
Expected: tag `pre-remediation-backup` muncul.

- [ ] **Step 2: Buat tarball backup**

```bash
mkdir -p /tmp/opencode
tar -czf /tmp/opencode/sarpon-pos-head-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude='.git' \
  --exclude='www' \
  --exclude='android' \
  --exclude='node_modules' \
  --exclude='.git.corrupt-*' \
  .
ls -lh /tmp/opencode/sarpon-pos-head-backup-*.tar.gz
```
Expected: file tarball terbentuk, ukuran wajar (ratusan KB-MB tergantung aset font).

- [ ] **Step 3: Verifikasi tarball bisa di-list & di-extract**

```bash
tar -tzf /tmp/opencode/sarpon-pos-head-backup-*.tar.gz | head -10
```
Expected: list file root (`./`, `./index.html`, `./js/`, dll).

### Task 0.3: Bersihkan artefak korup & noise untracked

**Files:**
- Delete: `.git.corrupt-20260721-1815/` (folder backup git lama yang hampa).
- Delete: `**/.DS_Store` (filesystem noise macOS).

**Interfaces:** N/A.

- [ ] **Step 1: Review dulu yang untracked**

```bash
git clean -nd
```
Expected: list untracked. Review — pastikan `.claude/` (jika dipakai opencode) tidak ikut dihapus.

- [ ] **Step 2: Hapus folder git lama yang korup**

```bash
rm -rf .git.corrupt-20260721-1815
ls -la | grep git.corrupt || echo "OK hilang"
```
Expected: folder `.git.corrupt-*` tidak ada lagi.

- [ ] **Step 3: Hapus `.DS_Store` di semua folder**

```bash
find . -name '.DS_Store' -not -path './.git/*' -delete
find . -name '.DS_Store' -not -path './.git/*' | head
```
Expected: tidak ada `.DS_Store` tersisa.

- [ ] **Step 4: Review ulang untracked lalu pilih untuk hapus selektif**

```bash
git clean -nd
# Hapus yang benar-benar tidak dipakai. JANGAN hapus .claude/ atau .mcp.json
# bila Anda memakai opencode (itu config lokal agen).
git clean -fd android/  # bila android/ masih untracked dan isinya hanya generated Capacitor
```
Expected: working dir bersih dari noise; struktur repo terlihat.

- [ ] **Step 5: Commit perubahan .gitignore jika perlu**

Cek `.gitignore`:
```bash
cat .gitignore
```
Pastikan meng-ignore `.DS_Store`, `.git.corrupt-*`, `*.tar.gz`. Jika belum, ini hanya perubahan working tree pre-edit — belum commit (akan dicommit bersama F1.3 atau F1.4).

---

## Fase 1 — Repo Cleanup & Idempotency (Bug Kritikal)

### Task 1.1: Untrack `www/` build artifact

**Files:**
- Tidak ada file dihapus dari disk. Hanya dari git index.

**Interfaces:** kemudian Task 1.2 dst dapat bergantung pada working tree tanpa `www/` di-track.

- [ ] **Step 1: Konfirmasi `www/` ada di index**

```bash
git ls-files www/ | wc -l
```
Expected: ~154.

- [ ] **Step 2: Hapus `www/` dari index tapi tetap di disk**

```bash
git rm -r --cached www/
```

- [ ] **Step 3: Verifikasi index bersih dari www/ tapi disk tetap punya**

```bash
git ls-files www/ | wc -l   # expected: 0
ls www/ | head -5            # expected: ada (index.html, js/, dll)
```

- [ ] **Step 4: Cek `.gitignore` sudah ignore www/**

```bash
git check-ignore -v www/index.html
```
Expected: `.gitignore:18:www/ www/index.html` atau nomor baris lain.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: untrack www/ build output (already gitignored)"
```

- [ ] **Step 6: Verifikasi post-commit**

```bash
git status
git log --oneline -1
```
Expected: working tree clean (atau hanya untracked noise yang belum dibersihkan).

### Task 1.2: Hapus HTML duplikat pre-SPA di root

**Files:**
- Delete: `dashboard.html`, `katalog.html`, `riwayat.html`, `input-manual.html`, `tambah-pengeluaran.html`, `tambah-produk.html`, `ubah-produk.html`, `tambah-bean.html`.

**Interfaces:** N/A — file sisa refactor pre-SPA, tidak dipakai router.

- [ ] **Step 1: Verifikasi router tidak pakai file-file ini**

```bash
git grep -nE "dashboard\.html|katalog\.html|riwayat\.html|input-manual\.html|tambah-pengeluaran\.html|tambah-produk\.html|ubah-produk\.html|tambah-bean\.html" -- 'js/' 'index.html' ':!www/'
```
Expected: output kosong / tidak ada match di router atau index.html. Router pakai `pages/*.html`.

- [ ] **Step 2: Cek juga di tag anchor kalau ada link statis**

```bash
git grep -nE "<a[^>]+href=['\"](dashboard|katalog|riwayat|input-manual|tambah-pengeluaran|tambah-produk|ubah-produk|tambah-bean)\.html" -- '*.html' ':!www/'
```
Expected: kosong.

- [ ] **Step 3: Hapus file**

```bash
git rm dashboard.html katalog.html riwayat.html input-manual.html \
       tambah-pengeluaran.html tambah-produk.html ubah-produk.html \
       tambah-bean.html
```

- [ ] **Step 4: Verifikasi removed**

```bash
git status --short
ls dashboard.html 2>/dev/null || echo "OK dashboard.html hilang"
ls katalog.html 2>/dev/null || echo "OK katalog.html hilang"
```

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove pre-SPA HTML duplicates (router uses pages/*.html)"
```

### Task 1.3: Replace `SETUP.md` + buat `README.md`

**Files:**
- Delete: `SETUP.md` (PocketBase, menyesatkan).
- Create: `README.md` (Supabase, akurat).
- Modify: `.gitignore` (tambah rule `.DS_Store`, `*.tar.gz`, `.git.corrupt-*` bila belum ada — running change dari Task 0.3 Step 5).

**Interfaces:** Menghasilkan `README.md` referensi onboarding.

- [ ] **Step 1: Hapus SETUP.md**

```bash
git rm SETUP.md
```

- [ ] **Step 2: Tulis README.md**

Buat file `README.md` dengan isi:

```markdown
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
- `docs/superpowers/specs/`: spec perubahan besar.
- `docs/superpowers/plans/`: implementation plan perubahan besar.
```

- [ ] **Step 3: Update `.gitignore`**

Pastikan `.gitignore` berisi minimal:
```
.env
.env.*
node_modules/
www/
android/
.DS_Store
*.tar.gz
.git.corrupt-*
.claude/
.mcp.json
```
Tambahkan baris yang belum ada. Review dengan `cat .gitignore`.

- [ ] **Step 4: Verifikasi**

```bash
ls README.md && echo "OK README ada"
git check-ignore -v SETUP.md 2>/dev/null || echo "SETUP.md dihapus (tidak lagi ada)"
```

- [ ] **Step 5: Commit**

```bash
git add README.md .gitignore
git commit -m "docs: replace outdated PocketBase SETUP.md with README for Supabase"
```

### Task 1.4: Perbaiki typo karakter Korea di migration 002

**Files:**
- Modify: `migrations/002_create_transaction_with_stock.sql` (line ~67).

**Interfaces:** N/A.

- [ ] **Step 1: Cek baris bermasalah**

```bash
git grep -n "던져" migrations/002_create_transaction_with_stock.sql
```
Expected: 1 match.

- [ ] **Step 2: Edit baris**

Ganti komentar yang mengandung `던져` menjadi `throw`. Mis.:
```sql
-- decrement_book_stock sudah ada, throw exception jika stok kurang
```

- [ ] **Step 3: Verifikasi**

```bash
git grep -n "던져" migrations/002_create_transaction_with_stock.sql
# expected: kosong
git diff migrations/002_create_transaction_with_stock.sql
```

- [ ] **Step 4: Commit**

```bash
git add migrations/002_create_transaction_with_stock.sql
git commit -m "fix: migration 002 typo karakter Korea '던져' -> 'throw'"
```

### Task 1.5: Idempotency `create_transaction` (BUG PRODUKSI)

**Files:**
- Create: `migrations/007_idempotency.sql` (file baru, dijalankan manual di Dashboard).
- Modify: `js/api.js` (signature `createTransaction`).
- Modify: `js/kasir.js` (generate idempotency key, retry aman).

**Interfaces:**
- RPC signature baru (backward compatible — `p_client_request_id nullable`):
  `create_transaction(p_total_amount numeric, p_total_profit numeric, p_payment_method text, p_items jsonb, p_client_request_id text DEFAULT NULL)`
- Return value sama: transaction record atau `transaction_code` string lama.

**Constraint**: APK lama yang sudah di-install user pakai signature lama (tanpa `p_client_request_id`). Default nullable membuat panggilan tanpa param tersebut tetap jalan (non-idempotent untuk APK lama, tapi tidak break). APK baru (post-remediation) auto-pakai param baru.

- [ ] **Step 1: Tulis migration 007**

Buat `migrations/007_idempotency.sql`:

```sql
-- Idempotency for create_transaction: hindari double-transaction saat retry.
-- Backward compatible: kolom nullable + RPC parameter default NULL.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS client_request_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_client_request_id
  ON transactions(client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_transaction(
  p_total_amount      numeric,
  p_total_profit      numeric,
  p_payment_method    text,
  p_items             jsonb,
  p_client_request_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id        uuid;
  v_tx_code      text;
  v_existing     jsonb;
  v_item         jsonb;
  v_menu_id      bigint;
  v_book_id      bigint;
  v_qty          integer;
  v_grams        numeric;
  v_recipe_item  jsonb;
BEGIN
  -- Idempotency: bila client_request_id sudah dipakai, kembalikan transaksi yang ada
  IF p_client_request_id IS NOT NULL THEN
    SELECT to_jsonb(t) INTO v_existing
    FROM transactions t
    WHERE t.client_request_id = p_client_request_id
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  v_tx_code := public.generate_transaction_code();

  INSERT INTO transactions (transaction_code, total_amount, total_profit, payment_method, client_request_id)
  VALUES (v_tx_code, p_total_amount, p_total_profit, p_payment_method, p_client_request_id)
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO transaction_items (
      transaction_id, item_type, item_id, item_name,
      ingredient_name, ingredient_id, recipe_qty_grams,
      quantity, unit_price, total_price, hpp, profit_per_item
    ) VALUES (
      v_tx_id,
      v_item->>'item_type',
      NULLIF(v_item->>'item_id','')::bigint,
      v_item->>'item_name',
      v_item->>'ingredient_name',
      NULLIF(v_item->>'ingredient_id','')::bigint,
      NULLIF(v_item->>'recipe_qty_grams','')::numeric,
      NULLIF(v_item->>'quantity','')::integer,
      NULLIF(v_item->>'unit_price','')::numeric,
      NULLIF(v_item->>'total_price','')::numeric,
      NULLIF(v_item->>'hpp','')::numeric,
      NULLIF(v_item->>'profit_per_item','')::numeric
    );

    -- Decrement book stock
    IF v_item->>'item_type' = 'book' THEN
      v_book_id := (v_item->>'item_id')::bigint;
      v_qty := (v_item->>'quantity')::integer;
      -- decrement_book_stock throws jika kurang
      PERFORM public.decrement_book_stock(v_book_id, v_qty);
    END IF;

    -- Decrement ingredient stock untuk menu kopi
    IF v_item->>'item_type' = 'menu' AND v_item->>'ingredient_id' IS NOT NULL THEN
      v_grams := (v_item->>'recipe_qty_grams')::numeric;
      UPDATE ingredients
        SET current_stock_grams = current_stock_grams - v_grams
        WHERE id = (v_item->>'ingredient_id')::bigint;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('id', v_tx_id, 'transaction_code', v_tx_code);
END;
$$;

COMMENT ON FUNCTION public.create_transaction(numeric, numeric, text, jsonb, text) IS
  'Atomic transaction insert + items + stock decrement. p_client_request_id nullable, unique when present, untuk idempotency retry.';
```

**CATATAN**: signature asli `create_transaction` di migrations `001`/`002` wajib diperiksa kompatibilitas tipe parameternya. Sebelum dijalankan, baca ulang `migrations/002_create_transaction_with_stock.sql` dan adaptasi baris yang di atas agar sama persis untuk bagian stock decrement yang sudah ada — jangan timpa logic yang berbeda tanpa verifikasi line-by-line.

- [ ] **Step 2: Verifikasi migration tidak bentrok syntax**

```bash
git diff migrations/007_idempotency.sql   # bila existing
ls migrations/ | sort
```
Expected: tidak ada `007_*` sebelumnya.

- [ ] **Step 3: Edit `js/api.js` —▸ signature createTransaction**

Cari function `createTransaction` (audit: line ~181). Update:

```javascript
async createTransaction(txData, items, clientRequestId = null) {
  const { data, error } = await sb.rpc('create_transaction', {
    p_total_amount:        txData.total_amount,
    p_total_profit:        txData.total_profit,
    p_payment_method:      txData.payment_method,
    p_items:               items,
    p_client_request_id:   clientRequestId,
  });
  if (error) throw error;
  return data;
},
```

- [ ] **Step 4: Edit `js/kasir.js` — bahagian `processOrder`***

Cari `processOrder` (audit: ~line 361). Update agar generate `clientRequestId` sekali per klik + simpan closure untuk retry:

```javascript
let lastClientRequestId = null;

async function processOrder() {
  if (cart.length === 0) return;
  const processBtn = document.querySelector('.btn-process');
  if (!processBtn) return;

  // Generate idempotency key baru untuk setiap order baru (reset kalau cart berubah / sukses)
  if (!lastClientRequestId) {
    lastClientRequestId = (crypto.randomUUID && crypto.randomUUID()) ||
      ('ctx-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  }

  processBtn.disabled = true;
  processBtn.textContent = 'Menyimpan...';

  const txData = {
    total_amount:   totalCartValue(),
    total_profit:   totalCartProfit(),
    payment_method: 'cash',
  };
  const txItems = cart.map(item => ({
    item_type:         item._type,
    item_id:           String(item.id),
    item_name:         item.name,
    ingredient_name:   item.ingredient_name || null,
    ingredient_id:     item.ingredient_id   || null,
    recipe_qty_grams:  item.recipe_qty_grams || null,
    quantity:          item.quantity,
    unit_price:        item.unitPrice,
    total_price:       item.unitPrice * item.quantity,
    hpp:               item.hpp,
    profit_per_item:   item.profitPerItem,
  }));

  try {
    await api.createTransaction(txData, txItems, lastClientRequestId);
    showToast('Pesanan berhasil disimpan!');
    cart = [];
    lastClientRequestId = null;          // reset idempotency key setelah sukses
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    init(true);
    updateTotal();
  } catch (err) {
    console.error('Gagal simpan transaksi:', err);
    showToast('Gagal menyimpan pesanan. Coba lagi.');
    // Pertahankan lastClientRequestId — retry dengan key yang sama = idempotent
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = 'Proses Pesanan';
  }
}
```

**Catatan**: nama fungsi helper (`totalCartValue`, `totalCartProfit`), field kartu (`_type`, `unitPrice`, `hpp`, `profitPerItem`), konstanta (`PRODUCTS_CACHE_KEY`) — BACA ULANG `js/kasir.js` sebelum edit dan sesuaikan nama aktual. Code di atas adalah ilustrasi signature; jangan copy-paste tanpa adaptasi line-by-line.

- [ ] **Step 5: Verifikasi flow kasir jalan**

Buat test manual:
1. Buka `npx serve .` di repo, login.
2. Tambah produk ke cart, klik "Proses Pesanan". Toast sukses muncul.
3. Buka Supabase Dashboard → Table Editor → `transactions`. Harus ada 1 baris baru dengan `client_request_id` terisi UUID.
4. Buka `transaction_items`. Jumlah row = jumlah item di cart.

- [ ] **Step 6: Verifikasi idempotency**

Manual force timeout:
1. Tambah produk, klik Proses.
2. Sebelum sukses → throttle network ke Offline di DevTools.
3. Klik "Coba Lagi" (klik Proses Pesanan kedua kalinya dengan network masih flaky/timeout).
4. Setelah ≥1 panggilan gagal & 1 sukses → cek Dashboard: hanya 1 baris transaksi dengan `client_request_id` itu, bukan 2.

Bila tidak bisa test manual, minimum verifikasi syntax:
```bash
node --check js/kasir.js
node --check js/api.js
```
Expected: tidak ada syntax error.

- [ ] **Step 7: Commit**

```bash
git add migrations/007_idempotency.sql js/api.js js/kasir.js
git commit -m "fix: idempotency for create_transaction (avoid double-transaction on retry)"
```

- [ ] **Step 8: Eksekusi migration 007 di Dashboard Supabase**

Anda manual buka Supabase Dashboard → SQL Editor → paste isi `migrations/007_idempotency.sql` → Run. Verifikasi:
- `ALTER TABLE`: kolom `client_request_id` muncul di tabel `transactions`.
- Test: panggil RPC 2x dengan `p_client_request_id` sama → hanya 1 row dibuat.

---

## Fase 2 — Code Quality & Migration Files

### Task 2.1: Bungkus `js/form-produk.js` dalam IIFE

**Files:**
- Modify: `js/form-produk.js` (seluruh file).

**Interfaces:** expose `window.__formProdukInit` untuk dipanggil router.

- [ ] **Step 1: Baca file aktual**

```bash
wc -l js/form-produk.js
head -50 js/form-produk.js
tail -20 js/form-produk.js
```
Expected: file mulai deklarasi `let isEditMode = false, currentId = null, isBookMode = false, ingredients = [], recipeRows = [];` di scope module (top-level), tanpa IIFE.

- [ ] **Step 2: Bungkus seluruh isi dalam IIFE**

Struktur target:
```javascript
(function () {
  // === State (dipindahkan ke dalam closure) ===
  let isEditMode  = false;
  let currentId   = null;
  let isBookMode  = false;
  let ingredients = [];
  let recipeRows  = [];

  // === Functions (semua function declaration yang ada dipertahankan) ===
  function setup() {
    // reset state di awal supaya tidak bocor antar navigasi SPA
    isEditMode  = false;
    currentId   = null;
    isBookMode  = false;
    ingredients = [];
    recipeRows  = [];
    // ... lanjut body setup() yang lama ...
  }

  // ... seluruh function helper lain dipertahankan ...

  // === Expose init ke window (dipanggil router) ===
  window.__formProdukInit = setup;
})();
```

- [ ] **Step 3: Verifikasi tidak ada deklarasi top-level yang tersisa**

```bash
head -5 js/form-produk.js
tail -5 js/form-produk.js
```
Expected: baris pertama (`(function () {`), baris terakhir (`})();`).

- [ ] **Step 4: Verifikasi function init masih bisa dipanggil**

```bash
git grep -n "__formProdukInit" js/ index.html :!www/
```
Expected: ada assignment `window.__formProdukInit = setup;` di form-produk.js, dan ada pemanggilan (atau string reference) di router.js.

- [ ] **Step 5: Test manual flow form-produk**

1. Buka SPA → navigasikan ke route form-produk.
2. Edit menu A → save. Keluar halaman.
3. Masuk halaman form-produk lagi → tambah menu baru.
4. Verifikasi state menu A tidak bocor (form kosong, mode tambah aktif).

- [ ] **Step 6: Lampirkan syntax check**

```bash
node --check js/form-produk.js
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add js/form-produk.js
git commit -m "refactor: wrap form-produk.js in IIFE (fix global leak from commit 7c8b9b1)"
```

### Task 2.2: Tambah security headers di `vercel.json`

**Files:**
- Modify: `vercel.json`.

**Interfaces:** N/A — konfigurasi hosting.

**Constraint**: CSP `script-src` harus mengizinkan `https://cdn.jsdelivr.net` (untuk Supabase SDK). Jangan gunakan `'unsafe-inline'` di `script-src` (tinjau ulang apakah ada inline script di HTML; bila ada → inline handler goat bli `unsafe-inline` sementara sambil catat TODO).

- [ ] **Step 1: Cek apakah ada inline script di HTML**

```bash
git grep -nE "<script[^>]*>[^<]" -- '*.html' ':!www/' | head -20
```
Bila ada `<script>...</script>` inline (bukan src), catat file & baris.

- [ ] **Step 2: Tulis vercel.json baru**

```json
{
  "buildCommand": "",
  "outputDirectory": ".",
  "framework": null,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }
  ]
}
```

**CATATAN**: `'unsafe-inline'` di `script-src` hanya bila Step 1 menemukan inline script. Bila tidak ada inline script, hapus `'unsafe-inline'` dari `script-src`. `style-src 'unsafe-inline'` wajar karena banyak `<style>` inline / attribute style inline.

- [ ] **Step 3: Verifikasi JSON valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore: add security headers (X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy)"
```

- [ ] **Step 5: Redeploy Vercel & verifikasi**

```bash
# Bila pakai Vercel CLI:
vercel --prod  # atau biarkan auto-deploy via git push
```
```bash
curl -I https://<domain-produksi>/
```
Expected: muncul header-header di atas. Halaman tetap load normal di browser.

### Task 2.3: Lock Supabase SDK to exact version + SRI integrity

**Files:**
- Modify: `index.html`, `login.html`, `loading.html` (3 file HTML root yang muat SDK).

**Interfaces:** N/A — static asset tag.

**Constraint**: Versi SDK dipilih yang minor terbaru saat eksekusi (lihat https://www.npmjs.com/package/@supabase/supabase-js). Pada saat plan ditulis (Aug 2026) versi 2.x terbaru kemungkinan `@2.62.x` atau lebih baru — verifikasi sebelum lock.

- [ ] **Step 1: Cek versi latest Supabase-js v2**

```bash
curl -s https://api.jsdelivr.net/v1/packages/npm/@supabase/supabase-js@2 | head -200
```
Atau buka https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js → DevTools Network → lihat "X-Version" header atau pakai `https://data.jsdelivr.com/v1/packages/npm/@supabase/supabase-js@2` (resolve version). Catat exact version, mis. `2.62.2`.

- [ ] **Step 2: Download file & hitung SRI hash**

```bash
SDK_URL="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.62.2/dist/umd/supabase.js"
curl -s "$SDK_URL" -o /tmp/opencode/supabase-js.js
HASH=$(openssl dgst -sha384 -binary /tmp/opencode/supabase-js.js | openssl base64 -A)
echo "sha384-$HASH"
```
Catat hash keluaran `sha384-<...>`.

**Constraint**: Ganti `2.62.2` dengan exact version yang Anda catat di Step 1.

- [ ] **Step 3: Update tag `<script>` di `index.html`**

Cari baris:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
```
Ganti ke:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.62.2/dist/umd/supabase.js"
        integrity="sha384-<HASH_DARI_STEP_2>"
        crossorigin="anonymous"></script>
```

- [ ] **Step 4: Update tag yang sama di `login.html` dan `loading.html`**

```bash
git grep -nE "cdn\.jsdelivr\.net/npm/@supabase/supabase-js" -- '*.html' ':!www/'
```
Expected: 3 lokasi (index.html, login.html, loading.html). Update ketiganya dengan exact version + integrity yang sama (hash berbeda bila versi berbeda).

- [ ] **Step 5: Verifikasi hash cocok**

```bash
# hash file yang diload browser harus sama dengan hash di integrity attribute
curl -s "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.62.2/dist/umd/supabase.js" \
  | openssl dgst -sha384 -binary | openssl base64 -A
```
Expected: string yang sama dengan yang ada di atribut `integrity` (tanpa prefix `sha384-`).

- [ ] **Step 6: Test halaman load di browser**

Buka `index.html` via `npx serve .` atau deploy preview Vercel. Cek DevTools → Network → file supabase.js terload dengan status 200, tidak ada error SRI di console ("Subresource Integrity").

- [ ] **Step 7: Commit**

```bash
git add index.html login.html loading.html
git commit -m "chore: pin supabase-js to exact version + add SRI integrity"
```

### Task 2.4: Tulis migration 005 (clean trigger defunct & RPC overloaded)

**Files:**
- Create: `migrations/005_cleanup_rpc_and_triggers.sql`.

**Interfaces:** N/A — DDL untuk dijalankan manual di Dashboard Supabase.

**Constraint**: Hapus `update_book_stock` (function + trigger, defunct — referensi tabel `book_stock_movements` yang tidak ada). Tidak sentuh RPC yang masih dipakai. Jangan drop overload `calculate_*` sebelum konfirmasi signature mana yang dipakai — bila tidak ada yang dipakai (audit menemukan perhitungan harga di client, bukan server), DROP semua overload dan dokumentasikan di `supabase-sarpon-pos.md` bahwa harga dihitung client. Tapi untuk amannya, Fase ini hanya DROP `update_book_stock` (yang sudah pasti defunct); cleanup `calculate_*` defer ke sub-task terpisah bila perlu.

- [ ] **Step 1: Baca ulang bagian `update_book_stock` di `supabase-sarpon-pos.md`**

```bash
git grep -n "update_book_stock\|book_stock_movements\|product_type" supabase-sarpon-pos.md
```
Konfirmasi trigger defunct: referensi tabel tidak ada.

- [ ] **Step 2: Tulis file migration**

```sql
-- 005_cleanup_rpc_and_triggers.sql
-- Drop trigger/function yang defunct (referensi tabel yang tidak ada).
-- BERTAHAP: hanya drop yang sudah pasti tidak terpakai.
-- Cleanup RPC overloaded (calculate_*) defer ke sub-task terpisah.

DO $$
BEGIN
  -- Drop trigger bila ada
  DROP TRIGGER IF EXISTS update_book_stock ON books;

  -- Drop function
  DROP FUNCTION IF EXISTS update_book_stock();

  RAISE NOTICE 'Cleanup selesai: update_book_stock trigger & function dihapus.';
END $$;
```

- [ ] **Step 3: Verifikasi syntax**

```bash
# Postgres syntax check tidak ada di repo tanpa psql lokal, jadi hanya:
ls migrations/005_cleanup_rpc_and_triggers.sql
git diff --no-index /dev/null migrations/005_cleanup_rpc_and_triggers.sql | head -30
```

- [ ] **Step 4: Commit**

```bash
git add migrations/005_cleanup_rpc_and_triggers.sql
git commit -m "chore: migration 005 drop defunct update_book_stock trigger/function"
```

- [ ] **Step 5: Eksekusi di Dashboard Supabase**

Anda manual: SQL Editor → paste isi `005_cleanup_rpc_and_triggers.sql` → Run. Verifikasi:
```sql
SELECT proname FROM pg_proc WHERE proname = 'update_book_stock';
-- expected: 0 row
SELECT tgname FROM pg_trigger WHERE tgname = 'update_book_stock';
-- expected: 0 row
```

### Task 2.5: Tulis migration 006 (index hot path)

**Files:**
- Create: `migrations/006_add_indexes.sql`.

**Interfaces:** N/A — DDL index dijalankan manual di Dashboard.

**Constraint**: Untuk volume warung kopi (~10rb baris transactions), `CREATE INDEX IF NOT EXISTS` cukup cepat. Bila volume lebih besar (>100rb), pakai `CREATE INDEX CONCURRENTLY` (tidak bisa dijalankan dalam transaction wrapper; dari dashboard SQL editor tidak masalah karena tiap statement auto-commit).

- [ ] **Step 1: Tulis file migration**

```sql
-- 006_add_indexes.sql
-- Index hot path untuk query dashboard, riwayat transaksi, dan join transaction_items.

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON transactions(payment_method);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_created_at
  ON transaction_items(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at
  ON expenses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_menu_item_id
  ON recipe_ingredients(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
  ON recipe_ingredients(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_active_category
  ON menu_items(category) WHERE is_active = true;
```

- [ ] **Step 2: Verifikasi file**

```bash
ls migrations/006_add_indexes.sql
git grep -c "CREATE INDEX" migrations/006_add_indexes.sql
```
Expected: 8.

- [ ] **Step 3: Commit**

```bash
git add migrations/006_add_indexes.sql
git commit -m "perf: migration 006 add indexes for hot path queries"
```

- [ ] **Step 4: Eksekusi di Dashboard Supabase & verifikasi**

Anda manual: SQL Editor → paste isi `006_add_indexes.sql` → Run. Verifikasi:
```sql
SELECT indexname FROM pg_indexes
WHERE schemaname='public'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;
```
Expected: 8 index baru muncul.

Test plan performance:
```sql
EXPLAIN ANALYZE SELECT * FROM transactions
  WHERE created_at >= now() - interval '30 days'
  ORDER BY created_at DESC;
```
Expected: Seq Scan berganti → Index Scan / Index Only Scan bila ada.

### Task 2.6: Tulis migration 000 (baseline DDL schema)

**Files:**
- Create: `migrations/000_init_schema.sql`.

**Interfaces:** N/A — DDL baseline untuk setup project baru/audit. Tidak wajib dijalankan di production existing (cuma dokumentasi reproduksi schema).

**Constraint**: Schema diambil dari `supabase-sarpon-pos.md` + audit field yang dipakai kode (`app_settings`, `client_request_id` post-Task 1.5).*Sertakan RLS policy public-access sebagai baseline (akan di-lockdown di Fase 3 plan terpisah). Sertakan trigger `update_updated_at_column` untuk `books`, `ingredients`, `menu_items`.

- [ ] **Step 1: Baca ulang `supabase-sarpon-pos.md` seluruhnya**

```bash
wc -l supabase-sarpon-pos.md
sed -n '1,100p' supabase-sarpon-pos.md   # atau pakai read tool
sed -n '100,250p' supabase-sarpon-pos.md
sed -n '250,400p' supabase-sarpon-pos.md
```

- [ ] **Step 2: Susun DDL**

Buat `migrations/000_init_schema.sql` dengan struktur:

```sql
-- 000_init_schema.sql
-- Baseline DDL untuk reproduce schema Sarpon-POS dari awal.
-- Tidak wajib dijalankan di production existing — ini referensi self-contained.
-- Bila jalankan di fresh database, jalankan DULU sebelum 001-007.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- === Tabel utama ===

CREATE TABLE IF NOT EXISTS ingredients (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                 text NOT NULL UNIQUE,
  category             text NOT NULL DEFAULT 'coffee',
  purchase_price       numeric(12,2) NOT NULL DEFAULT 0,
  pack_size_grams      integer NOT NULL DEFAULT 1000,
  current_stock_grams  numeric(12,2) NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT 'coffee',
  is_active     boolean NOT NULL DEFAULT true,
  fixed_cost    numeric(12,2) NOT NULL DEFAULT 0,
  profit_margin numeric(4,2) NOT NULL DEFAULT 1.00,
  rounding_up   integer NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_item_id    bigint NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id   bigint NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_grams  numeric(10,2) NOT NULL,
  UNIQUE(menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS books (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           text NOT NULL,
  author          text,
  isbn            text UNIQUE,
  purchase_price  numeric(12,2) NOT NULL DEFAULT 0,
  selling_price   numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity  integer NOT NULL DEFAULT 0,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code   text NOT NULL UNIQUE,
  total_amount       numeric(12,2) NOT NULL,
  total_profit       numeric(12,2) NOT NULL DEFAULT 0,
  payment_method     text NOT NULL DEFAULT 'cash'
                       CHECK (payment_method IN ('cash','card','ewallet')),
  notes              text,
  client_request_id  text,    -- dari migration 007; nullable, unique via partial index
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id     uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  item_type          text NOT NULL CHECK (item_type IN ('menu','book','manual')),
  item_id            bigint,                       -- nullable; FK logic tergantung item_type
  item_name          text NOT NULL,
  ingredient_name    text,
  ingredient_id      bigint REFERENCES ingredients(id) ON DELETE RESTRICT,
  recipe_qty_grams   numeric(10,2),
  quantity           integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price          numeric(12,2) NOT NULL,
  total_price         numeric(12,2) NOT NULL,
  hpp                 numeric(12,2) NOT NULL DEFAULT 0,
  profit_per_item     numeric(12,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  group_id    bigint,
  notes       text,
  category    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- === Trigger updated_at ===

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Index (default, untuk baseline; 006_add_indexes.sql untuk hot path) ===

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items(transaction_id);

-- === RLS (BASELINE PUBLIC-ACCESS; LOCKDOWN DI FASE 3 PLAN TERPISAH) ===

ALTER TABLE ingredients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings          ENABLE ROW LEVEL SECURITY;

-- Policy baseline public access (akan diganti Fase 3)
CREATE POLICY p_ingredients_public_all   ON ingredients           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_menu_items_public_all    ON menu_items            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_recipe_public_all        ON recipe_ingredients    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_books_public_all         ON books                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_transactions_public_all   ON transactions          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_tx_items_public_all      ON transaction_items     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_expenses_public_all      ON expenses              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY p_app_settings_public_all  ON app_settings          FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- === Helper RPC (yang dipakai 002) ===
-- generate_transaction_code dan decrement_book_stock dijalankan via 001/002.
```

**Catatan**: Adaptasi kolom� nama-kolom bila berbeda setelah baca `supabase-sarpon-pos.md` lengkap di Step 1. Jangan copy paste template ini tanpa verifikasi line-by-line dengan dokumentasi schema.

- [ ] **Step 3: Verifikasi file & line count**

```bash
wc -l migrations/000_init_schema.sql
git grep -c "CREATE TABLE\|CREATE POLICY\|CREATE TRIGGER" migrations/000_init_schema.sql
```
Expected: tabel 8, policy 8, trigger 5.

- [ ] **Step 4: Commit**

```bash
git add migrations/000_init_schema.sql
git commit -m "docs: migration 000 baseline DDL schema (reproducible from repo)"
```

- [ ] **Step 5: Update `supabase-sarpon-pos.md` cross-link**

Tambahkan paragraf di akhir `supabase-sarpon-pos.md`:
```markdown
## Reproduce Schema

Skema lengkap direproduksi via `migrations/000_init_schema.sql`.
Jalan untuk fresh database. Production existing sudah migrasi incremental via
`001-007`. Lockdown RLS = Fase 3 plan terpisah.
```

- [ ] **Step 6: Commit dokumen update**

```bash
git add supabase-sarpon-pos.md
git commit -m "docs: cross-link schema doc to migration 000 baseline"
```

### Task 2.7: Fix `js/input-manual.js` kirim `item_id: null`

**Files:**
- Modify: `js/input-manual.js` (line ~48-54).

**Interfaces:** N/A.

**Constraint**: Konfirmasi kolom `transaction_items.item_id` nullable di DB (lihat DDL migration 000 — memang nullable). Jangan kirim `0` (angka random yang bisa di-konfusi sebagai FK valid ke row dengan id=0).

- [ ] **Step 1: Baca ulang bagian processOrder di input-manual.js**

```bash
git grep -n "item_id\|processOrder\|createTransaction" js/input-manual.js
```

- [ ] **Step 2: Verifikasi kolom `item_id` nullable via Dashboard**

Anda buka Supabase Dashboard → Table Editor → `transaction_items` → lihat kolom `item_id` → harus "is nullable: YES". Atau SQL:
```sql
SELECT is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='transaction_items' AND column_name='item_id';
```
Expected: `YES`. Bila `NO` → Anda jalankan `migrations/000_init_schema.sql` dulu atau `ALTER TABLE transaction_items ALTER COLUMN item_id DROP NOT NULL;`.

- [ ] **Step 3: Edit `js/input-manual.js`**

Cari baris `item_id: 0,` (audit: ~line 48). Ganti ke:
```javascript
item_id: null,
```
Untuk konteks:
```javascript
const txItems = [
  {
    item_type:         'manual',
    item_id:           null,                                   // ← sebelumnya 0
    item_name:         manualName,
    ingredient_name:   null,
    ingredient_id:     null,
    recipe_qty_grams:  null,
    quantity:          manualQty,
    unit_price:        manualPrice,
    total_price:       manualPrice * manualQty,
    hpp:               0,
    profit_per_item:   manualPrice * manualQty,
  },
];
```
(Sesuaikan nama variabel — `manualName`, `manualQty`, dst. — dengan nama aktual di file.)

- [ ] **Step 4: Verifikasi syntax**

```bash
node --check js/input-manual.js
```

- [ ] **Step 5: Test manual flow input-manual**

1. Buka SPA → route input-manual.
2. Submit transaksi manual sukses.
3. Cek Dashboard `transaction_items` → row baru,
   `item_id` = NULL (bukan 0).

- [ ] **Step 6: Commit**

```bash
git add js/input-manual.js
git commit -m "fix: input-manual kirim item_id null (sebelumnya 0, bisa di-conflict FK invalid)"
```

---

## Rollback Plan

Bila ada task yang gagal atau hasil review tidak OK:

```bash
# Hapus tag dan rollback ke state sebelum remediasi:
git reset --hard pre-remediation-backup

# atau revert per commit:
git log --oneline -20
git revert <commit-hash>
```

Restore tarball backup bila working tree corrupt lagi:
```bash
cd /data/Documents/website-toko-V2-main
rm -rf js/ css/ pages/ migrations/
tar -xzf /tmp/opencode/sarpon-pos-head-backup-*.tar.gz -C .
```

## Post-Remediation Checklist

- [ ] `git log --oneline -15` rapi, semua commit Fase 0-2 ada.
- [ ] `git status` clean.
- [ ] `git ls-files | grep ^www/` kosong.
- [ ] `ls dashboard.html katalog.html riwayat.html 2>&1 | grep -c "No such"` ≥3.
- [ ] `cat README.md | head -3` → start `# POS Toko Terang`.
- [ ] `git grep "던져"` → kosong.
- [ ] Manual test kasir idempotency → 1 transaksi pas retry.
- [ ] Manual test form-produk 2x berturut → state bersih.
- [ ] `curl -I https://<domain>/` → ada `X-Frame-Options`, `Content-Security-Policy`.
- [ ] Supabase SDK version exact + integrity attribute ada di 3 file HTML.
- [ ] Supabase Dashboard: 8 index baru di `pg_indexes`, `transactions.client_request_id` ada + unique partial index, `update_book_stock` function tidak ada.
- [ ] `js/input-manual.js` `item_id: null`, bukan `0`.

## Open Questions (resolve sebelum eksekusi)

1. **APK yang sudah tersebar**: masih pakai `www/` lama (non-atomic)? Setelah remediation, push APK update via Capacitor dan distribusi ulang.
2. **3rd-party scripts** (Google Analytics, Vercel Web Analytics)? Bila ada, whitelist di CSP `script-src` `vercel.json` (Task 2.2).
3. **Volume transactions** saat ini: jika >100rb baris, jalankan `CREATE INDEX CONCURRENTLY` (tanpa transaction wrap) bukan `CREATE INDEX IF NOT EXISTS` (Task 2.5).
4. **Cek kolom `transaction_items.item_type`** di Dashboard apakah sudah ada CHECK constraint `'menu','book','manual'` — bila belum ada, migration 000 mengandung constraint baru yang bisa break INSERT lama (mis. bila ada row `'other'`). Drop CHECK di 000 atau migrate data dulu.