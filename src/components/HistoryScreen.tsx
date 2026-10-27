/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CalendarDays, 
  Wallet, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Coins,
  Lock,
  Camera,
  Pencil,
  FileSpreadsheet,
  QrCode,
  ExternalLink,
  FileDown,
  Download
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { CategoryIcon, getCategoryStyles } from './CategoryIcon';
import { formatAmount, formatSignedAmount, isTransactionLocked } from '../lib/format';
import { exportSingleReceiptPdf } from '../lib/pdfExporter';

interface HistoryScreenProps {
  transactions: Transaction[];
  onTransactionClick: (tx: Transaction) => void;
  currency: string;
}

const CATEGORIES = [
  'Barchasi',
  'Oziq-ovqat',
  'Ijara va Uy',
  'Transport',
  'Kafe va Restoran',
  'Kommunal to\'lovlar',
  'Kiyim-kechak',
  'Sog\'liq',
  'Ta\'lim va Kitoblar',
  'Telefon va Internet',
  'Ko\'ngilochar',
  'Kredit va Qarz',
  'Maosh',
  'Boshqa'
];

// Uzbek localized calendar names
const getUzbekWeekdayName = (dateStr: string) => {
  const d = new Date(dateStr);
  const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  return weekdays[d.getDay()];
};

const getUzbekMonthName = (monthIdx: number) => {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  return months[monthIdx];
};

const formatDateUzbek = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  if (dateStr === today) {
    return 'Bugun';
  }
  if (dateStr === yesterday) {
    return 'Kecha';
  }

  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const getMondayOfDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const r = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const getWeekRangeLabel = (mondayStr: string): string => {
  const monday = new Date(mondayStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  
  const mD = monday.getDate();
  const mM = months[monday.getMonth()];
  const mY = monday.getFullYear();
  
  const sD = sunday.getDate();
  const sM = months[sunday.getMonth()];
  const sY = sunday.getFullYear();
  
  if (mY !== sY) {
    return `${mD}-${mM}, ${mY} - ${sD}-${sM}, ${sY}`;
  }
  if (mM !== sM) {
    return `${mD}-${mM} - ${sD}-${sM}, ${mY}`;
  }
  return `${mD}-${sD} ${mM}, ${mY}-yil`;
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ 
  transactions, 
  onTransactionClick,
  currency 
}) => {
  // Navigation inside History tab
  const [historyTab, setHistoryTab] = useState<'daily' | 'weekly' | 'filters'>('daily');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'barchasi' | TransactionType>('barchasi');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Expanded accordions states
  const [expandedDays, setExpandedDays] = useState<{[key: string]: boolean}>({});
  const [expandedWeeks, setExpandedWeeks] = useState<{[key: string]: boolean}>({});
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [previewReceipt, setPreviewReceipt] = useState<{ image: string; tx: Transaction } | null>(null);

  // Sort transactions newest first (by date then by time)
  const sortedTxs = [...transactions].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  // Filtered transactions (only applied in flat-list with search/filters tab)
  const filteredTransactions = sortedTxs.filter(tx => {
    const itemsMatch = tx.items?.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) || false;
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          itemsMatch;
    
    const matchesType = selectedType === 'barchasi' ? true : tx.type === selectedType;
    const matchesCategory = selectedCategory === 'Barchasi' ? true : 
                            (tx.category === selectedCategory || (selectedCategory === 'Ijara va Uy' && tx.category === 'Ijara'));
    const matchesDate = selectedDate ? tx.date === selectedDate : true;

    return matchesSearch && matchesType && matchesCategory && matchesDate;
  });

  // Dynamic grouped days calculated from transactions
  const groupedDays = React.useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    sortedTxs.forEach(tx => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });
    
    return Object.entries(groups).map(([date, txs]) => {
      const income = txs.filter(t => t.type === 'kirim').reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter(t => t.type === 'chiqim').reduce((sum, t) => sum + t.amount, 0);
      return { date, income, expense, transactions: txs };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [sortedTxs]);

  // Dynamic grouped weeks calculated from transactions
  const groupedWeeks = React.useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    sortedTxs.forEach(tx => {
      const monday = getMondayOfDate(tx.date);
      if (!groups[monday]) {
        groups[monday] = [];
      }
      groups[monday].push(tx);
    });
    
    return Object.entries(groups).map(([mondayDate, txs]) => {
      const income = txs.filter(t => t.type === 'kirim').reduce((sum, t) => sum + t.amount, 0);
      const expense = txs.filter(t => t.type === 'chiqim').reduce((sum, t) => sum + t.amount, 0);
      return {
        mondayDate,
        label: getWeekRangeLabel(mondayDate),
        income,
        expense,
        transactions: txs
      };
    }).sort((a, b) => b.mondayDate.localeCompare(a.mondayDate));
  }, [sortedTxs]);

  // Auto-expand first items when grouped lists load
  React.useEffect(() => {
    if (groupedDays.length > 0 && Object.keys(expandedDays).length === 0) {
      setExpandedDays({ [groupedDays[0].date]: true });
    }
    if (groupedWeeks.length > 0 && Object.keys(expandedWeeks).length === 0) {
      setExpandedWeeks({ [groupedWeeks[0].mondayDate]: true });
    }
  }, [groupedDays, groupedWeeks]);

  const toggleDayExpand = (date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleWeekExpand = (mondayDate: string) => {
    setExpandedWeeks(prev => ({ ...prev, [mondayDate]: !prev[mondayDate] }));
  };

  const toggleItemExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('barchasi');
    setSelectedCategory('Barchasi');
    setSelectedDate('');
  };

  const handleExportCsv = () => {
    const listToExport = historyTab === 'filters' ? filteredTransactions : sortedTxs;
    if (!listToExport || listToExport.length === 0) {
      alert("Yuklab olish uchun ma'lumotlar mavjud emas.");
      return;
    }

    const headers = ["ID", "Sana", "Vaqt", "Turi", "Sarlavha", "Turkum", "Summa (UZS)", "Izoh"];
    const rows = listToExport.map(tx => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.time}"`,
      `"${tx.type === 'kirim' ? 'Kirim' : 'Chiqim'}"`,
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.type === 'kirim' ? tx.amount : -tx.amount,
      `"${(tx.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `NORVA_Hisobot_${historyTab}_${dateStr}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 5000);
  };

  const isFiltered = searchTerm !== '' || selectedType !== 'barchasi' || selectedCategory !== 'Barchasi' || selectedDate !== '';

  return (
    <div className="space-y-6 pb-20 px-1 animate-in fade-in-50 duration-300">
      
      {/* Header and Filter status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="text-primary" size={24} />
            Moliya Tarixi & Hisobotlar
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
            Xarajatlar va daromadlarni kunlik, haftalik tahlil qilish tizimi
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer active:scale-95 duration-100 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm"
            title="Xarajatlar ro'yxatini Excel/CSV faylida yuklab olish"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" />
            <span>Excel (CSV) Yuklab olish</span>
          </button>

          {historyTab === 'filters' && isFiltered && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer active:scale-95 duration-100 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/10"
            >
              <X size={14} />
              <span>Tozalash</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Segmented Tabs for History tab */}
      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/40 dark:border-white/5 shadow-inner">
        <button
          onClick={() => setHistoryTab('daily')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            historyTab === 'daily'
              ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <CalendarDays size={14} className={historyTab === 'daily' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
          <span>Kun</span>
        </button>
        <button
          onClick={() => setHistoryTab('weekly')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            historyTab === 'weekly'
              ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Calendar size={14} className={historyTab === 'weekly' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
          <span>Hafta</span>
        </button>
        <button
          onClick={() => setHistoryTab('filters')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            historyTab === 'filters'
              ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm font-extrabold scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Search size={14} className={historyTab === 'filters' ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
          <span>Qidiruv</span>
        </button>
      </div>

      {/* ----------------- TAB 1: KUNLIK HISOBOTLAR ----------------- */}
      {historyTab === 'daily' && (
        <div className="space-y-4">
          {groupedDays.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
              <CalendarDays className="mx-auto text-gray-300 dark:text-gray-600 mb-2.5" size={32} />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Kunlik ma'lumotlar mavjud emas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto mt-1">Tranzaksiyalar qo'shilganidan so'ng ular kunlar bo'yicha guruhlanib chiqadi.</p>
            </div>
          ) : (
            groupedDays.map(group => {
              const isOpen = expandedDays[group.date];
              const netBalance = group.income - group.expense;
              const isPositive = netBalance >= 0;

              return (
                <div 
                  key={group.date}
                  className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-200"
                >
                  {/* Day Header Bar */}
                  <div 
                    onClick={() => toggleDayExpand(group.date)}
                    className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 select-none gap-2"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isPositive 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        <CalendarDays size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                          {formatDateUzbek(group.date)}
                        </h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider truncate">
                          {group.transactions.length} ta operatsiya
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {/* Compact Green (Income) & Red (Expense) numbers without text labels */}
                      <div className="flex flex-col items-end text-right font-tabular shrink-0">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +{formatAmount(group.income, currency)}
                        </span>
                        {group.expense > 0 ? (
                          <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{formatAmount(group.expense, currency)}
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            -0 UZS
                          </span>
                        )}
                      </div>
                      
                      {/* Expansion Chevron */}
                      <div className="text-gray-400 dark:text-gray-500 p-0.5 shrink-0">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable nested transactions of that specific day */}
                  {isOpen && (
                    <div className="border-t border-gray-50 dark:border-white/5 bg-gray-50/40 dark:bg-[#131b2e]/30 px-4 pb-4 pt-1 divide-y divide-gray-100 dark:divide-white/5">
                      {group.transactions.map(tx => {
                        const isExp = tx.type === 'chiqim';
                        const styles = getCategoryStyles(tx.category);
                        const hasItems = tx.items && tx.items.length > 0;
                        const isItemExpanded = expandedItems[tx.id];

                        return (
                          <div key={tx.id} className="py-2.5 first:pt-2 last:pb-1">
                            <div 
                              onClick={(e) => {
                                if (hasItems || tx.receiptImage) {
                                  toggleItemExpand(e, tx.id);
                                }
                              }}
                              className="flex items-center justify-between cursor-pointer group gap-2"
                              title={hasItems || tx.receiptImage ? "Tafsilotlarni ko'rish" : "Tahlil"}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-xl ${styles.bg} ${styles.text} flex items-center justify-center shrink-0 shadow-2xs`}>
                                  <CategoryIcon category={tx.category} size={16} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="font-bold text-xs text-gray-800 dark:text-gray-200 group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors truncate">
                                    {tx.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate">
                                    <span className="flex items-center gap-0.5 shrink-0">
                                      <Clock size={9} />
                                      {tx.time}
                                    </span>
                                    {hasItems && (
                                      <button 
                                        type="button"
                                        onClick={(e) => toggleItemExpand(e, tx.id)}
                                        className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-primary dark:text-primary-fixed-dim bg-primary/10 hover:bg-primary/20 px-1 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                                        title={`${tx.items?.length} ta mahsulot xaridi`}
                                      >
                                        <ShoppingBag size={10} />
                                        {isItemExpanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                                      </button>
                                    )}
                                    {(tx.fiscalNumber || tx.qrData) && (
                                      <button
                                        type="button"
                                        onClick={(e) => toggleItemExpand(e, tx.id)}
                                        className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 shrink-0 cursor-pointer"
                                        title={`Soliq OFD cheki ${tx.fiscalNumber ? `#${tx.fiscalNumber}` : ''}`}
                                      >
                                        <QrCode size={9} />
                                        <span>OFD</span>
                                      </button>
                                    )}
                                    {tx.receiptImage && (
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewReceipt({ image: tx.receiptImage!, tx });
                                        }}
                                        className="inline-flex items-center justify-center text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 hover:bg-violet-200 dark:hover:bg-violet-900/60 p-0.5 rounded border border-violet-200 dark:border-violet-800/40 shrink-0 transition-colors cursor-pointer"
                                        title="Biriktirilgan chekni ko'rish"
                                      >
                                        <Camera size={10} />
                                      </button>
                                    )}
                                    {isTransactionLocked(tx) && (
                                      <span className="p-0.5 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0" title="Muhrlangan (24 soat o'tgan)">
                                        <Lock size={9} />
                                      </span>
                                    )}
                                    {tx.description && (
                                      <span className="truncate max-w-[100px] text-gray-400 dark:text-gray-500">
                                        • {tx.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-right ml-2">
                                <span className={`font-extrabold text-xs tracking-tight font-tabular ${
                                  isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {formatSignedAmount(tx.amount, tx.type, currency)}
                                </span>
                                {(hasItems || tx.receiptImage) && (
                                  <span className="text-gray-400">
                                    {isItemExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTransactionClick(tx);
                                  }}
                                  className="p-1 rounded text-gray-400 hover:text-primary dark:hover:text-primary-fixed-dim hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Tahrirlash modalini ochish"
                                >
                                  <Pencil size={11} />
                                </button>
                              </div>
                            </div>

                            {/* Optional items & OFD receipt info */}
                            {isItemExpanded && (
                              <div className="mt-2.5 ml-12 p-2.5 bg-white dark:bg-[#131b2e]/60 rounded-xl border border-gray-200 dark:border-white/5 space-y-2 shadow-xs">
                                {(tx.fiscalNumber || tx.qrData) && (
                                  <div className="flex items-center justify-between text-[10px] p-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/30 rounded-lg">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <QrCode size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="text-emerald-800 dark:text-emerald-300 font-bold truncate">
                                        {tx.fiscalNumber ? `Soliq OFD chek №: ${tx.fiscalNumber}` : 'Soliq OFD cheki biriktirilgan'}
                                      </span>
                                    </div>
                                    {tx.qrData && (tx.qrData.startsWith('http://') || tx.qrData.startsWith('https://')) && (
                                      <a
                                        href={tx.qrData}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                                      >
                                        <span>Tekshirish</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    )}
                                  </div>
                                )}

                                {hasItems && (
                                  <>
                                    <span className="block text-[8px] font-extrabold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                                      Xarid qilingan ro'yxat:
                                    </span>
                                    <div className="space-y-1">
                                      {tx.items?.map((item, i) => (
                                        <div key={item.id || i} className="flex justify-between text-[10px] py-1 px-1.5 bg-gray-50 dark:bg-white/5 rounded-md">
                                          <span className="text-gray-600 dark:text-gray-400 font-medium">{item.name}</span>
                                          <span className="text-gray-800 dark:text-white font-bold">{formatAmount(item.price, currency)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ----------------- TAB 2: HAFTALIK HISOBOTLAR ----------------- */}
      {historyTab === 'weekly' && (
        <div className="space-y-4">
          {groupedWeeks.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
              <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-2.5" size={32} />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Haftalik ma'lumotlar mavjud emas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto mt-1">Tranzaksiyalar qo'shilganidan so'ng ular haftalar bo'yicha guruhlanib chiqadi.</p>
            </div>
          ) : (
            groupedWeeks.map(week => {
              const isOpen = expandedWeeks[week.mondayDate];
              const netBalance = week.income - week.expense;
              const isPositive = netBalance >= 0;

              return (
                <div 
                  key={week.mondayDate}
                  className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-200"
                >
                  {/* Week Header Bar */}
                  <div 
                    onClick={() => toggleWeekExpand(week.mondayDate)}
                    className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 select-none gap-2"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isPositive 
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white' 
                          : 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white'
                      }`}>
                        <Calendar size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                          {week.label}
                        </h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider truncate">
                          Ushbu haftada {week.transactions.length} ta operatsiya
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {/* Compact Green (Income) & Red (Expense) numbers without text labels */}
                      <div className="flex flex-col items-end text-right font-tabular shrink-0">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +{formatAmount(week.income, currency)}
                        </span>
                        {week.expense > 0 ? (
                          <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{formatAmount(week.expense, currency)}
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            -0 UZS
                          </span>
                        )}
                      </div>
                      
                      <div className="text-gray-400 dark:text-gray-500 p-0.5 shrink-0">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Nested days or transactions inside that week */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-[#131b2e]/30 px-4 pb-4 pt-2 divide-y divide-gray-100 dark:divide-white/5">
                      {week.transactions.map(tx => {
                        const isExp = tx.type === 'chiqim';
                        const styles = getCategoryStyles(tx.category);

                        return (
                          <div 
                            key={tx.id}
                            onClick={() => onTransactionClick(tx)}
                            className="py-3 flex items-center justify-between cursor-pointer group hover:bg-white/50 dark:hover:bg-white/5 px-2 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${styles.bg} ${styles.text} flex items-center justify-center shrink-0`}>
                                <CategoryIcon category={tx.category} size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate max-w-[140px] sm:max-w-[200px]">
                                  {tx.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-gray-500 dark:text-gray-400 font-semibold bg-gray-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                    {formatDateUzbek(tx.date)}
                                  </span>
                                  <span className="text-[9.5px] text-gray-400 dark:text-gray-500 font-medium">
                                    {tx.time}
                                  </span>
                                  {isTransactionLocked(tx) && (
                                    <span className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0" title="Muhrlangan (24 soat o'tgan)">
                                      <Lock size={9} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`font-extrabold text-xs tracking-tight font-tabular ${
                                isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {formatSignedAmount(tx.amount, tx.type, currency)}
                              </span>
                              <ChevronRight size={11} className="text-gray-300 dark:text-gray-600 animate-in fade-in" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ----------------- TAB 3: QIDIRUV VA FILTRLAR (LIST) ----------------- */}
      {historyTab === 'filters' && (
        <div className="space-y-4">
          
          {/* Advanced Search & Filtering Console */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
            
            {/* Search Input bar */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Nomi, izohi yoki mahsulot nomi bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim"
              />
            </div>

            {/* Sub-selectors */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Type select */}
              <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5">
                {selectedType === 'barchasi' && <Coins size={14} className="text-gray-400 dark:text-gray-500 mr-2 shrink-0" />}
                {selectedType === 'kirim' && <TrendingUp size={14} className="text-emerald-500 mr-2 shrink-0" />}
                {selectedType === 'chiqim' && <TrendingDown size={14} className="text-rose-500 mr-2 shrink-0" />}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full bg-transparent border-none text-xs text-gray-700 dark:text-gray-300 font-semibold focus:outline-none p-0 cursor-pointer"
                >
                  <option value="barchasi" className="bg-white dark:bg-[#131b2e]">Barcha turlar</option>
                  <option value="kirim" className="bg-white dark:bg-[#131b2e]">Kirim (Daromad)</option>
                  <option value="chiqim" className="bg-white dark:bg-[#131b2e]">Chiqim (Xarajat)</option>
                </select>
              </div>

              {/* Exact Date picker */}
              <div className="relative flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5">
                <Calendar size={14} className="text-gray-400 dark:text-gray-500 mr-2 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-gray-700 dark:text-gray-300 font-semibold focus:outline-none p-0 cursor-pointer"
                />
              </div>

            </div>

            {/* Horizontal Categorization list chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Kategoriya bo'yicha filtr
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none snap-x">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-100 cursor-pointer snap-start ${
                      selectedCategory === cat
                        ? 'bg-primary dark:bg-primary-container text-white shadow-sm shadow-primary/20'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* List display */}
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">
                  Amallar topilmadi
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                  Qidiruv so'zini o'zgartirib ko'ring yoki filtrlarni tozalang.
                </p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isExpense = tx.type === 'chiqim';
                const styles = getCategoryStyles(tx.category);
                const hasItems = tx.items && tx.items.length > 0;
                const isExpanded = expandedItems[tx.id];

                return (
                  <div 
                    key={tx.id}
                    onClick={(e) => {
                      if (hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData) {
                        toggleItemExpand(e, tx.id);
                      }
                    }}
                    className="bg-white dark:bg-[#131b2e] p-3.5 sm:p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary-fixed-dim/30 transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md"
                    title={hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData ? "Tafsilotlarni ko'rish" : "Tahlil"}
                  >
                    <div className="flex items-center justify-between gap-3 min-h-[48px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-11 h-11 rounded-2xl ${styles.bg} ${styles.text} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-xs`}>
                          <CategoryIcon category={tx.category} size={20} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors truncate">
                            {tx.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-medium truncate">
                            <span className="shrink-0">{formatDateUzbek(tx.date)}, {tx.time}</span>
                            {hasItems && (
                              <button 
                                type="button"
                                onClick={(e) => toggleItemExpand(e, tx.id)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-primary dark:text-primary-fixed-dim bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded-full border border-primary/10 transition-colors shrink-0 cursor-pointer"
                                title={`${tx.items?.length} ta mahsulot xaridi`}
                              >
                                <ShoppingBag size={11} />
                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                            )}
                            {(tx.fiscalNumber || tx.qrData) && (
                              <button
                                type="button"
                                onClick={(e) => toggleItemExpand(e, tx.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shrink-0 cursor-pointer transition-colors"
                                title={`Soliq OFD cheki ${tx.fiscalNumber ? `#${tx.fiscalNumber}` : ''}`}
                              >
                                <QrCode size={10} />
                                <span>OFD</span>
                              </button>
                            )}
                            {tx.receiptImage && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewReceipt({ image: tx.receiptImage!, tx });
                                }}
                                className="inline-flex items-center justify-center text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 hover:bg-violet-200 dark:hover:bg-violet-900/60 p-1 rounded-full border border-violet-200 dark:border-violet-800/40 shrink-0 transition-colors cursor-pointer"
                                title="Biriktirilgan chekni ko'rish"
                              >
                                <Camera size={11} />
                              </button>
                            )}
                            {isTransactionLocked(tx) && (
                              <span className="p-0.5 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0" title="Muhrlangan (24 soat o'tgan)">
                                <Lock size={10} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                        <span className={`font-extrabold text-sm sm:text-base tracking-tight font-tabular whitespace-nowrap ${
                          isExpense 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatSignedAmount(tx.amount, tx.type, currency)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData) {
                                toggleItemExpand(e, tx.id);
                              }
                            }}
                            className={`flex items-center gap-1 group/cat rounded px-1 transition-colors ${
                              (hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData) ? 'hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer' : ''
                            }`}
                            title={hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData ? "Tafsilotlarni ko'rish" : tx.category}
                          >
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                              {tx.category}
                            </span>
                            {(hasItems || tx.receiptImage || tx.fiscalNumber || tx.qrData) && (
                              <span className="text-gray-400 group-hover/cat:text-primary dark:group-hover/cat:text-primary-fixed-dim transition-colors">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTransactionClick(tx);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                            title="Tahrirlash modalini ochish"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {(hasItems || tx.fiscalNumber || tx.qrData) && isExpanded && (
                      <div 
                        className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(tx.fiscalNumber || tx.qrData) && (
                          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/30 rounded-xl p-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <QrCode size={15} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                  Davlat Soliq (OFD) Cheki
                                </p>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                  {tx.fiscalNumber ? `Fiskal raqam: #${tx.fiscalNumber}` : 'QR-kod biriktirilgan'} {tx.inn ? `• STIR: ${tx.inn}` : ''}
                                </p>
                              </div>
                            </div>

                            {tx.qrData && (tx.qrData.startsWith('http://') || tx.qrData.startsWith('https://')) && (
                              <a
                                href={tx.qrData}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition-colors shadow-xs"
                              >
                                <span>Tekshirish</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        )}

                        {hasItems && (
                          <>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                              <ShoppingBag size={10} />
                              <span>Xarid qilingan narsalar va xarajatlar ro'yxati</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-1.5 pl-1">
                              {tx.items?.map((item, idx) => (
                                <div 
                                  key={item.id || idx} 
                                  className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-primary/5 dark:hover:bg-white/10 transition-colors"
                                >
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold truncate max-w-[180px]">
                                    {item.name}
                                  </span>
                                  <span className="text-gray-900 dark:text-white font-extrabold font-tabular shrink-0">
                                    {formatAmount(item.price, currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      {previewReceipt && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewReceipt(null)}
        >
          <div 
            className="bg-white dark:bg-[#131b2e] rounded-2xl max-w-lg w-full p-4 space-y-3 border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-sm">
                <Camera size={18} />
                <span>Biriktirilgan chek rasmi</span>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden max-h-[65vh] bg-black/5 flex items-center justify-center">
              <img 
                src={previewReceipt.image} 
                alt="Chek rasmi to'liq" 
                className="max-h-[62vh] w-auto object-contain rounded-lg"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportSingleReceiptPdf(previewReceipt.tx, currency)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <FileDown size={14} />
                <span>PDF qilib yuklab olish</span>
              </button>
              
              <a
                href={previewReceipt.image}
                download={`chek_${previewReceipt.tx.date}_${previewReceipt.tx.title || 'rasm'}.jpg`}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Download size={14} />
                <span>Rasmni saqlash</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
