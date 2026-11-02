# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary: Developer, System Administrator, dan Merchant Admin yang mengintegrasikan GoPay API ke sistem pembayaran mandiri mereka (e-commerce, billing automation, bot top-up, atau point of sale).
- Situation & Jobs:
  - Memantau kesehatan gateway (health status, uptime, active QRIS, dan claimed transactions).
  - Menginspeksi masa aktif session token GoPay (access token & refresh token) dan melakukan trigger pembaruan token sebelum kedaluwarsa.
  - Melakukan simulasi dan pengujian pembuatan QRIS dinamis (EMVCo payload dengan checksum CRC16).
  - Mengawasi feed transaksi dan mutasi saldo GoPay secara real-time.
  - Memeriksa activity logs/terminal output gateway untuk debugging alur verifikasi transaksi.

## Product Purpose
- Menyediakan dashboard operasional mandiri (self-hosted control panel) dan hub gateway menyeluruh untuk GoPay API Gateway.
- Menjamin kelancaran otomasi penerimaan pembayaran QRIS dengan transparansi status token sesi, monitoring mutasi pembayaran, serta visibilitas log runtime.
- Keberhasilan diukur dari: zero silent session failure (token terpantau sebelum kedaluwarsa), akurasi verifikasi pembayaran QRIS dinamis, keandalan polling/callback transaksi, dan kenyamanan pemantauan operasional.

## Positioning
- Berbeda dari payment gateway agregator pihak ketiga (Midtrans/Xendit) yang mengenakan potongan biaya per-transaksi (MDR) dan membutuhkan verifikasi entitas bisnis formal, produk ini adalah self-hosted direct bridge gateway ke akun GoPay pribadi/merchant langsung.
- Memberikan kontrol penuh atas session, data mutasi langsung tanpa perantara pihak ketiga, dan latensi langsung ke private endpoint GoPay.

## Operating Context
- Web dashboard internal yang diakses via browser desktop/laptop oleh admin teknis atau pemilik layanan.
- Berjalan di server/VPS mandiri berdampingan dengan Next.js 16 App Router (default port 3122).
- Berkomunikasi langsung dengan session runtime `login.js` dan internal API router (`/api/check-payment`, `/api/create-qris`, `/api/health`, `/api/token-status`, `/api/transactions`).

## Capabilities and Constraints
- **Confirmed Capabilities**:
  - Auto-refresh real-time monitoring (polling 15 detik untuk health, token status, mutasi transaksi terbaru, dan activity logs).
  - Token session card dengan indikator visual masa kedaluwarsa, masked token inspection, dan trigger manual refresh session.
  - QRIS Dynamic generator interaktif dengan input nominal rupiah, auto-poll payment status, countdown expiry, dan QR canvas rendering.
  - Transaction Feed terstruktur dengan filter nominal, badge status (SUCCESS, PENDING, FAILED), detail ID transaksi, dan timestamp relatif/absolut.
  - Activity Logs Terminal interaktif dengan autoscroll, filtering level (INFO, WARN, ERROR), dan copy output.
  - Pengaturan API Key lokal (`gopay_api_key`) tersimpan di client-side localStorage untuk authorization header.
  - Dukungan manual dark mode / light mode dengan pencegahan hydration mismatch via `@custom-variant dark`.
- **Planned Full Hub Extensions**:
  - Konfigurasi webhook callback endpoint ke backend eksternal ketika pembayaran sukses terdeteksi.
  - Export laporan mutasi dan riwayat transaksi (CSV/JSON format).
  - Mekanisme auto-reconnect / auto-login helper saat refresh token habis masa berlakunya.
- **Constraints**:
  - Single-account GoPay self-hosted gateway (arsitektur berfokus pada keandalan single-session aktif).
  - Strict zero native browser popups (`window.alert()`, `window.confirm()`) — semua dialog wajib menggunakan `AlertModal` bertema Tailwind yang accessible.
  - Script CJS legacy (`login.js`) terisolasi dari bundling client Next.js Turbopack.

## Brand Commitments
- Identitas warna berakar pada ekosistem Gojek/GoPay:
  - Gojek Green (`#00aa13` / dark: `#00c817`) sebagai aksen primer dan indikator status sukses/online.
  - Dark mode slate palet (`#090d16`, `#0f172a`, `#1e293b`) dengan nuansa modern developer console / financial terminal.
- Tipografi: Geist / Inter / Sans-serif yang tajam dan nyaman dibaca untuk angka nominal moneter dan status terminal.

## Evidence on Hand
- Next.js 16.4.3 App Router & Tailwind CSS v4 codebase fungsional (`dashboard-gopay-api-gateway`).
- Endpoint API terimplementasi: `/create-qris`, `/check-payment`, `/transactions`, `/api/qr-status/[id]`, `/api/token-status`.
- Implementasi EMVCo TLV encoder + CRC16-CCITT di `src/lib/emvco.ts`.
- Client service layer terstruktur (`GatewayService`, `apiFetch`) dan shared UI primitives (`Button`, `Badge`, `Card`, `Input`, `AlertModal`, `Header`, `ThemeToggle`).

## Product Principles
1. **Transparansi Sesi Utama:** Status koneksi dan masa aktif token GoPay adalah detak jantung gateway; jangan pernah menyembunyikan status kegagalan sesi.
2. **Kejelasan Finansial & Mutasi:** Nominal rupiah, status klaim transaksi, dan identitas pembayaran harus ditampilkan secara tegas, presisi, dan bebas ambigu.
3. **Ergonomi Developer/Ops:** Log aktivitas dan status endpoint harus mudah dipantau, disalin, dan difilter layaknya terminal observability modern.
4. **Resistensi Terhadap Silent Failure:** Setiap error API (token expired, rate limit, koneksi terputus) harus memberikan visual feedback yang jelas dan panduan aksi pemulihan.

## Accessibility & Inclusion
- Kontras warna teks moneter dan status badge memenuhi standar WCAG AA di kedua tema (light dan dark).
- Dialog interaktif (`AlertModal`) memiliki trap fokus, tombol escape / backdrop dismissal, dan `aria-modal="true"`.
- Elemen interaktif memiliki tap/click target minimum yang memadai dan status hover/focus-visible yang kontras.
