let allProducts = [];
let products    = [];
let cart        = [];

const PRODUCTS_CACHE_KEY = 'kasir_products_v1';
const PRODUCTS_CACHE_TTL = 3 * 60 * 1000; // 3 menit

function getCachedProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > PRODUCTS_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedProducts(data) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* storage penuh, abaikan */ }
}

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(0);

  document.querySelector('.btn-input-manual')
    ?.addEventListener('click', () => window.location.href = 'input-manual.html');

  document.querySelector('.search-bar input')
    ?.addEventListener('input', handleSearch);

  document.getElementById('btn-process')
    ?.addEventListener('click', processOrder);

  // Bean picker modal
  const beanModal = document.getElementById('bean-picker-modal');
  document.getElementById('btn-close-bean')
    ?.addEventListener('click', () => closeModal(beanModal));
  beanModal?.addEventListener('click', e => {
    if (e.target === beanModal) closeModal(beanModal);
  });

  await init();
});

async function init(forceRefresh = false) {
  // Tampilkan dari cache dulu agar halaman cepat muncul
  if (!forceRefresh) {
    const cached = getCachedProducts();
    if (cached) {
      allProducts = cached;
      products    = allProducts;
      renderCategories(extractUniqueCategories(allProducts));
      renderProducts(products);
      // Refresh di background tanpa blokir UI
      fetchAndUpdateProducts();
      return;
    }
  }

  showProductsLoading();
  await fetchAndUpdateProducts();
}

async function fetchAndUpdateProducts() {
  try {
    const [menuItems, books] = await Promise.all([
      api.getMenuItems(),
      api.getBooks(),
    ]);
    allProducts = [
      ...menuItems.map(m => ({ ...m, _type: 'menu' })),
      ...books.filter(b => b.stock_quantity > 0).map(b => ({ ...b, _type: 'book' })),
    ];
    setCachedProducts(allProducts);
  } catch (e) {
    console.error('Gagal memuat produk:', e);
    if (allProducts.length === 0) {
      showProductsError();
      products = [];
      return;
    }
    // Ada cache lama → tetap tampilkan, beri tahu user
    showToast('Gagal memperbarui data. Menampilkan data sebelumnya.');
    return;
  }
  products = allProducts;
  renderCategories(extractUniqueCategories(allProducts));
  renderProducts(products);
}

function showProductsLoading() {
  const el = document.querySelector('.product-list');
  if (el) el.innerHTML = '<p class="loading-state">Memuat produk...</p>';
  const cats = document.querySelector('.categories');
  if (cats) cats.innerHTML = '';
}

function showProductsError() {
  const el = document.querySelector('.product-list');
  if (!el) return;
  el.innerHTML = `
    <div class="error-state">
      <p>Gagal memuat produk. Periksa koneksi.</p>
      <button id="retry-produk">Coba Lagi</button>
    </div>
  `;
  document.getElementById('retry-produk')?.addEventListener('click', init);
}

// ─── RENDER ───────────────────────────────────────────────────

function renderCategories(categories) {
  const el = document.querySelector('.categories');
  if (!el) return;
  el.innerHTML = '';
  categories.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'category' + (i === 0 ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterByCategory(cat);
    });
    el.appendChild(btn);
  });
}

function renderProducts(list) {
  const el = document.querySelector('.product-list');
  if (!el) return;
  el.innerHTML = '';
  if (!list || list.length === 0) {
    el.innerHTML = '<p class="empty-state">Tidak ada produk tersedia.</p>';
    return;
  }
  list.forEach(p => el.appendChild(createProductCard(p)));
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const isBook = product._type === 'book';
  const name   = isBook ? product.title : product.name;

  const qty = cart
    .filter(i => i.id === product.id && i._type === product._type)
    .reduce((s, i) => s + i.quantity, 0);

  card.innerHTML = `
    <div class="product-info">
      <div class="product-image"></div>
      <div class="product-details">
        <h3>${name}</h3>
        <p>${isBook ? formatCurrency(Number(product.selling_price)) : formatPriceDisplay(product)}</p>
        ${isBook ? `<span class="stock-badge">Stok: ${product.stock_quantity}</span>` : ''}
      </div>
    </div>
    <div class="quantity-control">
      <button class="btn-minus" aria-label="Kurang">
        <img src="icons/icon-minus-circle.svg" alt="−">
      </button>
      <span id="qty-${product._type}-${product.id}">${qty}</span>
      <button class="btn-plus" aria-label="Tambah">
        <img src="icons/icon-plus-circle.svg" alt="+">
      </button>
    </div>
  `;

  card.querySelector('.btn-plus').addEventListener('click',  () => handleAdd(product));
  card.querySelector('.btn-minus').addEventListener('click', () => handleRemove(product));
  return card;
}

function formatPriceDisplay(menuItem) {
  const recipe = (menuItem.recipe_ingredients || []).filter(r => r.ingredient?.is_active !== false);
  if (!isCoffeeCategory(menuItem.category) || recipe.length === 0) {
    return formatCurrency(api.calcMenuPrice(menuItem).sell);
  }
  const prices = recipe.map(r => api.calcMenuPrice(menuItem, r.ingredient, r.quantity_grams).sell);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

// ─── ADD / REMOVE ─────────────────────────────────────────────

function handleAdd(product) {
  if (product._type === 'book') {
    addBookToCart(product);
    return;
  }

  const recipe = (product.recipe_ingredients || []).filter(r => r.ingredient?.is_active !== false);

  if (!isCoffeeCategory(product.category) || recipe.length === 0) {
    const { hpp, sell } = api.calcMenuPrice(product);
    addToCart({ _type: 'menu', id: product.id, name: product.name,
      ingredientId: null, ingredientName: null, recipeQty: 0, unitPrice: sell, hpp });
    updateQtyDisplay(product);
    return;
  }

  if (recipe.length === 1) {
    const r = recipe[0];
    const { hpp, sell } = api.calcMenuPrice(product, r.ingredient, r.quantity_grams);
    addToCart({ _type: 'menu', id: product.id, name: product.name,
      ingredientId: r.ingredient.id, ingredientName: r.ingredient.name,
      recipeQty: r.quantity_grams, unitPrice: sell, hpp });
    updateQtyDisplay(product);
    return;
  }

  // Multiple active beans → bottom sheet picker
  openBeanPicker(product);
}

function handleRemove(product) {
  const idx = cart.findIndex(i => i.id === product.id && i._type === product._type);
  if (idx === -1) return;
  cart[idx].quantity -= 1;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  updateQtyDisplay(product);
  updateTotal();
}

function addBookToCart(book) {
  const existing = cart.find(i => i.id === book.id && i._type === 'book');
  if (existing && existing.quantity >= book.stock_quantity) {
    showToast('Stok buku tidak mencukupi');
    return;
  }
  addToCart({ _type: 'book', id: book.id, name: book.title,
    ingredientId: null, ingredientName: null, recipeQty: 0,
    unitPrice: Number(book.selling_price), hpp: Number(book.purchase_price),
    maxStock: book.stock_quantity });
  updateQtyDisplay(book);
}

function addToCart(item) {
  const existing = cart.find(i =>
    i.id === item.id && i._type === item._type && i.ingredientId === item.ingredientId
  );
  if (existing) { existing.quantity += 1; }
  else          { cart.push({ ...item, quantity: 1 }); }
  updateTotal();
}

// ─── BEAN PICKER MODAL ────────────────────────────────────────

function openBeanPicker(product) {
  const modal = document.getElementById('bean-picker-modal');
  const title = document.getElementById('bean-picker-title');
  const body  = document.getElementById('bean-picker-body');
  if (!modal || !body) return;

  title.textContent = product.name;
  body.innerHTML = '';

  product.recipe_ingredients
    .filter(r => r.ingredient?.is_active !== false)
    .forEach(r => {
      const { sell, hpp } = api.calcMenuPrice(product, r.ingredient, r.quantity_grams);
      const btn = document.createElement('button');
      btn.className = 'bean-picker-item';
      btn.innerHTML = `
        <span class="bean-picker-name">${r.ingredient.name}</span>
        <span class="bean-picker-price">${formatCurrency(sell)}</span>
      `;
      btn.addEventListener('click', () => {
        addToCart({ _type: 'menu', id: product.id, name: product.name,
          ingredientId: r.ingredient.id, ingredientName: r.ingredient.name,
          recipeQty: r.quantity_grams, unitPrice: sell, hpp });
        updateQtyDisplay(product);
        closeModal(modal);
      });
      body.appendChild(btn);
    });

  openModal(modal);
}

// ─── DISPLAY HELPERS ──────────────────────────────────────────

function updateQtyDisplay(product) {
  const span = document.getElementById(`qty-${product._type}-${product.id}`);
  if (span) {
    span.textContent = cart
      .filter(i => i.id === product.id && i._type === product._type)
      .reduce((s, i) => s + i.quantity, 0);
  }
  updateTotal();
}

function updateTotal() {
  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const el = document.getElementById('total-amount');
  if (el) el.textContent = formatCurrency(total);
}

// ─── SEARCH & FILTER ──────────────────────────────────────────

function handleSearch() {
  const term = document.querySelector('.search-bar input').value.toLowerCase().trim();
  products = term
    ? allProducts.filter(p => (p._type === 'book' ? p.title : p.name).toLowerCase().includes(term))
    : allProducts;
  renderProducts(products);
}

function filterByCategory(cat) {
  if (cat === 'Semua Produk')  products = allProducts;
  else if (cat === 'Buku')     products = allProducts.filter(p => p._type === 'book');
  else products = allProducts.filter(p => p._type === 'menu' && getCategoryLabel(p.category) === cat);
  renderProducts(products);
}

// ─── PROSES PESANAN ───────────────────────────────────────────

async function processOrder() {
  if (cart.length === 0) { showToast('Keranjang kosong!'); return; }

  const btn = document.getElementById('btn-process');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  const totalAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalProfit = cart.reduce((s, i) => s + (i.unitPrice - i.hpp) * i.quantity, 0);

  const txData  = { total_amount: totalAmount, total_profit: totalProfit, payment_method: 'cash' };
  const txItems = cart.map(item => ({
    item_type:       item._type,
    item_id:         item.id,
    item_name:       item.name,
    ingredient_name: item.ingredientName || null,
    quantity:        item.quantity,
    unit_price:      item.unitPrice,
    total_price:     item.unitPrice * item.quantity,
    hpp:             item.hpp,
    profit_per_item: item.unitPrice - item.hpp,
  }));

  try {
    await api.createTransaction(txData, txItems);
  } catch (e) {
    console.error('Gagal simpan transaksi:', e);
    showToast('Gagal menyimpan pesanan. Coba lagi.');
    btn.disabled    = false;
    btn.textContent = 'Proses Pesanan';
    return;
  }

  // Transaksi berhasil – update stok (best-effort, tidak batalkan transaksi)
  const stockErrors = [];
  await Promise.all(cart.map(async item => {
    try {
      if (item._type === 'book') {
        await api.decrementBookStock(item.id, item.quantity);
      } else if (item.ingredientId && item.recipeQty > 0) {
        await api.updateIngredientStock(item.ingredientId, item.quantity * item.recipeQty);
      }
    } catch (e) {
      console.error(`Gagal update stok ${item.name}:`, e);
      stockErrors.push(item.name);
    }
  }));

  if (stockErrors.length > 0) {
    showToast(`Pesanan disimpan. Gagal update stok: ${stockErrors.join(', ')}`);
  } else {
    showToast('Pesanan berhasil disimpan!');
  }

  cart = [];
  btn.disabled    = false;
  btn.textContent = 'Proses Pesanan';
  localStorage.removeItem(PRODUCTS_CACHE_KEY); // invalidate cache setelah transaksi
  await init(true);
  updateTotal();
}

// ─── TOAST ────────────────────────────────────────────────────

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
