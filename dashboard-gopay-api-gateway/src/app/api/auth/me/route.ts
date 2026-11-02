import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, message: 'Belum masuk ke akun.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        apiKey: user.apiKey,
        qrisStatic: user.qrisStatic,
        hasQrisStatic: Boolean(user.qrisStatic),
        createdAt: user.createdAt,
        isVaultUnlocked: user.isVaultUnlocked,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, authenticated: false, message: 'Gagal mengambil data user.', error: msg },
      { status: 500 }
    );
  }
}
