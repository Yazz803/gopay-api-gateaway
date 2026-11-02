import type { NormalizedTransaction } from './transaction';

export type QrisStatus = 'PENDING' | 'PAID' | 'EXPIRED';

export type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';

export interface QrisItem {
  data: string;
  amount: number;
  trxId: string;
  expiresAt: Date;
  createdAt: Date;
  status: QrisStatus;
  transaction?: NormalizedTransaction | null;
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
