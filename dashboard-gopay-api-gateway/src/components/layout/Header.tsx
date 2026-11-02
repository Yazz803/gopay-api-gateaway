'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiRefreshCw, FiMenu, FiUser, FiLock } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from './ThemeToggle';

export interface HeaderProps {
  isHealthy: boolean;
  isRefreshing?: boolean;
  onRefreshAll?: () => void;
  onToggleMobileSidebar?: () => void;
  activeTabTitle?: string;
}

export function Header({
  isHealthy,
  isRefreshing = false,
  onRefreshAll,
  onToggleMobileSidebar,
  activeTabTitle = 'Riwayat Transaksi',
}: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string; name?: string; isVaultUnlocked?: boolean } | null>(null);

  useEffect(() => {
    // Check authenticated user
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
  };

  return (
    <header className="h-16 shrink-0 w-full bg-[#2B303A] text-[#EAE6DF] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between select-none z-30">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-[10px] bg-[#383E4A] text-[#EAE6DF] hover:bg-[#4E5666] transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline font-medium text-[#9B9FA7]">Dashboard</span>
          <span className="hidden sm:inline text-[#9B9FA7]">/</span>
          <span className="font-semibold text-[#EAE6DF]">{activeTabTitle}</span>
          <Badge
            variant={isHealthy ? 'success' : 'danger'}
            size="sm"
            className="ml-2 hidden lg:inline-flex items-center"
          >
            {isHealthy ? 'ONLINE' : 'TERPUTUS'}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onRefreshAll && (
          <Button
            variant="pill"
            size="sm"
            onClick={onRefreshAll}
            isLoading={isRefreshing}
            title="Perbarui data pembayaran secara langsung"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </Button>
        )}

        {currentUser ? (
          <div className="flex items-center gap-1.5 pl-1">
            <Link
              href="/profile"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#383E4A] hover:bg-[#4E5666] text-xs font-medium text-[#EAE6DF] transition-colors"
              title="Buka Profil Akun"
            >
              <FiUser className="h-3.5 w-3.5 text-[#8EB89A]" />
              <span className="max-w-[120px] truncate">{currentUser.name || currentUser.username}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#383E4A] hover:bg-[#B85D43]/80 hover:text-white text-xs font-semibold text-[#9B9FA7] transition-all cursor-pointer"
              title="Keluar dan Kunci Brankas"
            >
              <FiLock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kunci Brankas</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4E6E58] hover:bg-[#3D5745] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FiUser className="h-3.5 w-3.5" />
            <span>Masuk</span>
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
