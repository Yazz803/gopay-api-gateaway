# Zero-Knowledge Multi-Tenant PostgreSQL & Drizzle ORM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem otentikasi multi-tenant dengan halaman register/login, skema PostgreSQL via Drizzle ORM, enkripsi zero-knowledge berbrankas PIN ganda (dual-slot recovery via password), serta memigrasikan penyimpanan sesi GoPay dan data dashboard ke database.

**Architecture:** Menggunakan PostgreSQL dengan Drizzle ORM untuk tabel `users`, `merchant_sessions`, `qris_orders`, `transactions`, dan `activity_logs`. Autentikasi menggunakan scrypt/PBKDF2 salted hash dengan blind index HMAC untuk pencarian email/nomor HP. Keamanan zero-knowledge menggunakan AES-256-GCM Envelope Encryption di mana Data Encryption Key (DEK) di-wrap oleh PIN 6-digit dan password pengguna. Sesi pengguna dikelola dengan HTTP-only session cookies.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Drizzle ORM (`drizzle-orm`), `postgres` driver (PostgreSQL), Node.js `crypto` stdlib, React Icons.

**Spec:** `docs/superpowers/specs/2026-11-02-zero-knowledge-auth-and-db-design.md`

## Global Constraints
- Seluruh kode aplikasi dan rute hanya dimodifikasi di dalam folder `dashboard-gopay-api-gateway/`.
- Tidak boleh mengekspos teks rahasia (kunci privat, password mentah, atau access token GoPay) ke log atau output klien.
- Desain UI halaman pendaftaran dan masuk wajib mematuhi tema *The Tactile Ledger* (tanpa circle dot, palet warna mineral alami, elevasi taktil).

## Review Focus
1. Login dengan email vs nomor HP: Keduanya harus dapat mengidentifikasi user unik yang sama melalui HMAC blind index.
2. Dual-Slot Recovery: Jika PIN salah dimasukkan, dekripsi DEK via PIN harus ditolak dengan error yang jelas; verifikasi pemulihan via password harus berhasil membuka DEK yang sama dan mengizinkan set PIN baru.
3. Multi-Tenant Isolation: Pengguna A tidak boleh dapat melihat sesi GoPay, riwayat transaksi, tagihan QRIS, atau log dari Pengguna B.
4. Auto Table Initialization: Jika tabel PostgreSQL belum dibuat di database baru, inisialisasi skema harus berjalan otomatis saat startup tanpa memblokir server.
5. Backward Compatibility: Jika belum ada database URL yang dikonfigurasi saat proses build atau fallback lokal, Next.js build (`npm run build`) harus tetap lulus kompilasi.

---

### Task 1: Setup PostgreSQL Client, Drizzle Schema, and Connection Helper

**Files:**
- Modify: `dashboard-gopay-api-gateway/package.json`
- Create: `dashboard-gopay-api-gateway/src/lib/db/schema.ts`
- Create: `dashboard-gopay-api-gateway/src/lib/db/index.ts`
- Create: `dashboard-gopay-api-gateway/src/lib/db/migrate.ts`

**Interfaces:**
- Produces: `db`, `schema`, `initDatabaseSchema()`
- Tables: `usersTable`, `merchantSessionsTable`, `qrisOrdersTable`, `transactionsTable`, `activityLogsTable`

- [ ] **Step 1: Install `postgres` driver in `dashboard-gopay-api-gateway`**
  Run: `npm install postgres` inside `dashboard-gopay-api-gateway`.
- [ ] **Step 2: Implement Drizzle Schema in `src/lib/db/schema.ts`**
  Define tables `users`, `merchant_sessions`, `qris_orders`, `transactions`, and `activity_logs` using `pgTable`, `uuid`, `text`, `integer`, `timestamp`, `boolean`.
- [ ] **Step 3: Implement Database Client in `src/lib/db/index.ts`**
  Create connection pool using `postgres` and `drizzle(client, { schema })` with graceful fallback if `DATABASE_URL` is not yet set.
- [ ] **Step 4: Implement Auto Migration/Table Initializer in `src/lib/db/migrate.ts`**
  Execute `CREATE TABLE IF NOT EXISTS` for all tables so the application runs immediately without manual migration commands.
- [ ] **Step 5: Verify build**
  Run `npm run build` inside `dashboard-gopay-api-gateway`.

---

### Task 2: Cryptographic Zero-Knowledge Vault Utilities

**Files:**
- Create: `dashboard-gopay-api-gateway/src/lib/crypto/vault.ts`
- Create: `dashboard-gopay-api-gateway/src/lib/crypto/auth-crypto.ts`

**Interfaces:**
- Produces:
  - `computeBlindIndex(value: string, pepper?: string): string`
  - `hashPassword(password: string): { hash: string; salt: string }`
  - `verifyPassword(password: string, hash: string, salt: string): boolean`
  - `generateUserVaultKeys(pin: string, password: string): { encryptedDekByPin: string; encryptedDekByPassword: string; pinSalt: string; passwordSalt: string }`
  - `unlockDekWithPin(pin: string, encryptedDekByPin: string, pinSalt: string): string`
  - `unlockDekWithPassword(password: string, encryptedDekByPassword: string, passwordSalt: string): string`
  - `reEncryptDekWithNewPin(dek: string, newPin: string): { encryptedDekByPin: string; pinSalt: string }`
  - `encryptWithDek(plaintext: string, dek: string): string`
  - `decryptWithDek(ciphertext: string, dek: string): string`

- [ ] **Step 1: Implement password hashing and blind indexing in `src/lib/crypto/auth-crypto.ts`**
  Use Node.js standard `crypto.scryptSync` / `crypto.pbkdf2Sync` and `crypto.createHmac`.
- [ ] **Step 2: Implement envelope encryption and AES-256-GCM vault in `src/lib/crypto/vault.ts`**
  Use `crypto.randomBytes(32)` for DEK and `crypto.createCipheriv('aes-256-gcm', key, iv)`.
- [ ] **Step 3: Verify encryption/decryption roundtrip**
  Run quick node verification script to confirm zero-knowledge encryption and recovery via password.

---

### Task 3: Authentication API Routes & Session Management

**Files:**
- Create: `dashboard-gopay-api-gateway/src/lib/auth-session.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/register/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/login/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/unlock-pin/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/recover-pin/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/me/route.ts`
- Create: `dashboard-gopay-api-gateway/src/app/api/auth/logout/route.ts`

**Interfaces:**
- Produces:
  - `getCurrentUser(req: NextRequest): Promise<{ user: UserRecord; dek?: string } | null>`
  - `setAuthCookies(res: NextResponse, payload: SessionTokenPayload): void`
  - Endpoints:
    - `POST /api/auth/register`: body `{ name, username, email, phone_number, password, pin }`
    - `POST /api/auth/login`: body `{ identifier, password }`
    - `POST /api/auth/unlock-pin`: body `{ pin }`
    - `POST /api/auth/recover-pin`: body `{ password, new_pin }`
    - `GET /api/auth/me`: get authenticated user profile (decrypted)
    - `POST /api/auth/logout`: clear session cookies

- [ ] **Step 1: Implement session cookie token helper in `src/lib/auth-session.ts`**
- [ ] **Step 2: Implement Register API in `src/app/api/auth/register/route.ts`**
- [ ] **Step 3: Implement Login API in `src/app/api/auth/login/route.ts`** (supports email or phone number)
- [ ] **Step 4: Implement Unlock PIN & Recover PIN APIs in `src/app/api/auth/unlock-pin/` & `src/app/api/auth/recover-pin/`**
- [ ] **Step 5: Implement Me & Logout APIs**

---

### Task 4: UI Register Page, Login Page & PIN Modal

**Files:**
- Create: `dashboard-gopay-api-gateway/src/app/register/page.tsx`
- Create: `dashboard-gopay-api-gateway/src/app/login/page.tsx`
- Create: `dashboard-gopay-api-gateway/src/components/auth/PinUnlockModal.tsx`
- Modify: `dashboard-gopay-api-gateway/src/components/layout/Header.tsx` (add user profile pill & Logout button)

- [ ] **Step 1: Build Register Page (`src/app/register/page.tsx`)**
  Forms for *Name, Username, Email, Phone Number, Password, and 6-Digit PIN*. Tactile Ledger styling.
- [ ] **Step 2: Build Login Page (`src/app/login/page.tsx`)**
  Input for *Email or Phone Number* + *Password*, with smooth trigger for the PIN unlock modal upon success.
- [ ] **Step 3: Build PIN Unlock & Recovery Modal (`src/components/auth/PinUnlockModal.tsx`)**
  6-digit PIN keyboard/inputs + "Lupa PIN?" toggle for password-based recovery and reset.
- [ ] **Step 4: Update Header (`src/components/layout/Header.tsx`)**
  Display current logged-in username/name and a Sign Out button.

---

### Task 5: Multi-Tenant Data Persistence & Sesi GoPay Migration

**Files:**
- Create: `dashboard-gopay-api-gateway/src/lib/merchant-session-db.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/session-service.ts`
- Modify: `dashboard-gopay-api-gateway/src/lib/gopay-login-process.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/connect-gopay/submit-otp/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/token-status/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/create-qris/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/transactions/route.ts`
- Modify: `dashboard-gopay-api-gateway/src/app/api/logs/route.ts`

- [ ] **Step 1: Implement database session repository in `src/lib/merchant-session-db.ts`**
  Save and load GoPay tokens (`access_token`, `refresh_token`, `cookie`, `merchant_id`, `outlet_name`) encrypted with the user's DEK in `merchant_sessions` table.
- [ ] **Step 2: Update OTP submission to persist session into database instead of file**
  When OTP verification completes in `gopay-login-process.ts` / `submit-otp`, save the session payload into PostgreSQL `merchant_sessions` table for the current user and delete any temporary files.
- [ ] **Step 3: Wire QRIS orders, Transactions, and Activity Logs to PostgreSQL**
  Ensure `/api/create-qris`, `/api/transactions`, and `/api/logs` filter and record entries scoped strictly to `user_id`.

---

### Task 6: Verification & End-to-End Build

**Files:**
- Verification only

- [ ] **Step 1: Run linter and TypeScript compiler**
  `npm run lint` in `dashboard-gopay-api-gateway`.
- [ ] **Step 2: Run Next.js production build**
  `npm run build` in `dashboard-gopay-api-gateway`.
- [ ] **Step 3: Verify clean git status and route map**
  Check that all routes (`/login`, `/register`, `/transaksi`, `/qris`, `/logs`) are successfully generated.
