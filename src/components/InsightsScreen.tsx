/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Transaction } from '../types';
import { getCategoryStyles } from './CategoryIcon';
import { TrendingUp, TrendingDown, Landmark, PieChart as PieIcon } from 'lucide-react';
import { formatAmount, formatCompactAmount } from '../lib/format';

interface InsightsScreenProps {
  transactions: Transaction[];
  currency: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Oziq-ovqat': '#f59e0b', // amber
  'Ijara': '#a855f7', // purple
  'Ijara va Uy': '#a855f7', // purple
  'Transport': '#10b981', // emerald
  'Kafe va Restoran': '#f97316', // orange
  'Kommunal to\'lovlar': '#0ea5e9', // sky
  'Kiyim-kechak': '#6366f1', // indigo
  'Sog\'liq': '#f43f5e', // rose
  'Ta\'lim va Kitoblar': '#14b8a6', // teal
  'Telefon va Internet': '#06b6d4', // cyan
  'Ko\'ngilochar': '#ec4899', // pink
  'Kredit va Qarz': '#64748b', // slate
  'Maosh': '#3b82f6', // blue
  'Boshqa': '#6b7280' // gray
};

const formatChartYAxis = (value: number) => {
  if (value === 0) return '0';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absVal >= 1e9) {
    return `${sign}${(absVal / 1e9).toFixed(1).replace(/\.0$/, '')} mlrd`;
  }
  if (absVal >= 1e6) {
    return `${sign}${(absVal / 1e6).toFixed(1).replace(/\.0$/, '')} mln`;
  }
  if (absVal >= 1e3) {
    return `${sign}${(absVal / 1e3).toFixed(0)}K`;
  }
  return `${sign}${absVal}`;
};

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ transactions, currency }) => {
  const [timeRange, setTimeRange] = useState<'7days' | 'all'>('7days');

  // Filter and sort transactions
  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Prepare Daily Cashflow Data (Kirim vs Chiqim over time)
  const getChartData = () => {
    const dailyMap: { [key: string]: { date: string, kirim: number, chiqim: number } } = {};
    
    // Default fill for last 7 days if empty
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [, month, day] = dateStr.split('-');
      dailyMap[dateStr] = {
        date: `${day}/${month}`,
        kirim: 0,
        chiqim: 0
      };
    }

    sortedTxs.forEach(tx => {
      const dateKey = tx.date;
      const [, month, day] = dateKey.split('-');
      const formattedLabel = `${day}/${month}`;

      // If viewing all time, populate dynamically
      if (!dailyMap[dateKey]) {
        if (timeRange === 'all') {
          dailyMap[dateKey] = {
            date: formattedLabel,
            kirim: 0,
            chiqim: 0
          };
        } else {
          return; // Skip if out of range for last 7 days
        }
      }

      if (tx.type === 'kirim') {
        dailyMap[dateKey].kirim += tx.amount;
      } else {
        dailyMap[dateKey].chiqim += tx.amount;
      }
    });

    return Object.entries(dailyMap)
      .map(([key, value]) => ({ rawDate: key, ...value }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  };

  const chartData = getChartData();

  // 2. Prepare Category Breakdown Data (Expenses only)
  const expenses = transactions.filter(t => t.type === 'chiqim');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  const categoryDataMap: { [key: string]: number } = {};
  expenses.forEach(t => {
    categoryDataMap[t.category] = (categoryDataMap[t.category] || 0) + t.amount;
  });

  const pieData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#6b7280'
  })).sort((a, b) => b.value - a.value);

  // General Cashflow Metrics
  const totalIn = transactions.filter(t => t.type === 'kirim').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'chiqim').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIn - totalOut;
  const savingsRate = totalIn > 0 ? Math.round((netSavings / totalIn) * 100) : 0;

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#131b2e] p-3 border border-gray-100 dark:border-white/10 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} className="font-semibold" style={{ color: item.color }}>
              {item.name === 'kirim' ? 'Kirim' : 'Chiqim'}: {formatAmount(item.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Category Pie
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalExpense > 0 ? ((data.value / totalExpense) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white dark:bg-[#131b2e] p-3 border border-gray-100 dark:border-white/10 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-gray-900 dark:text-white mb-0.5">{data.name}</p>
          <p className="font-semibold text-primary dark:text-primary-fixed-dim">
            Xarajat: {formatAmount(data.value, currency)} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20 px-1 animate-in fade-in-50 duration-300">
      
      {/* Header and range toggler */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Tahlillar va Diagrammalar
        </h2>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200/40 dark:border-white/5">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              timeRange === '7days' 
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Haftalik
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              timeRange === 'all' 
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Barchasi
          </button>
        </div>
      </div>

      {/* Grid of high-level savings stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-3.5 sm:p-4 border border-gray-100 dark:border-white/5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
            <Landmark size={16} className="text-primary dark:text-primary-fixed-dim shrink-0" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">Jamg'arma ko'rsatkichi</span>
          </div>
          <p className="text-base min-[380px]:text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight font-tabular truncate" title={formatAmount(netSavings, currency)}>
            {formatCompactAmount(netSavings, currency)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 truncate">
            Kirim va Chiqim orasidagi farq
          </p>
        </div>

        <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-3.5 sm:p-4 border border-gray-100 dark:border-white/5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
            <TrendingUp size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">Jamg'arma ulushi</span>
          </div>
          <p className="text-base min-[380px]:text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight font-tabular truncate">
            {savingsRate}%
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 truncate">
            Kirimdan saqlab qolingan qismi
          </p>
        </div>
      </div>

      {/* Chart 1: Cashflow (AreaChart) */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            Kirim va Chiqim Dinamikasi
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Pul oqimining vaqt bo'yicha o'zgarishi
          </p>
        </div>

        <div className="h-60 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorKirim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorChiqim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.1)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#9ca3af" />
              <YAxis tickLine={false} axisLine={false} stroke="#9ca3af" tickFormatter={formatChartYAxis} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="kirim" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKirim)" name="kirim" />
              <Area type="monotone" dataKey="chiqim" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorChiqim)" name="chiqim" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Category Pie Breakdown */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <PieIcon size={16} className="text-primary dark:text-primary-fixed-dim" />
            Xarajatlar tarkibi
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Kategoriyalar bo'yicha sarflangan mablag' ulushi
          </p>
        </div>

        {pieData.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-xs">
            Kategoriyalar bo'yicha tahlil uchun xarajatlar kiritilishi lozim.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Pie rendering container */}
            <div className="h-44 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Manual Legend layout with clean styling */}
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
              {pieData.slice(0, 5).map((entry, idx) => {
                const pct = totalExpense > 0 ? ((entry.value / totalExpense) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-tabular">
                      <span className="font-bold text-gray-900 dark:text-white">{pct}%</span>
                      <span className="text-gray-400 dark:text-gray-500">({formatAmount(entry.value, currency)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
