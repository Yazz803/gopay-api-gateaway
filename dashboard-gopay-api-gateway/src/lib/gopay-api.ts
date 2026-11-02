import axios from 'axios';
import { gatewayState, logActivity } from './gateway-state';
import { parseGojekAmount } from './emvco';
import { getValidHeaders, refreshSession, loadSession } from './session-service';

export const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';

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
  } catch (firstErr: unknown) {
    const errorResponse = (firstErr as { response?: { status?: number } })?.response;
    if (errorResponse && errorResponse.status === 401) {
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

  const rawTransactions = (response.data?.transactions ||
    response.data?.data?.transactions ||
    response.data?.data ||
    []) as Array<Record<string, unknown>>;
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
