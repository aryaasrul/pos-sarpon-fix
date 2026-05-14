function __inputManualSetup() {
  document.getElementById('btn-back-input-manual')?.addEventListener('click', () => {
    window.__router?.goTo('kasir') || (window.location.href = 'index.html');
  });

  document.getElementById('nama-produk')?.addEventListener('input', function () {
    const el = document.getElementById('nama-produk-count');
    if (el) el.textContent = this.value.length;
  });

  document.getElementById('harga-jual')?.addEventListener('input', function () {
    formatRupiah(this);
    const el = document.getElementById('harga-jual-count');
    if (el) el.textContent = this.value.length;
  });

  document.getElementById('harga-hpp')?.addEventListener('input', function () {
    formatRupiah(this);
    const el = document.getElementById('harga-hpp-count');
    if (el) el.textContent = this.value.length;
  });

  document.getElementById('btn-selesai')?.addEventListener('click', prosesInputManual);
}

window.__inputManualInit = __inputManualSetup;

if (!window.__SPA_MODE) {
  document.addEventListener('DOMContentLoaded', function () {
    setupNavbar(0);
    __inputManualSetup();
  });
}

async function prosesInputManual() {
  const nama      = document.getElementById('nama-produk').value.trim();
  const hargaJual = parseRupiah(document.getElementById('harga-jual').value);
  const hargaHpp  = parseRupiah(document.getElementById('harga-hpp').value);

  if (!nama)          { showToast('Nama produk tidak boleh kosong'); return; }
  if (hargaJual <= 0) { showToast('Harga jual harus diisi dengan benar'); return; }
  if (hargaHpp  < 0)  { showToast('Harga HPP tidak valid'); return; }

  const btn = document.getElementById('btn-selesai');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  try {
    const profit = hargaJual - hargaHpp;
    await api.createTransaction(
      { total_amount: hargaJual, total_profit: profit, payment_method: 'cash' },
      [{
        item_type:       'menu',
        item_id:         0,
        item_name:       nama,
        ingredient_name: null,
        quantity:        1,
        unit_price:      hargaJual,
        total_price:     hargaJual,
        hpp:             hargaHpp,
        profit_per_item: profit,
      }]
    );

    showToast('Pesanan berhasil disimpan!');
    setTimeout(() => {
      window.__router?.goTo('kasir') || (window.location.href = 'index.html');
    }, 900);
  } catch (e) {
    console.error('Error simpan input manual:', e);
    showToast('Terjadi kesalahan saat menyimpan pesanan');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Selesai';
  }
}
