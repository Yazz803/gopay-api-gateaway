import { NextRequest } from 'next/server';
import { handleCorsOptions, jsonResponse } from '@/lib/auth';
import { gatewayState, logActivity } from '@/lib/gateway-state';
import { verifyPayment, finalizeQris, STATUS_COOLDOWN_MS } from '@/lib/gopay-api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: qrisId } = await context.params;
  const qris = gatewayState.qrisStore.get(qrisId);

  if (!qris) {
    return jsonResponse({
      success: false,
      status: 'NOT_FOUND',
      message: 'QRIS tidak ditemukan',
    });
  }

  if (qris.status === 'PAID') {
    return jsonResponse({
      success: true,
      paid: true,
      status: 'PAID',
      transaction: qris.transaction,
    });
  }

  const userAgent = req.headers.get('user-agent');

  if (Date.now() > qris.expiresAt.getTime()) {
    // [PATCH manual-check] Satu cek terakhir sebelum dinyatakan kedaluwarsa,
    // untuk menangkap pembayaran yang masuk di detik-detik terakhir masa berlaku.
    const finalMatch = await finalizeQris(qrisId, userAgent);
    if (finalMatch) {
      return jsonResponse({
        success: true,
        paid: true,
        status: 'PAID',
        transaction: finalMatch,
      });
    }
    return jsonResponse({
      success: false,
      paid: false,
      status: 'EXPIRED',
      message: 'QRIS sudah kedaluwarsa',
    });
  }

  // [PATCH manual-check] Cooldown server per QRIS: cek berulang dalam jeda
  // STATUS_COOLDOWN_MS dijawab dari status terakhir TANPA memanggil API Gojek lagi.
  const nowMs = Date.now();
  if (qris.lastStatusCheckAt && nowMs - qris.lastStatusCheckAt < STATUS_COOLDOWN_MS) {
    const retryAfter = Math.ceil((STATUS_COOLDOWN_MS - (nowMs - qris.lastStatusCheckAt)) / 1000);
    return jsonResponse({
      success: true,
      paid: false,
      status: 'PENDING',
      cached: true,
      retry_after_seconds: retryAfter,
      message: `Terlalu cepat, coba lagi dalam ${retryAfter} detik`,
    });
  }
  qris.lastStatusCheckAt = nowMs;
  gatewayState.qrisStore.set(qrisId, qris);

  try {
    const matched = await verifyPayment(
      qris.amount,
      qris.createdAt,
      null,
      userAgent,
      qris.trxId || qrisId
    );

    if (matched) {
      qris.status = 'PAID';
      qris.transaction = matched;
      gatewayState.qrisStore.set(qrisId, qris);
      logActivity(
        'SUCCESS',
        `Pembayaran QRIS ID ${qrisId} terverifikasi lunas untuk nominal Rp ${qris.amount}`
      );
      return jsonResponse({
        success: true,
        paid: true,
        status: 'PAID',
        transaction: matched,
      });
    }

    return jsonResponse({
      success: true,
      paid: false,
      status: 'PENDING',
      retry_after_seconds: Math.ceil(STATUS_COOLDOWN_MS / 1000),
      message: 'Belum ada pembayaran masuk',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({
      success: false,
      paid: false,
      status: 'PENDING',
      message,
    });
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
