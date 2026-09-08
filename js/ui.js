/**
 * ui.js
 * UI RENDERING LAYER — bertanggung jawab merender data ke DOM.
 * Tidak berisi aturan bisnis (itu tugas InventoryService) dan tidak
 * memasang event listener interaktif (itu tugas app.js), kecuali
 * listener kecil yang lahir dari elemen yang baru dirender (mis.
 * tombol Edit/Hapus pada tiap card) — untuk itu UI menyediakan
 * "callback hook" yang diisi oleh app.js.
 */

const UI = (() => {
  const KONDISI_BADGE_CLASS = {
    Baik: 'badge--success',
    'Rusak Ringan': 'badge--warning',
    'Rusak Berat': 'badge--danger',
  };

  // Hooks yang di-set oleh app.js agar UI bisa memicu aksi tanpa
  // mengetahui detail business logic.
  const hooks = {
    onEdit: null,
    onDeleteRequest: null,
  };

  function setHooks({ onEdit, onDeleteRequest }) {
    hooks.onEdit = onEdit;
    hooks.onDeleteRequest = onDeleteRequest;
  }

  /** Menampilkan salah satu view (dashboard/inventory/add) dan menyembunyikan lainnya. */
  function switchView(viewName) {
    const views = ['dashboard', 'inventory', 'add'];
    views.forEach((name) => {
      const el = document.getElementById(`view-${name}`);
      if (el) el.hidden = name !== viewName;
    });

    document.querySelectorAll('.sidebar__link[data-view]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === viewName);
    });
    document.querySelectorAll('.bottom-nav__link[data-view]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === viewName);
    });
  }

  /** Merender kartu statistik dashboard. */
  function renderStatistics(stats) {
    document.getElementById('stat-total').textContent = Utils.formatNumber(stats.total);
    document.getElementById('stat-baik').textContent = Utils.formatNumber(stats.baik);
    document.getElementById('stat-rusak-ringan').textContent = Utils.formatNumber(stats.rusakRingan);
    document.getElementById('stat-rusak-berat').textContent = Utils.formatNumber(stats.rusakBerat);

    renderChart(stats);
  }

  /** Merender grafik batang sederhana (bonus: statistik visual) tanpa library eksternal. */
  function renderChart(stats) {
    const container = document.getElementById('stats-chart');
    if (!container) return;
    container.innerHTML = '';

    const max = Math.max(stats.baik, stats.rusakRingan, stats.rusakBerat, 1);
    const bars = [
      { label: 'Baik', value: stats.baik, color: 'var(--color-success)' },
      { label: 'Rusak Ringan', value: stats.rusakRingan, color: 'var(--color-warning)' },
      { label: 'Rusak Berat', value: stats.rusakBerat, color: 'var(--color-danger)' },
    ];

    bars.forEach((bar) => {
      const heightPct = Math.round((bar.value / max) * 100);
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-bar';

      const valueEl = document.createElement('span');
      valueEl.className = 'chart-bar__value';
      valueEl.textContent = Utils.formatNumber(bar.value);

      const fill = document.createElement('div');
      fill.className = 'chart-bar__fill';
      fill.style.height = `${Math.max(heightPct, 2)}%`;
      fill.style.background = bar.color;

      const label = document.createElement('span');
      label.className = 'chart-bar__label';
      label.textContent = bar.label;

      wrapper.appendChild(valueEl);
      wrapper.appendChild(fill);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
  }

  /** Membuat satu elemen card inventaris (aman dari XSS: pakai textContent). */
  function createInventoryCard(item) {
    const card = document.createElement('article');
    card.className = 'inventory-card';
    card.dataset.id = item.id;

    if (item.foto) {
      const photo = document.createElement('div');
      photo.className = 'inventory-card__photo';
      const img = document.createElement('img');
      img.src = item.foto;
      img.alt = `Foto kondisi ${item.namaBarang}`;
      img.loading = 'lazy';
      photo.appendChild(img);
      card.appendChild(photo);
    }

    const header = document.createElement('div');
    header.className = 'inventory-card__header';

    const nameBox = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'inventory-card__name';
    name.textContent = item.namaBarang;
    const code = document.createElement('div');
    code.className = 'inventory-card__code';
    code.textContent = item.kodeInventaris;
    nameBox.appendChild(name);
    nameBox.appendChild(code);

    const badge = document.createElement('span');
    badge.className = `badge ${KONDISI_BADGE_CLASS[item.kondisi] || ''}`;
    badge.textContent = item.kondisi;

    header.appendChild(nameBox);
    header.appendChild(badge);

    const meta = document.createElement('div');
    meta.className = 'inventory-card__meta';
    const roomLine = document.createElement('span');
    roomLine.textContent = `📍 ${item.ruangan}`;
    const qtyLine = document.createElement('span');
    qtyLine.textContent = `📦 Jumlah: ${Utils.formatNumber(item.jumlah)}`;
    meta.appendChild(roomLine);
    meta.appendChild(qtyLine);

    const actions = document.createElement('div');
    actions.className = 'inventory-card__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--ghost btn--sm';
    editBtn.textContent = '✏️ Edit';
    editBtn.addEventListener('click', () => {
      if (typeof hooks.onEdit === 'function') hooks.onEdit(item.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger btn--sm';
    deleteBtn.textContent = '🗑️ Hapus';
    deleteBtn.addEventListener('click', () => {
      if (typeof hooks.onDeleteRequest === 'function') hooks.onDeleteRequest(item.id, item.namaBarang);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);

    return card;
  }

  /** Merender seluruh daftar inventaris ke grid, menangani empty state. */
  function renderInventoryList(items) {
    const list = document.getElementById('inventory-list');
    const emptyState = document.getElementById('inventory-empty');
    list.innerHTML = '';

    if (!items || items.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(createInventoryCard(item)));
    list.appendChild(fragment);
  }

  /** Mengisi opsi dropdown/datalist ruangan. */
  function renderRoomOptions(rooms) {
    const filterSelect = document.getElementById('filter-room');
    const currentFilterValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">Semua Ruangan</option>';
    rooms.forEach((room) => {
      const opt = document.createElement('option');
      opt.value = room;
      opt.textContent = room;
      filterSelect.appendChild(opt);
    });
    if (rooms.includes(currentFilterValue)) filterSelect.value = currentFilterValue;

    const datalist = document.getElementById('room-options');
    datalist.innerHTML = '';
    rooms.forEach((room) => {
      const opt = document.createElement('option');
      opt.value = room;
      datalist.appendChild(opt);
    });
  }

  /** Reset seluruh pesan error pada form. */
  function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach((el) => { el.textContent = ''; });
    document.querySelectorAll('.form-group').forEach((el) => el.classList.remove('has-error'));
  }

  /** Menampilkan error validasi pada field terkait. */
  function showFormErrors(errors) {
    clearFormErrors();
    const fieldMap = {
      namaBarang: 'error-nama',
      kodeInventaris: 'error-kode',
      ruangan: 'error-ruangan',
      jumlah: 'error-jumlah',
      kondisi: 'error-kondisi',
    };
    Object.entries(errors).forEach(([field, message]) => {
      const errorEl = document.getElementById(fieldMap[field]);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.closest('.form-group')?.classList.add('has-error');
      } else if (field === 'general') {
        Utils.showToast(message, 'error');
      }
    });
  }

  /** Mengisi form dengan data item (mode edit) atau mengosongkannya (mode tambah). */
  function fillForm(item) {
    document.getElementById('field-id').value = item ? item.id : '';
    document.getElementById('field-nama').value = item ? item.namaBarang : '';
    document.getElementById('field-kode').value = item ? item.kodeInventaris : '';
    document.getElementById('field-ruangan').value = item ? item.ruangan : '';
    document.getElementById('field-jumlah').value = item ? item.jumlah : '';
    document.getElementById('field-kondisi').value = item ? item.kondisi : '';

    if (item && item.foto) {
      showPhotoPreview(item.foto);
    } else {
      clearPhotoPreview();
    }

    document.getElementById('form-title').textContent = item ? 'Edit Inventaris' : 'Tambah Inventaris';
    document.getElementById('form-submit-btn').textContent = item ? 'Simpan Perubahan' : 'Simpan';
    clearFormErrors();
  }

  /** Menampilkan pratinjau foto kondisi barang pada form (mode preview aktif). */
  function showPhotoPreview(dataUrl) {
    const preview = document.getElementById('photo-preview');
    const previewImg = document.getElementById('photo-preview-img');
    const placeholder = document.getElementById('photo-placeholder');
    if (!preview || !previewImg || !placeholder) return;

    previewImg.src = dataUrl;
    preview.hidden = false;
    placeholder.hidden = true;
  }

  /** Mengosongkan pratinjau foto & mengembalikan ke tampilan placeholder. */
  function clearPhotoPreview() {
    const fileInput = document.getElementById('field-foto');
    const preview = document.getElementById('photo-preview');
    const previewImg = document.getElementById('photo-preview-img');
    const placeholder = document.getElementById('photo-placeholder');

    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    if (preview) preview.hidden = true;
    if (placeholder) placeholder.hidden = false;
  }

  /** Menampilkan modal konfirmasi hapus dengan nama barang. */
  function showConfirmModal(itemName) {
    const modal = document.getElementById('confirm-modal');
    const desc = document.getElementById('confirm-desc');
    if (desc) desc.textContent = `Barang "${itemName}" akan dihapus secara permanen.`;
    if (modal) modal.hidden = false;
  }

  function hideConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.hidden = true;
  }

  /** Menerapkan tema (light/dark) ke root document. */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleSidebar(forceOpen) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('sidebar-toggle');
    const shouldOpen = forceOpen !== undefined ? forceOpen : !sidebar.classList.contains('is-open');

    sidebar.classList.toggle('is-open', shouldOpen);
    overlay.hidden = !shouldOpen;
    menuBtn.setAttribute('aria-expanded', String(shouldOpen));
  }

  function hideSplashScreen() {
    // Implementasi asli splash sekarang ada di file terpisah js/splash.js
    // (window.SplashScreen) agar tidak bercampur dengan kode UI aplikasi.
    if (typeof SplashScreen !== 'undefined') {
      SplashScreen.hide();
      return;
    }
    // Fallback jika js/splash.js gagal dimuat.
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    if (app) app.hidden = false;
    if (splash) splash.remove();
  }

  return {
    setHooks,
    switchView,
    renderStatistics,
    renderInventoryList,
    renderRoomOptions,
    clearFormErrors,
    showFormErrors,
    fillForm,
    showPhotoPreview,
    clearPhotoPreview,
    showConfirmModal,
    hideConfirmModal,
    applyTheme,
    toggleSidebar,
    hideSplashScreen,
  };
})();
