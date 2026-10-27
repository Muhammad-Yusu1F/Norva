/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Check, X, PlusCircle, ArrowUpRight, RotateCcw } from 'lucide-react';
import { formatAmount } from '../lib/format';
import { AccentTheme, ACCENT_THEMES } from '../types';

interface BalanceCardProps {
  balance: number;
  currency: string;
  percentageChange?: number;
  periodLabel?: string;
  baseBalance?: number;
  onUpdateBaseBalance?: (newBase: number) => void;
  accentTheme?: AccentTheme;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  balance, 
  currency, 
  percentageChange = 12.5,
  periodLabel = "Jami Mavjud Balans",
  baseBalance = 0,
  onUpdateBaseBalance,
  accentTheme = 'blue'
}) => {
  const isPositive = balance >= 0;
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [mode, setMode] = useState<'set' | 'add'>('set');
  const [inputVal, setInputVal] = useState(baseBalance.toString());

  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  const handleSaveBase = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = inputVal.replace(/\D/g, '');
    const num = parseFloat(cleanStr) || 0;
    
    if (onUpdateBaseBalance) {
      if (mode === 'add') {
        onUpdateBaseBalance(baseBalance + num);
      } else {
        onUpdateBaseBalance(num);
      }
    }
    setIsEditingBase(false);
  };

  const formatRawInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('en-US').format(parseInt(clean, 10)).replace(/,/g, '.');
  };

  const setPreset = (amount: number) => {
    if (mode === 'add') {
      setInputVal(formatRawInput(amount.toString()));
    } else {
      setInputVal(formatRawInput(amount.toString()));
    }
  };

  const resetBase = () => {
    setInputVal('');
    if (onUpdateBaseBalance) {
      onUpdateBaseBalance(0);
    }
    setIsEditingBase(false);
  };

  return (
    <section className="mt-2 px-1" id="total-balance-card">
      <div className={`bg-gradient-to-br ${currentAccent.cardGradient} rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group border border-white/10 transition-all duration-300`}>
        {/* Decorative background glass elements */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary-container/20 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 text-white/90 mb-1.5 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 text-white/80 truncate">
                  <Wallet size={14} className="text-violet-200 shrink-0" />
                  <span className="truncate">{periodLabel}</span>
                </p>
                {onUpdateBaseBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal(formatRawInput(baseBalance.toString()));
                      setMode('set');
                      setIsEditingBase(true);
                    }}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl backdrop-blur-md border border-white/20 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                    title="Boshlang'ich pulni kiritish / o'zgartirish"
                  >
                    <PlusCircle size={13} className="text-emerald-300 shrink-0" />
                    <span className="whitespace-nowrap">Pul kiritish</span>
                  </button>
                )}
              </div>

              <h2 className="text-2xl min-[360px]:text-3xl min-[400px]:text-4xl font-extrabold tracking-tight font-tabular truncate max-w-full drop-shadow-sm whitespace-nowrap" title={formatAmount(balance, currency)}>
                {formatAmount(balance, currency)}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/15 min-w-0">
            <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/25 transition-all px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-md text-[10px] sm:text-xs font-semibold shrink-0 whitespace-nowrap">
              {isPositive ? (
                <TrendingUp size={13} className="text-emerald-300 shrink-0" />
              ) : (
                <TrendingDown size={13} className="text-rose-300 shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isPositive ? 'Mavjud Balans' : 'Salbiy balans'}
              </span>
            </div>

            <div className="text-white/70 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase whitespace-nowrap flex items-center gap-1 shrink-0">
              <ArrowUpRight size={11} className="text-emerald-300 shrink-0" />
              <span className="whitespace-nowrap">Avto Hisoblanadi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal to Enter or Add Base Balance */}
      {isEditingBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#192238] border border-gray-200 dark:border-white/10 p-5 rounded-3xl w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300">
                  <Wallet size={18} />
                </div>
                <span>Pul Kiritish / Sozlash</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingBase(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Switch Mode: Set Total or Add to Current */}
            <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('set');
                  setInputVal(formatRawInput(baseBalance.toString()));
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'set'
                    ? 'bg-white dark:bg-violet-600 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Umumiy Summa Kiritish
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('add');
                  setInputVal('');
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'add'
                    ? 'bg-white dark:bg-violet-600 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Mavjudiga Qo'shish
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              {mode === 'set' 
                ? "Hozirgi karta yoki hamyoningizdagi to'liq summa miqdorini kiriting."
                : "Hozirgi balansga qo'shimcha pul tushumini kiritish."}
            </p>

            <form onSubmit={handleSaveBase} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Summa ({currency})
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="Masalan: 100.000"
                    value={inputVal}
                    onChange={(e) => setInputVal(formatRawInput(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-lg font-extrabold text-gray-900 dark:text-white focus:outline-none focus:border-violet-600 font-tabular shadow-inner"
                  />
                  <span className="absolute right-4 text-xs font-bold text-gray-400 pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Tezkor Qiymatlar
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[50000, 100000, 500000, 1000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPreset(amt)}
                      className="bg-gray-100 hover:bg-violet-100 dark:bg-white/5 dark:hover:bg-violet-950/60 text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 text-[11px] font-bold py-1.5 px-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-violet-300 dark:hover:border-violet-700/50"
                    >
                      {new Intl.NumberFormat('en-US').format(amt).replace(/,/g, '.')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Check size={16} />
                  <span>{mode === 'add' ? "Qo'shish va Saqlash" : "Balansni Saqlash"}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBase(false)}
                    className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold py-2.5 text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={resetBase}
                    className="flex-1 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold py-2.5 text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Nollash (0)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
