/**
 * splash.js
 * File TERPISAH khusus untuk logika Splash Screen (tidak dicampur ke
 * ui.js / app.js) supaya splash bisa diubah independen dari app shell.
 *
 * Diekspos sebagai window.SplashScreen agar ui.js cukup memanggil
 * SplashScreen.hide() tanpa perlu tahu detail implementasinya.
 */

const SplashScreen = (() => {
  // Total durasi sebelum elemen splash benar-benar dibuang dari DOM.
  // Harus >= (animation-delay + animation-duration) fadeOut di splash.css.
  const REMOVE_DELAY_MS = 2400;

  function hide() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');

    if (app) app.hidden = false;

    if (splash) {
      // splash.css sudah punya animasi fade-out sendiri (splashFadeOut).
      // Di sini kita hanya menunggu animasi selesai lalu membersihkan DOM.
      setTimeout(() => splash.remove(), REMOVE_DELAY_MS);
    }
  }

  return { hide };
})();
