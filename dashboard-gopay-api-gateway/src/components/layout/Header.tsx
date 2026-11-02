'use client';

import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertModal } from '@/components/common/AlertModal';

export interface HeaderProps {
  isHealthy: boolean;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
}

export function Header({ isHealthy, onRefreshAll, isRefreshing = false }: HeaderProps) {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentKeyMasked, setCurrentKeyMasked] = useState<string>('Tidak disetel');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gopay_api_key');
      if (stored) {
        queueMicrotask(() => {
          setApiKeyInput(stored);
          setCurrentKeyMasked(stored.slice(0, 4) + '••••' + stored.slice(-3));
        });
      }
    }
  }, []);

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      if (apiKeyInput.trim()) {
        localStorage.setItem('gopay_api_key', apiKeyInput.trim());
        setCurrentKeyMasked(apiKeyInput.trim().slice(0, 4) + '••••' + apiKeyInput.trim().slice(-3));
      } else {
        localStorage.removeItem('gopay_api_key');
        setCurrentKeyMasked('Tidak disetel');
      }
    }
    setApiKeyModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00aa13] text-white shadow-md shadow-[#00aa13]/20">
            {/* GoPay / Wallet Icon */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.99 1-1.72V9c0-.73-.41-1.37-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z" />
              <circle cx="16" cy="12" r="1.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                GoPay API Gateway
              </h1>
              <Badge variant="info" size="sm">Next.js 16</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live QRIS Dynamic & Transaction Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Gateway Status:</span>
            <Badge variant={isHealthy ? 'success' : 'danger'} size="sm">
              <span className={isHealthy ? 'mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500' : 'mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500'} />
              {isHealthy ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiKeyModalOpen(true)}
            className="text-xs hidden md:inline-flex"
          >
            API Key: {currentKeyMasked}
          </Button>

          {onRefreshAll && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshAll}
              isLoading={isRefreshing}
              title="Perbarui data realtime"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>

      <AlertModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        title="Konfigurasi Client API Key"
        description="Masukkan API Key yang sesuai dengan nilai API_KEY pada file .env gateway. Key ini disimpan di local browser untuk melakukan otentikasi request dashboard ke endpoint API."
        type="info"
        confirmText="Simpan Key"
        onConfirm={handleSaveApiKey}
      >
        <div className="mt-4">
          <Input
            label="API Key (x-api-key)"
            type="password"
            placeholder="Masukkan nilai API Key gateway..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
        </div>
      </AlertModal>
    </header>
  );
}
