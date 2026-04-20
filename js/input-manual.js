document.addEventListener('DOMContentLoaded', function () {
  setupNavbar(0);

  const namaProdukInput = document.getElementById('nama-produk');
  const hargaJualInput  = document.getElementById('harga-jual');
  const hargaHppInput   = document.getElementById('harga-hpp');
  const namaProdukCount = document.getElementById('nama-produk-count');
  const hargaJualCount  = document.getElementById('harga-jual-count');
  const hargaHppCount   = document.getElementById('harga-hpp-count');
  const btnSelesai      = document.getElementById('btn-selesai');

  namaProdukInput?.addEventListener('input', function () {
    if (namaProdukCount) namaProdukCount.textContent = this.value.length;
  });

  hargaJualInput?.addEventListener('input', function () {
    formatRupiah(this);
    if (hargaJualCount) hargaJualCount.textContent = this.value.length;
  });

  hargaHppInput?.addEventListener('input', function () {
    formatRupiah(this);
    if (hargaHppCount) hargaHppCount.textContent = this.value.length;
  });

  btnSelesai?.addEventListener('click', prosesInputManual);
});

async function prosesInputManual() {
  const nama      = document.getElementById('nama-produk').value.trim();
  const hargaJual = parseRupiah(document.getElementById('harga-jual').value);
  const hargaHpp  = parseRupiah(document.getElementById('harga-hpp').value);

  if (!nama)          { alert('Nama produk tidak boleh kosong'); return; }
  if (hargaJual <= 0) { alert('Harga jual harus diisi dengan benar'); return; }
  if (hargaHpp  < 0)  { alert('Harga HPP tidak valid'); return; }

  const btn = document.getElementById('btn-selesai');
  btn.disabled = true;
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

    alert('Pesanan berhasil disimpan!');
    window.location.href = 'index.html';
  } catch (e) {
    console.error('Error simpan input manual:', e);
    alert('Terjadi kesalahan saat menyimpan pesanan');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Selesai';
  }
}
