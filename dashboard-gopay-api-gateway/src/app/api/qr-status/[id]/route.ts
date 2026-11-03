import { NextRequest } from 'next/server';
import { handleCorsOptions, jsonResponse } from '@/lib/auth';
import { gatewayState, logActivity } from '@/lib/gateway-state';
import { verifyPayment, finalizeQris, STATUS_COOLDOWN_MS } from '@/lib/gopay-api';
import { getAuthenticatedUser } from '@/lib/auth-session';
import {
  getMerchantSessionFromDb,
  getActiveSessionForUser,
  recordTransactionToDb,
} from '@/lib/merchant-session-db';
import { buildHeadersFromSession } from '@/lib/session-service';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { dispatchPaymentWebhook } from '@/lib/webhook-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let qrisId = id;
  let qris = gatewayState.qrisStore.get(qrisId);

  // If not found by key, search by trxId in memory
  if (!qris) {
    for (const [key, item] of gatewayState.qrisStore.entries()) {
      if (item.trxId === id) {
        qris = item;
        qrisId = key;
        break;
      }
    }
  }

  // If still not found, check DB orders table (in case server hot-reloaded)
  if (!qris && isDatabaseConfigured()) {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.qrisOrdersTable)
          .where(
            or(
              eq(schema.qrisOrdersTable.qrisId, id),
              eq(schema.qrisOrdersTable.trxId, id)
            )
          )
          .limit(1);

        if (rows.length > 0) {
          const row = rows[0];
          qrisId = row.qrisId;
          qris = {
            userId: row.userId,
            data: '',
            amount: row.nominal,
            trxId: row.trxId,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            status: row.status as 'PENDING' | 'PAID' | 'EXPIRED',
          };
          gatewayState.qrisStore.set(qrisId, qris);
        }
      }
    } catch (dbErr) {
      console.error('[DB QRIS Order Lookup Error]:', dbErr);
    }
  }

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
  let customHeaders: Record<string, string> | null = null;
  let userMerchantId: string | null = null;

  // 1. Try to load authenticated user session from cookie
  try {
    const authUser = await getAuthenticatedUser(req);
    if (authUser?.id && authUser.unlockedDek) {
      const dbSession = await getMerchantSessionFromDb(authUser.id, authUser.unlockedDek);
      if (dbSession && dbSession.access_token) {
        customHeaders = buildHeadersFromSession(dbSession, userAgent);
        if (dbSession.merchant_id) {
          userMerchantId = String(dbSession.merchant_id);
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. If no cookie session, check cached active session for qris.userId
  if (!customHeaders && qris.userId) {
    const cached = getActiveSessionForUser(qris.userId);
    if (cached) {
      customHeaders = {
        ...cached.headers,
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      };
      userMerchantId = cached.merchantId || null;
    }
  }

  if (Date.now() > qris.expiresAt.getTime()) {
    // [PATCH manual-check] Satu cek terakhir sebelum dinyatakan kedaluwarsa,
    // untuk menangkap pembayaran yang masuk di detik-detik terakhir masa berlaku.
    const finalMatch = await finalizeQris(qrisId, userAgent, customHeaders, userMerchantId);
    if (finalMatch) {
      if (qris.userId) {
        const fm = finalMatch as { id: string; order_id: string; amount: number; payment_type?: string; payer_issuer?: string; issuer?: string; transaction_time?: string };
        await recordTransactionToDb(qris.userId, {
          gojekTransactionId: fm.id,
          orderId: fm.order_id,
          nominal: fm.amount,
          metodeBayar: fm.payment_type,
          issuer: fm.payer_issuer || fm.issuer || 'GoPay',
          status: 'success',
          waktuTransaksi: fm.transaction_time ? new Date(fm.transaction_time) : new Date(),
        }).catch(() => null);

        if (isDatabaseConfigured()) {
          try {
            const db = getDb();
            if (db) {
              await db
                .update(schema.qrisOrdersTable)
                .set({ status: 'PAID' })
                .where(eq(schema.qrisOrdersTable.qrisId, qrisId));
            }
          } catch {
            // ignore
          }
        }

        dispatchPaymentWebhook({
          userId: qris.userId,
          qrisId,
          trxId: qris.trxId,
          amount: fm.amount,
          paymentType: fm.payment_type,
          issuer: fm.payer_issuer || fm.issuer || 'GoPay',
          transactionId: fm.id,
          transactionTime: fm.transaction_time,
          status: 'PAID',
        }).catch((webhookErr) => {
          console.error('[FinalMatch Webhook Error]:', webhookErr);
        });
      }

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
      userMerchantId,
      userAgent,
      qris.trxId || qrisId,
      customHeaders
    );

    if (matched) {
      qris.status = 'PAID';
      qris.transaction = matched;
      gatewayState.qrisStore.set(qrisId, qris);

      // Persist transaction to DB
      if (qris.userId) {
        const m = matched as { id: string; order_id: string; amount: number; payment_type?: string; payer_issuer?: string; issuer?: string; transaction_time?: string };
        await recordTransactionToDb(qris.userId, {
          gojekTransactionId: m.id,
          orderId: m.order_id,
          nominal: m.amount,
          metodeBayar: m.payment_type,
          issuer: m.payer_issuer || m.issuer || 'GoPay',
          status: 'success',
          waktuTransaksi: m.transaction_time ? new Date(m.transaction_time) : new Date(),
        }).catch(() => null);

        if (isDatabaseConfigured()) {
          try {
            const db = getDb();
            if (db) {
              await db
                .update(schema.qrisOrdersTable)
                .set({ status: 'PAID' })
                .where(eq(schema.qrisOrdersTable.qrisId, qrisId));
            }
          } catch {
            // ignore
          }
        }

        dispatchPaymentWebhook({
          userId: qris.userId,
          qrisId,
          trxId: qris.trxId,
          amount: m.amount,
          paymentType: m.payment_type,
          issuer: m.payer_issuer || m.issuer || 'GoPay',
          transactionId: m.id,
          transactionTime: m.transaction_time,
          status: 'PAID',
        }).catch((webhookErr) => {
          console.error('[Matched Webhook Error]:', webhookErr);
        });
      }

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
