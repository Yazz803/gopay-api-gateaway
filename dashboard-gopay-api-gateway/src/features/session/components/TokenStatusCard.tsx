'use client';

import React, { useState } from 'react';
import { RiShieldCheckLine, RiAlertLine, RiRefreshLine } from 'react-icons/ri';
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
      setFeedback('Koneksi akun berhasil diperiksa.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memeriksa koneksi akun';
      setFeedback(`Perhatian: ${msg}`);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7670] dark:text-[#9E9A92]">
              Status Akun & Koneksi GoPay
            </span>
            <div className="flex items-center gap-2.5 mt-1">
              <Badge variant={isValid ? 'success' : 'danger'} size="md">
                {isValid ? (
                  <RiShieldCheckLine className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <RiAlertLine className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isValid ? 'AKUN AKTIF & SIAP TERIMA BAYAR' : 'KONEKSI TERPUTUS / PERLU MASUK'}
              </Badge>
              {isLoading && <span className="text-xs text-[#7A7670] dark:text-[#9E9A92]">Memeriksa akun...</span>}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefreshToken}
            isLoading={isRefreshingToken}
            className="text-xs self-start sm:self-auto inline-flex items-center"
          >
            <RiRefreshLine className={`mr-1.5 h-3.5 w-3.5 ${isRefreshingToken ? 'animate-spin' : ''}`} />
            Cek Koneksi Akun
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-[#E8E2D9] dark:border-white/10 pt-3">
          <div>
            <span className="text-[#7A7670] dark:text-[#9E9A92]">Status Saat Ini:</span>
            <p className="font-medium text-[#1E2229] dark:text-[#F3EFEA] truncate mt-0.5">
              {tokenStatus?.data?.message || tokenStatus?.message || (isValid ? 'Akun aktif dan siap menerima pembayaran' : 'Koneksi akun terputus atau perlu masuk kembali')}
            </p>
          </div>
          <div>
            <span className="text-[#7A7670] dark:text-[#9E9A92]">Nama Akun / Toko:</span>
            <p className="font-medium text-[#1E2229] dark:text-[#F3EFEA] mt-0.5">
              {tokenStatus?.account?.name || 'Akun GoPay Toko'}
            </p>
          </div>
        </div>

        {feedback && (
          <p className="mt-3 text-xs text-[#7A7670] dark:text-[#9E9A92] italic">
            {feedback}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
