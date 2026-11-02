// Hitung Checksum CRC16 EMVCo untuk QRIS
export function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Konversi nominal dari Gojek API (Gojek merchant-analytics mengembalikan nominal dalam satuan sen / 2 desimal)
export function parseGojekAmount(rawAmount: unknown): number {
  const val = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount || 0));
  if (isNaN(val) || val <= 0) return 0;
  return Math.round(val / 100);
}

// Generate QRIS Dinamis Standar EMVCo (Parsing TLV Presisi Tinggi)
export function generateDynamicQRIS(staticTemplate: string, amount: number | string): string | null {
  if (!staticTemplate) return null;
  let payload = staticTemplate.trim();

  // Hapus Tag 63 (CRC) lama jika ada di akhir
  const idx63 = payload.indexOf('6304');
  if (idx63 !== -1) {
    payload = payload.substring(0, idx63);
  }

  // Parse EMVCo TLV Tags
  const tags: { tag: string; val: string }[] = [];
  let i = 0;
  try {
    while (i < payload.length) {
      const tag = payload.substring(i, i + 2);
      const length = parseInt(payload.substring(i + 2, i + 4), 10);
      if (isNaN(length)) break;
      const val = payload.substring(i + 4, i + 4 + length);
      tags.push({ tag, val });
      i += 4 + length;
    }
  } catch {
    return null;
  }

  const amountStr = parseInt(String(amount), 10).toString();
  const newTags: { tag: string; val: string }[] = [];
  let hasTag54 = false;

  for (const item of tags) {
    if (item.tag === '01') {
      // Ubah Static (11) ke Dynamic (12)
      newTags.push({ tag: '01', val: '12' });
    } else if (item.tag === '54') {
      newTags.push({ tag: '54', val: amountStr });
      hasTag54 = true;
    } else if (item.tag === '58' && !hasTag54) {
      newTags.push({ tag: '54', val: amountStr });
      hasTag54 = true;
      newTags.push(item);
    } else {
      newTags.push(item);
    }
  }

  if (!hasTag54) {
    newTags.push({ tag: '54', val: amountStr });
  }

  let result = '';
  for (const item of newTags) {
    const lenStr = item.val.length.toString().padStart(2, '0');
    result += `${item.tag}${lenStr}${item.val}`;
  }

  result += '6304';
  const checksum = calculateCRC16(result);
  return result + checksum;
}
