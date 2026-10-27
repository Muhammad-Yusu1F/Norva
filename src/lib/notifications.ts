/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Transaction } from '../types';
import { formatAmount } from './format';

// Helper to check if running in a native/Capacitor environment
export const isNativePlatform = (): boolean => {
  return (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
};

export interface DailySummaryData {
  startingBalance: number;
  totalSpent: number;
  remainingBalance: number;
  currency: string;
}

// Calculate financial figures for today
export const getTodaySummary = (transactions: Transaction[], currentBalance: number, currency: string): DailySummaryData => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Sum today's transactions
  let todayIncome = 0;
  let todayExpense = 0;

  transactions.forEach(t => {
    if (t.date === todayStr) {
      if (t.type === 'kirim') {
        todayIncome += t.amount;
      } else if (t.type === 'chiqim') {
        todayExpense += t.amount;
      }
    }
  });

  const remainingBalance = currentBalance;
  // Starting balance of today before today's transactions happened
  const startingBalance = remainingBalance - todayIncome + todayExpense;

  return {
    startingBalance,
    totalSpent: todayExpense,
    remainingBalance,
    currency
  };
};

// Generate a beautifully formatted 24-hour summary SMS / notification message in Uzbek
export const generateSMSMessage = (summary: DailySummaryData, transactions: Transaction[]): string => {
  const todayStr = new Date().toISOString().split('T')[0];
  let todayIncome = 0;
  let todayExpense = 0;

  transactions.forEach(t => {
    if (t.date === todayStr) {
      if (t.type === 'kirim') todayIncome += t.amount;
      if (t.type === 'chiqim') todayExpense += t.amount;
    }
  });

  const incomeStr = formatAmount(todayIncome, summary.currency);
  const expenseStr = formatAmount(todayExpense, summary.currency);
  const remainingStr = formatAmount(summary.remainingBalance, summary.currency);

  if (todayIncome === 0 && todayExpense === 0) {
    return `NORVA: Bugun kirim va chiqim kiritilmadi. 💰 Joriy balans: ${remainingStr}. Baraka toping!`;
  }

  return `NORVA Bugungi Hisobot (24 soatlik): 📥 Kirim: +${incomeStr} UZS, 📤 Chiqim: -${expenseStr} UZS. 💰 Joriy balans: ${remainingStr}.`;
};

// Request permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (e) {
      console.error('Error requesting Capacitor local notification permission', e);
      return false;
    }
  } else {
    // Web notifications fallback
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return true;
  }
};

// Schedule recurring daily notification at a specific hour and minute
export const scheduleDailyReminder = async (
  timeStr: string, // e.g. "20:00"
  enabled: boolean,
  transactions: Transaction[],
  currentBalance: number,
  currency: string
): Promise<void> => {
  // If not enabled or native platform check, cancel any pending reminders
  if (isNativePlatform()) {
    try {
      // Always cancel previous notifications before rescheduling
      await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
      
      if (!enabled) return;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr || '20', 10);
      const minute = parseInt(minuteStr || '00', 10);

      const summary = getTodaySummary(transactions, currentBalance, currency);
      const bodyText = generateSMSMessage(summary, transactions);

      // Request permission
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '💬 NORVA SMS-Xabarnoma',
            body: bodyText,
            id: 101,
            schedule: {
              on: {
                hour,
                minute,
              },
              allowWhileIdle: true,
              repeats: true,
            },
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: null,
          }
        ]
      });
      console.log(`Capacitor Local Notification successfully scheduled daily at ${timeStr}`);
    } catch (e) {
      console.error('Failed to schedule local notification', e);
    }
  } else {
    console.log(`Web mode: Daily reminder would schedule at ${timeStr}. Status: ${enabled ? 'Yoqilgan' : 'O\'chirilgan'}`);
  }
};

// Send real SMS through our full-stack server endpoint /api/send-sms
export const sendRealSMS = async (phoneNumber: string, message: string): Promise<{ success: boolean; msg: string }> => {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, message }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, msg: data.message || 'SMS muvaffaqiyatli yuborildi.' };
    } else {
      return { 
        success: false, 
        msg: data.message || data.error || 'SMS yuborish imkoni bo\'lmadi.' 
      };
    }
  } catch (error: any) {
    console.error('Real SMS sending network error:', error);
    return { 
      success: false, 
      msg: 'SMS xizmatiga ulanib bo\'lmadi.' 
    };
  }
};

// Auto SMS handler triggered whenever a user adds or edits a Kirim/Chiqim transaction
export const sendTransactionAutoSMS = async (
  transaction: { title: string; amount: number; type: 'kirim' | 'chiqim'; category: string },
  newBalance: number,
  currency: string,
  phoneNumber?: string,
  onShowInWebToast?: (msg: string) => void
): Promise<void> => {
  const amountStr = formatAmount(transaction.amount, currency);
  const balanceStr = formatAmount(newBalance, currency);
  const typeText = transaction.type === 'kirim' ? 'Kirim 📥' : 'Chiqim 📤';
  const prefix = transaction.type === 'kirim' ? '+' : '-';

  const smsText = `NORVA: ${prefix}${amountStr} ${typeText} [${transaction.category} - ${transaction.title}]. Joriy balans: ${balanceStr}.`;

  const cleanPhone = phoneNumber ? phoneNumber.trim() : '';
  const formattedPhone = cleanPhone ? (cleanPhone.startsWith('+') ? cleanPhone : `+998${cleanPhone.replace(/\D/g, '')}`) : '';

  if (formattedPhone) {
    const res = await sendRealSMS(formattedPhone, smsText);
    if (res.success) {
      onShowInWebToast?.(`📲 SMS yuborildi (${formattedPhone}): ${smsText}`);
      return;
    }
  }

  // Native notification or web toast notification
  if (isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '💬 NORVA Avto SMS',
            body: smsText,
            id: Math.floor(Math.random() * 100000),
            sound: 'default'
          }
        ]
      });
    } catch (e) {
      console.error('Failed to trigger native notification', e);
    }
  }

  // Display notification toast on screen automatically
  onShowInWebToast?.(`📲 Avto SMS: ${smsText}`);
};

// Instantly fire a notification (for testing & instant visual feedback)
export const triggerInstantNotification = async (
  transactions: Transaction[],
  currentBalance: number,
  currency: string,
  onShowInWebToast: (msg: string) => void,
  phoneNumber?: string
): Promise<void> => {
  const summary = getTodaySummary(transactions, currentBalance, currency);
  const bodyText = generateSMSMessage(summary, transactions);

  // If a phone number is provided, try sending a real SMS through our server api
  if (phoneNumber && phoneNumber.trim()) {
    onShowInWebToast(`SMS yuborilmoqda: ${phoneNumber}...`);
    const smsResult = await sendRealSMS(phoneNumber, bodyText);
    
    if (smsResult.success) {
      onShowInWebToast(`📲 ${smsResult.msg}`);
      return;
    } else {
      // Show clean simulated SMS report toast without raw error messages
      onShowInWebToast(`📱 SMS Simulyatsiyasi (${phoneNumber}):\n${bodyText}`);
      return;
    }
  }

  if (isNativePlatform()) {
    try {
      await requestNotificationPermission();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '💬 NORVA SMS-Xabarnoma',
            body: bodyText,
            id: Math.floor(Math.random() * 100000),
            sound: 'default'
          }
        ]
      });
    } catch (e) {
      console.error('Failed to trigger native notification', e);
      onShowInWebToast(bodyText);
    }
  } else {
    // Try browser Notifications API with permission request and ServiceWorker support for phones
    if ('Notification' in window) {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }

        if (perm === 'granted') {
          // Vibration feedback on supported mobile devices
          if ('vibrate' in navigator) {
            try { navigator.vibrate([200, 100, 200]); } catch {}
          }

          // Try Service Worker showNotification first (best for Android/PWA mobile)
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification('💬 NORVA SMS-Xabarnoma', {
                body: bodyText,
                badge: '/icon.png',
                vibrate: [200, 100, 200],
                tag: 'daily-summary',
              } as any);
            } else {
              new Notification('💬 NORVA SMS-Xabarnoma', { body: bodyText });
            }
          } else {
            new Notification('💬 NORVA SMS-Xabarnoma', { body: bodyText });
          }
        }
      } catch (err) {
        console.warn('Browser Notification error:', err);
      }
    }
    // Also show our beautiful custom web in-app toast
    onShowInWebToast(bodyText);
  }
};
