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

// 1. CustomersView.tsx
replaceInFile('src/components/parties/CustomersView.tsx', [
  ['`આભાર! શ્રી માતુકી સ્વીટ્સ એન્ડ કેટરર્સ`;', '`Thank you! Matuki Sweets & Caterers`;'],
  ['if (window.confirm(\'શું તમે ખરેખર આ વેચાણ બિલ રદ કરવા માંગો છો?\')) {', 'if (window.confirm(\'Are you sure you want to delete this sale invoice?\')) {'],
  ['+ New Sale (વેચાણ)', '+ New Sale'],
  ['+ Payment In (જમા)', '+ Payment In'],
  ['<th style={{ textAlign: \'center\', width: \'220px\' }}>Actions (વ્યવહાર ઓપ્શન)</th>', '<th style={{ textAlign: \'center\', width: \'220px\' }}>Actions</th>'],
  ['title="Print Bill (પ્રિન્ટ)"', 'title="Print Bill"'],
  ['title="Edit Bill (બિલ સુધારો)"', 'title="Edit Bill"'],
  ['title="Duplicate / Repeat Bill (ડુપ્લિકેટ બિલ બનાવો)"', 'title="Duplicate / Repeat Bill"'],
  ['<ArrowDownLeft size={12} /> જમા', '<ArrowDownLeft size={12} /> Pay In'],
  ['<th style={{ textAlign: \'right\' }}>Debit (ઉધાર)</th>', '<th style={{ textAlign: \'right\' }}>Debit (₹)</th>'],
  ['<th style={{ textAlign: \'right\' }}>Credit (જમા)</th>', '<th style={{ textAlign: \'right\' }}>Credit (₹)</th>'],
  ['💰 Order Advance Deposit (એડવાન્સ જમા ₹)', '💰 Order Advance Deposit (₹)'],
  ['🔴 Previous Due (જૂની બાકી ₹)', '🔴 Previous Balance Due (₹)'],
  ['message={`શું તમે ખરેખર બિલ #${pinConfirmSale.invoice_no} (${pinConfirmSale.customer_name} - ₹${pinConfirmSale.grand_total}) રદ કરવા માંગો છો? પ્રમાણિત કરવા માટે Master PIN (1234) દાખલ કરો:`}', 'message={`Are you sure you want to permanently delete invoice #${pinConfirmSale.invoice_no} (${pinConfirmSale.customer_name} - ₹${pinConfirmSale.grand_total})? Enter Master PIN (1234):`}']
]);

// 2. PartyLedgerModal.tsx
replaceInFile('src/components/parties/PartyLedgerModal.tsx', [
  ['title={`Statement of Account (ખાતાવહી): ${partyName}`}', 'title={`Statement of Account: ${partyName}`}'],
  ['<th>Debit (ઉધાર)</th>', '<th>Debit (₹)</th>'],
  ['<th>Credit (જમા)</th>', '<th>Credit (₹)</th>']
]);

// 3. PaymentModal.tsx
replaceInFile('src/components/parties/PaymentModal.tsx', [
  ['{isPaymentIn ? \'પાવતી નંબર (Receipt No)\' : \'વાઉચર બુક નંબર (Voucher No) 🏷️\'}', '{isPaymentIn ? \'Receipt No\' : \'Voucher Book No 🏷️\'}'],
  ['placeholder={isPaymentIn ? \'e.g. RCT-501\' : \'તમારી વાઉચર બુક મુજબ દા.ત. PAY-701\'}', 'placeholder={isPaymentIn ? \'e.g. RCT-501\' : \'e.g. PAY-701\'}'],
  ['{isPaymentIn ? \'📥 Received In Account (ક્યાં જમા મળ્યા?) *\' : \'📤 Paid From Account (ક્યાંથી ચૂકવ્યા?) *\'}', '{isPaymentIn ? \'📥 Deposit To Account *\' : \'📤 Paid From Account *\'}']
]);

// 4. ProductModal.tsx
replaceInFile('src/components/products/ProductModal.tsx', [
  ['🌐 ઓનલાઈન સેલ્ફ-ઓર્ડર મેનુ (Show in Online / QR Menu)', '🌐 Online Self-Order Menu (Show in Online / QR Menu)'],
  ['? \'✅ YES: ગ્રાહકો / કેટરર્સ આ આઈટમ ઓનલાઈન QR લિંક પરથી ઓર્ડર કરી શકશે.\'', '? \'✅ YES: Customers and caterers can order this item via public QR menu.\''],
  [': \'❌ NO: આ આઈટમ ઓનલાઈન લિંક પર છુપાયેલી રહેશે (માત્ર કાઉન્ટર/ફેક્ટરી માટે).\'}', ': \'❌ NO: Hidden from public online menu (Counter/Kitchen only).\'}'],
  ['{formData.available_online ? \'ONLINE: YES (ચાલુ)\' : \'ONLINE: NO (બંધ)\'}', '{formData.available_online ? \'ONLINE: YES (Active)\' : \'ONLINE: NO (Disabled)\'}']
]);

// 5. ProductsView.tsx
replaceInFile('src/components/products/ProductsView.tsx', [
  ['title="ક્લિક કરીને આ આઈટમ Online QR મેનુમાં ચાલુ/બંધ કરો"', 'title="Click to toggle Online QR ordering for this item"'],
  ['{selectedProduct.available_online !== 0 ? \'🌐 Online: YES (ચાલુ)\' : \'🚫 Online: NO (બંધ)\'}', '{selectedProduct.available_online !== 0 ? \'🌐 Online: YES (Active)\' : \'🚫 Online: NO (Disabled)\'}'],
  ['Product Categories (શ્રેણીઓ)', 'Product Categories'],
  ['Measurement Units & Conversion Rates (એકમ)', 'Measurement Units & Conversions']
]);

// 6. RawMaterialModal.tsx & RawMaterialsView.tsx
replaceInFile('src/components/products/RawMaterialModal.tsx', [
  ['placeholder="e.g. Cashew Nut W320 Whole (કાજુ)"', 'placeholder="e.g. Cashew Nut W320 Whole"']
]);
replaceInFile('src/components/products/RawMaterialsView.tsx', [
  ['Raw Materials Master (કાચો માલ)', 'Raw Materials Master']
]);

// 7. Purchases
replaceInFile('src/components/purchases/NewPurchaseModal.tsx', [
  ['title="Purchase Entry Voucher (ખરીદી વાઉચર)"', 'title="Purchase Entry Voucher"'],
  ['<option value="CREDIT">Credit (ખરીદી ઉધાર)</option>', '<option value="CREDIT">Credit (Account)</option>'],
  ['<option value="CASH">Cash (રોકડ ચૂકવણી)</option>', '<option value="CASH">Cash Payment</option>']
]);
replaceInFile('src/components/purchases/PurchasesView.tsx', [
  ['Purchases & Supplier Invoices (ખરીદી બિલ)', 'Purchases & Supplier Invoices']
]);

// 8. GoogleSheetPnLView.tsx
replaceInFile('src/components/reports/GoogleSheetPnLView.tsx', [
  ['WN 2: Customer Khata (ઉઘરાણી)', 'WN 2: Customer Receivables'],
  ['WN 3: Supplier Khata (દેવા)', 'WN 3: Supplier Payables'],
  ['Trading & Manufacturing Profit / Loss Account (નામા પત્રક)', 'Trading & Manufacturing Profit / Loss Account'],
  ['<td><strong style={{ color: \'#0f172a\' }}>Sales (વેચાણ આવક)</strong></td>', '<td><strong style={{ color: \'#0f172a\' }}>Sales & Revenue</strong></td>'],
  ['<span>Less: Direct Expense (કાચો માલ ખરીદી)</span>', '<span>Less: Direct Expense (Raw Material Purchases)</span>'],
  ['<span>Less: Labour (કારીગર મજૂરી / પગાર)</span>', '<span>Less: Labour & Wages</span>'],
  ['<span>Less: Transportation (ભાડું / પેટ્રોલ / ડીઝલ)</span>', '<span>Less: Transportation & Fuel</span>'],
  ['<td><span>Less: Indirect Expense (દુકાન ભાડું, લાઈટબિલ, મેઇન્ટેનન્સ)</span></td>', '<td><span>Less: Indirect Expenses (Rent, Electricity, Maintenance)</span></td>'],
  ['<td><strong style={{ color: \'#d97706\' }}>Cash Profit (રોકડ નફો)</strong></td>', '<td><strong style={{ color: \'#d97706\' }}>Cash Profit</strong></td>'],
  ['<td><span>Less: Depreciation (મશીનરી ઘસારો 2.5%)</span></td>', '<td><span>Less: Depreciation (2.5%)</span></td>'],
  ['Cash Reconciliation (રોકડ મેળ તાળો)', 'Cash Reconciliation'],
  ['<span>(+) Cash Profit (રોકડ નફો):</span>', '<span>(+) Cash Profit:</span>'],
  ['Working Note 2: Customer Receivables & Ugharani Ledger (ગ્રાહક ઉઘરાણી યાદી)', 'Working Note 2: Customer Receivables Ledger'],
  ['Working Note 3: Supplier Payables & Devana Ledger (વેપારી દેવા યાદી)', 'Working Note 3: Supplier Payables Ledger']
]);

// 9. ReportsView.tsx
replaceInFile('src/components/reports/ReportsView.tsx', [
  ['PARTY STATEMENT / ખાતાવહી સ્ટેટમેન્ટ', 'PARTY STATEMENT / ACCOUNT LEDGER'],
  ['{ id: \'vasan_yadi\' as ReportKey, label: \'🥣 Vasan Yadi & Missing Tracker (વાસણ યાદી)\' },', '{ id: \'vasan_yadi\' as ReportKey, label: \'🥣 Utensil & Container Tracker\' },'],
  ['{ id: \'driver_trips\' as ReportKey, label: \'🛺 Rickshaw Driver Hisab (ભાડું હિસાબ)\' },', '{ id: \'driver_trips\' as ReportKey, label: \'🛺 Rickshaw Driver Deliveries & Rent\' },'],
  ['{ id: \'vasan_tracker\' as ReportKey, label: \'📦 All Vasan Records (જમા-ઉધાર રજિસ્ટર)\' }', '{ id: \'vasan_tracker\' as ReportKey, label: \'📦 All Container Records\' }'],
  ['title: \'Party report (પાર્ટી ખાતાવહી)\',', 'title: \'Party Statement\','],
  ['{ id: \'party_statement\' as ReportKey, label: \'📑 Party Statement (ખાતાવહી સ્ટેટમેન્ટ)\' },', '{ id: \'party_statement\' as ReportKey, label: \'📑 Party Statement & Ledger\' },'],
  ['👥 Customers (ગ્રાહક)', '👥 Customers'],
  ['🚚 Suppliers (વેપારી)', '🚚 Suppliers'],
  ['Pending Vasan Only (બાકી વાસણ)', 'Pending Utensils Only'],
  ['All Orders (બધા ઓર્ડર)', 'All Orders'],
  ['<option value="PENDING">Pending Rent (બાકી ભાડું)</option>', '<option value="PENDING">Pending Rent</option>'],
  ['<option value="PAID">Paid / Settled (ચૂકવેલ)</option>', '<option value="PAID">Paid / Settled</option>'],
  ['PARTY STATEMENT (ખાતાવહી સ્ટેટમેન્ટ)', 'PARTY ACCOUNT STATEMENT'],
  ['{reportData.party_type === \'CUSTOMER\' ? \'👥 CUSTOMER (ગ્રાહક)\' : \'🚚 SUPPLIER (વેપારી)\'}', '{reportData.party_type === \'CUSTOMER\' ? \'👥 CUSTOMER\' : \'🚚 SUPPLIER\'}'],
  ['OPENING BALANCE (શરૂઆતની બાકી)', 'OPENING BALANCE'],
  ['TOTAL DEBIT (+ ઉધાર / બિલ)', 'TOTAL DEBIT (+ Invoices / Debit)']
]);

// 10. Expenses
replaceInFile('src/components/expenses/ExpensesView.tsx', [
  ['Expense Management (ધંધાકીય ખર્ચ)', 'Expense Management'],
  ['+ Add Expense (નવો ખર્ચ)', '+ Add Expense']
]);
replaceInFile('src/components/expenses/ExpenseModal.tsx', [
  ['Expense Entry (ખર્ચ વાઉચર)', 'Expense Entry']
]);

console.log('Final pass clean complete!');
