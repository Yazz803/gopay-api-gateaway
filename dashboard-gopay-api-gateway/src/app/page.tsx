'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import {
  TokenStatusCard,
  TransactionFeed,
  QrisGenerator,
  ActivityLogsTerminal,
} from '@/features';
import { GatewayService } from '@/services/gateway.service';
import type {
  HealthResponse,
  TokenStatusResponse,
  TransactionsResponse,
  ActivityLogItem,
} from '@/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'qris' | 'logs'>('transactions');
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatusResponse | null>(null);
  const [transactionsData, setTransactionsData] = useState<TransactionsResponse | null>(null);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

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
        setHealthData(hRes.value);
        setIsHealthy(hRes.value.status === 'OK' || hRes.value.status === 'ok');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header
        isHealthy={isHealthy}
        onRefreshAll={loadData}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <TokenStatusCard
              tokenStatus={tokenStatus}
              isLoading={isRefreshing}
              onRefresh={loadData}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gateway Metrics
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Active QRIS:</span>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {healthData?.gateway?.active_qris ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Claimed TRX:</span>
                  <p className="text-base font-bold text-[#00aa13] dark:text-[#00c817]">
                    {healthData?.gateway?.claimed_transactions ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Uptime: {Math.floor((healthData?.uptime || 0) / 60)} min</span>
              <span>Next.js App Router</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-3 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`py-3 px-4 font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-[#00aa13] text-[#00aa13] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Riwayat Transaksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qris')}
            className={`py-3 px-4 font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === 'qris'
                ? 'border-[#00aa13] text-[#00aa13] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            QRIS Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#00aa13] text-[#00aa13] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Console Logs ({logs.length})
          </button>
        </div>

        {/* Tab Content Panes */}
        {activeTab === 'transactions' && (
          <TransactionFeed
            transactionsData={transactionsData}
            isLoading={isRefreshing}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'qris' && (
          <div className="max-w-2xl mx-auto">
            <QrisGenerator onPaymentSuccess={loadData} />
          </div>
        )}

        {activeTab === 'logs' && (
          <ActivityLogsTerminal
            logs={logs}
            isLoading={isRefreshing}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}
