'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ApiDocsView } from '@/components/docs/ApiDocsView';

export default function ApiDocsPage() {
  return (
    <DashboardShell>
      <ApiDocsView />
    </DashboardShell>
  );
}
