import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { fetchTransactionsData } from '@/lib/gopay-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  try {
    const now = new Date();
    const startOfMonthUnix = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
    );

    const merchantId = req.headers.get('x-gopay-merchant-id') || null;
    const userAgent = req.headers.get('user-agent');

    const result = await fetchTransactionsData({
      merchantId,
      startTimeUnix: startOfMonthUnix,
      pageSize: 100,
      userAgent,
    });

    return jsonResponse(result);
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
