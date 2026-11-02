const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const sessionManager = require('./sessionManager');

const PORT = process.env.PORT || 3000;
const MAX_LOGS = 100;
const CLAIMED_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 jam
const QRIS_EXPIRY_MS = 5 * 60 * 1000; // 5 menit
const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';

// [PATCH manual-check] Tidak ada auto-polling: status hanya dicek saat pembeli menekan tombol.
// Cooldown per QRIS ditegakkan di server agar endpoint publik tidak bisa dipakai meng-hammer API Gojek.
const STATUS_COOLDOWN_MS = parseInt(process.env.STATUS_COOLDOWN_MS || '10000', 10); // jeda minimum antar cek status per QRIS
const TX_CACHE_MS = parseInt(process.env.TX_CACHE_MS || '12000', 10); // daftar transaksi terakhir dipakai bersama semua QRIS selama jeda ini
let txCache = { fetchedAt: 0, merchantId: null, transactions: null, inflight: null };


// claimedTransactions: Map<txId, { qrisId: string|null, claimedAt: number }>
// Menyimpan mapping txId -> qrisId agar satu transaksi tidak bisa diklaim oleh dua QRIS berbeda
const claimedTransactions = new Map();
const activityLogs = [];
const qrisStore = new Map();

const CACHE_FILE = path.join(__dirname, '.gopay_cache.json');

function saveCookieToFile(cookie) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ gopay_cookie: cookie }), 'utf-8');
        logActivity('INFO', 'Cookie berhasil disimpan ke ' + CACHE_FILE);
    } catch (err) {
        logActivity('ERROR', 'Gagal simpan cookie ke file: ' + err.message);
    }
}

function logActivity(type, message, details = null) {
    const timestamp = new Date().toISOString();
    const logObj = { id: Date.now(), timestamp, type, message, details };
    activityLogs.unshift(logObj);
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.pop();
    }
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// Clean up expired claimed transactions
function cleanExpiredTransactions() {
    const now = Date.now();
    for (const [txId, claim] of claimedTransactions.entries()) {
        const claimedAt = typeof claim === 'object' ? claim.claimedAt : claim;
        if (now - claimedAt > CLAIMED_CLEANUP_INTERVAL_MS) {
            claimedTransactions.delete(txId);
        }
    }
}
setInterval(cleanExpiredTransactions, 60 * 60 * 1000);

// Periodik auto-refresh session (tiap 6 jam)
async function autoRefreshSessionPeriodically() {
    try {
        const session = sessionManager.loadSession();
        if (session && session.refresh_token) {
            if (sessionManager.isExpired(session)) {
                logActivity('INFO', 'Auto Refresh: Token mendekati kedaluwarsa, memperbarui sesi...');
                await sessionManager.refreshSession();
            }
        }
    } catch (err) {
        logActivity('ERROR', `Gagal auto refresh session: ${err.message}`);
    }
}
setInterval(autoRefreshSessionPeriodically, 6 * 60 * 60 * 1000);

// Hitung Checksum CRC16 EMVCo untuk QRIS
function calculateCRC16(payload) {
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
function parseGojekAmount(rawAmount) {
    const val = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount || 0);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val / 100);
}

// Generate QRIS Dinamis Standar EMVCo (Parsing TLV Presisi Tinggi)
function generateDynamicQRIS(staticTemplate, amount) {
    if (!staticTemplate) return null;
    let payload = staticTemplate.trim();

    // Hapus Tag 63 (CRC) lama jika ada di akhir
    const idx63 = payload.indexOf('6304');
    if (idx63 !== -1) {
        payload = payload.substring(0, idx63);
    }

    // Parse EMVCo TLV Tags
    const tags = [];
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
    } catch (e) {
        return null;
    }

    const amountStr = parseInt(amount, 10).toString();
    const newTags = [];
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

// Middleware Proteksi API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key || req.query.apikey;
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ success: false, message: 'Autentikasi Gagal: API Key tidak valid' });
    }
    next();
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('GoPay Partner API Gateway Berjalan');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'GoPay Partner API Gateway', timestamp: new Date() });
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Layanan API GoPay Berfungsi Normal', timestamp: new Date() });
});


// Cek Status Sesi Token
app.get('/token-status', apiKeyAuth, async (req, res) => {
    const activeHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
    if (!activeHeaders) {
        return res.json({ success: false, data: { token_status: 'invalid', message: 'Sesi belum dikonfigurasi. Jalankan `node login.js` di terminal.' } });
    }
    try {
        const merchantId = process.env.GOPAY_MERCHANT_ID || '';
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();

        await axios.get(GOJEK_TRANSACTIONS_URL, {
            headers: activeHeaders,
            params: {
                from: 0,
                size: 1,
                statuses: 'SETTLEMENT,CAPTURE',
                payment_types: 'QRIS,GOPAY',
                start_time: oneHourAgo,
                end_time: now.toISOString(),
                merchant_ids: merchantId
            },
            timeout: 5000
        });

        res.json({ success: true, data: { token_status: 'valid', message: 'Token dan Sesi GoPay Merchant Aktif' } });
    } catch (err) {
        res.json({ success: false, data: { token_status: 'invalid', message: err.message } });
    }
});

// Buat QRIS Dinamis (Support GET query & POST body)
app.all('/create-qris', apiKeyAuth, (req, res) => {
    const amount = req.body?.amount || req.query?.amount;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran tidak valid (gunakan ?amount=...)' });
    }

    const staticTemplate = process.env.QRIS_STATIC;
    if (!staticTemplate) {
        return res.status(500).json({ success: false, message: 'QRIS_STATIC belum dikonfigurasi di .env' });
    }

    const dynamicCode = generateDynamicQRIS(staticTemplate, amount);
    const qrisId = Math.random().toString(36).substring(2, 10);
    // TRX-ID unik per payment — dipakai sebagai scope klaim agar tidak tabrakan dengan payment lain
    const trxId = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + QRIS_EXPIRY_MS);
    const createdAt = new Date();

    qrisStore.set(qrisId, {
        data: dynamicCode,
        amount: parseInt(amount, 10),
        trxId,
        expiresAt,
        createdAt,
        status: 'PENDING'
    });

    // [PATCH manual-check] Satu kali cek terakhir terjadwal tepat setelah QRIS kedaluwarsa,
    // supaya pembayaran di detik terakhir tetap tercatat walau pembeli tidak pernah menekan tombol cek.
    const finalTimer = setTimeout(() => {
        finalizeQris(qrisId).catch(err => logActivity('ERROR', 'Final check QRIS ' + qrisId + ' gagal: ' + err.message));
    }, QRIS_EXPIRY_MS + 2000);
    if (finalTimer.unref) finalTimer.unref();

    const host = req.get('host');
    const protocol = req.protocol;
    const publicUrl = `${protocol}://${host}/qr/${qrisId}`;

    logActivity('INFO', `QRIS Dinamis dibuat | TRX-ID: ${trxId} | Nominal: Rp ${amount}`);

    res.json({
        success: true,
        data: {
            qris_id: qrisId,
            trx_id: trxId,
            qris_url: publicUrl,
            qris_code: dynamicCode,
            amount: parseInt(amount, 10),
            expires_at: expiresAt.toISOString(),
            expires_in: '5 menit'
        }
    });
});

// Render Halaman HTML QRIS Interaktif (Cek Status Manual - tanpa auto polling)
app.get('/qr/:id', (req, res) => {
    const qris = qrisStore.get(req.params.id);
    if (!qris) {
        return res.status(404).send('<h3>Gambar QRIS tidak ditemukan atau telah dihapus</h3>');
    }

    // Jika dipanggil via query format=raw / raw=1, redirect ke gambar mentah
    if (req.query.format === 'raw' || req.query.raw === '1') {
        if (Date.now() > qris.expiresAt.getTime()) {
            qrisStore.delete(req.params.id);
            return res.status(410).send('QRIS Kedaluwarsa');
        }
        const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qris.data)}`;
        return res.redirect(302, qrServerUrl);
    }

    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(qris.amount);
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
        const qrisId = "${req.params.id}";
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

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Ambil Riwayat Transaksi
app.get('/transactions', apiKeyAuth, async (req, res) => {
    let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);

    if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
        logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
        await autoLoginGojek();
        headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
    }

    if (!headers) return res.status(400).json({ success: false, error: 'Sesi GoPay belum ada. Jalankan `node login.js` di terminal.' });

    try {
        const fetchTransactions = async (activeHeaders) => {
            const merchantId = req.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || '';
            const now = new Date();
            const startTimeISO = req.query.startTime ? new Date(parseInt(req.query.startTime) * 1000).toISOString() : new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
            const endTimeISO = req.query.endTime ? new Date(parseInt(req.query.endTime) * 1000).toISOString() : now.toISOString();

            return await axios.get(GOJEK_TRANSACTIONS_URL, {
                headers: activeHeaders,
                params: {
                    from: 0,
                    size: parseInt(req.query.pageSize || '20', 10),
                    statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
                    payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
                    start_time: startTimeISO,
                    end_time: endTimeISO,
                    merchant_ids: merchantId
                },
                timeout: 10000
            });
        };

        let response;
        try {
            response = await fetchTransactions(headers);
        } catch (firstErr) {
            if (firstErr.response && firstErr.response.status === 401) {
                logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
                const refreshed = await sessionManager.refreshSession();
                if (refreshed) {
                    const newHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
                    response = await fetchTransactions(newHeaders);
                } else {
                    throw firstErr;
                }
            } else {
                throw firstErr;
            }
        }

        const rawTransactions = response.data?.transactions || response.data?.data?.transactions || [];
        const formattedTransactions = rawTransactions.map(tx => ({
            amount: parseGojekAmount(tx.gross_amount ?? tx.real_gross_amount ?? tx.amount?.value ?? tx.amount ?? 0),
            status: tx.transaction_status ? tx.transaction_status.toLowerCase() : 'success',
            time: tx.transaction_time || tx.settlement_time,
            issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
            order_id: tx.order_id,
            transaction_id: tx.id
        }));

        res.json({
            success: true,
            total_amount: String(formattedTransactions.reduce((total, tx) => total + tx.amount, 0)),
            data: { transactions: formattedTransactions }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Shortcut Semua Transaksi Bulan Ini
app.get('/transactions/all', apiKeyAuth, async (req, res) => {
    const now = new Date();
    const startOfMonthUnix = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    req.query.startTime = startOfMonthUnix;
    req.query.pageSize = 100;
    return app._router.handle({ ...req, url: '/transactions', method: 'GET' }, res);
});

// [PATCH manual-check] Ambil daftar transaksi terbaru dengan cache bersama.
// Satu request ke API Gojek dipakai untuk menjawab semua QRIS pending selama TX_CACHE_MS,
// sehingga banyak pembeli yang menekan tombol cek bersamaan tidak berlipat menjadi banyak request.
async function fetchTransactionsFromApi(activeHeaders, merchantId) {
    const now = new Date();
    const startTimeISO = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const response = await axios.get(GOJEK_TRANSACTIONS_URL, {
        headers: activeHeaders,
        params: {
            from: 0,
            size: 20,
            statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
            payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
            start_time: startTimeISO,
            end_time: now.toISOString(),
            merchant_ids: merchantId
        },
        timeout: 10000
    });
    return response.data?.transactions || response.data?.data?.transactions || response.data?.data || [];
}

async function getRecentTransactions(activeHeaders, merchantId, forceRefresh = false) {
    const nowMs = Date.now();
    if (!forceRefresh && txCache.transactions && txCache.merchantId === merchantId && (nowMs - txCache.fetchedAt) < TX_CACHE_MS) {
        return txCache.transactions;
    }
    if (!forceRefresh && txCache.inflight) {
        return txCache.inflight;
    }
    txCache.inflight = (async () => {
        try {
            const transactions = await fetchTransactionsFromApi(activeHeaders, merchantId);
            txCache = { fetchedAt: Date.now(), merchantId, transactions, inflight: null };
            return transactions;
        } catch (err) {
            txCache.inflight = null;
            throw err;
        }
    })();
    return txCache.inflight;
}

// Core Helper: Verifikasi Pembayaran dari GoPay API
// qrisId: scope klaim — satu txId hanya bisa diklaim oleh satu qrisId
async function verifyPayment(amount, startTime, merchantIdOverride = null, userAgent = null, qrisId = null) {
    let headers = await sessionManager.getValidHeaders(userAgent);
    if (!headers) {
        throw new Error('Sesi GoPay belum ada. Jalankan `node login.js` di terminal.');
    }

    const merchantId = merchantIdOverride || process.env.GOPAY_MERCHANT_ID || '';

    let rawTransactions;
    try {
        rawTransactions = await getRecentTransactions(headers, merchantId, false);
    } catch (firstErr) {
        if (firstErr.response && firstErr.response.status === 401) {
            logActivity('WARNING', 'Sesi expired (401) di verifyPayment. Memulai auto-refresh...');
            const refreshed = await sessionManager.refreshSession();
            if (refreshed) {
                const newHeaders = await sessionManager.getValidHeaders(userAgent);
                rawTransactions = await getRecentTransactions(newHeaders, merchantId, true);
            } else {
                throw firstErr;
            }
        } else {
            throw firstErr;
        }
    }
    const targetAmount = parseInt(amount, 10);
    const filterStartTimeMs = startTime ? new Date(startTime).getTime() : 0;

    for (const tx of rawTransactions) {
        const txAmount = parseGojekAmount(tx.gross_amount ?? tx.real_gross_amount ?? tx.amount?.value ?? tx.amount ?? 0);
        const txTimestamp = new Date(tx.transaction_time || tx.created_at || tx.settlement_time || 0).getTime();
        const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;

        if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
            const existingClaim = claimedTransactions.get(txId);

            if (!existingClaim) {
                // Transaksi belum diklaim siapapun → klaim sekarang
                claimedTransactions.set(txId, { qrisId, claimedAt: Date.now() });
                logActivity('INFO', `TRX ${txId} diklaim oleh QRIS ${qrisId || 'manual-check'}`);
                return {
                    transaction_id: txId,
                    order_id: tx.order_id,
                    amount: txAmount,
                    payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                    payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
                    transaction_time: tx.transaction_time || tx.settlement_time
                };
            } else if (qrisId && existingClaim.qrisId === qrisId) {
                // Re-check dari QRIS yang sama → kembalikan hasil yang sudah diklaim
                return {
                    transaction_id: txId,
                    order_id: tx.order_id,
                    amount: txAmount,
                    payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                    payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
                    transaction_time: tx.transaction_time || tx.settlement_time
                };
            } else {
                // Transaksi ini sudah diklaim oleh QRIS lain → skip, cari transaksi berikutnya
                logActivity('INFO', `TRX ${txId} sudah diklaim oleh QRIS ${existingClaim.qrisId || 'lain'}, skip untuk QRIS ${qrisId}`);
                continue;
            }
        }
    }
    return null;
}

// [PATCH manual-check] Cek terakhir untuk satu QRIS: dipakai endpoint status saat QRIS
// baru saja kedaluwarsa dan oleh timer terjadwal saat pembuatan QRIS. Melewati cooldown
// per QRIS, tapi tetap memakai cache daftar transaksi bersama.
async function finalizeQris(qrisId) {
    const qris = qrisStore.get(qrisId);
    if (!qris || qris.status === 'PAID') {
        return qris && qris.transaction ? qris.transaction : null;
    }
    if (qris.finalizing) return null;
    qris.finalizing = true;
    try {
        const matched = await verifyPayment(qris.amount, qris.createdAt, null, null, qris.trxId || qrisId);
        if (matched) {
            qris.status = 'PAID';
            qris.transaction = matched;
            qrisStore.set(qrisId, qris);
            logActivity('SUCCESS', 'Final check: pembayaran QRIS ID ' + qrisId + ' terverifikasi lunas untuk nominal Rp ' + qris.amount);
            return matched;
        }
        qrisStore.delete(qrisId);
        logActivity('INFO', 'Final check: QRIS ID ' + qrisId + ' kedaluwarsa tanpa pembayaran');
        return null;
    } catch (err) {
        logActivity('ERROR', 'Final check QRIS ID ' + qrisId + ' gagal: ' + err.message);
        qrisStore.delete(qrisId);
        return null;
    }
}

// Endpoint Public Check Status QRIS (Dipanggil oleh Halaman Frontend HTML QRIS tanpa butuh API Key)
app.get('/api/qr-status/:id', async (req, res) => {
    const qrisId = req.params.id;
    const qris = qrisStore.get(qrisId);
    if (!qris) {
        return res.json({ success: false, status: 'NOT_FOUND', message: 'QRIS tidak ditemukan' });
    }

    if (qris.status === 'PAID') {
        return res.json({ success: true, paid: true, status: 'PAID', transaction: qris.transaction });
    }

    if (Date.now() > qris.expiresAt.getTime()) {
        // [PATCH manual-check] Satu cek terakhir sebelum dinyatakan kedaluwarsa,
        // untuk menangkap pembayaran yang masuk di detik-detik terakhir masa berlaku.
        const finalMatch = await finalizeQris(qrisId);
        if (finalMatch) {
            return res.json({ success: true, paid: true, status: 'PAID', transaction: finalMatch });
        }
        return res.json({ success: false, paid: false, status: 'EXPIRED', message: 'QRIS sudah kedaluwarsa' });
    }

    // [PATCH manual-check] Cooldown server per QRIS: cek berulang dalam jeda STATUS_COOLDOWN_MS
    // dijawab dari status terakhir TANPA memanggil API Gojek lagi.
    const nowMs = Date.now();
    if (qris.lastStatusCheckAt && (nowMs - qris.lastStatusCheckAt) < STATUS_COOLDOWN_MS) {
        const retryAfter = Math.ceil((STATUS_COOLDOWN_MS - (nowMs - qris.lastStatusCheckAt)) / 1000);
        return res.json({ success: true, paid: false, status: 'PENDING', cached: true, retry_after_seconds: retryAfter, message: 'Terlalu cepat, coba lagi dalam ' + retryAfter + ' detik' });
    }
    qris.lastStatusCheckAt = nowMs;
    qrisStore.set(qrisId, qris);

    try {
        // Pakai trx_id sebagai scope klaim agar transaksi hanya bisa diklaim oleh payment ini
        const matched = await verifyPayment(qris.amount, qris.createdAt, null, req.headers['user-agent'], qris.trxId || qrisId);
        if (matched) {
            qris.status = 'PAID';
            qris.transaction = matched;
            qrisStore.set(qrisId, qris);
            logActivity('SUCCESS', `Pembayaran QRIS ID ${qrisId} terverifikasi lunas untuk nominal Rp ${qris.amount}`);
            return res.json({ success: true, paid: true, status: 'PAID', transaction: matched });
        }
        return res.json({ success: true, paid: false, status: 'PENDING', retry_after_seconds: Math.ceil(STATUS_COOLDOWN_MS / 1000), message: 'Belum ada pembayaran masuk' });
    } catch (err) {
        return res.json({ success: false, paid: false, status: 'PENDING', message: err.message });
    }
});

// Cek Pembayaran Masuk (Support GET query & POST body)
// Opsional: sertakan qris_id atau trx_id sebagai scope klaim agar tidak konflik dengan payment lain
app.all('/check-payment', apiKeyAuth, async (req, res) => {
    const amount = req.body?.amount || req.query?.amount;
    const startTime = req.body?.startTime || req.query?.startTime || req.query?.start_time;
    // trx_id dipakai sebagai scope klaim agar tidak tabrakan dengan payment nominal sama
    const scopeId = req.body?.trx_id || req.query?.trx_id || null;

    if (!amount || isNaN(amount)) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran tidak valid' });
    }

    try {
        const merchantId = req.headers['x-gopay-merchant-id'] || null;
        const matchedTransaction = await verifyPayment(amount, startTime, merchantId, req.headers['user-agent'], scopeId);

        if (matchedTransaction) {
            logActivity('SUCCESS', `Pembayaran terverifikasi lunas untuk nominal Rp ${parseInt(amount, 10)}`, matchedTransaction);
            return res.json({
                success: true,
                paid: true,
                transaction: matchedTransaction
            });
        } else {
            return res.json({
                success: true,
                paid: false,
                message: 'Pembayaran belum ditemukan atau sudah pernah diklaim'
            });
        }
    } catch (err) {
        const errorDetail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
        logActivity('ERROR', `Gagal periksa pembayaran: ${errorDetail}`);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data transaksi dari API GoPay',
            error: errorDetail
        });
    }
});

// Logs Endpoint
app.get('/api/logs', apiKeyAuth, (req, res) => {
    res.json({ success: true, logs: activityLogs });
});

app.listen(PORT, () => {
    logActivity('SYSTEM', `GoPay Partner Gateway berjalan pada port ${PORT}`);
});
