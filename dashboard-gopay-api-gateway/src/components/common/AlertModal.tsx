'use client';

import React, { useEffect, useCallback } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiInfo } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  type?: 'success' | 'warning' | 'danger' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
  isLoading?: boolean;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  type = 'info',
  confirmText = 'OK',
  onConfirm,
  isLoading = false,
}: AlertModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const icons = {
    success: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#4E6E58]/15 text-[#4E6E58] dark:bg-[#658E72]/20 dark:text-[#8EB89A]">
        <FiCheckCircle className="h-5 w-5" />
      </div>
    ),
    warning: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#D99B26]/15 text-[#A36A18] dark:bg-[#D99B26]/20 dark:text-[#F3C878]">
        <FiAlertTriangle className="h-5 w-5" />
      </div>
    ),
    danger: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#B85D43]/15 text-[#B85D43] dark:bg-[#D07258]/20 dark:text-[#F0C8BE]">
        <FiXCircle className="h-5 w-5" />
      </div>
    ),
    info: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#383E4A]/15 text-[#2B303A] dark:bg-[#383E4A]/30 dark:text-[#D1D6E1]">
        <FiInfo className="h-5 w-5" />
      </div>
    ),
  };

  const handleAction = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B303A]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-[14px] bg-[#F3EFEA] p-6 shadow-[0_10px_25px_-5px_rgba(43,48,58,0.15)] dark:bg-[#1D212A] border border-white/65 dark:border-white/10 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {icons[type]}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#1E2229] dark:text-[#F3EFEA]">{title}</h3>
            <p className="mt-2 text-xs text-[#7A7670] dark:text-[#9E9A92] leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
            {children}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {onConfirm && (
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
          )}
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleAction}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
