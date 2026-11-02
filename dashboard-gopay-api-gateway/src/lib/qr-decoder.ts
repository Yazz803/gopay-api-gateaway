import jsQR from 'jsqr';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

export interface DecodedQrisResult {
  raw: string;
  merchantName?: string;
  city?: string;
  postalCode?: string;
  acquirer?: string;
}

/**
 * Decode QR Code from an image Buffer (JPEG or PNG) to raw text
 */
export function decodeQrCodeFromBuffer(buffer: Buffer): string | null {
  // 1. Try decoding as JPEG
  try {
    const jpegData = jpeg.decode(buffer, { useTArray: true });
    if (jpegData && jpegData.width && jpegData.height) {
      const code = jsQR(new Uint8ClampedArray(jpegData.data), jpegData.width, jpegData.height);
      if (code && code.data && code.data.trim().length > 0) {
        return code.data.trim();
      }
    }
  } catch {
    // Not a valid JPEG, fallback to PNG
  }

  // 2. Try decoding as PNG
  try {
    const png = PNG.sync.read(buffer);
    if (png && png.width && png.height) {
      const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      if (code && code.data && code.data.trim().length > 0) {
        return code.data.trim();
      }
    }
  } catch {
    // Not a valid PNG
  }

  return null;
}

/**
 * Parse EMVCo QRIS TLV tags to extract merchant information for preview
 */
export function parseQrisMerchantInfo(qrisString: string): DecodedQrisResult {
  const result: DecodedQrisResult = { raw: qrisString.trim() };
  let payload = qrisString.trim();

  // Strip Tag 63 (CRC) if present
  const idx63 = payload.indexOf('6304');
  if (idx63 !== -1) {
    payload = payload.substring(0, idx63);
  }

  let i = 0;
  try {
    while (i < payload.length) {
      const tag = payload.substring(i, i + 2);
      const length = parseInt(payload.substring(i + 2, i + 4), 10);
      if (isNaN(length) || length <= 0) break;
      const val = payload.substring(i + 4, i + 4 + length);

      if (tag === '59') {
        result.merchantName = val;
      } else if (tag === '60') {
        result.city = val;
      } else if (tag === '61') {
        result.postalCode = val;
      } else if (tag === '26' || tag === '51') {
        if (!result.acquirer && val.includes('.')) {
          result.acquirer = val;
        }
      }

      i += 4 + length;
    }
  } catch {
    // Parsing error ignored
  }

  return result;
}

/**
 * Validate that the decoded string conforms to standard EMVCo QRIS format
 */
export function isValidQrisString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim();
  // Standard EMVCo starts with Payload Format Indicator (000201)
  return clean.startsWith('000201') && clean.length > 30;
}
