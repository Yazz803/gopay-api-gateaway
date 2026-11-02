'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TbPlugConnected } from 'react-icons/tb';
import {
  RiWallet3Line,
  RiHistoryLine,
  RiQrCodeLine,
  RiTerminalBoxLine,
  RiUser3Line,
} from 'react-icons/ri';
import { GopayConnectModal } from '@/components/common/GopayConnectModal';
import type { TokenStatusResponse } from '@/types';

export interface SidebarProps {
  activeTab?: 'transactions' | 'qris' | 'logs' | 'profile';
  onSelectTab?: (tab: 'transactions' | 'qris' | 'logs' | 'profile') => void;
  isHealthy: boolean;
  tokenStatus: TokenStatusResponse | null;
  logsCount: number;
  transactionsCount: number;
  onCloseMobile?: () => void;
  onRefreshSession?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isHealthy,
  tokenStatus,
  logsCount,
  transactionsCount,
  onCloseMobile,
  onRefreshSession,
}: SidebarProps) {
  const pathname = usePathname();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const isSessionValid = tokenStatus?.data?.token_status === 'valid' || tokenStatus?.active;

  const navItems = [
    {
      id: 'transactions' as const,
      href: '/transaksi',
      label: 'Riwayat Transaksi',
      count: transactionsCount,
      icon: <RiHistoryLine className="h-4 w-4 shrink-0 text-[#9B9FA7]" />,
    },
    {
      id: 'qris' as const,
      href: '/qris',
      label: 'Buat Kode QRIS',
      icon: <RiQrCodeLine className="h-4 w-4 shrink-0 text-[#9B9FA7]" />,
    },
    {
      id: 'logs' as const,
      href: '/logs',
      label: 'Catatan Aktivitas',
      count: logsCount,
      icon: <RiTerminalBoxLine className="h-4 w-4 shrink-0 text-[#9B9FA7]" />,
    },
    {
      id: 'profile' as const,
      href: '/profile',
      label: 'Profile Akun',
      icon: <RiUser3Line className="h-4 w-4 shrink-0 text-[#9B9FA7]" />,
    },
  ];

  return (
    <aside className="w-60 h-screen md:h-full max-h-screen sticky top-0 shrink-0 bg-[#2B303A] text-[#EAE6DF] border-r border-white/10 flex flex-col justify-between select-none overflow-y-auto">
      <div className="flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#383E4A] text-[#EAE6DF] shadow-xs border border-white/10">
            <RiWallet3Line className="h-5 w-5 text-[#EAE6DF]" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xs font-bold tracking-tight text-[#EAE6DF] truncate">
              GoPay Gateway
            </h1>
            <p className="text-[11px] text-[#9B9FA7] font-medium tracking-wide">
              Pusat Pembayaran Toko
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1.5">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#9B9FA7]">
            Menu Utama
          </span>
          <nav className="mt-1 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/transaksi' && pathname === '/') ||
                activeTab === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    onSelectTab?.(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#383E4A] text-[#EAE6DF] shadow-xs translate-x-0.5'
                      : 'text-[#9B9FA7] hover:bg-[#383E4A]/60 hover:text-[#EAE6DF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-2 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/10 text-[#EAE6DF]">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sesi GoPay Status Widget Bottom */}
      <div className="p-3 border-t border-white/10 space-y-2.5 bg-black/10 shrink-0 mt-auto">
        <div className="px-1 flex items-center justify-between text-[11px]">
          <span className="text-[#9B9FA7]">Koneksi Server:</span>
          <span className={`font-semibold text-xs ${isHealthy ? 'text-[#8EB89A]' : 'text-[#F0C8BE]'}`}>
            {isHealthy ? 'ONLINE' : 'TERPUTUS'}
          </span>
        </div>

        <div className="p-2.5 rounded-[10px] bg-[#383E4A]/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#9B9FA7] font-medium">Akun GoPay:</span>
            <span
              className={`font-semibold ${
                isSessionValid ? 'text-[#8EB89A]' : 'text-[#F0C8BE]'
              }`}
            >
              {isSessionValid ? 'AKTIF SIAP PAKAI' : 'PERLU MASUK ULANG'}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[#EAE6DF] truncate">
            {tokenStatus?.account?.name || 'Akun GoPay Toko'}
          </p>
        </div>

        {/* Button Gopay Merchant Connect Modal Trigger */}
        <button
          type="button"
          onClick={() => setConnectModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-semibold bg-[#4E6E58] hover:bg-[#3D5745] text-white shadow-xs transition-all duration-150 cursor-pointer"
        >
          <TbPlugConnected className="h-4 w-4 shrink-0" />
          <span>Gopay Merchant</span>
        </button>

        <div className="px-1 text-[11px] text-[#9B9FA7] flex items-center justify-between">
          <span>Otomatis</span>
          <span>Real-time</span>
        </div>
      </div>

      <GopayConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => {
          onRefreshSession?.();
        }}
      />
    </aside>
  );
}
