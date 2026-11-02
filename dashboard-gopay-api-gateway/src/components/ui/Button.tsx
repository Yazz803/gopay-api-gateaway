'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-[10px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2B303A]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-[#2B303A] text-[#EAE6DF] hover:bg-[#383E4A] hover:-translate-y-0.5 active:translate-y-0 dark:bg-[#EAE6DF] dark:text-[#1E2229] dark:hover:bg-white shadow-[0_2px_6px_-1px_rgba(43,48,58,0.12)]',
    pill:
      'rounded-full bg-[#383E4A] text-[#EAE6DF] hover:bg-[#4E5666] hover:-translate-y-0.5 active:translate-y-0 px-3.5 py-1.5 text-xs font-semibold shadow-xs',
    secondary:
      'bg-[#E8E2D9] text-[#1E2229] hover:bg-[#DED8CE] dark:bg-[#272C37] dark:text-[#F3EFEA] dark:hover:bg-[#333946] active:scale-[0.99]',
    outline:
      'border border-[#D9D2C7] bg-transparent hover:bg-[#E8E2D9] text-[#1E2229] dark:border-white/10 dark:text-[#EAE6DF] dark:hover:bg-[#272C37]',
    ghost:
      'bg-transparent hover:bg-[#E8E2D9] text-[#7A7670] hover:text-[#1E2229] dark:hover:bg-[#272C37] dark:hover:text-[#EAE6DF]',
    danger:
      'bg-[#B85D43] text-white hover:bg-[#9D462D] dark:bg-[#D07258] dark:hover:bg-[#B85D43] shadow-xs active:scale-[0.99]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
