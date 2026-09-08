/**
 * storage.js
 * DATA LAYER — satu-satunya modul yang boleh menyentuh LocalStorage
 * secara langsung. Modul lain WAJIB melalui fungsi-fungsi di sini.
 *
 * Key LocalStorage: sivera_inventory
 * Struktur data (array of object):
 * [
 *   {
 *     "id": "INV-001",
 *     "namaBarang": "Laptop",
 *     "kodeInventaris": "LAB-001",
 *     "ruangan": "Lab Komputer",
 *     "jumlah": 20,
 *     "kondisi": "Baik"
 *   }
 * ]
 */

const StorageService = (() => {
  const STORAGE_KEY = 'sivera_inventory';
  const THEME_KEY = 'sivera_theme';
  const KONDISI_VALID = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

  /**
   * Mengecek ketersediaan LocalStorage pada browser.
   * Beberapa browser (mode private ketat / storage penuh) bisa
   * melempar error saat localStorage diakses.
   */
  function isAvailable() {
    try {
      const testKey = '__sivera_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validasi struktur satu item inventaris (dipakai saat membaca
   * data mentah dari LocalStorage/Import, untuk menyaring data corrupt).
   */
  function isValidItemShape(item) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string' || !item.id) return false;
    if (typeof item.namaBarang !== 'string' || !item.namaBarang) return false;
    if (typeof item.kodeInventaris !== 'string' || !item.kodeInventaris) return false;
    if (typeof item.ruangan !== 'string' || !item.ruangan) return false;
    if (typeof item.jumlah !== 'number' || !Number.isInteger(item.jumlah) || item.jumlah < 1) return false;
    if (!KONDISI_VALID.includes(item.kondisi)) return false;
    if ('foto' in item && item.foto !== null && typeof item.foto !== 'string') return false;
    return true;
  }

  /**
   * Mengambil seluruh data inventaris dari LocalStorage.
   * Jika data tidak ada, kosong, atau corrupt (bukan JSON valid /
   * bukan array / item tidak sesuai struktur), fungsi ini akan
   * mengembalikan array kosong secara aman TANPA menghentikan aplikasi.
   */
  function getInventories() {
    if (!isAvailable()) {
      Utils.logError('storage.getInventories', 'LocalStorage tidak tersedia');
      return [];
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        Utils.logError('storage.getInventories', 'Data corrupt: bukan array');
        return [];
      }
      // Saring item yang tidak valid agar data corrupt sebagian
      // tidak menghentikan seluruh aplikasi.
      const validItems = parsed.filter((item) => isValidItemShape(item));
      if (validItems.length !== parsed.length) {
        Utils.logError('storage.getInventories', 'Sebagian data corrupt telah disaring');
      }
      return validItems;
    } catch (error) {
      Utils.logError('storage.getInventories', error);
      return [];
    }
  }

  /**
   * Menyimpan seluruh array inventaris ke LocalStorage.
   * Mengembalikan true jika berhasil, false jika gagal (mis. quota penuh).
   */
  function saveInventories(items) {
    if (!isAvailable()) {
      Utils.logError('storage.saveInventories', 'LocalStorage tidak tersedia');
      return false;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (error) {
      Utils.logError('storage.saveInventories', error);
      return false;
    }
  }

  /**
   * Mengambil preferensi tema (light/dark) dari LocalStorage.
   */
  function getTheme() {
    if (!isAvailable()) return 'dark';
    try {
      return window.localStorage.getItem(THEME_KEY) || 'dark';
    } catch (error) {
      Utils.logError('storage.getTheme', error);
      return 'dark';
    }
  }

  /**
   * Menyimpan preferensi tema.
   */
  function saveTheme(theme) {
    if (!isAvailable()) return false;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
      return true;
    } catch (error) {
      Utils.logError('storage.saveTheme', error);
      return false;
    }
  }

  return {
    STORAGE_KEY,
    KONDISI_VALID,
    isAvailable,
    isValidItemShape,
    getInventories,
    saveInventories,
    getTheme,
    saveTheme,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
