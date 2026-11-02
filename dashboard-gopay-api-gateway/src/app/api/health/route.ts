import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth';
import { gatewayState } from '@/lib/gateway-state';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { getGatewayMetricsFromDb } from '@/lib/merchant-session-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let activeQris = gatewayState.qrisStore.size;
  let claimedTransactions = gatewayState.claimedTransactions.size;
  let activityLogs = gatewayState.activityLogs.length;

  try {
    const authUser = await getAuthenticatedUser(req);
    if (authUser?.id) {
      const dbMetrics = await getGatewayMetricsFromDb(authUser.id);
      if (dbMetrics) {
        activeQris = dbMetrics.active_qris;
        claimedTransactions = dbMetrics.claimed_transactions;
        activityLogs = dbMetrics.activity_logs;
      }
    }
  } catch {
    // fallback to in-memory state
  }

  return NextResponse.json(
    {
      status: 'OK',
      success: true,
      service: 'GoPay Partner API Gateway',
      message: 'Layanan API GoPay Berfungsi Normal',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      gateway: {
        active_qris: activeQris,
        claimed_transactions: claimedTransactions,
        activity_logs: activityLogs,
      },
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
