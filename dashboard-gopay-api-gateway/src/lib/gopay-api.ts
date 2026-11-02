import axios from 'axios';
import { gatewayState, logActivity } from './gateway-state';
import { parseGojekAmount } from './emvco';
import { getValidHeaders, refreshSession } from './session-service';

export const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';

export async function checkTokenStatus(userAgent?: string | null) {
  const activeHeaders = await getValidHeaders(userAgent);
  if (!activeHeaders) {
    return {
      success: false,
      data: {
        token_status: 'invalid',
        message: 'Sesi belum dikonfigurasi. Jalankan `node login.js` di terminal.',
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

    return {
      success: true,
      data: {
        token_status: 'valid',
        message: 'Token dan Sesi GoPay Merchant Aktif',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      data: {
        token_status: 'invalid',
        message: err.message,
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
}) {
  let headers = await getValidHeaders(options.userAgent);

  if (!headers) {
    throw new Error('Sesi GoPay belum ada. Jalankan `node login.js` di terminal.');
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
  } catch (firstErr: any) {
    if (firstErr.response && firstErr.response.status === 401) {
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

  const rawTransactions = response.data?.transactions || response.data?.data?.transactions || [];
  const formattedTransactions = rawTransactions.map((tx: any) => ({
    amount: parseGojekAmount(tx.gross_amount ?? tx.real_gross_amount ?? tx.amount?.value ?? tx.amount ?? 0),
    status: tx.transaction_status ? tx.transaction_status.toLowerCase() : 'success',
    time: tx.transaction_time || tx.settlement_time,
    issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
    order_id: tx.order_id,
    transaction_id: tx.id,
  }));

  const totalAmount = formattedTransactions.reduce((total: number, tx: any) => total + tx.amount, 0);

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
  let headers = await getValidHeaders(userAgent);
  if (!headers) {
    throw new Error('Sesi GoPay belum ada. Jalankan `node login.js` di terminal.');
  }

  const doRequest = async (activeHeaders: Record<string, string>) => {
    const merchantId = merchantIdOverride || process.env.GOPAY_MERCHANT_ID || '';
    const now = new Date();
    const startTimeISO = startTime
      ? new Date(startTime).toISOString()
      : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endTimeISO = now.toISOString();

    return await axios.get(GOJEK_TRANSACTIONS_URL, {
      headers: activeHeaders,
      params: {
        from: 0,
        size: 20,
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
  } catch (firstErr: any) {
    if (firstErr.response && firstErr.response.status === 401) {
      logActivity('WARNING', 'Sesi expired (401) di verifyPayment. Memulai auto-refresh...');
      const refreshed = await refreshSession();
      if (refreshed) {
        const newHeaders = await getValidHeaders(userAgent);
        if (!newHeaders) throw firstErr;
        response = await doRequest(newHeaders);
      } else {
        throw firstErr;
      }
    } else {
      throw firstErr;
    }
  }

  const rawTransactions =
    response.data?.transactions || response.data?.data?.transactions || response.data?.data || [];
  const targetAmount = parseInt(String(amount), 10);
  const filterStartTimeMs = startTime ? new Date(startTime).getTime() : 0;

  for (const tx of rawTransactions) {
    const txAmount = parseGojekAmount(
      tx.gross_amount ?? tx.real_gross_amount ?? tx.amount?.value ?? tx.amount ?? 0
    );
    const txTimestamp = new Date(tx.transaction_time || tx.created_at || tx.settlement_time || 0).getTime();
    const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;

    if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
      const existingClaim = gatewayState.claimedTransactions.get(txId);

      if (!existingClaim) {
        // Transaksi belum diklaim siapapun -> klaim sekarang
        gatewayState.claimedTransactions.set(txId, { qrisId: qrisId || null, claimedAt: Date.now() });
        logActivity('INFO', `TRX ${txId} diklaim oleh QRIS ${qrisId || 'manual-check'}`);
        return {
          transaction_id: txId,
          order_id: tx.order_id,
          amount: txAmount,
          payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
          payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
          transaction_time: tx.transaction_time || tx.settlement_time,
        };
      } else if (qrisId && existingClaim.qrisId === qrisId) {
        // Re-check dari QRIS yang sama -> kembalikan hasil yang sudah diklaim
        return {
          transaction_id: txId,
          order_id: tx.order_id,
          amount: txAmount,
          payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
          payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
          transaction_time: tx.transaction_time || tx.settlement_time,
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
