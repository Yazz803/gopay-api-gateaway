import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#1E2229] dark:text-[#F3EFEA]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-[10px] border border-[#D9D2C7] bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-medium text-[#1E2229] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#7A7670]/60 focus-visible:outline-none focus-visible:border-[#2B303A] focus-visible:ring-2 focus-visible:ring-[#2B303A]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#15181E] dark:text-[#F3EFEA] dark:placeholder:text-[#9E9A92]/50 dark:focus-visible:border-[#EAE6DF] dark:focus-visible:ring-white/10',
            error && 'border-[#B85D43] focus-visible:ring-[#B85D43]/20 dark:border-[#D07258]',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#B85D43] dark:text-[#D07258]">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#7A7670] dark:text-[#9E9A92]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
