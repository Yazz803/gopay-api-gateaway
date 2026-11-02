import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { syncSessionIn } from './session-service';
import { logActivity } from './gateway-state';

interface ActiveLoginState {
  child: ChildProcessWithoutNullStreams;
  phone: string;
  startedAt: number;
  outputBuffer: string;
  state: 'waiting_phone' | 'waiting_otp' | 'submitting_otp' | 'completed' | 'failed';
}

let activeLogin: ActiveLoginState | null = null;
let killTimer: NodeJS.Timeout | null = null;

function cleanupActiveLogin(): void {
  if (killTimer) {
    clearTimeout(killTimer);
    killTimer = null;
  }
  if (activeLogin?.child) {
    try {
      activeLogin.child.kill();
    } catch {
      // Ignore process kill error
    }
    activeLogin = null;
  }
}

function resolveLoginScriptPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'login.js'),
    path.resolve(process.cwd(), '..', 'reference', 'login.js'),
    path.resolve(process.cwd(), 'reference', 'login.js'),
    path.resolve(__dirname, '..', '..', 'login.js'),
    path.resolve(__dirname, '..', '..', '..', 'reference', 'login.js'),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ cand)) {
      return cand;
    }
  }
  return candidates[0];
}

export async function requestGopayOtp(phone: string): Promise<{ success: boolean; message: string; error?: string }> {
  cleanupActiveLogin();

  const scriptPath = resolveLoginScriptPath();
  if (!fs.existsSync(/*turbopackIgnore: true*/ scriptPath)) {
    return {
      success: false,
      message: 'File login.js tidak ditemukan di server.',
      error: 'Script login.js missing',
    };
  }

  // Ensure sessionManager.js is present in the same directory as login.js
  const scriptDir = path.dirname(scriptPath);
  const targetSessionManager = path.join(scriptDir, 'sessionManager.js');
  if (!fs.existsSync(/*turbopackIgnore: true*/ targetSessionManager)) {
    const candidates = [
      path.resolve(process.cwd(), '..', 'reference', 'sessionManager.js'),
      path.resolve(process.cwd(), 'sessionManager.js'),
      path.resolve(__dirname, '..', '..', 'sessionManager.js'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ cand)) {
        try {
          fs.copyFileSync(cand, targetSessionManager);
          break;
        } catch {
          // copy attempt failed
        }
      }
    }
  }

  const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
  if (!cleanPhone || cleanPhone.length < 8) {
    return {
      success: false,
      message: 'Nomor telepon tidak valid. Pastikan nomor HP diawali 08... atau +628...',
    };
  }

  return new Promise((resolve) => {
    try {
      const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
      const scriptName = path.basename(scriptPath);
      const child = spawn('node', [scriptName], {
        cwd: scriptDir,
        env: {
          ...process.env,
          NODE_PATH: nodeModulesPath,
        },
      });

      let fullOutput = '';
      let phoneSent = false;
      let hasResolved = false;

      activeLogin = {
        child,
        phone: cleanPhone,
        startedAt: Date.now(),
        outputBuffer: '',
        state: 'waiting_phone',
      };

      // Auto-kill after 5 minutes if inactive
      killTimer = setTimeout(() => {
        if (activeLogin) {
          logActivity('WARNING', 'Sesi login OTP kedaluwarsa setelah 5 menit.');
          cleanupActiveLogin();
        }
      }, 5 * 60 * 1000);

      const timeoutTimer = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve({
            success: false,
            message: 'Waktu tunggu permintaan OTP habis. Silakan coba lagi.',
            error: 'Request OTP timed out after 30s',
          });
          cleanupActiveLogin();
        }
      }, 30000);

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        fullOutput += text;
        if (activeLogin) {
          activeLogin.outputBuffer += text;
        }

        // When prompt appears for phone number
        if (!phoneSent && (text.includes('Masukkan Nomor HP') || fullOutput.includes('Masukkan Nomor HP'))) {
          phoneSent = true;
          logActivity('INFO', `Mengirim nomor HP ke script login: ${cleanPhone.slice(0, 4)}••••${cleanPhone.slice(-3)}`);
          child.stdin.write(`${cleanPhone}\n`);
          if (activeLogin) activeLogin.state = 'waiting_otp';
        }

        // When OTP prompt appears
        if (
          !hasResolved &&
          (text.includes('Masukkan Kode OTP') ||
            fullOutput.includes('Masukkan Kode OTP') ||
            text.includes('berhasil dikirim') ||
            fullOutput.includes('berhasil dikirim'))
        ) {
          hasResolved = true;
          clearTimeout(timeoutTimer);
          logActivity('SUCCESS', 'Kode OTP GoPay berhasil dikirim via SMS/WA');
          resolve({
            success: true,
            message: 'Kode OTP (4 digit) telah dikirim via SMS / WhatsApp.',
          });
        }

        // When error message appears
        if (
          !hasResolved &&
          (text.toLowerCase().includes('gagal') ||
            text.toLowerCase().includes('error') ||
            text.toLowerCase().includes('invalid'))
        ) {
          hasResolved = true;
          clearTimeout(timeoutTimer);
          resolve({
            success: false,
            message: text.trim() || 'Gagal mengirim OTP ke nomor tersebut. Periksa kembali nomor HP.',
            error: text.trim(),
          });
          cleanupActiveLogin();
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const errText = chunk.toString();
        console.error('[GopayLoginProcess] STDERR:', errText);
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutTimer);
          resolve({
            success: false,
            message: 'Terjadi kendala saat menjalankan proses login.',
            error: errText,
          });
          cleanupActiveLogin();
        }
      });

      child.on('close', (code: number) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutTimer);
          resolve({
            success: false,
            message: `Proses login selesai dengan kode keluar ${code}.`,
            error: `Process exited with code ${code}`,
          });
          cleanupActiveLogin();
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      cleanupActiveLogin();
      resolve({
        success: false,
        message: `Gagal memulai proses login: ${msg}`,
        error: msg,
      });
    }
  });
}

export async function submitGopayOtp(otp: string): Promise<{ success: boolean; message: string; error?: string }> {
  if (!activeLogin || !activeLogin.child) {
    return {
      success: false,
      message: 'Sesi pengiriman OTP tidak ditemukan atau sudah kedaluwarsa. Silakan minta OTP baru.',
      error: 'No active login process',
    };
  }

  const cleanOtp = otp.trim();
  if (!cleanOtp) {
    return {
      success: false,
      message: 'Kode OTP tidak boleh kosong.',
    };
  }

  return new Promise((resolve) => {
    let hasResolved = false;
    const { child } = activeLogin!;
    activeLogin!.state = 'submitting_otp';

    const timeoutTimer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({
          success: false,
          message: 'Waktu tunggu verifikasi OTP habis. Silakan coba lagi.',
          error: 'Verification timed out',
        });
        cleanupActiveLogin();
      }
    }, 25000);

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      console.log('[GopayLoginProcess OTP Data]:', text);

      // Check if session file was created or token loaded
      setTimeout(() => {
        try {
          syncSessionIn();
        } catch {
          // ignore
        }
      }, 800);
    };

    child.stdout.on('data', onData);

    child.on('close', (code: number) => {
      if (hasResolved) return;
      hasResolved = true;
      clearTimeout(timeoutTimer);

      try {
        syncSessionIn();
      } catch {
        // ignore
      }

      if (code === 0) {
        logActivity('SUCCESS', 'Verifikasi OTP berhasil, sesi akun GoPay telah tersimpan dan aktif!');
        resolve({
          success: true,
          message: 'Akun GoPay Merchant berhasil terhubung dan siap digunakan!',
        });
      } else {
        logActivity('ERROR', `Verifikasi OTP gagal (kode keluar ${code}).`);
        resolve({
          success: false,
          message: 'Kode OTP salah atau kedaluwarsa. Silakan periksa kembali dan coba lagi.',
          error: `Process exit ${code}`,
        });
      }
      cleanupActiveLogin();
    });

    logActivity('INFO', 'Mengirimkan kode OTP untuk verifikasi akun GoPay...');
    child.stdin.write(`${cleanOtp}\n`);
  });
}

export function cancelGopayLogin(): void {
  cleanupActiveLogin();
}
