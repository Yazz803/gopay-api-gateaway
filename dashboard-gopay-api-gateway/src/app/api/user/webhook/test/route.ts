import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { jsonResponse } from '@/lib/auth';
import { getUserWebhookConfig, testWebhookEndpoint } from '@/lib/webhook-service';

export const dynamic = 'force-dynamic';

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
    // optional body
  }

  let targetUrl = typeof body?.targetUrl === 'string' ? body.targetUrl.trim() : null;
  const config = await getUserWebhookConfig(user.id);

  if (!targetUrl) {
    targetUrl = config.webhookUrl;
  }

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return jsonResponse(
      {
        success: false,
        message: 'URL webhook belum diatur atau format URL tidak valid (harus http:// atau https://)',
      },
      { status: 400 }
    );
  }

  try {
    const result = await testWebhookEndpoint(user.id, targetUrl, config.webhookSecret);
    return jsonResponse({
      success: true,
      message: result.success
        ? `Uji coba webhook berhasil dikirim (HTTP ${result.statusCode})`
        : `Uji coba webhook gagal diterima oleh server tujuan (HTTP ${result.statusCode || 'N/A'})`,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      { success: false, message: `Gagal menjalankan uji coba webhook: ${msg}` },
      { status: 500 }
    );
  }
}
