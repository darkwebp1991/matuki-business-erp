const fs = require('fs');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

// 1. SalesView.tsx
replaceInFile('src/components/sales/SalesView.tsx', [
  ['*🧾 MATUKI SWEETS - વેચાણ બિલ*', '*🧾 MATUKI SWEETS - Sale Invoice*'],
  ['*ઇન્વોઇસ નં:*', '*Invoice #:*'],
  ['*તારીખ:*', '*Date:*'],
  ['*ગ્રાહક:*', '*Customer:*'],
  ['*આઈટમ વિગત:*', '*Items Summary:*'],
  ['*કુલ બિલ રકમ:*', '*Grand Total:*'],
  ['*જમા રકમ:*', '*Paid Amount:*'],
  ['*બાકી રકમ:*', '*Balance Due:*'],
  ['આભાર! શ્રી માતુકી સ્વીટ્સ એન્ડ કેટરર્સ', 'Thank you! Matuki Sweets & Caterers'],
  ['Sales Register & Invoices (વેચાણ બિલ)', 'Sales Register & Invoices'],
  ['Sales Return & Vasan (માલ/વાસણ પરત)', 'Sales Return & Vasan (Containers)'],
  ['<th>Vasan (વાસણ)</th>', '<th>Vasan (Utensils)</th>'],
  ['<th style={{ textAlign: \'center\', width: \'180px\' }}>Actions (વ્યવહાર ઓપ્શન)</th>', '<th style={{ textAlign: \'center\', width: \'180px\' }}>Actions</th>'],
  ['title="View Invoice Details (વિગત)"', 'title="View Invoice Details"'],
  ['title="Print Bill (પ્રિન્ટ)"', 'title="Print Bill"'],
  ['title="Edit Bill (બિલ સુધારો)"', 'title="Edit Bill"'],
  ['title="Duplicate / Repeat Bill (ડુપ્લિકેટ બિલ બનાવો)"', 'title="Duplicate / Repeat Bill"'],
  ['<ArrowDownLeft size={12} /> જમા', '<ArrowDownLeft size={12} /> Pay In'],
  ['title="સંપૂર્ણ બિલ ડિલીટ (Permanent Bill Delete)"', 'title="Permanent Bill Delete"'],
  ['શું તમે ખરેખર બિલ', 'Are you sure you want to permanently delete invoice'],
  ['હંમેશ માટે સંપૂર્ણપણે ડિલીટ કરવા માંગો છો? (આનાથી સ્ટોક પાછો જમા થશે અને ખાતાવહી/લેજરમાંથી બિલ સાફ થઈ જશે). Master PIN (1234) દાખલ કરો:', 'permanently? (Stock will be restored and ledger entry reversed). Enter Master PIN (1234):']
]);

// 2. NewSaleModal.tsx
replaceInFile('src/components/sales/NewSaleModal.tsx', [
  ["Outer Packing (કેરેટ / ડોલ)", "Outer Packing (Crate / Bucket)"],
  ["drvs.find(d => d.name.toLowerCase().includes('personal') || d.name.includes('પોતાની'))", "drvs.find(d => d.name.toLowerCase().includes('personal') || d.name.toLowerCase().includes('self'))"],
  ["Customer * (પાર્ટી સિલેક્ટ કરો)", "Customer / Party Name *"],
  ['<option value="NONE">None (સામાન્ય)</option>', '<option value="NONE">None</option>'],
  ['<option value="Dol">Dol (ડોલ / ડબ્બો)</option>', '<option value="Dol">Bucket (Dol)</option>'],
  ['<option value="Carat">Carat (કેરેટ)</option>', '<option value="Carat">Crate (Carat)</option>'],
  ['<option value="Milton">Milton (મિલ્ટન કેન)</option>', '<option value="Milton">Milton (Can)</option>'],
  ['<option value="Choki">Choki (ચોકી / ટ્રે)</option>', '<option value="Choki">Choki (Tray)</option>'],
  ['<option value="Steel Dabba">Steel Dabba (ડબ્બો)</option>', '<option value="Steel Dabba">Steel Dabba</option>'],
  ['<option value="Petharo">Petharo (પેથારો)</option>', '<option value="Petharo">Petharo (Box)</option>'],
  ['<option value="Plastic Tub">Plastic Tub (ટબ)</option>', '<option value="Plastic Tub">Plastic Tub</option>'],
  ['<option value="Tray">Tray (ટ્રે)</option>', '<option value="Tray">Tray</option>'],
  ['<option value="Other">Other (અન્ય)</option>', '<option value="Other">Other</option>'],
  ['🏷️ ગત:', '🏷️ Last:'],
  ['Payment Type (ચુકવણી પ્રકાર)', 'Payment Type'],
  ["{mode === 'CREDIT' ? 'Credit (ઉધાર)' : mode}", "{mode === 'CREDIT' ? 'Credit' : mode}"],
  ['<Truck size={13} /> Delivery Charge (ડિલિવરી ચાર્જ ₹):', '<Truck size={13} /> Delivery Charge (₹):'],
  ['💰 Advance Deducted (એડવાન્સ બાદ ₹):', '💰 Advance Deducted (₹):']
]);

// 3. SalesReturnModal.tsx
replaceInFile('src/components/sales/SalesReturnModal.tsx', [
  ['Sales Return & Vasan Jama (વેચાણ પરત અને વાસણ જમા)', 'Sales Return & Vasan Return'],
  ['1. Sweets / Finished Goods Return (માલ પરત જથ્થો)', '1. Sweets / Finished Goods Return'],
  ['2. Vasan / Containers Return (વાસણ પરત જમા કરો - મિલ્ટન / ચોકી / કેરેટ)', '2. Vasan / Containers Return (Milton / Tray / Crate)'],
  ['<th style={{ width: \'130px\', background: \'#fde68a\' }}>RETURN NOW (પરત જમા)</th>', '<th style={{ width: \'130px\', background: \'#fde68a\' }}>RETURN NOW</th>']
]);

// 4. InvoiceDetailsModal.tsx & InvoicePrintModal.tsx
replaceInFile('src/components/sales/InvoicePrintModal.tsx', [
  ['{showVasan && <th style={{ textAlign: \'center\', padding: \'3px 4px\', width: \'80px\', background: \'#78350f\', color: \'#fef3c7\' }}>VASAN (વાસણ)</th>}', '{showVasan && <th style={{ textAlign: \'center\', padding: \'3px 4px\', width: \'80px\', background: \'#78350f\', color: \'#fef3c7\' }}>VASAN</th>}'],
  ['<span>Less: Advance (અગાઉ એડવાન્સ):</span>', '<span>Less: Advance:</span>'],
  ['<span>Balance Due (બાકી રકમ):</span>', '<span>Balance Due:</span>']
]);

// 5. SettingsView.tsx
replaceInFile('src/components/settings/SettingsView.tsx', [
  ['<Hash size={14} /> 2. વાઉચર & બિલ નંબરિંગ (Voucher Series)', '<Hash size={14} /> 2. Voucher & Bill Series Numbering'],
  ['{/* TAB 2: VOUCHER & DOCUMENT NUMBERING SERIES (દસ્તાવેજ અને વાઉચર નંબરિંગ સેટિંગ્સ) */}', '{/* TAB 2: VOUCHER & DOCUMENT NUMBERING SERIES */}'],
  ['ફિઝિકલ વાઉચર બુક અને બિલ નંબરિંગ સેટિંગ્સ (Physical Voucher Book & Document Numbering)', 'Physical Voucher Book & Document Numbering Settings'],
  ['તમારી પાસે રહેલી છાપેલી વાઉચર બુક (દા.ત. Payment-Out Voucher Book) કે બિલ બુકમાં જે નંબરથી શરૂઆત કરવી હોય, તે <strong>"શરૂઆતનો નંબર (Start From)"</strong> અહીં સેટ કરો. જ્યારે પણ તમે નવું બિલ કે વાઉચર બનાવશો ત્યારે તે નંબર આપોઆપ આવી જશે.', 'Set starting sequence numbers for printed voucher books (e.g. Payment-Out, Invoices, Advance Orders). Next voucher numbers will auto-increment from this sequence.'],
  ['આગામી: {(settings.invoice_prefix ?? \'MS/26-27/\')', 'Next: {(settings.invoice_prefix ?? \'MS/26-27/\')'],
  ['આગામી: {(settings.payment_out_prefix ?? \'PAY-\')', 'Next: {(settings.payment_out_prefix ?? \'PAY-\')'],
  ['આગામી: {(settings.payment_in_prefix ?? \'RCT-\')', 'Next: {(settings.payment_in_prefix ?? \'RCT-\')'],
  ['આગામી: {(settings.expense_prefix ?? \'EXP-\')', 'Next: {(settings.expense_prefix ?? \'EXP-\')'],
  ['આગામી: {(settings.sale_return_prefix ?? \'SR/26-27/\')', 'Next: {(settings.sale_return_prefix ?? \'SR/26-27/\')'],
  ['આગામી: {(settings.purchase_prefix ?? \'PO/26-27/\')', 'Next: {(settings.purchase_prefix ?? \'PO/26-27/\')'],
  ['આગામી: {(settings.purchase_return_prefix ?? \'PR/26-27/\')', 'Next: {(settings.purchase_return_prefix ?? \'PR/26-27/\')'],
  ['આગામી: {(settings.advance_order_prefix ?? \'ORD-\')', 'Next: {(settings.advance_order_prefix ?? \'ORD-\')']
]);

// 6. ManufacturingView.tsx & NewBatchModal.tsx (Keep printing in Gujarati, UI in English)
replaceInFile('src/components/manufacturing/ManufacturingView.tsx', [
  ['Production & Manufacturing Batches (ઉત્પાદન બેચ)', 'Production & Manufacturing Batches'],
  ['+ New Production Batch (નવો ઉત્પાદન બેચ)', '+ New Production Batch'],
  ['Target Sweet (મીઠાઈ)', 'Target Sweet'],
  ['Batch # (બેચ નં)', 'Batch #'],
  ['Planned Qty (પ્લાન કરેલ જથ્થો)', 'Planned Qty'],
  ['Actual Output (તૈયાર જથ્થો)', 'Actual Output']
]);

replaceInFile('src/components/manufacturing/NewBatchModal.tsx', [
  ['New Production Batch (નવો ઉત્પાદન બેચ)', 'New Production Batch'],
  ['Target Sweet / Finished Good (મીઠાઈ પસંદ કરો) *', 'Target Sweet / Finished Good *'],
  ['Planned Quantity (બનાવવાનો જથ્થો) *', 'Planned Quantity *'],
  ['Recipe / Formula (કાચો માલ રેસિપી)', 'Recipe / BOM Ingredients Formula'],
  ['Ingredients / Raw Materials Consumed (વપરાયેલ કાચો માલ)', 'Ingredients & Raw Materials Consumed']
]);

// 7. RawMaterialsView.tsx & RawMaterialModal.tsx
replaceInFile('src/components/products/RawMaterialsView.tsx', [
  ['Raw Materials & Ingredients (કાચો માલ સ્ટોક)', 'Raw Materials & Ingredients Stock'],
  ['+ Add Raw Material (નવો કાચો માલ)', '+ Add Raw Material']
]);

replaceInFile('src/components/products/RawMaterialModal.tsx', [
  ['Raw Material (કાચો માલ)', 'Raw Material Item'],
  ['Material Name (નામ) *', 'Material Name *'],
  ['Current Stock (સ્ટોક)', 'Current Stock']
]);

// 8. App.tsx
replaceInFile('src/App.tsx', [
  ['MATUKI BUSINESS ERP - સંપૂર્ણ બિઝનેસ મેનેજમેન્ટ', 'MATUKI BUSINESS ERP - Advanced Sweet & Dairy Management']
]);

console.log('All remaining files processed successfully!');
