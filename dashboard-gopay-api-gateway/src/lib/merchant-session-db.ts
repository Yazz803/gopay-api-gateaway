import { getDb, schema, isDatabaseConfigured } from './db';
import { eq, and, desc, gt, sql } from 'drizzle-orm';
import { encryptWithDek, decryptWithDek } from './crypto/vault';
import fs from 'fs';
import path from 'path';

export async function saveMerchantSessionToDb(
  userId: string,
  dek: string,
  rawSession: Record<string, unknown>
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const db = getDb();
  if (!db) return false;

  try {
    const encMerchantId = rawSession.merchant_id
      ? encryptWithDek(String(rawSession.merchant_id), dek)
      : null;
    const encOutletName = rawSession.outlet_name
      ? encryptWithDek(String(rawSession.outlet_name), dek)
      : null;
    const encPhone = rawSession.phone_number
      ? encryptWithDek(String(rawSession.phone_number), dek)
      : null;
    const encAccessToken = rawSession.access_token
      ? encryptWithDek(String(rawSession.access_token), dek)
      : null;
    const encRefreshToken = rawSession.refresh_token
      ? encryptWithDek(String(rawSession.refresh_token), dek)
      : null;
    const encCookie = rawSession.cookie
      ? encryptWithDek(String(rawSession.cookie), dek)
      : null;

    const expiresAt = rawSession.expires_at
      ? new Date(String(rawSession.expires_at))
      : null;

    // Check existing
    const existing = await db
      .select()
      .from(schema.merchantSessionsTable)
      .where(eq(schema.merchantSessionsTable.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.merchantSessionsTable)
        .set({
          encryptedMerchantId: encMerchantId,
          encryptedOutletName: encOutletName,
          encryptedPhoneNumber: encPhone,
          encryptedAccessToken: encAccessToken,
          encryptedRefreshToken: encRefreshToken,
          encryptedCookie: encCookie,
          tokenStatus: 'valid',
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.merchantSessionsTable.userId, userId));
    } else {
      await db.insert(schema.merchantSessionsTable).values({
        userId,
        encryptedMerchantId: encMerchantId,
        encryptedOutletName: encOutletName,
        encryptedPhoneNumber: encPhone,
        encryptedAccessToken: encAccessToken,
        encryptedRefreshToken: encRefreshToken,
        encryptedCookie: encCookie,
        tokenStatus: 'valid',
        expiresAt,
      });
    }

    // Clean up any remaining legacy flat session files from disk so secrets are never stored as plain files
    const legacyFiles = [
      path.resolve(process.cwd(), '.GOPAY_SESI_JANGAN_DIHAPUS.json'),
      path.resolve(process.cwd(), '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json'),
    ];
    for (const f of legacyFiles) {
      if (fs.existsSync(/*turbopackIgnore: true*/ f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // ignore unlink error
        }
      }
    }

    return true;
  } catch (err: unknown) {
    console.error('[saveMerchantSessionToDb Error]:', err);
    return false;
  }
}

export async function getMerchantSessionFromDb(
  userId: string,
  dek: string
): Promise<Record<string, unknown> | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select()
      .from(schema.merchantSessionsTable)
      .where(eq(schema.merchantSessionsTable.userId, userId))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0];

    const merchant_id = row.encryptedMerchantId ? decryptWithDek(row.encryptedMerchantId, dek) : undefined;
    const outlet_name = row.encryptedOutletName ? decryptWithDek(row.encryptedOutletName, dek) : undefined;
    const phone_number = row.encryptedPhoneNumber ? decryptWithDek(row.encryptedPhoneNumber, dek) : undefined;
    const access_token = row.encryptedAccessToken ? decryptWithDek(row.encryptedAccessToken, dek) : undefined;
    const refresh_token = row.encryptedRefreshToken ? decryptWithDek(row.encryptedRefreshToken, dek) : undefined;
    const cookie = row.encryptedCookie ? decryptWithDek(row.encryptedCookie, dek) : undefined;

    return {
      merchant_id,
      outlet_name,
      phone_number,
      access_token,
      refresh_token,
      cookie,
      token_status: row.tokenStatus,
      expires_at: row.expiresAt?.toISOString(),
      updated_at: row.updatedAt?.toISOString(),
    };
  } catch (err: unknown) {
    console.error('[getMerchantSessionFromDb Error]:', err);
    return null;
  }
}

export async function recordQrisOrderToDb(
  userId: string,
  data: {
    qrisId: string;
    trxId: string;
    nominal: number;
    payload: string;
    expiresAt: Date;
    status?: string;
  }
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  if (!db) return;

  try {
    await db.insert(schema.qrisOrdersTable).values({
      userId,
      qrisId: data.qrisId,
      trxId: data.trxId,
      nominal: data.nominal,
      encryptedQrisPayload: data.payload,
      status: data.status || 'PENDING',
      expiresAt: data.expiresAt,
    });
  } catch (err) {
    console.error('[recordQrisOrderToDb Error]:', err);
  }
}

export async function recordTransactionToDb(
  userId: string,
  tx: {
    gojekTransactionId?: string;
    orderId?: string;
    nominal: number;
    metodeBayar?: string;
    issuer?: string;
    status?: string;
    waktuTransaksi?: Date;
  }
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  if (!db) return;

  try {
    // Deduplikasi transaksi agar tidak mencatat ganda
    if (tx.gojekTransactionId) {
      const existing = await db
        .select({ id: schema.transactionsTable.id })
        .from(schema.transactionsTable)
        .where(
          and(
            eq(schema.transactionsTable.userId, userId),
            eq(schema.transactionsTable.gojekTransactionId, tx.gojekTransactionId)
          )
        )
        .limit(1);
      if (existing.length > 0) return;
    }

    await db.insert(schema.transactionsTable).values({
      userId,
      gojekTransactionId: tx.gojekTransactionId,
      orderId: tx.orderId,
      nominal: tx.nominal,
      metodeBayar: tx.metodeBayar,
      issuer: tx.issuer,
      status: tx.status || 'success',
      waktuTransaksi: tx.waktuTransaksi || new Date(),
    });
  } catch (err) {
    console.error('[recordTransactionToDb Error]:', err);
  }
}

export async function getTransactionsFromDb(userId: string) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(schema.transactionsTable)
      .where(eq(schema.transactionsTable.userId, userId))
      .orderBy(desc(schema.transactionsTable.waktuTransaksi))
      .limit(100);

    return rows.map((r) => ({
      transaction_id: r.gojekTransactionId || r.id,
      order_id: r.orderId || '',
      amount: r.nominal,
      status: r.status,
      time: r.waktuTransaksi ? r.waktuTransaksi.toISOString() : r.createdAt.toISOString(),
      issuer: r.issuer || r.metodeBayar || 'QRIS',
    }));
  } catch (err) {
    console.error('[getTransactionsFromDb Error]:', err);
    return [];
  }
}

export async function getGatewayMetricsFromDb(userId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  if (!db) return null;

  try {
    const now = new Date();
    // 1. Active QRIS (status PENDING & belum kedaluwarsa)
    const activeQris = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.qrisOrdersTable)
      .where(
        and(
          eq(schema.qrisOrdersTable.userId, userId),
          eq(schema.qrisOrdersTable.status, 'PENDING'),
          gt(schema.qrisOrdersTable.expiresAt, now)
        )
      );

    // 2. Claimed / Paid QRIS
    const claimedQris = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.qrisOrdersTable)
      .where(
        and(
          eq(schema.qrisOrdersTable.userId, userId),
          eq(schema.qrisOrdersTable.status, 'PAID')
        )
      );

    // 3. Activity Logs count
    const logs = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.activityLogsTable)
      .where(eq(schema.activityLogsTable.userId, userId));

    return {
      active_qris: Number(activeQris[0]?.count || 0),
      claimed_transactions: Number(claimedQris[0]?.count || 0),
      activity_logs: Number(logs[0]?.count || 0),
    };
  } catch (err) {
    console.error('[getGatewayMetricsFromDb Error]:', err);
    return null;
  }
}

export async function recordActivityLogToDb(
  userId: string,
  log: {
    logType: string;
    message: string;
    details?: unknown;
  }
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  if (!db) return;

  try {
    await db.insert(schema.activityLogsTable).values({
      userId,
      logType: log.logType,
      encryptedMessage: log.message,
      detailsJson: log.details ? JSON.stringify(log.details) : null,
    });
  } catch (err) {
    console.error('[recordActivityLogToDb Error]:', err);
  }
}
