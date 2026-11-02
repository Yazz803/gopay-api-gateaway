export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}

export function formatDate(input: string | number | Date): string {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return String(input);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(input);
  }
}
