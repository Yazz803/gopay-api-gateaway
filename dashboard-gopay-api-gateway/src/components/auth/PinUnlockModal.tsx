'use client';

import React, { useState } from 'react';
import { FiLock, FiKey, FiAlertCircle, FiCheckCircle, FiRotateCcw, FiArrowRight, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface PinUnlockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  canDismiss?: boolean;
}

export function PinUnlockModal({ isOpen, onClose, onSuccess, canDismiss = false }: PinUnlockModalProps) {
  const [mode, setMode] = useState<'pin' | 'recover'>('pin');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlockWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setErrorMessage('PIN harus terdiri dari 6 digit angka.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/unlock-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Brankas berhasil dibuka!');
        setTimeout(() => {
          onSuccess?.();
        }, 600);
      } else {
        setErrorMessage(data.message || 'PIN yang Anda masukkan salah.');
      }
    } catch {
      setErrorMessage('Gagal menghubungi server untuk verifikasi PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Masukkan kata sandi akun.');
      return;
    }
    if (newPin.length !== 6) {
      setErrorMessage('PIN baru harus 6 digit angka.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/recover-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, new_pin: newPin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('PIN berhasil diubah dan brankas terbuka!');
        setTimeout(() => {
          onSuccess?.();
        }, 700);
      } else {
        setErrorMessage(data.message || 'Kata sandi salah. Verifikasi gagal.');
      }
    } catch {
      setErrorMessage('Gagal memproses pemulihan PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B303A]/75 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div
        className="relative w-full max-w-md rounded-[16px] bg-[#F3EFEA] p-6 shadow-[0_12px_30px_-5px_rgba(43,48,58,0.25)] dark:bg-[#1D212A] border border-white/65 dark:border-white/10 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E8E2D9] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#4E6E58]/15 text-[#4E6E58] dark:bg-[#658E72]/20 dark:text-[#8EB89A]">
              <FiLock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                {mode === 'pin' ? 'Buka Brankas Data Anda' : 'Pemulihan PIN Brankas'}
              </h3>
              <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-0.5">
                {mode === 'pin'
                  ? 'Enkripsi Zero-Knowledge: Data hanya dapat didekripsi dengan PIN'
                  : 'Gunakan kata sandi akun untuk membuka dan mereset PIN'}
              </p>
            </div>
          </div>

          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded-[8px] text-[#7A7670] hover:text-[#1E2229] dark:text-[#9E9A92] dark:hover:text-[#F3EFEA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Alerts */}
        <div className="mt-4 space-y-3">
          {errorMessage && (
            <div className="rounded-[10px] bg-[#B85D43]/15 dark:bg-[#D07258]/20 border border-[#B85D43]/30 dark:border-[#D07258]/40 p-3 text-xs text-[#B85D43] dark:text-[#F0C8BE] flex items-start gap-2 animate-in fade-in">
              <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-[10px] bg-[#4E6E58]/15 dark:bg-[#658E72]/20 border border-[#4E6E58]/30 dark:border-[#658E72]/40 p-3 text-xs text-[#4E6E58] dark:text-[#8EB89A] flex items-start gap-2 animate-in fade-in">
              <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {mode === 'pin' ? (
            /* PIN Mode Form */
            <form onSubmit={handleUnlockWithPin} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-2 text-center">
                  Masukkan PIN Keamanan (6 Digit)
                </label>
                <div className="relative max-w-[220px] mx-auto">
                  <Input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    disabled={isLoading}
                    className="text-center font-mono text-xl tracking-[0.4em] tabular-nums font-bold h-12"
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92] text-center">
                  PIN Anda tidak pernah dikirim sebagai plaintext ke server.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  <FiKey className="h-4 w-4" />
                  <span>Buka Brankas</span>
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recover');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-[#7A7670] dark:text-[#9E9A92] hover:text-[#1E2229] dark:hover:text-[#F3EFEA] font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Lupa PIN Keamanan?
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Recovery Form */
            <form onSubmit={handleRecoverPin} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                  Kata Sandi Akun
                </label>
                <Input
                  type="password"
                  placeholder="Masukkan kata sandi akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                  Buat PIN Baru (6 Digit)
                </label>
                <Input
                  type="password"
                  maxLength={6}
                  placeholder="Contoh: 123456"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={isLoading}
                  className="font-mono tracking-widest text-sm"
                />
              </div>

              <div className="pt-3 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('pin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#7A7670] dark:text-[#9E9A92] hover:text-[#1E2229] dark:hover:text-[#F3EFEA] inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <FiRotateCcw className="h-3 w-3" />
                  <span>Kembali ke Input PIN</span>
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <span>Verifikasi & Setel Ulang</span>
                  <FiArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
