import postgres from 'postgres';
import { getDatabaseUrl } from './index';

let migrationExecuted = false;

export async function initDatabaseSchema(): Promise<boolean> {
  if (migrationExecuted) return true;
  const url = getDatabaseUrl();
  if (!url) {
    console.warn('[DB Migrate] DATABASE_URL tidak ditemukan. Migrasi diskip.');
    return false;
  }

  const sql = postgres(url, { max: 1 });
  try {
    // 1. Enable uuid-ossp or pgcrypto if possible
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.catch(() => {});
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`.catch(() => {});

    // 2. Table users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        api_key TEXT UNIQUE,
        qris_static TEXT,
        encrypted_qris_static TEXT,
        email_hash TEXT NOT NULL UNIQUE,
        phone_hash TEXT NOT NULL UNIQUE,
        encrypted_email TEXT NOT NULL,
        encrypted_phone_number TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        encrypted_dek_by_pin TEXT NOT NULL,
        encrypted_dek_by_password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // Ensure columns exist if table was created previously
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;`.catch(() => {});
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS qris_static TEXT;`.catch(() => {});
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_qris_static TEXT;`.catch(() => {});

    // 3. Table merchant_sessions
    await sql`
      CREATE TABLE IF NOT EXISTS merchant_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        encrypted_merchant_id TEXT,
        encrypted_outlet_name TEXT,
        encrypted_phone_number TEXT,
        encrypted_access_token TEXT,
        encrypted_refresh_token TEXT,
        encrypted_cookie TEXT,
        token_status TEXT DEFAULT 'invalid',
        expires_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 4. Table qris_orders
    await sql`
      CREATE TABLE IF NOT EXISTS qris_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        qris_id TEXT NOT NULL,
        trx_id TEXT NOT NULL,
        nominal INTEGER NOT NULL,
        encrypted_qris_payload TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING' NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 5. Table transactions
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gojek_transaction_id TEXT,
        order_id TEXT,
        nominal INTEGER NOT NULL,
        metode_bayar TEXT,
        issuer TEXT,
        status TEXT DEFAULT 'success' NOT NULL,
        waktu_transaksi TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 6. Table activity_logs
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        log_type TEXT NOT NULL,
        encrypted_message TEXT NOT NULL,
        details_json TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    migrationExecuted = true;
    console.log('[DB Migrate] Skema tabel PostgreSQL berhasil diverifikasi & diinisialisasi.');
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB Migrate Error]:', msg);
    return false;
  } finally {
    await sql.end();
  }
}
