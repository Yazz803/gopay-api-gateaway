import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { submitGopayOtp } from '@/lib/gopay-login-process';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { loadSession } from '@/lib/session-service';
import { saveMerchantSessionToDb } from '@/lib/merchant-session-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const otp = body.otp || body.code;

    if (!otp) {
      return jsonResponse(
        { success: false, message: 'Kode OTP wajib diisi.' },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(req);
    const result = await submitGopayOtp(String(otp));

    // If authenticated user with unlocked vault, persist to PostgreSQL
    if (result.success && authUser?.id && authUser.unlockedDek) {
      try {
        const rawSession = loadSession();
        if (rawSession) {
          await saveMerchantSessionToDb(authUser.id, authUser.unlockedDek, rawSession);
        }
      } catch (dbErr) {
        console.error('[SubmitOTP DB Sync Error]:', dbErr);
      }
    }

    return jsonResponse(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(
      { success: false, message: 'Gagal memverifikasi OTP.', error: msg },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
