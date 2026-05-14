let __beanEditMode = false;
let __beanCurrentId = null;

async function __formBeanSetup() {
  __beanEditMode  = false;
  __beanCurrentId = null;

  const params = window.__SPA_MODE
    ? (window.__routeParams || {})
    : Object.fromEntries(new URLSearchParams(window.location.search));

  const id = params.id || null;

  document.getElementById('btn-back-form-bean')?.addEventListener('click', () => {
    window.__router.goTo('katalog');
  });

  if (id) {
    __beanEditMode  = true;
    __beanCurrentId = id;
    document.getElementById('page-title').textContent  = 'Ubah Bean';
    document.getElementById('btn-hapus').style.display = '';
    await loadBeanData(id);
  }

  document.getElementById('bean-price')?.addEventListener('input', function () {
    formatRupiah(this);
  });

  document.getElementById('btn-simpan')?.addEventListener('click', saveBean);

  const deleteModal = document.getElementById('delete-confirmation-modal');
  document.getElementById('btn-hapus')?.addEventListener('click', () => openModal(deleteModal));
  document.getElementById('btn-cancel-delete')?.addEventListener('click', () => closeModal(deleteModal));
  document.getElementById('btn-confirm-delete')?.addEventListener('click', deleteBean);
  setupModalClose(deleteModal);
}

window.__formBeanInit = __formBeanSetup;

if (!window.__SPA_MODE) {
  document.addEventListener('DOMContentLoaded', async function () {
    setupNavbar(1);
    await __formBeanSetup();
  });
}

async function loadBeanData(id) {
  try {
    const bean = await api.getIngredient(id);
    document.getElementById('bean-name').value     = bean.name || '';
    document.getElementById('bean-category').value = bean.category || 'espresso_bean';
    document.getElementById('bean-price').value    = bean.purchase_price
      ? 'Rp ' + formatNumber(bean.purchase_price) : '';
    document.getElementById('bean-pack-size').value = bean.pack_size_grams || 200;
    document.getElementById('bean-stock').value     = bean.current_stock_grams || 0;
    document.getElementById('bean-active').checked  = bean.is_active !== false;
  } catch (e) {
    console.error('Gagal load bean:', e);
    showToast('Bean tidak ditemukan');
    setTimeout(() => window.__router?.goTo('katalog') || (window.location.href = 'katalog.html'), 1200);
  }
}

async function saveBean() {
  const btn = document.getElementById('btn-simpan');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  try {
    const name     = document.getElementById('bean-name').value.trim();
    const category = document.getElementById('bean-category').value;
    const price    = parseRupiah(document.getElementById('bean-price').value);
    const packSize = parseInt(document.getElementById('bean-pack-size').value) || 200;
    const stock    = parseInt(document.getElementById('bean-stock').value)     || 0;

    if (!name)        { showToast('Nama bean tidak boleh kosong'); return; }
    if (packSize < 1) { showToast('Ukuran pack harus lebih dari 0'); return; }

    const isActive = document.getElementById('bean-active').checked;

    const data = {
      name,
      category,
      purchase_price:      price,
      pack_size_grams:     packSize,
      current_stock_grams: stock,
      is_active:           isActive,
    };

    if (__beanEditMode && __beanCurrentId) {
      await api.updateIngredient(__beanCurrentId, data);
    } else {
      await api.createIngredient(data);
    }

    window.__router?.goTo('katalog') || (window.location.href = 'katalog.html');
  } catch (e) {
    console.error('Gagal simpan bean:', e);
    showToast('Gagal menyimpan. Coba lagi.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Simpan';
  }
}

async function deleteBean() {
  closeModal(document.getElementById('delete-confirmation-modal'));
  try {
    await api.deleteIngredient(__beanCurrentId);
    window.__router?.goTo('katalog') || (window.location.href = 'katalog.html');
  } catch (e) {
    console.error('Gagal hapus bean:', e);
    showToast('Gagal menghapus. Pastikan bean tidak sedang dipakai di resep menu.');
  }
}
