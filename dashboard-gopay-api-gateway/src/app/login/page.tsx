'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RiWallet3Line } from 'react-icons/ri';
import { FiMail, FiAlertCircle, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinUnlockModal } from '@/components/auth/PinUnlockModal';

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage('Masukkan email / nomor HP dan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.requirePin) {
          setShowPinModal(true);
        } else {
          router.push('/transaksi');
        }
      } else {
        setErrorMessage(data.message || 'Email/Nomor HP atau kata sandi tidak cocok.');
      }
    } catch {
      setErrorMessage('Gagal menghubungi server untuk verifikasi akun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultUnlocked = () => {
    setShowPinModal(false);
    router.push('/transaksi');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#DED8CE] dark:bg-[#14171D] text-[#1E2229] dark:text-[#F3EFEA] select-none transition-colors">
      <div className="w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#2B303A] text-[#EAE6DF] shadow-md border border-white/10 mb-3">
            <RiWallet3Line className="h-6 w-6 text-[#EAE6DF]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E2229] dark:text-[#F3EFEA]">
            Masuk ke GoPay Gateway
          </h1>
          <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] mt-1">
            Gunakan email atau nomor HP yang terdaftar
          </p>
        </div>

        <Card className="border border-white/65 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <CardContent className="p-6 sm:p-7">
            {errorMessage && (
              <div className="mb-4 rounded-[10px] bg-[#B85D43]/15 dark:bg-[#D07258]/20 border border-[#B85D43]/30 dark:border-[#D07258]/40 p-3 text-xs text-[#B85D43] dark:text-[#F0C8BE] flex items-start gap-2 animate-in fade-in">
                <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                  Email atau Nomor HP
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="nama@email.com atau 0812..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7670] dark:text-[#9E9A92] pointer-events-none">
                    <FiMail className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7670] hover:text-[#1E2229] dark:text-[#9E9A92] dark:hover:text-[#F3EFEA] p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  <span>Lanjutkan ke Dashboard</span>
                  <FiArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-[#E8E2D9] dark:border-white/10 text-center text-xs text-[#7A7670] dark:text-[#9E9A92]">
              Belum memiliki akun?{' '}
              <Link
                href="/register"
                className="font-semibold text-[#1E2229] dark:text-[#F3EFEA] hover:underline"
              >
                Daftar sekarang
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <PinUnlockModal
        isOpen={showPinModal}
        canDismiss={false}
        onSuccess={handleVaultUnlocked}
      />
    </div>
  );
}
