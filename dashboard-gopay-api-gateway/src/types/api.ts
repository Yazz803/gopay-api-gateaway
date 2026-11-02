import type { ActivityLogItem, QrisItem } from './gateway';
import type { NormalizedTransaction } from './transaction';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface CreateQrisRequest {
  amount: number;
  trx_id?: string;
  qris_id?: string;
}

export interface CreateQrisResponse {
  success: boolean;
  status: string;
  data: string; // Dynamic QRIS string
  amount: number;
  trx_id: string;
  expires_at: string;
  check_status_url: string;
  qr_image_url?: string;
  message?: string;
}

export interface CheckPaymentRequest {
  amount: number;
  startTime?: string;
  start_time?: string;
  trx_id?: string;
  qris_id?: string;
}

export interface CheckPaymentResponse {
  success: boolean;
  paid: boolean;
  message?: string;
  transaction?: NormalizedTransaction;
  error?: string;
}

export interface TokenStatusResponse {
  success: boolean;
  active: boolean;
  expires_in?: number;
  account?: {
    name?: string;
    phone?: string;
    merchant_id?: string;
  };
  message?: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  gateway: {
    active_qris: number;
    claimed_transactions: number;
    activity_logs: number;
  };
}

export interface LogsResponse {
  success: boolean;
  logs: ActivityLogItem[];
}

export interface TransactionsResponse {
  success: boolean;
  data: NormalizedTransaction[];
  total?: number;
  message?: string;
}

export interface QrStatusResponse {
  success: boolean;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'NOT_FOUND';
  qris?: QrisItem;
  transaction?: NormalizedTransaction | null;
  message?: string;
}
