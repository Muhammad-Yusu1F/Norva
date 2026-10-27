/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats an amount with proper thousands separator and no decimals for UZS.
 * E.g., 10000 UZS -> "10.000 UZS"
 *       12.50 USD -> "$12.50"
 */
export const formatAmount = (amount: number, currency: string): string => {
  if (currency === 'UZS' || currency === 'so\'m' || currency === 'som' || currency === 'soʻm') {
    // Format UZS with dot as thousand separator and no decimals (e.g. 10.000 UZS)
    const withDots = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace(/,/g, '.');

    return `${withDots}\u00A0UZS`;
  }
  
  // Normal currency format for others
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${currency}\u00A0${formatted}`;
};

/**
 * Formats an amount in a clean compact notation to fit nicely in small UI cards and badges.
 * E.g., 900000 UZS -> "900k UZS"
 *       9133211 UZS -> "9.13 mln UZS"
 *       12500000 UZS -> "12.5 mln UZS"
 */
export const formatCompactAmount = (amount: number, currency: string): string => {
  const isUZS = currency === 'UZS' || currency === 'so\'m' || currency === 'som' || currency === 'soʻm';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (isUZS) {
    if (abs >= 1_000_000_000) {
      const val = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '');
      return `${sign}${val}\u00A0mlrd UZS`;
    }
    if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
      return `${sign}${val}\u00A0mln UZS`;
    }
    if (abs >= 1_000) {
      const val = (abs / 1_000).toFixed(1).replace(/\.?0+$/, '');
      return `${sign}${val}k\u00A0UZS`;
    }
    return `${sign}${abs}\u00A0UZS`;
  }

  // Non-UZS (e.g. USD)
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${currency}${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${currency}${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.?0+$/, '');
    return `${sign}${currency}${val}k`;
  }
  return formatAmount(amount, currency);
};

/**
 * Returns a signed formatted amount with "+" or "-" prefix.
 */
export const formatSignedAmount = (amount: number, type: 'kirim' | 'chiqim', currency: string): string => {
  const sign = type === 'kirim' ? '+' : '-';
  if (currency === 'UZS' || currency === 'so\'m' || currency === 'som' || currency === 'soʻm') {
    const withDots = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace(/,/g, '.');
    return `${sign}${withDots}\u00A0UZS`;
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${sign}${currency}\u00A0${formatted}`;
};

/**
 * Checks if a transaction is older than 24 hours and therefore locked from edits.
 */
export const isTransactionLocked = (tx?: { date?: string; time?: string } | null): boolean => {
  if (!tx || !tx.date) return false;
  try {
    const timeStr = tx.time || '00:00';
    const txDateTime = new Date(`${tx.date}T${timeStr}:00`).getTime();
    if (isNaN(txDateTime)) return false;
    const now = Date.now();
    const diffInMs = now - txDateTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours >= 24;
  } catch (e) {
    return false;
  }
};
