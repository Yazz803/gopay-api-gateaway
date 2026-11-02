'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RiQrCodeLine,
  RiStore2Line,
  RiUploadCloud2Line,
  RiMapPinLine,
} from 'react-icons/ri';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiImage,
  FiFileText,
} from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface StaticQrisData {
  raw: string;
  merchantName?: string;
  city?: string;
  postalCode?: string;
  acquirer?: string;
}

export interface StaticQrisUploaderProps {
  onQrisConfigured?: (data: StaticQrisData) => void;
  onQrisRemoved?: () => void;
  compact?: boolean;
}

export function StaticQrisUploader({
  onQrisConfigured,
  onQrisRemoved,
  compact = false,
}: StaticQrisUploaderProps) {
  const [qrisData, setQrisData] = useState<StaticQrisData | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/user/qris-static')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.hasQrisStatic && data.data) {
          setQrisData(data.data);
          onQrisConfigured?.(data.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file tidak didukung. Harap unggah file foto gambar (JPEG atau PNG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto melebihi batas 8MB.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadAndDecode = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/user/qris-static', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || 'Gagal membaca kode QRIS dari foto. Pastikan gambar jelas dan tidak terpotong.'
        );
      }

      setQrisData(data.data);
      setSuccessMessage('Kode QRIS Statis berhasil didecode dan disimpan ke database!');
      setSelectedFile(null);
      setPreviewUrl(null);
      onQrisConfigured?.(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat membaca foto QRIS.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteQris = async () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin menghapus data QRIS Statis ini? Anda tidak akan dapat membuat QRIS dinamis sampai mengunggah foto QRIS baru.'
    );
    if (!confirm) return;

    setErrorMessage(null);
    try {
      const res = await fetch('/api/user/qris-static', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setQrisData(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        onQrisRemoved?.();
      }
    } catch {
      // ignore
    }
  };

  // If already configured and compact mode
  if (qrisData && compact) {
    return (
      <div className="rounded-[12px] bg-[#4E6E58]/10 dark:bg-[#658E72]/15 border border-[#4E6E58]/20 dark:border-[#658E72]/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#4E6E58]/20 dark:bg-[#658E72]/30 text-[#4E6E58] dark:text-[#8EB89A]">
            <RiQrCodeLine className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                {qrisData.merchantName || 'QRIS Statis Toko'}
              </span>
              <Badge variant="success" size="sm">
                TERPASANG
              </Badge>
            </div>
            <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] flex items-center gap-2 mt-0.5">
              {qrisData.city && (
                <span className="flex items-center gap-1">
                  <RiMapPinLine className="h-3 w-3" />
                  <span>{qrisData.city}</span>
                </span>
              )}
              <span>• Standard EMVCo Valid</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteQris}
            className="text-xs text-[#B85D43] dark:text-[#F0C8BE] hover:bg-[#B85D43]/10"
            title="Ganti / Hapus QRIS Statis"
          >
            <FiTrash2 className="h-3.5 w-3.5" />
            <span>Ganti Foto</span>
          </Button>
        </div>
      </div>
    );
  }

  // If already configured and full view
  if (qrisData) {
    return (
      <Card className="border border-white/65 dark:border-white/10 shadow-xs select-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#4E6E58]/15 text-[#4E6E58] dark:bg-[#658E72]/20 dark:text-[#8EB89A]">
                <RiQrCodeLine className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                    QRIS Statis Toko Terpasang
                  </h3>
                  <Badge variant="success" size="sm">
                    AKTIF
                  </Badge>
                </div>
                <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-0.5">
                  Data QRIS statis telah didecode dan tersimpan di database untuk pembuatan QR dinamis
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteQris}
              className="text-xs gap-1 text-[#B85D43] dark:text-[#F0C8BE] hover:bg-[#B85D43]/10 border-[#B85D43]/20"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              <span>Ganti Foto</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
            <div>
              <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] block mb-1">
                Nama Merchant / Usaha
              </span>
              <p className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA] flex items-center gap-1.5">
                <RiStore2Line className="h-3.5 w-3.5 text-[#4E6E58] dark:text-[#8EB89A]" />
                <span>{qrisData.merchantName || 'Merchant GoPay'}</span>
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#7A7670] dark:text-[#9E9A92] block mb-1">
                Kota / Lokasi
              </span>
              <p className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA] flex items-center gap-1.5">
                <RiMapPinLine className="h-3.5 w-3.5 text-[#D99B26] dark:text-[#E8AF4A]" />
                <span>{qrisData.city || 'Indonesia'}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Upload Box when not configured
  return (
    <Card className="border border-white/65 dark:border-white/10 shadow-xs select-none">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#D99B26]/15 text-[#D99B26] dark:bg-[#E8AF4A]/20 dark:text-[#E8AF4A]">
            <RiUploadCloud2Line className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                Wajib Unggah Foto QRIS Statis Toko
              </h2>
              <Badge variant="warning" size="sm">
                WAJIB
              </Badge>
            </div>
            <p className="text-xs text-[#7A7670] dark:text-[#9E9A92] mt-1 leading-relaxed">
              Sebelum dapat membuat kode QRIS pembayaran, Anda wajib mengunggah foto QRIS statis toko Anda.
              Sistem akan <strong>mendecode teks kode QR</strong> dan menyimpannya di database akun Anda tanpa menyimpan file gambar.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-[10px] bg-[#B85D43]/15 dark:bg-[#D07258]/20 border border-[#B85D43]/30 dark:border-[#D07258]/40 p-3 text-xs text-[#B85D43] dark:text-[#F0C8BE] flex items-start gap-2 animate-in fade-in">
            <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-[10px] bg-[#4E6E58]/15 dark:bg-[#658E72]/20 border border-[#4E6E58]/30 dark:border-[#658E72]/40 p-3 text-xs text-[#4E6E58] dark:text-[#8EB89A] flex items-start gap-2 animate-in fade-in">
            <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
          />

          {!previewUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[14px] p-8 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-[#4E6E58] bg-[#4E6E58]/10'
                  : 'border-[#D9D2C7] dark:border-white/15 hover:border-[#4E6E58] dark:hover:border-[#8EB89A] bg-black/[0.01] dark:bg-white/[0.02]'
              }`}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#383E4A]/10 dark:bg-white/5 text-[#7A7670] dark:text-[#9E9A92] mb-3">
                <FiImage className="h-7 w-7" />
              </div>
              <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA]">
                Pilih atau Tarik Foto QRIS Toko ke Sini
              </h4>
              <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] mt-1">
                Format didukung: JPG, JPEG, PNG (Maksimal 8MB)
              </p>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#383E4A] text-[#EAE6DF] text-xs font-semibold shadow-xs">
                  <FiFileText className="h-3.5 w-3.5" />
                  <span>Jelajahi File Foto</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-32 h-32 shrink-0 rounded-[10px] overflow-hidden border border-black/10 dark:border-white/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Pratinjau QRIS"
                    className="w-full h-full object-contain p-1"
                  />
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-[#1E2229] dark:text-[#F3EFEA] truncate">
                    {selectedFile?.name}
                  </h4>
                  <p className="text-[11px] text-[#7A7670] dark:text-[#9E9A92] tabular-nums">
                    Ukuran: {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
                  </p>
                  <p className="text-[11px] text-[#4E6E58] dark:text-[#8EB89A] font-medium">
                    Foto siap diproses untuk decoding teks QRIS
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isUploading}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUploadAndDecode}
                  isLoading={isUploading}
                  className="inline-flex items-center gap-1.5"
                >
                  <FiCheckCircle className="h-3.5 w-3.5" />
                  <span>Decode & Simpan QRIS ke Database</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Info Privasi Penyimpanan */}
        <div className="p-3.5 rounded-[10px] bg-[#383E4A]/40 border border-white/10 text-xs text-[#9B9FA7] flex items-start gap-2.5">
          <FiFileText className="h-4 w-4 shrink-0 text-[#8EB89A] mt-0.5" />
          <p className="leading-relaxed">
            <strong>Catatan Keamanan:</strong> File foto fisik <strong>tidak akan disimpan di server maupun di database</strong>. Sistem membaca gambar di memori sementara, mengekstraksi teks kode QRIS EMVCo, lalu hanya teks tersebut yang disimpan terenkripsi di tabel akun Anda.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
