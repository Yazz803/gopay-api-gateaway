// Deobfuscated + variable-renamed clean version
// Original was obfuscated with javascript-obfuscator (string-array + RC4/Base64, control-flow flattening).
// Logic is unchanged from the faithful .deobfuscated.js version, only identifier names were made readable.

const readline = require("readline");
const axios = require("axios");
const crypto = require("crypto");
const sessionManager = require("./sessionManager");
const GOBIZ_REQUEST_OTP_URL = "https://api.gobiz.co.id/goid/login/request";
const GOBIZ_VERIFY_OTP_URL = "https://api.gobiz.co.id/goid/token";
const GOBIZ_USER_CONFIG_URL = "https://api.gobiz.co.id/goresto/v5/public/users/config";
const interfaceConfig = {
  input: process.stdin,
  output: process.stdout
};
const rl = readline.createInterface(interfaceConfig);
function askQuestion(questionText) {
  return new Promise(resolveAnswer => rl.question(questionText, resolveAnswer));
}
function parsePhoneInput(rawInput) {
  let normalizedPhone = rawInput.trim().replace(/\D/g, "");
  if (normalizedPhone.startsWith("62")) {
    normalizedPhone = normalizedPhone.slice(2);
  } else if (normalizedPhone.startsWith("0")) {
    normalizedPhone = normalizedPhone.slice(1);
  }
  return normalizedPhone;
}
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
async function main() {
  console.log("====================================================");
  console.log("   GOPAY MERCHANT / GOFOOD MERCHANT LOGIN OTP CLI   ");
  console.log("====================================================\n");
  try {
    const phoneInputRaw = await askQuestion(">> Masukkan Nomor HP GoBiz/GoFood Merchant (contoh: 085119772671): ");
    const phoneLocal = parsePhoneInput(phoneInputRaw);
    if (!phoneLocal || phoneLocal.length < 8) {
      console.log("[-] Nomor HP tidak valid. Sesi login dibatalkan.");
      rl.close();
      return;
    }
    const phoneInternational = "+62" + phoneLocal;
    const uniqueId = generateUUID();
    console.log("[*] Mengirim permintaan OTP ke nomor: " + phoneInternational + "...");
    const gobizHeaders = {
      accept: "application/json, text/plain, */*",
      ["accept-language"]: "id"
    };
    gobizHeaders["authentication-type"] = "go-id";
    gobizHeaders["content-type"] = "application/json";
    gobizHeaders["gojek-country-code"] = "ID";
    gobizHeaders["gojek-timezone"] = "Asia/Jakarta";
    gobizHeaders.origin = "https://portal.gofoodmerchant.co.id";
    gobizHeaders.referer = "https://portal.gofoodmerchant.co.id/";
    gobizHeaders["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
    gobizHeaders["x-appid"] = "go-biz-web-dashboard";
    gobizHeaders["x-appversion"] = "platform-v3.111.0-1708bc9a";
    gobizHeaders["x-deviceos"] = "Web";
    gobizHeaders["x-phonemake"] = "Windows 10 64-bit";
    gobizHeaders["x-phonemodel"] = "Chrome 150.0.0.0 on Windows 10 64-bit";
    gobizHeaders["x-platform"] = "Web";
    gobizHeaders["x-uniqueid"] = uniqueId;
    gobizHeaders["x-user-locale"] = "en-GB";
    gobizHeaders["x-user-type"] = "merchant";
    const headers = gobizHeaders;
    let otpToken = "";
    let otpExpiresIn = 720;
    let otpLength = 4;
    try {
      const requestOtpPayload = {
        client_id: "go-biz-web-new",
        phone_number: phoneLocal,
        country_code: "62"
      };
      const requestOtpConfig = {
        headers: headers,
        timeout: 15000
      };
      const requestOtpResponse = await axios.post(GOBIZ_REQUEST_OTP_URL, requestOtpPayload, requestOtpConfig);
      const requestOtpBody = requestOtpResponse.data;
      const requestOtpData = requestOtpBody.data || {};
      otpToken = requestOtpData.otp_token || requestOtpBody.otp_token || "";
      otpExpiresIn = requestOtpData.otp_expires_in || 720;
      otpLength = requestOtpData.otp_length || 4;
      const nextState = requestOtpData.next_state || {};
      const otpChannel = nextState.state ? nextState.state.toUpperCase() : "SMS";
      console.log("[+] Kode OTP (" + otpLength + " digit) berhasil dikirim via " + otpChannel + "!");
      console.log("[*] Berlaku selama " + otpExpiresIn + " detik.\n");
    } catch (requestOtpError) {
      const requestOtpErrorDetail = requestOtpError.response ? JSON.stringify(requestOtpError.response.data) : requestOtpError.message;
      console.error("[-] Gagal meminta OTP dari server GoBiz: " + requestOtpErrorDetail);
      rl.close();
      return;
    }
    const otpInput = await askQuestion(">> Masukkan Kode OTP (" + otpLength + " digit): ");
    if (!otpInput || otpInput.trim().length === 0) {
      console.log("[-] Kode OTP kosong. Sesi login dibatalkan.");
      rl.close();
      return;
    }
    console.log("[*] Memverifikasi kode OTP...");
    const verifyOtpConfig = {
      headers: headers,
      timeout: 15000
    };
    const verifyOtpResponse = await axios.post(GOBIZ_VERIFY_OTP_URL, {
      client_id: "go-biz-web-new",
      grant_type: "otp",
      data: {
        otp: otpInput.trim(),
        otp_token: otpToken
      }
    }, verifyOtpConfig);
    const verifyOtpBody = verifyOtpResponse.data;
    const accessToken = verifyOtpBody.access_token || verifyOtpBody.data?.access_token;
    const refreshToken = verifyOtpBody.refresh_token || verifyOtpBody.data?.refresh_token;
    if (!accessToken) {
      console.error("[-] Verifikasi gagal: access_token tidak ditemukan dalam respon server.");
      console.log("Detail respon:", JSON.stringify(verifyOtpBody));
      rl.close();
      return;
    }
    const cookieString = "access_token=" + accessToken + "; refresh_token=" + (refreshToken || "") + "; auth_method=goid";
    const expiresAtIso = new Date(Date.now() + 86400000).toISOString();
    let merchant = null;
    try {
      console.log("[*] Mengambil data merchant & outlet info...");
      const userConfigHeaders = {
        Authorization: "Bearer " + accessToken,
        "authentication-type": "go-id",
        Origin: "https://portal.gofoodmerchant.co.id",
        Referer: "https://portal.gofoodmerchant.co.id/",
        "User-Agent": headers["user-agent"]
      };
      const userConfigRequestConfig = {
        headers: userConfigHeaders,
        timeout: 10000
      };
      const userConfigResponse = await axios.get(GOBIZ_USER_CONFIG_URL, userConfigRequestConfig);
      merchant = userConfigResponse.data?.merchant || null;
    } catch (userConfigError) {
      console.warn("[!] Tidak dapat mengambil detail config merchant:", userConfigError.message);
    }
    const merchantId = merchant?.id || null;
    const outletName = merchant?.outlet_name || "Merchant GoPay";
    const sessionData = {
      phone_number: phoneInternational,
      merchant_id: merchantId,
      outlet_name: outletName,
      access_token: accessToken,
      refresh_token: refreshToken,
      cookie: cookieString,
      updated_at: new Date().toISOString(),
      expires_at: expiresAtIso
    };
    const saveResult = sessionManager.saveSession(sessionData);
    if (saveResult) {
      console.log("\n====================================================");
      console.log("   [SUCCESS] LOGIN BERHASIL & SESI TERSIMPAN!       ");
      console.log("====================================================");
      console.log("File Sesi    : .GOPAY_SESI_JANGAN_DIHAPUS.json");
      console.log("Nomor HP     : " + phoneInternational);
      if (merchantId) {
        console.log("Merchant ID  : " + merchantId);
      }
      if (outletName) {
        console.log("Outlet Name  : " + outletName);
      }
      console.log("Token Exp    : " + expiresAtIso);
      console.log("\nSesi akan diperbarui (auto-refresh) secara otomatis oleh gateway.\n");
    } else {
      console.error("[-] Gagal menulis file sesi .GOPAY_SESI_JANGAN_DIHAPUS.json");
    }
  } catch (mainError) {
    const mainErrorDetail = mainError.response ? JSON.stringify(mainError.response.data) : mainError.message;
    console.error("\n[-] Gagal memproses login OTP: " + mainErrorDetail);
  } finally {
    rl.close();
  }
}
main();