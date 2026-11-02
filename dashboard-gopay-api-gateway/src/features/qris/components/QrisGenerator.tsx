'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiCheckCircle, FiCopy, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils';
import { GatewayService } from '@/services/gateway.service';
import type { CreateQrisResponse, QrStatusResponse } from '@/types';

export function QrisGenerator({ onPaymentSuccess }: { onPaymentSuccess?: () => void }) {
  const [amountInput, setAmountInput] = useState<string>('10000');
  const [trxIdInput, setTrxIdInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQris, setGeneratedQris] = useState<CreateQrisResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<QrStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 mins in seconds

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountNum = parseInt(amountInput.replace(/\D/g, ''), 10);
    if (!amountNum || amountNum <= 0) {
      setErrorMessage('Jumlah pembayaran harus lebih dari Rp 0.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setPaymentStatus(null);
    setTimeLeft(300);

    // Clear previous timers
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const generatedTrxId = trxIdInput.trim() || `TRX-${Date.now().toString(36).toUpperCase()}`;
      const res = await GatewayService.createQris({
        amount: amountNum,
        trx_id: generatedTrxId,
      });

      if (!res.success) {
        throw new Error(res.message || 'Gagal membuat kode QRIS');
      }

      setGeneratedQris(res);

      // Start countdown
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling for payment verification.
      // PENTING: status harus dicek memakai qris_id (kunci qrisStore di server),
      // BUKAN trx_id. Versi sebelumnya memakai trx_id sehingga polling selalu
      // menerima NOT_FOUND dan status pembayaran di dashboard tidak pernah
      // berubah menjadi PAID.
      const checkId = typeof res.data === 'object' ? res.data.qris_id || '' : '';
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await GatewayService.getQrStatus(checkId);
          setPaymentStatus(statusRes);

          if (statusRes.paid || statusRes.status === 'PAID') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (onPaymentSuccess) onPaymentSuccess();
          } else if (statusRes.status === 'EXPIRED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          }
        } catch {
          // Poll attempt failed temporarily
        }
        // 10 detik: diselaraskan dengan cooldown server (STATUS_COOLDOWN_MS).
        // Polling lebih cepat dari itu hanya akan menerima respons cached.
      }, 10000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat QRIS dinamis';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Safe accessor helpers
  const qrisString =
    typeof generatedQris?.data === 'string'
      ? generatedQris.data
      : generatedQris?.data?.qris_code || generatedQris?.qris_code || '';

  const qrisTrxId =
    generatedQris?.trx_id ||
    (typeof generatedQris?.data === 'object' ? generatedQris.data.trx_id : '') ||
    '';

  const qrisAmount =
    generatedQris?.amount ||
    (typeof generatedQris?.data === 'object' ? generatedQris.data.amount : 0) ||
    0;

  const handleCopyPayload = () => {
    if (!qrisString) return;
    navigator.clipboard.writeText(qrisString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isPaid = paymentStatus?.paid || paymentStatus?.status === 'PAID';
  const isExpired = timeLeft === 0 || paymentStatus?.status === 'EXPIRED';

  // QR Code Image Generator URL
  const qrImageUrl = qrisString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrisString)}`
    : null;

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Buat Kode QRIS Pembayaran</CardTitle>
        <CardDescription>
          Ketik jumlah tagihan untuk menampilkan kode QRIS resmi yang siap di-scan oleh pembeli
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Jumlah Tagihan (Rupiah)
            </label>
            <Input
              type="number"
              placeholder="Contoh: 50000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(String(amt))}
                  className="text-xs px-3 py-1 rounded-full bg-[#E8E2D9] hover:bg-[#DED8CE] dark:bg-[#272C37] dark:hover:bg-[#333946] text-[#1E2229] dark:text-[#F3EFEA] font-semibold transition-colors cursor-pointer tabular-nums shadow-xs"
                >
                  {formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan / Nomor Nota (Opsional)
            </label>
            <Input
              type="text"
              placeholder="Contoh: NOTA-102 (kosongkan jika otomatis)"
              value={trxIdInput}
              onChange={(e) => setTrxIdInput(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isGenerating}
          >
            Tampilkan Kode QRIS
          </Button>
        </form>

        {generatedQris && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
            {/* Payment Status Notification Banner */}
            {isPaid ? (
              <div className="w-full mb-5 rounded-[12px] bg-[#4E6E58]/15 dark:bg-[#658E72]/20 border border-[#4E6E58]/30 dark:border-[#658E72]/40 p-4 text-center animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#4E6E58]/20 dark:bg-[#658E72]/30 mb-2">
                  <FiCheckCircle className="h-6 w-6 text-[#4E6E58] dark:text-[#8EB89A]" />
                </div>
                <h4 className="text-xs font-bold text-[#4E6E58] dark:text-[#8EB89A]">
                  Pembayaran Berhasil Diterima!
                </h4>
                <p className="text-xs text-[#4E6E58]/80 dark:text-[#8EB89A]/90 mt-1 tabular-nums font-semibold">
                  Uang sejumlah {formatRupiah(qrisAmount)} telah berhasil masuk ke GoPay Anda
                </p>
              </div>
            ) : isExpired ? (
              <div className="w-full mb-5 rounded-[12px] bg-[#B85D43]/15 dark:bg-[#D07258]/20 border border-[#B85D43]/30 dark:border-[#D07258]/40 p-3 text-center">
                <p className="text-xs font-semibold text-[#B85D43] dark:text-[#F0C8BE] inline-flex items-center justify-center gap-1.5">
                  <FiAlertCircle className="h-4 w-4 shrink-0" />
                  Batas waktu pembayaran telah habis. Silakan buat kode QR baru untuk pelanggan.
                </p>
              </div>
            ) : (
              <div className="w-full mb-4 flex items-center justify-between rounded-[10px] bg-[#D99B26]/15 dark:bg-[#D99B26]/20 border border-[#D99B26]/30 dark:border-[#D99B26]/40 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 text-[#A36A18] dark:text-[#F3C878] font-semibold">
                  <FiClock className="h-4 w-4 shrink-0" />
                  Menunggu pembeli scan & bayar...
                </div>
                <Badge variant="warning" size="sm" className="tabular-nums">
                  Waktu tersisa: {formattedCountdown}
                </Badge>
              </div>
            )}

            {/* QR Code Container */}
            <div className="relative rounded-[14px] bg-white p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] border border-white/65 dark:border-white/10 flex flex-col items-center">
              {qrImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt={`QRIS Dinamis ${qrisAmount}`}
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              )}
              <div className="mt-2 text-center">
                <span className="text-sm font-bold text-[#1E2229] tabular-nums">
                  {formatRupiah(qrisAmount)}
                </span>
                <p className="text-[11px] text-[#7A7670] font-mono">
                  {qrisTrxId}
                </p>
              </div>
            </div>

            {/* QRIS String Payload Copy */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A7670] dark:text-[#9E9A92] font-medium">
                  Salin Kode Teks (Untuk Dikirim / Integrasi):
                </span>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="inline-flex items-center gap-1.5 text-[#2B303A] dark:text-[#EAE6DF] hover:underline font-semibold cursor-pointer"
                >
                  {copied ? (
                    <>
                      <FiCheck className="h-3.5 w-3.5 text-[#4E6E58] dark:text-[#8EB89A]" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="h-3.5 w-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-mono break-all bg-[#E8E2D9]/70 dark:bg-[#15181E] p-2.5 rounded-[10px] border border-[#D9D2C7] dark:border-white/10 text-[#1E2229] dark:text-[#F3EFEA] max-h-20 overflow-y-auto">
                {qrisString}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
