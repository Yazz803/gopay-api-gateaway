import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { verifyPayment } from '@/lib/gopay-api';
import { logActivity } from '@/lib/gateway-state';
import { getAuthenticatedUser } from '@/lib/auth-session';
import {
  getMerchantSessionFromDb,
  getActiveSessionForUser,
  recordTransactionToDb,
} from '@/lib/merchant-session-db';
import { buildHeadersFromSession } from '@/lib/session-service';

export const dynamic = 'force-dynamic';

async function handleCheckPayment(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  let amount: string | number | null = null;
  let startTime: string | null = null;
  let scopeId: string | null = null;

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      amount = (body?.amount as string | number) ?? null;
      startTime = ((body?.startTime || body?.start_time) as string) ?? null;
      scopeId = ((body?.trx_id || body?.qris_id) as string) ?? null;
    } catch {
      // Body may be empty or not json
    }
  }

  if (!amount) {
    amount = req.nextUrl.searchParams.get('amount');
  }
  if (!startTime) {
    startTime = req.nextUrl.searchParams.get('startTime') || req.nextUrl.searchParams.get('start_time');
  }
  if (!scopeId) {
    scopeId = req.nextUrl.searchParams.get('trx_id') || req.nextUrl.searchParams.get('qris_id');
  }

  const parsedAmount = parseInt(String(amount), 10);
  if (!amount || isNaN(parsedAmount)) {
    return jsonResponse(
      { success: false, message: 'Nominal pembayaran tidak valid' },
      { status: 400 }
    );
  }

  try {
    let merchantId = req.headers.get('x-gopay-merchant-id') || null;
    const userAgent = req.headers.get('user-agent');
    let customHeaders: Record<string, string> | null = null;

    const authUser = await getAuthenticatedUser(req).catch(() => null);
    const targetUserId = authUser?.id || auth.userId;

    if (authUser?.id && authUser.unlockedDek) {
      try {
        const dbSession = await getMerchantSessionFromDb(authUser.id, authUser.unlockedDek);
        if (dbSession && dbSession.access_token) {
          customHeaders = buildHeadersFromSession(dbSession, userAgent);
          if (dbSession.merchant_id && !merchantId) {
            merchantId = String(dbSession.merchant_id);
          }
        }
      } catch {
        // ignore
      }
    } else if (targetUserId) {
      const cached = getActiveSessionForUser(targetUserId);
      if (cached) {
        customHeaders = {
          ...cached.headers,
          ...(userAgent ? { 'User-Agent': userAgent } : {}),
        };
        if (cached.merchantId && !merchantId) {
          merchantId = cached.merchantId;
        }
      }
    }

    const matchedTransaction = await verifyPayment(
      parsedAmount,
      startTime,
      merchantId,
      userAgent,
      scopeId,
      customHeaders
    );

    if (matchedTransaction) {
      if (targetUserId) {
        await recordTransactionToDb(targetUserId, {
          gojekTransactionId: matchedTransaction.id,
          orderId: matchedTransaction.order_id,
          nominal: matchedTransaction.amount,
          metodeBayar: matchedTransaction.payment_type,
          issuer: matchedTransaction.payer_issuer,
          status: 'success',
          waktuTransaksi: matchedTransaction.transaction_time ? new Date(matchedTransaction.transaction_time) : new Date(),
        }).catch(() => null);
      }

      logActivity(
        'SUCCESS',
        `Pembayaran terverifikasi lunas untuk nominal Rp ${parsedAmount}`,
        matchedTransaction
      );
      return jsonResponse({
        success: true,
        paid: true,
        transaction: matchedTransaction,
      });
    } else {
      return jsonResponse({
        success: true,
        paid: false,
        message: 'Pembayaran belum ditemukan atau sudah pernah diklaim',
      });
    }
  } catch (err: unknown) {
    const errorObj = err as { response?: { status?: number; data?: unknown }; message?: string };
    const errorDetail = errorObj.response
      ? `HTTP ${errorObj.response.status}: ${JSON.stringify(errorObj.response.data)}`
      : errorObj.message || 'Unknown error';
    logActivity('ERROR', `Gagal periksa pembayaran: ${errorDetail}`);
    return jsonResponse(
      {
        success: false,
        message: 'Gagal mengambil data transaksi dari API GoPay',
        error: errorDetail,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCheckPayment(req);
}

export async function POST(req: NextRequest) {
  return handleCheckPayment(req);
}

export async function OPTIONS() {
  return handleCorsOptions();
}
