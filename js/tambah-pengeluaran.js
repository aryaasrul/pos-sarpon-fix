let __expItems    = [{ name: '', price: 0 }];
let __expSisaSaldo = 0;

async function __tambahPengeluaranSetup() {
  __expItems     = [{ name: '', price: 0 }];
  __expSisaSaldo = 0;

  document.getElementById('btn-back-tambah-pengeluaran')?.addEventListener('click', () => {
    window.__router?.goTo('riwayat') || (window.location.href = 'riwayat.html');
  });

  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) tanggalInput.value = formatDateForInput(new Date());

  try {
    const result = await api.getBalance();
    __expSisaSaldo = result.balance;
    const el = document.getElementById('sisa-saldo');
    if (el) el.textContent = formatCurrency(__expSisaSaldo);
  } catch (e) {
    console.error('Gagal ambil saldo:', e);
  }

  setupExpItemListeners(document.querySelector('.expense-item'), 0);
  document.getElementById('btn-add-item')?.addEventListener('click', addExpItem);
  document.getElementById('btn-simpan')?.addEventListener('click', saveExpense);
}

window.__tambahPengeluaranInit = __tambahPengeluaranSetup;

if (!window.__SPA_MODE) {
  document.addEventListener('DOMContentLoaded', async function () {
    setupNavbar(2);
    await __tambahPengeluaranSetup();
  });
}

function setupExpItemListeners(el, index) {
  if (!el) return;
  el.querySelector('.item-input')?.addEventListener('input', function () {
    __expItems[index].name = this.value;
  });
  el.querySelector('.price-input')?.addEventListener('input', function () {
    formatRupiah(this);
    __expItems[index].price = parseRupiah(this.value);
    updateExpTotals();
  });
}

function addExpItem() {
  const index = __expItems.length;
  __expItems.push({ name: '', price: 0 });

  const newEl = document.createElement('div');
  newEl.className = 'expense-item';
  newEl.innerHTML = `
    <div class="item-row">
      <div class="item-name">
        <span>${index + 1}x</span>
        <input type="text" class="item-input" placeholder="Nama Item">
      </div>
      <div class="item-price">
        <input type="text" class="price-input" placeholder="Rp 0" inputmode="numeric">
      </div>
    </div>
  `;

  document.getElementById('expense-items')?.appendChild(newEl);
  setupExpItemListeners(newEl, index);
  newEl.querySelector('.item-input')?.focus();
}

function updateExpTotals() {
  const total   = __expItems.reduce((s, i) => s + i.price, 0);
  const totalEl = document.getElementById('total-pengeluaran');
  const sisaEl  = document.getElementById('sisa-saldo');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (sisaEl)  sisaEl.textContent  = formatCurrency(__expSisaSaldo - total);
}

async function saveExpense() {
  const tanggal = document.getElementById('tanggal')?.value;
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu'); return; }

  const validItems = __expItems.filter(i => i.name.trim() !== '' && i.price > 0);
  if (!validItems.length) { showToast('Masukkan setidaknya satu item pengeluaran'); return; }

  const total = validItems.reduce((s, i) => s + i.price, 0);
  if (total > __expSisaSaldo) { showToast('Total pengeluaran melebihi saldo yang tersedia'); return; }

  const btn = document.getElementById('btn-simpan');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  try {
    const groupId = 'exp_' + Date.now();
    const dateISO = new Date(tanggal + 'T00:00:00').toISOString();
    const data = validItems.map(item => ({
      name:       item.name.trim(),
      amount:     item.price,
      group_id:   groupId,
      created_at: dateISO,
    }));

    await api.createExpenses(data);
    showToast('Pengeluaran berhasil disimpan!');
    setTimeout(() => {
      window.__router?.goTo('riwayat') || (window.location.href = 'riwayat.html');
    }, 900);
  } catch (e) {
    console.error('Error simpan pengeluaran:', e);
    showToast('Gagal menyimpan pengeluaran. Coba lagi.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Simpan';
  }
}
