# Dokumentasi API & Fitur Webhook Payment Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan menu "Dokumentasi API" lengkap dan interaktif pada dashboard serta mengimplementasikan fitur Webhook otomatis berstandar payment gateway (seperti Midtrans/Xendit) dengan HMAC-SHA256 signature verification dan pengujian langsung.

**Architecture:** 
1. Database Schema: Penambahan kolom `webhook_url` dan `webhook_secret` pada tabel `users`, serta pembuatan tabel `webhook_deliveries` untuk mencatat riwayat pengiriman webhook.
2. Webhook Engine: Modul `webhook-service.ts` untuk mengirim HTTP POST payload event `payment.success` ke URL merchant saat pembayaran QRIS lunas, lengkap dengan kalkulasi signature HMAC-SHA256 (`X-Gateway-Signature`) dan pencatatan log pengiriman. Integrasi panggilan webhook pada event verifikasi pembayaran di `api/qr-status/[id]/route.ts`, `app/check-payment/route.ts`, dan `finalizeQris`.
3. Webhook Management API: Endpoint `GET /api/user/webhook`, `POST /api/user/webhook`, dan `POST /api/user/webhook/test` untuk konfigurasi dan simulasi webhook.
4. UI Dashboard: Menu baru "Dokumentasi API" pada Sidebar (`/docs`), halaman dokumentasi interaktif dengan contoh request/response (cURL, Node.js, PHP, Python), panduan autentikasi API Key, konfigurasi Webhook, tombol uji coba Webhook live, dan tabel riwayat pengiriman webhook.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle ORM (PostgreSQL), Tailwind CSS v4, `react-icons`.

**Spec:** Dokumentasi API interaktif dan Webhook payment gateway sesuai spesifikasi user.

## Global Constraints
- Bahasa antarmuka dan penjelasan adalah Bahasa Indonesia.
- Wajib menggunakan pustaka `react-icons` untuk semua ikon (tidak menggunakan inline SVG).
- Dilarang keras menggunakan ornamen visual titik lingkaran (tidak ada `rounded-full` status dots, indicator dots, atau pulse dot animations) pada badge, pill, maupun kartu status.
- Mematuhi desain visual "The Tactile Ledger" (#2B303A, #DED8CE, #F3EFEA, #4E6E58, #B85D43).

## Review Focus
1. Keamanan Webhook: Payload webhook harus memiliki signature HMAC-SHA256 agar penerima dapat memvalidasi keaslian pengirim.
2. Ketahanan Pengiriman: Gagalnya pengiriman webhook (misal endpoint merchant down/timeout) tidak boleh membatalkan atau merusak status transaksi QRIS di gateway.
3. Idempotensi Webhook: Webhook untuk transaksi yang sama tidak boleh dikirim berkali-kali secara tidak sengaja jika status sudah pernah diproses.
4. Validasi API Key: Endpoint integrasi payment gateway tetap memvalidasi `x-api-key` dengan aman.
5. Kepatuhan UI: Memastikan tidak ada dot lingkaran pada badge/status dan semua icon berasal dari `react-icons`.

---

### Task 1: Database Schema & Migration for Webhook
**Files:**
- Modify: `dashboard-gopay-api-gateway/src/lib/db/schema.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/db/migrate.ts`

- [ ] **Step 1: Tambahkan kolom webhook di `usersTable` dan tabel `webhookDeliveriesTable` di `schema.ts`**
- [ ] **Step 2: Tambahkan migrasi DDL otomatis di `migrate.ts` (`ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT...`)**
- [ ] **Step 3: Verifikasi build TypeScript dan kesesuaian tipe data**

### Task 2: Webhook Engine & Dispatch Service
**Files:**
- Create: `dashboard-gopay-api-gateway/src/lib/webhook-service.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/qr-status/[id]/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/check-payment/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/gopay-api.ts`

- [ ] **Step 1: Buat `webhook-service.ts` yang berisi fungsi `dispatchPaymentWebhook`, `generateWebhookSignature`, dan `recordWebhookDelivery`**
- [ ] **Step 2: Integrasikan `dispatchPaymentWebhook` saat pembayaran terverifikasi sukses di `api/qr-status/[id]`, `check-payment`, dan `finalizeQris`**
- [ ] **Step 3: Pastikan eksekusi pengiriman webhook bersifat non-blocking (asynchronous catch) agar respons QRIS tetap instan**

### Task 3: Webhook Management & Test API Routes
**Files:**
- Create: `dashboard-gopay-api-gateway/src/app/api/user/webhook/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/user/webhook/test/route.ts`

- [ ] **Step 1: Buat route `GET /api/user/webhook` (ambil config webhook user & 10 history pengiriman terakhir)**
- [ ] **Step 2: Buat route `POST /api/user/webhook` (simpan webhook URL dan generate/simpan webhook secret)**
- [ ] **Step 3: Buat route `POST /api/user/webhook/test` (kirim payload uji coba ke webhook URL dan laporkan status HTTP, durasi, dan respons body)**

### Task 4: Navigation Update & Sidebar Integration
**Files:**
- Modify: `dashboard-gopay-api-gateway/src/components/layout/Sidebar.tsx`
- Modify: `dashboard-gopay-api-gateway/src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Tambahkan item navigasi "Dokumentasi API" (`/docs`) di `Sidebar.tsx` dengan ikon dari `react-icons` (misal `RiBookOpenLine`)**
- [ ] **Step 2: Sesuaikan tipe `activeTab` dan judul tab aktif di `DashboardShell.tsx`**

### Task 5: Dokumentasi API & Webhook Management UI Page
**Files:**
- Create: `dashboard-gopay-api-gateway/src/app/docs/page.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/docs/ApiDocsView.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/docs/WebhookConfigCard.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/docs/CodeBlock.tsx`

- [ ] **Step 1: Buat komponen `CodeBlock` dengan tombol salin (copy) dan syntax display bertema The Tactile Ledger**
- [ ] **Step 2: Buat komponen `WebhookConfigCard` untuk pengaturan URL webhook, rahasia webhook (HMAC Secret), tombol uji coba (test ping), dan tabel status riwayat pengiriman tanpa dot visual**
- [ ] **Step 3: Buat komponen `ApiDocsView` berisi dokumentasi lengkap: Autentikasi (`x-api-key`), Buat QRIS Dinamis (`POST /api/create-qris`), Cek Status Pembayaran (`GET /api/qr-status/:id`), Verifikasi Transaksi (`POST /api/check-payment`), Riwayat Transaksi (`GET /api/transactions`), dan Spesifikasi Webhook Event (`payment.success`) beserta contoh verifikasi signature di Node.js, PHP, Python**
- [ ] **Step 4: Sambungkan route `src/app/docs/page.tsx` di dalam `DashboardShell`**

### Task 6: Verification & Testing
- [ ] **Step 1: Jalankan linter dan TypeScript build check (`npm run build` di `dashboard-gopay-api-gateway`)**
- [ ] **Step 2: Uji endpoint webhook test dan pembuatan kode QRIS**
- [ ] **Step 3: Pastikan tidak ada pelanggaran aturan (tanpa inline SVG, hanya `react-icons`, tanpa dot visual pada badge/status)**
