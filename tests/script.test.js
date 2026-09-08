/**
 * tests/script.test.js
 * Test sederhana tanpa dependency framework eksternal (sesuai PRD:
 * "jangan menggunakan dependency yang tidak diperlukan").
 * Jalankan dengan: node tests/script.test.js
 *
 * Mencakup: validasi input, tambah, edit, hapus, pencarian, statistik,
 * duplikasi kode inventaris, data kosong, data corrupt.
 */

// ---------------------------------------------------------------
// MOCK ENVIRONMENT (localStorage & document minimal) untuk Node.js
// ---------------------------------------------------------------
function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

global.window = global.window || {};
global.window.localStorage = createLocalStorageMock();

// Mock document.createElement hanya untuk keperluan Utils.sanitizeText.
global.document = {
  createElement: () => {
    let _text = '';
    return {
      set textContent(v) { _text = String(v); },
      get textContent() { return _text; },
      get innerHTML() {
        return _text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      },
    };
  },
};

// Modul ditulis sebagai script global (untuk dipakai lewat <script> tag di
// browser), sehingga saat di-require di Node kita perlu meletakkannya di
// `global` agar modul berikutnya (yang saling bergantung) dapat menemukannya.
const Utils = require('../js/utils.js');
global.Utils = Utils;

const StorageService = require('../js/storage.js');
global.StorageService = StorageService;

const InventoryService = require('../js/inventory.js');

// ---------------------------------------------------------------
// MINI TEST RUNNER
// ---------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    console.log(`  \u2717 ${name}`);
    console.log(`      ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function resetStorage() {
  global.window.localStorage.clear();
}

// ---------------------------------------------------------------
// TEST SUITES
// ---------------------------------------------------------------

console.log('\n=== Validasi Input ===');
resetStorage();
test('Menolak jika nama barang kosong', () => {
  const result = InventoryService.addInventory({
    namaBarang: '',
    kodeInventaris: 'LAB-100',
    ruangan: 'Lab Komputer',
    jumlah: 1,
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya gagal');
  assert(!!result.errors.namaBarang, 'Harus ada error pada namaBarang');
});

test('Menolak jika jumlah bukan angka', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Kursi',
    kodeInventaris: 'KLS-001',
    ruangan: 'Ruang Kelas',
    jumlah: 'abc',
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya gagal');
  assert(!!result.errors.jumlah, 'Harus ada error pada jumlah');
});

test('Menolak jika jumlah bernilai 0', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Kursi',
    kodeInventaris: 'KLS-002',
    ruangan: 'Ruang Kelas',
    jumlah: 0,
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya gagal karena jumlah 0');
});

test('Menolak jika kondisi tidak valid / kosong', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Meja',
    kodeInventaris: 'KLS-003',
    ruangan: 'Ruang Kelas',
    jumlah: 2,
    kondisi: '',
  });
  assert(!result.success, 'Seharusnya gagal karena kondisi kosong');
});

console.log('\n=== Tambah Data ===');
resetStorage();
test('Berhasil menambahkan data valid', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Laptop',
    kodeInventaris: 'LAB-001',
    ruangan: 'Lab Komputer',
    jumlah: 20,
    kondisi: 'Baik',
  });
  assert(result.success, 'Seharusnya berhasil');
  assert(!!result.item.id, 'Item harus punya id');
  assertEqual(InventoryService.getAll().length, 1, 'Total data harus 1');
});

console.log('\n=== Duplikasi Kode Inventaris ===');
test('Menolak kode inventaris duplikat', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Laptop 2',
    kodeInventaris: 'LAB-001', // sama dengan sebelumnya
    ruangan: 'Lab Komputer',
    jumlah: 5,
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya gagal karena duplikat');
  assert(!!result.errors.kodeInventaris, 'Harus ada error pada kodeInventaris');
});

test('Duplikasi kode diabaikan huruf besar/kecil (case-insensitive)', () => {
  const result = InventoryService.addInventory({
    namaBarang: 'Laptop 3',
    kodeInventaris: 'lab-001', // huruf kecil, tetap dianggap duplikat
    ruangan: 'Lab Komputer',
    jumlah: 5,
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya tetap dianggap duplikat walau beda kapitalisasi');
});

console.log('\n=== Edit Data ===');
test('Berhasil mengedit data yang ada', () => {
  const items = InventoryService.getAll();
  const target = items[0];
  const result = InventoryService.updateInventory(target.id, {
    namaBarang: 'Laptop Asus',
    kodeInventaris: target.kodeInventaris,
    ruangan: target.ruangan,
    jumlah: 25,
    kondisi: 'Rusak Ringan',
  });
  assert(result.success, 'Seharusnya berhasil edit');
  assertEqual(result.item.namaBarang, 'Laptop Asus');
  assertEqual(result.item.jumlah, 25);
});

test('Gagal edit jika ID tidak ditemukan', () => {
  const result = InventoryService.updateInventory('INV-TIDAK-ADA', {
    namaBarang: 'X',
    kodeInventaris: 'X-001',
    ruangan: 'Ruang Kelas',
    jumlah: 1,
    kondisi: 'Baik',
  });
  assert(!result.success, 'Seharusnya gagal karena ID tidak ditemukan');
});

console.log('\n=== Hapus Data ===');
test('Berhasil menghapus data yang ada', () => {
  const items = InventoryService.getAll();
  const target = items[0];
  const result = InventoryService.deleteInventory(target.id);
  assert(result.success, 'Seharusnya berhasil hapus');
  assertEqual(InventoryService.getAll().length, 0, 'Data harus kosong setelah dihapus');
});

test('Gagal menghapus data yang tidak ada / sudah terhapus', () => {
  const result = InventoryService.deleteInventory('INV-SUDAH-HILANG');
  assert(!result.success, 'Seharusnya gagal karena data tidak ditemukan');
});

console.log('\n=== Pencarian ===');
resetStorage();
InventoryService.addInventory({ namaBarang: 'Laptop Acer', kodeInventaris: 'LAB-010', ruangan: 'Lab Komputer', jumlah: 5, kondisi: 'Baik' });
InventoryService.addInventory({ namaBarang: 'Proyektor', kodeInventaris: 'KLS-020', ruangan: 'Ruang Kelas', jumlah: 2, kondisi: 'Rusak Ringan' });
InventoryService.addInventory({ namaBarang: 'Buku Paket', kodeInventaris: 'PST-030', ruangan: 'Perpustakaan', jumlah: 100, kondisi: 'Baik' });

test('Pencarian berdasarkan nama barang', () => {
  const result = InventoryService.searchInventory('laptop');
  assertEqual(result.length, 1);
  assertEqual(result[0].namaBarang, 'Laptop Acer');
});

test('Pencarian berdasarkan kode inventaris', () => {
  const result = InventoryService.searchInventory('kls-020');
  assertEqual(result.length, 1);
  assertEqual(result[0].kodeInventaris, 'KLS-020');
});

test('Pencarian case-insensitive & mengabaikan spasi berlebih', () => {
  const result = InventoryService.searchInventory('  LAPTOP  ');
  assertEqual(result.length, 1);
});

test('Pencarian tanpa hasil mengembalikan array kosong', () => {
  const result = InventoryService.searchInventory('tidak-ada-barang-seperti-ini');
  assertEqual(result.length, 0);
});

test('Kata kunci kosong mengembalikan seluruh data', () => {
  const result = InventoryService.searchInventory('');
  assertEqual(result.length, 3);
});

console.log('\n=== Statistik ===');
test('Statistik dihitung dengan benar dari data', () => {
  const stats = InventoryService.calculateStatistics();
  assertEqual(stats.total, 107); // 5 + 2 + 100
  assertEqual(stats.baik, 105); // 5 + 100
  assertEqual(stats.rusakRingan, 2);
  assertEqual(stats.rusakBerat, 0);
});

console.log('\n=== Data Kosong ===');
resetStorage();
test('Statistik bernilai 0 semua jika data kosong', () => {
  const stats = InventoryService.calculateStatistics();
  assertEqual(stats.total, 0);
  assertEqual(stats.baik, 0);
  assertEqual(stats.rusakRingan, 0);
  assertEqual(stats.rusakBerat, 0);
});

test('Daftar inventaris kosong mengembalikan array kosong, bukan error', () => {
  const items = InventoryService.getAll();
  assert(Array.isArray(items), 'Harus tetap berupa array');
  assertEqual(items.length, 0);
});

console.log('\n=== Data Corrupt ===');
test('Data corrupt (bukan JSON valid) tidak menghentikan aplikasi', () => {
  global.window.localStorage.setItem(StorageService.STORAGE_KEY, '{ ini bukan json valid ');
  const items = StorageService.getInventories();
  assert(Array.isArray(items), 'Harus fallback ke array kosong');
  assertEqual(items.length, 0);
});

test('Data corrupt (bukan array) tidak menghentikan aplikasi', () => {
  global.window.localStorage.setItem(StorageService.STORAGE_KEY, JSON.stringify({ bukan: 'array' }));
  const items = StorageService.getInventories();
  assertEqual(items.length, 0);
});

test('Item dengan struktur tidak valid disaring, item valid tetap tampil', () => {
  const mixed = [
    { id: 'INV-001', namaBarang: 'Valid', kodeInventaris: 'V-001', ruangan: 'Ruang Kelas', jumlah: 1, kondisi: 'Baik' },
    { id: 'INV-002', namaBarang: 'Tanpa Kondisi', kodeInventaris: 'V-002', ruangan: 'Ruang Kelas', jumlah: 1 }, // invalid
    { namaBarang: 'Tanpa ID', kodeInventaris: 'V-003', ruangan: 'Ruang Kelas', jumlah: 1, kondisi: 'Baik' }, // invalid
  ];
  global.window.localStorage.setItem(StorageService.STORAGE_KEY, JSON.stringify(mixed));
  const items = StorageService.getInventories();
  assertEqual(items.length, 1);
  assertEqual(items[0].id, 'INV-001');
});

// ---------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------
console.log(`\n=== Hasil: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exitCode = 1;
}
