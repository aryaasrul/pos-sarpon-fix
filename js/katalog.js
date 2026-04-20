let allProducts = [];
let products    = [];
let allBeans    = [];
let stokBooks   = [];
let currentItem = null;
let currentTab  = 'produk';
let stokTarget  = null; // { book, mode: 'tambah'|'kurangi' }

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(1);

  // Tab switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('btn-tambah')?.addEventListener('click', () => {
    if (currentTab === 'beans') window.location.href = 'tambah-bean.html';
    else if (currentTab === 'stok') window.location.href = 'tambah-produk.html?type=book';
    else window.location.href = 'tambah-produk.html';
  });

  document.querySelector('.search-bar input')
    ?.addEventListener('input', handleSearch);

  // ─── Modal opsi produk/bean ────────────────────────────────
  const optionsModal = document.getElementById('product-options-modal');
  const deleteModal  = document.getElementById('delete-confirmation-modal');

  document.getElementById('btn-edit-product')?.addEventListener('click', () => {
    if (!currentItem) return;
    closeModal(optionsModal);
    if (currentItem._type === 'bean')       window.location.href = `tambah-bean.html?id=${currentItem.id}`;
    else if (currentItem._type === 'book')  window.location.href = `tambah-produk.html?type=book&id=${currentItem.id}`;
    else                                    window.location.href = `tambah-produk.html?id=${currentItem.id}`;
  });

  document.getElementById('btn-delete-product')?.addEventListener('click', () => {
    closeModal(optionsModal);
    openModal(deleteModal);
  });

  document.getElementById('btn-cancel-delete')?.addEventListener('click', () => closeModal(deleteModal));
  document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
    closeModal(deleteModal);
    if (currentItem) await deleteItem(currentItem);
  });

  [optionsModal, deleteModal].forEach(m => m && setupModalClose(m));

  // ─── Modal stok buku ───────────────────────────────────────
  const stokModal = document.getElementById('stok-modal');

  document.getElementById('btn-stok-cancel')?.addEventListener('click', () => closeModal(stokModal));
  setupModalClose(stokModal);

  document.getElementById('btn-stok-inc')?.addEventListener('click', () => {
    const inp = document.getElementById('stok-input');
    inp.value = (parseInt(inp.value) || 0) + 1;
  });
  document.getElementById('btn-stok-dec')?.addEventListener('click', () => {
    const inp = document.getElementById('stok-input');
    const v = (parseInt(inp.value) || 0) - 1;
    inp.value = v < 1 ? 1 : v;
  });

  document.getElementById('btn-stok-save')?.addEventListener('click', saveStok);

  await init();
});

// ─── TAB ──────────────────────────────────────────────────────

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  document.getElementById('section-produk').style.display = tab === 'produk' ? '' : 'none';
  document.getElementById('section-beans').style.display  = tab === 'beans'  ? '' : 'none';
  document.getElementById('section-stok').style.display   = tab === 'stok'   ? '' : 'none';

  const btn = document.getElementById('btn-tambah');
  if (tab === 'beans') {
    btn.innerHTML = '<img src="icons/Plus-square.svg" alt=""> Tambah Bean';
    btn.style.display = '';
    if (allBeans.length === 0) initBeans();
  } else if (tab === 'stok') {
    btn.innerHTML = '<img src="icons/icon-plus-input-manual.svg" alt=""> Tambah Buku';
    btn.style.display = '';
    if (stokBooks.length === 0) initStokBuku();
  } else {
    btn.innerHTML = '<img src="icons/icon-plus-input-manual.svg" alt=""> Tambah Produk';
    btn.style.display = '';
  }
}

// ─── INIT PRODUK ──────────────────────────────────────────────

async function init() {
  const listEl = document.querySelector('.product-list');
  if (listEl) listEl.innerHTML = '<p class="loading-state">Memuat produk...</p>';
  const catsEl = document.querySelector('.categories');
  if (catsEl) catsEl.innerHTML = '';

  try {
    const [menuItems, books] = await Promise.all([
      api.getAllMenuItems(),
      api.getBooks(),
    ]);
    allProducts = [
      ...menuItems.map(m => ({ ...m, _type: 'menu' })),
      ...books.map(b => ({ ...b, _type: 'book' })),
    ];
  } catch (e) {
    console.error('Gagal memuat produk:', e);
    if (listEl) {
      listEl.innerHTML = `
        <div class="error-state">
          <p>Gagal memuat produk. Periksa koneksi.</p>
          <button id="retry-katalog">Coba Lagi</button>
        </div>
      `;
      document.getElementById('retry-katalog')?.addEventListener('click', init);
    }
    allProducts = [];
    products = [];
    return;
  }
  products = allProducts;
  renderCategories(extractUniqueCategories(allProducts));
  renderProducts(products);
}

// ─── INIT BEANS ───────────────────────────────────────────────

async function initBeans() {
  const el = document.getElementById('beans-list');
  if (el) el.innerHTML = '<p class="loading-state">Memuat beans...</p>';
  try {
    allBeans = (await api.getIngredients()).map(b => ({ ...b, _type: 'bean' }));
  } catch (e) {
    console.error('Gagal memuat beans:', e);
    if (el) {
      el.innerHTML = `
        <div class="error-state">
          <p>Gagal memuat beans. Periksa koneksi.</p>
          <button id="retry-beans">Coba Lagi</button>
        </div>
      `;
      document.getElementById('retry-beans')?.addEventListener('click', initBeans);
    }
    allBeans = [];
    return;
  }
  renderBeans(allBeans);
}

// ─── INIT STOK BUKU ───────────────────────────────────────────

async function initStokBuku() {
  const el = document.getElementById('stok-list');
  if (el) el.innerHTML = '<p class="loading-state">Memuat...</p>';
  try {
    stokBooks = await api.getBooks();
  } catch (e) {
    console.error('Gagal memuat stok buku:', e);
    if (el) {
      el.innerHTML = `
        <div class="error-state">
          <p>Gagal memuat stok buku. Periksa koneksi.</p>
          <button id="retry-stok">Coba Lagi</button>
        </div>
      `;
      document.getElementById('retry-stok')?.addEventListener('click', initStokBuku);
    }
    stokBooks = [];
    return;
  }
  renderStokBuku(stokBooks);
}

// ─── RENDER PRODUK ────────────────────────────────────────────

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
  const price  = isBook
    ? formatCurrency(Number(product.selling_price))
    : formatPriceDisplay(product);

  const statusBadge = !isBook && !product.is_active
    ? '<span class="badge-inactive">Nonaktif</span>' : '';

  const meta = isBook
    ? `<span class="stock-badge">Stok: ${product.stock_quantity}</span>`
    : `<span class="category-badge">${getCategoryLabel(product.category)}</span>`;

  card.innerHTML = `
    <div class="product-info">
      <div class="product-image"></div>
      <div class="product-details">
        <h3>${name}${statusBadge}</h3>
        <p>${price}</p>
        ${meta}
      </div>
    </div>
    <button class="btn-options" aria-label="Opsi">
      <img src="icons/More-Square.svg" alt="Opsi">
    </button>
  `;
  card.querySelector('.btn-options').addEventListener('click', () => {
    currentItem = product;
    openModal(document.getElementById('product-options-modal'));
  });
  return card;
}

function formatPriceDisplay(menuItem) {
  const recipe = menuItem.recipe_ingredients || [];
  if (!isCoffeeCategory(menuItem.category) || recipe.length === 0) {
    return formatCurrency(api.calcMenuPrice(menuItem).sell);
  }
  const prices = recipe.map(r => api.calcMenuPrice(menuItem, r.ingredient, r.quantity_grams).sell);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

// ─── RENDER BEANS ─────────────────────────────────────────────

function renderBeans(list) {
  const el = document.getElementById('beans-list');
  if (!el) return;
  el.innerHTML = '';
  if (!list || list.length === 0) {
    el.innerHTML = '<p class="empty-state">Belum ada beans. Tambah beans terlebih dahulu.</p>';
    return;
  }

  const grouped = {};
  list.forEach(b => {
    const cat = b.category || 'other';
    (grouped[cat] = grouped[cat] || []).push(b);
  });

  ['espresso_bean', 'filter_bean', 'other'].forEach(cat => {
    if (!grouped[cat]?.length) return;
    const section = document.createElement('div');
    section.className = 'bean-section';
    section.innerHTML = `<h3 class="bean-section-title">${getBeanCategoryLabel(cat)}</h3>`;
    grouped[cat].forEach(b => section.appendChild(createBeanCard(b)));
    el.appendChild(section);
  });
}

function createBeanCard(bean) {
  const card = document.createElement('div');
  card.className = 'product-card';
  const inactiveBadge = bean.is_active === false
    ? '<span class="badge-inactive">Nonaktif</span>' : '';
  card.innerHTML = `
    <div class="product-info">
      <div class="product-image"></div>
      <div class="product-details">
        <h3>${bean.name}${inactiveBadge}</h3>
        <p>${formatCurrency(bean.purchase_price)} / ${bean.pack_size_grams}g</p>
        <span class="bean-category-badge">${getBeanCategoryLabel(bean.category)}</span>
        <span class="stock-badge">Stok: ${bean.current_stock_grams}g</span>
      </div>
    </div>
    <button class="btn-options" aria-label="Opsi">
      <img src="icons/More-Square.svg" alt="Opsi">
    </button>
  `;
  card.querySelector('.btn-options').addEventListener('click', () => {
    currentItem = bean;
    openModal(document.getElementById('product-options-modal'));
  });
  return card;
}

// ─── RENDER STOK BUKU ─────────────────────────────────────────

function renderStokBuku(list) {
  const el = document.getElementById('stok-list');
  if (!el) return;
  el.innerHTML = '';
  if (!list || list.length === 0) {
    el.innerHTML = '<p class="empty-state">Belum ada buku.</p>';
    return;
  }
  list.forEach(b => el.appendChild(createStokCard(b)));
}

function createStokCard(book) {
  const card = document.createElement('div');
  card.className = 'stok-card';
  card.innerHTML = `
    <div class="stok-card-left">
      <div class="product-image stok-book-img"></div>
      <div class="stok-card-info">
        <div class="stok-book-title">${book.title}</div>
        ${book.author ? `<div class="stok-book-author">${book.author}</div>` : ''}
        <div class="stok-book-prices">
          <span>Jual ${formatCurrency(book.selling_price)}</span>
          ${book.purchase_price > 0 ? `<span class="stok-price-sep">·</span><span>Beli ${formatCurrency(book.purchase_price)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="stok-card-right">
      <div class="stok-count-area">
        <div class="stok-count">${book.stock_quantity}</div>
        <div class="stok-count-label">buku</div>
      </div>
      <div class="stok-actions">
        <div class="stok-btn-group">
          <button class="stok-btn stok-btn-tambah" aria-label="Tambah stok">+</button>
          <button class="stok-btn stok-btn-kurangi" aria-label="Kurangi stok">−</button>
        </div>
        <button class="btn-options stok-edit-btn" aria-label="Edit buku">
          <img src="icons/More-Square.svg" alt="">
        </button>
      </div>
    </div>
  `;
  card.querySelector('.stok-btn-tambah').addEventListener('click', () => openStokModal(book, 'tambah'));
  card.querySelector('.stok-btn-kurangi').addEventListener('click', () => openStokModal(book, 'kurangi'));
  card.querySelector('.stok-edit-btn').addEventListener('click', () => {
    currentItem = { ...book, _type: 'book' };
    openModal(document.getElementById('product-options-modal'));
  });
  return card;
}

function openStokModal(book, mode) {
  stokTarget = { book, mode };

  const label = mode === 'tambah' ? 'Tambah Stok' : 'Kurangi Stok';
  document.getElementById('stok-modal-title').textContent   = label;
  document.getElementById('stok-modal-book').textContent    = book.title;
  document.getElementById('stok-modal-current').textContent = `Stok saat ini: ${book.stock_quantity} buku`;

  const inp = document.getElementById('stok-input');
  inp.value = 1;
  inp.min   = 1;

  document.getElementById('btn-stok-save').textContent = label;
  openModal(document.getElementById('stok-modal'));
  inp.focus();
}

async function saveStok() {
  if (!stokTarget) return;
  const { book, mode } = stokTarget;
  const delta = parseInt(document.getElementById('stok-input').value) || 0;
  if (delta < 1) { showToast('Masukkan jumlah yang valid'); return; }

  const newStock = mode === 'tambah'
    ? book.stock_quantity + delta
    : Math.max(0, book.stock_quantity - delta);

  const btn = document.getElementById('btn-stok-save');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  try {
    await api.updateBook(book.id, { stock_quantity: newStock });
    closeModal(document.getElementById('stok-modal'));
    stokBooks = [];
    await initStokBuku();
    // Refresh produk tab juga supaya stok di sana sinkron
    allProducts = [];
    await init();
    showToast(mode === 'tambah' ? `+${delta} stok ditambahkan` : `-${delta} stok dikurangi`);
  } catch (e) {
    console.error('Gagal ubah stok:', e);
    showToast('Gagal mengubah stok. Coba lagi.');
  } finally {
    btn.disabled = false;
  }
}

// ─── SEARCH & FILTER ──────────────────────────────────────────

function handleSearch() {
  const term = document.querySelector('.search-bar input').value.toLowerCase().trim();
  products = term
    ? allProducts.filter(p => {
        const name = p._type === 'book' ? p.title : p.name;
        return name.toLowerCase().includes(term);
      })
    : allProducts;
  renderProducts(products);
}

function filterByCategory(cat) {
  if (cat === 'Semua Produk')     products = allProducts;
  else if (cat === 'Buku')        products = allProducts.filter(p => p._type === 'book');
  else products = allProducts.filter(p => p._type === 'menu' && getCategoryLabel(p.category) === cat);
  renderProducts(products);
}

// ─── DELETE ───────────────────────────────────────────────────

async function deleteItem(item) {
  try {
    if (item._type === 'book') {
      await api.deleteBook(item.id);
      await init();
    } else if (item._type === 'bean') {
      await api.deleteIngredient(item.id);
      allBeans = [];
      await initBeans();
    } else {
      await api.deleteMenuItem(item.id);
      await init();
    }
    showToast('Berhasil dihapus');
  } catch (e) {
    console.error('Gagal hapus:', e);
    showToast('Gagal menghapus. Coba lagi.');
  }
}

