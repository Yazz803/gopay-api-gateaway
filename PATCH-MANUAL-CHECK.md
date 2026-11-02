# Patch: Cek Status Manual (Tanpa Auto-Polling) — diterapkan di fork ini

Patch ini menghilangkan polling otomatis ke API internal GoBiz/GoPay dan menggantinya
dengan cek status manual oleh pembeli, cooldown di server, dan cache transaksi bersama.
Tujuannya menekan pola request yang bisa terdeteksi sebagai "aktivitas tidak wajar"
di akun merchant.

## Yang berubah

### Aplikasi Next.js (`dashboard-gopay-api-gateway/`) — jalur live

1. **`src/app/qr/[id]/route.ts` (halaman QR pembeli)** — toggle "Cek otomatis setiap
   8 detik" dan seluruh fungsi auto-poll dihapus. Status hanya dicek lewat tombol
   **Cek Status Pembayaran** dengan cooldown hitung mundur di tombol, ditambah SATU
   cek saat halaman kembali tampil (`visibilitychange`, mis. pembeli kembali dari
   aplikasi e-wallet) yang tetap tunduk pada cooldown server.
2. **`src/app/api/qr-status/[id]/route.ts`** — cooldown server per QRIS (default
   10 detik, `STATUS_COOLDOWN_MS`): panggilan berulang dalam jeda dijawab
   `{ cached: true, retry_after_seconds }` TANPA memanggil API Gojek. Saat QRIS baru
   kedaluwarsa, endpoint menjalankan satu final check sebelum menjawab EXPIRED.
3. **`src/lib/gopay-api.ts`** — `verifyPayment()` memakai cache daftar transaksi
   bersama (default 12 detik, `TX_CACHE_MS`, tersimpan di `globalThis` mengikuti pola
   `gateway-state`): satu request ke API Gojek menjawab semua QRIS pending, request
   bersamaan digabung (in-flight dedup per merchant). Ditambah `finalizeQris()` —
   final check yang dipakai endpoint status dan timer terjadwal; bila verifikasi
   gagal (API Gojek gangguan), entri QRIS tidak dihapus agar bisa dicek lagi.
4. **`src/app/create-qris/route.ts`** — menjadwalkan satu final check pada
   `expiry + 2 detik` untuk setiap QRIS baru.
5. **`src/types/gateway.ts` / `src/types/api.ts`** — field opsional pendukung
   (`lastStatusCheckAt`, `finalizing`, `cached`, `retry_after_seconds`).

### Bug lain yang diperbaiki sekalian

6. **`src/features/qris/components/QrisGenerator.tsx`** — polling dashboard sebelumnya
   memakai **trx_id** sebagai kunci cek status, padahal server menyimpan QRIS dengan
   kunci **qris_id**; akibatnya polling selalu menerima `NOT_FOUND` dan status di
   dashboard TIDAK PERNAH berubah menjadi PAID. Sekarang memakai `data.qris_id`,
   dan interval diselaraskan ke 10 detik (sesuai cooldown server).
7. **`src/app/create-qris/route.ts`** — `trx_id` dari pemanggil (mis. nomor nota
   "NOTA-102" dari dashboard) sebelumnya diam-diam diabaikan dan selalu diganti acak.
   Sekarang dihormati bila aman (alfanumerik/dash/underscore, maks 32 char) dan belum
   dipakai QRIS pending lain.

### `reference/server.js` — salinan Express

8. Patch Express yang sama diterapkan ke `reference/server.js` (auto-poll dihapus,
   cooldown + cache + final check), dengan perbaikan `parseGojekAmount()` khas fork
   ini tetap dipertahankan.

## Konfigurasi (opsional, ada default)

- `STATUS_COOLDOWN_MS=10000` — jeda minimum antar cek status per QRIS.
- `TX_CACHE_MS=12000` — umur cache daftar transaksi bersama.

## Verifikasi yang sudah dijalankan

- `npx tsc --noEmit` bersih, `npm run build` sukses.
- Smoke test server produksi lokal (tanpa sesi GoPay): create QRIS normal, `trx_id`
  kustom tercatat, halaman QR tanpa auto-poll, panggilan status kedua seketika
  membalas `cached: true`, final check terbukti berjalan di jalur endpoint maupun
  timer terjadwal.
- BELUM diuji: deteksi PAID terhadap API GoBiz nyata (butuh sesi merchant aktif).
  Uji pertama sebaiknya di akun/outlet sekunder.
