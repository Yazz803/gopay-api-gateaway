import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { requestGopayOtp } from '@/lib/gopay-login-process';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const phone = body.phone || body.phone_number;

    if (!phone) {
      return jsonResponse(
        { success: false, message: 'Nomor HP GoBiz/GoFood wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await requestGopayOtp(String(phone));
    return jsonResponse(result, { status: result.success ? 200 : 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(
      { success: false, message: 'Gagal memproses permintaan OTP.', error: msg },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
