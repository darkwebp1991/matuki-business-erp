import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatementParty {
  name: string;
  code?: string;
  mobile?: string;
  address?: string;
  gstin?: string;
}

interface StatementEntry {
  id?: number;
  entry_date: string;
  voucher_type: string;
  voucher_no?: string;
  notes?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

interface StatementReportData {
  party?: StatementParty;
  party_type: 'CUSTOMER' | 'SUPPLIER';
  party_id: number;
  startDate?: string;
  endDate?: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  entries: StatementEntry[];
}

// Clean helper to format PDF currency amounts as clean whole numbers WITHOUT trailing .00 or unicode '¹' superscript
export const formatPdfNum = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num) || num === 0) return '-';
  const rounded = Math.round(num);
  return rounded.toLocaleString('en-IN');
};

export const formatPdfNumBold = (val: number | string | null | undefined): string => {
  const num = Number(val || 0);
  const rounded = Math.round(num);
  return rounded.toLocaleString('en-IN');
};

// Clean helper to sanitize non-ASCII or Gujarati text for jsPDF standard Helvetica font
const sanitizePdfText = (text: string | undefined | null): string => {
  if (!text) return '';
  // Remove non-ASCII characters that cause font corruption in jsPDF standard fonts
  const cleaned = text.replace(/[^\x00-\x7F]/g, '').trim();
  return cleaned || '';
};

const formatDatePdf = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
};

export const generateAndDownloadPartyStatementPDF = (
  reportData: StatementReportData,
  startDate: string,
  endDate: string,
  settings?: any
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const party = reportData.party || { name: 'Party' };
  const isCustomer = reportData.party_type === 'CUSTOMER';
  const partyTypeName = isCustomer ? 'CUSTOMER' : 'SUPPLIER';

  const sanitizedName = party.name || 'N/A';
  const sanitizedAddress = sanitizePdfText(party.address) || 'Surat, Gujarat';

  // Dynamic Store Profile Settings
  const bName = (settings?.business_name || 'MATUKI SWEETS').trim();
  const bSubtitle = (settings?.subtitle || 'Catering Wholesale & Sweets Manufacturer').trim();
  const bAddress = (settings?.address || 'Katargam, Surat, Gujarat').trim();
  const bMobile = settings?.mobile ? ` | Phone: ${settings.mobile}` : '';
  const logoText = (bName || 'MS').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() || 'MS';

  // 1. BRAND HEADER (Top Bar)
  doc.setFillColor(211, 47, 47); // Crimson Red Logo Box
  doc.rect(14, 12, 12, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(logoText, 20, 20, { align: 'center' });

  doc.setTextColor(15, 23, 42); // Dark Navy Header Text
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizePdfText(bName).toUpperCase(), 30, 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(sanitizePdfText(`${bAddress}${bMobile}`), 30, 23);
  if (bSubtitle) {
    doc.text(sanitizePdfText(bSubtitle), 30, 27);
  }

  // Statement Badge (Right Top)
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(135, 12, 61, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PARTY STATEMENT OF ACCOUNT', 165.5, 17.5, { align: 'center' });

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Period: ${formatDatePdf(startDate)} to ${formatDatePdf(endDate)}`, 196, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 28, { align: 'right' });

  // Top Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // 2. PARTY PROFILE BOX
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 22, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 35, 182, 22, 1.5, 1.5, 'S');

  // Party Name & Code
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`${partyTypeName} DETAILS:`, 18, 40);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizedName, 18, 46);

  if (party.code) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Code: ${party.code}`, 18, 52);
  }

  // Contact Info
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Mobile: ${party.mobile || 'N/A'}`, 100, 42);
  doc.text(`Address: ${sanitizedAddress}`, 100, 47);
  if (party.gstin) {
    doc.text(`GSTIN: ${party.gstin}`, 100, 52);
  }

  // Type Tag Badge
  doc.setFillColor(isCustomer ? 240 : 239, isCustomer ? 253 : 246, isCustomer ? 244 : 255);
  doc.roundedRect(158, 38, 34, 6, 1, 1, 'F');
  doc.setTextColor(isCustomer ? 21 : 30, isCustomer ? 128 : 64, isCustomer ? 61 : 175);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(isCustomer ? 'CUSTOMER KHATA' : 'SUPPLIER KHATA', 175, 42.5, { align: 'center' });

  // 3. FINANCIAL METRICS TILES (Clean Numbers - NO superscript '¹')
  const startYTiles = 60;
  const tileWidth = 43.5;
  const tileGap = 2.6;

  // Opening Balance Tile
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startYTiles, tileWidth, 14, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startYTiles, tileWidth, 14, 1, 1, 'S');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OPENING BALANCE', 18, startYTiles + 4.5);
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);
  doc.text(formatPdfNumBold(reportData.opening_balance), 18, startYTiles + 10.5);

  // Total Debit Tile
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14 + tileWidth + tileGap, startYTiles, tileWidth, 14, 1, 1, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14 + tileWidth + tileGap, startYTiles, tileWidth, 14, 1, 1, 'S');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DEBIT (+ INVOICE)', 18 + tileWidth + tileGap, startYTiles + 4.5);
  doc.setFontSize(9.5);
  doc.text(`+ ${formatPdfNumBold(reportData.total_debit)}`, 18 + tileWidth + tileGap, startYTiles + 10.5);

  // Total Credit Tile
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14 + (tileWidth + tileGap) * 2, startYTiles, tileWidth, 14, 1, 1, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14 + (tileWidth + tileGap) * 2, startYTiles, tileWidth, 14, 1, 1, 'S');
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL CREDIT (- PAYMENT)', 18 + (tileWidth + tileGap) * 2, startYTiles + 4.5);
  doc.setFontSize(9.5);
  doc.text(`- ${formatPdfNumBold(reportData.total_credit)}`, 18 + (tileWidth + tileGap) * 2, startYTiles + 10.5);

  // Net Closing Balance Tile
  const isClosingDue = reportData.closing_balance > 0;
  doc.setFillColor(isClosingDue ? 254 : 240, isClosingDue ? 242 : 253, isClosingDue ? 242 : 244);
  doc.roundedRect(14 + (tileWidth + tileGap) * 3, startYTiles, tileWidth, 14, 1, 1, 'F');
  doc.setDrawColor(isClosingDue ? 254 : 187, isClosingDue ? 202 : 247, isClosingDue ? 202 : 208);
  doc.roundedRect(14 + (tileWidth + tileGap) * 3, startYTiles, tileWidth, 14, 1, 1, 'S');
  doc.setTextColor(isClosingDue ? 220 : 21, isClosingDue ? 38 : 128, isClosingDue ? 38 : 61);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(isCustomer ? (isClosingDue ? 'NET DUE (RECEIVABLE)' : 'ADVANCE / CLEARED') : (isClosingDue ? 'NET PAYABLE' : 'CLEARED'), 18 + (tileWidth + tileGap) * 3, startYTiles + 4.5);
  doc.setFontSize(10);
  doc.text(`${formatPdfNumBold(Math.abs(reportData.closing_balance))} ${reportData.closing_balance > 0 ? 'Dr' : 'Cr'}`, 18 + (tileWidth + tileGap) * 3, startYTiles + 10.5);

  // 4. LEDGER ENTRIES TABLE (Wide, Non-Overlapping Columns)
  const tableRows: any[] = [];

  // Opening balance row
  if (reportData.opening_balance !== 0) {
    tableRows.push([
      '-',
      formatDatePdf(startDate),
      'OPENING',
      '-',
      'Beginning Opening Balance',
      reportData.opening_balance > 0 ? formatPdfNumBold(reportData.opening_balance) : '-',
      reportData.opening_balance < 0 ? formatPdfNumBold(Math.abs(reportData.opening_balance)) : '-',
      `${formatPdfNumBold(Math.abs(reportData.opening_balance))} ${reportData.opening_balance > 0 ? 'Dr' : 'Cr'}`
    ]);
  }

  (reportData.entries || []).forEach((e, idx) => {
    const isDebit = Number(e.debit_amount) > 0;
    const isCredit = Number(e.credit_amount) > 0;

    let typeStr = e.voucher_type || 'VOUCHER';
    if (e.voucher_type === 'SALE') typeStr = 'SALE INVOICE';
    else if (e.voucher_type === 'PAYMENT_RECEIVED' || e.voucher_type === 'PAYMENT_IN') typeStr = 'PAYMENT IN (JAMAA)';
    else if (e.voucher_type === 'PAYMENT_MADE' || e.voucher_type === 'PAYMENT_OUT') typeStr = 'PAYMENT OUT (UDHAR)';
    else if (e.voucher_type === 'SALES_RETURN' || e.voucher_type === 'CREDIT_NOTE') typeStr = 'CREDIT NOTE (RETURN)';
    else if (e.voucher_type === 'PURCHASE_RETURN' || e.voucher_type === 'DEBIT_NOTE') typeStr = 'DEBIT NOTE (RETURN)';
    else if (e.voucher_type === 'PURCHASE') typeStr = 'PURCHASE BILL';

    const cleanNotes = sanitizePdfText(e.notes) || '-';

    tableRows.push([
      idx + 1,
      formatDatePdf(e.entry_date),
      typeStr,
      e.voucher_no || '-',
      cleanNotes,
      isDebit ? formatPdfNumBold(e.debit_amount) : '-',
      isCredit ? formatPdfNumBold(e.credit_amount) : '-',
      `${formatPdfNumBold(Math.abs(e.running_balance))} ${e.running_balance > 0 ? 'Dr' : 'Cr'}`
    ]);
  });

  // Summary Row
  tableRows.push([
    '',
    '',
    'TOTAL',
    '',
    `Total Activity (${formatDatePdf(startDate)} to ${formatDatePdf(endDate)})`,
    formatPdfNumBold(reportData.total_debit),
    formatPdfNumBold(reportData.total_credit),
    `${formatPdfNumBold(Math.abs(reportData.closing_balance))} ${reportData.closing_balance > 0 ? 'Dr' : 'Cr'}`
  ]);

  autoTable(doc, {
    head: [['#', 'DATE', 'TYPE', 'VOUCHER #', 'PARTICULARS / NOTES', 'DEBIT (Rs)', 'CREDIT (Rs)', 'BALANCE (Rs)']],
    body: tableRows,
    startY: startYTiles + 18,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 26, fontStyle: 'bold' },
      4: { cellWidth: 'auto' },
      5: { halign: 'right', cellWidth: 26, textColor: [30, 64, 175] },
      6: { halign: 'right', cellWidth: 26, textColor: [21, 128, 61] },
      7: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: (data) => {
      // Highlight final summary row
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // 5. SIGNATURE & FOOTER BLOCK
  const finalY = (doc as any).lastAutoTable.finalY || 240;
  const sigY = Math.min(finalY + 14, 265);

  if (sigY > 260) {
    doc.addPage();
  }

  const effectiveSigY = sigY > 260 ? 30 : sigY;

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(20, effectiveSigY + 12, 70, effectiveSigY + 12);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Customer / Receiver Signature', 45, effectiveSigY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Account Balance Confirmation', 45, effectiveSigY + 20, { align: 'center' });

  // Authorized Signatory (Right)
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`For, ${sanitizePdfText(bName).toUpperCase()}`, 165, effectiveSigY + 4, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.line(140, effectiveSigY + 12, 190, effectiveSigY + 12);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory', 165, effectiveSigY + 16, { align: 'center' });

  // Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} | Computer Generated Statement | ${sanitizePdfText(bName)} ERP`,
      105,
      290,
      { align: 'center' }
    );
  }

  // 6. SAVE PDF DIRECTLY TO LOCAL DISK
  const safePartyName = (party.name || 'Party').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Statement_${safePartyName}_${startDate}_to_${endDate}.pdf`;
  doc.save(fileName);
};

export const createWhatsAppStatementShareLink = (
  reportData: StatementReportData,
  startDate: string,
  endDate: string,
  settings?: any
): string => {
  const party = reportData.party || { name: 'Valued Customer' };
  const rawMobile = party.mobile || '';
  const cleanMobile = rawMobile.replace(/\D/g, '');
  const phoneParam = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

  const bName = (settings?.business_name || 'MATUKI SWEETS').trim();
  const bPhone = settings?.mobile ? ` at ${settings.mobile}` : '';

  const isClosingDue = reportData.closing_balance > 0;
  const balanceText = isClosingDue 
    ? `*Net Balance Due:* Rs. ${formatPdfNumBold(Math.abs(reportData.closing_balance))} (To Collect)`
    : `*Account Status:* Settled / Advance (Rs. ${formatPdfNumBold(Math.abs(reportData.closing_balance))})`;

  const message = [
    `*${bName.toUpperCase()} - STATEMENT OF ACCOUNT*`,
    `=============================`,
    `*Party:* ${party.name}`,
    `*Period:* ${formatDatePdf(startDate)} to ${formatDatePdf(endDate)}`,
    `-----------------------------`,
    `*Opening Balance:* Rs. ${formatPdfNumBold(reportData.opening_balance)}`,
    `*Total Debits (Invoices):* + Rs. ${formatPdfNumBold(reportData.total_debit)}`,
    `*Total Credits (Payments/Returns):* - Rs. ${formatPdfNumBold(reportData.total_credit)}`,
    `-----------------------------`,
    balanceText,
    `=============================`,
    `_Kindly review your account statement PDF. For any queries, contact ${bName}${bPhone}._`,
    `_Thank you for your business!_`
  ].join('\n');

  const encodedMsg = encodeURIComponent(message);
  if (phoneParam) {
    return `https://wa.me/${phoneParam}?text=${encodedMsg}`;
  }
  return `https://web.whatsapp.com/send?text=${encodedMsg}`;
};
