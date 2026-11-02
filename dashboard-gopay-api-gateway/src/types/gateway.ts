import type { NormalizedTransaction } from './transaction';

export type QrisStatus = 'PENDING' | 'PAID' | 'EXPIRED';

export type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';

export interface QrisItem {
  userId?: string;
  data: string;
  amount: number;
  trxId: string;
  expiresAt: Date;
  createdAt: Date;
  status: QrisStatus;
  transaction?: NormalizedTransaction | null;
  // [PATCH manual-check] Waktu cek status terakhir (untuk cooldown server per QRIS)
  lastStatusCheckAt?: number;
  // [PATCH manual-check] Penanda final check sedang berjalan
  finalizing?: boolean;
}

export interface ClaimItem {
  qrisId: string | null;
  claimedAt: number;
}

export interface ActivityLogItem {
  id: number;
  timestamp: string;
  type: LogType;
  message: string;
  details?: unknown;
}

export interface GatewayState {
  qrisStore: Map<string, QrisItem>;
  claimedTransactions: Map<string, ClaimItem>;
  activityLogs: ActivityLogItem[];
  initialized: boolean;
}
