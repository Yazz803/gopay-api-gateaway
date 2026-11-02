# Warm Minimalist Dashboard Design System

Dokumentasi spesifikasi desain antarmuka berbasis referensi dashboard *Warm Minimalist Corporate UI* (Bento Grid Style).

---

## 1. Konsep & Karakteristik Desain

* **Gaya Visual:** Warm Minimalist / Earthy Corporate Dashboard.
* **Layout Paradigm:** Bento Grid System dengan bingkai "L-Shape" terintegrasi (Sidebar + Top Bar gelap).
* **Nuansa:** Elegan, tenang, data-dense namun tidak melelahkan mata (*ergonomic contrast*), menghindari putih steril (*sterile white*) dan kontras tinggi neon.
* **Karakter Elemen:** Sudut membulat lembut (*soft rounded corners*), bayangan sangat tipis (*diffused micro-shadows*), dan hierarki visual berbasis tone monokromatik hangat.

---

## 2. Palet Warna (Color Tokens)

### A. Surface & Backgrounds
| Token Name | Hex Code | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| `--bg-shell` | `#2B303A` | Latar belakang Sidebar dan Header Bar atas. |
| `--bg-shell-hover` | `#383E4A` | State aktif/hover pada menu sidebar dan tombol pill. |
| `--bg-canvas` | `#DED8CE` | Background dasar area kerja / kanvas dashboard. |
| `--bg-card` | `#F3EFEA` | Latar belakang kartu (*card container*) widget metrik & chart. |
| `--bg-card-subtle` | `#E8E2D9` | Warna latar bar sekunder, track progress, atau baris hover tabel. |

### B. Typography & Iconography
| Token Name | Hex Code | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| `--text-primary` | `#1E2229` | Angka metrik utama (KPI), judul section, header tabel. |
| `--text-secondary` | `#7A7670` | Label pembantu, breadcrumb drilldown, subtitle, PY values. |
| `--text-on-dark` | `#EAE6DF` | Teks navigasi pada sidebar dan top bar. |
| `--text-on-dark-muted` | `#9B9FA7` | Teks sekunder/versi redup pada sidebar. |

### C. Data Visualization (Charts & Graphs)
| Token Name | Hex Code | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| `--chart-highlight` | `#2B303A` | Batang utama / segmen dominan pada grafik (fokus visual). |
| `--chart-secondary` | `#8E8D8A` | Kategori sekunder pada bar chart atau donat. |
| `--chart-tertiary` | `#C6BEB5` | Kategori tersier / nilai perbandingan historis. |
| `--chart-subtle` | `#D9D2C7` | Area sparkline dan outline pemisah segmen. |

### D. Semantic Status
| Token Name | Hex Code | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| `--status-positive` | `#4E6E58` | Nilai tren positif (YoY up / performa baik). |
| `--status-negative` | `#B85D43` | Nilai tren negatif / penurunan stok kritis. |

---

## 3. Tipografi (Typography)

* **Rekomendasi Font:** `Inter`, `Plus Jakarta Sans`, atau `DM Sans`.
* **Kebutuhan Khusus:** Wajib mengaktifkan `tabular-nums` pada CSS agar deretan angka pada KPI dan tabel sejajar vertikal secara presisi.

```css
body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}

.tabular-numbers {
  font-variant-numeric: tabular-nums;
}
```

### Scale & Hierarchy
* **KPI Number:** `26px - 28px` | Weight: `700 (Bold)` | Line-height: `1.1`
* **Card Heading:** `13px - 14px` | Weight: `600 (Semi-Bold)` | Line-height: `1.2`
* **Table & Data Content:** `12px` | Weight: `500 (Medium)` | Line-height: `1.4`
* **Breadcrumb / Drilldown:** `11px - 12px` | Weight: `400 (Regular)` / *Italic*
* **Micro Metadata (PY / YoY):** `11px` | Weight: `500`

---

## 4. Layout & Bento Grid

### Container Shell
* Dashboard dibungkus dalam layout **L-Shaped Frame**:
  * **Sidebar:** Lebar tetap `220px - 240px`, posisi kiri penuh.
  * **Top Bar:** Tinggi `56px - 60px`, terintegrasi mulus dengan warna sidebar.
  * **Content Canvas:** Mengisi sisa viewport dengan padding `16px - 20px` dan background `--bg-canvas`.

### Grid Structure
1. **Top Row (KPI Summaries):**
   * Grid 5 kolom sama rata (`repeat(5, minmax(0, 1fr))`).
   * Berisi: Judul KPI, Sparkline kanan atas, Angka utama, dan komparasi YoY di footer kartu.
2. **Middle & Bottom Rows (Deep Dive & Tables):**
   * Grid 3 kolom asimetris:
     * Kolom 1 (Kiri): `40% - 42%` (ruang untuk bar chart timeline atau tabel data besar).
     * Kolom 2 (Tengah): `28% - 30%` (donut breakdown atau horizontal ranking).
     * Kolom 3 (Kanan): `28% - 30%` (kategori produk atau segmentasi stok).
   * Gap antar modul: `12px` hingga `16px`.

---

## 5. Komponen UI Detail

### A. Cards (Kartu Modul)
* **Background:** `--bg-card` (`#F3EFEA`)
* **Border Radius:** `14px`
* **Border:** `1px solid rgba(255, 255, 255, 0.65)` (memberikan highlight pinggiran lembut)
* **Box Shadow:** `0 2px 8px -2px rgba(43, 48, 58, 0.05)`

### B. Controls & Pill Buttons
* Tombol filter tahun dan status stok pada sidebar:
  * Bentuk: Kapsul penuh (`border-radius: 9999px`)
  * Padding: `6px 14px`
  * Background: `--bg-shell-accent` (`#383E4A`)
  * Text Color: `#EAE6DF`
  * Indicator: Bulatan kecil `6px` di sisi kiri label teks.

### C. Data Tables
* **Gaya Minimal:** Tanpa garis batas vertikal, hanya garis horizontal tipis (`1px solid #E8E2D9`).
* **Icons in Cells:** Ikon kategori dibungkus dalam lingkaran kecil abu-abu gelap dengan simbol kontras.
* **Pagination / Action:** Teks navigasi kecil di footer tabel dengan panah sederhana (`Go to Product Search ->`).

### D. Data Visualizations
* **Bar Charts:** Ujung bar dibuat tumpul (*rounded tops* `6px` atau kapsul penuh untuk horizontal bars).
* **Donut Charts:** Cincin dengan ketebalan medium, jarak batas antar slice `2px` (warna kartu), serta pointer garis tipis (*leader line*) menuju persentase di luar lingkaran.

---

## 6. Ready-to-Use CSS Variables

Salin blok ini ke file CSS utama Anda (`globals.css` atau `variables.css`):

```css
:root {
  /* Surfaces */
  --bg-shell: #2B303A;
  --bg-shell-accent: #383E4A;
  --bg-canvas: #DED8CE;
  --bg-card: #F3EFEA;
  --bg-card-subtle: #E8E2D9;

  /* Typography */
  --text-primary: #1E2229;
  --text-secondary: #7A7670;
  --text-on-dark: #EAE6DF;
  --text-on-dark-muted: #9B9FA7;

  /* Data Visualization */
  --chart-highlight: #2B303A;
  --chart-secondary: #8E8D8A;
  --chart-tertiary: #C6BEB5;
  --chart-light: #D9D2C7;

  /* Status Colors */
  --status-positive: #4E6E58;
  --status-negative: #B85D43;

  /* Shapes & Effects */
  --radius-card: 14px;
  --radius-pill: 9999px;
  --radius-bar: 6px;
  --shadow-card: 0 2px 8px -2px rgba(43, 48, 58, 0.05);
  --border-card: 1px solid rgba(255, 255, 255, 0.65);
}
```