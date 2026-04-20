let isEditMode = false;
let currentId  = null;

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(1);

  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  if (id) {
    isEditMode = true;
    currentId  = id;
    document.getElementById('page-title').textContent = 'Ubah Bean';
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
});

async function loadBeanData(id) {
  try {
    const bean = await api.getIngredient(id);
    document.getElementById('bean-name').value      = bean.name || '';
    document.getElementById('bean-category').value  = bean.category || 'espresso_bean';
    document.getElementById('bean-price').value     = bean.purchase_price
      ? 'Rp ' + formatNumber(bean.purchase_price) : '';
    document.getElementById('bean-pack-size').value  = bean.pack_size_grams || 200;
    document.getElementById('bean-stock').value      = bean.current_stock_grams || 0;
    document.getElementById('bean-active').checked   = bean.is_active !== false;
  } catch (e) {
    console.error('Gagal load bean:', e);
    alert('Bean tidak ditemukan');
    window.location.href = 'katalog.html';
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
    const stock    = parseInt(document.getElementById('bean-stock').value)    || 0;

    if (!name) { alert('Nama bean tidak boleh kosong'); return; }
    if (packSize < 1) { alert('Ukuran pack harus lebih dari 0'); return; }

    const isActive = document.getElementById('bean-active').checked;

    const data = {
      name,
      category,
      purchase_price:      price,
      pack_size_grams:     packSize,
      current_stock_grams: stock,
      is_active:           isActive,
    };

    if (isEditMode && currentId) {
      await api.updateIngredient(currentId, data);
    } else {
      await api.createIngredient(data);
    }

    window.location.href = 'katalog.html';
  } catch (e) {
    console.error('Gagal simpan bean:', e);
    alert('Gagal menyimpan. Coba lagi.\n' + (e.message || ''));
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Simpan';
  }
}

async function deleteBean() {
  closeModal(document.getElementById('delete-confirmation-modal'));
  try {
    await api.deleteIngredient(currentId);
    window.location.href = 'katalog.html';
  } catch (e) {
    console.error('Gagal hapus bean:', e);
    alert('Gagal menghapus. Pastikan bean tidak sedang dipakai di resep menu.');
  }
}
