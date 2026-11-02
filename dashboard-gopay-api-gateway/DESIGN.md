---
name: "GoPay Gateway Dashboard"
description: "Warm Minimalist Corporate UI with tactile bento layout and ergonomic contrast"
colors:
  shell-dark: "#2B303A"
  shell-hover: "#383E4A"
  canvas-warm: "#DED8CE"
  card-surface: "#F3EFEA"
  card-subtle: "#E8E2D9"
  text-primary: "#1E2229"
  text-secondary: "#7A7670"
  text-on-dark: "#EAE6DF"
  text-on-dark-muted: "#9B9FA7"
  status-positive: "#4E6E58"
  status-negative: "#B85D43"
  chart-highlight: "#2B303A"
  chart-secondary: "#8E8D8A"
  chart-tertiary: "#C6BEB5"
  chart-subtle: "#D9D2C7"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  card: "14px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-pill:
    backgroundColor: "{colors.shell-hover}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  button-primary:
    backgroundColor: "{colors.shell-dark}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.card}"
    padding: "10px 20px"
  card-container:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
---

# Design System: GoPay Gateway Dashboard

## Overview

**Creative North Star: "The Tactile Ledger"**

The Tactile Ledger menghadirkan suasana ruang kerja analis finansial yang tenang, elegan, dan data-dense. Sistem ini secara tegas menolak estetika *sterile white* (#ffffff murni) yang menyilaukan dan kontras tinggi neon yang melelahkan mata operator dalam jam kerja panjang. Sebagai gantinya, antarmuka dibangun di atas harmoni tone hangat (*earthy corporate*): bingkai luar berona arang gelap (*Charcoal Slate* `#2B303A`) yang membungkus kanvas kerja hangat (*Warm Canvas* `#DED8CE`) dan kartu metrik krem lembut (*Soft Card* `#F3EFEA`).

Karakter visualnya mengutamakan presisi dan taktilitas: sudut kartu membulat anggun (14px), bayangan mikroskopis yang menyebar halus (*diffused micro-shadow*), dan angka metrik finansial berformat *tabular-nums* yang sejajar secara vertikal dengan presisi matematis. Pengguna tidak disuguhi sekadar visual dashboard modern generik, melainkan meja instrumen finansial yang kokoh, terpercaya, dan ergonomis untuk monitoring transaksi gateway real-time.

**Key Characteristics:**
- **Warm Monochromatic Hierarchy:** Menghindari warna putih murni; memanfaatkan gradasi hangat bersahaja yang ramah di mata untuk sesi monitoring lama.
- **L-Shaped Structural Frame:** Navigasi samping (sidebar) dan header bar terintegrasi dalam satu bingkai monolitik gelap yang memusatkan fokus mata ke area kanvas bento.
- **Tactile Bento Grid:** Modul-modul data dikemas dalam kartu modular berbingkai highlight tipis dengan micro-elevation yang organik.
- **Financial Metric Rigor:** Tipografi angka moneter wajib menggunakan `font-variant-numeric: tabular-nums` agar komparasi data numerik lurus sejajar tanpa jitter.

## Colors

Palet warna didesain dengan kontras ergonomis berbasis tone mineral hangat dan arang monolitik, menjamin keterbacaan tinggi tanpa distorsi neon.

### Primary
- **Charcoal Slate Shell** (`#2B303A`): Warna struktural utama untuk Sidebar dan Top Header Bar, menciptakan fondasi visual yang berwibawa dan membingkai kanvas data.
- **Charcoal Slate Hover** (`#383E4A`): State interaktif aktif/hover untuk item navigasi sidebar, pill buttons, dan trigger filter.

### Secondary
- **Warm Canvas** (`#DED8CE`): Latar belakang utama area kerja bento grid di luar shell sidebar; memberikan kedalaman kontras hangat yang natural.
- **Cream Card Surface** (`#F3EFEA`): Latar belakang kartu kontainer widget, metrik KPI, dan tabel; memantulkan cahaya lembut tanpa silau putih.
- **Subtle Card Contrast** (`#E8E2D9`): Latar belakang bar sekunder, track progress, pemisah baris tabel, dan state hover item transaksi.

### Tertiary (Status & Charts)
- **Positive Forest** (`#4E6E58`): Indikator status transaksi sukses, tren pertumbuhan positif (YoY up), dan kesehatan gateway online.
- **Muted Terracotta** (`#B85D43`): Indikator status transaksi gagal, alert masa token kritis, atau anomali jaringan.
- **Chart Slate** (`#2B303A`): Batang grafik dominan dan fokus visual visualisasi volume.
- **Chart Muted Pebble** (`#8E8D8A`): Segmen sekunder pada visualisasi breakdown status transaksi.
- **Chart Sand** (`#C6BEB5`): Nilai komparasi historis dan sparkline latar.
- **Chart Outline** (`#D9D2C7`): Garis pembatas segmen chart dan track batas metrik.

### Neutral
- **Deep Slate Text** (`#1E2229`): Teks judul, angka KPI utama, dan label header tabel yang berbobot tegas.
- **Muted Taupe Text** (`#7A7670`): Teks sekunder, label pembantu, subtitle kartu, dan metadata tanggal/waktu.
- **Parchment Light Text** (`#EAE6DF`): Teks navigasi dan ikon pada permukaan gelap (sidebar dan top bar).
- **Muted Parchment Text** (`#9B9FA7`): Teks sekunder atau label versi non-aktif di area shell gelap.

### Named Rules
**The No-Sterile-White Rule.** Jangan pernah menggunakan latar `#ffffff` murni pada kartu atau kanvas utama. Semua permukaan terang wajib menggunakan gradasi `#F3EFEA` atau `#DED8CE` untuk menjaga kehangatan visual dan kenyamanan mata.

**The Muted Status Rule.** Warna status hijau dan merah tidak boleh menggunakan saturasi neon (`#00ff00` / `#ff0000`). Gunakan `#4E6E58` (Forest) dan `#B85D43` (Terracotta) yang terkalibrasi selaras dengan palet mineral hangat.

## Typography

**Display Font:** `Plus Jakarta Sans` (dengan fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Body Font:** `Plus Jakarta Sans` (dengan fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` atau `Consolas` untuk payload QRIS, raw token hash, dan console logs.

**Character:** Tipografi bersih, geometris, dan humanis dengan aperture terbuka. Sangat kuat dalam hierarki bobot huruf dan wajib memuat fitur OpenType `cv02`, `cv03`, `cv04`, `cv11`.

### Hierarchy
- **Display KPI** (Bold 700, `28px`, line-height `1.1`, letter-spacing `-0.02em`): Angka metrik finansial utama (omset hari ini, total transaksi masuk, saldo GoPay aktif).
- **Headline** (Semi-Bold 600, `14px`, line-height `1.2`, letter-spacing `-0.01em`): Judul section kartu modul, nama tabel, dan modal dialog header.
- **Title** (Semi-Bold 600, `13px`, line-height `1.2`, letter-spacing `normal`): Header kolom tabel, sub-metrik ringkas, dan label kontrol input.
- **Body** (Medium 500, `12px`, line-height `1.4`, letter-spacing `normal`): Konten data sel tabel, rincian ID transaksi, dan deskripsi status operasional.
- **Label / Micro** (Medium 500, `11px`, line-height `1.3`, letter-spacing `0.02em`): Metadata pembantu, timestamp transaksi relatif, badge tag, dan indikator persentase.

### Named Rules
**The Tabular Precision Rule.** Seluruh angka nominal rupiah, persentase perubahan, saldo, dan waktu wajib menyertakan kelas CSS `tabular-nums` (`font-variant-numeric: tabular-nums`). Angka harus sejajar secara kolom tanpa geseran horizontal saat nilai berubah secara dinamis.

**The Subtitle Muting Rule.** Subtitle kartu dan unit satuan tidak boleh bersaing bobotnya dengan angka KPI. Gunakan ukuran maksimum 12px dengan warna `--text-secondary` (`#7A7670`).

## Layout

Layout dibangun dengan kerangka struktural **L-Shaped Frame** yang membungkus kanvas modular **Bento Grid**:

1. **Integrated L-Shaped Frame:**
   - **Sidebar Kiri:** Lebar tetap 220px - 240px, mengisi tinggi layar penuh (`100vh`), latar belakang `--bg-shell` (`#2B303A`).
   - **Top Header Bar:** Tinggi 56px - 60px, terhubung langsung dengan sidebar tanpa garis batas tajam, menampung quick action, status sinkronisasi, dan profil admin.
2. **Content Canvas:**
   - Mengisi sisa ruang viewport di dalam L-frame dengan latar belakang `--bg-canvas` (`#DED8CE`).
   - Padding area kerja: 16px - 20px dengan scroll internal yang halus.
3. **Bento Grid Structure:**
   - **Top Row (KPI Summaries):** Grid 5 kolom simetris (`repeat(5, minmax(0, 1fr))` pada layar desktop lebar) untuk metrik ringkas: Total Transaksi, Sukses Rate, Volume IDR, Active QRIS, dan Masa Token.
   - **Main & Detail Rows (Asymmetric Bento):** Grid 3 kolom asimetris:
     - Kolom Kiri (`40% - 42%`): Feed mutasi transaksi real-time dan log aktivitas transaksi.
     - Kolom Tengah (`28% - 30%`): Simulator pembuatan QRIS Dinamis & countdown status pembayaran.
     - Kolom Kanan (`28% - 30%`): Health status token sesi GoPay, breakdown metode pembayaran, dan latency gateway.
   - Jarak antar modul (*gap*): `12px` hingga `16px`.

## Elevation & Depth

Sistem The Tactile Ledger menolak bayangan tebal melayang yang agresif. Elevasi dicapai melalui perpaduan *layered tone contrast* dan bayangan mikroskopis yang menyebar sangat halus (*diffused micro-shadows*), dipertegas dengan garis highlight pinggir kartu semi-transparan.

### Shadow Vocabulary
- **Card Micro Surface** (`box-shadow: 0 2px 8px -2px rgba(43, 48, 58, 0.05)`): Bayangan dasar kartu modul; memberi pemisahan taktil dari kanvas tanpa terlihat kotor.
- **Dropdown & Modal Overlay** (`box-shadow: 0 10px 25px -5px rgba(43, 48, 58, 0.15), 0 8px 10px -6px rgba(43, 48, 58, 0.1)`): Digunakan untuk dialog modal alert dan popover menu filter.

### Named Rules
**The Ghost Highlight Rule.** Setiap kartu bento wajib memiliki border highlight `1px solid rgba(255, 255, 255, 0.65)`. Highlight ini meniru pantulan tepi material kartu fisik yang diletakkan di atas kanvas hangat.

**The Flat-At-Rest Rule.** Modul dan tombol berada pada elevasi datar saat diam. Elevasi visual hanya berubah halus (micro-lift `translateY(-1px)`) saat kursor melakukan hover pada elemen interaktif.

## Shapes

Bentuk geometris mengadopsi pendekatan ramah dan tumpul (*soft softened geometry*):

- **Card Containers:** Radius `14px` (`--radius-card`), memberikan sudut lengkung kontemporer yang pas dan tidak terkesan kaku.
- **Pill Buttons & Filter Chips:** Radius `9999px` (`--radius-pill`), berbentuk kapsul penuh untuk kontrol navigasi, filter rentang waktu, dan tag status.
- **Bar & Progress Tracks:** Radius `6px` (`--radius-bar`) untuk bar grafik vertikal/horizontal dan indikator sisa masa token.
- **Form Inputs:** Radius `10px` dengan border halus `1px solid #D9D2C7`.

## Components

### Buttons & Pills
- **Shape:** Kapsul penuh (radius 9999px) untuk filter/pills; kartu membulat (radius 10px) untuk tombol aksi primer form.
- **Pill Filter:** Background `--bg-shell-accent` (`#383E4A`), teks `--text-on-dark` (`#EAE6DF`), padding `6px 14px`, dengan bulatan status `6px` di sisi kiri.
- **Primary Action Button:** Background `--bg-shell` (`#2B303A`), teks `#EAE6DF`, padding `10px 20px`, transisi `background 0.2s ease, transform 0.15s ease`.
- **Hover / Active:** Background bergeser ke `#383E4A`, elevasi halus dengan `transform: translateY(-1px)`.

### Cards & Bento Containers
- **Corner Style:** Radius `14px`.
- **Background:** `--bg-card` (`#F3EFEA`).
- **Border:** `1px solid rgba(255, 255, 255, 0.65)`.
- **Shadow:** `0 2px 8px -2px rgba(43, 48, 58, 0.05)`.
- **Internal Padding:** `16px` hingga `20px`.

### Inputs & Form Fields
- **Style:** Background `#FFFFFF` atau `#FAF8F5`, border `1px solid #D9D2C7`, radius `10px`, padding `10px 14px`, tipografi `12px Medium`.
- **Focus:** Border beralih ke `--bg-shell` (`#2B303A`) dengan ring luar transparan `0 0 0 3px rgba(43, 48, 58, 0.08)`.
- **Prefix Moneter:** Badge "Rp" tertanam rapi di sisi kiri dengan warna latar `--bg-card-subtle` (`#E8E2D9`).

### Data Tables
- **Minimal Grid:** Tanpa garis vertikal; pemisah baris hanya garis horizontal ultra-tipis `1px solid #E8E2D9`.
- **Row Hover:** Berubah lembut ke latar belakang `--bg-card-subtle` (`#E8E2D9`).
- **Cells:** Teks angka menggunakan kelas `tabular-nums` rata kanan; nama pengirim dan ID transaksi rata kiri.
- **Footer Action:** Navigasi pagination minimal dengan link teks kecil dan panah sederhana (`Lihat Seluruh Mutasi ->`).

### Data Visualizations (Charts)
- **Bar Charts:** Ujung atas batang melengkung lembut (radius `6px`), warna batang utama `--chart-highlight` (`#2B303A`).
- **Donut Charts:** Ring berketebalan medium dengan jarak pemisah antar slice 2px (warna kartu `#F3EFEA`) dan garis pointer tipis menuju persentase luar.
- **Sparklines:** Garis halus 2px tanpa dot titik henti, warna `--chart-secondary` (`#8E8D8A`) di atas area berarsir `--chart-subtle` (`#D9D2C7`).

## Do's and Don'ts

### Do:
- **Do** selalu aktifkan `font-variant-numeric: tabular-nums` pada seluruh teks yang menampilkan nominal mata uang, tanggal, dan durasi hitung mundur token.
- **Do** gunakan highlight semi-transparan `1px solid rgba(255, 255, 255, 0.65)` pada kartu modul bento untuk menciptakan dimensi taktil yang kaya.
- **Do** pertahankan bingkai L-Shaped Frame (Sidebar + Top Bar gelap) dalam satu keluarga warna solid `#2B303A`.
- **Do** gunakan warna status teredam (`#4E6E58` untuk sukses, `#B85D43` untuk gagal) agar selaras dengan atmosfer earthy dashboard.
- **Do** pastikan padding kartu bento konsisten pada skala 16px - 20px.

### Don't:
- **Don't** gunakan background putih murni (`#ffffff`) untuk kontainer kartu utama atau background halaman.
- **Don't** gunakan warna neon dengan saturasi tinggi (misal `#00FF66` atau `#FF0033`) untuk indikator status transaksi.
- **Don't** gunakan bayangan hitam pekat dengan blur besar (`rgba(0,0,0,0.5)`); bayangan wajib menggunakan micro-diffused tone arang (`rgba(43, 48, 58, 0.05)`).
- **Don't** gunakan garis tabel vertikal atau border tebal yang memecah kepadatan visual bento grid.
- **Don't** gunakan dialog pop-up browser bawaan (`window.alert()` / `window.confirm()`); gunakan dialog modal bertema `AlertModal` dengan styling The Tactile Ledger.
