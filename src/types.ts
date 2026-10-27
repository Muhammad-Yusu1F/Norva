/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'kirim' | 'chiqim'; // 'kirim' = income, 'chiqim' = expense

export type AccentTheme = 'blue' | 'pink' | 'emerald' | 'purple';

export interface AccentThemeConfig {
  id: AccentTheme;
  name: string;
  emoji: string;
  colorHex: string;
  bgGradient: string;
  cardGradient: string;
  headerIconGradient: string;
  fabGradient: string;
  fabShadow: string;
  pillGradient: string;
  pillShadow: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
  ringColor: string;
  textAccent: string;
}

export const ACCENT_THEMES: Record<AccentTheme, AccentThemeConfig> = {
  blue: {
    id: 'blue',
    name: "Moviy Ko'k",
    emoji: '🔷',
    colorHex: '#2563eb',
    bgGradient: 'from-blue-600 via-blue-500 to-indigo-600',
    cardGradient: 'from-[#1d4ed8] via-[#2563eb] to-[#3b82f6]',
    headerIconGradient: 'from-[#38bdf8] to-[#0284c7] dark:from-[#0ea5e9] dark:to-[#0369a1]',
    fabGradient: 'from-blue-600 via-[#2563eb] to-blue-700 hover:from-blue-700 hover:to-blue-800',
    fabShadow: 'shadow-[0_8px_25px_rgba(37,99,235,0.5)]',
    pillGradient: 'from-blue-500 via-[#2563eb] to-blue-700',
    pillShadow: 'shadow-[0_4px_16px_rgba(37,99,235,0.45)]',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-600 dark:text-blue-400',
    activeBorder: 'border-blue-500',
    ringColor: 'ring-blue-500/40',
    textAccent: 'text-blue-600 dark:text-blue-400',
  },
  pink: {
    id: 'pink',
    name: 'Yoqimli Pushti',
    emoji: '🌸',
    colorHex: '#ec4899',
    bgGradient: 'from-pink-600 via-pink-500 to-rose-600',
    cardGradient: 'from-[#be185d] via-[#ec4899] to-[#f43f5e]',
    headerIconGradient: 'from-[#f472b6] to-[#db2777] dark:from-[#ec4899] dark:to-[#be185d]',
    fabGradient: 'from-pink-600 via-[#db2777] to-pink-700 hover:from-pink-700 hover:to-pink-800',
    fabShadow: 'shadow-[0_8px_25px_rgba(236,72,153,0.5)]',
    pillGradient: 'from-pink-500 via-[#db2777] to-pink-700',
    pillShadow: 'shadow-[0_4px_16px_rgba(219,39,119,0.45)]',
    badgeBg: 'bg-pink-500/10 dark:bg-pink-500/20',
    badgeText: 'text-pink-600 dark:text-pink-400',
    activeBorder: 'border-pink-500',
    ringColor: 'ring-pink-500/40',
    textAccent: 'text-pink-600 dark:text-pink-400',
  },
  emerald: {
    id: 'emerald',
    name: 'Yashil Zumrad',
    emoji: '🍃',
    colorHex: '#10b981',
    bgGradient: 'from-emerald-600 via-emerald-500 to-teal-600',
    cardGradient: 'from-[#047857] via-[#10b981] to-[#059669]',
    headerIconGradient: 'from-[#34d399] to-[#059669] dark:from-[#10b981] dark:to-[#047857]',
    fabGradient: 'from-emerald-600 via-[#059669] to-emerald-700 hover:from-emerald-700 hover:to-emerald-800',
    fabShadow: 'shadow-[0_8px_25px_rgba(16,185,129,0.5)]',
    pillGradient: 'from-emerald-500 via-[#059669] to-emerald-700',
    pillShadow: 'shadow-[0_4px_16px_rgba(5,150,105,0.45)]',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-500',
    ringColor: 'ring-emerald-500/40',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    id: 'purple',
    name: 'Qirollik Siyohrang',
    emoji: '🔮',
    colorHex: '#8b5cf6',
    bgGradient: 'from-purple-600 via-purple-500 to-violet-600',
    cardGradient: 'from-[#6d28d9] via-[#8b5cf6] to-[#7c3aed]',
    headerIconGradient: 'from-[#a78bfa] to-[#7c3aed] dark:from-[#8b5cf6] dark:to-[#6d28d9]',
    fabGradient: 'from-purple-600 via-[#7c3aed] to-purple-700 hover:from-purple-700 hover:to-purple-800',
    fabShadow: 'shadow-[0_8px_25px_rgba(139,92,246,0.5)]',
    pillGradient: 'from-purple-500 via-[#7c3aed] to-purple-700',
    pillShadow: 'shadow-[0_4px_16px_rgba(124,58,237,0.45)]',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-600 dark:text-purple-400',
    activeBorder: 'border-purple-500',
    ringColor: 'ring-purple-500/40',
    textAccent: 'text-purple-600 dark:text-purple-400',
  }
};

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string; // e.g. 'Oziq-ovqat', 'Ijara', 'Transport', etc.
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  description?: string;
  items?: { id: string; name: string; price: number }[];
  receiptImage?: string; // base64 data URL for attached receipt photo
  qrData?: string; // Scanned Soliq OFD / QR receipt URL or code
  fiscalNumber?: string; // Soliq OFD Fiscal receipt number (e.g. 168423251)
  inn?: string; // Seller STIR / TIN
}

export interface Category {
  id: string;
  name: string;
  iconName: string; // Name of Lucide icon
  color: string; // Tailwind hex color or class
  percentage?: number;
}

export interface BudgetLimit {
  category: string;
  limit: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  currency: string; // e.g., '$' or 'UZS'
  monthlyBudget?: number;
  notificationsEnabled?: boolean;
  notificationTime?: string; // HH:MM format, e.g., '20:00'
  phoneNumber?: string; // User's phone number for SMS notifications, e.g., '+998901234567'
  accentTheme?: AccentTheme; // Custom accent theme: 'blue' | 'pink' | 'emerald' | 'purple'
}
