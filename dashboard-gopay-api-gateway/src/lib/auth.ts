import { NextRequest, NextResponse } from 'next/server';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-Api-Key, x-gopay-merchant-id',
};

export function handleCorsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function jsonResponse(data: any, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function validateApiKey(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('X-Api-Key') ||
    req.nextUrl.searchParams.get('api_key') ||
    req.nextUrl.searchParams.get('apikey');

  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.warn('[AUTH WARNING] API_KEY belum dikonfigurasi di environment variable');
  }

  if (!apiKey || (expectedKey && apiKey !== expectedKey)) {
    return {
      valid: false,
      response: jsonResponse(
        { success: false, message: 'Autentikasi Gagal: API Key tidak valid' },
        { status: 401 }
      ),
    };
  }

  return { valid: true };
}
