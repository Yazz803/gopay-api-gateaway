'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GatewayService } from '@/services/gateway.service';
import type { TokenStatusResponse } from '@/types';

export interface TokenStatusCardProps {
  tokenStatus: TokenStatusResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function TokenStatusCard({ tokenStatus, isLoading, onRefresh }: TokenStatusCardProps) {
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isValid = tokenStatus?.data?.token_status === 'valid' || tokenStatus?.active;

  const handleManualRefreshToken = async () => {
    setIsRefreshingToken(true);
    setFeedback(null);
    try {
      // Re-trigger token check which automatically attempts session refresh if 401
      await GatewayService.getTokenStatus();
      onRefresh();
      setFeedback('Status token berhasil dicek ulang.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui token';
      setFeedback(`Error: ${msg}`);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800">
      <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[#00aa13]/10 blur-2xl pointer-events-none" />

      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sesi GoPay Merchant
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isValid ? 'success' : 'danger'} size="md">
                <span className={isValid ? 'mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse' : 'mr-1.5 h-2 w-2 rounded-full bg-rose-500'} />
                {isValid ? 'SESI AKTIF' : 'KEDALUWARSA / BELUM LOGIN'}
              </Badge>
              {isLoading && <span className="text-xs text-slate-400">Memeriksa...</span>}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefreshToken}
            isLoading={isRefreshingToken}
          >
            Check Sesi
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Status Pesan:</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {tokenStatus?.data?.message || tokenStatus?.message || (isValid ? 'Token valid' : 'Sesi tidak ditemukan')}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Merchant Info:</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
              {tokenStatus?.account?.name || 'Gojek Merchant Partner'}
            </p>
          </div>
        </div>

        {feedback && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            {feedback}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
