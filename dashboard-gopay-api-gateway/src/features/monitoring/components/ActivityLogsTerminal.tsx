'use client';

import React, { useState, useMemo } from 'react';
import { FiRefreshCw, FiTerminal } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonLoading } from '@/components/ui/SkeletonLoading';
import { formatDate } from '@/lib/utils';
import type { ActivityLogItem, LogType } from '@/types';

export interface ActivityLogsTerminalProps {
  logs: ActivityLogItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ActivityLogsTerminal({
  logs,
  isLoading,
  onRefresh,
}: ActivityLogsTerminalProps) {
  const [selectedType, setSelectedType] = useState<LogType | 'ALL'>('ALL');
  const [filterQuery, setFilterQuery] = useState('');

  const filterOptions: { label: string; value: LogType | 'ALL' }[] = [
    { label: 'Semua', value: 'ALL' },
    { label: 'Berhasil', value: 'SUCCESS' },
    { label: 'Info', value: 'INFO' },
    { label: 'Perhatian', value: 'WARNING' },
    { label: 'Kendala', value: 'ERROR' },
    { label: 'Sistem', value: 'SYSTEM' },
  ];

  const typeLabels: Record<LogType, string> = {
    SUCCESS: 'BERHASIL',
    INFO: 'INFO',
    WARNING: 'PERHATIAN',
    ERROR: 'KENDALA',
    SYSTEM: 'SISTEM',
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchType = selectedType === 'ALL' || log.type === selectedType;
      const matchQuery =
        !filterQuery.trim() ||
        log.message.toLowerCase().includes(filterQuery.toLowerCase()) ||
        log.type.toLowerCase().includes(filterQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [logs, selectedType, filterQuery]);

  const typeColor = (type: LogType) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-[#8EB89A] border-[#4E6E58]/40 bg-[#4E6E58]/15';
      case 'WARNING':
        return 'text-[#F3C878] border-[#D99B26]/40 bg-[#D99B26]/15';
      case 'ERROR':
        return 'text-[#F0C8BE] border-[#B85D43]/40 bg-[#B85D43]/15';
      case 'SYSTEM':
        return 'text-[#D1D6E1] border-white/20 bg-white/10';
      case 'INFO':
      default:
        return 'text-[#C6BEB5] border-white/10 bg-white/5';
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FiTerminal className="h-4 w-4 text-[#7A7670] dark:text-[#9E9A92]" />
              <CardTitle>Catatan Aktivitas Sistem</CardTitle>
            </div>
            <CardDescription>
              Riwayat otomatis pengecekan pembayaran, penerimaan dana, dan kondisi sambungan akun
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              title="Perbarui catatan aktivitas"
              className="inline-flex items-center"
            >
              <FiRefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8E2D9] dark:border-white/10">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedType(opt.value)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                selectedType === opt.value
                  ? 'bg-[#383E4A] text-[#EAE6DF] shadow-xs'
                  : 'bg-[#E8E2D9] hover:bg-[#DED8CE] text-[#1E2229] dark:bg-[#272C37] dark:hover:bg-[#333946] dark:text-[#F3EFEA]'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <input
            type="text"
            placeholder="Cari catatan aktivitas..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="ml-auto text-xs px-3 py-1.5 rounded-[10px] border border-[#D9D2C7] bg-[#FAF8F5] dark:border-white/10 dark:bg-[#15181E] text-[#1E2229] dark:text-[#F3EFEA] focus:outline-none focus:border-[#2B303A]"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Terminal Window */}
        <div className="rounded-[12px] border border-white/10 bg-[#1A1D24] p-4 font-mono text-xs shadow-inner min-h-[300px] max-h-[460px] overflow-y-auto space-y-2">
          {isLoading && logs.length === 0 ? (
            <div className="space-y-3 py-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 py-1.5 border-b border-white/5 animate-pulse"
                >
                  <div className="h-3 w-28 rounded-[4px] bg-white/10 shrink-0" />
                  <div className="h-4 w-16 rounded-[4px] bg-white/15 shrink-0" />
                  <div
                    className={`h-3 rounded-[4px] bg-white/10 flex-1 ${
                      idx % 2 === 0 ? 'w-3/4' : 'w-1/2'
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[#7A7670] dark:text-[#9E9A92]">
              Belum ada catatan aktivitas untuk filter ini
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="group flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-1 border-b border-white/5 hover:bg-white/[0.04] rounded px-1.5 transition-colors"
              >
                <span className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] shrink-0 whitespace-nowrap tabular-nums">
                  {formatDate(log.timestamp)}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border shrink-0 ${typeColor(
                    log.type
                  )}`}
                >
                  {typeLabels[log.type] || log.type}
                </span>
                <span className="text-[#EAE6DF] break-all leading-relaxed flex-1">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
