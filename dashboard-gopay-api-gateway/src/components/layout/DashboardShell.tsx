'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RiShieldCheckLine, RiAlertLine, RiWallet3Line } from 'react-icons/ri';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PinUnlockModal } from '@/components/auth/PinUnlockModal';
import { formatRupiah } from '@/lib/utils';
import { SkeletonLoading } from '@/components/ui/SkeletonLoading';
import { GatewayService } from '@/services/gateway.service';
import type {
  HealthResponse,
  TokenStatusResponse,
  TransactionsResponse,
  ActivityLogItem,
} from '@/types';

export interface DashboardContextType {
  healthData: HealthResponse | null;
  isHealthy: boolean;
  tokenStatus: TokenStatusResponse | null;
  transactionsData: TransactionsResponse | null;
  logs: ActivityLogItem[];
  isRefreshing: boolean;
  isInitialLoading: boolean;
  refreshData: () => Promise<void>;
  totalTransactionAmount: number;
  totalTransactionCount: number;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardShell');
  }
  return context;
}

export interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVaultLocked, setIsVaultLocked] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [tokenStatus, setTokenStatus] = useState<TokenStatusResponse | null>(null);
  const [transactionsData, setTransactionsData] = useState<TransactionsResponse | null>(null);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace('/login');
        } else {
          setIsAuthenticated(true);
          if (data.user?.isVaultUnlocked === false) {
            setIsVaultLocked(true);
          }
        }
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [router]);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [hRes, tRes, txRes, lRes] = await Promise.allSettled([
        GatewayService.getHealth(),
        GatewayService.getTokenStatus(),
        GatewayService.getTransactions(25),
        GatewayService.getLogs(),
      ]);

      if (hRes.status === 'fulfilled') {
        const hVal = hRes.value as HealthResponse & { success?: boolean };
        setHealthData(hRes.value);
        setIsHealthy(
          hVal.status?.toUpperCase() === 'OK' ||
          hVal.success === true ||
          false
        );
      } else {
        setIsHealthy(false);
      }

      if (tRes.status === 'fulfilled') {
        setTokenStatus(tRes.value);
      }

      if (txRes.status === 'fulfilled') {
        setTransactionsData(txRes.value);
      }

      if (lRes.status === 'fulfilled') {
        setLogs(lRes.value.logs || []);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
    const interval = setInterval(loadData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Calculated Metrics for Top Bento Row
  const totalTransactionAmount = useMemo(() => {
    if (!transactionsData?.data) return 0;
    if (Array.isArray(transactionsData.data)) {
      return transactionsData.data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }
    const list = transactionsData.data.transactions || [];
    return list.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [transactionsData]);

  const totalTransactionCount = useMemo(() => {
    if (!transactionsData?.data) return 0;
    if (Array.isArray(transactionsData.data)) {
      return transactionsData.data.length;
    }
    return transactionsData.data.transactions?.length || 0;
  }, [transactionsData]);

  const isSessionValid = tokenStatus?.data?.token_status === 'valid' || tokenStatus?.active;

  // Compute active tab title from pathname
  const activeTabTitle = useMemo(() => {
    if (pathname.startsWith('/qris')) {
      return 'Buat Kode QRIS Pembayaran';
    }
    if (pathname.startsWith('/logs')) {
      return 'Catatan Aktivitas Sistem';
    }
    if (pathname.startsWith('/profile')) {
      return 'Profile Akun & GoPay Merchant';
    }
    return 'Riwayat Pembayaran Masuk';
  }, [pathname]);

  const isInitialLoading = healthData === null && transactionsData === null && tokenStatus === null;

  const contextValue: DashboardContextType = {
    healthData,
    isHealthy,
    tokenStatus,
    transactionsData,
    logs,
    isRefreshing,
    isInitialLoading,
    refreshData: loadData,
    totalTransactionAmount,
    totalTransactionCount,
  };

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-[#DED8CE] dark:bg-[#14171D] text-[#1E2229] dark:text-[#F3EFEA] select-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#2B303A] text-[#EAE6DF] shadow-md border border-white/10 mb-3 animate-pulse">
          <RiWallet3Line className="h-6 w-6 text-[#EAE6DF]" />
        </div>
        <p className="text-xs font-semibold text-[#7A7670] dark:text-[#9E9A92]">
          Memverifikasi sesi masuk akun...
        </p>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="h-screen flex overflow-hidden bg-[#DED8CE] dark:bg-[#14171D] text-[#1E2229] dark:text-[#F3EFEA] transition-colors">
        {/* Desktop Sidebar (L-Shaped Frame Left) */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar
            isHealthy={isHealthy}
            tokenStatus={tokenStatus}
            logsCount={logs.length}
            transactionsCount={totalTransactionCount}
            onRefreshSession={loadData}
          />
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <div
              className="relative w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                isHealthy={isHealthy}
                tokenStatus={tokenStatus}
                logsCount={logs.length}
                transactionsCount={totalTransactionCount}
                onCloseMobile={() => setMobileSidebarOpen(false)}
                onRefreshSession={loadData}
              />
            </div>
          </div>
        )}

        {/* Main Workspace Frame (Top Bar + Canvas) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            isHealthy={isHealthy}
            onRefreshAll={loadData}
            isRefreshing={isRefreshing}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
            activeTabTitle={activeTabTitle}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {/* Bento Grid Top Row (5 KPI Summaries per Section 4 of Design System) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* KPI 1: Total Uang Diterima */}
              <div className="col-span-2 sm:col-span-1 rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7670] dark:text-[#9E9A92]">
                  Total Uang Diterima
                </span>
                {isInitialLoading ? (
                  <SkeletonLoading className="h-7 w-32 my-1 rounded-[6px]" />
                ) : (
                  <div className="mt-2 text-xl font-bold text-[#1E2229] dark:text-[#F3EFEA] tabular-nums truncate">
                    {formatRupiah(totalTransactionAmount)}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92] flex items-center justify-between">
                  <span className="text-[#4E6E58] dark:text-[#8EB89A] font-semibold">Real-time</span>
                  <span>25 mutasi terakhir</span>
                </div>
              </div>

              {/* KPI 2: Total Transaksi */}
              <div className="rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7670] dark:text-[#9E9A92]">
                  Jumlah Pembayaran
                </span>
                {isInitialLoading ? (
                  <SkeletonLoading className="h-7 w-20 my-1 rounded-[6px]" />
                ) : (
                  <div className="mt-2 text-xl font-bold text-[#1E2229] dark:text-[#F3EFEA] tabular-nums">
                    {totalTransactionCount}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                  Transaksi tercatat
                </div>
              </div>

              {/* KPI 3: QRIS Terbayar */}
              <div className="rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7670] dark:text-[#9E9A92]">
                  QRIS Terbayar
                </span>
                {isInitialLoading ? (
                  <SkeletonLoading className="h-7 w-16 my-1 rounded-[6px]" />
                ) : (
                  <div className="mt-2 text-xl font-bold text-[#4E6E58] dark:text-[#8EB89A] tabular-nums">
                    {healthData?.gateway?.claimed_transactions ?? 0}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                  Masuk ke saldo GoPay
                </div>
              </div>

              {/* KPI 4: Menunggu Pembayaran */}
              <div className="rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7670] dark:text-[#9E9A92]">
                  Menunggu Pembayaran
                </span>
                {isInitialLoading ? (
                  <SkeletonLoading className="h-7 w-16 my-1 rounded-[6px]" />
                ) : (
                  <div className="mt-2 text-xl font-bold text-[#1E2229] dark:text-[#F3EFEA] tabular-nums">
                    {healthData?.gateway?.active_qris ?? 0}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92]">
                  Kode QR aktif
                </div>
              </div>

              {/* KPI 5: Session Health */}
              <div className="col-span-2 sm:col-span-1 rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7A7670] dark:text-[#9E9A92]">
                  Akun GoPay
                </span>
                {isInitialLoading ? (
                  <SkeletonLoading className="h-6 w-32 my-1 rounded-[6px]" />
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    {isSessionValid ? (
                      <RiShieldCheckLine className="h-4 w-4 text-[#4E6E58] dark:text-[#8EB89A] shrink-0" />
                    ) : (
                      <RiAlertLine className="h-4 w-4 text-[#B85D43] dark:text-[#D07258] shrink-0" />
                    )}
                    <span className="text-base font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                      {isSessionValid ? 'AKTIF NORMAL' : 'PERLU MASUK'}
                    </span>
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#7A7670] dark:text-[#9E9A92] flex items-center justify-between">
                  <span>Aktif: {Math.floor((healthData?.uptime || 0) / 60)} mnt</span>
                  <span className="text-[#4E6E58] dark:text-[#8EB89A] font-semibold">Tersambung</span>
                </div>
              </div>
            </div>

            {/* Specific Route Content Pane */}
            {children}
          </main>
        </div>
      </div>

      <PinUnlockModal
        isOpen={isVaultLocked}
        canDismiss={false}
        onSuccess={() => {
          setIsVaultLocked(false);
          loadData();
        }}
      />
    </DashboardContext.Provider>
  );
}