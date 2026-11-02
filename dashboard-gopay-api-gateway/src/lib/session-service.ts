import fs from 'fs';
import path from 'path';
import { logActivity } from './gateway-state';

declare const __non_webpack_require__: NodeRequire | undefined;

function getSessionManager(): {
  SESSION_FILE: string;
  getValidHeaders: (ua?: string) => Promise<Record<string, string> | null>;
  refreshSession: () => Promise<boolean>;
  loadSession: () => Record<string, unknown> | null;
  isExpired: (session: unknown) => boolean;
} {
  const nodeRequire =
    typeof __non_webpack_require__ !== 'undefined'
      ? __non_webpack_require__
      : eval('require');

  const candidates = [
    path.resolve(process.cwd(), '..', 'sessionManager.js'),
    path.resolve(process.cwd(), 'sessionManager.js'),
    path.resolve(__dirname, '..', '..', '..', 'sessionManager.js'),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ cand)) {
      return nodeRequire(cand);
    }
  }

  // Fallback to first candidate
  return nodeRequire(candidates[0]);
}

function getCandidatePaths(): string[] {
  const sm = getSessionManager();
  const directPath: string = sm.SESSION_FILE;

  const list: string[] = [];
  // 1. Where sessionManager directly points
  list.push(directPath);
  // 2. Next.js app root
  list.push(path.join(process.cwd(), '.GOPAY_SESI_JANGAN_DIHAPUS.json'));
  // 3. Parent directory (repo root)
  list.push(path.resolve(process.cwd(), '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json'));
  // 4. Relative to this source file's directory
  list.push(path.resolve(__dirname, '..', '..', '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json'));

  // Return unique paths
  return Array.from(new Set(list));
}

export function syncSessionIn(): void {
  try {
    const sm = getSessionManager();
    const targetFile: string = sm.SESSION_FILE;
    const candidates = getCandidatePaths().filter(p => p !== targetFile);

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        const candStat = fs.statSync(cand);
        const localExists = fs.existsSync(targetFile);
        const localStat = localExists ? fs.statSync(targetFile) : null;

        if (!localExists || candStat.mtimeMs > (localStat?.mtimeMs || 0)) {
          fs.copyFileSync(cand, targetFile);
          logActivity('INFO', `Sinkronisasi file sesi dari ${cand} ke ${targetFile}`);
          break;
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SessionSyncIn] Error:', message);
  }
}

export function syncSessionOut(): void {
  try {
    const sm = getSessionManager();
    const sourceFile: string = sm.SESSION_FILE;
    if (!fs.existsSync(sourceFile)) return;

    const candidates = getCandidatePaths().filter(p => p !== sourceFile);
    for (const cand of candidates) {
      fs.copyFileSync(sourceFile, cand);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SessionSyncOut] Error:', message);
  }
}

export async function getValidHeaders(userAgent?: string | null): Promise<Record<string, string> | null> {
  syncSessionIn();
  const sm = getSessionManager();
  const headers = await sm.getValidHeaders(userAgent || undefined);
  return headers;
}

export async function refreshSession(): Promise<boolean> {
  syncSessionIn();
  const sm = getSessionManager();
  const result = await sm.refreshSession();
  if (result) {
    syncSessionOut();
  }
  return result;
}

export function loadSession(): Record<string, unknown> | null {
  syncSessionIn();
  const sm = getSessionManager();
  return sm.loadSession();
}

export function isExpired(session: unknown): boolean {
  const sm = getSessionManager();
  return sm.isExpired(session);
}

// Auto-refresh periodik (tiap 6 jam)
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      const session = loadSession();
      if (session && session.refresh_token) {
        if (isExpired(session)) {
          logActivity('INFO', 'Auto Refresh: Token mendekati kedaluwarsa, memperbarui sesi...');
          await refreshSession();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logActivity('ERROR', `Gagal auto refresh session: ${message}`);
    }
  }, 6 * 60 * 60 * 1000);
}
