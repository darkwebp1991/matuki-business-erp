const fs = require('fs');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned ${filePath}`);
}

// 1. InvoiceDetailsModal.tsx
replaceInFile('src/components/sales/InvoiceDetailsModal.tsx', [
  ['*🧾 MATUKI SWEETS - વેચાણ બિલ*', '*🧾 MATUKI SWEETS - Sale Invoice*'],
  ['*ઇન્વોઇસ નં:*', '*Invoice #:*'],
  ['*તારીખ:*', '*Date:*'],
  ['*ગ્રાહક:*', '*Customer:*'],
  ['*આઈટમ વિગત:*', '*Items Summary:*'],
  ['*કુલ બિલ રકમ:*', '*Grand Total:*'],
  ['*જમા રકમ:*', '*Paid Amount:*'],
  ['*બાકી રકમ:*', '*Balance Due:*'],
  ['આભાર! શ્રી માતુકી સ્વીટ્સ એન્ડ કેટરર્સ', 'Thank you! Matuki Sweets & Caterers'],
  ['Invoice Details (વેચાણ બિલ વિગત)', 'Invoice Details'],
  ['<Printer size={14} /> 🖨️ Print Bill (પ્રિન્ટ)', '<Printer size={14} /> 🖨️ Print Bill'],
  ['ઇન્વોઇસ લોડ થઈ રહ્યું છે...', 'Loading invoice...'],
  ['<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#64748b\', textTransform: \'uppercase\' }}>બિલ સ્ટેટસ (Status)</span>', '<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#64748b\', textTransform: \'uppercase\' }}>Status</span>'],
  ['✅ FULLY PAID (ચુકતે)', '✅ FULLY PAID'],
  ['⚠️ PARTIAL PAID (અડધું જમા)', '⚠️ PARTIAL PAID'],
  ['⏳ UNPAID (બાકી)', '⏳ UNPAID'],
  ['<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#64748b\', textTransform: \'uppercase\' }}>કુલ બિલ રકમ (Grand Total)</span>', '<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#64748b\', textTransform: \'uppercase\' }}>Grand Total</span>'],
  ['<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#16a34a\', textTransform: \'uppercase\' }}>મળેલ જમા (Received)</span>', '<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#16a34a\', textTransform: \'uppercase\' }}>Received Amount</span>'],
  ['<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#dc2626\', textTransform: \'uppercase\' }}>બાકી રકમ (Balance Due)</span>', '<span style={{ fontSize: \'0.72rem\', fontWeight: 800, color: \'#dc2626\', textTransform: \'uppercase\' }}>Balance Due</span>'],
  ['ગ્રાહક વિગત (Customer Info)', 'Customer Info'],
  ['<span style={{ color: \'#64748b\' }}>તારીખ (Date):</span>', '<span style={{ color: \'#64748b\' }}>Date:</span>'],
  ['<span style={{ color: \'#64748b\' }}>ચૂકવણી મોડ (Mode):</span>', '<span style={{ color: \'#64748b\' }}>Payment Mode:</span>'],
  ['<span style={{ color: \'#64748b\' }}>ડિલિવરી સ્થળ:</span>', '<span style={{ color: \'#64748b\' }}>Delivery Venue:</span>'],
  ['<span>રિક્ષા ડ્રાઈવર:</span>', '<span>Driver:</span>'],
  ['વેચાણ મીઠાઈ આઈટમ્સ (Items Breakdown)', 'Ordered Items Breakdown'],
  ['<th style={{ textAlign: \'left\', padding: \'6px 10px\' }}>આઈટમનું નામ</th>', '<th style={{ textAlign: \'left\', padding: \'6px 10px\' }}>Item Name</th>'],
  ['<th style={{ textAlign: \'center\', padding: \'6px 6px\', width: \'150px\' }}>વાસણ / પેકિંગ</th>', '<th style={{ textAlign: \'center\', padding: \'6px 6px\', width: \'150px\' }}>Packing / Utensils</th>'],
  ['<th style={{ textAlign: \'center\', padding: \'6px 6px\', width: \'90px\' }}>જથ્થો (Qty)</th>', '<th style={{ textAlign: \'center\', padding: \'6px 6px\', width: \'90px\' }}>Qty</th>'],
  ['<th style={{ textAlign: \'right\', padding: \'6px 8px\', width: \'100px\' }}>ભાવ (Rate)</th>', '<th style={{ textAlign: \'right\', padding: \'6px 8px\', width: \'100px\' }}>Rate (₹)</th>'],
  ['<th style={{ textAlign: \'right\', padding: \'6px 12px\', width: \'120px\' }}>કુલ રકમ</th>', '<th style={{ textAlign: \'right\', padding: \'6px 12px\', width: \'120px\' }}>Amount (₹)</th>'],
  ['<span>સબટોટલ: <strong>₹{sale.subtotal}</strong></span>', '<span>Subtotal: <strong>₹{sale.subtotal}</strong></span>'],
  ['<span>ડિલિવરી ચાર્જ: <strong style={{ color: \'#2563eb\' }}>+ ₹{sale.delivery_charge}</strong></span>', '<span>Delivery Charge: <strong style={{ color: \'#2563eb\' }}>+ ₹{sale.delivery_charge}</strong></span>'],
  ['<span>ડિસ્કાઉન્ટ: <strong style={{ color: \'#16a34a\' }}>- ₹{sale.discount_amount}</strong></span>', '<span>Discount: <strong style={{ color: \'#16a34a\' }}>- ₹{sale.discount_amount}</strong></span>'],
  ['<span style={{ fontSize: \'0.74rem\', color: \'#64748b\', fontWeight: 800 }}>કુલ ગ્રાન્ડ ટોટલ: </span>', '<span style={{ fontSize: \'0.74rem\', color: \'#64748b\', fontWeight: 800 }}>Grand Total: </span>'],
  ['<Edit3 size={14} /> ✏️ Edit Bill (સુધારો)', '<Edit3 size={14} /> ✏️ Edit Bill'],
  ['<Copy size={14} /> 📋 Duplicate Bill (રીપીટ બિલ)', '<Copy size={14} /> 📋 Duplicate Bill'],
  ['<Trash2 size={13} /> 🗑️ બિલ ડિલીટ કરો (Delete Bill)', '<Trash2 size={13} /> 🗑️ Delete Bill'],
  ['<ArrowDownLeft size={14} /> 💰 Payment In (રૂપિયા જમા લો)', '<ArrowDownLeft size={14} /> 💰 Payment In'],
  ['Close (બંધ કરો)', 'Close'],
  ['title="સંપૂર્ણ બિલ ડિલીટ (Permanent Bill Delete)"', 'title="Permanent Bill Delete"'],
  ['શું તમે ખરેખર બિલ', 'Are you sure you want to delete invoice'],
  ['સંપૂર્ણપણે ડિલીટ કરવા માંગો છો? પ્રમાણિત કરવા માટે Master PIN દાખલ કરો:', 'permanently? Enter Master PIN to confirm:']
]);

// 2. InvoicePrintModal.tsx
replaceInFile('src/components/sales/InvoicePrintModal.tsx', [
  ['WHOLESALE DELIVERY BILL (વેચાણ / ડિલિવરી બિલ)', 'WHOLESALE DELIVERY BILL']
]);

// 3. ReportsView.tsx
replaceInFile('src/components/reports/ReportsView.tsx', [
  ['TOTAL CREDIT (- જમા / પાવતી)', 'TOTAL CREDIT (- Received / Payments)'],
  ['NET RECEIVABLE (તમારે લેવાના)', 'NET RECEIVABLE (To Collect)'],
  ['ADVANCE CLEARED (જમા બેલેન્સ)', 'ADVANCE BALANCE'],
  ['NET PAYABLE (તમારે આપવાના)', 'NET PAYABLE (To Pay)'],
  ['DEBIT (ઉધાર ₹)', 'DEBIT (₹)'],
  ['CREDIT (જમા ₹)', 'CREDIT (₹)'],
  ['BALANCE (બાકી ₹)', 'BALANCE (₹)'],
  ['Opening Balance b/f (શરૂઆતની બાકી)', 'Opening Balance b/f'],
  ['typeLabel = \'SALE (બિલ)\';', 'typeLabel = \'SALE\';'],
  ['typeLabel = \'RECEIPT (પાવતી)\';', 'typeLabel = \'RECEIPT\';'],
  ['typeLabel = \'RETURN (વાપસી)\';', 'typeLabel = \'RETURN\';'],
  ['typeLabel = \'PURCHASE (ખરીદી)\';', 'typeLabel = \'PURCHASE\';'],
  ['typeLabel = \'PAYMENT (ચૂકવણી)\';', 'typeLabel = \'PAYMENT\';'],
  ['RECOVERABLE MISSING VALUE (ચાર્જ)', 'RECOVERABLE MISSING CONTAINER VALUE'],
  ['ISSUED (મોકલ્યા)', 'ISSUED'],
  ['RETURNED (પાછા આવ્યા)', 'RETURNED'],
  ['PENDING DUE (બાકી)', 'PENDING DUE'],
  ['RENT (ભાડું ₹)', 'RENT (₹)'],
  ['PAID (ચૂકવેલ)', 'PAID'],
  ['PENDING (બાકી)', 'PENDING'],
  ['ASSETS (મિલકતો)', 'ASSETS'],
  ['LIABILITIES & CAPITAL (જવાબદારીઓ)', 'LIABILITIES & CAPITAL']
]);

// 4. RojmelView.tsx
replaceInFile('src/components/accounting/RojmelView.tsx', [
  ['રોજમેળ', 'Daily Cashbook'],
  ['આવક', 'Inflow'],
  ['જાવક', 'Outflow'],
  ['સિલક', 'Balance']
]);

// 5. pdfStatementGenerator.ts & exportUtils.ts
replaceInFile('src/utils/pdfStatementGenerator.ts', [
  ['શ્રી માતુકી સ્વીટ્સ', 'Matuki Sweets'],
  ['ખાતાવહી વિગત', 'Account Statement'],
  ['તારીખ', 'Date'],
  ['વિગત', 'Particulars'],
  ['ઉધાર', 'Debit'],
  ['જમા', 'Credit'],
  ['બાકી', 'Balance']
]);

console.log('All remaining modules cleaned to English!');
