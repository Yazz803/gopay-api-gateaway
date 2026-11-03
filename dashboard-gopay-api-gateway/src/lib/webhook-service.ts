import crypto from 'crypto';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logActivity } from '@/lib/gateway-state';
import { recordActivityLogToDb } from '@/lib/merchant-session-db';

export interface WebhookPayload {
  event: 'payment.success';
  timestamp: string;
  data: {
    qris_id: string | null;
    trx_id: string;
    amount: number;
    nominal: number;
    payment_type: string;
    issuer: string;
    transaction_id: string | null;
    transaction_time: string;
    status: string;
    [key: string]: unknown;
  };
}

export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(24).toString('hex');
}

export function generateWebhookSignature(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

export async function getUserWebhookConfig(userId: string): Promise<{
  webhookUrl: string | null;
  webhookSecret: string | null;
}> {
  if (!isDatabaseConfigured()) {
    return { webhookUrl: null, webhookSecret: null };
  }

  const db = getDb();
  if (!db) return { webhookUrl: null, webhookSecret: null };

  try {
    const rows = await db
      .select({
        webhookUrl: schema.usersTable.webhookUrl,
        webhookSecret: schema.usersTable.webhookSecret,
      })
      .from(schema.usersTable)
      .where(eq(schema.usersTable.id, userId))
      .limit(1);

    if (rows.length > 0) {
      return {
        webhookUrl: rows[0].webhookUrl || null,
        webhookSecret: rows[0].webhookSecret || null,
      };
    }
  } catch (err) {
    console.error('[WebhookConfig Read Error]:', err);
  }

  return { webhookUrl: null, webhookSecret: null };
}

export async function updateUserWebhookConfig(
  userId: string,
  webhookUrl: string | null,
  newSecret?: boolean
): Promise<{
  webhookUrl: string | null;
  webhookSecret: string | null;
}> {
  if (!isDatabaseConfigured()) {
    return { webhookUrl, webhookSecret: null };
  }

  const db = getDb();
  if (!db) return { webhookUrl, webhookSecret: null };

  const current = await getUserWebhookConfig(userId);
  let secret = current.webhookSecret;

  if (newSecret || (!secret && webhookUrl)) {
    secret = generateWebhookSecret();
  }

  try {
    await db
      .update(schema.usersTable)
      .set({
        webhookUrl: webhookUrl ? webhookUrl.trim() : null,
        webhookSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(schema.usersTable.id, userId));

    return {
      webhookUrl: webhookUrl ? webhookUrl.trim() : null,
      webhookSecret: secret,
    };
  } catch (err) {
    console.error('[WebhookConfig Update Error]:', err);
    throw err;
  }
}

export async function recordWebhookDelivery(data: {
  userId: string;
  event: string;
  url: string;
  payloadJson: string;
  responseStatus?: number | null;
  responseBody?: string | null;
  status: 'success' | 'failed';
  durationMs?: number;
}) {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  if (!db) return;

  try {
    await db.insert(schema.webhookDeliveriesTable).values({
      userId: data.userId,
      event: data.event,
      url: data.url,
      payloadJson: data.payloadJson,
      responseStatus: data.responseStatus ?? null,
      responseBody: data.responseBody ? data.responseBody.substring(0, 1000) : null,
      status: data.status,
      durationMs: data.durationMs ?? null,
    });
  } catch (err) {
    console.error('[RecordWebhookDelivery Error]:', err);
  }
}

export async function getRecentWebhookDeliveries(userId: string, limit = 15) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(schema.webhookDeliveriesTable)
      .where(eq(schema.webhookDeliveriesTable.userId, userId))
      .orderBy(desc(schema.webhookDeliveriesTable.createdAt))
      .limit(limit);
  } catch (err) {
    console.error('[GetRecentWebhookDeliveries Error]:', err);
    return [];
  }
}

export async function dispatchPaymentWebhook(params: {
  userId?: string | null;
  qrisId?: string | null;
  trxId: string;
  amount: number;
  paymentType?: string;
  issuer?: string;
  transactionId?: string;
  transactionTime?: string | Date;
  status?: string;
}): Promise<{ delivered: boolean; statusCode?: number; error?: string }> {
  if (!params.userId) {
    return { delivered: false, error: 'No user ID attached to transaction' };
  }

  const { webhookUrl, webhookSecret } = await getUserWebhookConfig(params.userId);
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { delivered: false, error: 'Webhook URL not configured' };
  }

  const timestamp = new Date().toISOString();
  const txTimeStr =
    typeof params.transactionTime === 'string'
      ? params.transactionTime
      : params.transactionTime?.toISOString() || timestamp;

  const payload: WebhookPayload = {
    event: 'payment.success',
    timestamp,
    data: {
      qris_id: params.qrisId || null,
      trx_id: params.trxId,
      amount: params.amount,
      nominal: params.amount,
      payment_type: params.paymentType || 'qris',
      issuer: params.issuer || 'GoPay',
      transaction_id: params.transactionId || null,
      transaction_time: txTimeStr,
      status: params.status || 'PAID',
    },
  };

  const payloadString = JSON.stringify(payload);
  const signature = webhookSecret
    ? generateWebhookSignature(payloadString, webhookSecret)
    : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'GoPay-Gateway-Webhook/1.0',
    'X-Gateway-Event': 'payment.success',
    'X-Gateway-Timestamp': timestamp,
  };

  if (signature) {
    headers['X-Gateway-Signature'] = `sha256=${signature}`;
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    const resText = await res.text().catch(() => '');
    const isSuccess = res.ok;

    await recordWebhookDelivery({
      userId: params.userId,
      event: 'payment.success',
      url: webhookUrl,
      payloadJson: payloadString,
      responseStatus: res.status,
      responseBody: resText,
      status: isSuccess ? 'success' : 'failed',
      durationMs,
    });

    await recordActivityLogToDb(params.userId, {
      logType: isSuccess ? 'INFO' : 'WARNING',
      message: `Webhook payment.success terkirim ke ${webhookUrl} (HTTP ${res.status}) dalam ${durationMs}ms`,
      details: {
        trxId: params.trxId,
        amount: params.amount,
        status: res.status,
        durationMs,
      },
    });

    logActivity(
      isSuccess ? 'INFO' : 'WARNING',
      `Webhook payment.success dikirim ke ${webhookUrl} | Status: ${res.status}`
    );

    return { delivered: isSuccess, statusCode: res.status };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await recordWebhookDelivery({
      userId: params.userId,
      event: 'payment.success',
      url: webhookUrl,
      payloadJson: payloadString,
      responseStatus: 0,
      responseBody: errorMsg,
      status: 'failed',
      durationMs,
    });

    logActivity('WARNING', `Gagal mengirim webhook ke ${webhookUrl}: ${errorMsg}`);
    return { delivered: false, error: errorMsg };
  }
}

export async function testWebhookEndpoint(
  userId: string,
  targetUrl: string,
  secret?: string | null
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}> {
  const timestamp = new Date().toISOString();
  const testPayload: WebhookPayload = {
    event: 'payment.success',
    timestamp,
    data: {
      qris_id: 'test_qr_' + Math.random().toString(36).substring(2, 8),
      trx_id: 'TRX-TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: 15000,
      nominal: 15000,
      payment_type: 'qris',
      issuer: 'GoPay',
      transaction_id: 'TEST_TX_' + Date.now(),
      transaction_time: timestamp,
      status: 'PAID',
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = secret ? generateWebhookSignature(payloadString, secret) : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'GoPay-Gateway-Webhook/1.0',
    'X-Gateway-Event': 'payment.success',
    'X-Gateway-Timestamp': timestamp,
  };

  if (signature) {
    headers['X-Gateway-Signature'] = `sha256=${signature}`;
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    const resText = await res.text().catch(() => '');
    const isSuccess = res.ok;

    await recordWebhookDelivery({
      userId,
      event: 'payment.success.test',
      url: targetUrl,
      payloadJson: payloadString,
      responseStatus: res.status,
      responseBody: resText,
      status: isSuccess ? 'success' : 'failed',
      durationMs,
    });

    return {
      success: isSuccess,
      statusCode: res.status,
      responseBody: resText.substring(0, 500),
      durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await recordWebhookDelivery({
      userId,
      event: 'payment.success.test',
      url: targetUrl,
      payloadJson: payloadString,
      responseStatus: 0,
      responseBody: errorMsg,
      status: 'failed',
      durationMs,
    });

    return {
      success: false,
      statusCode: 0,
      durationMs,
      error: errorMsg,
    };
  }
}
