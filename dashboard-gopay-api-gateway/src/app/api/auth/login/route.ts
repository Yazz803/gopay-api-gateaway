import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { initDatabaseSchema } from '@/lib/db/migrate';
import { computeBlindIndex, verifyPassword } from '@/lib/crypto/auth-crypto';
import { eq, or } from 'drizzle-orm';
import { setSessionCookie } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Email/Nomor HP dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

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

    const blindHash = computeBlindIndex(String(identifier));
    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // Query user by emailHash, phoneHash, or username
    const users = await db
      .select()
      .from(schema.usersTable)
      .where(
        or(
          eq(schema.usersTable.emailHash, blindHash),
          eq(schema.usersTable.phoneHash, blindHash),
          eq(schema.usersTable.username, cleanIdentifier)
        )
      )
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun dengan email/nomor HP tersebut tidak ditemukan.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = verifyPassword(String(password), user.passwordHash, user.passwordSalt);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi salah. Silakan periksa kembali.' },
        { status: 401 }
      );
    }

    // Create session (Vault is locked until PIN or recovery password is submitted)
    const res = NextResponse.json({
      success: true,
      requirePin: true,
      message: 'Kredensial valid. Silakan masukkan PIN 6-digit untuk membuka brankas data Anda.',
      user: {
        id: user.id,
        username: user.username,
      },
    });

    setSessionCookie(res, {
      userId: user.id,
      username: user.username,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Login Error]:', msg);
    return NextResponse.json(
      { success: false, message: 'Gagal melakukan verifikasi masuk.', error: msg },
      { status: 500 }
    );
  }
}
