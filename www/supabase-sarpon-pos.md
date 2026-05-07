  ---                                                                         
  sarpon-pos — Dokumentasi Database Supabase                                    
                                                                                
  Project URL: https://rnohilsczuqdcsquhpmp.supabase.co                         
                                                                                
  Ini adalah sistem Point of Sale (POS) untuk kedai kopi yang juga menjual buku.
   Sistem mengelola menu kopi (dengan perhitungan harga berbasis bean),         
  inventori buku, transaksi penjualan, dan pengeluaran operasional.             
                                                                                
  ---                                                                           
  Arsitektur Keseluruhan                                                        
                                                                                
  ingredients ──────┐                                                           
                    ├── recipe_ingredients ──── menu_items                      
                    │                               │                           
  books ────────────┼───────────────────────────────┤                           
                    │                               │                           
                    └──────── transaction_items ─── transactions                
                                                        │
  expenses (standalone)                            (sales records)              
                                                                                
  ---                                                                           
  Tables                                                                        
                  
  ingredients

  Menyimpan bahan baku kopi dan lainnya beserta data stok.                      
   
  ┌─────────────────────┬─────────────┬────────────────┬────────────────────┐   
  │        Kolom        │    Tipe     │    Default     │     Keterangan     │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤
  │ id                  │ integer     │ auto-increment │                    │
  │                     │ (PK)        │                │                    │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤   
  │ name                │ text        │ —              │ UNIQUE             │   
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤   
  │ category            │ text        │ —              │ espresso_bean,     │   
  │                     │             │                │ filter_bean, other │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤
  │ purchase_price      │ numeric     │ 0              │ Harga beli per     │
  │                     │             │                │ pack               │   
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤
  │ pack_size_grams     │ integer     │ 1000           │ Ukuran pack dalam  │   
  │                     │             │                │ gram               │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤   
  │ current_stock_grams │ integer     │ 0              │ Stok saat ini      │
  │                     │             │                │ (gram)             │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤   
  │ created_at          │ timestamptz │ now()          │                    │
  ├─────────────────────┼─────────────┼────────────────┼────────────────────┤   
  │ updated_at          │ timestamptz │ now()          │ Auto-update via    │
  │                     │             │                │ trigger            │
  └─────────────────────┴─────────────┴────────────────┴────────────────────┘

  ---                                                                           
  menu_items
                                                                                
  Daftar menu yang dijual beserta konfigurasi harga.

  ┌───────────────┬──────────┬────────────────┬─────────────────────────────┐   
  │     Kolom     │   Tipe   │    Default     │         Keterangan          │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ id            │ integer     │ auto-increment │                          │
  │               │ (PK)        │                │                          │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ name          │ text        │ —              │ Nama menu                │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ category      │ text        │ —              │ espresso_based, filter,  │   
  │               │             │                │ local_proses, non_coffee │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ is_active     │ boolean     │ true           │ Status aktif/nonaktif    │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ fixed_cost    │ numeric     │ 0              │ Biaya tetap (cup, susu,  │
  │               │             │                │ dll)                     │   
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ profit_margin │ numeric     │ 0.300          │ Margin profit (30%       │   
  │               │             │                │ default)                 │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ rounding_up   │ integer     │ 1000           │ Kelipatan pembulatan     │
  │               │             │                │ harga                    │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ created_at    │ timestamptz │ now()          │                          │
  ├───────────────┼─────────────┼────────────────┼──────────────────────────┤   
  │ updated_at    │ timestamptz │ now()          │ Auto-update via trigger  │
  └───────────────┴─────────────┴────────────────┴──────────────────────────┘

  ---
  recipe_ingredients
                    
  Tabel relasi antara menu_items dan ingredients (resep menu).
                                                                                
  ┌────────────────┬─────────────┬────────────────┬─────────────────────────┐
  │     Kolom      │    Tipe     │    Default     │       Keterangan        │   
  ├────────────────┼─────────────┼────────────────┼─────────────────────────┤
  │ id             │ integer     │ auto-increment │                         │
  │                │ (PK)        │                │                         │
  ├────────────────┼─────────────┼────────────────┼─────────────────────────┤   
  │ menu_item_id   │ integer     │ —              │ → menu_items.id         │
  │                │ (FK)        │                │                         │   
  ├────────────────┼─────────────┼────────────────┼─────────────────────────┤
  │ ingredient_id  │ integer     │ —              │ → ingredients.id        │
  │                │ (FK)        │                │                         │   
  ├────────────────┼─────────────┼────────────────┼─────────────────────────┤
  │ quantity_grams │ numeric     │ 0              │ Jumlah bahan yang       │   
  │                │             │                │ dipakai (gram)          │
  ├────────────────┼─────────────┼────────────────┼─────────────────────────┤
  │ created_at     │ timestamptz │ now()          │                         │
  └────────────────┴─────────────┴────────────────┴─────────────────────────┘

  ---
  books
       
  Inventori buku yang dijual di kedai.
                                                                                
  ┌────────────────┬──────────────┬────────────────┬───────────────┐
  │     Kolom      │     Tipe     │    Default     │       Keterangan        │  
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤
  │ id             │ integer (PK) │ auto-increment │                         │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤
  │ title          │ text         │ —              │ Judul buku              │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤  
  │ author         │ text         │ —              │ Penulis                 │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤  
  │ isbn           │ text         │ —              │ UNIQUE                  │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤
  │ purchase_price │ numeric      │ 0              │ Harga beli              │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤
  │ selling_price  │ numeric      │ 0              │ Harga jual              │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤  
  │ stock_quantity │ integer      │ 0              │ Stok tersedia           │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤  
  │ description    │ text         │ —              │ Deskripsi               │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤
  │ created_at     │ timestamptz  │ now()          │                         │
  ├────────────────┼──────────────┼────────────────┼─────────────────────────┤  
  │ updated_at     │ timestamptz  │ now()          │ Auto-update via trigger │
  └────────────────┴──────────────┴────────────────┴─────────────────────────┘  
                  
  ---
  transactions

  Header transaksi penjualan.

  ┌──────────────────┬─────────────┬────────────────┬───────────────────────┐   
  │      Kolom       │    Tipe     │    Default     │      Keterangan       │
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤   
  │ id               │ integer     │ auto-increment │                       │
  │                  │ (PK)        │                │                       │
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤
  │ transaction_code │ text        │ —              │ UNIQUE, format        │   
  │                  │             │                │ TRX-YYYYMMDD-{epoch}  │
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤   
  │ total_amount     │ numeric     │ 0              │ Total bayar           │
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤
  │ total_profit     │ numeric     │ 0              │ Total profit          │
  │                  │             │                │ transaksi             │   
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤
  │ payment_method   │ text        │ 'cash'         │ cash, card, ewallet   │   
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤
  │ notes            │ text        │ —              │ Catatan opsional      │   
  ├──────────────────┼─────────────┼────────────────┼───────────────────────┤
  │ created_at       │ timestamptz │ now()          │                       │   
  └──────────────────┴─────────────┴────────────────┴───────────────────────┘
                                                                                
  ---             
  transaction_items

  Detail item dalam setiap transaksi.

  ┌─────────────────┬───────────┬────────────────┬──────────────────────────┐
  │      Kolom      │   Tipe    │    Default     │        Keterangan        │
  ├─────────────────┼───────────┼────────────────┼──────────────────────────┤
  │ id              │ integer   │ auto-increment │                          │
  │                 │ (PK)      │                │                          │
  ├─────────────────┼───────────┼────────────────┼──────────────────────────┤   
  │ transaction_id  │ integer   │ —              │ → transactions.id        │
  │                 │ (FK)      │                │                          │   
  ├─────────────────┼───────────┼────────────────┼──────────────────────────┤   
  │ item_type       │ text      │ —              │ menu atau book           │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ item_id         │ integer     │ —              │ ID menu/buku           │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ item_name       │ text        │ —              │ Nama item (snapshot)   │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ ingredient_name │ text        │ —              │ Nama bean yang dipakai │
  │                 │             │                │  (khusus kopi)         │   
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤
  │ quantity        │ integer     │ 1              │ Jumlah                 │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤
  │ unit_price      │ numeric     │ 0              │ Harga satuan           │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ total_price     │ numeric     │ 0              │ unit_price × quantity  │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ hpp             │ numeric     │ 0              │ Harga Pokok Penjualan  │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ profit_per_item │ numeric     │ 0              │ Profit per item        │
  ├─────────────────┼─────────────┼────────────────┼────────────────────────┤   
  │ created_at      │ timestamptz │ now()          │                        │
  └─────────────────┴─────────────┴────────────────┴────────────────────────┘   
   
  ---                                                                           
  expenses        

  Pengeluaran operasional kedai.

  ┌────────────┬─────────────┬────────────────┬──────────────────────────┐
  │   Kolom    │    Tipe     │    Default     │        Keterangan        │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ id         │ bigint (PK) │ auto-increment │                          │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ name       │ varchar     │ —              │ Nama pengeluaran         │      
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤
  │ amount     │ numeric     │ —              │ Nominal (≥ 0)            │      
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤      
  │ group_id   │ varchar     │ —              │ Pengelompokan (opsional) │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤      
  │ notes      │ text        │ —              │ Catatan                  │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤      
  │ category   │ varchar     │ 'Umum'         │ Kategori pengeluaran     │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤      
  │ created_at │ timestamptz │ UTC now()      │                          │
  ├────────────┼─────────────┼────────────────┼──────────────────────────┤      
  │ updated_at │ timestamptz │ UTC now()      │                          │
  └────────────┴─────────────┴────────────────┴──────────────────────────┘      
                  
  ---
  Business Logic & Kalkulasi Harga
                                  
  Rumus HPP & Harga Jual
                                                                                
  Menu Kopi (berbasis bean):
  HPP = fixed_cost + (purchase_price × quantity_grams / pack_size_grams)        
                                                                        
  sell_price = CEIL(HPP × (1 + profit_margin) / rounding_up) × rounding_up      
                                                                          
  Menu Non-Kopi (tidak ada bean):                                               
  sell_price = CEIL(fixed_cost × (1 + profit_margin) / rounding_up) ×           
  rounding_up                                                        
                                                                                
  Contoh:         
  - fixed_cost = 5000, profit_margin = 0.30, rounding_up = 1000                 
  - Bean: harga beli 200.000/1000g, dipakai 18g → bean cost = 3.600             
  - HPP = 5.000 + 3.600 = 8.600                                                 
  - Harga jual = CEIL(8.600 × 1.30 / 1000) × 1000 = 12.000                      
                                                                                
  Satu Menu = Banyak Harga (Multi-Bean)                                         
                                                                                
  Menu kopi dapat memiliki beberapa bahan bean berbeda dalam recipe_ingredients.
   Setiap bean menghasilkan harga jual yang berbeda — sehingga satu menu bisa   
  punya beberapa opsi harga tergantung bean yang dipakai.                       
                  
  ---
  Database Functions
                                                                                
  calculate_coffee_menu_prices(p_menu_item_id INTEGER)
                                                                                
  Returns SETOF RECORD (ingredient_id, ingredient_name, hpp, sell_price)        
   
  Menghitung HPP dan harga jual untuk setiap bean dalam resep menu. Digunakan   
  untuk menu kopi berbasis espresso/filter.
                                                                                
  ---             
  calculate_menu_prices(p_menu_item_id INTEGER) (overloaded, 3 versi)
                                                                                
  Returns SETOF RECORD (ingredient_id, ingredient_name, hpp, sell_price)
                                                                                
  Versi yang lebih robust dengan fallback logic — mencoba kolom quantity, lalu  
  quantity_grams/grams/amount, lalu fallback ke HPP = fixed_cost saja. Versi
  terbaru menambahkan RAISE NOTICE untuk debugging.                             
                  
  ---
  calculate_non_coffee_price(p_menu_item_id INTEGER) (overloaded, 3 versi)
                                                                          
  Returns NUMERIC
                                                                                
  Menghitung harga jual untuk item non-kopi (tanpa bean). Hanya menggunakan     
  fixed_cost × (1 + profit_margin) lalu dibulatkan.                             
                                                                                
  ---             
  decrement_book_stock(p_book_id INTEGER, p_quantity INTEGER)
                                                                                
  Returns BOOLEAN
                                                                                
  Mengurangi stok buku. Melempar exception jika buku tidak ditemukan atau stok  
  tidak mencukupi.
                                                                                
  ---             
  generate_transaction_code()
                             
  Returns TEXT
                                                                                
  Menghasilkan kode transaksi unik dengan format:
  TRX-YYYYMMDD-{epoch_timestamp}                                                
  Contoh: TRX-20260419-0001745078400

  ---                                                                           
  update_updated_at_column() (trigger function)
                                                                                
  Returns TRIGGER 
                                                                                
  Auto-update kolom updated_at = NOW() sebelum setiap UPDATE.                   
   
  ---                                                                           
  update_book_stock() (trigger function — belum aktif)

  Returns TRIGGER

  Trigger function yang dirancang untuk mengurangi stok buku saat transaksi     
  terjadi. Catatan: Referensi ke kolom product_type, book_id, dan tabel
  book_stock_movements yang belum ada di schema saat ini — kemungkinan sisa dari
   versi schema sebelumnya atau rencana yang belum diimplementasi.

  ---
  Triggers
                                                                                
  ┌────────────────────────┬──────────┬──────┬──────┬──────────────────────┐
  │        Trigger         │  Tabel   │ Even │ Timi │        Fungsi        │    
  │                        │          │  t   │  ng  │                      │    
  ├────────────────────────┼──────────┼──────┼──────┼──────────────────────┤
  │ update_books_updated_a │ books    │ UPDA │ BEFO │ update_updated_at_co │    
  │ t                      │          │ TE   │ RE   │ lumn()               │
  ├────────────────────────┼──────────┼──────┼──────┼──────────────────────┤
  │ update_ingredients_upd │ ingredie │ UPDA │ BEFO │ update_updated_at_co │
  │ ated_at                │ nts      │ TE   │ RE   │ lumn()               │    
  ├────────────────────────┼──────────┼──────┼──────┼──────────────────────┤
  │ update_menu_items_upda │ menu_ite │ UPDA │ BEFO │ update_updated_at_co │    
  │ ted_at                 │ ms       │ TE   │ RE   │ lumn()               │
  └────────────────────────┴──────────┴──────┴──────┴──────────────────────┘

  ---
  Row Level Security (RLS)
                                                                                
  RLS aktif di semua tabel, namun semua policy bersifat public access (tanpa
  autentikasi):                                                                 
                  
  ┌────────────────────┬────────────────────────────────────┬────────┬───────┐  
  │       Tabel        │               Policy               │  Role  │ Akses │
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤  
  │ books              │ Public access                      │ public │ ALL   │
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤  
  │ expenses           │ Enable all operations for          │ public │ ALL   │
  │                    │ authenticated users                │        │       │  
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤
  │ ingredients        │ Public access                      │ public │ ALL   │  
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤
  │ menu_items         │ Public access                      │ public │ ALL   │
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤  
  │ recipe_ingredients │ Public access                      │ public │ ALL   │
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤  
  │ transaction_items  │ Public access                      │ public │ ALL   │
  ├────────────────────┼────────────────────────────────────┼────────┼───────┤
  │ transactions       │ Public access                      │ public │ ALL   │
  └────────────────────┴────────────────────────────────────┴────────┴───────┘  
   
  ▎ ⚠️  Semua data dapat diakses tanpa login. Jika aplikasi butuh proteksi, perlu
  ▎  ditambahkan policy berbasis auth.uid().
                                                                                
  ---             
  Catatan & Potensi Masalah
                                                                                
  1. Duplikasi fungsi — calculate_menu_prices dan calculate_non_coffee_price
  masing-masing punya 3 versi overloaded. Perlu dibersihkan agar tidak ambigu.  
  2. update_book_stock trigger — referensi tabel/kolom yang tidak ada
  (book_stock_movements, product_type, book_id). Trigger ini tidak terpasang di 
  tabel manapun saat ini.
  3. Stok ingredient tidak otomatis berkurang saat transaksi menu kopi terjadi —
   belum ada trigger untuk current_stock_grams.                                 
  4. RLS terlalu permisif — semua akses public, cocok untuk MVP/lokal tapi perlu
   diperketat untuk produksi.      