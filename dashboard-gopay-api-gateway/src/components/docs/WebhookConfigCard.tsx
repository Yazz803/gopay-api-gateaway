'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RiWebhookLine,
  RiKey2Line,
  RiSendPlaneLine,
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiShieldCheckLine,
  RiCloseLine,
  RiTimeLine,
  RiInformationLine,
} from 'react-icons/ri';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface WebhookDeliveryItem {
  id: string;
  event: string;
  url: string;
  payloadJson: string;
  responseStatus: number | null;
  responseBody: string | null;
  status: 'success' | 'failed';
  durationMs: number | null;
  createdAt: string;
}

export function WebhookConfigCard() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    durationMs?: number;
    responseBody?: string;
    error?: string;
  } | null>(null);

  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);

  const fetchWebhookData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/webhook');
      const data = await res.json();
      if (data.success) {
        setWebhookUrl(data.webhookUrl || '');
        setWebhookSecret(data.webhookSecret || null);
        setDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error('[FetchWebhook Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhookData();
  }, [fetchWebhookData]);

  const handleSave = async (regenerate = false) => {
    setIsSaving(true);
    setSaveMessage(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/user/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          regenerateSecret: regenerate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookUrl(data.webhookUrl || '');
        setWebhookSecret(data.webhookSecret || null);
        setSaveMessage({ type: 'success', text: data.message });
        fetchWebhookData();
      } else {
        setSaveMessage({ type: 'error', text: data.message || 'Gagal menyimpan webhook' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Terjadi kesalahan koneksi saat menyimpan webhook' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setSaveMessage({ type: 'error', text: 'Tentukan URL webhook terlebih dahulu sebelum uji coba' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/user/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (data.result) {
        setTestResult(data.result);
      } else {
        setTestResult({
          success: false,
          error: data.message || 'Tidak ada respon dari server',
        });
      }
      fetchWebhookData();
    } catch {
      setTestResult({
        success: false,
        error: 'Gagal menghubungi server untuk uji coba webhook',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySecret = () => {
    if (!webhookSecret) return;
    navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <Card className="border border-white/65 dark:border-white/10 shadow-xs overflow-hidden">
      <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2B303A] text-[#EAE6DF] shadow-xs">
              <RiWebhookLine className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                Konfigurasi Webhook Gateway
              </CardTitle>
              <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                Kirimkan notifikasi HTTP POST otomatis ke server Anda setiap kali pembayaran berhasil lunas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWebhookData}
              disabled={isLoading}
              className="text-xs"
            >
              <RiRefreshLine className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* URL Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
              Webhook Endpoint URL (Target Notifikasi)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Input
                  type="url"
                  placeholder="https://toko-anda.com/api/payment-callback"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="font-mono text-xs pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="text-xs font-semibold"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan URL'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={isTesting || !webhookUrl}
                  className="text-xs font-semibold"
                >
                  <RiSendPlaneLine className="h-3.5 w-3.5 mr-1.5" />
                  {isTesting ? 'Menguji...' : 'Uji Coba Kirim'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-1.5 flex items-center gap-1.5">
              <RiInformationLine className="h-3.5 w-3.5 shrink-0" />
              Sistem gateway akan mengirimkan event <code className="px-1.5 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 font-mono text-[10px]">payment.success</code> ke URL ini via HTTP POST saat pembeli selesai membayar.
            </p>
          </div>

          {/* Webhook Secret Key */}
          <div className="p-4 rounded-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiKey2Line className="h-4 w-4 text-[#7A7670] dark:text-[#9E9A92]" />
                <span className="text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA]">
                  Webhook Secret (HMAC-SHA256 Signature)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="text-[11px] font-semibold text-[#4E6E58] dark:text-[#8EB89A] hover:underline cursor-pointer"
              >
                Buat Ulang Secret
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs px-3 py-2 rounded-[8px] bg-[#242831] text-[#EAE6DF] border border-white/10 select-all overflow-hidden truncate">
                {webhookSecret ? (showSecret ? webhookSecret : '••••••••••••••••••••••••••••••••••••••••') : 'Belum dibuat (tersimpan otomatis saat URL diisi)'}
              </div>
              {webhookSecret && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                    className="h-8 px-2.5"
                    title={showSecret ? 'Sembunyikan Secret' : 'Tampilkan Secret'}
                  >
                    {showSecret ? <RiEyeOffLine className="h-4 w-4" /> : <RiEyeLine className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySecret}
                    className="h-8 px-2.5 text-xs"
                    title="Salin Secret"
                  >
                    {copiedSecret ? <RiCheckLine className="h-4 w-4 text-[#8EB89A]" /> : <RiFileCopyLine className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
              Gunakan secret ini di server backend Anda untuk memverifikasi header <code className="px-1 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 font-mono text-[10px]">X-Gateway-Signature</code> guna memastikan payload asli dari gateway.
            </p>
          </div>

          {/* Feedback & Notifications */}
          {saveMessage && (
            <div
              className={`p-3 rounded-[8px] text-xs font-medium flex items-center justify-between border ${
                saveMessage.type === 'success'
                  ? 'bg-[#4E6E58]/10 text-[#4E6E58] dark:text-[#8EB89A] border-[#4E6E58]/20'
                  : 'bg-[#B85D43]/10 text-[#B85D43] dark:text-[#F0C8BE] border-[#B85D43]/20'
              }`}
            >
              <span>{saveMessage.text}</span>
              <button
                type="button"
                onClick={() => setSaveMessage(null)}
                className="opacity-70 hover:opacity-100"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Test Ping Live Inspection Result */}
          {testResult && (
            <div
              className={`p-4 rounded-[10px] border text-xs space-y-2 ${
                testResult.success
                  ? 'bg-[#4E6E58]/10 border-[#4E6E58]/25 text-[#1E2229] dark:text-[#F3EFEA]'
                  : 'bg-[#B85D43]/10 border-[#B85D43]/25 text-[#1E2229] dark:text-[#F3EFEA]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {testResult.success ? (
                    <RiShieldCheckLine className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A]" />
                  ) : (
                    <RiCloseLine className="h-4 w-4 text-[#B85D43] dark:text-[#F0C8BE]" />
                  )}
                  {testResult.success
                    ? 'Uji Coba Pengiriman Berhasil Diterima'
                    : 'Uji Coba Pengiriman Gagal Diterima'}
                </span>
                <span className="font-mono font-semibold text-[11px] px-2 py-0.5 rounded-[6px] bg-black/10 dark:bg-white/10">
                  HTTP {testResult.statusCode || 0} • {testResult.durationMs ?? 0}ms
                </span>
              </div>
              {testResult.responseBody && (
                <div className="font-mono text-[11px] p-2.5 rounded-[6px] bg-[#242831] text-[#EAE6DF] whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                  {testResult.responseBody}
                </div>
              )}
              {testResult.error && (
                <p className="text-[11px] text-[#B85D43] dark:text-[#F0C8BE]">
                  Detail error: {testResult.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Webhook Delivery History Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA] tracking-tight">
              Riwayat Pengiriman Webhook Terakhir
            </h4>
            <span className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
              {deliveries.length} pengiriman tercatat
            </span>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-6 text-center rounded-[10px] border border-dashed border-black/15 dark:border-white/15 text-xs text-[#7A7670] dark:text-[#9E9A92]">
              Belum ada riwayat pengiriman webhook. Anda dapat menekan tombol &quot;Uji Coba Kirim&quot; di atas untuk menguji respons server Anda.
            </div>
          ) : (
            <div className="rounded-[10px] border border-black/10 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92]">
                    <tr>
                      <th className="px-3.5 py-2.5">Event</th>
                      <th className="px-3.5 py-2.5">Status HTTP</th>
                      <th className="px-3.5 py-2.5">Target Endpoint</th>
                      <th className="px-3.5 py-2.5">Durasi</th>
                      <th className="px-3.5 py-2.5">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                    {deliveries.map((item) => {
                      const isOk = item.status === 'success' && item.responseStatus && item.responseStatus >= 200 && item.responseStatus < 300;
                      return (
                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-[#1E2229] dark:text-[#F3EFEA]">
                            {item.event}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-[6px] ${
                                isOk
                                  ? 'bg-[#4E6E58]/15 text-[#4E6E58] dark:text-[#8EB89A]'
                                  : 'bg-[#B85D43]/15 text-[#B85D43] dark:text-[#F0C8BE]'
                              }`}
                            >
                              HTTP {item.responseStatus || 0}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92] max-w-[200px] truncate" title={item.url}>
                            {item.url}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] tabular-nums text-[#7A7670] dark:text-[#9E9A92]">
                            {item.durationMs ?? 0} ms
                          </td>
                          <td className="px-3.5 py-2.5 text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                            {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
