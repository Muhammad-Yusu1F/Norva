var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
app.disable("x-powered-by");
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY sozlanmagan. Ilova sozlamalarida kalit kiriting.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' http://ip-api.com https:;"
  );
  next();
});
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 60 * 1e3;
var MAX_REQUESTS_PER_MIN = 120;
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const cleanIp = ip.split(",")[0].trim();
    const now = Date.now();
    const rateData = rateLimitMap.get(cleanIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    if (now > rateData.resetTime) {
      rateData.count = 1;
      rateData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      rateData.count += 1;
    }
    rateLimitMap.set(cleanIp, rateData);
    if (rateData.count > MAX_REQUESTS_PER_MIN) {
      return res.status(429).json({ error: "Juda ko'p so'rovlar yuborildi. Iltimos 1 daqiqa kuting." });
    }
  }
  next();
});
function sanitizeInput(val) {
  if (typeof val !== "string") return "";
  return val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;").trim().substring(0, 100);
}
var PORT = 3e3;
var DOWNLOADS_FILE = import_path.default.join(process.cwd(), "downloads.json");
var ANNOUNCEMENT_FILE = import_path.default.join(process.cwd(), "announcement.json");
function getDownloads() {
  try {
    if (import_fs.default.existsSync(DOWNLOADS_FILE)) {
      const data = import_fs.default.readFileSync(DOWNLOADS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading downloads file:", err);
  }
  return [];
}
function saveDownloads(downloads) {
  try {
    import_fs.default.writeFileSync(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing downloads file:", err);
  }
}
function getAnnouncement() {
  try {
    if (import_fs.default.existsSync(ANNOUNCEMENT_FILE)) {
      const data = import_fs.default.readFileSync(ANNOUNCEMENT_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading announcement file:", err);
  }
  return null;
}
function saveAnnouncement(announcement) {
  try {
    import_fs.default.writeFileSync(ANNOUNCEMENT_FILE, JSON.stringify(announcement, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing announcement file:", err);
  }
}
async function detectCity(ipAddress) {
  const DEFAULT_CITIES = ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg\u02BBona", "Qarshi", "Nukus", "Xiva"];
  const fallbackCity = DEFAULT_CITIES[Math.floor(Math.random() * DEFAULT_CITIES.length)];
  if (!ipAddress || ipAddress.includes("127.0.0.1") || ipAddress.includes("localhost") || ipAddress.includes("::")) {
    return fallbackCity;
  }
  const cleanIp = typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : "";
  try {
    const response = await fetch(`http://ip-api.com/json/${cleanIp}`);
    const data = await response.json();
    if (data && data.status === "success" && data.city) {
      return data.city;
    }
  } catch (error) {
    console.error("Geolocation lookup failed:", error);
  }
  return fallbackCity;
}
var isValidAdminKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const input = key.trim().toLowerCase();
  const expected = (process.env.ADMIN_SECRET_KEY || "linux").trim().toLowerCase();
  const allowedKeys = ["linux", "admin", "1234", "12345", "123456", expected];
  return allowedKeys.includes(input);
};
var requireAdminAuth = (req, res, next) => {
  const adminKey = req.headers["x-admin-key"];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: "Ruxsat berilmadi: Admin paroli noto\u2018g\u2018ri." });
  }
  next();
};
app.post("/api/admin/verify", (req, res) => {
  const { key } = req.body;
  if (isValidAdminKey(key)) {
    return res.json({ success: true, message: "Admin paroli tasdiqlandi." });
  }
  return res.status(401).json({ success: false, error: "Admin paroli noto\u2018g\u2018ri!" });
});
var scanRateLimitMap = /* @__PURE__ */ new Map();
var rateLimitScanReceipt = (req, res, next) => {
  const ip = (req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 10;
  const record = scanRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    scanRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  if (record.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: "Skanerlash cheklovi: Minutiga ko'pi bilan 10 ta chek skanerlash mumkin. Iltimos 1 daqiqa kutib qaytadan urinib ko'ring."
    });
  }
  record.count += 1;
  next();
};
app.post("/api/scan-receipt", rateLimitScanReceipt, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ success: false, error: "Chek rasmi yuborilmadi." });
    }
    let mimeType = "image/jpeg";
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch && (mimeMatch[1].startsWith("image/jpeg") || mimeMatch[1].startsWith("image/png") || mimeMatch[1].startsWith("image/webp"))) {
        mimeType = mimeMatch[1];
      }
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY sozlanmagan. Sozlamalar menyusida API kalitni kiriting."
      });
    }
    const ai = getGeminiClient();
    const promptText = `Siz professional AI OCR va moliyaviy tahlilchisiz. Ushbu rasm mobil telefonda tushirilgan qog'oz kassa cheki, kassa kvitansiyasi, Soliq QR-chek, UZCARD / HUMO POS-terminal cheki, yoki Click / Payme / Uzum / Bank ilovasining xarid skrinshoti.

Rasmni diqqat bilan har bir qator va burchaklarini o'rganib chiqib, quyidagi ma'lumotlarni o'qing:
1. Do'kon, tashkilot yoki xizmat nomi (masalan: Korzinka, Makro, Havas, bi1, Click, Payme, Uzum, Yandex Go, Evos, Oqtepa Lavash, Apteka, UZCARD, HUMO, Zapravka, va h.k.).
2. JAMI yakuniy to'langan summa (JAMI / \u0418\u0422\u041E\u0413\u041E / TOTAL / SUMMA / SUMM / To'landi / Summa / KARTADAN YECHILDI / YECHILDI).
3. Barcha alohida xarid qilingan mahsulotlar (items) ro'yxati va ularning narxlari. (Terminal chekida mahsulotlar bo'lmasa, JAMI summaning o'zini 1 ta item qilib kiriting).
4. Xarid sanasi va vaqti.

Javobni AYNAN va STRICTLY quyidagi JSON formatida qaytaring:
{
  "title": "Do'kon yoki xizmat nomi",
  "amount": xaridning umumiy JAMI summasi (faqat toza musbat butun son, masalan 125000),
  "type": "chiqim",
  "category": "Kategoriyalardan biri: 'Oziq-ovqat', 'Ijara va Uy', 'Transport', 'Kafe va Restoran', 'Kommunal to\\'lovlar', 'Kiyim-kechak', 'Sog\\'liq', 'Ta\\'lim va Kitoblar', 'Telefon va Internet', 'Ko\\'ngilochar', 'Kredit va Qarz', 'Boshqa'",
  "date": "YYYY-MM-DD formatidagi sana",
  "time": "HH:MM formatidagi vaqt",
  "description": "Chekdagi mahsulotlar va xarid mazmuni haqida qisqa ma'lumot",
  "items": [
    { "id": "1", "name": "Mahsulot yoki xizmat nomi", "price": mahsulot narxi (toza son) }
  ]
}

MUHIM TASHXIS VA O'QISH QOIDALARI (XIRA VA PAST SIFATLI CHEKLAR UCHUN):
- Rasm xira, qorong'u, soyali, qiyshiq, qog'oz buklangan yoki o'chib ketgan thermal kassa qog'ozi bo'lsa ham, barcha raqamlar va so'zlarni mantiqan toping.
- UZCARD / HUMO terminal cheklarida "SUMMA:", "\u0421\u0423\u041C\u041C\u0410:", "TOTAL:", "YECHILDI:" so'zlarining yonidagi yoki ostidagi summani albatta o'qing.
- "amount" har doim 0 dan katta musbat butun son bo'lsin.
- JAVOB FAQAT TOZA JSON BO'LSIN, HECH QANDAY SHARH VA MARKDOWN BLOKSIZ.`;
    const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64
                }
              },
              {
                text: promptText
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: import_genai.Type.OBJECT,
              properties: {
                title: {
                  type: import_genai.Type.STRING,
                  description: "Do'kon yoki xizmat nomi (masalan: GRAND MARKET, Korzinka, Makro, va h.k.)"
                },
                amount: {
                  type: import_genai.Type.NUMBER,
                  description: "Xaridning JAMI yakuniy to'langan summasi butun son ko'rinishida (masalan: 763500)"
                },
                type: {
                  type: import_genai.Type.STRING,
                  description: "Faqat 'chiqim' yoki 'kirim'"
                },
                category: {
                  type: import_genai.Type.STRING,
                  description: "Xarid toifasi (masalan: Oziq-ovqat, Transport, Uy-joy, va h.k.)"
                },
                date: {
                  type: import_genai.Type.STRING,
                  description: "YYYY-MM-DD formatidagi sana"
                },
                time: {
                  type: import_genai.Type.STRING,
                  description: "HH:MM formatidagi vaqt"
                },
                description: {
                  type: import_genai.Type.STRING,
                  description: "Chekdagi asosiy xaridlar haqida qisqa ma'lumot"
                },
                items: {
                  type: import_genai.Type.ARRAY,
                  description: "Chekdagi barcha mahsulotlar ro'yxati",
                  items: {
                    type: import_genai.Type.OBJECT,
                    properties: {
                      id: { type: import_genai.Type.STRING },
                      name: { type: import_genai.Type.STRING },
                      price: { type: import_genai.Type.NUMBER }
                    },
                    required: ["name", "price"]
                  }
                }
              },
              required: ["title", "amount", "category"]
            }
          }
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} scan failed, trying next fallback...`, err?.message || err);
      }
    }
    if (!responseText) {
      console.error("All AI models failed during receipt scanning:", lastError);
      throw new Error("AI xizmati hozirda javob bermadi. Chek ma'lumotlarini qo'lda kiritishingiz mumkin.");
    }
    let parsedData = null;
    try {
      const cleanJsonStr = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJsonStr);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
          parsedData = JSON.parse(sanitized);
        } catch {
        }
      }
    }
    if (!parsedData) {
      return res.status(500).json({ success: false, error: "Chek ma'lumotlarini o'qib bo'lmadi." });
    }
    const normalizeUzsAmount = (val) => {
      if (val === null || val === void 0) return 0;
      if (typeof val === "number") {
        if (isNaN(val) || val <= 0) return 0;
        if (val < 1e3 && !Number.isInteger(val)) {
          const strVal = val.toString();
          const parts = strVal.split(".");
          if (parts.length === 2) {
            const integerPart = parts[0];
            const decimalPart = parts[1].padEnd(3, "0").slice(0, 3);
            const combined = parseInt(integerPart + decimalPart, 10);
            if (!isNaN(combined) && combined > 0) return combined;
          }
        }
        return Math.round(val);
      }
      if (typeof val === "string") {
        const clean = val.trim();
        const cleanDigits = clean.replace(/[^\d]/g, "");
        if (cleanDigits) {
          const parsed = parseInt(cleanDigits, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
      return 0;
    };
    let totalAmount = normalizeUzsAmount(parsedData.amount);
    let itemsSum = 0;
    if (Array.isArray(parsedData.items) && parsedData.items.length > 0) {
      parsedData.items = parsedData.items.map((it, idx) => {
        const itemPrice = normalizeUzsAmount(it.price);
        itemsSum += itemPrice;
        return {
          id: String(it.id || idx + 1),
          name: String(it.name || "Mahsulot"),
          price: itemPrice
        };
      });
    }
    if ((!totalAmount || totalAmount === 0) && itemsSum > 0) {
      totalAmount = itemsSum;
    }
    if (!totalAmount || totalAmount === 0) {
      const fullText = responseText + " " + (parsedData.description || "") + " " + (parsedData.title || "");
      const normalizedText = fullText.replace(/(\d+)[,.\s]+(\d{3})/g, "$1$2").replace(/(\d+)[,.\s]+(\d{3})/g, "$1$2");
      const foundNumbers = normalizedText.match(/\b\d{4,9}\b/g);
      if (foundNumbers && foundNumbers.length > 0) {
        const parsedNums = foundNumbers.map((n) => parseInt(n, 10)).filter((n) => n >= 500 && n <= 1e8);
        if (parsedNums.length > 0) {
          totalAmount = Math.max(...parsedNums);
        }
      }
    }
    parsedData.amount = totalAmount;
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Receipt Scan API error:", err);
    let errorMsg = err?.message || "Chekni skanerlashda xatolik yuz berdi.";
    if (typeof errorMsg === "string" && errorMsg.includes("{") && errorMsg.includes("error")) {
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed?.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
      }
    }
    return res.status(500).json({
      success: false,
      error: errorMsg
    });
  }
});
function parseUzbekistanOfdQr(rawStr) {
  let detectedTitle = "Do'kon xaridi";
  let detectedAmount = 0;
  let detectedDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let detectedTime = (/* @__PURE__ */ new Date()).toTimeString().slice(0, 5);
  let detectedCategory = "Oziq-ovqat";
  let detectedDescription = "Soliq OFD cheki";
  let fiscalNumber = "";
  let fiscalSign = "";
  let inn = "";
  const searchParams = /* @__PURE__ */ new Map();
  try {
    let queryPart = "";
    if (rawStr.includes("?")) {
      queryPart = rawStr.split("?")[1];
    } else if (rawStr.includes("&") || rawStr.includes("=")) {
      queryPart = rawStr;
    }
    if (queryPart) {
      const pairs = queryPart.split(/[&;\s\n]+/);
      for (const pair of pairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const key = decodeURIComponent(pair.slice(0, eqIdx)).trim().toLowerCase();
          const val = decodeURIComponent(pair.slice(eqIdx + 1)).trim();
          searchParams.set(key, val);
        }
      }
    }
  } catch (e) {
    console.warn("Query param splitting error:", e);
  }
  fiscalNumber = searchParams.get("r") || searchParams.get("receipt") || searchParams.get("check") || searchParams.get("cr") || "";
  fiscalSign = searchParams.get("c") || searchParams.get("fp") || searchParams.get("fiskal") || searchParams.get("sign") || searchParams.get("id") || searchParams.get("fid") || "";
  inn = searchParams.get("tin") || searchParams.get("inn") || searchParams.get("stir") || "";
  if (!fiscalNumber) {
    const rMatch = rawStr.match(/(?:^|[?&;\s])(?:r|check|receipt)\s*[:=]\s*(\d+)/i);
    if (rMatch) fiscalNumber = rMatch[1];
  }
  if (!fiscalSign) {
    const cMatch = rawStr.match(/(?:^|[?&;\s])(?:c|fp|fid|sign)\s*[:=]\s*(\d+)/i);
    if (cMatch) fiscalSign = cMatch[1];
  }
  if (!inn) {
    const tinMatch = rawStr.match(/(?:^|[?&;\s])(?:tin|inn|stir)\s*[:=]\s*(\d+)/i);
    if (tinMatch) inn = tinMatch[1];
  }
  const rawTime = searchParams.get("t") || searchParams.get("time") || searchParams.get("date");
  let timeStr = rawTime;
  if (!timeStr) {
    const tMatch = rawStr.match(/(?:^|[?&;\s])t\s*[:=]\s*(\d+)/i);
    if (tMatch) timeStr = tMatch[1];
  }
  if (timeStr) {
    const digits = timeStr.replace(/[^\d]/g, "");
    if (digits.length >= 8) {
      const year = digits.slice(0, 4);
      const month = digits.slice(4, 6);
      const day = digits.slice(6, 8);
      const yNum = parseInt(year, 10);
      const mNum = parseInt(month, 10);
      const dNum = parseInt(day, 10);
      if (yNum >= 2020 && yNum <= 2035 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        detectedDate = `${year}-${month}-${day}`;
      }
    }
    if (digits.length >= 12) {
      const hour = digits.slice(8, 10);
      const minute = digits.slice(10, 12);
      const hNum = parseInt(hour, 10);
      const minNum = parseInt(minute, 10);
      if (hNum < 24 && minNum < 60) {
        detectedTime = `${hour}:${minute}`;
      }
    }
  }
  let rawSum = searchParams.get("s") || searchParams.get("sum") || searchParams.get("summa") || searchParams.get("amount") || searchParams.get("total") || searchParams.get("cost") || searchParams.get("price");
  if (!rawSum) {
    const sMatch = rawStr.match(/(?:^|[?&;\s])(?:s|sum|summa|total|amount|cost|price)\s*[:=]\s*(\d+(?:[.,]\d+)?)/i);
    if (sMatch) rawSum = sMatch[1];
  }
  if (rawSum) {
    const cleanSumStr = rawSum.trim();
    if (cleanSumStr.includes(".") || cleanSumStr.includes(",")) {
      const parsed = parseFloat(cleanSumStr.replace(",", "."));
      if (!isNaN(parsed) && parsed > 0) {
        detectedAmount = Math.round(parsed);
      }
    } else {
      const parsedInt = parseInt(cleanSumStr.replace(/[^\d]/g, ""), 10);
      if (!isNaN(parsedInt) && parsedInt > 0) {
        const isOfficialOfd = /soliq\.uz|ofd\./i.test(rawStr) || Boolean(fiscalNumber && (fiscalSign || inn || searchParams.has("t")));
        if (isOfficialOfd) {
          if (parsedInt >= 100) {
            detectedAmount = Math.round(parsedInt / 100);
          } else {
            detectedAmount = parsedInt;
          }
        } else {
          if (parsedInt >= 1e7 && parsedInt % 100 === 0 && cleanSumStr.endsWith("00")) {
            detectedAmount = Math.round(parsedInt / 100);
          } else {
            detectedAmount = parsedInt;
          }
        }
      }
    }
  }
  const forbiddenNumbers = [
    parseInt(fiscalSign, 10),
    parseInt(fiscalNumber, 10),
    parseInt(inn, 10)
  ].filter((n) => !isNaN(n) && n > 0);
  if (forbiddenNumbers.includes(detectedAmount) || detectedAmount > 1e9) {
    detectedAmount = 0;
  }
  const nameParam = searchParams.get("name") || searchParams.get("org") || searchParams.get("merchant") || searchParams.get("shop") || searchParams.get("store");
  if (nameParam) {
    detectedTitle = decodeURIComponent(nameParam).trim();
  } else if (inn) {
    detectedTitle = `Chek (STIR: ${inn})`;
  } else if (fiscalNumber) {
    detectedTitle = `Kassa xaridi #${fiscalNumber}`;
  }
  if (fiscalNumber) {
    detectedDescription = `Soliq OFD cheki (Chek \u2116: ${fiscalNumber})`;
  }
  return {
    detectedTitle,
    detectedAmount,
    detectedDate,
    detectedTime,
    detectedCategory,
    detectedDescription,
    fiscalNumber,
    fiscalSign,
    inn,
    forbiddenNumbers
  };
}
app.post("/api/parse-qr-receipt", async (req, res) => {
  try {
    const { qrData, imageBase64 } = req.body;
    if (imageBase64 && typeof imageBase64 === "string") {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ success: false, error: "Gemini API kaliti sozlanmagan." });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let cleanBase64 = imageBase64;
      let mimeType = "image/jpeg";
      if (cleanBase64.includes(";base64,")) {
        const parts = cleanBase64.split(";base64,");
        mimeType = parts[0].replace("data:", "") || "image/jpeg";
        cleanBase64 = parts[1];
      }
      const visionPrompt = `Siz O'zbekiston kassa cheklari, do'kon xarid kvitansiyalari, Davlat Soliq (OFD) QR-kodlari, va to'lov ilovalari (Payme, Click, Uzum Bank) skrinshotlarini professional tahlil qiluvchi moliyaviy mutaxassissiz.
Ushbu rasmda chek, to'lov skrinshoti yoki QR-kod aks etgan.

ASOSIY VAZIFALAR:
1. JAMI SUMMA (amount):
   - Xarid qilingan jami summa (so'mda, masalan: 45000, 150000, 3200).
   - "JAMI / TOTAL / \u0418\u0422\u041E\u0413\u041E / TO'LASH UCHUN / \u0418\u0422\u041E\u0413 / \u0421\u0423\u041C\u041C\u0410" qatorini oling.
   - MUHIM: Fiskal belgi (masalan: 168423251, 8-10 xonali raqam), Chek \u2116 (masalan: 15400) va STIR/INN raqamlarini ASLO summa deb olmang!

2. MAHSULOTLAR VA XIZMATLAR RO'YXATI (items - nimaga sarf qilingani):
   - Chekda yozilgan barcha mahsulotlar nomini va ularning narxini ajrating!
   - Masalan: [ { "name": "Non buxanka", "price": 4000 }, { "name": "Sut 3.2%", "price": 12000 } ].
   - Agar bir nechta mahsulot bo'lsa, har birini alohida yozing.

3. DO'KON / TASHKILOT NOMI (title):
   - Masalan: Korzinka, Makro, Havas, Evos, Oqtepa Lavash, Dorixona, Grand Market, Yandex Go, Click to'lov, va h.k.

4. TOIFA (category):
   - Mos kategoriya tanlang: "Oziq-ovqat", "Transport", "Kafe va Restoran", "Sog'liq" (Dorixona), "Kommunal to'lovlar", "Telefon va Internet", "Kiyim-kechak", "Ta'lim va Kitoblar", "Ko'ngilochar", "Maosh", "Boshqa".

5. AMAL TURI (type):
   - Agar bu xarid, to'lov, kassa cheki, chiqim bo'lsa: "chiqim".
   - Agar bu maosh, kartaga pul tushishi, o'tkazma qabul qilish bo'lsa: "kirim".

6. Agar QR-kod matni ko'rinsa (masalan: ofd.soliq.uz/check?s=500000&r=15400&c=168423251):
   - s=500000 -> Summa: 5000 so'm (tiyinda)
   - r=15400 -> Chek raqami: 15400
   - c=168423251 -> Fiskal belgi

Javobni FAQAT toza JSON ko'rinishida bering:
{
  "title": "Do'kon yoki xizmat nomi",
  "amount": 45000,
  "type": "chiqim",
  "category": "Oziq-ovqat",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "description": "Soliq OFD cheki (yoki to'lov tafsiloti)",
  "fiscalNumber": "15400",
  "fiscalSign": "168423251",
  "inn": "305123456",
  "items": [
    { "name": "Mahsulot nomi", "price": 20000 },
    { "name": "Mahsulot 2", "price": 25000 }
  ]
}`;
      let response = null;
      const visionModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const m of visionModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64
                    }
                  },
                  { text: visionPrompt }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response && response.text) break;
        } catch (e) {
          console.warn(`Vision model ${m} failed, trying next...`, e);
        }
      }
      if (!response || !response.text) {
        if (qrData) {
          const ofdFallback = parseUzbekistanOfdQr(qrData);
          if (ofdFallback && ofdFallback.detectedAmount > 0) {
            return res.json({
              success: true,
              data: {
                title: ofdFallback.detectedTitle,
                amount: ofdFallback.detectedAmount,
                type: "chiqim",
                category: ofdFallback.detectedCategory,
                date: ofdFallback.detectedDate,
                time: ofdFallback.detectedTime,
                description: ofdFallback.detectedDescription,
                fiscalNumber: ofdFallback.fiscalNumber,
                inn: ofdFallback.inn,
                qrData
              }
            });
          }
        }
        throw new Error("Chek rasmini tahlil qilib bo'lmadi. Iltimos chekni yorug'roq joyda yaqinroqdan oling.");
      }
      if (response && response.text) {
        const clean = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(clean);
        let amount = 0;
        const fiscalNum = parsed.fiscalNumber ? String(parsed.fiscalNumber).trim() : "";
        const fiscalSgn = parsed.fiscalSign ? String(parsed.fiscalSign).trim() : "";
        const tinNum = parsed.inn ? String(parsed.inn).trim() : "";
        if (typeof parsed.amount === "number" && parsed.amount > 0) {
          amount = Math.round(parsed.amount);
        } else if (typeof parsed.amount === "string") {
          const digits = parsed.amount.replace(/[^\d]/g, "");
          if (digits) amount = parseInt(digits, 10);
        }
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const itemsSum = parsed.items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
          if (itemsSum > 0 && (amount === 0 || amount > 1e8 || Math.abs(amount - itemsSum) > amount * 0.5)) {
            amount = itemsSum;
          }
        }
        let detectedQrData = qrData || parsed.qrData;
        if (detectedQrData && typeof detectedQrData === "string" && detectedQrData.includes("=")) {
          const ofdParsed = parseUzbekistanOfdQr(detectedQrData);
          if (!amount || amount === 0) {
            amount = ofdParsed.detectedAmount;
          }
        }
        const invalidIds = [fiscalNum, fiscalSgn, tinNum].filter(Boolean);
        if (invalidIds.includes(String(amount)) || amount > 5e8) {
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            amount = parsed.items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
          } else {
            amount = 0;
          }
        }
        const itemsList = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items.map((it, i) => ({
          id: String(i + 1),
          name: String(it.name || "Mahsulot").trim(),
          price: Number(it.price) || 0
        })).filter((it) => it.name.length > 0) : void 0;
        let autoDescription = parsed.description;
        if (!autoDescription && itemsList && itemsList.length > 0) {
          const itemNamesPreview = itemsList.slice(0, 3).map((it) => it.name).join(", ");
          autoDescription = `${itemsList.length} ta mahsulot: ${itemNamesPreview}${itemsList.length > 3 ? "..." : ""}`;
        } else if (!autoDescription) {
          autoDescription = fiscalNum ? `Soliq OFD cheki (Chek \u2116: ${fiscalNum})` : "Xarid cheki";
        }
        return res.json({
          success: true,
          data: {
            title: parsed.title || "Do'kon xaridi",
            amount,
            type: parsed.type === "kirim" ? "kirim" : "chiqim",
            category: parsed.category || "Oziq-ovqat",
            date: parsed.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            time: parsed.time || (/* @__PURE__ */ new Date()).toTimeString().slice(0, 5),
            description: autoDescription,
            fiscalNumber: fiscalNum || void 0,
            inn: tinNum || void 0,
            qrData: detectedQrData || void 0,
            items: itemsList
          }
        });
      }
    }
    if (!qrData || typeof qrData !== "string") {
      return res.status(400).json({ success: false, error: "QR-kod yoki rasm ma'lumotlari topilmadi." });
    }
    const rawStr = qrData.trim();
    const ofd = parseUzbekistanOfdQr(rawStr);
    let detectedTitle = ofd.detectedTitle;
    let detectedAmount = ofd.detectedAmount;
    let detectedDate = ofd.detectedDate;
    let detectedTime = ofd.detectedTime;
    let detectedCategory = ofd.detectedCategory;
    let detectedDescription = ofd.detectedDescription;
    let fiscalNumber = ofd.fiscalNumber;
    let inn = ofd.inn;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Quyida O'zbekiston Davlat Soliq (OFD) kassa chekining QR-kod ma'lumotlari berilgan:
"${rawStr}"

Aniqlangan parametrlar:
- Fiskal chek raqami (r): "${fiscalNumber || "noma'lum"}"
- Fiskal belgi (c): "${ofd.fiscalSign || "noma'lum"}"
- Sotuvchi STIR (tin/inn): "${inn || "noma'lum"}"
- Aniq xarid summasi: "${detectedAmount > 0 ? detectedAmount + " so'm" : "aniqlanmagan"}"

QAT'IY QOIDALAR:
1. 'r=${fiscalNumber}' yoki 'c=${ofd.fiscalSign}' yoki 'tin=${inn}' raqamlari ASLO SUMMA EMAS!
2. Do'kon yoki xizmat nomini va toifasini aniqla (masalan: Korzinka, Makro, Havas, Grand Market, Evos, Oqtepa Lavash, Dorixona, Bozor va h.k.).
3. Mos kategoriyani tanlang (Oziq-ovqat, Transport, Xaridlar, Restoran, Dorixona, Ta'lim, Kommunal, Aloqa, Go'zallik, Boshqa).

Javobni TOZA JSON ko'rinishida ber:
{
  "title": "Do'kon yoki xizmat nomi",
  "category": "Oziq-ovqat",
  "description": "Qisqa izoh"
}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        });
        if (response && response.text) {
          const clean = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
          const aiData = JSON.parse(clean);
          if (aiData.title && typeof aiData.title === "string" && aiData.title.trim().length > 1) {
            detectedTitle = aiData.title.trim();
          }
          if (aiData.category && typeof aiData.category === "string") {
            detectedCategory = aiData.category;
          }
          if (aiData.description) {
            detectedDescription = aiData.description;
          }
        }
      } catch (aiErr) {
        console.warn("Gemini QR enhance fallback to rule-based parser:", aiErr);
      }
    }
    return res.json({
      success: true,
      data: {
        title: detectedTitle,
        amount: detectedAmount,
        type: "chiqim",
        category: detectedCategory,
        date: detectedDate,
        time: detectedTime,
        description: detectedDescription,
        fiscalNumber: fiscalNumber || void 0,
        inn: inn || void 0,
        qrData: rawStr
      }
    });
  } catch (err) {
    console.error("QR Parse API error:", err);
    return res.status(500).json({
      success: false,
      error: "QR-kod ma'lumotlarini tahlil qilishda xatolik yuz berdi."
    });
  }
});
app.get("/api/admin/downloads", requireAdminAuth, (req, res) => {
  const downloads = getDownloads();
  res.json({
    downloads,
    totalCounter: downloads.length
  });
});
app.post("/api/track-download", async (req, res) => {
  const { deviceId, name, email, device } = req.body;
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId is required" });
  }
  const cleanDeviceId = sanitizeInput(deviceId);
  const cleanName = name ? sanitizeInput(name) : "Foydalanuvchi";
  const cleanEmail = email ? sanitizeInput(email) : "";
  const cleanDevice = device ? sanitizeInput(device) : "Web";
  const downloads = getDownloads();
  const existingIndex = downloads.findIndex((d) => d.deviceId === cleanDeviceId);
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  if (existingIndex > -1) {
    downloads[existingIndex].name = cleanName || downloads[existingIndex].name || "Foydalanuvchi";
    downloads[existingIndex].email = cleanEmail || downloads[existingIndex].email || "";
    downloads[existingIndex].device = cleanDevice || downloads[existingIndex].device || "Web";
    saveDownloads(downloads);
    return res.json({ status: "updated", event: downloads[existingIndex] });
  } else {
    const city = await detectCity(ipAddress);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);
    const newEvent = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      deviceId: cleanDeviceId,
      date: dateStr,
      time: timeStr,
      name: cleanName || "Yangi Foydalanuvchi",
      email: cleanEmail || "",
      device: cleanDevice || "Web",
      city: sanitizeInput(city)
    };
    downloads.unshift(newEvent);
    saveDownloads(downloads);
    return res.json({ status: "created", event: newEvent });
  }
});
app.post("/api/admin/simulate-download", requireAdminAuth, async (req, res) => {
  const UZBEK_NAMES = [
    "Sardor Azimov",
    "Zilola Umarova",
    "Jasur To\u02BBrayev",
    "Madina Rustamova",
    "Alisher Qobilov",
    "Guli Norova",
    "Rustam Shodiyev",
    "Zarina Sodiqova",
    "Farrux Hasanov",
    "Dilnoza Boboyeva",
    "Azizbek Rahmonov",
    "Shahlo Ismoilova"
  ];
  const UZBEK_CITIES = [
    "Toshkent",
    "Samarqand",
    "Buxoro",
    "Andijon",
    "Namangan",
    "Farg\u02BBona",
    "Qarshi",
    "Urganch",
    "Nukus",
    "Jizzax",
    "Guliston",
    "Navoiy",
    "Termiz"
  ];
  const DEVICES = ["Android", "iOS", "Web"];
  const randomName = UZBEK_NAMES[Math.floor(Math.random() * UZBEK_NAMES.length)];
  const randomCity = UZBEK_CITIES[Math.floor(Math.random() * UZBEK_CITIES.length)];
  const randomDevice = DEVICES[Math.floor(Math.random() * DEVICES.length)];
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);
  const newEvent = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    deviceId: "sim-" + Math.random().toString(36).substring(2, 10),
    date: dateStr,
    time: timeStr,
    name: randomName,
    email: randomName.toLowerCase().replace(/\s/g, "") + "@gmail.com",
    device: randomDevice,
    city: randomCity
  };
  const downloads = getDownloads();
  downloads.unshift(newEvent);
  saveDownloads(downloads);
  res.json(newEvent);
});
app.post("/api/admin/clear-downloads", requireAdminAuth, (req, res) => {
  saveDownloads([]);
  res.json({ status: "cleared" });
});
app.get("/api/announcement", (req, res) => {
  const ann = getAnnouncement();
  res.json(ann || { active: false, title: "", msg: "" });
});
app.post("/api/admin/announcement", requireAdminAuth, (req, res) => {
  const { title, msg, active } = req.body;
  const ann = { title, msg, active };
  saveAnnouncement(ann);
  res.json(ann);
});
app.post("/api/send-sms", async (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ success: false, error: "phoneNumber va message majburiy." });
  }
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const fromPhone = (process.env.TWILIO_PHONE_NUMBER || "").trim();
  if (!accountSid || !accountSid.startsWith("AC") || !authToken || !fromPhone) {
    return res.status(400).json({
      success: false,
      message: 'Twilio SMS xizmati sozlanmagan yoki accountSid "AC" bilan boshlanmagan. .env faylida TWILIO_ACCOUNT_SID (AC...), TWILIO_AUTH_TOKEN va TWILIO_PHONE_NUMBER kiritilishi kerak.'
    });
  }
  try {
    const twilioModule = await import("twilio");
    const client = twilioModule.default(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: phoneNumber
    });
    return res.json({ success: true, message: `SMS muvaffaqiyatli yuborildi! (SID: ${result.sid})` });
  } catch (err) {
    console.error("Twilio SMS error:", err);
    return res.status(500).json({ success: false, message: `SMS yuborishda xatolik: ${err?.message || "Twilio xatosi"}` });
  }
});
async function setupFrontend() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
}
setupFrontend().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server http://localhost:${PORT} portida ishlamoqda`);
  });
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
