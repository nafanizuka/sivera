/**
 * inventory.js
 * BUSINESS LOGIC LAYER — validasi, aturan bisnis, dan operasi CRUD.
 * Modul ini memanggil StorageService untuk baca/tulis data, dan
 * TIDAK menyentuh DOM sama sekali (Separation of Concerns).
 */

const InventoryService = (() => {
  const KONDISI_OPTIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
  const ROOM_OPTIONS = ['Lab Komputer', 'Ruang Kelas', 'Perpustakaan', 'Ruang Guru'];

  /**
   * Validasi payload form tambah/edit inventaris.
   * Mengembalikan { valid: boolean, errors: { field: message } }
   */
  function validate(payload, { excludeId = null } = {}) {
    const errors = {};

    const namaBarang = Utils.normalizeWhitespace(payload.namaBarang);
    const kodeInventaris = Utils.normalizeWhitespace(payload.kodeInventaris);
    const ruangan = Utils.normalizeWhitespace(payload.ruangan);
    const jumlahRaw = payload.jumlah;
    const kondisi = payload.kondisi;

    if (!namaBarang) {
      errors.namaBarang = 'Nama barang wajib diisi.';
    }

    if (!kodeInventaris) {
      errors.kodeInventaris = 'Kode inventaris wajib diisi.';
    } else {
      const duplicate = getAll().find(
        (item) =>
          item.kodeInventaris.toLowerCase() === kodeInventaris.toLowerCase() &&
          item.id !== excludeId
      );
      if (duplicate) {
        errors.kodeInventaris = 'Kode inventaris sudah digunakan oleh barang lain.';
      }
    }

    if (!ruangan) {
      errors.ruangan = 'Nama ruangan wajib diisi.';
    }

    if (jumlahRaw === '' || jumlahRaw === null || jumlahRaw === undefined) {
      errors.jumlah = 'Jumlah wajib diisi.';
    } else if (!Utils.isPositiveInteger(jumlahRaw, 1)) {
      errors.jumlah = 'Jumlah harus berupa angka bulat, minimal 1.';
    }

    if (!kondisi || !KONDISI_OPTIONS.includes(kondisi)) {
      errors.kondisi = 'Kondisi barang wajib dipilih.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      normalized: {
        namaBarang,
        kodeInventaris,
        ruangan,
        jumlah: Number(jumlahRaw),
        kondisi,
      },
    };
  }

  /** Mengambil seluruh data inventaris. */
  function getAll() {
    return StorageService.getInventories();
  }

  /** Mengambil satu item berdasarkan ID. Mengembalikan null jika tidak ditemukan. */
  function getById(id) {
    return getAll().find((item) => item.id === id) || null;
  }

  /**
   * Menambahkan inventaris baru.
   * Mengembalikan { success, item?, errors? }
   */
  function addInventory(payload) {
    const result = validate(payload);
    if (!result.valid) {
      return { success: false, errors: result.errors };
    }

    const newItem = {
      id: Utils.generateId(),
      namaBarang: result.normalized.namaBarang,
      kodeInventaris: result.normalized.kodeInventaris,
      ruangan: result.normalized.ruangan,
      jumlah: result.normalized.jumlah,
      kondisi: result.normalized.kondisi,
      foto: typeof payload.foto === 'string' ? payload.foto : null,
    };

    const items = getAll();
    items.push(newItem);
    const saved = StorageService.saveInventories(items);

    if (!saved) {
      return { success: false, errors: { general: 'Gagal menyimpan data. Penyimpanan mungkin penuh.' } };
    }
    return { success: true, item: newItem };
  }

  /**
   * Memperbarui data inventaris berdasarkan ID.
   * Mengembalikan { success, item?, errors? }
   */
  function updateInventory(id, payload) {
    const items = getAll();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return { success: false, errors: { general: 'Data tidak ditemukan. Mungkin sudah dihapus.' } };
    }

    const result = validate(payload, { excludeId: id });
    if (!result.valid) {
      return { success: false, errors: result.errors };
    }

    items[index] = {
      ...items[index],
      namaBarang: result.normalized.namaBarang,
      kodeInventaris: result.normalized.kodeInventaris,
      ruangan: result.normalized.ruangan,
      jumlah: result.normalized.jumlah,
      kondisi: result.normalized.kondisi,
      foto: typeof payload.foto === 'string' ? payload.foto : null,
    };

    const saved = StorageService.saveInventories(items);
    if (!saved) {
      return { success: false, errors: { general: 'Gagal menyimpan perubahan.' } };
    }
    return { success: true, item: items[index] };
  }

  /**
   * Menghapus data inventaris berdasarkan ID.
   * Mengembalikan { success, errors? }
   */
  function deleteInventory(id) {
    const items = getAll();
    const exists = items.some((item) => item.id === id);
    if (!exists) {
      return { success: false, errors: { general: 'Data tidak ditemukan atau sudah terhapus.' } };
    }
    const filtered = items.filter((item) => item.id !== id);
    const saved = StorageService.saveInventories(filtered);
    if (!saved) {
      return { success: false, errors: { general: 'Gagal menghapus data.' } };
    }
    return { success: true };
  }

  /**
   * Mencari inventaris berdasarkan nama barang ATAU kode inventaris.
   * Case-insensitive, mengabaikan spasi berlebih pada kata kunci.
   */
  function searchInventory(keyword) {
    const items = getAll();
    const normalizedKeyword = Utils.normalizeWhitespace(keyword).toLowerCase();
    if (!normalizedKeyword) return items;

    return items.filter((item) => {
      const nama = item.namaBarang.toLowerCase();
      const kode = item.kodeInventaris.toLowerCase();
      return nama.includes(normalizedKeyword) || kode.includes(normalizedKeyword);
    });
  }

  /**
   * Menerapkan filter ruangan & kondisi pada sebuah list item.
   * room / condition bernilai 'all' berarti tidak difilter.
   */
  function applyFilters(items, { room = 'all', condition = 'all' } = {}) {
    return items.filter((item) => {
      const roomMatch = room === 'all' || item.ruangan === room;
      const conditionMatch = condition === 'all' || item.kondisi === condition;
      return roomMatch && conditionMatch;
    });
  }

  /**
   * Menghitung statistik inventaris untuk Dashboard.
   * Jika belum ada data, semua nilai bernilai 0.
   */
  function calculateStatistics() {
    const items = getAll();
    const stats = {
      total: 0,
      baik: 0,
      rusakRingan: 0,
      rusakBerat: 0,
    };

    items.forEach((item) => {
      const qty = Number(item.jumlah) || 0;
      stats.total += qty;
      if (item.kondisi === 'Baik') stats.baik += qty;
      else if (item.kondisi === 'Rusak Ringan') stats.rusakRingan += qty;
      else if (item.kondisi === 'Rusak Berat') stats.rusakBerat += qty;
    });

    return stats;
  }

  /** Mengambil daftar ruangan unik yang benar-benar ada di data + daftar default. */
  function getRoomOptions() {
    const dataRooms = getAll().map((item) => item.ruangan);
    const merged = Array.from(new Set([...ROOM_OPTIONS, ...dataRooms]));
    return merged;
  }

  /**
   * Mengekspor seluruh data menjadi objek siap di-JSON.stringify.
   */
  function exportData() {
    return {
      app: 'SIVERA',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: getAll(),
    };
  }

  /**
   * Mengimpor data dari objek hasil parse JSON.
   * Validasi ketat: format & struktur harus sesuai, item invalid ditolak.
   * mode: 'replace' (timpa semua data) | 'merge' (gabung, skip kode duplikat)
   */
  function importData(parsed, mode = 'replace') {
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.data)) {
      return { success: false, error: 'Format file tidak valid. File harus hasil export SIVERA.' };
    }

    const validItems = parsed.data.filter((item) => StorageService.isValidItemShape(item));
    if (validItems.length === 0) {
      return { success: false, error: 'Tidak ada data valid yang dapat diimpor.' };
    }

    let finalItems;
    if (mode === 'merge') {
      const existing = getAll();
      const existingCodes = new Set(existing.map((i) => i.kodeInventaris.toLowerCase()));
      const toAdd = validItems.filter((i) => !existingCodes.has(i.kodeInventaris.toLowerCase()));
      finalItems = [...existing, ...toAdd];
    } else {
      finalItems = validItems;
    }

    const saved = StorageService.saveInventories(finalItems);
    if (!saved) {
      return { success: false, error: 'Gagal menyimpan data hasil import.' };
    }
    return { success: true, imported: validItems.length, total: finalItems.length };
  }

  return {
    KONDISI_OPTIONS,
    ROOM_OPTIONS,
    validate,
    getAll,
    getById,
    addInventory,
    updateInventory,
    deleteInventory,
    searchInventory,
    applyFilters,
    calculateStatistics,
    getRoomOptions,
    exportData,
    importData,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryService;
}
