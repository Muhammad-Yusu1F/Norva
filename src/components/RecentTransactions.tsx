/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction } from '../types';
import { CategoryIcon, getCategoryStyles } from './CategoryIcon';
import { ChevronDown, ChevronUp, ShoppingBag, PlusCircle, Lock, Camera, Pencil, QrCode, ExternalLink, FileDown, Download } from 'lucide-react';
import { formatAmount, formatSignedAmount, isTransactionLocked } from '../lib/format';
import { exportSingleReceiptPdf } from '../lib/pdfExporter';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onTransactionClick?: (tx: Transaction) => void;
  onAddClick?: () => void;
  currency: string;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions, 
  onTransactionClick,
  onAddClick,
  currency
}) => {
  // Local state to keep track of expanded transaction IDs to show sub-items
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{ image: string; tx: Transaction } | null>(null);

  // Show last 6 transactions on the dashboard to give more visibility
  const displayTxs = transactions.slice(0, 6);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formatTxDate = (dateStr: string, timeStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [year, month, day] = dateStr.split('-');
    const formattedFullDate = `${day}.${month}.${year}`;

    if (dateStr === today) {
      return `Bugun, ${timeStr}`;
    } else if (dateStr === yesterday) {
      return `Kecha, ${timeStr}`;
    }
    
    return `${formattedFullDate}, ${timeStr}`;
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the edit modal
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section className="space-y-4 px-1" id="recent-transactions-section">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          So'nggi amallar
        </h3>
        <span className="text-[10px] bg-primary/10 dark:bg-primary-container/20 text-primary dark:text-primary-fixed-dim px-2 py-0.5 rounded-full font-bold">
          Batafsil ro'yxat uchun bosing
        </span>
      </div>
      
      <div className="space-y-3">
        {displayTxs.length === 0 ? (
          <div className="bg-[#ffffff] dark:bg-[#131b2e] text-center py-8 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400 text-sm">
            Hali hech qanday amal bajarilmagan.
          </div>
        ) : (
          displayTxs.map((tx) => {
            const isExpense = tx.type === 'chiqim';
            const styles = getCategoryStyles(tx.category);

            const hasItems = tx.items && tx.items.length > 0;
            const hasOfd = Boolean(tx.fiscalNumber || tx.qrData);
            const canExpand = hasItems || tx.receiptImage || hasOfd;
            const isExpanded = expandedId === tx.id;

            return (
              <div 
                key={tx.id}
                onClick={(e) => {
                  if (canExpand) {
                    toggleExpand(e, tx.id);
                  }
                }}
                className="bg-white dark:bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary-fixed-dim/30 transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md"
                title={canExpand ? "Tafsilotlarni ko'rish uchun bosing" : "Tahlil"}
              >
                {/* Core Uniform Transaction Row */}
                <div className="flex items-center justify-between gap-3 min-h-[48px]">
                  {/* Left: Category Icon & Main Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Category circular icon background */}
                    <div className={`w-11 h-11 rounded-2xl ${styles.bg} ${styles.text} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-xs`}>
                      <CategoryIcon category={tx.category} size={20} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Line 1: Title */}
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors truncate">
                        {tx.title}
                      </p>

                      {/* Line 2: Date + Compact Inline Badges */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-medium truncate">
                        <span className="shrink-0">{formatTxDate(tx.date, tx.time)}</span>

                        {/* Display itemized indicator badge */}
                        {hasItems && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(e, tx.id)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed-dim px-1.5 py-0.5 rounded-full border border-primary/10 transition-colors shrink-0 cursor-pointer"
                            title={`${tx.items?.length} ta mahsulot xaridi`}
                          >
                            <ShoppingBag size={11} />
                            {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        )}

                        {/* Soliq OFD Badge */}
                        {hasOfd && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(e, tx.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shrink-0 cursor-pointer transition-colors"
                            title={`Soliq OFD cheki ${tx.fiscalNumber ? `#${tx.fiscalNumber}` : ''}`}
                          >
                            <QrCode size={10} />
                            <span>OFD</span>
                          </button>
                        )}

                        {/* Display attached receipt badge - clicking views image */}
                        {tx.receiptImage && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewReceipt({ image: tx.receiptImage!, tx });
                            }}
                            className="inline-flex items-center justify-center p-1 rounded-full bg-violet-100 hover:bg-violet-200 dark:bg-violet-950/60 dark:hover:bg-violet-900/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 shrink-0 cursor-pointer transition-colors"
                            title="Biriktirilgan chek rasmini ko'rish"
                          >
                            <Camera size={11} />
                          </button>
                        )}

                        {/* Locked indicator */}
                        {isTransactionLocked(tx) && (
                          <span className="inline-flex items-center justify-center p-0.5 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0" title="Muhrlangan (24 soat o'tgan)">
                            <Lock size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Category/Expand chevron & Edit button */}
                  <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                    <p className={`font-extrabold text-sm sm:text-base tracking-tight font-tabular whitespace-nowrap ${
                      isExpense 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatSignedAmount(tx.amount, tx.type, currency)}
                    </p>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (canExpand) {
                            toggleExpand(e, tx.id);
                          }
                        }}
                        className={`flex items-center gap-1 group/cat rounded px-1 transition-colors ${
                          canExpand ? 'hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer' : ''
                        }`}
                        title={canExpand ? "Tafsilotlar va narsalar ro'yxatini ko'rish" : tx.category}
                      >
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 group-hover/cat:text-primary dark:group-hover/cat:text-primary-fixed-dim">
                          {tx.category}
                        </span>
                        {canExpand && (
                          <span className="text-gray-400 group-hover/cat:text-primary dark:group-hover/cat:text-primary-fixed-dim transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </button>

                      {/* Explicit Edit Pencil Icon Button */}
                      {onTransactionClick && (
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
                      )}
                    </div>
                  </div>
                </div>

                {/* PLUS FEATURE: Expandable list of spent items, OFD info, and receipt photo */}
                {canExpand && isExpanded && (
                  <div 
                    className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()} // Keep click on this area local to not open edit modal
                  >
                    {/* OFD QR Check Info Box */}
                    {hasOfd && (
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
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                          <ShoppingBag size={10} />
                          <span>Xarajat tafsilotlari (Nimalarga ishlatilgan)</span>
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
                      </div>
                    )}

                    {tx.receiptImage && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400 tracking-wider">
                          <Camera size={10} />
                          <span>Skaner qilingan chek rasmi</span>
                        </div>
                        <div 
                          onClick={() => setPreviewReceipt({ image: tx.receiptImage!, tx })}
                          className="relative group/img max-w-[200px] rounded-xl overflow-hidden border border-violet-200 dark:border-violet-800/40 cursor-pointer shadow-xs hover:shadow-md transition-all"
                        >
                          <img 
                            src={tx.receiptImage} 
                            alt="Chek rasmi" 
                            className="w-full h-24 object-cover group-hover/img:scale-105 transition-transform duration-200" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Camera size={14} />
                            <span>Kattalashtirish</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* "+ Yangi xarid qo'shish" card button */}
        <div 
          onClick={onAddClick}
          className="bg-white dark:bg-white/5 flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary-fixed-dim/50 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-all cursor-pointer group active:scale-[0.99] shadow-sm py-4.5 mt-1"
          id="add-new-transaction-card-btn"
        >
          <PlusCircle size={18} className="text-primary dark:text-primary-fixed-dim group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-primary dark:text-primary-fixed-dim">
            Yangi xarid qo'shish (Xarajat yoki Kirim)
          </span>
        </div>
      </div>

      {/* Receipt Image Modal Preview */}
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
    </section>
  );
};
