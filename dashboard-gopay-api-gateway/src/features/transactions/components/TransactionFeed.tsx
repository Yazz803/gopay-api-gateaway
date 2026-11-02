'use client';

import React, { useState, useMemo } from 'react';
import { FiRefreshCw, FiFileText } from 'react-icons/fi';
import { RiWallet3Line } from 'react-icons/ri';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonLoading } from '@/components/ui/SkeletonLoading';
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
            <CardTitle>Riwayat Pembayaran Masuk</CardTitle>
            <CardDescription>
              Catatan pembayaran langsung dari pelanggan via QRIS & GoPay secara real-time
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              title="Perbarui daftar pembayaran"
              className="inline-flex items-center"
            >
              <FiRefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="w-full sm:max-w-xs">
            <Input
              placeholder="Cari ID transaksi, bank/aplikasi, atau nominal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#7A7670] dark:text-[#9E9A92]">
            {isLoading && !transactionsData ? (
              <SkeletonLoading className="h-4 w-48 rounded-[4px]" />
            ) : (
              <>
                <span>
                  Menampilkan <strong className="text-[#1E2229] dark:text-[#F3EFEA] tabular-nums">{filteredTransactions.length}</strong> pembayaran
                </span>
                <span>•</span>
                <span>
                  Total: <strong className="text-[#4E6E58] dark:text-[#8EB89A] font-bold tabular-nums">{formatRupiah(totalCalculated)}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && !transactionsData ? (
          <SkeletonLoading.Table rows={5} columns={5} />
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#E8E2D9] text-[#7A7670] dark:bg-[#272C37] dark:text-[#9E9A92] mb-3">
              <FiFileText className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA]">
              {isLoading ? 'Memuat data pembayaran...' : 'Belum ada pembayaran yang tercatat'}
            </p>
            <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] max-w-sm mt-1">
              Setiap kali pelanggan selesai membayar lewat QRIS atau GoPay, pembayaran akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[#E8E2D9] dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E8E2D9]/70 dark:bg-[#272C37]/80 text-[#1E2229] dark:text-[#F3EFEA] font-semibold border-b border-[#E8E2D9] dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-3.5">Waktu</th>
                  <th className="py-2.5 px-3.5">ID Pembayaran (Order ID)</th>
                  <th className="py-2.5 px-3.5">Metode Pembayaran</th>
                  <th className="py-2.5 px-3.5 text-right">Jumlah Uang</th>
                  <th className="py-2.5 px-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9] dark:divide-white/5 text-[#1E2229] dark:text-[#F3EFEA]">
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.transaction_id || tx.order_id || idx}
                    className="hover:bg-[#E8E2D9]/40 dark:hover:bg-[#272C37]/50 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-[#7A7670] dark:text-[#9E9A92] whitespace-nowrap tabular-nums">
                      {formatDate(tx.time)}
                    </td>
                    <td className="py-3 px-3.5 font-mono">
                      <div className="font-semibold text-[#1E2229] dark:text-[#F3EFEA] truncate max-w-[200px]">
                        {tx.order_id || '-'}
                      </div>
                      <div className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] truncate max-w-[200px]">
                        {tx.transaction_id || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#1E2229] dark:text-[#F3EFEA]">
                        <RiWallet3Line className="h-3.5 w-3.5 text-[#4E6E58] dark:text-[#8EB89A]" />
                        {tx.issuer || 'GoPay'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-right text-[#1E2229] dark:text-[#F3EFEA] whitespace-nowrap tabular-nums">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3 px-3.5 text-right">
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
                        {tx.status?.toLowerCase() === 'success' ||
                        tx.status?.toLowerCase() === 'settlement' ||
                        tx.status?.toLowerCase() === 'capture'
                          ? 'Lunas'
                          : tx.status?.toLowerCase() === 'pending'
                          ? 'Menunggu'
                          : tx.status?.toUpperCase() || 'Lunas'}
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
