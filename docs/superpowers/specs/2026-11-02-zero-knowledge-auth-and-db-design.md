# Zero-Knowledge Multi-Tenant PostgreSQL & Drizzle ORM Architecture Spec

## 1. Intent & Purpose
Mengubah GoPay Gateway Dashboard dari aplikasi single-user berbasis file lokal (`.GOPAY_SESI_JANGAN_DIHAPUS.json`) dan memori RAM (`Map()`) menjadi sistem multi-tenant terdistribusi berbasis **PostgreSQL** dan **Drizzle ORM**. Seluruh data pengguna (profil, sesi GoPay merchant, tagihan QRIS, transaksi, dan audit log) dilindungi enkripsi *Zero-Knowledge* (bahkan owner database atau developer tidak dapat membaca data pengguna).

## 2. Model Keamanan Zero-Knowledge
- **HMAC Blind Indexing**: `email_hash` dan `phone_hash` dibuat menggunakan HMAC-SHA256 dengan server pepper agar pengguna dapat dicari saat login dengan `email` atau `nomor_hp` tanpa menyimpan plaintext email/telepon.
- **Dual-Slot Envelope Encryption**:
  - Setiap pengguna memiliki satu **Data Encryption Key (DEK)** acak berukuran 256-bit (AES-256-GCM).
  - DEK disimpan dalam 2 slot terenkripsi di tabel `users`:
    1. `encrypted_dek_by_pin`: Dienkripsi dengan kunci yang diturunkan dari PIN 6-digit pengguna (PBKDF2-SHA256, 100.000 iterasi).
    2. `encrypted_dek_by_password`: Dienkripsi dengan kunci yang diturunkan dari kata sandi akun pengguna (PBKDF2-SHA256, 100.000 iterasi).
  - Jika pengguna lupa PIN, mereka dapat membuka `encrypted_dek_by_password` menggunakan kata sandi login, lalu membuat PIN baru.
- **Data Encryption**: Seluruh field sensitif di tabel `merchant_sessions`, `qris_orders`, `transactions`, dan `activity_logs` dienkripsi menggunakan DEK dengan algoritma AES-256-GCM (format: `iv:authTag:ciphertext`).

## 3. Skema Database (Drizzle ORM + PostgreSQL)
1. **`users`**:
   - `id`: uuid (Primary Key, defaultRandom)
   - `name`: text (terenkripsi AES-256-GCM)
   - `username`: text (unik)
   - `email_hash`: text (unik, HMAC blind index)
   - `phone_hash`: text (unik, HMAC blind index)
   - `encrypted_email`: text (AES-256-GCM)
   - `encrypted_phone_number`: text (AES-256-GCM)
   - `password_hash`: text (scrypt/PBKDF2 salted password hash)
   - `password_salt`: text
   - `pin_salt`: text
   - `encrypted_dek_by_pin`: text
   - `encrypted_dek_by_password`: text
   - `created_at`, `updated_at`: timestamp
2. **`merchant_sessions`**:
   - `id`: uuid (Primary Key)
   - `user_id`: uuid (Foreign Key ke `users.id`, onDelete cascade)
   - `encrypted_merchant_id`: text
   - `encrypted_outlet_name`: text
   - `encrypted_phone_number`: text
   - `encrypted_access_token`: text
   - `encrypted_refresh_token`: text
   - `encrypted_cookie`: text
   - `token_status`: text (`valid` / `expired`)
   - `expires_at`, `updated_at`: timestamp
3. **`qris_orders`**:
   - `id`: uuid (Primary Key)
   - `user_id`: uuid (Foreign Key ke `users.id`)
   - `qris_id`: text (unik)
   - `trx_id`: text (unik)
   - `nominal`: integer
   - `encrypted_qris_payload`: text
   - `status`: text (`PENDING`, `PAID`, `EXPIRED`)
   - `expires_at`, `created_at`: timestamp
4. **`transactions`**:
   - `id`: uuid (Primary Key)
   - `user_id`: uuid (Foreign Key ke `users.id`)
   - `gojek_transaction_id`: text
   - `order_id`: text
   - `nominal`: integer
   - `metode_bayar`: text
   - `issuer`: text
   - `status`: text
   - `waktu_transaksi`: timestamp
5. **`activity_logs`**:
   - `id`: uuid (Primary Key)
   - `user_id`: uuid (Foreign Key ke `users.id`)
   - `log_type`: text (`SUCCESS`, `INFO`, `WARNING`, `ERROR`, `SYSTEM`)
   - `encrypted_message`: text
   - `details_json`: text
   - `created_at`: timestamp

## 4. Alur Autentikasi & Antarmuka Pengguna
1. **Halaman Pendaftaran (`/register`)**:
   - Form pendaftaran: *Name, Username, Email, Phone Number, Password, dan 6 Digit PIN*.
   - Mengalihkan otomatis ke `/login` setelah berhasil.
2. **Halaman Masuk (`/login`)**:
   - Form masuk: *Email / Phone Number* dan *Password*.
   - Saat submit berhasil, sistem menampilkan **Modal Input PIN (6 Digit)**.
   - Tersedia tombol *"Lupa PIN?"* untuk membuka brankas dengan password dan mereset PIN baru.
3. **Session Management**:
   - Menggunakan signed HTTP-only cookie dengan session token.
   - Kunci DEK yang telah dibuka disimpan dalam memory session terenkripsi di sisi klien/cookie sesi terisolasi sehingga saat logout, kunci langsung hilang dan brankas terkunci kembali.
4. **Migrasi Data Gateway**:
   - Seluruh endpoint API gateway (`/api/token-status`, `/api/connect-gopay/*`, `/api/create-qris`, `/api/transactions`, `/api/logs`) membaca dan menulis langsung ke database PostgreSQL berdasarkan `user_id` yang sedang login.
