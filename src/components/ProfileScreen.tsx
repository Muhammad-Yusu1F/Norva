/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { UserProfile, Transaction, AccentTheme, ACCENT_THEMES } from '../types';
import { 
  User, 
  Mail, 
  DollarSign, 
  Wallet, 
  Trash2, 
  Download, 
  Upload, 
  Check, 
  Sparkles,
  Camera,
  Image as ImageIcon,
  Bell,
  BellOff,
  MessageSquare,
  Clock,
  Send,
  LogOut,
  ShieldCheck,
  CloudCheck,
  Smartphone,
  FileText,
  Palette,
  Heart,
  Leaf,
  Crown,
  Eye,
  Share2,
  X,
  Loader2
} from 'lucide-react';
import { 
  triggerInstantNotification, 
  scheduleDailyReminder, 
  isNativePlatform,
  getTodaySummary,
  generateSMSMessage
} from '../lib/notifications';
import { exportPDFReport, PDFExportResult } from '../lib/pdfExporter';

const PRESET_AVATARS = [
  {
    name: 'Moviy',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563eb"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="40" r="18" fill="white" fill-opacity="0.9"/><path d="M20,85 C20,68 35,62 50,62 C65,62 80,68 80,85 Z" fill="white" fill-opacity="0.9"/></svg>'
  },
  {
    name: 'Zumrad',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%2314b8a6"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="40" r="18" fill="white" fill-opacity="0.9"/><path d="M20,85 C20,68 35,62 50,62 C65,62 80,68 80,85 Z" fill="white" fill-opacity="0.9"/></svg>'
  },
  {
    name: 'Siyohrang',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237c3aed"/><stop offset="100%" stop-color="%23f43f5e"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="40" r="18" fill="white" fill-opacity="0.9"/><path d="M20,85 C20,68 35,62 50,62 C65,62 80,68 80,85 Z" fill="white" fill-opacity="0.9"/></svg>'
  },
  {
    name: 'Oltin',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23d97706"/><stop offset="100%" stop-color="%23f97316"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="40" r="18" fill="white" fill-opacity="0.9"/><path d="M20,85 C20,68 35,62 50,62 C65,62 80,68 80,85 Z" fill="white" fill-opacity="0.9"/></svg>'
  },
  {
    name: 'Tungi',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23374151"/><stop offset="100%" stop-color="%23111827"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="40" r="18" fill="white" fill-opacity="0.9"/><path d="M20,85 C20,68 35,62 50,62 C65,62 80,68 80,85 Z" fill="white" fill-opacity="0.9"/></svg>'
  }
];

const resizeAndConvertImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        reject(new Error("Rasm yuklashda xatolik yuz berdi. Iltimos, boshqa rasm tanlang."));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Faylni oʻqishda xatolik yuz berdi."));
    };
    reader.readAsDataURL(file);
  });
};

export const formatUzbekPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let localDigits = digits;
  if (digits.startsWith('998')) {
    localDigits = digits.substring(3);
  }
  const truncated = localDigits.slice(0, 9);
  
  let formatted = '';
  if (truncated.length > 0) {
    formatted += truncated.slice(0, 2);
  }
  if (truncated.length > 2) {
    formatted += ' ' + truncated.slice(2, 5);
  }
  if (truncated.length > 5) {
    formatted += ' ' + truncated.slice(5, 7);
  }
  if (truncated.length > 7) {
    formatted += ' ' + truncated.slice(7, 9);
  }
  return formatted;
};

interface ProfileScreenProps {
  profile: UserProfile;
  baseBalance: number;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateBaseBalance: (balance: number) => void;
  onResetData: () => void;
  onImportData: (transactionsJson: string, profileJson?: string) => boolean;
  transactionsJson: string; // For export
  transactions: Transaction[];
  currentBalance: number;
  onShowWebToast: (msg: string) => void;
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  baseBalance,
  onUpdateProfile,
  onUpdateBaseBalance,
  onResetData,
  onImportData,
  transactionsJson,
  transactions,
  currentBalance,
  onShowWebToast,
  onLogout
}) => {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [currency, setCurrency] = useState(profile.currency);
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthlyBudget?.toString() || '');
  const [balanceInput, setBalanceInput] = useState(baseBalance.toString());
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile.notificationsEnabled ?? true);
  const [notificationTime, setNotificationTime] = useState(profile.notificationTime || '20:00');
  const [selectedAccent, setSelectedAccent] = useState<AccentTheme>(profile.accentTheme || 'blue');

  // Parse initial local phone digits
  const getInitialPhoneDigits = (rawPhone?: string): string => {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      return formatUzbekPhone(digits.substring(3));
    }
    return formatUzbekPhone(digits);
  };

  const [phoneDigits, setPhoneDigits] = useState(getInitialPhoneDigits(profile.phoneNumber));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestNotification = async () => {
    const rawDigits = phoneDigits.replace(/\D/g, '');
    const formattedPhone = rawDigits.length === 9 ? `+998${rawDigits}` : (profile.phoneNumber || '');

    await triggerInstantNotification(
      transactions,
      currentBalance,
      currency || 'UZS',
      onShowWebToast,
      formattedPhone
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Iltimos, faqat rasm fayllarini yuklang.');
      return;
    }

    try {
      const resizedBase64 = await resizeAndConvertImage(file);
      setAvatarUrl(resizedBase64);
    } catch (err: any) {
      setUploadError(err.message || 'Rasm yuklashda xatolik.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError('');
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Iltimos, faqat rasm fayllarini yuklang.');
      return;
    }

    try {
      const resizedBase64 = await resizeAndConvertImage(file);
      setAvatarUrl(resizedBase64);
    } catch (err: any) {
      setUploadError(err.message || 'Rasm yuklashda xatolik.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const updatedProfile: UserProfile = {
      ...profile,
      name: name.trim() || 'Moliya Foydalanuvchisi',
      email: email.trim() || 'user@moliya.uz',
      avatarUrl: avatarUrl,
      currency: currency.trim() || 'UZS',
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
      notificationsEnabled,
      notificationTime,
      phoneNumber: phoneDigits.trim() ? `+998${phoneDigits.replace(/\s/g, '')}` : '',
      accentTheme: selectedAccent
    };

    const parsedBalance = parseFloat(balanceInput);
    if (!isNaN(parsedBalance)) {
      onUpdateBaseBalance(parsedBalance);
    }

    onUpdateProfile(updatedProfile);

    // Reschedule local reminder
    scheduleDailyReminder(
      notificationTime,
      notificationsEnabled,
      transactions,
      parsedBalance || baseBalance,
      currency.trim() || 'UZS'
    );

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const [pendingImportData, setPendingImportData] = useState<any | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfExportInfo, setPdfExportInfo] = useState<PDFExportResult | null>(null);

  const handleExport = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      let parsedTxs: Transaction[] = [];
      try {
        parsedTxs = JSON.parse(transactionsJson);
      } catch {
        parsedTxs = transactions;
      }

      const currentProfile: UserProfile = {
        ...profile,
        name,
        email,
        avatarUrl,
        currency,
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
        phoneNumber: phoneDigits.trim() ? `+998${phoneDigits.replace(/\s/g, '')}` : profile.phoneNumber
      };

      onShowWebToast?.("📄 PDF hisoboti shakllantirilmoqda...");
      const result = await exportPDFReport(parsedTxs, currentProfile, baseBalance);
      if (result) {
        setPdfExportInfo(result);
        onShowWebToast?.("✅ PDF hisoboti tayyor bo'ldi!");
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      onShowWebToast?.("❌ PDF hisobotini tayyorlashda xatolik yuz berdi");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          Array.isArray(parsed.transactions)
        ) {
          // Validate individual transaction entries
          const isValid = parsed.transactions.every(
            (t: any) =>
              t &&
              typeof t === 'object' &&
              t.id &&
              (t.type === 'kirim' || t.type === 'chiqim') &&
              !isNaN(Number(t.amount))
          );

          if (!isValid && parsed.transactions.length > 0) {
            setImportError('Faylda noto‘g‘ri tranzaksiya ma‘lumotlari mavjud.');
            return;
          }

          // Request user confirmation before applying import
          setPendingImportData(parsed);
        } else {
          setImportError('Mos keluvchi zaxira fayli emas (transactions massivi topilmadi).');
        }
      } catch (err) {
        setImportError('Faylni o‘qishda xatolik yuz berdi. Qayta JSON formatida tekshiring.');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImportData) return;
    try {
      const success = onImportData(
        JSON.stringify(pendingImportData.transactions),
        pendingImportData.profile ? JSON.stringify(pendingImportData.profile) : undefined
      );

      if (success) {
        if (pendingImportData.baseBalance !== undefined) {
          onUpdateBaseBalance(parseFloat(pendingImportData.baseBalance));
          setBalanceInput(pendingImportData.baseBalance.toString());
        }
        if (pendingImportData.profile) {
          setName(pendingImportData.profile.name || '');
          setEmail(pendingImportData.profile.email || '');
          setCurrency(pendingImportData.profile.currency || 'UZS');
          setMonthlyBudget(pendingImportData.profile.monthlyBudget?.toString() || '');
          if (pendingImportData.profile.avatarUrl) {
            setAvatarUrl(pendingImportData.profile.avatarUrl);
          }
        }
        setImportSuccess(true);
        setPendingImportData(null);
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
        setPendingImportData(null);
      }
    } catch (err) {
      setImportError('Import jarayonida kutilmagan xatolik yuz berdi.');
      setPendingImportData(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 px-1 animate-in fade-in-50 duration-300">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Profil va Sozlamalar
      </h2>

      {/* Compact Interactive Theme Selector Bar */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${ACCENT_THEMES[selectedAccent]?.badgeBg || 'bg-blue-500/10'} ${ACCENT_THEMES[selectedAccent]?.badgeText || 'text-blue-600'} flex items-center justify-center shrink-0 transition-colors duration-300`}>
              <Palette size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Ilova Mavzusi
              </h3>
            </div>
          </div>

          <motion.span 
            key={selectedAccent}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${ACCENT_THEMES[selectedAccent]?.badgeBg} ${ACCENT_THEMES[selectedAccent]?.badgeText} flex items-center gap-1 border border-current/20 shadow-2xs`}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: ACCENT_THEMES[selectedAccent]?.colorHex }} />
            {ACCENT_THEMES[selectedAccent]?.name}
          </motion.span>
        </div>

        {/* Horizontal Capsule Segment Controls */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100/70 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5 relative">
          {(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((themeKey) => {
            const themeConfig = ACCENT_THEMES[themeKey];
            const isSelected = selectedAccent === themeKey;

            const ThemeIcon = 
              themeKey === 'blue' ? Sparkles :
              themeKey === 'pink' ? Heart :
              themeKey === 'emerald' ? Leaf : Crown;

            return (
              <motion.button
                key={themeKey}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setSelectedAccent(themeKey);
                  const updated = { ...profile, accentTheme: themeKey };
                  onUpdateProfile(updated);
                  onShowWebToast?.(`🎨 Mavzu "${themeConfig.name}" sozladi!`);
                }}
                className={`relative py-1.5 px-1 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                  isSelected
                    ? 'text-gray-900 dark:text-white font-extrabold shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {/* Active Sliding Background Pill */}
                {isSelected && (
                  <motion.div
                    layoutId="activeThemePill"
                    className="absolute inset-0 bg-white dark:bg-white/15 rounded-lg border border-gray-200/80 dark:border-white/15 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}

                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 relative z-10 shadow-2xs transition-transform duration-200"
                  style={{ backgroundColor: themeConfig.colorHex }}
                >
                  <ThemeIcon size={9} />
                </div>

                <span className="text-[11px] relative z-10 truncate">
                  {themeKey === 'blue' ? "Ko'k" : themeKey === 'pink' ? 'Pushti' : themeKey === 'emerald' ? 'Zumrad' : 'Siyohrang'}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Profile Card Summary & Avatar Customizer */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar Edit Zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group w-24 h-24 rounded-full overflow-hidden shrink-0 border-4 ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : 'border-primary/20 dark:border-white/10'
            } shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95`}
            title="Kompyuter yoki telefondan rasm yuklash uchun bosing yoki rasmni shu yerga tashlang"
          >
            <img 
              src={avatarUrl} 
              alt={name} 
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <Camera size={20} className="mb-0.5 animate-bounce" />
              <span className="text-[10px] font-bold text-center px-1">Yuklash</span>
            </div>
            {/* Dragging Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center text-white">
                <Upload size={24} className="animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              {name || 'Moliya Foydalanuvchisi'}
              <Sparkles size={16} className="text-primary dark:text-primary-fixed-dim animate-pulse shrink-0" />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
              {email || 'user@moliya.uz'}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary dark:text-primary-fixed-dim hover:bg-primary/20 transition-all text-xs font-bold cursor-pointer"
              >
                <ImageIcon size={13} />
                Galereyadan rasm yuklash
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl text-xs font-semibold border border-rose-100 dark:border-rose-950/30">
            {uploadError}
          </div>
        )}

        {/* Predefined Avatar presets list */}
        <div className="pt-3.5 border-t border-gray-100 dark:border-white/5">
          <span className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
            Yoki tayyor dizaynlardan birini tanlang:
          </span>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_AVATARS.map((preset, idx) => {
              const isSelected = avatarUrl === preset.url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset.url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 active:scale-90 hover:scale-105 shrink-0 cursor-pointer ${
                    isSelected 
                      ? 'border-primary ring-2 ring-primary/30 scale-105' 
                      : 'border-transparent opacity-85 hover:opacity-100'
                  }`}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Form Settings */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Asosiy sozlamalar
          </h4>

          {/* Save Status Notification */}
          {saveSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold border border-emerald-100 dark:border-emerald-950 flex items-center gap-2">
              <Check size={14} />
              <span>Sozlamalar muvaffaqiyatli saqlandi!</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Ism-sharif
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Foydalanuvchi nomi"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Elektron pochta
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="misol@moliya.uz"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Valyuta belgisi
            </label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                maxLength={5}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="$, UZS, €, vb."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary font-tabular"
              />
            </div>
          </div>

          {/* Monthly Budget ceiling */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Oylik limit ({currency})
            </label>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="Masalan: 1500"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary font-tabular"
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              Oylik umumiy xarajatlaringiz uchun ogohlantirish chegarasi
            </p>
          </div>

          {/* Phone Number for SMS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Telefon raqami (SMS xabarnoma uchun)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-gray-500 dark:text-gray-400 select-none">
                +998
              </span>
              <input
                type="tel"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(formatUzbekPhone(e.target.value))}
                placeholder="90 123 45 67"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-14 pr-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-primary font-tabular"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/10 transition-all cursor-pointer active:scale-95 duration-100"
          >
            Sozlamalarni saqlash
          </button>
        </form>
      </div>

      {/* Clean & Theme-Responsive Automatic SMS Notification Card */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <MessageSquare size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Avtomatik SMS Xabarnoma</span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                  notificationsEnabled 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30' 
                    : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400 border-gray-200 dark:border-white/10'
                }`}>
                  {notificationsEnabled ? 'Yoqilgan' : 'Oʻchirilgan'}
                </span>
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                Kirim va Chiqimlar haqida telefoningizga avto SMS xabarlar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 cursor-pointer ${
              notificationsEnabled ? 'bg-emerald-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
          </button>
        </div>

        {/* Schedule & Phone info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5 whitespace-nowrap">
              <Clock size={12} className="text-indigo-500 shrink-0" />
              <span>Kunlik hisobot vaqti</span>
            </label>
            <input
              type="time"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-tabular transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5 whitespace-nowrap">
              <Smartphone size={12} className="text-emerald-500 shrink-0" />
              <span>SMS kelish raqami</span>
            </label>
            <div className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-tabular truncate">
              {phoneDigits ? `+998 ${phoneDigits}` : 'Telefon kiritilmagan'}
            </div>
          </div>
        </div>

        {/* Clean explanatory message */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3 space-y-2 text-xs text-gray-700 dark:text-indigo-200">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">📱</span>
            <p className="leading-relaxed text-[11px] text-gray-600 dark:text-indigo-200">
              <strong className="text-gray-900 dark:text-white font-bold">24 Soatlik Jamlangan Hisobot SMS:</strong> Kirim va chiqimlar kiritilganda darhol SMS bormaydi. Belgilangan vaqtingizda (masalan soat {notificationTime} da) 24 soat (kun) davomida kiritilgan barcha kirim va chiqimlaringiz jamlanib 1 ta umumiy SMS hisoboti ko‘rinishida yuboriladi.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Send size={14} />
            <span>Hozir SMS hisobotini sinab ko‘rish</span>
          </button>
        </div>
      </div>

      {/* Backup and diagnostic tools */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Zaxiralash va texnik xizmat
        </h4>

        {/* Pending Import Confirmation Dialog */}
        {pendingImportData && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-extrabold text-sm text-gray-900 dark:text-white">Zaxirani tiklashni tasdiqlaysizmi?</p>
                <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  Ushbu fayl <b>{pendingImportData.transactions?.length || 0} ta</b> tranzaksiyani o‘z ichiga oladi. Tiklash amalga oshirilsa, joriy ma'lumotlaringiz ushbu zaxira bilan almashtiriladi.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={confirmImport}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                Ha, zaxirani tiklash
              </button>
              <button
                type="button"
                onClick={() => setPendingImportData(null)}
                className="flex-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {/* Import Messages */}
        {importError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-semibold border border-rose-100 dark:border-rose-950">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold border border-emerald-100 dark:border-emerald-950">
            Zaxira muvaffaqiyatli tiklandi! Sahifa yangilanmoqda...
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExportingPdf}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-indigo-50/50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 gap-1.5 transition-all text-xs cursor-pointer active:scale-95 duration-100 group disabled:opacity-60"
          >
            {isExportingPdf ? (
              <Loader2 size={20} className="text-[#2116d0] dark:text-indigo-400 animate-spin" />
            ) : (
              <FileText size={20} className="text-[#2116d0] dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-bold">{isExportingPdf ? "Tayyorlanmoqda..." : "Eksport qilish (PDF)"}</span>
            <span className="text-[10px] text-gray-400 font-medium">PDF fayliga yuklash</span>
          </button>

          {/* Import JSON file */}
          <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 gap-1.5 transition-all text-xs cursor-pointer active:scale-95 duration-100 relative">
            <Upload size={18} className="text-emerald-500" />
            <span className="font-bold">Import qilish</span>
            <span className="text-[10px] text-gray-400 font-medium">Zaxirani tiklash</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportFile} 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-100 py-3 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 duration-100 border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <LogOut size={16} className="text-rose-500" />
            <span>Hisobdan Chiqish (Logout)</span>
          </button>
        )}

        {/* Master reset database with custom inline confirm */}
        {showResetConfirm ? (
          <div className="bg-rose-50 dark:bg-rose-950/25 p-4 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-3.5 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5">
                <Trash2 size={14} className="animate-bounce" />
                Barcha ma'lumotlarni o'chirishni tasdiqlaysizmi?
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold leading-relaxed">
                Bu amal orqali barcha kirim-chiqimlar, tranzaksiyalar va profil sozlamalari butunlay o'chib ketadi. Ushbu amalni ortga qaytarib bo'lmaydi!
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  window.location.reload();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 duration-100 shadow-sm"
              >
                Ha, butunlay o'chirilsin
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 duration-100"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 border border-rose-200 hover:bg-rose-50 dark:border-rose-950/30 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 duration-100"
          >
            <Trash2 size={14} />
            <span>Barcha ma'lumotlarni tozalash</span>
          </button>
        )}
      </div>

      {/* In-App Full-Screen PDF Preview Modal */}
      {showPdfPreviewModal && pdfExportInfo && (
        <div className="fixed inset-0 z-[100000] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="bg-[#111827] text-white px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0 shadow-lg">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                <FileText size={18} />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold truncate">NORVA PDF Hisoboti</span>
                <span className="text-[10px] text-gray-400 truncate font-mono">{pdfExportInfo.filename}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {pdfExportInfo.canShare && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await pdfExportInfo.share();
                    if (ok) onShowWebToast?.("✅ Ulashildi!");
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ulashish"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Ulashish</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  pdfExportInfo.download();
                  onShowWebToast?.("📥 PDF telefon xotirasiga yuklanmoqda!");
                }}
                className="px-2.5 py-1.5 bg-[#2116d0] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Yuklab olish"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Yuklash</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Yopish"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* PDF Viewer Frame */}
          <div className="flex-1 w-full p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden bg-gray-900/40">
            <iframe
              src={pdfExportInfo.blobUrl}
              className="w-full h-full rounded-2xl bg-white shadow-2xl border border-white/10"
              title="PDF Ko'rish"
            />
          </div>

          {/* Mobile Fallback Bar */}
          <div className="bg-[#111827] px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-300">
            <span className="text-gray-400">Ko'rishda muammo bormi?</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  pdfExportInfo.download();
                  onShowWebToast?.("📥 Fayl yuklanmoqda!");
                }}
                className="text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Faylni yuklab olish
              </button>
              <span className="text-gray-600">•</span>
              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(false)}
                className="text-gray-400 font-medium hover:text-white cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Location Guide & Direct Actions Modal */}
      {pdfExportInfo && !showPdfPreviewModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col gap-4 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <FileText size={20} className="text-emerald-500" />
                </div>
                <span>PDF Hisobot Tayyor!</span>
              </div>
              <button 
                type="button"
                onClick={() => setPdfExportInfo(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Explanatory Info Card */}
            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl p-3.5 border border-indigo-100 dark:border-indigo-900/50 flex flex-col gap-2.5">
              <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <span>📱</span> Telefonda fayl qayerga tushdi?
              </h4>

              {/* Android Instructions */}
              <div className="text-[11px] text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <span>🤖</span> Android (Samsung, Redmi, Honor va b.):
                </p>
                <p className="pl-4 leading-relaxed">
                  <strong>"Mening fayllarim" (My Files / Файлы)</strong> ilovasiga kiring ➔ <strong>"Yuklamalar" (Downloads / Загрузки)</strong> papkasini oching. U yerda <code className="bg-white/80 dark:bg-black/40 px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-600 dark:text-indigo-300">{pdfExportInfo.filename}</code> nomli fayl saqlanadi!
                </p>
              </div>

              {/* iPhone Instructions */}
              <div className="text-[11px] text-gray-700 dark:text-gray-300 space-y-1 pt-1.5 border-t border-indigo-100/60 dark:border-indigo-900/40">
                <p className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <span>🍏</span> iPhone (iOS) telefonlarda:
                </p>
                <p className="pl-4 leading-relaxed">
                  <strong>"Файлы" (Files)</strong> ilovasini oching ➔ <strong>"Загрузки" (Downloads)</strong> papkasiga tushadi yoki pastki "Ulashish" tugmasi orqali to'g'ridan-to'g'ri Telegram, WhatsApp yoki Fayllarga saqlashingiz mumkin.
                </p>
              </div>
            </div>

            {/* Quick Actions (Mobile-Optimized) */}
            <div className="flex flex-col gap-2 pt-1">
              {/* 1. Direct Download */}
              <button
                type="button"
                onClick={() => {
                  pdfExportInfo.download();
                  onShowWebToast?.("📥 PDF telefon xotirasiga yuklanmoqda...");
                }}
                className="w-full py-3 bg-[#2116d0] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} />
                <span>Telefon Xotirasiga Yuklab Olish</span>
              </button>

              {/* 2. In-App Preview */}
              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(true)}
                className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[#2116d0] dark:text-indigo-300 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-200/50 dark:border-indigo-800/40"
              >
                <Eye size={16} />
                <span>PDF Faylini Ilovada Ko'rish</span>
              </button>

              {/* 3. Native Share */}
              {pdfExportInfo.canShare && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await pdfExportInfo.share();
                    if (ok) onShowWebToast?.("✅ PDF muvaffaqiyatli ulashildi!");
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 size={16} />
                  <span>Telegram / WhatsApp / Fayllarga saqlash</span>
                </button>
              )}

              {/* 4. Close */}
              <button
                type="button"
                onClick={() => setPdfExportInfo(null)}
                className="w-full py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center mt-1"
              >
                Tushundim (Yopish)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
