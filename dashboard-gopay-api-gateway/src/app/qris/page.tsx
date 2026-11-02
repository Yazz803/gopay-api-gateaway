'use client';

import React, { useState, useEffect } from 'react';
import { TbPlugConnected } from 'react-icons/tb';
import { FiShield, FiZap, FiRefreshCw } from 'react-icons/fi';
import { DashboardShell, useDashboard } from '@/components/layout/DashboardShell';
import { QrisGenerator } from '@/features/qris/components/QrisGenerator';
import { TokenStatusCard } from '@/features/session/components/TokenStatusCard';
import { GopayConnectModal } from '@/components/common/GopayConnectModal';
import { StaticQrisUploader } from '@/components/qris/StaticQrisUploader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonLoading } from '@/components/ui/SkeletonLoading';

function QrisView() {
  const { tokenStatus, isRefreshing, refreshData } = useDashboard();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [hasStaticQris, setHasStaticQris] = useState<boolean | null>(null);

  const isSessionValid = tokenStatus?.data?.token_status === 'valid' || tokenStatus?.active;

  useEffect(() => {
    let isMounted = true;
    fetch('/api/user/qris-static')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setHasStaticQris(Boolean(data.success && data.hasQrisStatic));
        }
      })
      .catch(() => {
        if (isMounted) setHasStaticQris(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {!tokenStatus && isRefreshing ? (
          <SkeletonLoading.Card className="min-h-[280px]" />
        ) : !isSessionValid ? (
          <Card className="border border-white/65 dark:border-white/10 shadow-xs">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-[#B85D43]/15 text-[#B85D43] dark:bg-[#D07258]/20 dark:text-[#F0C8BE] mb-5">
                <TbPlugConnected className="h-9 w-9" />
              </div>

              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B85D43] dark:text-[#F0C8BE] px-3 py-1 rounded-full bg-[#B85D43]/10 dark:bg-[#D07258]/15 mb-2">
                Akses Dibatasi
              </span>

              <h2 className="text-lg sm:text-xl font-bold text-[#1E2229] dark:text-[#F3EFEA] tracking-tight">
                Akun GoPay Merchant Belum Terhubung
              </h2>

              <p className="mt-2.5 max-w-md text-xs sm:text-sm text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                Untuk dapat menggunakan fitur <strong>Buat Kode QRIS</strong> dan menerima pembayaran dari pelanggan, Anda wajib menghubungkan akun GoPay Merchant (GoBiz) Anda terlebih dahulu.
              </p>

              <div className="mt-6 w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-[12px] bg-[#E8E2D9]/60 dark:bg-[#272C37]/60 border border-[#D9D2C7] dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                    <FiShield className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A] shrink-0" />
                    <span>Keamanan Resmi GoBiz</span>
                  </div>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Kode QRIS diterbitkan resmi dengan nama usaha toko dan ID merchant Anda.
                  </p>
                </div>

                <div className="p-3.5 rounded-[12px] bg-[#E8E2D9]/60 dark:bg-[#272C37]/60 border border-[#D9D2C7] dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA] mb-1">
                    <FiZap className="h-4 w-4 text-[#D99B26] dark:text-[#E8AF4A] shrink-0" />
                    <span>Verifikasi Otomatis</span>
                  </div>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] leading-relaxed">
                    Setiap pembayaran pembeli langsung dicek otomatis oleh server secara real-time.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#4E6E58] hover:bg-[#3D5745] text-white shadow-xs transition-all duration-150 cursor-pointer"
                >
                  <TbPlugConnected className="h-4 w-4" />
                  <span>Hubungkan Akun Gopay Merchant</span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5"
                >
                  <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Periksa Ulang Status</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : hasStaticQris === null ? (
          <SkeletonLoading.Card className="min-h-[220px]" />
        ) : !hasStaticQris ? (
          /* Step 2: Wajib Upload QRIS Statis */
          <StaticQrisUploader
            onQrisConfigured={() => {
              setHasStaticQris(true);
            }}
          />
        ) : (
          /* Step 3: QRIS Statis Terpasang -> Tampilkan Generator */
          <>
            <StaticQrisUploader
              compact
              onQrisRemoved={() => {
                setHasStaticQris(false);
              }}
            />
            <QrisGenerator onPaymentSuccess={refreshData} />
          </>
        )}
      </div>

      <div>
        <TokenStatusCard
          tokenStatus={tokenStatus}
          isLoading={isRefreshing}
          onRefresh={refreshData}
        />
      </div>

      <GopayConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}

export default function QrisPage() {
  return (
    <DashboardShell>
      <QrisView />
    </DashboardShell>
  );
}
