import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { getSessionPayload, setSessionCookie } from '@/lib/auth-session';
import { unlockDekWithPin } from '@/lib/crypto/vault';
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
    const pin = String(body.pin || '').trim();

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: 'PIN harus berupa 6 digit angka.' },
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

    // Try to unlock DEK using PIN
    let dek: string;
    try {
      dek = unlockDekWithPin(pin, user.encryptedDekByPin, user.pinSalt);
    } catch {
      return NextResponse.json(
        { success: false, message: 'PIN salah. Silakan coba lagi atau gunakan opsi pemulihan.' },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      success: true,
      isVaultUnlocked: true,
      message: 'Brankas data Anda berhasil dibuka.',
    });

    // Update cookie to include unlocked DEK
    setSessionCookie(res, {
      userId: user.id,
      username: user.username,
      unlockedDek: dek,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Unlock PIN Error]:', msg);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses pembukaan PIN.', error: msg },
      { status: 500 }
    );
  }
}
