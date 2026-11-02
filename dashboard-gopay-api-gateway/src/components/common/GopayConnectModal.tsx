'use client';

import React, { useState } from 'react';
import { TbPlugConnected } from 'react-icons/tb';
import {
  FiX,
  FiPhone,
  FiKey,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiRotateCw,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GatewayService } from '@/services/gateway.service';

export interface GopayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GopayConnectModal({ isOpen, onClose, onSuccess }: GopayConnectModalProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneNumber.replace(/[^\d+]/g, '').trim();
    if (!clean || clean.length < 9) {
      setErrorMessage('Nomor HP tidak valid. Masukkan nomor HP GoBiz Anda (contoh: 085119772671).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GatewayService.requestGopayOtp(clean);
      if (res.success) {
        setStep('otp');
        setSuccessMessage('Kode OTP telah dikirim melalui SMS/WhatsApp ke nomor HP Anda.');
      } else {
        setErrorMessage(res.message || 'Gagal mengirim kode OTP. Periksa nomor HP Anda.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat mengirim OTP.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage('Masukkan kode OTP 4 digit.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GatewayService.submitGopayOtp(cleanOtp);
      if (res.success) {
        setStep('success');
        setSuccessMessage('Akun GoPay Merchant Anda berhasil terhubung!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          // Reset
          setStep('phone');
          setPhoneNumber('');
          setOtpCode('');
        }, 2000);
      } else {
        setErrorMessage(res.message || 'Kode OTP tidak valid atau sudah kedaluwarsa.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verifikasi OTP gagal.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('phone');
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B303A]/70 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-[14px] bg-[#F3EFEA] p-6 shadow-[0_10px_25px_-5px_rgba(43,48,58,0.2)] dark:bg-[#1D212A] border border-white/65 dark:border-white/10 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E8E2D9] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#4E6E58]/15 text-[#4E6E58] dark:bg-[#658E72]/20 dark:text-[#8EB89A]">
              <TbPlugConnected className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                Sambungkan Akun GoPay Merchant
              </h3>
              <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-0.5">
                Login resmi GoBiz untuk menerima notifikasi pembayaran masuk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-[8px] text-[#7A7670] hover:text-[#1E2229] dark:text-[#9E9A92] dark:hover:text-[#F3EFEA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-5 space-y-4">
          {errorMessage && (
            <div className="rounded-[10px] bg-[#B85D43]/15 dark:bg-[#D07258]/20 border border-[#B85D43]/30 dark:border-[#D07258]/40 p-3 text-xs text-[#B85D43] dark:text-[#F0C8BE] flex items-start gap-2 animate-in fade-in">
              <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && step !== 'success' && (
            <div className="rounded-[10px] bg-[#4E6E58]/15 dark:bg-[#658E72]/20 border border-[#4E6E58]/30 dark:border-[#658E72]/40 p-3 text-xs text-[#4E6E58] dark:text-[#8EB89A] flex items-start gap-2 animate-in fade-in">
              <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {step === 'phone' ? (
              /* Step 1: Input Phone Number */
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                    Nomor HP GoBiz / GoFood Merchant
                  </label>
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder="Contoh: 085119772671"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="pr-10"
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7670] dark:text-[#9E9A92] pointer-events-none">
                      <FiPhone className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Pastikan nomor HP ini terdaftar aktif di aplikasi GoBiz toko Anda untuk menerima kode OTP.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isLoading}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span>Kirim Kode OTP</span>
                    <FiArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            ) : step === 'otp' ? (
              /* Step 2: Input OTP Code */
              <form onSubmit={handleSubmitOtp} className="space-y-4">
                <div className="p-3 rounded-[10px] bg-[#E8E2D9]/60 dark:bg-[#272C37]/60 border border-[#D9D2C7] dark:border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FiPhone className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A]" />
                    <span className="font-semibold text-[#1E2229] dark:text-[#F3EFEA] font-mono">
                      {phoneNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="text-xs text-[#2B303A] dark:text-[#EAE6DF] hover:underline font-semibold cursor-pointer"
                  >
                    Ubah Nomor
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                    Masukkan Kode OTP (4 Digit)
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="1234"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                      disabled={isLoading}
                      className="text-center font-mono text-lg tracking-widest tabular-nums font-bold"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7670] dark:text-[#9E9A92] pointer-events-none">
                      <FiKey className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                    Cek SMS atau WhatsApp pada HP Anda. Kode berlaku selama beberapa menit.
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="text-xs text-[#7A7670] dark:text-[#9E9A92] hover:text-[#1E2229] dark:hover:text-[#F3EFEA] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FiRotateCw className="h-3 w-3" />
                    <span>Kirim Ulang OTP</span>
                  </button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Tutup
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                      className="inline-flex items-center gap-1.5"
                    >
                      <TbPlugConnected className="h-4 w-4" />
                      <span>Verifikasi & Hubungkan</span>
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              /* Success State */
              <div className="py-6 text-center space-y-3 animate-in zoom-in-95">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#4E6E58]/20 text-[#4E6E58] dark:bg-[#658E72]/30 dark:text-[#8EB89A]">
                  <FiCheckCircle className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-[#4E6E58] dark:text-[#8EB89A]">
                  Berhasil Terhubung!
                </h4>
                <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] max-w-sm mx-auto leading-relaxed">
                  Sesi login akun GoPay Anda telah aktif. Dashboard sekarang siap memverifikasi transaksi masuk.
                </p>
                <div className="pt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onSuccess?.();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    <span>Selesai</span>
                  </Button>
                </div>
              </div>
              )}
              </div>
              </div>
              </div>
              );
              }
