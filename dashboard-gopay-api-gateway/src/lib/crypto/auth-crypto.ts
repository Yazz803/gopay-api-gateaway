import crypto from 'crypto';

const DEFAULT_PEPPER = process.env.BLIND_INDEX_PEPPER || 'gopay-gateway-secure-pepper-v1-2026';

export function normalizeIdentifier(val: string): { type: 'email' | 'phone'; normalized: string } {
  const clean = val.trim();
  if (clean.includes('@')) {
    return { type: 'email', normalized: clean.toLowerCase() };
  }
  // Remove non-digit chars
  const digits = clean.replace(/[^\d+]/g, '');
  return { type: 'phone', normalized: digits };
}

export function computeBlindIndex(value: string, pepper: string = DEFAULT_PEPPER): string {
  const { normalized } = normalizeIdentifier(value);
  return crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (derivedKey.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}
