'use client';

import React from 'react';
import { DashboardShell, useDashboard } from '@/components/layout/DashboardShell';
import { ActivityLogsTerminal } from '@/features/monitoring/components/ActivityLogsTerminal';

function LogsView() {
  const { logs, isRefreshing, refreshData } = useDashboard();

  return (
    <div className="space-y-6">
      <ActivityLogsTerminal
        logs={logs}
        isLoading={isRefreshing}
        onRefresh={refreshData}
      />
    </div>
  );
}

export default function LogsPage() {
  return (
    <DashboardShell>
      <LogsView />
    </DashboardShell>
  );
}
