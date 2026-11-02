import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { fetchTransactionsData } from '@/lib/gopay-api';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { recordTransactionToDb, getMerchantSessionFromDb, getTransactionsFromDb } from '@/lib/merchant-session-db';
import { buildHeadersFromSession } from '@/lib/session-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  try {
    const merchantId = req.headers.get('x-gopay-merchant-id') || null;
    const startTime = req.nextUrl.searchParams.get('startTime');
    const endTime = req.nextUrl.searchParams.get('endTime');
    const pageSize = req.nextUrl.searchParams.get('pageSize') || '20';
    const userAgent = req.headers.get('user-agent');

    const authUser = await getAuthenticatedUser(req);
    let customHeaders: Record<string, string> | null = null;
    let userMerchantId: string | null = merchantId;

    if (authUser?.id && authUser.unlockedDek) {
      try {
        const dbSession = await getMerchantSessionFromDb(authUser.id, authUser.unlockedDek);
        if (dbSession && dbSession.access_token) {
          customHeaders = buildHeadersFromSession(dbSession, userAgent);
          if (dbSession.merchant_id) {
            userMerchantId = String(dbSession.merchant_id);
          }
        }
      } catch (e) {
        console.error('[Transactions DB session load error]:', e);
      }
    }

    let result = null;
    try {
      result = await fetchTransactionsData({
        merchantId: userMerchantId,
        startTimeUnix: startTime,
        endTimeUnix: endTime,
        pageSize,
        userAgent,
        customHeaders,
      });

      if (authUser?.id && result?.data?.transactions) {
        try {
          for (const tx of result.data.transactions) {
            await recordTransactionToDb(authUser.id, {
              gojekTransactionId: tx.transaction_id,
              orderId: tx.order_id,
              nominal: tx.amount,
              metodeBayar: tx.issuer,
              issuer: tx.issuer,
              status: tx.status,
              waktuTransaksi: tx.time ? new Date(tx.time) : new Date(),
            });
          }
        } catch (dbErr) {
          console.error('[Transactions DB persist Error]:', dbErr);
        }
      }
    } catch (fetchErr) {
      console.warn('[Fetch live transactions failed, checking DB fallback]:', fetchErr);
    }

    // Jika live fetch berhasil dan ada data transaksi
    if (result && result.data && Array.isArray(result.data.transactions) && result.data.transactions.length > 0) {
      return jsonResponse(result);
    }

    // Ambil data transaksi tersimpan dari PostgreSQL sebagai sumber utama / fallback
    if (authUser?.id) {
      const dbTx = await getTransactionsFromDb(authUser.id);
      return jsonResponse({
        success: true,
        data: {
          transactions: dbTx,
        },
        total: dbTx.length,
        source: 'database',
      });
    }

    return jsonResponse(result || { success: true, data: { transactions: [] }, total: 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
