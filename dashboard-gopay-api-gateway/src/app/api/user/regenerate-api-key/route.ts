import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database tidak tersedia' }, { status: 500 });
    }

    const newApiKey = 'gopay_' + crypto.randomBytes(20).toString('hex');
    await db
      .update(schema.usersTable)
      .set({ apiKey: newApiKey })
      .where(eq(schema.usersTable.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'API Key berhasil diperbarui.',
      apiKey: newApiKey,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui API Key.', error: msg },
      { status: 500 }
    );
  }
}
