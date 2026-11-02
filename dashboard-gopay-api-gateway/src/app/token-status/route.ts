import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { checkTokenStatus } from '@/lib/gopay-api';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { getMerchantSessionFromDb } from '@/lib/merchant-session-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  const userAgent = req.headers.get('user-agent');
  const authUser = await getAuthenticatedUser(req);

  // If user is authenticated and has session stored in PostgreSQL
  if (authUser?.id) {
    if (!authUser.isVaultUnlocked || !authUser.unlockedDek) {
      return jsonResponse({
        success: false,
        active: false,
        data: {
          token_status: 'locked',
          message: 'Brankas data terkunci. Masukkan PIN untuk memuat sesi GoPay.',
        },
      });
    }

    try {
      const dbSession = await getMerchantSessionFromDb(authUser.id, authUser.unlockedDek);
      if (dbSession && dbSession.access_token) {
        return jsonResponse({
          success: true,
          active: true,
          account: {
            name: (dbSession.outlet_name as string) || 'Akun GoPay Toko',
            merchant_id: (dbSession.merchant_id as string) || undefined,
            phone: (dbSession.phone_number as string) || undefined,
          },
          data: {
            token_status: 'valid',
            message: 'Token dan Sesi GoPay Merchant Aktif (Tersimpan di PostgreSQL)',
          },
        });
      }
    } catch (err) {
      console.error('[TokenStatus DB Error]:', err);
    }
  }

  const result = await checkTokenStatus(userAgent);
  return jsonResponse(result);
}

export async function OPTIONS() {
  return handleCorsOptions();
}
