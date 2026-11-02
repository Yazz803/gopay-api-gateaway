import { NextRequest } from 'next/server';
import { handleCorsOptions, jsonResponse } from '@/lib/auth';
import { gatewayState, logActivity } from '@/lib/gateway-state';
import { verifyPayment } from '@/lib/gopay-api';

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

  if (Date.now() > qris.expiresAt.getTime()) {
    gatewayState.qrisStore.delete(qrisId);
    return jsonResponse({
      success: false,
      paid: false,
      status: 'EXPIRED',
      message: 'QRIS sudah kedaluwarsa',
    });
  }

  try {
    const userAgent = req.headers.get('user-agent');
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
