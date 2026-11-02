'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
        return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
      case 'WARNING':
        return 'text-amber-400 border-amber-800 bg-amber-950/40';
      case 'ERROR':
        return 'text-rose-400 border-rose-800 bg-rose-950/40';
      case 'SYSTEM':
        return 'text-purple-400 border-purple-800 bg-purple-950/40';
      case 'INFO':
      default:
        return 'text-sky-400 border-sky-800 bg-sky-950/40';
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Activity & Gateway Console</CardTitle>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <CardDescription>
              Log aktivitas realtime, sinkronisasi file sesi, dan klaim transaksi QRIS
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              title="Refresh logs"
            >
              Refresh Logs
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {(['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR', 'SYSTEM'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedType === t
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}

          <input
            type="text"
            placeholder="Cari pesan log..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="ml-auto text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:outline-none"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Terminal Window */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs shadow-inner min-h-[300px] max-h-[460px] overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              {isLoading ? 'Memuat data logs...' : 'Belum ada log yang sesuai'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="group flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-1 border-b border-slate-900 hover:bg-slate-900/50 rounded px-1.5 transition-colors"
              >
                <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${typeColor(
                    log.type
                  )}`}
                >
                  {log.type}
                </span>
                <span className="text-slate-300 break-all leading-relaxed flex-1">
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
