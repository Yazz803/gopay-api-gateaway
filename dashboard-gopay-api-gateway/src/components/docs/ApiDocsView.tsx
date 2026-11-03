'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RiBookOpenLine,
  RiKey2Line,
  RiQrCodeLine,
  RiHistoryLine,
  RiWebhookLine,
  RiShieldCheckLine,
  RiFileCopyLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiArrowRightLine,
  RiTerminalBoxLine,
  RiCompass3Line,
} from 'react-icons/ri';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from './CodeBlock';
import { WebhookConfigCard } from './WebhookConfigCard';

type TabKey = 'overview' | 'create-qris' | 'check-status' | 'check-payment' | 'transactions' | 'webhook';

export function ApiDocsView() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>('https://domain-anda.com');
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user?.apiKey) {
          setApiKey(data.user.apiKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const navTabs: { id: TabKey; label: string; icon: React.ReactNode; method?: 'POST' | 'GET' }[] = [
    {
      id: 'overview',
      label: 'Ikhtisar & Autentikasi',
      icon: <RiCompass3Line className="h-4 w-4" />,
    },
    {
      id: 'create-qris',
      label: 'Buat QRIS Dinamis',
      method: 'POST',
      icon: <RiQrCodeLine className="h-4 w-4" />,
    },
    {
      id: 'check-status',
      label: 'Cek Status QRIS',
      method: 'GET',
      icon: <RiShieldCheckLine className="h-4 w-4" />,
    },
    {
      id: 'check-payment',
      label: 'Verifikasi Transaksi',
      method: 'POST',
      icon: <RiHistoryLine className="h-4 w-4" />,
    },
    {
      id: 'transactions',
      label: 'Daftar Transaksi',
      method: 'GET',
      icon: <RiTerminalBoxLine className="h-4 w-4" />,
    },
    {
      id: 'webhook',
      label: 'Webhook Payment Gateway',
      icon: <RiWebhookLine className="h-4 w-4" />,
    },
  ];

  const sampleApiKey = apiKey || 'gopay_live_9a8b7c6d5e4f3a2b1c0d';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Quick Info */}
      <div className="rounded-[14px] bg-[#2B303A] text-[#EAE6DF] p-6 shadow-sm border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9FA7] px-2.5 py-0.5 rounded-[6px] bg-white/10">
                Dokumentasi Pengembang
              </span>
              <span className="text-[11px] font-semibold text-[#8EB89A] px-2 py-0.5 rounded-[6px] bg-[#4E6E58]/30">
                REST API v1
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#EAE6DF]">
              Dokumentasi API Payment Gateway
            </h2>
            <p className="text-xs text-[#9B9FA7] max-w-2xl leading-relaxed">
              Hubungkan toko online, aplikasi mobile, kasir POS, atau bot WhatsApp Anda ke gateway QRIS GoPay secara langsung dan terima notifikasi lunas instan melalui Webhook.
            </p>
          </div>

          {/* Quick API Key Box */}
          <div className="p-3.5 rounded-[10px] bg-[#383E4A] border border-white/10 shrink-0 w-full md:w-80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#9B9FA7]">
              <span className="font-medium flex items-center gap-1.5">
                <RiKey2Line className="h-3.5 w-3.5" />
                API Key Toko Anda
              </span>
              <Link href="/profile" className="text-[#8EB89A] hover:underline font-semibold">
                Kelola Profil
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-[6px] bg-[#242831] text-[#EAE6DF] border border-white/10 truncate select-all">
                {apiKey ? `${apiKey.substring(0, 14)}••••••••` : 'Muat API Key...'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
                disabled={!apiKey}
                className="h-8 px-2.5 text-xs text-black shrink-0"
                title="Salin API Key"
              >
                {copiedKey ? (
                  <RiCheckLine className="h-4 w-4 text-[#4E6E58]" />
                ) : (
                  <RiFileCopyLine className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-black/10 dark:border-white/10">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-[8px] whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#2B303A] text-[#EAE6DF] shadow-xs'
                  : 'text-[#7A7670] dark:text-[#9E9A92] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1E2229] dark:hover:text-[#F3EFEA]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.method && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-[4px] font-mono font-bold uppercase ${
                    tab.method === 'POST'
                      ? 'bg-[#4E6E58]/30 text-[#8EB89A]'
                      : 'bg-[#383E4A] text-[#EAE6DF]'
                  }`}
                >
                  {tab.method}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Authentication */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <CardTitle className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA] flex items-center gap-2">
                <RiCompass3Line className="h-4 w-4" />
                Alur Integrasi Payment Gateway (Midtrans / Xendit Style)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                Platform ini menyediakan antarmuka REST API dan Webhook dengan alur kerja yang identik dengan payment gateway modern:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6E58] dark:text-[#8EB89A]">
                    Langkah 1: Generate QRIS
                  </span>
                  <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    Sistem Anda memanggil API
                  </h4>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Kirim permintaan <code className="font-mono text-[10px] px-1 bg-black/5 dark:bg-white/10 rounded">POST /api/create-qris</code> dengan parameter <code className="font-mono text-[10px]">amount</code> dan <code className="font-mono text-[10px]">trx_id</code>. Gateway mengembalikan string QRIS dinamis dan URL halaman pembayaran pembeli.
                  </p>
                </div>

                <div className="p-4 rounded-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6E58] dark:text-[#8EB89A]">
                    Langkah 2: Pembayaran Pembeli
                  </span>
                  <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    Scan via GoPay / BCA / QRIS Apapun
                  </h4>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Pembeli memindai kode QRIS menggunakan e-wallet atau m-banking manapun di Indonesia. Nominal pembayaran terkunci otomatis secara presisi.
                  </p>
                </div>

                <div className="p-4 rounded-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E6E58] dark:text-[#8EB89A]">
                    Langkah 3: Notifikasi Webhook
                  </span>
                  <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    Webhook Terpicu Real-time
                  </h4>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Saat saldo masuk ke akun GoPay toko, gateway mendeteksi transaksi dan seketika menembakkan HTTP POST webhook event <code className="font-mono text-[10px]">payment.success</code> ke server Anda.
                  </p>
                </div>
              </div>

              {/* Authentication Details */}
              <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Header Autentikasi API
                </h3>
                <p className="text-xs text-[#7A7670] dark:text-[#9E9A92]">
                  Setiap panggilan endpoint API wajib menyertakan header <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">x-api-key</code>:
                </p>

                <CodeBlock
                  title="HTTP Request Header"
                  language="http"
                  code={`x-api-key: ${sampleApiKey}\nContent-Type: application/json`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Create QRIS */}
      {activeTab === 'create-qris' && (
        <div className="space-y-6">
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#4E6E58] text-white rounded-[6px]">
                  POST
                </span>
                <div>
                  <CardTitle className="text-sm font-mono font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    /api/create-qris
                  </CardTitle>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                    Membuat kode QRIS Dinamis baru untuk nominal dan nomor transaksi tertentu
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Parameters Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Request Body (JSON)
                </h4>
                <div className="rounded-[10px] border border-black/10 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92]">
                      <tr>
                        <th className="px-3.5 py-2.5">Field</th>
                        <th className="px-3.5 py-2.5">Tipe</th>
                        <th className="px-3.5 py-2.5">Wajib</th>
                        <th className="px-3.5 py-2.5">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">amount</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">integer</td>
                        <td className="px-3.5 py-2.5 text-[#4E6E58] dark:text-[#8EB89A] font-semibold">Ya</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">Nominal tagihan dalam Rupiah (misal: 25000)</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">trx_id</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">string</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">Opsional</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">ID transaksi / nomor nota dari sistem Anda (misal: INV-2026-001)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Examples */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Contoh Panggilan API
                </h4>

                <div className="space-y-4">
                  <CodeBlock
                    title="cURL (Terminal)"
                    language="bash"
                    code={`curl -X POST "${baseUrl}/api/create-qris" \\
  -H "x-api-key: ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 25000, "trx_id": "INV-2026-001"}'`}
                  />

                  <CodeBlock
                    title="Node.js (Axios / Fetch)"
                    language="javascript"
                    code={`const response = await fetch("${baseUrl}/api/create-qris", {
  method: "POST",
  headers: {
    "x-api-key": "${sampleApiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amount: 25000,
    trx_id: "INV-2026-001"
  })
});
const data = await response.json();
console.log("QR String:", data.data.qris_code);
console.log("Halaman Bayar:", data.data.qris_url);`}
                  />

                  <CodeBlock
                    title="PHP (cURL)"
                    language="php"
                    code={`$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => "${baseUrl}/api/create-qris",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "amount" => 25000,
    "trx_id" => "INV-2026-001"
  ]),
  CURLOPT_HTTPHEADER => [
    "x-api-key: ${sampleApiKey}",
    "Content-Type: application/json"
  ],
]);
$response = json_decode(curl_exec($curl), true);
curl_close($curl);`}
                  />
                </div>
              </div>

              {/* Sample Response */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Contoh Response (200 OK)
                </h4>
                <CodeBlock
                  title="Response JSON"
                  language="json"
                  code={`{
  "success": true,
  "status": "PENDING",
  "data": {
    "qris_id": "a9k2lm5n",
    "trx_id": "INV-2026-001",
    "qris_url": "${baseUrl}/qr/a9k2lm5n",
    "qris_code": "00020101021226610016ID.CO.GOPAY.WWW011893600914382...",
    "amount": 25000,
    "expires_at": "2026-11-03T10:15:00.000Z",
    "expires_in": "5 menit"
  },
  "qris_code": "00020101021226610016ID.CO.GOPAY.WWW011893600914382...",
  "amount": 25000,
  "trx_id": "INV-2026-001",
  "expires_at": "2026-11-03T10:15:00.000Z",
  "check_status_url": "${baseUrl}/qr/a9k2lm5n"
}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Check Status */}
      {activeTab === 'check-status' && (
        <div className="space-y-6">
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#2B303A] text-white rounded-[6px]">
                  GET
                </span>
                <div>
                  <CardTitle className="text-sm font-mono font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    /api/qr-status/:id
                  </CardTitle>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                    Mengecek status pembayaran QRIS berdasarkan qris_id atau trx_id
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Parameter URL Path
                </h4>
                <div className="rounded-[10px] border border-black/10 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92]">
                      <tr>
                        <th className="px-3.5 py-2.5">Param</th>
                        <th className="px-3.5 py-2.5">Tipe</th>
                        <th className="px-3.5 py-2.5">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">id</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">string</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">
                          Dapat berupa <code className="font-mono text-[10px] px-1 bg-black/5 dark:bg-white/10 rounded">qris_id</code> (misal: a9k2lm5n) atau <code className="font-mono text-[10px] px-1 bg-black/5 dark:bg-white/10 rounded">trx_id</code> (misal: INV-2026-001)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Contoh Panggilan API
                </h4>
                <CodeBlock
                  title="cURL (Terminal)"
                  language="bash"
                  code={`curl -X GET "${baseUrl}/api/qr-status/INV-2026-001" \\
  -H "x-api-key: ${sampleApiKey}"`}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Respon Pembayaran Berhasil (Status: PAID)
                </h4>
                <CodeBlock
                  title="Response JSON (Lunas)"
                  language="json"
                  code={`{
  "success": true,
  "paid": true,
  "status": "PAID",
  "transaction": {
    "id": "1049284729104",
    "order_id": "INV-2026-001",
    "amount": 25000,
    "payment_type": "qris",
    "payer_issuer": "GoPay",
    "transaction_time": "2026-11-03 10:12:45"
  }
}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Check Payment */}
      {activeTab === 'check-payment' && (
        <div className="space-y-6">
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#4E6E58] text-white rounded-[6px]">
                  POST
                </span>
                <div>
                  <CardTitle className="text-sm font-mono font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    /api/check-payment
                  </CardTitle>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                    Verifikasi manual apakah ada transaksi nominal tertentu yang masuk ke akun GoPay toko
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <CodeBlock
                  title="cURL (Terminal)"
                  language="bash"
                  code={`curl -X POST "${baseUrl}/api/check-payment" \\
  -H "x-api-key: ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 25000, "trx_id": "INV-2026-001"}'`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Transactions List */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#2B303A] text-white rounded-[6px]">
                  GET
                </span>
                <div>
                  <CardTitle className="text-sm font-mono font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    /api/transactions
                  </CardTitle>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                    Mengambil daftar riwayat transaksi pembayaran yang telah berhasil diverifikasi
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <CodeBlock
                  title="cURL (Terminal)"
                  language="bash"
                  code={`curl -X GET "${baseUrl}/api/transactions?limit=20" \\
  -H "x-api-key: ${sampleApiKey}"`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 6: Webhook */}
      {activeTab === 'webhook' && (
        <div className="space-y-6">
          {/* Webhook Configuration Widget Card */}
          <WebhookConfigCard />

          {/* Webhook Specification & Security Documentation */}
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardHeader className="bg-[#EAE4DC] dark:bg-[#1A1E26] border-b border-black/5 dark:border-white/10 p-5">
              <CardTitle className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA] flex items-center gap-2">
                <RiShieldCheckLine className="h-4 w-4" />
                Spesifikasi & Verifikasi Keamanan Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                Setiap kali pembeli menyelesaikan pembayaran, gateway akan mengirimkan permintaan HTTP POST dengan rincian transaksi dalam format JSON.
              </p>

              {/* Headers sent */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  HTTP Headers Yang Dikirimkan Oleh Gateway
                </h4>
                <div className="rounded-[10px] border border-black/10 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92]">
                      <tr>
                        <th className="px-3.5 py-2.5">Header</th>
                        <th className="px-3.5 py-2.5">Contoh Nilai</th>
                        <th className="px-3.5 py-2.5">Fungsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">X-Gateway-Event</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">payment.success</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">Nama event pemicu notifikasi</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">X-Gateway-Signature</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">sha256=d3f2...</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">Tanda tangan HMAC-SHA256 untuk memvalidasi keaslian payload</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#1E2229] dark:text-[#F3EFEA]">X-Gateway-Timestamp</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">2026-11-03T10:12:34.567Z</td>
                        <td className="px-3.5 py-2.5 text-[#7A7670] dark:text-[#9E9A92]">Waktu pengiriman payload oleh gateway</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Webhook Payload */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                  Format Payload JSON Webhook (Event: payment.success)
                </h4>
                <CodeBlock
                  title="Webhook Payload JSON"
                  language="json"
                  code={`{
  "event": "payment.success",
  "timestamp": "2026-11-03T10:15:30.120Z",
  "data": {
    "qris_id": "a9k2lm5n",
    "trx_id": "INV-2026-001",
    "amount": 25000,
    "nominal": 25000,
    "payment_type": "qris",
    "issuer": "GoPay",
    "transaction_id": "1049284729104",
    "transaction_time": "2026-11-03 10:15:25",
    "status": "PAID"
  }
}`}
                />
              </div>

              {/* Signature Verification Code */}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    Contoh Verifikasi Tanda Tangan (HMAC-SHA256) di Server Anda
                  </h4>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-0.5">
                    Gunakan Webhook Secret yang tertera di kartu konfigurasi di atas untuk memverifikasi payload mentah sebelum memproses order:
                  </p>
                </div>

                <div className="space-y-4">
                  <CodeBlock
                    title="Node.js (Express)"
                    language="javascript"
                    code={`const crypto = require('crypto');
const express = require('express');
const app = express();

// Gunakan express.raw atau express.json dengan opsi verify
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.GATEWAY_WEBHOOK_SECRET;
  const signatureHeader = req.headers['x-gateway-signature']; // format: sha256=<hex>
  const rawBody = req.body.toString('utf8');

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signatureHeader !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody);
  const { trx_id, amount, status } = payload.data;

  // Lakukan pembaruan status order di database Anda
  console.log(\`Order \${trx_id} berhasil dibayar sebesar Rp \${amount}\`);

  // Wajib kembalikan status HTTP 200 OK
  res.status(200).json({ received: true });
});`}
                  />

                  <CodeBlock
                    title="PHP (Native / Laravel)"
                    language="php"
                    code={`<?php
$secret = getenv('GATEWAY_WEBHOOK_SECRET');
$rawPayload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'] ?? '';

$expectedSignature = 'sha256=' . hash_hmac('sha256', $rawPayload, $secret);

if (!hash_equals($expectedSignature, $signatureHeader)) {
    http_response_code(401);
    exit('Invalid signature');
}

$data = json_decode($rawPayload, true);
$trxId = $data['data']['trx_id'];
$amount = $data['data']['amount'];

// Perbarui status pesanan menjadi lunas di sistem Anda
// ...

http_response_code(200);
echo json_encode(['received' => true]);`}
                  />

                  <CodeBlock
                    title="Python (FastAPI / Flask)"
                    language="python"
                    code={`import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/api/webhook")
async def handle_webhook(request: Request):
    secret = "whsec_anda_disini".encode('utf-8')
    signature_header = request.headers.get("x-gateway-signature", "")
    raw_body = await request.body()

    expected_signature = "sha256=" + hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_signature, signature_header):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    order_data = payload.get("data", {})
    print(f"Pesanan {order_data.get('trx_id')} lunas: Rp {order_data.get('amount')}")

    return {"received": True}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
