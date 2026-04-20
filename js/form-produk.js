let isEditMode     = false;
let currentId      = null;
let isBookMode     = false;
let ingredients    = [];
let recipeRows     = []; // { ingredient_id, quantity_grams }

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(1);

  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  isBookMode   = params.get('type') === 'book';

  // Tampilkan/sembunyikan section sesuai mode
  document.getElementById('menu-fields')?.style && (document.getElementById('menu-fields').style.display = isBookMode ? 'none' : 'block');
  document.getElementById('book-fields')?.style  && (document.getElementById('book-fields').style.display  = isBookMode ? 'block' : 'none');
  document.querySelector('.header h1').textContent = isBookMode ? (id ? 'Ubah Buku' : 'Tambah Buku') : (id ? 'Ubah Menu' : 'Tambah Menu');

  if (!isBookMode) {
    ingredients = await loadIngredients();
    document.getElementById('kategori')?.addEventListener('change', onCategoryChange);
  }

  if (id) {
    isEditMode = true;
    currentId  = id;
    document.getElementById('btn-hapus').style.display = '';
    isBookMode ? await loadBookData(id) : await loadMenuData(id);
  } else {
    document.getElementById('btn-hapus').style.display = 'none';
    if (!isBookMode) initRecipeSection();
  }

  document.getElementById('btn-add-recipe')?.addEventListener('click', addRecipeRow);
  document.getElementById('btn-simpan')?.addEventListener('click', saveProduk);

  const deleteModal = document.getElementById('delete-confirmation-modal');
  document.getElementById('btn-hapus')?.addEventListener('click', () => openModal(deleteModal));
  document.getElementById('btn-cancel-delete')?.addEventListener('click', () => closeModal(deleteModal));
  document.getElementById('btn-confirm-delete')?.addEventListener('click', deleteProduk);
  setupModalClose(deleteModal);

  setupRupiahInputs();
});

// ─── LOAD DATA ────────────────────────────────────────────────

async function loadIngredients() {
  try {
    return await api.getIngredients();
  } catch {
    return [];
  }
}

async function loadMenuData(id) {
  try {
    const item = await api.getMenuItem(id);

    document.getElementById('nama-produk').value = item.name || '';
    document.getElementById('kategori').value    = item.category || 'espresso_based';
    document.getElementById('is-active').checked = item.is_active !== false;
    document.getElementById('fixed-cost').value  = item.fixed_cost
      ? 'Rp ' + formatNumber(item.fixed_cost) : '';
    document.getElementById('profit-margin').value = item.profit_margin != null
      ? Math.round(item.profit_margin * 100) : 30;
    document.getElementById('rounding-up').value   = item.rounding_up || 1000;

    onCategoryChange();

    recipeRows = (item.recipe_ingredients || []).map(r => ({
      ingredient_id:  r.ingredient.id,
      quantity_grams: r.quantity_grams,
    }));
    renderRecipeRows();
  } catch (e) {
    console.error('Gagal load menu:', e);
    alert('Menu tidak ditemukan');
    window.location.href = 'katalog.html';
  }
}

async function loadBookData(id) {
  try {
    const book = await api.getBook(id);
    document.getElementById('book-title').value    = book.title || '';
    document.getElementById('book-author').value   = book.author || '';
    document.getElementById('book-isbn').value     = book.isbn || '';
    document.getElementById('book-purchase').value = book.purchase_price
      ? 'Rp ' + formatNumber(book.purchase_price) : '';
    document.getElementById('book-selling').value  = book.selling_price
      ? 'Rp ' + formatNumber(book.selling_price) : '';
    document.getElementById('book-stock').value    = book.stock_quantity || 0;
    document.getElementById('book-description').value = book.description || '';
  } catch (e) {
    console.error('Gagal load buku:', e);
    alert('Buku tidak ditemukan');
    window.location.href = 'katalog.html';
  }
}

// ─── KATEGORI & RESEP ──────────────────────────────────────────

function onCategoryChange() {
  const cat     = document.getElementById('kategori')?.value;
  const section = document.getElementById('recipe-section');
  if (section) section.style.display = isCoffeeCategory(cat) ? 'block' : 'none';
}

function initRecipeSection() {
  onCategoryChange();
  recipeRows = [];
  renderRecipeRows();
}

function addRecipeRow() {
  recipeRows.push({ ingredient_id: ingredients[0]?.id || null, quantity_grams: 0 });
  renderRecipeRows();
}

function renderRecipeRows() {
  const container = document.getElementById('recipe-list');
  if (!container) return;
  container.innerHTML = '';

  const activeIngredients = ingredients.filter(i => i.is_active !== false);

  recipeRows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'recipe-row';
    div.innerHTML = `
      <select class="recipe-ingredient-select">
        ${activeIngredients.map(i => `<option value="${i.id}" ${i.id === row.ingredient_id ? 'selected' : ''}>${i.name}</option>`).join('')}
      </select>
      <input type="number" class="recipe-qty-input" placeholder="gram" min="0" step="0.1" value="${row.quantity_grams || ''}">
      <button class="btn-remove-recipe" type="button" aria-label="Hapus">×</button>
    `;

    div.querySelector('.recipe-ingredient-select').addEventListener('change', function () {
      recipeRows[idx].ingredient_id = Number(this.value);
    });
    div.querySelector('.recipe-qty-input').addEventListener('input', function () {
      recipeRows[idx].quantity_grams = parseFloat(this.value) || 0;
    });
    div.querySelector('.btn-remove-recipe').addEventListener('click', () => {
      recipeRows.splice(idx, 1);
      renderRecipeRows();
    });

    container.appendChild(div);
  });
}

// ─── INPUT HELPERS ────────────────────────────────────────────

function setupRupiahInputs() {
  ['fixed-cost', 'book-purchase', 'book-selling'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { formatRupiah(this); });
  });
}

// ─── SIMPAN ───────────────────────────────────────────────────

async function saveProduk() {
  const btn = document.getElementById('btn-simpan');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    if (isBookMode) {
      await saveBook();
    } else {
      await saveMenuItem();
    }
    window.location.href = 'katalog.html';
  } catch (e) {
    console.error('Gagal simpan:', e);
    alert('Gagal menyimpan. Coba lagi.\n' + (e.message || ''));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

async function saveMenuItem() {
  const name     = document.getElementById('nama-produk').value.trim();
  const category = document.getElementById('kategori').value;
  const isActive = document.getElementById('is-active').checked;
  const fixedCost  = parseRupiah(document.getElementById('fixed-cost').value);
  const marginPct  = parseFloat(document.getElementById('profit-margin').value) || 30;
  const roundingUp = parseInt(document.getElementById('rounding-up').value) || 1000;

  if (!name) { alert('Nama menu tidak boleh kosong'); return; }

  const validRecipe = isCoffeeCategory(category)
    ? recipeRows.filter(r => r.ingredient_id && r.quantity_grams > 0)
    : [];

  const menuData = {
    name, category,
    is_active:      isActive,
    fixed_cost:     fixedCost,
    profit_margin:  marginPct / 100,
    rounding_up:    roundingUp,
    recipe_ingredients: validRecipe,
  };

  if (isEditMode && currentId) {
    await api.updateMenuItem(currentId, menuData);
  } else {
    await api.createMenuItem(menuData);
  }
}

async function saveBook() {
  const title    = document.getElementById('book-title').value.trim();
  const purchase = parseRupiah(document.getElementById('book-purchase').value);
  const selling  = parseRupiah(document.getElementById('book-selling').value);
  const stock    = parseInt(document.getElementById('book-stock').value) || 0;

  if (!title)       { alert('Judul buku tidak boleh kosong'); return; }
  if (selling <= 0) { alert('Harga jual harus diisi'); return; }

  const bookData = {
    title,
    author:         document.getElementById('book-author').value.trim() || null,
    isbn:           document.getElementById('book-isbn').value.trim() || null,
    purchase_price: purchase,
    selling_price:  selling,
    stock_quantity: stock,
    description:    document.getElementById('book-description').value.trim() || null,
  };

  if (isEditMode && currentId) {
    await api.updateBook(currentId, bookData);
  } else {
    await api.createBook(bookData);
  }
}

// ─── HAPUS ────────────────────────────────────────────────────

async function deleteProduk() {
  closeModal(document.getElementById('delete-confirmation-modal'));
  try {
    if (isBookMode) {
      await api.deleteBook(currentId);
    } else {
      await api.deleteMenuItem(currentId);
    }
    window.location.href = 'katalog.html';
  } catch (e) {
    console.error('Gagal hapus:', e);
    alert('Gagal menghapus. Coba lagi.');
  }
}
