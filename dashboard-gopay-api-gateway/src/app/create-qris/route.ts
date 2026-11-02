import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { generateDynamicQRIS } from '@/lib/emvco';
import { gatewayState, logActivity } from '@/lib/gateway-state';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { finalizeQris } from '@/lib/gopay-api';
import { recordQrisOrderToDb, recordActivityLogToDb } from '@/lib/merchant-session-db';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const QRIS_EXPIRY_MS = 5 * 60 * 1000; // 5 menit

async function handleCreateQris(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  let amount: string | number | null = null;
  let requestedTrxId: string | null = null;
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      amount = (body?.amount as string | number) ?? null;
      requestedTrxId = ((body?.trx_id as string) || '').trim() || null;
    } catch {
      // Body may not be valid json or empty
    }
  }
  if (!requestedTrxId) {
    requestedTrxId = req.nextUrl.searchParams.get('trx_id');
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

  const authUser = await getAuthenticatedUser(req).catch(() => null);
  let staticTemplate: string | null = authUser?.qrisStatic || null;

  const targetUserId = authUser?.id || auth.userId;

  if (!staticTemplate && targetUserId && isDatabaseConfigured()) {
    const db = getDb();
    if (db) {
      try {
        const u = await db
          .select({ qrisStatic: schema.usersTable.qrisStatic })
          .from(schema.usersTable)
          .where(eq(schema.usersTable.id, targetUserId))
          .limit(1);
        if (u.length > 0 && u[0].qrisStatic) {
          staticTemplate = u[0].qrisStatic;
        }
      } catch {
        // DB read error fallback
      }
    }
  }

  if (!staticTemplate) {
    staticTemplate = process.env.QRIS_STATIC || null;
  }

  if (!staticTemplate) {
    return jsonResponse(
      {
        success: false,
        message:
          'QRIS Statis toko belum diunggah. Silakan unggah foto QRIS Statis toko Anda terlebih dahulu sebelum membuat kode QRIS dinamis.',
      },
      { status: 400 }
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
  // [PATCH] Hormati trx_id dari pemanggil (mis. nomor nota dari dashboard) selama aman
  // dan belum dipakai QRIS pending lain. Sebelumnya field ini diam-diam diabaikan server
  // dan selalu diganti trx acak, sehingga catatan/nota pengguna tidak pernah tercatat.
  let trxId = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  if (requestedTrxId) {
    const candidate = requestedTrxId.replace(/[^\w-]/g, '').substring(0, 32);
    const alreadyUsed = [...gatewayState.qrisStore.values()].some(
      (item) => item.trxId === candidate && item.status === 'PENDING'
    );
    if (candidate && !alreadyUsed) {
      trxId = candidate;
    }
  }
  const expiresAt = new Date(Date.now() + QRIS_EXPIRY_MS);
  const createdAt = new Date();

  const activeUserId = authUser?.id || auth.userId;

  gatewayState.qrisStore.set(qrisId, {
    userId: activeUserId,
    data: dynamicCode,
    amount: parsedAmount,
    trxId,
    expiresAt,
    createdAt,
    status: 'PENDING',
  });

  // [PATCH manual-check] Satu kali cek terakhir terjadwal tepat setelah QRIS kedaluwarsa,
  // supaya pembayaran di detik terakhir tetap tercatat walau pembeli tidak pernah
  // menekan tombol cek status.
  const finalTimer = setTimeout(() => {
    finalizeQris(qrisId).catch((err: unknown) =>
      logActivity(
        'ERROR',
        `Final check QRIS ${qrisId} gagal: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    );
  }, QRIS_EXPIRY_MS + 2000);
  if (typeof finalTimer.unref === 'function') finalTimer.unref();

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  const publicUrl = `${protocol}://${host}/qr/${qrisId}`;

  logActivity('INFO', `QRIS Dinamis dibuat | TRX-ID: ${trxId} | Nominal: Rp ${parsedAmount}`);

  if (activeUserId) {
    try {
      await recordQrisOrderToDb(activeUserId, {
        qrisId,
        trxId,
        nominal: parsedAmount,
        payload: dynamicCode,
        expiresAt,
        status: 'PENDING',
      });
      await recordActivityLogToDb(activeUserId, {
        logType: 'INFO',
        message: `QRIS Dinamis dibuat | TRX-ID: ${trxId} | Nominal: Rp ${parsedAmount}`,
        details: { qrisId, trxId, amount: parsedAmount },
      });
    } catch (dbErr) {
      console.error('[CreateQris DB Persist Error]:', dbErr);
    }
  }

  return jsonResponse({
    success: true,
    status: 'PENDING',
    data: {
      qris_id: qrisId,
      trx_id: trxId,
      qris_url: publicUrl,
      qris_code: dynamicCode,
      amount: parsedAmount,
      expires_at: expiresAt.toISOString(),
      expires_in: '5 menit',
    },
    qris_code: dynamicCode,
    amount: parsedAmount,
    trx_id: trxId,
    expires_at: expiresAt.toISOString(),
    check_status_url: publicUrl,
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
