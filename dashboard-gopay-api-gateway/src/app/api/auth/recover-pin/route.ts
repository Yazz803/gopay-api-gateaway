import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { getSessionPayload, setSessionCookie } from '@/lib/auth-session';
import { verifyPassword } from '@/lib/crypto/auth-crypto';
import { unlockDekWithPassword, reEncryptDekWithNewPin } from '@/lib/crypto/vault';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi masuk tidak ditemukan. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = String(body.password || '');
    const newPin = String(body.new_pin || '').trim();

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi akun wajib diisi untuk verifikasi pemulihan.' },
        { status: 400 }
      );
    }

    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, message: 'PIN baru harus berupa 6 digit angka.' },
        { status: 400 }
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Database belum dikonfigurasi.' },
        { status: 500 }
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Koneksi database tidak tersedia.' },
        { status: 500 }
      );
    }

    const users = await db
      .select()
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, session.userId))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    const user = users[0];

    // 1. Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi salah. Verifikasi pemulihan ditolak.' },
        { status: 401 }
      );
    }

    // 2. Unlock DEK with password
    let dek: string;
    try {
      dek = unlockDekWithPassword(password, user.encryptedDekByPassword, user.passwordSalt);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Gagal mendekripsi brankas dengan kata sandi tersebut.' },
        { status: 400 }
      );
    }

    // 3. Re-encrypt DEK with new PIN
    const { encryptedDekByPin, pinSalt } = reEncryptDekWithNewPin(dek, newPin);

    // 4. Update in database
    await db
      .update(schema.usersTable)
      .set({
        encryptedDekByPin,
        pinSalt,
        updatedAt: new Date(),
      })
      .where(eq(schema.usersTable.id, user.id));

    const res = NextResponse.json({
      success: true,
      isVaultUnlocked: true,
      message: 'PIN baru berhasil disimpan dan brankas data Anda telah dibuka!',
    });

    setSessionCookie(res, {
      userId: user.id,
      username: user.username,
      unlockedDek: dek,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Recover PIN Error]:', msg);
    return NextResponse.json(
      { success: false, message: 'Gagal melakukan pemulihan PIN.', error: msg },
      { status: 500 }
    );
  }
}
