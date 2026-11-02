import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { generateDynamicQRIS } from '@/lib/emvco';
import { gatewayState, logActivity } from '@/lib/gateway-state';

export const dynamic = 'force-dynamic';

const QRIS_EXPIRY_MS = 5 * 60 * 1000; // 5 menit

async function handleCreateQris(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) return auth.response!;

  let amount: string | number | null = null;
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      amount = (body?.amount as string | number) ?? null;
    } catch {
      // Body may not be valid json or empty
    }
  }

  if (!amount) {
    amount = req.nextUrl.searchParams.get('amount');
  }

  const parsedAmount = parseInt(String(amount), 10);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return jsonResponse(
      { success: false, message: 'Nominal pembayaran tidak valid (gunakan ?amount=...)' },
      { status: 400 }
    );
  }

  const staticTemplate = process.env.QRIS_STATIC;
  if (!staticTemplate) {
    return jsonResponse(
      { success: false, message: 'QRIS_STATIC belum dikonfigurasi di .env' },
      { status: 500 }
    );
  }

  const dynamicCode = generateDynamicQRIS(staticTemplate, parsedAmount);
  if (!dynamicCode) {
    return jsonResponse(
      { success: false, message: 'Gagal membuat string QRIS dinamis dari QRIS_STATIC' },
      { status: 500 }
    );
  }

  const qrisId = Math.random().toString(36).substring(2, 10);
  const trxId = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + QRIS_EXPIRY_MS);
  const createdAt = new Date();

  gatewayState.qrisStore.set(qrisId, {
    data: dynamicCode,
    amount: parsedAmount,
    trxId,
    expiresAt,
    createdAt,
    status: 'PENDING',
  });

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  const publicUrl = `${protocol}://${host}/qr/${qrisId}`;

  logActivity('INFO', `QRIS Dinamis dibuat | TRX-ID: ${trxId} | Nominal: Rp ${parsedAmount}`);

  return jsonResponse({
    success: true,
    data: {
      qris_id: qrisId,
      trx_id: trxId,
      qris_url: publicUrl,
      qris_code: dynamicCode,
      amount: parsedAmount,
      expires_at: expiresAt.toISOString(),
      expires_in: '5 menit',
    },
  });
}

export async function GET(req: NextRequest) {
  return handleCreateQris(req);
}

export async function POST(req: NextRequest) {
  return handleCreateQris(req);
}

export async function OPTIONS() {
  return handleCorsOptions();
}
