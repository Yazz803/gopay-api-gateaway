'use client';

import React, { useState, useEffect, useRef } from 'react';
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
      setErrorMessage('Nominal harus lebih dari 0.');
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
        throw new Error(res.message || 'Gagal generate QRIS');
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

      // Start polling for payment verification
      const checkId = res.trx_id;
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
      }, 2500);
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

  const handleCopyPayload = () => {
    if (!generatedQris?.data) return;
    navigator.clipboard.writeText(generatedQris.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isPaid = paymentStatus?.paid || paymentStatus?.status === 'PAID';
  const isExpired = timeLeft === 0 || paymentStatus?.status === 'EXPIRED';

  // QR Code Image Generator URL (using Google Charts API for reliable standalone QR rendering)
  const qrImageUrl = generatedQris?.data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(generatedQris.data)}`
    : null;

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Generator & Simulator QRIS Dinamis</CardTitle>
        <CardDescription>
          Buat QRIS dinamis GoPay secara instan dengan nominal spesifik dan auto-checker
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nominal Pembayaran (IDR)
            </label>
            <Input
              type="number"
              placeholder="Contoh: 10000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(String(amt))}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Custom TRX / Order ID (Opsional)
            </label>
            <Input
              type="text"
              placeholder="Biarkan kosong untuk auto-generate ID..."
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
            Generate QRIS Dinamis
          </Button>
        </form>

        {generatedQris && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
            {/* Payment Status Notification Banner */}
            {isPaid ? (
              <div className="w-full mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 text-center animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mb-2">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Pembayaran Berhasil Diterima!
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Nominal {formatRupiah(generatedQris.amount)} terverifikasi lunas
                </p>
              </div>
            ) : isExpired ? (
              <div className="w-full mb-5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3 text-center">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  QRIS Kedaluwarsa. Silakan generate ulang untuk transaksi baru.
                </p>
              </div>
            ) : (
              <div className="w-full mb-4 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  Menunggu Pembayaran Customer...
                </div>
                <Badge variant="warning" size="sm">
                  Berlaku: {formattedCountdown}
                </Badge>
              </div>
            )}

            {/* QR Code Container */}
            <div className="relative rounded-2xl bg-white p-4 shadow-md border border-slate-200 dark:border-slate-700 flex flex-col items-center">
              {qrImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt={`QRIS Dinamis ${generatedQris.amount}`}
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              )}
              <div className="mt-2 text-center">
                <span className="text-xs font-bold text-slate-800">
                  {formatRupiah(generatedQris.amount)}
                </span>
                <p className="text-[10px] text-slate-500 font-mono">
                  {generatedQris.trx_id}
                </p>
              </div>
            </div>

            {/* QRIS String Payload Copy */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  String Payload EMVCo:
                </span>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="text-[#00aa13] dark:text-[#00c817] hover:underline font-medium cursor-pointer"
                >
                  {copied ? 'Tersalin!' : 'Salin String'}
                </button>
              </div>
              <p className="text-[10px] font-mono break-all bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 max-h-20 overflow-y-auto">
                {generatedQris.data}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
