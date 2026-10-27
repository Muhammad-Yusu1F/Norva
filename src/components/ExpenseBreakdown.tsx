/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction } from '../types';
import { getCategoryStyles, CategoryIcon } from './CategoryIcon';
import { formatAmount } from '../lib/format';

interface ExpenseBreakdownProps {
  transactions: Transaction[];
  onViewAll: () => void;
  currency: string;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ 
  transactions, 
  onViewAll,
  currency
}) => {
  // Filter for expenses (chiqim)
  const expenses = transactions.filter(t => t.type === 'chiqim');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryMap: { [key: string]: number } = {};
  expenses.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  // Convert to array and sort descending
  const breakdown = Object.entries(categoryMap).map(([category, amount]) => {
    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    return {
      category,
      amount,
      percentage
    };
  }).sort((a, b) => b.amount - a.amount);

  return (
    <section className="space-y-4 px-1" id="expense-breakdown-section">
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Xarajatlar tahlili
        </h3>
        <button 
          onClick={onViewAll}
          className="text-xs font-semibold text-primary dark:text-primary-fixed-dim hover:underline cursor-pointer active:scale-95 duration-100"
        >
          Barchasi
        </button>
      </div>

      <div className="bg-[#ffffff] dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-5">
        {breakdown.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            Hech qanday xarajat kiritilmagan.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {breakdown.slice(0, 4).map((item) => {
              const styles = getCategoryStyles(item.category);
              return (
                <div key={item.category} className="space-y-2 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${styles.bg} ${styles.text} flex items-center justify-center`}>
                        <CategoryIcon category={item.category} size={14} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-900 dark:text-white font-tabular">
                        {item.percentage}%
                      </span>
                      <span>
                        ({formatAmount(item.amount, currency)})
                      </span>
                    </div>
                  </div>
                  
                  <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${styles.progress} rounded-full transition-all duration-700`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
