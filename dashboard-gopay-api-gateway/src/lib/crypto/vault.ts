import crypto from 'crypto';

export function deriveKeyFromSecret(secret: string, saltHex: string): Buffer {
  return crypto.pbkdf2Sync(secret, Buffer.from(saltHex, 'hex'), 100000, 32, 'sha256');
}

export function encryptWithKey(plaintext: string, keyBuffer: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptWithKey(payload: string, keyBuffer: Buffer): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Format ciphertext tidak valid');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function generateUserVaultKeys(pin: string, password: string): {
  encryptedDekByPin: string;
  encryptedDekByPassword: string;
  pinSalt: string;
  passwordSalt: string;
  dek: string;
} {
  const dek = crypto.randomBytes(32).toString('hex');

  const pinSalt = crypto.randomBytes(16).toString('hex');
  const passwordSalt = crypto.randomBytes(16).toString('hex');

  const pinKey = deriveKeyFromSecret(pin, pinSalt);
  const passwordKey = deriveKeyFromSecret(password, passwordSalt);

  const encryptedDekByPin = encryptWithKey(dek, pinKey);
  const encryptedDekByPassword = encryptWithKey(dek, passwordKey);

  return {
    encryptedDekByPin,
    encryptedDekByPassword,
    pinSalt,
    passwordSalt,
    dek,
  };
}

export function unlockDekWithPin(pin: string, encryptedDekByPin: string, pinSalt: string): string {
  const pinKey = deriveKeyFromSecret(pin, pinSalt);
  return decryptWithKey(encryptedDekByPin, pinKey);
}

export function unlockDekWithPassword(password: string, encryptedDekByPassword: string, passwordSalt: string): string {
  const passwordKey = deriveKeyFromSecret(password, passwordSalt);
  return decryptWithKey(encryptedDekByPassword, passwordKey);
}

export function reEncryptDekWithNewPin(dek: string, newPin: string): {
  encryptedDekByPin: string;
  pinSalt: string;
} {
  const pinSalt = crypto.randomBytes(16).toString('hex');
  const pinKey = deriveKeyFromSecret(newPin, pinSalt);
  const encryptedDekByPin = encryptWithKey(dek, pinKey);
  return {
    encryptedDekByPin,
    pinSalt,
  };
}

export function encryptWithDek(plaintext: string, dekHex: string): string {
  const dekBuffer = Buffer.from(dekHex, 'hex');
  return encryptWithKey(plaintext, dekBuffer);
}

export function decryptWithDek(ciphertext: string, dekHex: string): string {
  const dekBuffer = Buffer.from(dekHex, 'hex');
  return decryptWithKey(ciphertext, dekBuffer);
}
