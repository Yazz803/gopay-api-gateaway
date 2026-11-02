import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, schema, isDatabaseConfigured } from './db';
import { eq } from 'drizzle-orm';
import { initDatabaseSchema } from './db/migrate';
import { decryptWithDek } from './crypto/vault';

const SESSION_COOKIE_NAME = 'gopay_auth_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'gopay-secure-session-auth-cookie-secret-2026';

export interface AuthSessionPayload {
  userId: string;
  username: string;
  unlockedDek?: string;
  exp: number;
}

export function signSessionToken(payload: AuthSessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${signature}`;
}

export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [dataB64, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr) as AuthSessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionPayload(req?: NextRequest): Promise<AuthSessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Not in request context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function getAuthenticatedUser(req?: NextRequest) {
  const session = await getSessionPayload(req);
  if (!session) return null;

  if (!isDatabaseConfigured()) {
    return {
      id: session.userId,
      username: session.username,
      name: session.username,
      email: 'user@local.dev',
      phoneNumber: '08123456789',
      unlockedDek: session.unlockedDek,
      isVaultUnlocked: Boolean(session.unlockedDek),
    };
  }

  await initDatabaseSchema();
  const db = getDb();
  if (!db) return null;

  const users = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, session.userId))
    .limit(1);

  if (users.length === 0) return null;
  const user = users[0];

  let decryptedName = user.username;
  let decryptedEmail = 'terenkripsi';
  let decryptedPhone = 'terenkripsi';

  if (session.unlockedDek) {
    try {
      decryptedName = decryptWithDek(user.name, session.unlockedDek);
      decryptedEmail = decryptWithDek(user.encryptedEmail, session.unlockedDek);
      decryptedPhone = decryptWithDek(user.encryptedPhoneNumber, session.unlockedDek);
    } catch {
      // Decryption failed or invalid DEK
    }
  }

  let userApiKey = user.apiKey;
  if (!userApiKey) {
    userApiKey = 'gopay_' + crypto.randomBytes(20).toString('hex');
    await db.update(schema.usersTable).set({ apiKey: userApiKey }).where(eq(schema.usersTable.id, user.id)).catch(() => {});
  }

  let qrisStatic = user.qrisStatic;
  if (!qrisStatic && user.encryptedQrisStatic && session.unlockedDek) {
    try {
      qrisStatic = decryptWithDek(user.encryptedQrisStatic, session.unlockedDek);
    } catch {
      // ignore
    }
  }

  return {
    id: user.id,
    username: user.username,
    name: decryptedName,
    email: decryptedEmail,
    phoneNumber: decryptedPhone,
    apiKey: userApiKey,
    qrisStatic: qrisStatic || null,
    createdAt: user.createdAt,
    unlockedDek: session.unlockedDek,
    isVaultUnlocked: Boolean(session.unlockedDek),
  };
}

export function setSessionCookie(res: NextResponse, payload: AuthSessionPayload): void {
  const token = signSessionToken(payload);
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600, // 7 days
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
