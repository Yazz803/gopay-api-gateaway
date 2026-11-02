import axios from 'axios';
import { gatewayState, logActivity } from './gateway-state';
import { parseGojekAmount } from './emvco';
import { getValidHeaders, refreshSession, loadSession } from './session-service';

export const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';

// [PATCH manual-check] Tidak ada auto-polling: status hanya dicek saat pembeli menekan tombol.
// Cooldown per QRIS ditegakkan di server (lihat route qr-status) dan daftar transaksi
// terakhir dipakai bersama semua QRIS, agar banyak cek yang datang bersamaan
// tidak berlipat menjadi banyak request ke API Gojek.
function parsePositiveIntEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const STATUS_COOLDOWN_MS = parsePositiveIntEnv('STATUS_COOLDOWN_MS', 10000);
export const TX_CACHE_MS = parsePositiveIntEnv('TX_CACHE_MS', 12000);

interface TxCache {
  fetchedAt: number;
  merchantId: string;
  transactions: Array<Record<string, unknown>> | null;
  inflight: Promise<Array<Record<string, unknown>>> | null;
  inflightMerchantId: string | null;
}

// Mengikuti pola gateway-state: simpan di globalThis agar konsisten antar route invocation.
const globalForTxCache = globalThis as unknown as { __GOPAY_TX_CACHE__?: TxCache };
if (!globalForTxCache.__GOPAY_TX_CACHE__) {
  globalForTxCache.__GOPAY_TX_CACHE__ = {
    fetchedAt: 0,
    merchantId: '',
    transactions: null,
    inflight: null,
    inflightMerchantId: null,
  };
}
const txCache = globalForTxCache.__GOPAY_TX_CACHE__;

async function fetchTransactionsFromApi(
  activeHeaders: Record<string, string>,
  merchantId: string
): Promise<Array<Record<string, unknown>>> {
  const now = new Date();
  // Jendela 24 jam terakhir (sama seperti default verifyPayment semula): API tetap hanya
  // mengembalikan 20 transaksi terbaru, dan penyaringan per QRIS dilakukan lokal,
  // jadi jendela lebar ini aman sekaligus menjaga kompatibilitas /check-payment.
  const startTimeISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const response = await axios.get(GOJEK_TRANSACTIONS_URL, {
    headers: activeHeaders,
    params: {
      from: 0,
      size: 20,
      statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
      payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
      start_time: startTimeISO,
      end_time: now.toISOString(),
      merchant_ids: merchantId,
    },
    timeout: 10000,
  });
  return (response.data?.transactions ||
    response.data?.data?.transactions ||
    response.data?.data ||
    []) as Array<Record<string, unknown>>;
}

async function getRecentTransactions(
  activeHeaders: Record<string, string>,
  merchantId: string,
  forceRefresh = false
): Promise<Array<Record<string, unknown>>> {
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    txCache.transactions &&
    txCache.merchantId === merchantId &&
    nowMs - txCache.fetchedAt < TX_CACHE_MS
  ) {
    return txCache.transactions;
  }
  if (!forceRefresh && txCache.inflight && txCache.inflightMerchantId === merchantId) {
    return txCache.inflight;
  }
  txCache.inflightMerchantId = merchantId;
  txCache.inflight = (async () => {
    try {
      const transactions = await fetchTransactionsFromApi(activeHeaders, merchantId);
      txCache.fetchedAt = Date.now();
      txCache.merchantId = merchantId;
      txCache.transactions = transactions;
      txCache.inflight = null;
      txCache.inflightMerchantId = null;
      return transactions;
    } catch (err) {
      txCache.inflight = null;
      txCache.inflightMerchantId = null;
      throw err;
    }
  })();
  return txCache.inflight;
}

export async function checkTokenStatus(userAgent?: string | null) {
  const activeHeaders = await getValidHeaders(userAgent);
  if (!activeHeaders) {
    return {
      success: false,
      active: false,
      data: {
        token_status: 'invalid',
        message: 'Sesi belum terhubung. Silakan hubungkan akun GoPay Merchant melalui web app.',
      },
    };
  }

  try {
    const merchantId = process.env.GOPAY_MERCHANT_ID || '';
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();

    await axios.get(GOJEK_TRANSACTIONS_URL, {
      headers: activeHeaders,
      params: {
        from: 0,
        size: 1,
        statuses: 'SETTLEMENT,CAPTURE',
        payment_types: 'QRIS,GOPAY',
        start_time: oneHourAgo,
        end_time: now.toISOString(),
        merchant_ids: merchantId,
      },
      timeout: 5000,
    });

    const session = loadSession();
    return {
      success: true,
      active: true,
      account: {
        name: (session?.outlet_name as string) || 'Akun GoPay Toko',
        merchant_id: (session?.merchant_id as string) || merchantId,
        phone: (session?.phone_number as string) || undefined,
      },
      data: {
        token_status: 'valid',
        message: 'Token dan Sesi GoPay Merchant Aktif',
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      active: false,
      data: {
        token_status: 'invalid',
        message,
      },
    };
  }
}

export async function fetchTransactionsData(options: {
  merchantId?: string | null;
  startTimeUnix?: number | string | null;
  endTimeUnix?: number | string | null;
  pageSize?: number | string | null;
  userAgent?: string | null;
  customHeaders?: Record<string, string> | null;
}) {
  const headers = options.customHeaders || (await getValidHeaders(options.userAgent));

  if (!headers) {
    throw new Error('Sesi GoPay belum ada. Silakan hubungkan akun GoPay Merchant melalui web app.');
  }

  const doRequest = async (activeHeaders: Record<string, string>) => {
    const merchantId = options.merchantId || process.env.GOPAY_MERCHANT_ID || '';
    const now = new Date();
    const startTimeISO = options.startTimeUnix
      ? new Date(parseInt(String(options.startTimeUnix), 10) * 1000).toISOString()
      : new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
    const endTimeISO = options.endTimeUnix
      ? new Date(parseInt(String(options.endTimeUnix), 10) * 1000).toISOString()
      : now.toISOString();

    return await axios.get(GOJEK_TRANSACTIONS_URL, {
      headers: activeHeaders,
      params: {
        from: 0,
        size: parseInt(String(options.pageSize || '20'), 10),
        statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
        payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
        start_time: startTimeISO,
        end_time: endTimeISO,
        merchant_ids: merchantId,
      },
      timeout: 10000,
    });
  };

  let response;
  try {
    response = await doRequest(headers);
  } catch (firstErr: unknown) {
    const errorResponse = (firstErr as { response?: { status?: number } })?.response;
    if (errorResponse && errorResponse.status === 401) {
      logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
      const refreshed = await refreshSession();
      if (refreshed) {
        const newHeaders = await getValidHeaders(options.userAgent);
        if (!newHeaders) throw firstErr;
        response = await doRequest(newHeaders);
      } else {
        throw firstErr;
      }
    } else {
      throw firstErr;
    }
  }

  const rawTransactions = (response.data?.transactions || response.data?.data?.transactions || []) as Array<Record<string, unknown>>;
  const formattedTransactions = rawTransactions.map((tx: Record<string, unknown>) => {
    const grossAmount = (tx.gross_amount ?? tx.real_gross_amount ?? (tx.amount as { value?: unknown })?.value ?? tx.amount ?? 0) as string | number;
    return {
      amount: parseGojekAmount(grossAmount),
      status: typeof tx.transaction_status === 'string' ? tx.transaction_status.toLowerCase() : 'success',
      time: String(tx.transaction_time || tx.settlement_time || ''),
      issuer: String(tx.qris_provider_aspi_issuer || 'GoPay / Bank'),
      order_id: String(tx.order_id || ''),
      transaction_id: String(tx.id || ''),
    };
  });

  const totalAmount = formattedTransactions.reduce((total: number, tx: { amount: number }) => total + tx.amount, 0);

  return {
    success: true,
    total_amount: String(totalAmount),
    data: { transactions: formattedTransactions },
  };
}

export async function verifyPayment(
  amount: number | string,
  startTime?: string | Date | null,
  merchantIdOverride?: string | null,
  userAgent?: string | null,
  qrisId?: string | null
) {
  const headers = await getValidHeaders(userAgent);
  if (!headers) {
    throw new Error('Sesi GoPay belum ada. Silakan hubungkan akun GoPay Merchant melalui web app.');
  }

  const merchantId = merchantIdOverride || process.env.GOPAY_MERCHANT_ID || '';

  let rawTransactions: Array<Record<string, unknown>>;
  try {
    rawTransactions = await getRecentTransactions(headers, merchantId, false);
  } catch (firstErr: unknown) {
    const errorResponse = (firstErr as { response?: { status?: number } })?.response;
    if (errorResponse && errorResponse.status === 401) {
      logActivity('WARNING', 'Sesi expired (401) di verifyPayment. Memulai auto-refresh...');
      const refreshed = await refreshSession();
      if (refreshed) {
        const newHeaders = await getValidHeaders(userAgent);
        if (!newHeaders) throw firstErr;
        rawTransactions = await getRecentTransactions(newHeaders, merchantId, true);
      } else {
        throw firstErr;
      }
    } else {
      throw firstErr;
    }
  }
  const targetAmount = parseInt(String(amount), 10);
  const filterStartTimeMs = startTime ? new Date(startTime).getTime() : 0;

  for (const tx of rawTransactions) {
    const grossAmount = (tx.gross_amount ?? tx.real_gross_amount ?? (tx.amount as { value?: unknown })?.value ?? tx.amount ?? 0) as string | number;
    const txAmount = parseGojekAmount(grossAmount);
    const txTimestamp = new Date(String(tx.transaction_time || tx.created_at || tx.settlement_time || 0)).getTime();
    const txId = String(tx.id || tx.order_id || tx.wallstreet_transaction_id || '');

    if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
      const existingClaim = gatewayState.claimedTransactions.get(txId);

      if (!existingClaim) {
        // Transaksi belum diklaim siapapun -> klaim sekarang
        gatewayState.claimedTransactions.set(txId, { qrisId: qrisId || null, claimedAt: Date.now() });
        logActivity('INFO', `TRX ${txId} diklaim oleh QRIS ${qrisId || 'manual-check'}`);
        return {
          id: txId,
          order_id: String(tx.order_id || txId),
          amount: txAmount,
          status: 'success',
          payer_issuer: String(tx.qris_provider_aspi_issuer || 'GoPay / Bank'),
          payment_type: String(tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE'),
          transaction_time: String(tx.transaction_time || tx.settlement_time || new Date().toISOString()),
        };
      } else if (qrisId && existingClaim.qrisId === qrisId) {
        // Re-check dari QRIS yang sama -> kembalikan hasil yang sudah diklaim
        return {
          id: txId,
          order_id: String(tx.order_id || txId),
          amount: txAmount,
          status: 'success',
          payer_issuer: String(tx.qris_provider_aspi_issuer || 'GoPay / Bank'),
          payment_type: String(tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE'),
          transaction_time: String(tx.transaction_time || tx.settlement_time || new Date().toISOString()),
        };
      } else {
        // Transaksi ini sudah diklaim oleh QRIS lain -> skip, cari berikutnya
        logActivity(
          'INFO',
          `TRX ${txId} sudah diklaim oleh QRIS ${existingClaim.qrisId || 'lain'}, skip untuk QRIS ${qrisId}`
        );
        continue;
      }
    }
  }

  return null;
}

// [PATCH manual-check] Cek terakhir untuk satu QRIS: dipakai route qr-status saat QRIS
// baru saja kedaluwarsa dan oleh timer terjadwal di route create-qris. Melewati cooldown
// per QRIS, tapi tetap memakai cache daftar transaksi bersama.
// Bila verifikasi gagal (mis. API Gojek sedang gangguan), entri QRIS TIDAK dihapus
// agar cek berikutnya masih bisa mencoba lagi.
export async function finalizeQris(qrisId: string, userAgent?: string | null) {
  const qris = gatewayState.qrisStore.get(qrisId);
  if (!qris) return null;
  if (qris.status === 'PAID') return qris.transaction ?? null;
  if (qris.finalizing) return null;
  qris.finalizing = true;
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
        `Final check: pembayaran QRIS ID ${qrisId} terverifikasi lunas untuk nominal Rp ${qris.amount}`
      );
      return matched;
    }
    gatewayState.qrisStore.delete(qrisId);
    logActivity('INFO', `Final check: QRIS ID ${qrisId} kedaluwarsa tanpa pembayaran`);
    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logActivity('ERROR', `Final check QRIS ID ${qrisId} gagal: ${message}`);
    qris.finalizing = false;
    return null;
  }
}
