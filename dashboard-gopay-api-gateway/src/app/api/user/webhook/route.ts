import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { jsonResponse } from '@/lib/auth';
import {
  getUserWebhookConfig,
  updateUserWebhookConfig,
  getRecentWebhookDeliveries,
} from '@/lib/webhook-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req).catch(() => null);
  if (!user?.id) {
    return jsonResponse(
      { success: false, message: 'Sesi tidak valid atau telah berakhir' },
      { status: 401 }
    );
  }

  try {
    const config = await getUserWebhookConfig(user.id);
    const deliveries = await getRecentWebhookDeliveries(user.id, 15);

    return jsonResponse({
      success: true,
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
      deliveries,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { success: false, message: `Gagal memuat konfigurasi webhook: ${msg}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req).catch(() => null);
  if (!user?.id) {
    return jsonResponse(
      { success: false, message: 'Sesi tidak valid atau telah berakhir' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(
      { success: false, message: 'Payload JSON tidak valid' },
      { status: 400 }
    );
  }

  const rawUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : null;
  const regenerateSecret = Boolean(body.regenerateSecret);

  if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    return jsonResponse(
      {
        success: false,
        message: 'Format URL webhook tidak valid. Gunakan format http:// atau https://',
      },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserWebhookConfig(user.id, rawUrl, regenerateSecret);
    return jsonResponse({
      success: true,
      message: rawUrl
        ? 'Pengaturan webhook berhasil disimpan'
        : 'Webhook berhasil dinonaktifkan',
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { success: false, message: `Gagal menyimpan webhook: ${msg}` },
      { status: 500 }
    );
  }
}
