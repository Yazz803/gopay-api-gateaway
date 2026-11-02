import { NextRequest, NextResponse } from 'next/server';
import { gatewayState } from '@/lib/gateway-state';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: qrisId } = await context.params;
  const qris = gatewayState.qrisStore.get(qrisId);

  if (!qris) {
    return new NextResponse('<h3>Gambar QRIS tidak ditemukan atau telah dihapus</h3>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const format = req.nextUrl.searchParams.get('format');
  const raw = req.nextUrl.searchParams.get('raw');

  // Jika dipanggil via query format=raw / raw=1, redirect ke gambar mentah
  if (format === 'raw' || raw === '1') {
    if (Date.now() > qris.expiresAt.getTime()) {
      gatewayState.qrisStore.delete(qrisId);
      return new NextResponse('QRIS Kedaluwarsa', {
        status: 410,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qris.data)}`;
    return NextResponse.redirect(qrServerUrl, 302);
  }

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(qris.amount);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qris.data)}`;
  const expiresTimestamp = qris.expiresAt.getTime();

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pembayaran QRIS - ${formattedAmount}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 420px; padding: 28px 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
        .badge-qris { display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 174, 217, 0.15); color: #38bdf8; font-weight: 600; font-size: 13px; padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 16px; }
        .amount-title { font-size: 14px; color: #94a3b8; margin-bottom: 4px; }
        .amount-value { font-size: 28px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 20px; }
        .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); margin-bottom: 20px; position: relative; }
        .qr-wrapper img { display: block; width: 240px; height: 240px; border-radius: 8px; }
        .timer-box { font-size: 14px; color: #cbd5e1; background: #0f172a; padding: 10px 16px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .timer-val { font-weight: 700; color: #f59e0b; font-family: monospace; font-size: 16px; }
        .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 12px; margin-bottom: 20px; transition: all 0.3s ease; }
        .status-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .status-paid { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
        .status-expired { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .btn-check { width: 100%; background: #0284c7; hover: #0369a1; color: #ffffff; border: none; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3); }
        .btn-check:hover { background: #0369a1; transform: translateY(-1px); }
        .btn-check:disabled { background: #475569; cursor: not-allowed; opacity: 0.7; transform: none; }
        .toggle-box { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: #94a3b8; margin-top: 16px; }
        .toggle-box input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-box { display: none; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; color: #cbd5e1; margin-top: 16px; }
        .success-box strong { color: #4ade80; display: block; font-size: 15px; margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge-qris">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            GoPay / QRIS Dinamis
        </div>

        <div class="amount-title">Total Pembayaran</div>
        <div class="amount-value">${formattedAmount}</div>

        <div class="qr-wrapper" id="qr-container">
            <img src="${qrImageUrl}" alt="QRIS Code">
        </div>

        <div class="timer-box">
            <span>Batas Waktu Pembayaran</span>
            <span class="timer-val" id="timer-text">05:00</span>
        </div>

        <div class="status-badge status-pending" id="status-badge">
            <span id="status-icon">🟡</span>
            <span id="status-text">Menunggu Pembayaran</span>
        </div>

        <button class="btn-check" id="btn-check" onclick="checkStatusManual()">
            <span class="spinner" id="btn-spinner"></span>
            <span id="btn-label">🔄 Cek Status Pembayaran</span>
        </button>

        <p style="font-size:13px;color:#94a3b8;margin-top:14px;">Sudah selesai membayar? Tekan tombol <strong>Cek Status Pembayaran</strong> di atas untuk memverifikasi. Status tidak dicek otomatis demi keamanan akun merchant.</p>

        <div class="success-box" id="success-details">
            <strong>✅ Pembayaran Berhasil!</strong>
            <p>Order ID: <span id="tx-order"></span></p>
            <p>Sumber: <span id="tx-issuer"></span></p>
            <p>Waktu: <span id="tx-time"></span></p>
        </div>
    </div>

    <script>
        const qrisId = "${qrisId}";
        const expiresTimestamp = ${expiresTimestamp};
        let isChecking = false;
        let isPaid = false;
        let isExpired = false;
        let cooldownUntil = 0;
        let cooldownTimer = null;

        function updateCountdown() {
            if (isPaid) return;
            const now = Date.now();
            const diff = expiresTimestamp - now;

            if (diff <= 0) {
                isExpired = true;
                document.getElementById('timer-text').innerText = "00:00";
                document.getElementById('status-badge').className = "status-badge status-expired";
                document.getElementById('status-icon').innerText = "🔴";
                document.getElementById('status-text').innerText = "QRIS Kedaluwarsa";
                document.getElementById('btn-check').disabled = true;
                clearInterval(countdownInterval);
                clearInterval(cooldownTimer);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            document.getElementById('timer-text').innerText = 
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }

        const countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();

        function startCooldown(seconds) {
            const btn = document.getElementById('btn-check');
            const label = document.getElementById('btn-label');
            cooldownUntil = Date.now() + seconds * 1000;
            btn.disabled = true;
            clearInterval(cooldownTimer);
            const tick = () => {
                const sisa = Math.ceil((cooldownUntil - Date.now()) / 1000);
                if (sisa <= 0) {
                    clearInterval(cooldownTimer);
                    if (!isPaid && !isExpired) {
                        btn.disabled = false;
                        label.innerText = '🔄 Cek Status Pembayaran';
                    }
                    return;
                }
                label.innerText = '⏳ Cek lagi dalam ' + sisa + ' detik';
            };
            tick();
            cooldownTimer = setInterval(tick, 500);
        }

        async function checkStatusManual() {
            if (isChecking || isPaid || isExpired) return;
            if (Date.now() < cooldownUntil) return;
            isChecking = true;

            const btn = document.getElementById('btn-check');
            const spinner = document.getElementById('btn-spinner');
            const label = document.getElementById('btn-label');

            btn.disabled = true;
            spinner.style.display = 'inline-block';
            label.innerText = 'Memeriksa...';

            try {
                const res = await fetch('/api/qr-status/' + qrisId);
                const data = await res.json();

                if (data.success && data.paid) {
                    onPaymentSuccess(data.transaction);
                    return;
                } else if (data.status === 'EXPIRED') {
                    isExpired = true;
                    updateCountdown();
                    return;
                } else {
                    document.getElementById('status-text').innerText = "Belum Dibayar - silakan cek lagi sebentar lagi";
                    const jeda = (data && data.retry_after_seconds) ? data.retry_after_seconds : 10;
                    startCooldown(jeda);
                }
            } catch (err) {
                console.error("Gagal periksa status:", err);
                startCooldown(10);
            } finally {
                isChecking = false;
                spinner.style.display = 'none';
            }
        }

        // Satu kali cek otomatis saat pembeli kembali ke halaman ini
        // (mis. setelah selesai membayar di aplikasi e-wallet/bank). Bukan polling:
        // hanya terpicu oleh peristiwa halaman kembali tampil, dan tetap tunduk pada cooldown server.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkStatusManual();
            }
        });

        function onPaymentSuccess(tx) {
            isPaid = true;
            clearInterval(cooldownTimer);
            clearInterval(countdownInterval);

            document.getElementById('status-badge').className = "status-badge status-paid";
            document.getElementById('status-icon').innerText = "🟢";
            document.getElementById('status-text').innerText = "Pembayaran Berhasil / Lunas";

            const btn = document.getElementById('btn-check');
            btn.disabled = true;
            btn.style.display = 'none';

            if (tx) {
                document.getElementById('tx-order').innerText = tx.order_id || tx.transaction_id || '-';
                document.getElementById('tx-issuer').innerText = tx.payer_issuer || 'GoPay / Bank';
                document.getElementById('tx-time').innerText = tx.transaction_time ? new Date(tx.transaction_time).toLocaleString('id-ID') : '-';
                document.getElementById('success-details').style.display = 'block';
            }
        }

    </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
