'use client';

import React, { useState, useEffect } from 'react';
import {
  RiUser3Line,
  RiShieldKeyholeLine,
  RiStore2Line,
  RiCalendarLine,
  RiPhoneLine,
  RiMailLine,
  RiKey2Line,
} from 'react-icons/ri';
import { TbPlugConnected } from 'react-icons/tb';
import {
  FiCopy,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import { DashboardShell, useDashboard } from '@/components/layout/DashboardShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GopayConnectModal } from '@/components/common/GopayConnectModal';
import { StaticQrisUploader } from '@/components/qris/StaticQrisUploader';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  apiKey?: string;
  createdAt?: string;
  isVaultUnlocked?: boolean;
}

function ProfileContent() {
  const { tokenStatus, refreshData } = useDashboard();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.user) {
          setProfile(data.user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setProfile(data.user);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyKey = () => {
    if (!profile?.apiKey) return;
    navigator.clipboard.writeText(profile.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin membuat ulang API Key? API Key lama tidak akan dapat digunakan lagi untuk integrasi kasir.'
    );
    if (!confirm) return;

    setIsRegeneratingKey(true);
    setRegenerateSuccess(null);
    try {
      const res = await fetch('/api/user/regenerate-api-key', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.apiKey) {
        setProfile((prev) => (prev ? { ...prev, apiKey: data.apiKey } : prev));
        setRegenerateSuccess('API Key baru berhasil dibuat dan disimpan.');
        setTimeout(() => setRegenerateSuccess(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const isSessionValid = tokenStatus?.data?.token_status === 'valid' || tokenStatus?.active;
  const merchantAccount = tokenStatus?.account || tokenStatus?.data?.account;
  const expiresAt = tokenStatus?.expires_at || tokenStatus?.data?.expires_at;

  return (
    <div className="space-y-6 select-none">
      {/* Page Header Banner */}
      <div className="rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-5 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#383E4A] text-[#EAE6DF] shadow-xs border border-white/10">
            <RiUser3Line className="h-6 w-6 text-[#EAE6DF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1E2229] dark:text-[#F3EFEA]">
              Profile Akun & Koneksi Merchant
            </h1>
            <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] mt-0.5">
              Kelola informasi identitas, API Key integrasi kasir, dan akun GoPay resmi Anda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={profile?.isVaultUnlocked ? 'success' : 'warning'}
            size="md"
            className="font-semibold"
          >
            {profile?.isVaultUnlocked ? 'BRANKAS DATA TERBUKA' : 'BRANKAS TERKUNCI'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Informasi Akun & Kredensial */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-[#E8E2D9] dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#1E2229] dark:text-[#F3EFEA]">
                  <RiShieldKeyholeLine className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A]" />
                  <span>Informasi Akun Pengguna</span>
                </CardTitle>
                <span className="text-[11px] font-medium text-[#7A7670] dark:text-[#9E9A92]">
                  Enkripsi Zero-Knowledge
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] block mb-1">
                    Nama Lengkap
                  </span>
                  <p className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                    {profile?.name || '-'}
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] block mb-1">
                    Username
                  </span>
                  <p className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                    @{profile?.username || '-'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] flex items-center gap-1.5">
                    <RiMailLine className="h-3.5 w-3.5" />
                    <span>Alamat Email</span>
                  </span>
                  <span className="text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA]">
                    {profile?.email || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.05] pt-2.5">
                  <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] flex items-center gap-1.5">
                    <RiPhoneLine className="h-3.5 w-3.5" />
                    <span>Nomor Telepon</span>
                  </span>
                  <span className="text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] tabular-nums">
                    {profile?.phoneNumber || '-'}
                  </span>
                </div>

                {profile?.createdAt && (
                  <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.05] pt-2.5">
                    <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] flex items-center gap-1.5">
                      <RiCalendarLine className="h-3.5 w-3.5" />
                      <span>Terdaftar Sejak</span>
                    </span>
                    <span className="text-xs font-medium text-[#7A7670] dark:text-[#9E9A92] tabular-nums">
                      {new Date(profile.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kartu API Key */}
          <Card>
            <CardHeader className="border-b border-[#E8E2D9] dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#1E2229] dark:text-[#F3EFEA]">
                  <RiKey2Line className="h-4 w-4 text-[#D07258]" />
                  <span>Kunci Akses Gateway (API Key)</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateKey}
                  isLoading={isRegeneratingKey}
                  className="text-xs gap-1"
                  title="Generate API Key baru"
                >
                  <FiRefreshCw className={`h-3 w-3 ${isRegeneratingKey ? 'animate-spin' : ''}`} />
                  <span>Buat Ulang</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {regenerateSuccess && (
                <div className="p-2.5 rounded-[8px] bg-[#4E6E58]/15 text-[#4E6E58] dark:text-[#8EB89A] text-xs font-medium flex items-center gap-2">
                  <FiCheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{regenerateSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#1A1D24] text-[#EAE6DF] font-mono text-xs border border-white/10">
                <span className="flex-1 truncate tracking-wider">
                  {showApiKey
                    ? profile?.apiKey || 'Belum dibuat'
                    : profile?.apiKey
                    ? profile.apiKey.slice(0, 10) + '••••••••••••••••' + profile.apiKey.slice(-4)
                    : '••••••••••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="p-1 text-[#9B9FA7] hover:text-[#EAE6DF] transition-colors cursor-pointer"
                  title={showApiKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
                >
                  {showApiKey ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#383E4A] hover:bg-[#4E5666] text-[#EAE6DF] transition-colors cursor-pointer text-[11px]"
                  title="Salin API Key ke Clipboard"
                >
                  {copiedKey ? (
                    <>
                      <FiCheck className="h-3 w-3 text-[#8EB89A]" />
                      <span className="text-[#8EB89A]">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="h-3 w-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                Kunci ini digunakan untuk mengirim request dari aplikasi kasir, sistem POS, atau website Anda melalui header{' '}
                <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">
                  x-api-key: {profile?.apiKey ? profile.apiKey.slice(0, 8) + '...' : 'gopay_...'}
                </code>
              </p>
            </CardContent>
          </Card>

          {/* Konfigurasi QRIS Statis Toko */}
          <StaticQrisUploader />
        </div>

        {/* Kolom Kanan: Koneksi Akun GoPay Merchant */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-[#E8E2D9] dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#1E2229] dark:text-[#F3EFEA]">
                  <TbPlugConnected className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A]" />
                  <span>Akun GoPay Merchant yang Terhubung</span>
                </CardTitle>
                <Badge variant={isSessionValid ? 'success' : 'danger'} size="sm">
                  {isSessionValid ? 'TERHUBUNG' : 'PERLU MASUK ULANG'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {isSessionValid ? (
                <>
                  <div className="p-4 rounded-[12px] bg-[#4E6E58]/10 dark:bg-[#658E72]/15 border border-[#4E6E58]/20 dark:border-[#658E72]/30 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#4E6E58]/20 dark:bg-[#658E72]/30 text-[#4E6E58] dark:text-[#8EB89A]">
                      <RiStore2Line className="h-5 w-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-[#7A7670] dark:text-[#9E9A92]">
                        Nama Toko / Outlet
                      </p>
                      <h3 className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                        {merchantAccount?.name || 'Akun GoPay Toko'}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7A7670] dark:text-[#9E9A92] font-medium">ID Merchant GoBiz</span>
                      <span className="font-bold text-[#1E2229] dark:text-[#F3EFEA] font-mono text-[11px]">
                        {merchantAccount?.merchant_id || '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-black/[0.04] dark:border-white/[0.05] pt-2">
                      <span className="text-[#7A7670] dark:text-[#9E9A92] font-medium">Nomor Ponsel Toko</span>
                      <span className="font-semibold text-[#1E2229] dark:text-[#F3EFEA] tabular-nums">
                        {merchantAccount?.phone || '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-black/[0.04] dark:border-white/[0.05] pt-2">
                      <span className="text-[#7A7670] dark:text-[#9E9A92] font-medium">Status Sesi GoPay</span>
                      <span className="font-semibold text-[#4E6E58] dark:text-[#8EB89A]">
                        {tokenStatus?.data?.token_status === 'valid' ? 'Aktif & Valid' : 'Valid'}
                      </span>
                    </div>

                    {expiresAt && (
                      <div className="flex items-center justify-between text-xs border-t border-black/[0.04] dark:border-white/[0.05] pt-2">
                        <span className="text-[#7A7670] dark:text-[#9E9A92] font-medium">Masa Berlaku Token</span>
                        <span className="font-mono text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                          {expiresAt}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConnectModalOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5"
                    >
                      <TbPlugConnected className="h-4 w-4" />
                      <span>Hubungkan Ulang / Ganti Akun</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      className="inline-flex items-center justify-center gap-1.5"
                    >
                      <FiRefreshCw className="h-3.5 w-3.5" />
                      <span>Cek Status</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#B85D43]/15 text-[#B85D43] dark:bg-[#D07258]/20 dark:text-[#F0C8BE]">
                    <FiAlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                      Belum Ada Akun GoPay yang Terhubung
                    </h3>
                    <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] max-w-sm mx-auto mt-1 leading-relaxed">
                      Sambungkan akun GoPay Merchant resmi Anda via verifikasi OTP web app untuk mulai menerima pembayaran dan mutasi kasir.
                    </p>
                  </div>

                  <div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setConnectModalOpen(true)}
                      className="inline-flex items-center gap-2"
                    >
                      <TbPlugConnected className="h-4 w-4" />
                      <span>Hubungkan Akun GoPay Sekarang</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keamanan & Kebijakan Privasi */}
          <div className="rounded-[12px] bg-[#383E4A]/40 border border-white/10 p-4 text-xs text-[#9B9FA7] space-y-2">
            <span className="font-semibold text-[#EAE6DF] flex items-center gap-1.5">
              <FiShield className="h-4 w-4 text-[#8EB89A]" />
              <span>Privasi & Keamanan Berlapis</span>
            </span>
            <p className="leading-relaxed">
              Seluruh kredensial sesi GoPay (token akses, refresh token, cookie sesi) dienkripsi menggunakan kunci enkripsi khusus (DEK AES-256-GCM) milik akun Anda. Server dan pengembang tidak dapat melihat data sesi Anda secara langsung.
            </p>
          </div>
        </div>
      </div>

      <GopayConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => {
          refreshData();
          fetchProfile();
        }}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <DashboardShell>
      <ProfileContent />
    </DashboardShell>
  );
}
