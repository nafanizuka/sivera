/**
 * effects.js
 * File TERPISAH untuk efek visual kecil (spotlight cursor tracking pada
 * kartu). Murni tambahan tampilan — tidak menyentuh logika bisnis,
 * struktur DOM, maupun file app.js/ui.js/inventory.js/storage.js.
 * Aman dihapus tanpa mempengaruhi fungsi aplikasi.
 */

(function initSpotlightEffect() {
  const SPOTLIGHT_SELECTOR =
    '.stat-card, .inventory-card, .chart-card, .form, .modal__box';

  function handleMouseMove(event) {
    const target = event.target.closest ? event.target.closest(SPOTLIGHT_SELECTOR) : null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    target.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
})();
