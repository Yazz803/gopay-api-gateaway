import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { gatewayState } from '@/lib/gateway-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) return auth.response!;

  return jsonResponse({
    success: true,
    logs: gatewayState.activityLogs,
  });
}

export async function OPTIONS() {
  return handleCorsOptions();
}
