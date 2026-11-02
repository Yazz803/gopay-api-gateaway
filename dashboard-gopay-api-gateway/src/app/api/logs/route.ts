import { NextRequest } from 'next/server';
import { validateApiKey, handleCorsOptions, jsonResponse } from '@/lib/auth';
import { gatewayState } from '@/lib/gateway-state';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return auth.response!;

  const authUser = await getAuthenticatedUser(req);
  if (authUser?.id && isDatabaseConfigured()) {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.activityLogsTable)
          .where(eq(schema.activityLogsTable.userId, authUser.id))
          .orderBy(desc(schema.activityLogsTable.createdAt))
          .limit(100);

        if (rows.length > 0) {
          const formatted = rows.map((r) => ({
            id: r.id,
            timestamp: r.createdAt.toISOString(),
            type: r.logType,
            message: r.encryptedMessage,
            details: r.detailsJson ? JSON.parse(r.detailsJson) : null,
          }));

          return jsonResponse({
            success: true,
            logs: formatted,
          });
        }
      }
    } catch (err) {
      console.error('[API Logs DB query error]:', err);
    }
  }

  return jsonResponse({
    success: true,
    logs: gatewayState.activityLogs,
  });
}

export async function OPTIONS() {
  return handleCorsOptions();
}
