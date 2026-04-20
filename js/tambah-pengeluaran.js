let items     = [{ name: '', price: 0 }];
let sisaSaldo = 0;

document.addEventListener('DOMContentLoaded', async function () {
  setupNavbar(2);

  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) tanggalInput.value = formatDateForInput(new Date());

  try {
    sisaSaldo = await api.getBalance();
    const el = document.getElementById('sisa-saldo');
    if (el) el.textContent = formatCurrency(sisaSaldo);
  } catch (e) {
    console.error('Gagal ambil saldo:', e);
  }

  setupItemListeners(document.querySelector('.expense-item'), 0);
  document.getElementById('btn-add-item')?.addEventListener('click', addNewItem);
  document.getElementById('btn-simpan')?.addEventListener('click', saveExpense);
});

function setupItemListeners(el, index) {
  if (!el) return;
  el.querySelector('.item-input')?.addEventListener('input', function () {
    items[index].name = this.value;
  });
  el.querySelector('.price-input')?.addEventListener('input', function () {
    formatRupiah(this);
    items[index].price = parseRupiah(this.value);
    updateTotals();
  });
}

function addNewItem() {
  const index = items.length;
  items.push({ name: '', price: 0 });

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
  setupItemListeners(newEl, index);
  newEl.querySelector('.item-input')?.focus();
}

function updateTotals() {
  const total = items.reduce((s, i) => s + i.price, 0);
  const totalEl = document.getElementById('total-pengeluaran');
  const sisaEl  = document.getElementById('sisa-saldo');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (sisaEl)  sisaEl.textContent  = formatCurrency(sisaSaldo - total);
}

async function saveExpense() {
  const tanggal = document.getElementById('tanggal')?.value;
  if (!tanggal) { alert('Pilih tanggal terlebih dahulu'); return; }

  const validItems = items.filter(i => i.name.trim() !== '' && i.price > 0);
  if (!validItems.length) { alert('Masukkan setidaknya satu item pengeluaran'); return; }

  const total = validItems.reduce((s, i) => s + i.price, 0);
  if (total > sisaSaldo) { alert('Total pengeluaran melebihi saldo yang tersedia'); return; }

  const btn = document.getElementById('btn-simpan');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    const groupId  = 'exp_' + Date.now();
    const dateISO  = new Date(tanggal + 'T00:00:00').toISOString();
    const data = validItems.map(item => ({
      name:       item.name.trim(),
      amount:     item.price,
      group_id:   groupId,
      created_at: dateISO,
    }));

    await api.createExpenses(data);
    alert('Pengeluaran berhasil disimpan!');
    window.location.href = 'riwayat.html';
  } catch (e) {
    console.error('Error simpan pengeluaran:', e);
    alert('Gagal menyimpan pengeluaran. Coba lagi.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}
