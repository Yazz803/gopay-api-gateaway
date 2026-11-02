'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RiWallet3Line } from 'react-icons/ri';
import { FiLock, FiAlertCircle, FiCheckCircle, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    pin: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'pin') {
      setForm((prev) => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 6) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }
    if (form.password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok. Pastikan kedua kata sandi sama.');
      return;
    }
    if (form.pin.length !== 6) {
      setErrorMessage('PIN harus terdiri dari 6 digit angka.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Pendaftaran berhasil! Mengalihkan ke dashboard...');
        setTimeout(() => {
          router.push('/transaksi');
        }, 1200);
      } else {
        setErrorMessage(data.message || 'Pendaftaran gagal. Periksa data kembali.');
      }
    } catch {
      setErrorMessage('Terjadi kendala saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#DED8CE] dark:bg-[#14171D] text-[#1E2229] dark:text-[#F3EFEA] select-none transition-colors">
      <div className="w-full max-w-md my-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#2B303A] text-[#EAE6DF] shadow-md border border-white/10 mb-3">
            <RiWallet3Line className="h-6 w-6 text-[#EAE6DF]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E2229] dark:text-[#F3EFEA]">
            Daftar Akun Gateway
          </h1>
          <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] mt-1">
            Enkripsi data Zero-Knowledge — hanya Anda yang memiliki kuncinya
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

            {successMessage && (
              <div className="mb-4 rounded-[10px] bg-[#4E6E58]/15 dark:bg-[#658E72]/20 border border-[#4E6E58]/30 dark:border-[#658E72]/40 p-3 text-xs text-[#4E6E58] dark:text-[#8EB89A] flex items-start gap-2 animate-in fade-in">
                <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="Contoh: John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                  Username
                </label>
                <Input
                  type="text"
                  name="username"
                  placeholder="contoh: johndoe"
                  value={form.username}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                    Nomor HP
                  </label>
                  <Input
                    type="tel"
                    name="phone_number"
                    placeholder="081234567890"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                  Kata Sandi Akun
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={handleChange}
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

              <div>
                <label className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                  Konfirmasi Kata Sandi Akun
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Ulangi kata sandi akun"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7670] hover:text-[#1E2229] dark:text-[#9E9A92] dark:hover:text-[#F3EFEA] p-1 cursor-pointer transition-colors"
                    title={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-[12px] bg-[#E8E2D9]/60 dark:bg-[#272C37]/60 border border-[#D9D2C7] dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA]">
                  <FiLock className="h-3.5 w-3.5 text-[#4E6E58] dark:text-[#8EB89A]" />
                  <span>PIN Keamanan (6 Digit)</span>
                </div>
                <Input
                  type="password"
                  name="pin"
                  maxLength={6}
                  placeholder="••••••"
                  value={form.pin}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="text-center font-mono tracking-[0.3em] text-lg font-bold"
                />
                <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                  Digunakan untuk mengenkripsi token GoPay & data riwayat toko Anda.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  <span>Daftar Akun Baru</span>
                  <FiArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-[#E8E2D9] dark:border-white/10 text-center text-xs text-[#7A7670] dark:text-[#9E9A92]">
              Sudah memiliki akun?{' '}
              <Link
                href="/login"
                className="font-semibold text-[#1E2229] dark:text-[#F3EFEA] hover:underline"
              >
                Masuk di sini
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
