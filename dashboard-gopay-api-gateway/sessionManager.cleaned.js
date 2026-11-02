// Deobfuscated + variable-renamed clean version
// Original was obfuscated with javascript-obfuscator (string-array + RC4/Base64, control-flow flattening).
// Logic is unchanged from the faithful .deobfuscated.js version, only identifier names were made readable.

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const SESSION_FILE = path.join(__dirname, ".GOPAY_SESI_JANGAN_DIHAPUS.json");
const LEGACY_CACHE_FILE = path.join(__dirname, ".gopay_cache.json");
const GOBIZ_TOKEN_URL = "https://api.gobiz.co.id/goid/token";
function generateUUID() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  } else {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (templateChar) {
      var randomValue = Math.random() * 16 | 0;
      var replacementValue = templateChar == "x" ? randomValue : randomValue & 3 | 8;
      return replacementValue.toString(16);
    });
  }
}
function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const sessionFileContent = fs.readFileSync(SESSION_FILE, "utf-8");
      return JSON.parse(sessionFileContent);
    }
  } catch (readError) {
    console.error("[SessionManager] Gagal membaca file sesi:", readError.message);
  }
  try {
    if (fs.existsSync(LEGACY_CACHE_FILE)) {
      const legacyFileContent = fs.readFileSync(LEGACY_CACHE_FILE, "utf-8");
      const legacyData = JSON.parse(legacyFileContent);
      if (legacyData.gopay_cookieieie) {
        const accessTokenMatch = legacyData.gopay_cookieieie.match(/access_token=([^;]+)/);
        const refreshTokenMatch = legacyData.gopay_cookie.match(/refresh_token=([^;]+)/);
        return {
          access_token: accessTokenMatch ? accessTokenMatch[1] : null,
          refresh_token: refreshTokenMatch ? refreshTokenMatch[1] : null,
          cookie: legacyData.gopay_cookie,
          updated_at: new Date().toISOString(),
          expires_at: null
        };
      }
    }
  } catch (legacyError) {}
  if (process.env.GOPAY_COOKIE) {
    const envCookie = process.env.GOPAY_COOKIE;
    const envAccessMatch = envCookie.match(/access_token=([^;]+)/);
    const envRefreshMatch = envCookie.match(/refresh_token=([^;]+)/);
    return {
      access_token: envAccessMatch ? envAccessMatch[1] : null,
      refresh_token: envRefreshMatch ? envRefreshMatch[1] : null,
      cookie: envCookie,
      updated_at: new Date().toISOString(),
      expires_at: null
    };
  }
  return null;
}
function saveSession(sessionInput) {
  try {
    const sessionToSave = {
      phone_number: sessionInput.phone_number || null,
      merchant_id: sessionInput.merchant_id || null,
      outlet_name: sessionInput.outlet_name || null,
      access_token: sessionInput.access_token || null,
      refresh_token: sessionInput.refresh_token || null,
      cookie: sessionInput.cookie || null,
      updated_at: sessionInput.updated_at || new Date().toISOString(),
      expires_at: sessionInput.expires_at || null
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionToSave, null, 2), "utf-8");
    console.log("[SessionManager] Sesi berhasil diperbarui dan disimpan ke " + SESSION_FILE);
    return true;
  } catch (saveError) {
    console.error("[SessionManager] Gagal menyimpan file sesi:", saveError.message);
    return false;
  }
}
function isExpired(session) {
  if (!session || !session.access_token) {
    return true;
  }
  if (!session.expires_at) {
    return false;
  }
  const nowMs = Date.now();
  const expiresMs = new Date(session.expires_at).getTime();
  return expiresMs - nowMs < 300000;
}
async function refreshSession() {
  const currentSession = loadSession();
  if (!currentSession || !currentSession.refresh_token) {
    console.log("[SessionManager] Refresh token tidak ditemukan. Diperlukan login ulang via CLI (node login.js).");
    return null;
  }
  let phoneLocal = (currentSession.phone_number || "").replace(/\D/g, "");
  if (phoneLocal.startsWith("62")) {
    phoneLocal = phoneLocal.slice(2);
  } else if (phoneLocal.startsWith("0")) {
    phoneLocal = phoneLocal.slice(1);
  }
  try {
    console.log("[SessionManager] Mengirimkan request auto-refresh token ke GoBiz...");
    const refreshData = {
      refresh_token: currentSession.refresh_token,
      phone_number: phoneLocal,
      country_code: "62"
    };
    const refreshPayload = {
      client_id: "go-biz-web-new",
      grant_type: "refresh_token",
      data: refreshData
    };
    const refreshResponse = await axios.post(GOBIZ_TOKEN_URL, refreshPayload, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id",
        "authentication-type": "go-id",
        "content-type": "application/json",
        "gojek-country-code": "ID",
        "gojek-timezone": "Asia/Jakarta",
        origin: "https://portal.gofoodmerchant.co.id",
        referer: "https://portal.gofoodmerchant.co.id/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "x-appid": "go-biz-web-dashboard",
        "x-appversion": "platform-v3.111.0-1708bc9a",
        "x-deviceos": "Web",
        "x-phonemake": "Windows 10 64-bit",
        "x-phonemodel": "Chrome 150.0.0.0 on Windows 10 64-bit",
        "x-platform": "Web",
        "x-uniqueid": generateUUID(),
        "x-user-locale": "en-GB",
        "x-user-type": "merchant"
      },
      timeout: 10000
    });
    const refreshBody = refreshResponse.data;
    const newAccessToken = refreshBody.access_token || refreshBody.data?.access_token;
    const newRefreshToken = refreshBody.refresh_token || refreshBody.data?.refresh_token || currentSession.refresh_token;
    if (newAccessToken) {
      const newCookie = "access_token=" + newAccessToken + "; refresh_token=" + newRefreshToken + "; auth_method=goid";
      const newExpiresAt = new Date(Date.now() + 86400000).toISOString();
      const updatedSession = {
        ...currentSession,
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        cookie: newCookie,
        updated_at: new Date().toISOString(),
        expires_at: newExpiresAt
      };
      saveSession(updatedSession);
      console.log("[SessionManager] Auto-refresh token BERHASIL! Token baru telah ditulis ke .GOPAY_SESI_JANGAN_DIHAPUS.json");
      return updatedSession;
    } else {
      console.error("[SessionManager] Respon refresh token tidak berisi access_token valid.");
      return null;
    }
  } catch (refreshError) {
    const refreshErrorDetail = refreshError.response ? JSON.stringify(refreshError.response.data) : refreshError.message;
    console.error("[SessionManager] Auto-refresh token GAGAL: " + refreshErrorDetail);
    return null;
  }
}
async function getValidHeaders(customUserAgent) {
  let validSession = loadSession();
  if (!validSession || !validSession.access_token) {
    console.warn("[SessionManager] PERINGATAN: Sesi GoPay belum tersedia. Silakan jalankan `node login.js` di terminal.");
    return null;
  }
  if (isExpired(validSession)) {
    console.log("[SessionManager] Token terdeteksi kadaluwarsa, mencoba refresh otomatis...");
    const refreshedSession = await refreshSession();
    if (refreshedSession) {
      validSession = refreshedSession;
    }
  }
  const validAccessToken = validSession.access_token;
  const validCookie = validSession.cookie || "access_token=" + validAccessToken + "; refresh_token=" + (validSession.refresh_token || "") + "; auth_method=goid";
  const validHeaders = {
    Authorization: "Bearer " + validAccessToken,
    Cookie: validCookie,
    "authentication-type": "go-id",
    Accept: "application/json, text/plain, */*",
    Origin: "https://portal.gofoodmerchant.co.id",
    Referer: "https://portal.gofoodmerchant.co.id/",
    "User-Agent": customUserAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
  };
  return validHeaders;
}
const sessionManagerExports = {
  SESSION_FILE: SESSION_FILE,
  loadSession: loadSession,
  saveSession: saveSession,
  isExpired: isExpired,
  refreshSession: refreshSession,
  getValidHeaders: getValidHeaders
};
module.exports = sessionManagerExports;