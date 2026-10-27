/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatAmount } from '../lib/format';

interface IncomeExpenseSummaryProps {
  income: number;
  expense: number;
  currency: string;
}

export const IncomeExpenseSummary: React.FC<IncomeExpenseSummaryProps> = ({ 
  income, 
  expense, 
  currency 
}) => {
  return (
    <section className="flex flex-col gap-3 px-1" id="income-expense-summary">
      {/* Kirim (Income) Card */}
      <div className="bg-[#ffffff] dark:bg-[#131b2e] rounded-2xl p-3.5 sm:p-4 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2.5} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">
              Kirim
            </span>
            <p className="text-sm min-[380px]:text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight font-tabular mt-0.5 truncate whitespace-nowrap" title={formatAmount(income, currency)}>
              {formatAmount(income, currency)}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
          Tushum
        </div>
      </div>

      {/* Chiqim (Expense) Card */}
      <div className="bg-[#ffffff] dark:bg-[#131b2e] rounded-2xl p-3.5 sm:p-4 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2.5} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">
              Chiqim
            </span>
            <p className="text-sm min-[380px]:text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight font-tabular mt-0.5 truncate whitespace-nowrap" title={formatAmount(expense, currency)}>
              {formatAmount(expense, currency)}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
          Xarajat
        </div>
      </div>
    </section>
  );
};
