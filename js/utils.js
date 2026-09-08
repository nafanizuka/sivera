/**
 * utils.js
 * Kumpulan fungsi utilitas/helper yang dipakai lintas modul.
 * Tidak boleh bergantung pada modul lain (kecuali DOM/browser API).
 */

const Utils = (() => {
  /**
   * Membuat ID unik dengan prefix "INV-".
   * Menggunakan timestamp + random agar aman dari duplikasi walau
   * beberapa data dibuat pada milidetik yang sama.
   */
  function generateId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000)
      .toString(36)
      .toUpperCase()
      .padStart(2, '0');
    return `INV-${timestamp}${random}`;
  }

  /**
   * Sanitasi string sederhana untuk mencegah HTML/script injection
   * ketika data pengguna dirender ke DOM (defense-in-depth, karena
   * kita juga menghindari innerHTML untuk data dinamis).
   */
  function sanitizeText(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  /**
   * Menghilangkan spasi berlebih di awal/akhir & merapikan spasi ganda
   * di tengah string. Dipakai untuk normalisasi input & pencarian.
   */
  function normalizeWhitespace(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/\s+/g, ' ');
  }

  /**
   * Debounce: menunda eksekusi fungsi hingga tidak ada pemanggilan
   * baru selama `delay` ms. Dipakai pada input pencarian agar tidak
   * memfilter data pada setiap ketukan tombol.
   */
  function debounce(fn, delay = 250) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Format angka jadi string dengan pemisah ribuan (locale id-ID).
   */
  function formatNumber(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '0';
    return n.toLocaleString('id-ID');
  }

  /**
   * Validasi apakah nilai adalah angka bulat positif (>= min).
   */
  function isPositiveInteger(value, min = 1) {
    if (value === '' || value === null || value === undefined) return false;
    const n = Number(value);
    return Number.isInteger(n) && n >= min;
  }

  /**
   * Menampilkan toast notification sederhana di pojok layar.
   * type: 'success' | 'error' | 'info' | 'warning'
   */
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
      // Fallback jika container belum ada di DOM
      console.warn('[Toast]', type, message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger animasi masuk
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Validasi sederhana apakah file adalah gambar berdasarkan MIME type.
   */
  function isImageFile(file) {
    return !!file && typeof file.type === 'string' && file.type.startsWith('image/');
  }

  /**
   * Membaca sebuah File gambar, mengecilkan dimensinya (jika perlu),
   * lalu mengembalikan Promise<string> berisi data URL (base64) hasil
   * kompresi JPEG. Tujuannya agar foto kondisi barang tidak membengkakkan
   * LocalStorage (yang punya kuota terbatas, umumnya ~5MB per origin).
   *
   * @param {File} file
   * @param {{ maxDimension?: number, quality?: number }} options
   * @returns {Promise<string>} data URL (contoh: "data:image/jpeg;base64,...")
   */
  function compressImageToDataUrl(file, { maxDimension = 900, quality = 0.72 } = {}) {
    return new Promise((resolve, reject) => {
      if (!isImageFile(file)) {
        reject(new Error('File yang dipilih bukan gambar.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('File gambar rusak atau tidak didukung.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (error) {
            reject(error);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Logging error terpusat untuk memudahkan tracing di MVP.
   * Pada V2 bisa diarahkan ke error tracking service.
   */
  function logError(context, error) {
    // eslint-disable-next-line no-console
    console.error(`[SIVERA][${context}]`, error);
  }

  return {
    generateId,
    sanitizeText,
    normalizeWhitespace,
    debounce,
    formatNumber,
    isPositiveInteger,
    isImageFile,
    compressImageToDataUrl,
    showToast,
    logError,
  };
})();

// Ekspor untuk lingkungan Node (dipakai oleh tests/script.test.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
