import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { initDatabaseSchema } from '@/lib/db/migrate';
import { computeBlindIndex, hashPassword } from '@/lib/crypto/auth-crypto';
import { generateUserVaultKeys, encryptWithDek } from '@/lib/crypto/vault';
import { eq, or } from 'drizzle-orm';
import { setSessionCookie } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, username, email, phone_number, password, pin } = body;

    if (!name || !username || !email || !phone_number || !password || !pin) {
      return NextResponse.json(
        { success: false, message: 'Semua kolom wajib diisi (name, username, email, phone_number, password, pin).' },
        { status: 400 }
      );
    }

    if (String(pin).length !== 6 || !/^\d{6}$/.test(String(pin))) {
      return NextResponse.json(
        { success: false, message: 'PIN harus berupa 6 digit angka.' },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const emailHash = computeBlindIndex(String(email));
    const phoneHash = computeBlindIndex(String(phone_number));

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'DATABASE_URL belum dikonfigurasi di environment server.' },
        { status: 500 }
      );
    }

    await initDatabaseSchema();
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Koneksi database PostgreSQL tidak tersedia.' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(schema.usersTable)
      .where(
        or(
          eq(schema.usersTable.username, cleanUsername),
          eq(schema.usersTable.emailHash, emailHash),
          eq(schema.usersTable.phoneHash, phoneHash)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0];
      let msg = 'Akun dengan data tersebut sudah terdaftar.';
      if (match.username === cleanUsername) msg = 'Username sudah digunakan oleh akun lain.';
      else if (match.emailHash === emailHash) msg = 'Email sudah terdaftar.';
      else if (match.phoneHash === phoneHash) msg = 'Nomor HP sudah terdaftar.';
      return NextResponse.json({ success: false, message: msg }, { status: 409 });
    }

    // 1. Password hash
    const { hash: passwordHash, salt: passwordSalt } = hashPassword(String(password));

    // 2. Generate Dual-Slot DEK
    const vaultKeys = generateUserVaultKeys(String(pin), String(password));

    // 3. Encrypt personal data with DEK
    const encryptedName = encryptWithDek(String(name).trim(), vaultKeys.dek);
    const encryptedEmail = encryptWithDek(String(email).trim().toLowerCase(), vaultKeys.dek);
    const encryptedPhone = encryptWithDek(String(phone_number).trim(), vaultKeys.dek);

    // 4. Generate Unique API Key for user
    const apiKey = 'gopay_' + crypto.randomBytes(20).toString('hex');

    // 5. Insert into database
    const [inserted] = await db
      .insert(schema.usersTable)
      .values({
        name: encryptedName,
        username: cleanUsername,
        apiKey,
        emailHash,
        phoneHash,
        encryptedEmail,
        encryptedPhoneNumber: encryptedPhone,
        passwordHash,
        passwordSalt,
        pinSalt: vaultKeys.pinSalt,
        encryptedDekByPin: vaultKeys.encryptedDekByPin,
        encryptedDekByPassword: vaultKeys.encryptedDekByPassword,
      })
      .returning();

    const res = NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Silakan masuk ke akun Anda.',
      user: {
        id: inserted.id,
        username: inserted.username,
        apiKey: inserted.apiKey,
      },
    });

    // Optional: Log in immediately with unlocked DEK
    setSessionCookie(res, {
      userId: inserted.id,
      username: inserted.username,
      unlockedDek: vaultKeys.dek,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Register Error]:', msg);
    return NextResponse.json(
      { success: false, message: 'Gagal melakukan pendaftaran akun.', error: msg },
      { status: 500 }
    );
  }
}
