/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Transaction, UserProfile } from '../types';

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_PROFILE: UserProfile = {
  name: 'Mehmon',
  email: '',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  currency: 'UZS',
  monthlyBudget: 0
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'moliya_transactions',
  PROFILE: 'moliya_profile',
  THEME: 'moliya_theme',
  BASE_BALANCE: 'moliya_base_balance'
};

// Error callback for UI notifications
type ErrorHandler = (errorMsg: string) => void;
let onErrorCallback: ErrorHandler | null = null;

export const setStorageErrorCallback = (cb: ErrorHandler | null) => {
  onErrorCallback = cb;
};

const notifyError = (msg: string) => {
  console.warn('[Firestore Sync Warning]', msg);
};

const getUserKey = (baseKey: string, uid?: string): string => {
  const activeUid = uid || auth.currentUser?.uid;
  return activeUid ? `${baseKey}_${activeUid}` : baseKey;
};

// LocalStorage helpers (synchronous & offline-first)
export const getTransactions = (uid?: string): Transaction[] => {
  try {
    const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, uid);
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading transactions from localStorage:', err);
    return INITIAL_TRANSACTIONS;
  }
};

export const saveTransactions = (txs: Transaction[], uid?: string): void => {
  const activeUid = uid || auth.currentUser?.uid;
  try {
    const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, activeUid);
    localStorage.setItem(key, JSON.stringify(txs));
  } catch (err) {
    console.error('Error saving transactions to localStorage:', err);
  }

  if (activeUid && auth.currentUser && auth.currentUser.uid === activeUid) {
    syncTransactionsToFirestore(activeUid, txs).catch((err: any) => {
      console.warn('Firestore saveTransactions warning:', err?.message || err);
    });
  }
};

export const getProfile = (uid?: string): UserProfile => {
  try {
    const key = getUserKey(STORAGE_KEYS.PROFILE, uid);
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(INITIAL_PROFILE));
      return INITIAL_PROFILE;
    }
    const parsed = JSON.parse(data);
    if (parsed.currency === '$' || !parsed.currency) {
      parsed.currency = 'UZS';
      localStorage.setItem(key, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.error('Error reading profile from localStorage:', err);
    return INITIAL_PROFILE;
  }
};

export const saveProfile = (profile: UserProfile, uid?: string): void => {
  const activeUid = uid || auth.currentUser?.uid;
  try {
    const key = getUserKey(STORAGE_KEYS.PROFILE, activeUid);
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving profile to localStorage:', err);
  }

  if (activeUid && auth.currentUser && auth.currentUser.uid === activeUid) {
    syncProfileToFirestore(activeUid, profile).catch((err: any) => {
      console.warn('Firestore saveProfile warning:', err?.message || err);
    });
  }
};

export const getBaseBalance = (uid?: string): number => {
  try {
    const key = getUserKey(STORAGE_KEYS.BASE_BALANCE, uid);
    const data = localStorage.getItem(key);
    if (data === null) {
      localStorage.setItem(key, '0');
      return 0;
    }
    return parseFloat(data);
  } catch (err) {
    console.error('Error reading baseBalance from localStorage:', err);
    return 0;
  }
};

export const saveBaseBalance = (balance: number, uid?: string): void => {
  const activeUid = uid || auth.currentUser?.uid;
  try {
    const key = getUserKey(STORAGE_KEYS.BASE_BALANCE, activeUid);
    localStorage.setItem(key, balance.toString());
  } catch (err) {
    console.error('Error saving baseBalance to localStorage:', err);
  }

  if (activeUid && auth.currentUser && auth.currentUser.uid === activeUid) {
    syncBaseBalanceToFirestore(activeUid, balance).catch((err: any) => {
      console.warn('Firestore saveBaseBalance warning:', err?.message || err);
    });
  }
};

export const getTheme = (): 'light' | 'dark' => {
  const data = localStorage.getItem(STORAGE_KEYS.THEME);
  if (!data) {
    return 'dark';
  }
  return data as 'light' | 'dark';
};

export const saveTheme = (theme: 'light' | 'dark'): void => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

// Firestore Sync functions (Structure: users/{uid}/data/transactions, profile, baseBalance)
export const syncTransactionsToFirestore = async (uid: string, txs: Transaction[]): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  try {
    const ref = doc(db, 'users', uid, 'data', 'transactions');
    await setDoc(ref, {
      items: txs,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('Firestore syncTransactionsToFirestore warning:', err?.message || err);
  }
};

export const syncProfileToFirestore = async (uid: string, profile: UserProfile): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  try {
    const ref = doc(db, 'users', uid, 'data', 'profile');
    await setDoc(ref, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('Firestore syncProfileToFirestore warning:', err?.message || err);
  }
};

export const syncBaseBalanceToFirestore = async (uid: string, balance: number): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  try {
    const ref = doc(db, 'users', uid, 'data', 'baseBalance');
    await setDoc(ref, {
      amount: balance,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('Firestore syncBaseBalanceToFirestore warning:', err?.message || err);
  }
};

/**
 * Fetch all user documents from Firestore and update localStorage
 */
export const fetchUserDataFromFirestore = async (
  uid: string
): Promise<{
  transactions: Transaction[] | null;
  profile: UserProfile | null;
  baseBalance: number | null;
}> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { transactions: null, profile: null, baseBalance: null };
  }

  try {
    const txRef = doc(db, 'users', uid, 'data', 'transactions');
    const profRef = doc(db, 'users', uid, 'data', 'profile');
    const balRef = doc(db, 'users', uid, 'data', 'baseBalance');

    const [txSnap, profSnap, balSnap] = await Promise.all([
      getDoc(txRef),
      getDoc(profRef),
      getDoc(balRef)
    ]);

    let transactions: Transaction[] | null = null;
    let profile: UserProfile | null = null;
    let baseBalance: number | null = null;

    if (txSnap.exists()) {
      transactions = txSnap.data()?.items || [];
      localStorage.setItem(getUserKey(STORAGE_KEYS.TRANSACTIONS, uid), JSON.stringify(transactions));
    } else {
      transactions = [];
      localStorage.setItem(getUserKey(STORAGE_KEYS.TRANSACTIONS, uid), JSON.stringify([]));
    }

    if (profSnap.exists()) {
      const data = profSnap.data();
      profile = {
        name: data.name || 'Foydalanuvchi',
        email: data.email || '',
        avatarUrl: data.avatarUrl || INITIAL_PROFILE.avatarUrl,
        currency: data.currency || 'UZS',
        monthlyBudget: data.monthlyBudget,
        notificationsEnabled: data.notificationsEnabled,
        notificationTime: data.notificationTime,
        phoneNumber: data.phoneNumber
      };
      localStorage.setItem(getUserKey(STORAGE_KEYS.PROFILE, uid), JSON.stringify(profile));
    }

    if (balSnap.exists()) {
      baseBalance = balSnap.data()?.amount ?? 0;
      localStorage.setItem(getUserKey(STORAGE_KEYS.BASE_BALANCE, uid), (baseBalance ?? 0).toString());
    } else {
      baseBalance = 0;
      localStorage.setItem(getUserKey(STORAGE_KEYS.BASE_BALANCE, uid), '0');
    }

    return { transactions, profile, baseBalance };
  } catch (err: any) {
    console.warn('Error fetching data from Firestore:', err?.message || err);
    return { transactions: null, profile: null, baseBalance: null };
  }
};

/**
 * Migration helper: If user logged in for the first time and Firestore has no profile record,
 * migrate current pre-login localStorage data directly to Firestore.
 */
export const migrateLocalDataToFirestore = async (uid: string, userEmail?: string): Promise<boolean> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;

  try {
    const profRef = doc(db, 'users', uid, 'data', 'profile');
    const profSnap = await getDoc(profRef);

    // If profile document already exists in Firestore, skip initialization
    if (profSnap.exists()) {
      return false;
    }

    // New user account: Initialize clean state (0 balance and 0 transactions)
    const newProf = getProfile();
    if (userEmail) {
      newProf.email = userEmail;
    }

    await Promise.all([
      syncTransactionsToFirestore(uid, []),
      syncProfileToFirestore(uid, newProf),
      syncBaseBalanceToFirestore(uid, 0)
    ]);

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BASE_BALANCE, '0');

    console.log('[Initialization] Successfully initialized 0 balance and clean account for user:', uid);
    return true;
  } catch (err: any) {
    console.warn('[Initialization] Failed to initialize user data in Firestore:', err?.message || err);
    return false;
  }
};
