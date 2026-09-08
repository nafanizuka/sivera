# SIVERA — Sistem Inventaris Ruangan

PWA (Progressive Web App) untuk mencatat, mengelola, mencari, dan memantau
kondisi inventaris barang berdasarkan ruangan. Dibuat oleh **The Next
Horizon**.

## Cara Menjalankan

Aplikasi ini murni HTML/CSS/JavaScript (vanilla, tanpa framework, tanpa
backend) sehingga cukup dijalankan lewat **static web server** apa saja.
Service Worker & fitur PWA (termasuk mode offline) hanya berfungsi jika
diakses lewat `http://` atau `https://` — **tidak** bisa dibuka langsung
dari `file://`.

Contoh cara termudah (butuh Python, biasanya sudah tersedia):

```bash
cd sivera
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` di browser.

Alternatif lain: `npx serve`, ekstensi "Live Server" di VS Code, atau
upload ke static hosting mana pun (Netlify, Vercel, GitHub Pages, dll).

## Cara Menjalankan Test

```bash
cd sivera
node tests/script.test.js
```

Test mencakup: validasi input, tambah/edit/hapus data, pencarian,
perhitungan statistik, duplikasi kode inventaris, data kosong, dan data
corrupt — dijalankan tanpa framework/dependency eksternal.

## Struktur Folder

```
sivera/
├── index.html          # Shell aplikasi (splash, dashboard, list, form) — satu halaman
├── style.css            # Semua styling, termasuk dark mode via CSS variables
├── manifest.json        # Web App Manifest (agar bisa di-install)
├── service-worker.js    # Caching app shell untuk mode offline
├── js/
│   ├── utils.js          # Helper umum (id, sanitasi, debounce, toast, dll)
│   ├── storage.js         # DATA LAYER — satu-satunya yang menyentuh LocalStorage
│   ├── inventory.js       # BUSINESS LOGIC — validasi, CRUD, search, statistik
│   ├── ui.js              # UI LAYER — rendering DOM
│   └── app.js             # EVENT HANDLING & init — menghubungkan semua layer
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── tests/
    └── script.test.js    # Test tanpa dependency eksternal (jalan via Node)
```

## Fitur MVP (sesuai PRD v1.0)

- Splash screen dengan identitas SIVERA & The Next Horizon
- Dashboard ringkasan (total barang, baik, rusak ringan, rusak berat)
- Tambah / edit / hapus inventaris (dengan konfirmasi hapus)
- Validasi form lengkap, termasuk cegah kode inventaris duplikat
- Pencarian nama barang / kode inventaris (case-insensitive, real-time)
- Penyimpanan LocalStorage (key: `sivera_inventory`)
- Responsive: sidebar di desktop, bottom navigation di mobile
- PWA: bisa di-install ke home screen, bekerja offline (Service Worker)

## Fitur Bonus yang Sudah Termasuk

- Filter berdasarkan ruangan & kondisi
- Dark mode (preferensi tersimpan di LocalStorage)
- Export data ke file JSON
- Import data dari file JSON (mode merge, menolak kode duplikat & format
  tidak valid)
- Grafik statistik sederhana (bar chart) di dashboard

## Catatan Teknis

- Data hanya tersimpan di browser (LocalStorage) perangkat yang
  digunakan — belum ada sinkronisasi antar perangkat (lihat PRD bagian
  Roadmap V2 untuk rencana backend, database, dan multi-user).
- Kode disusun dengan prinsip Separation of Concerns: data layer, business
  logic, UI rendering, dan event handling dipisah ke file masing-masing
  agar mudah dites dan dikembangkan lebih lanjut.
