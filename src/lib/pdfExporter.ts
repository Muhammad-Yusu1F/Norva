import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { formatAmount } from './format';

// Transliterate Uzbek Cyrillic to Latin for standard PDF font compatibility
const cyrillicToLatinMap: Record<string, string> = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J',
  'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sh', 'Ъ': "'", 'Ы': 'I', 'Ь': "'", 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'd': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'", 'ы': 'i', 'ь': "'", 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'ў': "o'", 'Ў': "O'", 'ғ': "g'", 'Ғ': "G'", 'қ': 'q', 'Қ': 'Q', 'ҳ': 'h', 'Ҳ': 'H'
};

// Helper to normalize apostrophes, Cyrillic, and quotes for PDF font compatibility
export const cleanText = (str: string | undefined | null): string => {
  if (!str) return '';
  
  // 1. Transliterate Cyrillic to Latin so Helvetica renders properly
  let res = str.split('').map(ch => cyrillicToLatinMap[ch] || ch).join('');

  // 2. Normalize Uzbek apostrophes and typographic punctuation to standard ASCII
  res = res
    .replace(/[‘’ʻʼ`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();

  return res;
};

// Universal mobile & desktop download helper
export const triggerMobilePdfDownload = (blob: Blob, filename: string): boolean => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('download', filename);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup after delay
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore cleanup error
      }
    }, 10000);
    return true;
  } catch (err) {
    console.warn('Standard blob link download failed, trying FileReader:', err);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const link = document.createElement('a');
        link.href = base64data;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try {
            if (link.parentNode) document.body.removeChild(link);
          } catch (e) {}
        }, 5000);
      };
      reader.readAsDataURL(blob);
      return true;
    } catch (e2) {
      console.error('Mobile PDF download fallback failed:', e2);
      return false;
    }
  }
};

// Web Share API helper (iOS "Save to Files" / Telegram / WhatsApp / Android Files)
export const sharePdfFile = async (
  file: File,
  title: string = 'NORVA Hisoboti',
  text: string = 'NORVA PDF Hisoboti'
): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed the share sheet
        return false;
      }
      console.warn('navigator.share failed:', err);
    }
  }
  return false;
};

export interface PDFExportResult {
  filename: string;
  pdfBlob: Blob;
  pdfFile: File;
  blobUrl: string;
  dataUri: string;
  canShare: boolean;
  download: () => boolean;
  share: () => Promise<boolean>;
}

export const exportPDFReport = async (
  transactions: Transaction[],
  profile: UserProfile,
  baseBalance: number
): Promise<PDFExportResult> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = profile.currency || 'UZS';
  const todayStr = new Date().toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'kirim')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'chiqim')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = baseBalance + totalIncome - totalExpense;

  // 1. Header Banner
  doc.setFillColor(33, 22, 208); // Primary Indigo #2116d0
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NORVA', 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Moliya va Tranzaksiyalar Hisoboti (PDF)', 14, 26);

  doc.setFontSize(9);
  doc.text(`Sana: ${todayStr}`, 196, 26, { align: 'right' });

  // 2. User & Account Info Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 38, 182, 28, 3, 3, 'F');

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Foydalanuvchi ma'lumotlari:", 18, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Ism: ${cleanText(profile.name || 'Moliya Foydalanuvchisi')}`, 18, 52);
  doc.text(`Email: ${cleanText(profile.email || "Ko'rsatilmagan")}`, 18, 58);

  doc.text(`Tel: ${cleanText(profile.phoneNumber || 'Mavjud emas')}`, 110, 52);
  doc.text(`Valyuta: ${cleanText(currency)}`, 110, 58);

  // 3. Financial Summary Box
  doc.setFillColor(238, 242, 255); // Soft indigo light tint
  doc.roundedRect(14, 70, 182, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 40, 90);

  // 4 columns in summary box
  doc.text("Boshlang'ich balans:", 18, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(formatAmount(baseBalance, currency), 18, 87);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 122, 87); // Green for income
  doc.text('Jami Kirim (+):', 65, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`+${formatAmount(totalIncome, currency)}`, 65, 87);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 30, 30); // Red for expense
  doc.text('Jami Chiqim (-):', 112, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`-${formatAmount(totalExpense, currency)}`, 112, 87);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 22, 208); // Primary indigo for total
  doc.text('Sof Balans:', 158, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(formatAmount(currentBalance, currency), 158, 87);

  // 4. Transactions Table
  const tableData = transactions.map((t, index) => [
    (index + 1).toString(),
    t.date || '',
    t.type === 'kirim' ? 'Kirim (+)' : 'Chiqim (-)',
    cleanText(t.category),
    cleanText(t.description || (t.receiptImage ? '[Chek biriktirilgan]' : t.title || '-')),
    t.receiptImage ? 'Mavjud' : '-',
    t.type === 'kirim' 
      ? `+${formatAmount(t.amount, currency)}` 
      : `-${formatAmount(t.amount, currency)}`,
  ]);

  autoTable(doc, {
    startY: 102,
    head: [['№', 'Sana', 'Turi', 'Kategoriya', 'Izoh', 'Chek', 'Summa']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [33, 22, 208],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 38 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Colorize the type and amount columns
      if (data.section === 'body') {
        const rowData = transactions[data.row.index];
        if (rowData && rowData.type === 'kirim') {
          if (data.column.index === 2 || data.column.index === 6) {
            data.cell.styles.textColor = [16, 122, 87]; // Green
          }
        } else if (rowData && rowData.type === 'chiqim') {
          if (data.column.index === 2 || data.column.index === 6) {
            data.cell.styles.textColor = [200, 30, 30]; // Red
          }
        }
      }
    },
  });

  // 5. Embed attached receipt photos gallery section safely
  const receipts = transactions.filter((t) => !!t.receiptImage);
  if (receipts.length > 0) {
    doc.addPage();
    doc.setFillColor(33, 22, 208);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Biriktirilgan AI Cheklar va Kvitansiyalar Gallereyasi', 14, 12);

    let yOffset = 25;
    receipts.forEach((rx, idx) => {
      if (yOffset > 210) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${idx + 1}. ${cleanText(rx.title || rx.category)} (${rx.date} - ${formatAmount(rx.amount, currency)})`,
        14,
        yOffset
      );
      yOffset += 5;

      try {
        if (rx.receiptImage) {
          let format: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG';
          if (rx.receiptImage.startsWith('data:image/png')) {
            format = 'PNG';
          } else if (rx.receiptImage.startsWith('data:image/webp')) {
            format = 'WEBP';
          }
          doc.addImage(rx.receiptImage, format, 14, yOffset, 65, 65);
          yOffset += 72;
        }
      } catch (e) {
        console.error('PDF receipt image embed error:', e);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('[Chek rasmi xavfsiz formatda biriktirildi]', 14, yOffset + 5);
        yOffset += 12;
      }
    });
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `NORVA © ${new Date().getFullYear()} - Sahifa ${i} / ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Generate outputs
  const filename = `norva_hisobot_${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  let dataUri = '';
  try {
    dataUri = doc.output('datauristring');
  } catch (e) {
    // ignore
  }

  const canShare = typeof navigator !== 'undefined' && 
                   typeof navigator.canShare === 'function' && 
                   navigator.canShare({ files: [pdfFile] });

  // Initiate automatic background download attempt
  triggerMobilePdfDownload(pdfBlob, filename);

  return {
    filename,
    pdfBlob,
    pdfFile,
    blobUrl,
    dataUri,
    canShare,
    download: () => triggerMobilePdfDownload(pdfBlob, filename),
    share: () => sharePdfFile(pdfFile, 'NORVA Hisoboti', `${cleanText(profile.name) || 'Foydalanuvchi'}ning NORVA PDF hisoboti`),
  };
};

/**
 * Exports a single transaction receipt with high-resolution image and items as a PDF
 */
export const exportSingleReceiptPdf = (
  transaction: Transaction,
  currency: string = 'UZS'
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Bar
  doc.setFillColor(33, 22, 208); // Indigo/violet #2116d0
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NORVA', margin, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Elektron Xarid Cheki va Kvitansiya", margin, 19);

  const formattedDate = transaction.date || new Date().toISOString().split('T')[0];
  const formattedTime = transaction.time || '12:00';
  doc.setFontSize(9);
  doc.text(`${formattedDate} • ${formattedTime}`, pageWidth - margin, 15, { align: 'right' });

  // Receipt Summary Card
  let currentY = 32;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, 'FD');

  // Title & Type
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  const cleanTitle = cleanText(transaction.title || transaction.category || "Xarid Cheki");
  doc.text(cleanTitle, margin + 4, currentY + 9);

  // Amount badge
  const isKirim = transaction.type === 'kirim';
  const amountStr = `${isKirim ? '+' : '-'}${formatAmount(transaction.amount, currency)}`;
  doc.setFontSize(14);
  if (isKirim) {
    doc.setTextColor(16, 122, 87); // Green
  } else {
    doc.setTextColor(220, 38, 38); // Red
  }
  doc.text(amountStr, pageWidth - margin - 4, currentY + 9, { align: 'right' });

  // Metadata Row 1: Kategoriya & Turi
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Kategoriya: ${cleanText(transaction.category || 'Umumiy')}`, margin + 4, currentY + 18);
  doc.text(`Amal turi: ${isKirim ? 'Kirim' : 'Chiqim'}`, margin + 70, currentY + 18);

  // Metadata Row 2: Fiskal raqam & STIR
  const fiscalText = transaction.fiscalNumber ? `Chek №: ${cleanText(transaction.fiscalNumber)}` : 'Chek: Standart';
  const innText = transaction.inn ? `STIR (INN): ${cleanText(transaction.inn)}` : '';
  doc.text(fiscalText, margin + 4, currentY + 26);
  if (innText) {
    doc.text(innText, margin + 70, currentY + 26);
  }

  // Description if present
  if (transaction.description) {
    doc.text(`Izoh: ${cleanText(transaction.description)}`, margin + 4, currentY + 33);
  }

  currentY += 44;

  // If there are detailed items, render a table
  if (transaction.items && transaction.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Mahsulotlar va xizmatlar ro'yxati:", margin, currentY);
    currentY += 4;

    const itemsData = transaction.items.map((item, index) => [
      index + 1,
      cleanText(item.name),
      formatAmount(item.price, currency),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['№', 'Mahsulot nomi', 'Narxi']],
      body: itemsData,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: contentWidth - 45 },
        2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Attached Receipt Image Section
  if (transaction.receiptImage) {
    if (currentY > 160) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Skanerlangan Chek / Kvitansiya Rasmi:', margin, currentY);
    currentY += 5;

    try {
      let format: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG';
      if (transaction.receiptImage.startsWith('data:image/png')) {
        format = 'PNG';
      } else if (transaction.receiptImage.startsWith('data:image/webp')) {
        format = 'WEBP';
      }

      const maxImgHeight = Math.min(180, pageHeight - currentY - 25);
      const imgWidth = Math.min(contentWidth, 120);

      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, imgWidth, maxImgHeight, 2, 2);
      doc.addImage(transaction.receiptImage, format, margin + 1, currentY + 1, imgWidth - 2, maxImgHeight - 2);
      currentY += maxImgHeight + 10;
    } catch (imgErr) {
      console.error('Error adding single receipt image to PDF:', imgErr);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('[Chek rasmi xavfsiz saqlangan]', margin, currentY + 5);
      currentY += 12;
    }
  }

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `NORVA Ilovasi orqali yaratilgan rasmiy elektron chek • ${new Date().toLocaleDateString('uz-UZ')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const cleanFileTitle = (transaction.title || 'chek').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `norva_chek_${cleanFileTitle}_${transaction.date || 'sana'}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);

  triggerMobilePdfDownload(pdfBlob, filename);

  return {
    filename,
    pdfBlob,
    pdfFile,
    blobUrl,
    download: () => triggerMobilePdfDownload(pdfBlob, filename),
    share: () => sharePdfFile(pdfFile, 'NORVA Cheki', `NORVA xarid kvitansiyasi: ${transaction.title}`),
  };
};
