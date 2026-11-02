import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    success:
      'bg-[#4E6E58]/15 text-[#4E6E58] border border-[#4E6E58]/30 dark:bg-[#658E72]/20 dark:text-[#8EB89A] dark:border-[#658E72]/40',
    warning:
      'bg-[#D99B26]/15 text-[#A36A18] border border-[#D99B26]/30 dark:bg-[#D99B26]/20 dark:text-[#F3C878] dark:border-[#D99B26]/40',
    danger:
      'bg-[#B85D43]/15 text-[#B85D43] border border-[#B85D43]/30 dark:bg-[#D07258]/20 dark:text-[#F0C8BE] dark:border-[#D07258]/40',
    info:
      'bg-[#383E4A]/15 text-[#2B303A] border border-[#383E4A]/25 dark:bg-[#383E4A]/30 dark:text-[#D1D6E1] dark:border-white/10',
    neutral:
      'bg-[#E8E2D9] text-[#7A7670] border border-[#D9D2C7] dark:bg-[#272C37] dark:text-[#9B9891] dark:border-white/10',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
