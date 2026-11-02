'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SkeletonVariant =
  | 'default'
  | 'text'
  | 'card'
  | 'kpi'
  | 'table'
  | 'table-row'
  | 'badge'
  | 'terminal';

export interface SkeletonLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
  rows?: number;
  columns?: number;
}

export function SkeletonLoading({
  className,
  variant = 'default',
  lines = 3,
  rows = 4,
  columns = 5,
  ...props
}: SkeletonLoadingProps) {
  // 1. Primitive pulse bar / block
  if (variant === 'default') {
    return (
      <div
        role="status"
        aria-label="Memuat data..."
        className={cn(
          'animate-pulse rounded-[8px] bg-[#E8E2D9] dark:bg-[#272C37]',
          className
        )}
        {...props}
      />
    );
  }

  // 2. Text variant (multiple lines of varied widths)
  if (variant === 'text') {
    const widths = ['w-full', 'w-[85%]', 'w-[65%]', 'w-[90%]', 'w-[75%]'];
    return (
      <div
        role="status"
        aria-label="Memuat teks..."
        className={cn('space-y-2.5', className)}
        {...props}
      >
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'h-3.5 rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37] animate-pulse',
              widths[idx % widths.length]
            )}
          />
        ))}
      </div>
    );
  }

  // 3. Badge variant (pill shape for status indicators)
  if (variant === 'badge') {
    return (
      <div
        role="status"
        aria-label="Memuat status..."
        className={cn(
          'inline-flex h-6 w-24 animate-pulse rounded-full bg-[#E8E2D9] dark:bg-[#272C37] border border-[#D9D2C7]/50 dark:border-white/10',
          className
        )}
        {...props}
      />
    );
  }

  // 4. KPI Bento Card variant
  if (variant === 'kpi') {
    return (
      <div
        role="status"
        aria-label="Memuat metrik..."
        className={cn(
          'rounded-[14px] bg-[#F3EFEA] dark:bg-[#1D212A] border border-white/65 dark:border-white/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] flex flex-col justify-between min-h-[110px]',
          className
        )}
        {...props}
      >
        {/* Title */}
        <div className="h-3 w-28 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37] animate-pulse" />
        
        {/* Value */}
        <div className="my-2.5 h-7 w-36 rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37] animate-pulse" />
        
        {/* Subtitle / Footer */}
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-16 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37] animate-pulse" />
          <div className="h-2.5 w-20 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37] animate-pulse" />
        </div>
      </div>
    );
  }

  // 5. Table row variant
  if (variant === 'table-row') {
    return (
      <tr
        role="status"
        aria-label="Memuat baris tabel..."
        className={cn(
          'border-b border-[#E8E2D9] dark:border-white/5 animate-pulse',
          className
        )}
      >
        {Array.from({ length: columns }).map((_, cIdx) => (
          <td key={cIdx} className="py-3.5 px-3.5">
            <div
              className={cn(
                'h-3.5 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37]',
                cIdx === 0 && 'w-24',
                cIdx === 1 && 'w-36',
                cIdx === 2 && 'w-20',
                cIdx === columns - 2 && 'w-24 ml-auto',
                cIdx === columns - 1 && 'w-16 ml-auto rounded-full'
              )}
            />
          </td>
        ))}
      </tr>
    );
  }

  // 6. Full Table variant
  if (variant === 'table') {
    return (
      <div
        role="status"
        aria-label="Memuat tabel..."
        className={cn(
          'overflow-x-auto rounded-[10px] border border-[#E8E2D9] dark:border-white/10 bg-[#FAF8F5]/60 dark:bg-[#1A1D24]/40',
          className
        )}
        {...props}
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-[#E8E2D9]/70 dark:bg-[#272C37]/80 border-b border-[#E8E2D9] dark:border-white/10">
            <tr>
              {Array.from({ length: columns }).map((_, cIdx) => (
                <th key={cIdx} className="py-3 px-3.5">
                  <div className="h-3 w-16 rounded-[4px] bg-[#D9D2C7] dark:bg-[#383E4A] animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E2D9] dark:divide-white/5">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={cIdx} className="py-3.5 px-3.5">
                    <div
                      className={cn(
                        'h-3.5 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37]',
                        cIdx === 0 && 'w-24',
                        cIdx === 1 && 'w-40',
                        cIdx === 2 && 'w-20',
                        cIdx === columns - 2 && 'w-24 ml-auto',
                        cIdx === columns - 1 && 'w-16 ml-auto rounded-full'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 7. Terminal variant
  if (variant === 'terminal') {
    return (
      <div
        role="status"
        aria-label="Memuat catatan sistem..."
        className={cn(
          'rounded-[12px] border border-white/10 bg-[#1A1D24] p-4 font-mono text-xs space-y-3',
          className
        )}
        {...props}
      >
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center gap-2 py-1 border-b border-white/5 animate-pulse"
          >
            <div className="h-3 w-28 rounded-[4px] bg-white/10 shrink-0" />
            <div className="h-4 w-16 rounded-[4px] bg-white/15 shrink-0" />
            <div
              className={cn(
                'h-3 rounded-[4px] bg-white/10 flex-1',
                idx % 2 === 0 ? 'w-3/4' : 'w-1/2'
              )}
            />
          </div>
        ))}
      </div>
    );
  }

  // 8. General Card variant
  return (
    <div
      role="status"
      aria-label="Memuat kartu..."
      className={cn(
        'rounded-[14px] border border-white/65 bg-[#F3EFEA] p-5 shadow-[0_2px_8px_-2px_rgba(43,48,58,0.05)] dark:border-white/[0.08] dark:bg-[#1D212A] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] space-y-4 animate-pulse',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9] dark:border-white/10">
        <div className="h-4 w-36 rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37]" />
        <div className="h-4 w-20 rounded-[4px] bg-[#E8E2D9] dark:bg-[#272C37]" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3.5 w-full rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37]" />
        <div className="h-3.5 w-4/5 rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37]" />
        <div className="h-3.5 w-2/3 rounded-[6px] bg-[#E8E2D9] dark:bg-[#272C37]" />
      </div>
    </div>
  );
}

// Sub-components for ergonomic declarative composition
SkeletonLoading.Text = function SkeletonText({
  lines = 3,
  className,
  ...props
}: { lines?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonLoading variant="text" lines={lines} className={className} {...props} />;
};

SkeletonLoading.Badge = function SkeletonBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonLoading variant="badge" className={className} {...props} />;
};

SkeletonLoading.KpiCard = function SkeletonKpiCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonLoading variant="kpi" className={className} {...props} />;
};

SkeletonLoading.Card = function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonLoading variant="card" className={className} {...props} />;
};

SkeletonLoading.Table = function SkeletonTable({
  rows = 5,
  columns = 5,
  className,
  ...props
}: { rows?: number; columns?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <SkeletonLoading
      variant="table"
      rows={rows}
      columns={columns}
      className={className}
      {...props}
    />
  );
};

SkeletonLoading.TableRow = function SkeletonTableRow({
  columns = 5,
  className,
  ...props
}: { columns?: number; className?: string } & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <SkeletonLoading
      variant="table-row"
      columns={columns}
      className={className}
      {...props}
    />
  );
};

SkeletonLoading.Terminal = function SkeletonTerminal({
  rows = 5,
  className,
  ...props
}: { rows?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <SkeletonLoading
      variant="terminal"
      rows={rows}
      className={className}
      {...props}
    />
  );
};
