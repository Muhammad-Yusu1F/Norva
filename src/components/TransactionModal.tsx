/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Edit3, ShoppingBag, PlusCircle, Search, Lock, Camera, Sparkles, Loader2, Maximize2, CheckCircle2, Image as ImageIcon, QrCode, FileDown, Download, Eye } from 'lucide-react';
import jsQR from 'jsqr';
import { Transaction, TransactionType } from '../types';
import { formatAmount, isTransactionLocked } from '../lib/format';
import { CategoryIcon, getCategoryStyles } from './CategoryIcon';
import { LiveQrScanner } from './LiveQrScanner';
import { decodeQrFromImageElement, parseUzbekistanOfdQrClient } from '../lib/qrScanner';
import { exportSingleReceiptPdf } from '../lib/pdfExporter';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  editingTransaction?: Transaction | null;
  currency: string;
}

const CATEGORIES = [
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

const detectCategoryFromAI = (aiCategory?: string, titleStr?: string, itemsArr?: any[]): string => {
  const combinedText = [
    aiCategory || '',
    titleStr || '',
    ...(itemsArr ? itemsArr.map(i => i.name || '') : [])
  ].join(' ').toLowerCase();

  if (aiCategory) {
    const directMatch = CATEGORIES.find(c => 
      c.toLowerCase() === aiCategory.toLowerCase() ||
      aiCategory.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(aiCategory.toLowerCase())
    );
    if (directMatch) return directMatch;
  }

  if (/cola|fanta|sprite|pepsi|non|sut|qatiq|go'sht|gosht|supermarket|korzinka|makro|havas|bi1|shakar|guruch|suv|choy|oziq|bozor|sabzavot|meva|pishiriq|osh|nonxona/i.test(combinedText)) {
    return 'Oziq-ovqat';
  }
  if (/kafe|restoran|somsa|fastfood|lavash|burger|pizza|kofe|coffee|tushlik|kechki ovqat|shashlik/i.test(combinedText)) {
    return 'Kafe va Restoran';
  }
  if (/yandex|taxi|taksi|benzin|metan|propan|zapravka|avto|bus|metro|transport|moy/i.test(combinedText)) {
    return 'Transport';
  }
  if (/dorixona|apteka|dori|shifoxona|vrach|sog'liq|sogliq|klinika/i.test(combinedText)) {
    return 'Sog\'liq';
  }
  if (/beeline|ucell|uzmobile|mobicool|mobiuz|internet|telefon|payme|click/i.test(combinedText)) {
    return 'Telefon va Internet';
  }
  if (/tok|svet|gaz|suv|kommunal|musor|chiqindi/i.test(combinedText)) {
    return 'Kommunal to\'lovlar';
  }
  if (/shim|ko'ylak|koylak|poyabzal|oyoq kiyim|kiyim|bozor|zara/i.test(combinedText)) {
    return 'Kiyim-kechak';
  }
  if (/kitob|daftar|maktab|kurs|ta'lim|talim|universitet/i.test(combinedText)) {
    return 'Ta\'lim va Kitoblar';
  }
  if (/kino|teatr|park|o'yin|oyuk|cinema/i.test(combinedText)) {
    return 'Ko\'ngilochar';
  }

  return 'Oziq-ovqat';
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTransaction,
  currency
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('chiqim');
  const [category, setCategory] = useState('Oziq-ovqat');
  const [categorySearch, setCategorySearch] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // QR Receipt Scanner & Mode State
  const [inputMode, setInputMode] = useState<'qr' | 'manual'>('manual');
  const [isLiveQrOpen, setIsLiveQrOpen] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [qrData, setQrData] = useState<string | undefined>(undefined);
  const [fiscalNumber, setFiscalNumber] = useState<string | undefined>(undefined);
  const [inn, setInn] = useState<string | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [previewFullImage, setPreviewFullImage] = useState(false);

  // Process receipt image (from live camera snap, native phone camera, or gallery upload)
  const handleQrImageScan = async (base64Data: string, qrCodeText?: string) => {
    setIsLiveQrOpen(false);
    setInputMode('manual');
    setIsScanning(true);
    setError('');
    setScanSuccessMsg(null);
    setReceiptImage(base64Data);

    // If a QR code was already decoded locally from the image, pre-fill safe metadata (NOT amount)
    let fallbackOfd: any = null;
    if (qrCodeText) {
      fallbackOfd = parseUzbekistanOfdQrClient(qrCodeText);
      if (fallbackOfd.detectedTitle && fallbackOfd.detectedTitle !== "Do'kon xaridi" && fallbackOfd.detectedTitle !== "QR Xarid") {
        setTitle(fallbackOfd.detectedTitle);
      }
      if (fallbackOfd.detectedCategory) setCategory(detectCategoryFromAI(fallbackOfd.detectedCategory, fallbackOfd.detectedTitle));
      if (fallbackOfd.detectedDate) setDate(fallbackOfd.detectedDate);
      if (fallbackOfd.detectedTime) setTime(fallbackOfd.detectedTime);
      if (fallbackOfd.detectedDescription) setDescription(fallbackOfd.detectedDescription);
      if (fallbackOfd.fiscalNumber) setFiscalNumber(fallbackOfd.fiscalNumber);
      if (fallbackOfd.inn) setInn(fallbackOfd.inn);
      setQrData(qrCodeText);
    }

    try {
      const res = await fetch('/api/parse-qr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          qrData: qrCodeText || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData || !resData.success) {
        if (fallbackOfd && fallbackOfd.detectedAmount > 0) {
          setInputMode('manual');
          setAmount(formatInput(fallbackOfd.detectedAmount.toString()));
          setScanSuccessMsg(`⚡ Soliq OFD Cheki muvaffaqiyatli o'qildi! Summa: ${formatInput(fallbackOfd.detectedAmount.toString())} ${currency}`);
          return;
        }
        throw new Error(resData?.error || "Chekdan ma'lumotlarni o'qib bo'lmadi. Iltimos chekni yorug'roq joyda suratga oling.");
      }

      const data = resData.data;
      if (data.title && data.title !== "Do'kon xaridi" && data.title !== "QR Xarid") {
        setTitle(data.title);
      }
      if (data.amount && data.amount > 0) setAmount(formatInput(data.amount.toString()));
      if (data.category) setCategory(detectCategoryFromAI(data.category, data.title, data.items));
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      if (data.description) setDescription(data.description);
      if (data.type === 'kirim' || data.type === 'chiqim') setType(data.type);
      if (data.qrData) setQrData(data.qrData);
      if (data.fiscalNumber) setFiscalNumber(data.fiscalNumber);
      if (data.inn) setInn(data.inn);
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        setShowItemsEditor(true);
      }

      const formattedAmountStr = data.amount > 0 ? `${formatInput(data.amount.toString())} ${currency}` : '';
      const itemsCountStr = data.items && data.items.length > 0 ? ` (${data.items.length} ta mahsulot)` : '';
      setScanSuccessMsg(`⚡ Chek va mahsulotlar muvaffaqiyatli tahlil qilindi! Summa: ${formattedAmountStr}${itemsCountStr}`);
      setInputMode('manual');
    } catch (err: any) {
      if (fallbackOfd && fallbackOfd.detectedAmount > 0) {
        setInputMode('manual');
        setAmount(formatInput(fallbackOfd.detectedAmount.toString()));
        setScanSuccessMsg(`⚡ Soliq OFD Cheki muvaffaqiyatli o'qildi! Summa: ${formatInput(fallbackOfd.detectedAmount.toString())} ${currency}`);
      } else {
        setError(err?.message || "Rasmdan chek ma'lumotlarini aniqlashda xatolik yuz berdi.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Handle QR scan decoded data from real-time laser
  const handleQrScanSuccess = async (scannedCode: string, snapshotImage?: string) => {
    setIsLiveQrOpen(false);
    setInputMode('manual');
    setIsScanning(true);
    setError('');
    setScanSuccessMsg(null);
    if (snapshotImage) {
      setReceiptImage(snapshotImage);
    }

    // Parse client-side OFD parameters from QR string
    const clientData = parseUzbekistanOfdQrClient(scannedCode);
    if (clientData.detectedTitle && clientData.detectedTitle !== "Do'kon xaridi" && clientData.detectedTitle !== "QR Xarid") {
      setTitle(clientData.detectedTitle);
    }
    if (clientData.detectedCategory) setCategory(detectCategoryFromAI(clientData.detectedCategory, clientData.detectedTitle));
    if (clientData.detectedDate) setDate(clientData.detectedDate);
    if (clientData.detectedTime) setTime(clientData.detectedTime);
    if (clientData.detectedDescription) setDescription(clientData.detectedDescription);
    if (clientData.fiscalNumber) setFiscalNumber(clientData.fiscalNumber);
    if (clientData.inn) setInn(clientData.inn);
    setQrData(scannedCode);

    // Call server to analyze the receipt photo & QR data
    try {
      const res = await fetch('/api/parse-qr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: scannedCode,
          imageBase64: snapshotImage || undefined,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData && resData.success && resData.data) {
        const data = resData.data;
        if (data.title && data.title !== "Do'kon xaridi" && data.title !== "QR Xarid") {
          setTitle(data.title);
        }
        const verifiedAmount = (data.amount && data.amount > 0) ? data.amount : (clientData.detectedAmount > 0 ? clientData.detectedAmount : 0);
        if (verifiedAmount > 0) {
          setAmount(formatInput(verifiedAmount.toString()));
        }
        if (data.category) setCategory(detectCategoryFromAI(data.category, data.title, data.items));
        if (data.date) setDate(data.date);
        if (data.time) setTime(data.time);
        if (data.description) setDescription(data.description);
        if (data.fiscalNumber) setFiscalNumber(data.fiscalNumber);
        if (data.inn) setInn(data.inn);
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
          setShowItemsEditor(true);
        }

        if (verifiedAmount > 0) {
          setScanSuccessMsg(`⚡ Chek muvaffaqiyatli tahlil qilindi! Summa: ${formatInput(verifiedAmount.toString())} ${currency}`);
        } else {
          setScanSuccessMsg(`⚡ Soliq OFD Cheki (#${data.fiscalNumber || clientData.fiscalNumber || ''}) o'qildi! Chekda summa ko'rsatilmaganligi sababli summani qo'lda kiriting.`);
        }
      } else {
        if (clientData.detectedAmount > 0) {
          setAmount(formatInput(clientData.detectedAmount.toString()));
          setScanSuccessMsg(`⚡ Soliq OFD Cheki muvaffaqiyatli o'qildi! Summa: ${formatInput(clientData.detectedAmount.toString())} ${currency}`);
        } else {
          setScanSuccessMsg(`⚡ Soliq OFD Cheki o'qildi! Chekda summa ko'rsatilmaganligi sababli to'lov summasini kiriting.`);
        }
      }
    } catch {
      if (clientData.detectedAmount > 0) {
        setAmount(formatInput(clientData.detectedAmount.toString()));
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Handle QR code image file from gallery or direct native camera snap
  const handleQrFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInputMode('manual');
    setIsScanning(true);
    setError('');
    setScanSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setIsScanning(false);
        setError("Rasm faylini o'qib bo'lmadi.");
        return;
      }

      setReceiptImage(base64Data);

      const img = new Image();
      img.onload = async () => {
        try {
          let qrDetectedData = '';
          try {
            const qrResult = await decodeQrFromImageElement(img);
            if (qrResult && qrResult.data) {
              qrDetectedData = qrResult.data.trim();
            }
          } catch {}

          // Invoke AI receipt analysis to get store name, products, total sum, and date
          await handleQrImageScan(base64Data, qrDetectedData);
        } catch (err: any) {
          setError(err?.message || "Rasmdan chek ma'lumotlarini aniqlashda xatolik yuz berdi.");
          setIsScanning(false);
        }
      };

      img.onerror = () => {
        setIsScanning(false);
        setError("Rasm faylini ochib bo'lmadi.");
      };

      img.src = base64Data;
    };
    reader.readAsDataURL(file);

    // Reset input value so same image or camera can be re-triggered if user wants
    e.target.value = '';
  };

  // Helper to format raw input into dotted format for UZS or normal number
  const formatInput = (val: string): string => {
    // Remove all non-digit characters
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    
    if (currency === 'UZS' || currency === 'so\'m' || currency === 'som' || currency === 'soʻm') {
      // Format with dot separators (e.g., 10.000)
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(parseInt(clean, 10)).replace(/,/g, '.');
    }
    
    return clean;
  };

  // Plus Feature: Detailed Itemized List Tracker (Nimalarga ishlatilgani)
  const [items, setItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showItemsEditor, setShowItemsEditor] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update fields when editingTransaction changes
  useEffect(() => {
    setCategorySearch('');
    setShowDeleteConfirm(false);
    setScanSuccessMsg(null);
    setPreviewFullImage(false);

    if (editingTransaction) {
      setInputMode('manual');
      setTitle(editingTransaction.title);
      setAmount(formatInput(editingTransaction.amount.toString()));
      setType(editingTransaction.type);
      
      let initialCat = editingTransaction.category;
      if (initialCat === 'Ijara') {
        initialCat = 'Ijara va Uy';
      }
      setCategory(initialCat);
      
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
      setDescription(editingTransaction.description || '');
      setReceiptImage(editingTransaction.receiptImage);
      setQrData(editingTransaction.qrData);
      setFiscalNumber(editingTransaction.fiscalNumber);
      setInn(editingTransaction.inn);
      
      if (editingTransaction.items && editingTransaction.items.length > 0) {
        setItems(editingTransaction.items);
        setShowItemsEditor(true);
      } else {
        setItems([]);
        setShowItemsEditor(false);
      }
    } else {
      // Defaults for a new transaction
      setInputMode('manual');
      setTitle('');
      setAmount('');
      setType('chiqim');
      setCategory('Oziq-ovqat');
      setDate(new Date().toISOString().split('T')[0]);
      
      const now = new Date();
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      setTime(`${HH}:${MM}`);
      
      setDescription('');
      setReceiptImage(undefined);
      setQrData(undefined);
      setFiscalNumber(undefined);
      setInn(undefined);
      setItems([]);
      setShowItemsEditor(false);
    }
    setNewItemName('');
    setNewItemPrice('');
    setError('');
  }, [editingTransaction, isOpen]);

  // Adjust default category based on type selection
  const handleTypeChange = (selectedType: TransactionType) => {
    setType(selectedType);
    if (selectedType === 'kirim') {
      setCategory('Maosh'); // default for income
    } else {
      setCategory('Oziq-ovqat'); // default for expense
    }
  };

  // Add sub-item to the itemized list
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      setError('Mahsulot nomini kiritishingiz lozim.');
      return;
    }
    const cleanPriceStr = newItemPrice.replace(/\./g, '');
    const parsedPrice = parseFloat(cleanPriceStr);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Narxi musbat son bo\'lishi lozim.');
      return;
    }

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newItemName.trim(),
      price: parsedPrice
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    // Auto calculate and update the total amount field
    const sum = updatedItems.reduce((acc, curr) => acc + curr.price, 0);
    setAmount(formatInput(currency === 'UZS' ? Math.round(sum).toString() : sum.toFixed(2)));

    // Reset item inputs
    setNewItemName('');
    setNewItemPrice('');
    setError('');
  };

  // Remove sub-item
  const handleRemoveItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    
    const sum = updatedItems.reduce((acc, curr) => acc + curr.price, 0);
    setAmount(sum > 0 ? formatInput(currency === 'UZS' ? Math.round(sum).toString() : sum.toFixed(2)) : '');
  };

  const isLocked = isTransactionLocked(editingTransaction);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');

    if (!title.trim()) {
      setError('Sarlavha kiritilishi shart!');
      return;
    }

    const cleanAmountStr = amount.replace(/\./g, '');
    const parsedAmount = parseFloat(cleanAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Miqdor musbat son bo\'lishi shart!');
      return;
    }

    if (!date) {
      setError('Sana kiritilishi shart!');
      return;
    }

    if (!time) {
      setError('Vaqt kiritilishi shart!');
      return;
    }

    onSave({
      id: editingTransaction?.id,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date,
      time,
      description: description.trim() || undefined,
      items: showItemsEditor && items.length > 0 ? items : undefined,
      receiptImage: receiptImage || undefined,
      qrData: qrData || undefined,
      fiscalNumber: fiscalNumber || undefined,
      inn: inn || undefined,
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-[#131b2e]/60 dark:bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content Card */}
      <div className="relative bg-white dark:bg-[#131b2e] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all duration-300 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {editingTransaction ? (
              <Edit3 size={18} className="text-primary dark:text-primary-fixed-dim" />
            ) : (
              <Plus size={18} className="text-primary dark:text-primary-fixed-dim" />
            )}
            <h3 className="font-bold text-gray-900 dark:text-white">
              {editingTransaction ? 'Amalni tahrirlash' : 'Yangi amal qo\'shish'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          
          {/* 24-Hour Locked Notice Banner */}
          {isLocked && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
              <Lock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-950 dark:text-amber-100 flex items-center gap-1">
                  <span>🔒 24 Soat O'tdi — Tarixda Muhrlangan</span>
                </p>
                <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Operatsiya yozilganidan so'ng 24 soat to'lgani sababli, uning summasi va nomi doimiy ravishda bloklangan. Moliyaviy halollik va xavfsizlik uchun uni o'zgartirib yoki o'chirib bo'lmaydi.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-semibold border border-rose-100 dark:border-rose-950">
              {error}
            </div>
          )}

          {/* Scan Success Alert */}
          {scanSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-[11px]">{scanSuccessMsg}</span>
              <button type="button" onClick={() => setScanSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer">
                <X size={12} />
              </button>
            </div>
          )}

          {isScanning ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 animate-spin" />
                <Camera className="absolute inset-0 m-auto text-emerald-600 dark:text-emerald-400 animate-pulse" size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Chek tahlil qilinmoqda...
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-xs">
                  Iltimos kuting, chekdagi summa aniqlanmoqda...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
            {/* Quick Actions: Direct QR Scan & Photo Attach */}
            {!isLocked && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveQrOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <QrCode size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>⚡ QR-kod Skaner</span>
                </button>
                <label className="py-2.5 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs text-center">
                  <Camera size={15} className="text-violet-600 dark:text-violet-400" />
                  <span>📸 Chek Rasmini Olish</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrFileScan}
                    className="hidden"
                  />
                </label>
              </div>
            )}

              {/* Soliq OFD Check Attached Badge */}
              {(fiscalNumber || qrData) && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <QrCode size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 truncate">
                        ⚡ Soliq OFD Cheki biriktirildi
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                        {fiscalNumber ? `Fiskal chek: #${fiscalNumber}` : 'QR-kod ma\'lumotlari'} {inn ? `(STIR: ${inn})` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold shrink-0 ml-2">
                    Saqlanadi
                  </span>
                </div>
              )}

              {/* Attached Receipt Image Card */}
              {receiptImage && (
                <div className="bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={receiptImage}
                      alt="Chek rasmi"
                      onClick={() => setPreviewFullImage(true)}
                      className="w-12 h-12 object-cover rounded-lg border border-violet-300 dark:border-violet-700 cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-violet-950 dark:text-violet-200 flex items-center gap-1.5">
                        <Camera size={13} className="text-violet-600 dark:text-violet-400" />
                        Chek rasmi saqlandi
                      </p>
                      <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80 font-medium truncate">
                        Kvitansiya rasmi doimiy saqlanadi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewFullImage(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Chekni kattalashtirib ko'rish"
                    >
                      <Eye size={13} />
                      <span className="hidden sm:inline">Ko'rish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportSingleReceiptPdf(
                          {
                            id: editingTransaction?.id || 'new',
                            title: title || 'Chek',
                            amount: parseFloat(amount.replace(/\./g, '')) || 0,
                            type,
                            category,
                            date,
                            time,
                            description,
                            items,
                            receiptImage,
                            fiscalNumber,
                            inn,
                            qrData,
                          },
                          currency
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Chekni PDF formatida yuklab olish"
                    >
                      <FileDown size={13} />
                      <span>PDF</span>
                    </button>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => setReceiptImage(undefined)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Rasmni olib tashlash"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Type Toggle: Kirim / Chiqim */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleTypeChange('chiqim')}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                    type === 'chiqim'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Chiqim (Expense)
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleTypeChange('kirim')}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                    type === 'kirim'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Kirim (Income)
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Amal sarlavhasi
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder="Masalan: Yandex Go, Tushlik, Supermarket"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim ${
                    isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-white/10' : ''
                  }`}
                />
              </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Summa ({currency})
              </label>
              {showItemsEditor && (
                <span className="text-[10px] text-primary dark:text-primary-fixed-dim font-bold">
                  * Mahsulotlar summasidan hisoblandi
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-400 dark:text-gray-500 text-sm font-semibold select-none">
                {currency}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(formatInput(e.target.value))}
                disabled={showItemsEditor || isLocked}
                className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim font-tabular ${
                  currency.length > 1 ? 'pl-16' : 'pl-8'
                } ${
                  showItemsEditor || isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-white/10' : ''
                }`}
              />
            </div>
          </div>


          {/* PLUS FEATURE: Itemized Purchase List Toggle */}
          <div className="bg-primary/5 dark:bg-white/5 p-4 rounded-xl border border-primary/20 dark:border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-primary dark:text-primary-fixed-dim" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Batafsil mahsulotlar (Plus funksiya)
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setShowItemsEditor(!showItemsEditor);
                  if(!showItemsEditor && amount) {
                    // prefill with single item
                    setItems([{
                      id: `item-${Date.now()}`,
                      name: title.trim() || 'Xarid predmeti',
                      price: parseFloat(amount.replace(/\./g, '')) || 0
                    }]);
                  }
                }}
                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  showItemsEditor
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-950/30'
                    : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-fixed-dim border-primary/20'
                }`}
              >
                {showItemsEditor ? "Yopish" : "Yoqish"}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Ushbu xaridga tegishli barcha alohida narsalarni va ularning narxini kiriting. Ilova nimalarga ishlatganingizni aniq saqlab beradi.
            </p>

            {showItemsEditor && (
              <div className="space-y-3 pt-2">
                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white dark:bg-[#131b2e] p-2 rounded-lg border border-gray-150 dark:border-white/5 text-xs">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white font-tabular">
                            {formatAmount(item.price, currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Item Row Inputs */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Masalan: Sut, Non, Taksi"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <div className={`relative ${currency.length > 1 ? 'w-28' : 'w-20'}`}>
                    <span className="absolute left-2 top-1.5 text-gray-400 text-[10px] sm:text-xs select-none">
                      {currency}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(formatInput(e.target.value))}
                      className={`w-full bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-white/10 rounded-lg pr-1.5 py-1.5 text-xs text-gray-900 dark:text-white font-tabular placeholder-gray-400 ${
                        currency.length > 1 ? 'pl-11' : 'pl-5'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-primary dark:bg-primary-container text-white p-2 rounded-lg hover:bg-primary/95 transition-colors cursor-pointer shrink-0"
                    title="Mahsulot qo'shish"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category Selector with Search and Beautiful Icons */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Kategoriya tanlash
              </label>
              {category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim flex items-center gap-1">
                  <CategoryIcon category={category} size={11} />
                  {category}
                </span>
              )}
            </div>

            {/* Category Search Input */}
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Kategoriyani qidirish..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Scrollable Categories Grid */}
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1 pb-1 scrollbar-thin">
              {CATEGORIES.filter(cat => 
                cat.toLowerCase().includes(categorySearch.toLowerCase())
              ).map((cat) => {
                const styles = getCategoryStyles(cat);
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary dark:border-primary-fixed-dim bg-primary/5 dark:bg-white/10 shadow-sm ring-1 ring-primary'
                        : 'border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${styles.bg} ${styles.text} shrink-0`}>
                      <CategoryIcon category={cat} size={14} />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {cat}
                    </span>
                  </button>
                );
              })}
              {CATEGORIES.filter(cat => 
                cat.toLowerCase().includes(categorySearch.toLowerCase())
              ).length === 0 && (
                <div className="col-span-full py-4 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                  Kategoriya topilmadi
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Sana
              </label>
              <input
                type="date"
                disabled={isLocked}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim ${
                  isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-white/10' : 'cursor-pointer'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Vaqt
              </label>
              <input
                type="time"
                disabled={isLocked}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim ${
                  isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-white/10' : 'cursor-pointer'
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Izoh (Ixtiyoriy)
            </label>
            <textarea
              placeholder="Xarid tafsilotlari..."
              disabled={isLocked}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-1 focus:ring-primary dark:focus:ring-primary-fixed-dim resize-none ${
                isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-white/10' : ''
              }`}
            />
          </div>

          {/* Action Buttons */}
          {isLocked ? (
            <div className="pt-3 border-t border-gray-100 dark:border-white/5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/50 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Lock size={16} className="text-amber-600 dark:text-amber-400" />
                <span>O'zgartirish Muhrlangan (24 Soat O'tgan) • Yopish</span>
              </button>
            </div>
          ) : showDeleteConfirm ? (
            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-950/40 space-y-3 animate-in fade-in duration-200 shrink-0">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold text-center flex items-center justify-center gap-1.5">
                <Trash2 size={14} className="animate-bounce" />
                Ushbu amalni o'chirishni tasdiqlaysizmi?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingTransaction && onDelete) {
                      onDelete(editingTransaction.id);
                      onClose();
                    }
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 duration-100"
                >
                  Ha, o'chirilsin
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 duration-100"
                >
                  Yo'q, qolsin
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-white/5 shrink-0">
              {editingTransaction && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-950/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm font-bold transition-all cursor-pointer active:scale-95 duration-100"
                  title="Amalni o'chirish"
                >
                  <Trash2 size={16} />
                </button>
              )}
              
              <button
                type="submit"
                className="flex-1 bg-primary dark:bg-primary-container text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 dark:shadow-primary-container/10 hover:bg-primary/95 dark:hover:bg-primary-container/90 transition-all cursor-pointer active:scale-[0.98] duration-100 flex items-center justify-center gap-2"
              >
                <span>Saqlash</span>
              </button>
            </div>
          )}


          </div>
          )}

        </form>
      </div>

      {/* Full-Size Receipt Lightbox Modal */}
      {previewFullImage && receiptImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewFullImage(false)}
        >
          <div 
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Camera size={16} className="text-violet-400" />
                Biriktirilgan chek rasmi
              </span>
              <button
                type="button"
                onClick={() => setPreviewFullImage(false)}
                className="text-white hover:text-gray-300 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <img
              src={receiptImage}
              alt="Chek to'liq rasmi"
              className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => {
                  exportSingleReceiptPdf(
                    {
                      id: editingTransaction?.id || 'new',
                      title: title || 'Chek',
                      amount: parseFloat(amount.replace(/\./g, '')) || 0,
                      type,
                      category,
                      date,
                      time,
                      description,
                      items,
                      receiptImage,
                      fiscalNumber,
                      inn,
                      qrData,
                    },
                    currency
                  );
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <FileDown size={15} />
                <span>PDF qilib yuklab olish</span>
              </button>

              <a
                href={receiptImage}
                download={`chek_${date}_${title || 'rasm'}.jpg`}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Download size={15} />
                <span>Rasmni saqlash</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewFullImage(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live QR Camera Scanner Overlay */}
      {isLiveQrOpen && (
        <LiveQrScanner
          onScanSuccess={handleQrScanSuccess}
          onScanImage={handleQrImageScan}
          onClose={() => setIsLiveQrOpen(false)}
        />
      )}
    </div>
  );
};
