export interface QrisItem {
  data: string;
  amount: number;
  trxId: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  transaction?: any;
}

export interface ClaimItem {
  qrisId: string | null;
  claimedAt: number;
}

export interface ActivityLogItem {
  id: number;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';
  message: string;
  details?: any;
}

interface GatewayState {
  qrisStore: Map<string, QrisItem>;
  claimedTransactions: Map<string, ClaimItem>;
  activityLogs: ActivityLogItem[];
  initialized: boolean;
}

const MAX_LOGS = 100;
const CLAIMED_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 jam

// In Next.js, use globalThis to persist state across hot-reloads and route invocations
const globalForGateway = globalThis as unknown as {
  __GOPAY_GATEWAY_STATE__?: GatewayState;
};

if (!globalForGateway.__GOPAY_GATEWAY_STATE__) {
  globalForGateway.__GOPAY_GATEWAY_STATE__ = {
    qrisStore: new Map(),
    claimedTransactions: new Map(),
    activityLogs: [],
    initialized: false,
  };
}

export const gatewayState = globalForGateway.__GOPAY_GATEWAY_STATE__;

export function logActivity(
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM',
  message: string,
  details: any = null
) {
  const timestamp = new Date().toISOString();
  const logObj: ActivityLogItem = { id: Date.now(), timestamp, type, message, details };
  gatewayState.activityLogs.unshift(logObj);
  if (gatewayState.activityLogs.length > MAX_LOGS) {
    gatewayState.activityLogs.pop();
  }
  console.log(`[${timestamp}] [${type}] ${message}`);
}

export function cleanExpiredTransactions() {
  const now = Date.now();
  for (const [txId, claim] of gatewayState.claimedTransactions.entries()) {
    const claimedAt = typeof claim === 'object' ? claim.claimedAt : (claim as number);
    if (now - claimedAt > CLAIMED_CLEANUP_INTERVAL_MS) {
      gatewayState.claimedTransactions.delete(txId);
    }
  }
}

// Periodic cleanup if running on persistent server
if (!gatewayState.initialized) {
  gatewayState.initialized = true;
  logActivity('SYSTEM', 'GoPay Next.js Gateway State diinisialisasi');

  if (typeof setInterval !== 'undefined') {
    setInterval(cleanExpiredTransactions, 60 * 60 * 1000);
  }
}
