import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from './auth-session';
import { getDb, schema, isDatabaseConfigured } from './db';
import { eq } from 'drizzle-orm';

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

export function jsonResponse(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export async function validateApiKey(req: NextRequest): Promise<{ valid: boolean; userId?: string; response?: NextResponse }> {
  // 1. Cek sesi login cookie web app pengguna
  const user = await getAuthenticatedUser(req).catch(() => null);
  if (user) {
    return { valid: true, userId: user.id };
  }

  // 2. Cek API Key dari header atau query parameter
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('X-Api-Key') ||
    req.nextUrl.searchParams.get('api_key') ||
    req.nextUrl.searchParams.get('apikey');

  const expectedEnvKey = process.env.API_KEY;
  if (expectedEnvKey && apiKey === expectedEnvKey) {
    return { valid: true };
  }

  if (apiKey && isDatabaseConfigured()) {
    const db = getDb();
    if (db) {
      try {
        const users = await db
          .select({ id: schema.usersTable.id })
          .from(schema.usersTable)
          .where(eq(schema.usersTable.apiKey, apiKey.trim()))
          .limit(1);

        if (users.length > 0) {
          return { valid: true, userId: users[0].id };
        }
      } catch {
        // DB lookup failure fallback
      }
    }
  }

  return {
    valid: false,
    response: jsonResponse(
      { success: false, message: 'Autentikasi Gagal: Sesi masuk atau API Key tidak valid' },
      { status: 401 }
    ),
  };
}
