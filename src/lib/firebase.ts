/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';

const getEnv = (key: string): string => {
  // Try Vite client-side prefixed env, non-prefixed env, or empty string fallback
  const metaEnv = (import.meta as any).env || {};
  return (
    metaEnv[`VITE_${key}`] ||
    metaEnv[key] ||
    (typeof process !== 'undefined' && process.env ? process.env[key] || process.env[`VITE_${key}`] : '') ||
    ''
  );
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || 'AIzaSyAImP2t_VIJum4E2jOSbkvNUq6B-arz6f0',
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || 'smartbuget-ba0f6.firebaseapp.com',
  projectId: getEnv('FIREBASE_PROJECT_ID') || 'smartbuget-ba0f6',
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || 'smartbuget-ba0f6.firebasestorage.app',
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || '309281190536',
  appId: getEnv('FIREBASE_APP_ID') || '1:309281190536:web:5b1132baee54e423ce253d'
};

// Check if Firebase config is provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore safely handling IndexedDB storage quota / full disk exceptions
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

export default app;
