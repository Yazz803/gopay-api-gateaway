'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { TransactionsResponse } from '@/types';

export interface TransactionItem {
  amount: number;
  status: string;
  time: string;
  issuer: string;
  order_id: string;
  transaction_id: string;
}

export interface TransactionFeedProps {
  transactionsData: TransactionsResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function TransactionFeed({
  transactionsData,
  isLoading,
  onRefresh,
}: TransactionFeedProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const transactions: TransactionItem[] = useMemo(() => {
    if (!transactionsData?.data) return [];
    if (Array.isArray(transactionsData.data)) {
      return transactionsData.data.map((tx) => ({
        amount: tx.amount,
        status: tx.status,
        time: tx.transaction_time,
        issuer: tx.issuer || 'GoPay / Bank',
        order_id: tx.order_id,
        transaction_id: tx.id,
      }));
    }
    return (transactionsData.data.transactions || []) as TransactionItem[];
  }, [transactionsData]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.order_id?.toLowerCase().includes(term) ||
        tx.transaction_id?.toLowerCase().includes(term) ||
        tx.issuer?.toLowerCase().includes(term) ||
        String(tx.amount).includes(term)
    );
  }, [transactions, searchTerm]);

  const totalCalculated = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredTransactions]);

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Riwayat Transaksi GoPay & QRIS</CardTitle>
            <CardDescription>
              Transaksi settlement real-time langsung dari Gojek Merchant API
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              title="Refresh transaksi"
            >
              Muat Ulang
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="w-full sm:max-w-xs">
            <Input
              placeholder="Cari order ID, issuer, atau nominal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredTransactions.length}</strong> transaksi
            </span>
            <span>•</span>
            <span>
              Total: <strong className="text-[#00aa13] dark:text-[#00c817] font-semibold">{formatRupiah(totalCalculated)}</strong>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isLoading ? 'Mengambil data transaksi...' : 'Belum ada transaksi ditemukan'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Transaksi yang berhasil dibayar melalui QRIS atau GoPay akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Order ID / Trx ID</th>
                  <th className="py-2.5 px-3">Issuer / Metode</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.transaction_id || tx.order_id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(tx.time)}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {tx.order_id || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {tx.transaction_id || '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-[#00aa13]" />
                        {tx.issuer || 'GoPay'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          tx.status?.toLowerCase() === 'success' ||
                          tx.status?.toLowerCase() === 'settlement' ||
                          tx.status?.toLowerCase() === 'capture'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {tx.status?.toUpperCase() || 'SUCCESS'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
