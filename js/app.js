/**
 * app.js
 * EVENT HANDLING & INIT — menghubungkan Data Layer, Business Logic,
 * dan UI Layer. Ini satu-satunya modul yang memasang event listener
 * tingkat aplikasi (form submit, klik navigasi, dll).
 */

(() => {
  let pendingDeleteId = null;
  let currentSearchKeyword = '';
  let currentFilters = { room: 'all', condition: 'all' };
  let currentPhotoDataUrl = null; // foto kondisi barang yang sedang disiapkan di form

  /** Mengambil data terbaru sesuai kombinasi search + filter, lalu render. */
  function refreshInventoryView() {
    try {
      let items = currentSearchKeyword
        ? InventoryService.searchInventory(currentSearchKeyword)
        : InventoryService.getAll();
      items = InventoryService.applyFilters(items, currentFilters);
      UI.renderInventoryList(items);
    } catch (error) {
      Utils.logError('app.refreshInventoryView', error);
      Utils.showToast('Terjadi kesalahan saat memuat daftar inventaris.', 'error');
    }
  }

  /** Menghitung ulang statistik dan render ke dashboard. */
  function refreshDashboard() {
    try {
      const stats = InventoryService.calculateStatistics();
      UI.renderStatistics(stats);
    } catch (error) {
      Utils.logError('app.refreshDashboard', error);
    }
  }

  /** Memuat ulang opsi ruangan pada filter & datalist form. */
  function refreshRoomOptions() {
    try {
      const rooms = InventoryService.getRoomOptions();
      UI.renderRoomOptions(rooms);
    } catch (error) {
      Utils.logError('app.refreshRoomOptions', error);
    }
  }

  /** Memanggil ulang semua bagian yang bergantung pada data (dipanggil setelah CRUD). */
  function refreshAll() {
    refreshDashboard();
    refreshInventoryView();
    refreshRoomOptions();
  }

  /** Navigasi antar-view (tidak mereset form — caller bertanggung jawab atas isi form). */
  function goToView(viewName) {
    UI.switchView(viewName);
    if (window.innerWidth <= 768) UI.toggleSidebar(false);
  }

  /** Menangani submit form tambah/edit. */
  function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('form-submit-btn');
    if (submitBtn.disabled) return; // cegah double-submit
    submitBtn.disabled = true;

    const id = document.getElementById('field-id').value;
    const payload = {
      namaBarang: document.getElementById('field-nama').value,
      kodeInventaris: document.getElementById('field-kode').value,
      ruangan: document.getElementById('field-ruangan').value,
      jumlah: document.getElementById('field-jumlah').value,
      kondisi: document.getElementById('field-kondisi').value,
      foto: currentPhotoDataUrl,
    };

    try {
      const result = id
        ? InventoryService.updateInventory(id, payload)
        : InventoryService.addInventory(payload);

      if (!result.success) {
        UI.showFormErrors(result.errors || {});
        return;
      }

      UI.clearFormErrors();
      Utils.showToast(id ? 'Data berhasil diperbarui.' : 'Barang berhasil ditambahkan.', 'success');
      currentPhotoDataUrl = null;
      UI.fillForm(null);
      refreshAll();
      goToView('inventory');
    } catch (error) {
      Utils.logError('app.handleFormSubmit', error);
      Utils.showToast('Terjadi kesalahan tak terduga. Silakan coba lagi.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  /** Masuk ke mode edit untuk item tertentu. */
  function handleEditRequest(id) {
    const item = InventoryService.getById(id);
    if (!item) {
      Utils.showToast('Data tidak ditemukan. Mungkin sudah dihapus.', 'error');
      refreshAll();
      return;
    }
    currentPhotoDataUrl = item.foto || null;
    UI.fillForm(item);
    goToView('add');
  }

  /** Membuka modal konfirmasi hapus. */
  function handleDeleteRequest(id, name) {
    pendingDeleteId = id;
    UI.showConfirmModal(name);
  }

  /** Eksekusi hapus setelah konfirmasi "Ya". */
  function confirmDelete() {
    if (!pendingDeleteId) {
      UI.hideConfirmModal();
      return;
    }
    try {
      const result = InventoryService.deleteInventory(pendingDeleteId);
      if (!result.success) {
        Utils.showToast(result.errors?.general || 'Gagal menghapus data.', 'error');
      } else {
        Utils.showToast('Data berhasil dihapus.', 'success');
      }
      refreshAll();
    } catch (error) {
      Utils.logError('app.confirmDelete', error);
      Utils.showToast('Terjadi kesalahan saat menghapus data.', 'error');
    } finally {
      pendingDeleteId = null;
      UI.hideConfirmModal();
    }
  }

  /** Toggle tema light/dark dan simpan preferensi. */
  function handleThemeToggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    UI.applyTheme(next);
    StorageService.saveTheme(next);
  }

  /** Export data inventaris menjadi file JSON yang diunduh. */
  function handleExport() {
    try {
      const exportObj = InventoryService.exportData();
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `data-sivera-tanggal-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Utils.showToast('Data berhasil diekspor.', 'success');
    } catch (error) {
      Utils.logError('app.handleExport', error);
      Utils.showToast('Gagal mengekspor data.', 'error');
    }
  }

  /** Membaca file JSON yang dipilih pengguna lalu mengimpornya. */
  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = ''; // reset agar file yang sama bisa dipilih lagi
    if (!file) return;

    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      Utils.showToast('File harus berformat JSON.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const result = InventoryService.importData(parsed, 'merge');
        if (!result.success) {
          Utils.showToast(result.error || 'Import gagal.', 'error');
          return;
        }
        Utils.showToast(`Berhasil mengimpor ${result.imported} data.`, 'success');
        refreshAll();
      } catch (error) {
        Utils.logError('app.handleImportFile', error);
        Utils.showToast('File tidak dapat dibaca. Pastikan format JSON valid.', 'error');
      }
    };
    reader.onerror = () => {
      Utils.showToast('Gagal membaca file.', 'error');
    };
    reader.readAsText(file);
  }

  /** Memproses satu file gambar terpilih: validasi, kompres, lalu tampilkan pratinjau. */
  function processPhotoFile(file) {
    if (!file) return;

    if (!Utils.isImageFile(file)) {
      Utils.showToast('File harus berupa gambar (JPG/PNG).', 'error');
      return;
    }

    const MAX_SOURCE_SIZE = 15 * 1024 * 1024; // 15MB batas file asli sebelum dikompres
    if (file.size > MAX_SOURCE_SIZE) {
      Utils.showToast('Ukuran file terlalu besar (maks 15MB).', 'error');
      return;
    }

    Utils.compressImageToDataUrl(file, { maxDimension: 900, quality: 0.72 })
      .then((dataUrl) => {
        currentPhotoDataUrl = dataUrl;
        UI.showPhotoPreview(dataUrl);
      })
      .catch((error) => {
        Utils.logError('app.processPhotoFile', error);
        Utils.showToast('Gagal memproses gambar. Coba file lain.', 'error');
      });
  }

  /** Memasang seluruh interaksi kotak unggah foto kondisi barang. */
  function bindPhotoUpload() {
    const dropzone = document.getElementById('photo-dropzone');
    const fileInput = document.getElementById('field-foto');
    const removeBtn = document.getElementById('photo-remove-btn');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      processPhotoFile(file);
    });

    ['dragenter', 'dragover'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      processPhotoFile(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentPhotoDataUrl = null;
        UI.clearPhotoPreview();
      });
    }
  }

  /** Memasang seluruh event listener aplikasi. */
  function bindEvents() {
    // Navigasi sidebar & bottom nav
    document.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;
        // Reset form ke mode "tambah" HANYA saat masuk lewat menu navigasi
        // (bukan saat dipanggil dari alur edit, yang sudah mengisi form sendiri).
        if (viewName === 'add') {
          currentPhotoDataUrl = null;
          UI.fillForm(null);
        }
        goToView(viewName);
      });
    });

    // Toggle sidebar mobile
    document.getElementById('sidebar-toggle').addEventListener('click', () => UI.toggleSidebar());
    document.getElementById('sidebar-overlay').addEventListener('click', () => UI.toggleSidebar(false));

    // Tema
    document.getElementById('theme-toggle').addEventListener('click', handleThemeToggle);

    // Form tambah/edit
    document.getElementById('inventory-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('form-cancel-btn').addEventListener('click', () => {
      currentPhotoDataUrl = null;
      UI.fillForm(null);
      goToView('inventory');
    });

    // Foto kondisi barang
    bindPhotoUpload();

    // Pencarian (debounced agar tidak memfilter di setiap ketukan)
    const debouncedSearch = Utils.debounce((value) => {
      currentSearchKeyword = value;
      refreshInventoryView();
    }, 200);
    document.getElementById('search-input').addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    // Filter ruangan & kondisi
    document.getElementById('filter-room').addEventListener('change', (e) => {
      currentFilters.room = e.target.value;
      refreshInventoryView();
    });
    document.getElementById('filter-condition').addEventListener('change', (e) => {
      currentFilters.condition = e.target.value;
      refreshInventoryView();
    });

    // Modal konfirmasi hapus
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const confirmBackdrop = document.getElementById('confirm-backdrop');
    
    if (confirmOkBtn) {
      confirmOkBtn.addEventListener('click', confirmDelete);
    }
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', () => {
        pendingDeleteId = null;
        UI.hideConfirmModal();
      });
    }
    if (confirmBackdrop) {
      confirmBackdrop.addEventListener('click', () => {
        pendingDeleteId = null;
        UI.hideConfirmModal();
      });
    }

    // Export / Import
    document.getElementById('export-btn').addEventListener('click', handleExport);
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', handleImportFile);

    // Hooks UI -> business logic (dipicu dari tombol dalam card yang dirender dinamis)
    UI.setHooks({
      onEdit: handleEditRequest,
      onDeleteRequest: handleDeleteRequest,
    });
  }

  /** Mendaftarkan service worker untuk kemampuan PWA (offline & installable). */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((error) => {
          Utils.logError('app.registerServiceWorker', error);
        });
      });
    }
  }

  /** Inisialisasi aplikasi saat DOM siap. */
  function init() {
    // Terapkan tema tersimpan sedini mungkin agar tidak "berkedip".
    UI.applyTheme(StorageService.getTheme());

    if (!StorageService.isAvailable()) {
      Utils.showToast(
        'Penyimpanan lokal tidak tersedia di perangkat ini. Data tidak akan tersimpan.',
        'warning',
        5000
      );
    }

    bindEvents();
    refreshAll();
    UI.switchView('dashboard');
    registerServiceWorker();

    // Splash screen otomatis hilang & mengarahkan ke dashboard.
    UI.hideSplashScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
