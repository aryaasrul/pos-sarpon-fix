# Setup PocketBase – Toko Terang

## 1. Download PocketBase

Pergi ke https://pocketbase.io/docs/ → Download versi terbaru untuk Linux (amd64).

```bash
# Buat folder untuk server
mkdir ~/pocketbase && cd ~/pocketbase

# Unzip (sesuaikan nama file-nya)
unzip pocketbase_linux_amd64.zip
chmod +x pocketbase
```

## 2. Jalankan Server

```bash
./pocketbase serve
```

Server akan berjalan di:
- **API:** http://127.0.0.1:8090
- **Admin UI:** http://127.0.0.1:8090/_/

Buka Admin UI di browser, buat akun admin.

---

## 3. Buat Collections

Buka http://127.0.0.1:8090/_ → **Collections** → **New Collection**

### Collection: `products`

| Field     | Type   | Required | Keterangan               |
|-----------|--------|----------|--------------------------|
| name      | Text   | ✓        | Nama produk              |
| price     | Number | ✓        | Harga jual               |
| hpp       | Number |          | Harga pokok produksi     |
| kategori  | JSON   |          | Array kategori (JSON)    |
| photo     | File   |          | Foto produk (max 1 file) |

**API Rules** (tab "API Rules"):
- List/Search: biarkan kosong (boleh semua)
- View: kosong
- Create: kosong
- Update: kosong
- Delete: kosong

### Collection: `orders`

| Field          | Type     | Required | Keterangan              |
|----------------|----------|----------|-------------------------|
| transaction_id | Text     | ✓        | ID transaksi (grouping) |
| name           | Text     | ✓        | Nama produk             |
| quantity       | Number   | ✓        | Jumlah                  |
| price          | Number   | ✓        | Harga satuan            |
| hpp            | Number   |          | HPP satuan              |
| date           | Date     | ✓        | Tanggal transaksi       |

### Collection: `expenses`

| Field    | Type   | Required | Keterangan              |
|----------|--------|----------|-------------------------|
| name     | Text   | ✓        | Nama item pengeluaran   |
| amount   | Number | ✓        | Nominal                 |
| date     | Date   | ✓        | Tanggal pengeluaran     |
| group_id | Text   |          | ID grup (satu input)    |

---

## 4. Konfigurasi Akses Jaringan Lokal

Agar bisa diakses dari HP/tablet di jaringan yang sama:

```bash
# Jalankan dengan bind ke semua interface
./pocketbase serve --http=0.0.0.0:8090
```

Cari IP lokal server:
```bash
ip addr show | grep "inet " | grep -v 127
# Contoh: 192.168.1.10
```

Lalu update `js/api.js`:
```javascript
const PB_URL = 'http://192.168.1.10:8090';  // ganti dengan IP kamu
```

---

## 5. Jalankan Website

Karena ini vanilla HTML, kamu butuh web server lokal sederhana:

```bash
# Opsi 1: Python (biasanya sudah terinstall)
cd /path/to/website-toko-V2-main
python3 -m http.server 3000

# Opsi 2: Node.js serve
npx serve .
```

Buka http://localhost:3000 di browser.

---

## 6. Struktur Folder Setelah Refactor

```
website-toko-V2-main/
├── js/
│   ├── api.js              ← PocketBase client (edit URL di sini)
│   ├── utils.js            ← helper: format, tanggal, kategori
│   ├── nav.js              ← routing navbar & modal helper
│   ├── auth.js             ← session guard
│   ├── login.js
│   ├── kasir.js
│   ├── katalog.js
│   ├── riwayat.js
│   ├── form-produk.js
│   ├── input-manual.js
│   └── tambah-pengeluaran.js
├── css/
│   ├── base.css            ← reset, variabel, utility
│   └── components.css      ← navbar, cards, modal, responsive
├── [per-page CSS]          ← style spesifik halaman
├── [HTML files]
└── SETUP.md                ← file ini
```

---

## 7. Ubah Kode Rahasia Login

Edit `js/login.js` baris pertama:
```javascript
const SECRET_CODE = 'terang123';  // ganti di sini
```
