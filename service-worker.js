/**
 * service-worker.js
 * Strategi: Network First untuk app shell (HTML/CSS/JS) agar setiap
 * perbaikan/update kode LANGSUNG terlihat oleh pengguna, dengan fallback
 * ke cache saat offline. Cache First hanya dipakai untuk aset statis
 * yang jarang berubah (ikon).
 *
 * CATATAN PENTING: sebelumnya strategi cache-first dipakai untuk SEMUA
 * file, termasuk .js. Ini menyebabkan perubahan/perbaikan kode (mis.
 * perbaikan tombol Edit) tidak muncul di perangkat yang sudah pernah
 * membuka app, karena browser terus memakai file JS versi lama dari
 * cache walau server sudah punya versi baru. Selalu naikkan CACHE_NAME
 * setiap kali deploy versi baru agar cache lama dibuang otomatis.
 */

const CACHE_NAME = 'sivera-cache-v6';

const NETWORK_FIRST_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/splash.css',
  '/js/splash.js',
  '/js/effects.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/inventory.js',
  '/js/ui.js',
  '/js/app.js',
];

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './splash.css',
  './manifest.json',
  './js/splash.js',
  './js/effects.js',
  './js/utils.js',
  './js/storage.js',
  './js/inventory.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180-apple.png',
];

// INSTALL: cache seluruh app shell (sebagai fallback offline), lalu aktif langsung.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[ServiceWorker] Gagal cache app shell:', error);
      })
  );
});

// ACTIVATE: bersihkan cache versi lama & ambil alih tab yang sudah terbuka.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkFirstFile(pathname) {
  return NETWORK_FIRST_FILES.some((path) => pathname === path || pathname.endsWith(path));
}

// FETCH:
// - HTML/CSS/JS (app shell) -> Network First: selalu coba ambil versi
//   terbaru dari server dulu, baru fallback ke cache kalau offline.
// - Aset lain (ikon, dsb) -> Cache First: hemat bandwidth, jarang berubah.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isNetworkFirstFile(url.pathname) || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => undefined);
    })
  );
});
