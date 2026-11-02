'use client';

import React from 'react';
import { DashboardShell, useDashboard } from '@/components/layout/DashboardShell';
import { TokenStatusCard } from '@/features/session/components/TokenStatusCard';
import { TransactionFeed } from '@/features/transactions/components/TransactionFeed';

function TransaksiView() {
  const { tokenStatus, transactionsData, isRefreshing, refreshData } = useDashboard();

  return (
    <div className="space-y-6">
      <TokenStatusCard
        tokenStatus={tokenStatus}
        isLoading={isRefreshing}
        onRefresh={refreshData}
      />
      <TransactionFeed
        transactionsData={transactionsData}
        isLoading={isRefreshing}
        onRefresh={refreshData}
      />
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <DashboardShell>
      <TransaksiView />
    </DashboardShell>
  );
}
