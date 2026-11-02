import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { checkTokenStatus } from '@/lib/gopay-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) return auth.response!;

  const userAgent = req.headers.get('user-agent');
  const result = await checkTokenStatus(userAgent);
  return jsonResponse(result);
}

export async function OPTIONS() {
  return handleCorsOptions();
}
