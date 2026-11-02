import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { fetchTransactionsData } from '@/lib/gopay-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) return auth.response!;

  try {
    const merchantId = req.headers.get('x-gopay-merchant-id') || null;
    const startTime = req.nextUrl.searchParams.get('startTime');
    const endTime = req.nextUrl.searchParams.get('endTime');
    const pageSize = req.nextUrl.searchParams.get('pageSize') || '20';
    const userAgent = req.headers.get('user-agent');

    const result = await fetchTransactionsData({
      merchantId,
      startTimeUnix: startTime,
      endTimeUnix: endTime,
      pageSize,
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
