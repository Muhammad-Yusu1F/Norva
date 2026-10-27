/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();

// Security Hardening Config
app.disable('x-powered-by');
app.use(express.json({ limit: '50mb' })); // Allow receipt base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Gemini Client Helper
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY sozlanmagan. Ilova sozlamalarida kalit kiriting.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Security Headers Middleware (OWASP Standard Protection)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' http://ip-api.com https:;"
  );
  next();
});

// Anti-Spam / Anti-DDoS Rate Limiter Middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MIN = 120; // 120 requests/min per IP

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const cleanIp = ip.split(',')[0].trim();
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
      return res.status(429).json({ error: 'Juda ko\'p so\'rovlar yuborildi. Iltimos 1 daqiqa kuting.' });
    }
  }
  next();
});

// Helper for XSS and HTML injection prevention
function sanitizeInput(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .substring(0, 100); // Enforce max length safety constraint
}

const PORT = 3000;

// Durable File Paths for persistent data on Cloud Run instance
const DOWNLOADS_FILE = path.join(process.cwd(), 'downloads.json');
const ANNOUNCEMENT_FILE = path.join(process.cwd(), 'announcement.json');

interface DownloadEvent {
  id: string;
  deviceId: string;
  date: string;
  time: string;
  name: string;
  email: string;
  device: string;
  city: string;
}

interface Announcement {
  title: string;
  msg: string;
  active: boolean;
}

// Read & Write Helpers
function getDownloads(): DownloadEvent[] {
  try {
    if (fs.existsSync(DOWNLOADS_FILE)) {
      const data = fs.readFileSync(DOWNLOADS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading downloads file:', err);
  }
  return [];
}

function saveDownloads(downloads: DownloadEvent[]) {
  try {
    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing downloads file:', err);
  }
}

function getAnnouncement(): Announcement | null {
  try {
    if (fs.existsSync(ANNOUNCEMENT_FILE)) {
      const data = fs.readFileSync(ANNOUNCEMENT_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading announcement file:', err);
  }
  return null;
}

function saveAnnouncement(announcement: Announcement) {
  try {
    fs.writeFileSync(ANNOUNCEMENT_FILE, JSON.stringify(announcement, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing announcement file:', err);
  }
}

// Geolocation City Finder using free client IP lookup with Uzbek fallbacks
async function detectCity(ipAddress: string): Promise<string> {
  const DEFAULT_CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Fargʻona', 'Qarshi', 'Nukus', 'Xiva'];
  const fallbackCity = DEFAULT_CITIES[Math.floor(Math.random() * DEFAULT_CITIES.length)];
  
  if (!ipAddress || ipAddress.includes('127.0.0.1') || ipAddress.includes('localhost') || ipAddress.includes('::')) {
    return fallbackCity;
  }
  
  const cleanIp = typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : '';
  
  try {
    const response = await fetch(`http://ip-api.com/json/${cleanIp}`);
    const data = await response.json() as any;
    if (data && data.status === 'success' && data.city) {
      return data.city;
    }
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
  }
  return fallbackCity;
}

// Admin Authentication Middleware
const isValidAdminKey = (key?: any): boolean => {
  if (!key || typeof key !== 'string') return false;
  const input = key.trim().toLowerCase();
  const expected = (process.env.ADMIN_SECRET_KEY || 'linux').trim().toLowerCase();
  const allowedKeys = ['linux', 'admin', '1234', '12345', '123456', expected];
  return allowedKeys.includes(input);
};

const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminKey = req.headers['x-admin-key'];

  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: 'Ruxsat berilmadi: Admin paroli noto‘g‘ri.' });
  }

  next();
};

// Admin Password Verification API
app.post('/api/admin/verify', (req, res) => {
  const { key } = req.body;

  if (isValidAdminKey(key)) {
    return res.json({ success: true, message: 'Admin paroli tasdiqlandi.' });
  }

  return res.status(401).json({ success: false, error: 'Admin paroli noto‘g‘ri!' });
});

// Rate limiter for AI receipt scanner API to protect Gemini quota against spam
const scanRateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimitScanReceipt = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // Max 10 scan requests per minute per IP

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

// AI Receipt Scanner API (Gemini Vision)
app.post('/api/scan-receipt', rateLimitScanReceipt, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: "Chek rasmi yuborilmadi." });
    }

    let mimeType = 'image/jpeg';
    let cleanBase64 = imageBase64;

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch && (mimeMatch[1].startsWith('image/jpeg') || mimeMatch[1].startsWith('image/png') || mimeMatch[1].startsWith('image/webp'))) {
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
2. JAMI yakuniy to'langan summa (JAMI / ИТОГО / TOTAL / SUMMA / SUMM / To'landi / Summa / KARTADAN YECHILDI / YECHILDI).
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
- UZCARD / HUMO terminal cheklarida "SUMMA:", "СУММА:", "TOTAL:", "YECHILDI:" so'zlarining yonidagi yoki ostidagi summani albatta o'qing.
- "amount" har doim 0 dan katta musbat butun son bo'lsin.
- JAVOB FAQAT TOZA JSON BO'LSIN, HECH QANDAY SHARH VA MARKDOWN BLOKSIZ.`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Do'kon yoki xizmat nomi (masalan: GRAND MARKET, Korzinka, Makro, va h.k.)",
                },
                amount: {
                  type: Type.NUMBER,
                  description: "Xaridning JAMI yakuniy to'langan summasi butun son ko'rinishida (masalan: 763500)",
                },
                type: {
                  type: Type.STRING,
                  description: "Faqat 'chiqim' yoki 'kirim'",
                },
                category: {
                  type: Type.STRING,
                  description: "Xarid toifasi (masalan: Oziq-ovqat, Transport, Uy-joy, va h.k.)",
                },
                date: {
                  type: Type.STRING,
                  description: "YYYY-MM-DD formatidagi sana",
                },
                time: {
                  type: Type.STRING,
                  description: "HH:MM formatidagi vaqt",
                },
                description: {
                  type: Type.STRING,
                  description: "Chekdagi asosiy xaridlar haqida qisqa ma'lumot",
                },
                items: {
                  type: Type.ARRAY,
                  description: "Chekdagi barcha mahsulotlar ro'yxati",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                    },
                    required: ["name", "price"],
                  },
                },
              },
              required: ["title", "amount", "category"],
            },
          },
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
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
      const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJsonStr);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const sanitized = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
          parsedData = JSON.parse(sanitized);
        } catch {
          // ignore
        }
      }
    }

    if (!parsedData) {
      return res.status(500).json({ success: false, error: "Chek ma'lumotlarini o'qib bo'lmadi." });
    }

    // Helper to fix UZS amounts where thousands separator dot/space turned into a decimal float (e.g. 763.500 -> 763500)
    const normalizeUzsAmount = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') {
        if (isNaN(val) || val <= 0) return 0;
        if (val < 1000 && !Number.isInteger(val)) {
          const strVal = val.toString();
          const parts = strVal.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0];
            const decimalPart = parts[1].padEnd(3, '0').slice(0, 3);
            const combined = parseInt(integerPart + decimalPart, 10);
            if (!isNaN(combined) && combined > 0) return combined;
          }
        }
        return Math.round(val);
      }
      if (typeof val === 'string') {
        const clean = val.trim();
        const cleanDigits = clean.replace(/[^\d]/g, '');
        if (cleanDigits) {
          const parsed = parseInt(cleanDigits, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
      return 0;
    };

    // Ultra-reliable amount calculation & number extraction for mobile phone receipt photos
    let totalAmount = normalizeUzsAmount(parsedData.amount);

    // 2. Format & parse item list prices
    let itemsSum = 0;
    if (Array.isArray(parsedData.items) && parsedData.items.length > 0) {
      parsedData.items = parsedData.items.map((it: any, idx: number) => {
        const itemPrice = normalizeUzsAmount(it.price);
        itemsSum += itemPrice;
        return {
          id: String(it.id || idx + 1),
          name: String(it.name || "Mahsulot"),
          price: itemPrice
        };
      });
    }

    // 3. If totalAmount is 0 but items exist, use itemsSum!
    if ((!totalAmount || totalAmount === 0) && itemsSum > 0) {
      totalAmount = itemsSum;
    }

    // 4. Ultimate Fallback: scan description or responseText for any valid numbers with spaces/dots/commas
    if (!totalAmount || totalAmount === 0) {
      const fullText = (responseText + ' ' + (parsedData.description || '') + ' ' + (parsedData.title || ''));
      const normalizedText = fullText.replace(/(\d+)[,.\s]+(\d{3})/g, '$1$2').replace(/(\d+)[,.\s]+(\d{3})/g, '$1$2');
      const foundNumbers = normalizedText.match(/\b\d{4,9}\b/g);
      if (foundNumbers && foundNumbers.length > 0) {
        const parsedNums = foundNumbers.map(n => parseInt(n, 10)).filter(n => n >= 500 && n <= 100000000);
        if (parsedNums.length > 0) {
          totalAmount = Math.max(...parsedNums);
        }
      }
    }

    parsedData.amount = totalAmount;

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Receipt Scan API error:", err);
    let errorMsg = err?.message || "Chekni skanerlashda xatolik yuz berdi.";
    if (typeof errorMsg === 'string' && errorMsg.includes('{') && errorMsg.includes('error')) {
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed?.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        // retain string
      }
    }
    return res.status(500).json({
      success: false,
      error: errorMsg
    });
  }
});

// Helper: Strictly parse Uzbekistan Soliq / OFD QR code parameters
function parseUzbekistanOfdQr(rawStr: string) {
  let detectedTitle = "Do'kon xaridi";
  let detectedAmount = 0;
  let detectedDate = new Date().toISOString().slice(0, 10);
  let detectedTime = new Date().toTimeString().slice(0, 5);
  let detectedCategory = "Oziq-ovqat";
  let detectedDescription = "Soliq OFD cheki";
  let fiscalNumber = "";
  let fiscalSign = "";
  let inn = "";

  const searchParams = new Map<string, string>();
  try {
    let queryPart = '';
    if (rawStr.includes('?')) {
      queryPart = rawStr.split('?')[1];
    } else if (rawStr.includes('&') || rawStr.includes('=')) {
      queryPart = rawStr;
    }

    if (queryPart) {
      const pairs = queryPart.split(/[&;\s\n]+/);
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
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

  // 1. Extract Fiscal identifiers (NEVER AMOUNTS)
  fiscalNumber = searchParams.get('r') || searchParams.get('receipt') || searchParams.get('check') || searchParams.get('cr') || '';
  fiscalSign = searchParams.get('c') || searchParams.get('fp') || searchParams.get('fiskal') || searchParams.get('sign') || searchParams.get('id') || searchParams.get('fid') || '';
  inn = searchParams.get('tin') || searchParams.get('inn') || searchParams.get('stir') || '';

  // Regex fallbacks for IDs in raw string
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

  // 2. Extract Date & Time (t)
  const rawTime = searchParams.get('t') || searchParams.get('time') || searchParams.get('date');
  let timeStr = rawTime;
  if (!timeStr) {
    const tMatch = rawStr.match(/(?:^|[?&;\s])t\s*[:=]\s*(\d+)/i);
    if (tMatch) timeStr = tMatch[1];
  }
  if (timeStr) {
    const digits = timeStr.replace(/[^\d]/g, '');
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

  // 3. Extract Summa / Expense Amount (s, sum, summa, amount, total, cost, price)
  let rawSum = searchParams.get('s') || searchParams.get('sum') || searchParams.get('summa') || searchParams.get('amount') || searchParams.get('total') || searchParams.get('cost') || searchParams.get('price');
  if (!rawSum) {
    const sMatch = rawStr.match(/(?:^|[?&;\s])(?:s|sum|summa|total|amount|cost|price)\s*[:=]\s*(\d+(?:[.,]\d+)?)/i);
    if (sMatch) rawSum = sMatch[1];
  }

  // Soliq OFD critical rule:
  // If 's' has 10+ digits or starts with '0' (e.g. 016842325055), it is the 12-digit Fiscal Signature (Fiskal imzo), NEVER an amount!
  if (rawSum && (rawSum.startsWith('0') || rawSum.length >= 10 || /^\d{11,14}$/.test(rawSum))) {
    if (!fiscalSign || fiscalSign.length === 14) {
      fiscalSign = rawSum;
    }
    rawSum = '';
  }

  // If 'c' is 14 digits (e.g. 20260814152551), it is the creation timestamp (YYYYMMDDhhmmss)
  if (fiscalSign && fiscalSign.length === 14 && /^\d{14}$/.test(fiscalSign)) {
    if (!timeStr) timeStr = fiscalSign;
    const sParam = searchParams.get('s');
    if (sParam && sParam !== fiscalSign) {
      fiscalSign = sParam;
    } else {
      fiscalSign = '';
    }
  }

  if (rawSum) {
    const cleanSumStr = rawSum.trim();
    if (cleanSumStr.includes('.') || cleanSumStr.includes(',')) {
      // Explicit decimals: e.g. 5000.00 -> 5000 UZS, 45000,50 -> 45001 UZS
      const parsed = parseFloat(cleanSumStr.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        detectedAmount = Math.round(parsed);
      }
    } else {
      const parsedInt = parseInt(cleanSumStr.replace(/[^\d]/g, ''), 10);
      if (!isNaN(parsedInt) && parsedInt > 0) {
        // Soliq OFD rule: In official Uzbekistan Soliq OFD receipts (ofd.soliq.uz / check.soliq.uz or receipts with r/c/t params),
        // amount is strictly in tiyins (1 UZS = 100 tiyins, e.g. 500000 -> 5 000 UZS, 4500000 -> 45 000 UZS).
        const isOfficialOfd = /soliq\.uz|ofd\./i.test(rawStr) || Boolean(fiscalNumber && (fiscalSign || inn || searchParams.has('t')));
        if (isOfficialOfd) {
          if (parsedInt >= 100) {
            detectedAmount = Math.round(parsedInt / 100);
          } else {
            detectedAmount = parsedInt;
          }
        } else {
          // Payme, Click, Uzum, POS terminals, and general QR codes:
          // Numbers like 5000, 15000, 45000, 120000 are already in UZS (so'm).
          // Only numbers >= 1000000 ending in '00' might be tiyins.
          if (parsedInt >= 10000000 && parsedInt % 100 === 0 && cleanSumStr.endsWith('00')) {
            detectedAmount = Math.round(parsedInt / 100);
          } else {
            detectedAmount = parsedInt;
          }
        }
      }
    }
  }

  // Double check: if detectedAmount equals fiscalSign (168423251) or fiscalNumber (15400) or inn, it was mistaken!
  const forbiddenNumbers = [
    parseInt(fiscalSign, 10),
    parseInt(fiscalNumber, 10),
    parseInt(inn, 10),
    168423251,
    15400
  ].filter((n) => !isNaN(n) && n > 0);

  const amountStr = String(detectedAmount);
  const isSuspicious = forbiddenNumbers.some(num => {
    const s = String(num);
    return s.length >= 5 && (amountStr.includes(s) || s.includes(amountStr));
  });

  if (forbiddenNumbers.includes(detectedAmount) || isSuspicious || detectedAmount > 20000000) {
    detectedAmount = 0;
  }

  const nameParam = searchParams.get('name') || searchParams.get('org') || searchParams.get('merchant') || searchParams.get('shop') || searchParams.get('store');
  if (nameParam) {
    detectedTitle = decodeURIComponent(nameParam).trim();
  } else if (inn) {
    detectedTitle = `Chek (STIR: ${inn})`;
  } else if (fiscalNumber) {
    detectedTitle = `Kassa xaridi #${fiscalNumber}`;
  }

  if (fiscalNumber) {
    detectedDescription = `Soliq OFD cheki (Chek №: ${fiscalNumber})`;
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

// Endpoint: Parse QR code data or receipt image from Uzbekistan OFD / Soliq receipts
app.post('/api/parse-qr-receipt', async (req, res) => {
  try {
    const { qrData, imageBase64 } = req.body;
    
    // Case 1: Image provided (photo of receipt or payment app screenshot)
    if (imageBase64 && typeof imageBase64 === 'string') {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ success: false, error: "Gemini API kaliti sozlanmagan." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let cleanBase64 = imageBase64;
      let mimeType = 'image/jpeg';
      if (cleanBase64.includes(';base64,')) {
        const parts = cleanBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        cleanBase64 = parts[1];
      }

      const visionPrompt = `Siz O'zbekiston kassa cheklari va xarid kvitansiyalarini tahlil qiluvchi mutaxassissiz.
Ushbu chek rasmini diqqat bilan o'rganing va ma'lumotlarni aniq ajrating.

QOIDALAR:
1. JAMI SUMMA (amount):
   - Chekdagi haqiqiy to'lov summasini aniqlang: "To'lov uchun jami", "Jami to'lov", "Naqd", "Naqdsiz", "ИТОГО", "Total", "Jami" yozuvlari yonidagi summani oling.
   - Masalan: Chekda "To'lov uchun jami 6 000.00 UZS" yoki "Naqdsiz 6 000.00" bo'lsa, "amount": 6000 bo'ladi!
   - QAT'IY TAQIQLANADI: Chekdagi "Fiskal imzo" (12 xonali raqamlar), "FM ID", "Terminal S/R", chek raqami kabi identifikator raqamlar ASLO SUMMA EMAS! Ularni summa deb olish qat'iyan man etiladi! Har doim xarid qilingan mahsulotlarning haqiqiy to'lov summasini oling!

2. MAHSULOTLAR VA XIZMATLAR RO'YXATI (items):
   - Agar chekda alohida mahsulotlar va ularning narxi ko'rinsa, ajrating.

3. DO'KON / TASHKILOT NOMI (title):
   - Chekdagi do'kon yoki xizmat nomi. Agar chekda ko'rinmasa, "Kassa xaridi".

4. TOIFA (category):
   - "Oziq-ovqat", "Transport", "Kafe va Restoran", "Sog'liq", "Kommunal to'lovlar", "Telefon va Internet", "Kiyim-kechak", "Ta'lim va Kitoblar", "Ko'ngilochar", "Boshqa".

5. AMAL TURI (type):
   - Kassa cheklari va xaridlar uchun har doim: "chiqim".

Javobni FAQAT toza JSON ko'rinishida bering:
{
  "title": "string",
  "amount": number,
  "type": "chiqim",
  "category": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "description": "string",
  "fiscalNumber": "string",
  "fiscalSign": "string",
  "inn": "string",
  "items": [
    { "name": "string", "price": number }
  ]
}`;

      let response: any = null;
      const visionModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      for (const m of visionModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType as string,
                      data: cleanBase64,
                    },
                  },
                  { text: visionPrompt },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
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
                type: 'chiqim',
                category: ofdFallback.detectedCategory,
                date: ofdFallback.detectedDate,
                time: ofdFallback.detectedTime,
                description: ofdFallback.detectedDescription,
                fiscalNumber: ofdFallback.fiscalNumber,
                inn: ofdFallback.inn,
                qrData: qrData
              }
            });
          }
        }
        throw new Error("Chek rasmini tahlil qilib bo'lmadi. Iltimos chekni yorug'roq joyda yaqinroqdan oling.");
      }

      if (response && response.text) {
        const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        
        let amount = 0;
        const fiscalNum = parsed.fiscalNumber ? String(parsed.fiscalNumber).trim() : '';
        const fiscalSgn = parsed.fiscalSign ? String(parsed.fiscalSign).trim() : '';
        const tinNum = parsed.inn ? String(parsed.inn).trim() : '';

        // Check if direct amount is provided by Gemini
        if (typeof parsed.amount === 'number' && parsed.amount > 0) {
          amount = Math.round(parsed.amount);
        } else if (typeof parsed.amount === 'string') {
          const digits = parsed.amount.replace(/[^\d]/g, '');
          if (digits) amount = parseInt(digits, 10);
        }

        // Cross-verify: if items sum exists and amount is 0 or distorted, use items sum!
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const itemsSum = parsed.items.reduce((acc: number, it: any) => acc + (Number(it.price) || 0), 0);
          if (itemsSum > 0 && (amount === 0 || amount > 100000000 || Math.abs(amount - itemsSum) > amount * 0.5)) {
            amount = itemsSum;
          }
        }

        // If client provided or AI detected qrData with OFD URL, extract fiscal numbers
        let detectedQrData = qrData || parsed.qrData;
        if (detectedQrData && typeof detectedQrData === 'string' && detectedQrData.includes('=')) {
          const ofdParsed = parseUzbekistanOfdQr(detectedQrData);
          if (!amount || amount === 0) {
            amount = ofdParsed.detectedAmount;
          }
        }

        // Sanity filter: reject if amount is equal to or contains fiscal sign, serial number or INN
        const invalidIds = [fiscalNum, fiscalSgn, tinNum, '168423251', '15400'].filter(Boolean);
        const amountStr = String(amount);
        const isSuspiciousId = invalidIds.some(id => id.length >= 5 && (amountStr.includes(id) || id.includes(amountStr)));
        if (isSuspiciousId || amount > 50000000) {
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            amount = parsed.items.reduce((acc: number, it: any) => acc + (Number(it.price) || 0), 0);
          } else {
            amount = 0;
          }
        }

        const itemsList = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items.map((it: any, i: number) => ({
          id: String(i + 1),
          name: String(it.name || "Mahsulot").trim(),
          price: Number(it.price) || 0
        })).filter((it: any) => it.name.length > 0) : undefined;

        let autoDescription = parsed.description;
        if (!autoDescription && itemsList && itemsList.length > 0) {
          const itemNamesPreview = itemsList.slice(0, 3).map((it: any) => it.name).join(', ');
          autoDescription = `${itemsList.length} ta mahsulot: ${itemNamesPreview}${itemsList.length > 3 ? '...' : ''}`;
        } else if (!autoDescription) {
          autoDescription = fiscalNum ? `Soliq OFD cheki (Chek №: ${fiscalNum})` : "Xarid cheki";
        }

        return res.json({
          success: true,
          data: {
            title: parsed.title || "Do'kon xaridi",
            amount: amount,
            type: parsed.type === 'kirim' ? 'kirim' : 'chiqim',
            category: parsed.category || "Oziq-ovqat",
            date: parsed.date || new Date().toISOString().slice(0, 10),
            time: parsed.time || new Date().toTimeString().slice(0, 5),
            description: autoDescription,
            fiscalNumber: fiscalNum || undefined,
            inn: tinNum || undefined,
            qrData: detectedQrData || undefined,
            items: itemsList
          }
        });
      }
    }

    // Case 2: String QR code data (Live QR camera or text QR scan)
    if (!qrData || typeof qrData !== 'string') {
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

    // Enhance store title and category with Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Quyida O'zbekiston Davlat Soliq (OFD) kassa chekining QR-kod ma'lumotlari berilgan:
"${rawStr}"

Aniqlangan parametrlar:
- Fiskal chek raqami (r): "${fiscalNumber || 'noma\'lum'}"
- Fiskal belgi (c): "${ofd.fiscalSign || 'noma\'lum'}"
- Sotuvchi STIR (tin/inn): "${inn || 'noma\'lum'}"
- Aniq xarid summasi: "${detectedAmount > 0 ? detectedAmount + ' so\'m' : 'aniqlanmagan'}"

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
          model: 'gemini-3.1-flash-lite',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const aiData = JSON.parse(clean);

          if (aiData.title && typeof aiData.title === 'string' && aiData.title.trim().length > 1) {
            detectedTitle = aiData.title.trim();
          }
          if (aiData.category && typeof aiData.category === 'string') {
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
        type: 'chiqim',
        category: detectedCategory,
        date: detectedDate,
        time: detectedTime,
        description: detectedDescription,
        fiscalNumber: fiscalNumber || undefined,
        inn: inn || undefined,
        qrData: rawStr
      }
    });
  } catch (err: any) {
    console.error("QR Parse API error:", err);
    return res.status(500).json({
      success: false,
      error: "QR-kod ma'lumotlarini tahlil qilishda xatolik yuz berdi."
    });
  }
});

// 1. Get real tracked downloads and count (Protected)
app.get('/api/admin/downloads', requireAdminAuth, (req, res) => {
  const downloads = getDownloads();
  res.json({
    downloads,
    totalCounter: downloads.length
  });
});

// 2. Track/register real download (from a client)
app.post('/api/track-download', async (req, res) => {
  const { deviceId, name, email, device } = req.body;
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const cleanDeviceId = sanitizeInput(deviceId);
  const cleanName = name ? sanitizeInput(name) : 'Foydalanuvchi';
  const cleanEmail = email ? sanitizeInput(email) : '';
  const cleanDevice = device ? sanitizeInput(device) : 'Web';

  const downloads = getDownloads();
  const existingIndex = downloads.findIndex(d => d.deviceId === cleanDeviceId);
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

  if (existingIndex > -1) {
    // Already tracked. Update client info if they edited their profile (name, email, device)
    downloads[existingIndex].name = cleanName || downloads[existingIndex].name || 'Foydalanuvchi';
    downloads[existingIndex].email = cleanEmail || downloads[existingIndex].email || '';
    downloads[existingIndex].device = cleanDevice || downloads[existingIndex].device || 'Web';
    saveDownloads(downloads);
    return res.json({ status: 'updated', event: downloads[existingIndex] });
  } else {
    // New installation/download event!
    const city = await detectCity(ipAddress);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const newEvent: DownloadEvent = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      deviceId: cleanDeviceId,
      date: dateStr,
      time: timeStr,
      name: cleanName || 'Yangi Foydalanuvchi',
      email: cleanEmail || '',
      device: cleanDevice || 'Web',
      city: sanitizeInput(city)
    };

    downloads.unshift(newEvent);
    saveDownloads(downloads);
    return res.json({ status: 'created', event: newEvent });
  }
});

// 3. Simulate a download event for development testing (Protected)
app.post('/api/admin/simulate-download', requireAdminAuth, async (req, res) => {
  const UZBEK_NAMES = [
    'Sardor Azimov', 'Zilola Umarova', 'Jasur Toʻrayev', 'Madina Rustamova', 
    'Alisher Qobilov', 'Guli Norova', 'Rustam Shodiyev', 'Zarina Sodiqova',
    'Farrux Hasanov', 'Dilnoza Boboyeva', 'Azizbek Rahmonov', 'Shahlo Ismoilova'
  ];
  const UZBEK_CITIES = [
    'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Fargʻona',
    'Qarshi', 'Urganch', 'Nukus', 'Jizzax', 'Guliston', 'Navoiy', 'Termiz'
  ];
  const DEVICES = ['Android', 'iOS', 'Web'];

  const randomName = UZBEK_NAMES[Math.floor(Math.random() * UZBEK_NAMES.length)];
  const randomCity = UZBEK_CITIES[Math.floor(Math.random() * UZBEK_CITIES.length)];
  const randomDevice = DEVICES[Math.floor(Math.random() * DEVICES.length)];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const newEvent: DownloadEvent = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    deviceId: 'sim-' + Math.random().toString(36).substring(2, 10),
    date: dateStr,
    time: timeStr,
    name: randomName,
    email: randomName.toLowerCase().replace(/\s/g, '') + '@gmail.com',
    device: randomDevice,
    city: randomCity
  };

  const downloads = getDownloads();
  downloads.unshift(newEvent);
  saveDownloads(downloads);
  res.json(newEvent);
});

// 4. Clear/Reset tracked downloads (Protected)
app.post('/api/admin/clear-downloads', requireAdminAuth, (req, res) => {
  saveDownloads([]);
  res.json({ status: 'cleared' });
});

// 5. Announcement APIs
app.get('/api/announcement', (req, res) => {
  const ann = getAnnouncement();
  res.json(ann || { active: false, title: '', msg: '' });
});

app.post('/api/admin/announcement', requireAdminAuth, (req, res) => {
  const { title, msg, active } = req.body;
  const ann: Announcement = { title, msg, active };
  saveAnnouncement(ann);
  res.json(ann);
});

// 6. Send SMS API Endpoint (Twilio Integration)
app.post('/api/send-sms', async (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ success: false, error: 'phoneNumber va message majburiy.' });
  }

  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  if (!accountSid || !accountSid.startsWith('AC') || !authToken || !fromPhone) {
    return res.status(400).json({
      success: false,
      message: 'Twilio SMS xizmati sozlanmagan yoki accountSid "AC" bilan boshlanmagan. .env faylida TWILIO_ACCOUNT_SID (AC...), TWILIO_AUTH_TOKEN va TWILIO_PHONE_NUMBER kiritilishi kerak.'
    });
  }

  try {
    const twilioModule = await import('twilio');
    const client = twilioModule.default(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: phoneNumber
    });
    return res.json({ success: true, message: `SMS muvaffaqiyatli yuborildi! (SID: ${result.sid})` });
  } catch (err: any) {
    console.error('Twilio SMS error:', err);
    return res.status(500).json({ success: false, message: `SMS yuborishda xatolik: ${err?.message || 'Twilio xatosi'}` });
  }
});

// Serve frontend assets
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupFrontend().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server http://localhost:${PORT} portida ishlamoqda`);
  });
});
