const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

// 1. ProductsView.tsx & ProductModal.tsx
replaceInFile('src/components/products/ProductsView.tsx', [
  ['🌐 ONLINE: YES (ચાલુ)', '🌐 Online: YES (Active)'],
  ['🚫 ONLINE: NO (બંધ)', '🚫 Online: NO (Disabled)'],
  ['Items & Sweets Master (આઈટમ્સ / વસ્તુઓ)', 'Items & Sweets Master'],
  ['Search Item Name, Gujarati Name, Code...', 'Search Item Name, Code...'],
  ['Online Menu (ઓનલાઈન મેનુ)', 'Online Menu'],
  ['All Items (બધી વસ્તુઓ)', 'All Items'],
  ['Finished Sweets (તૈયાર મીઠાઈ)', 'Finished Sweets'],
  ['Raw Materials (કાચો માલ)', 'Raw Materials'],
  ['Low Stock (ઓછો સ્ટોક)', 'Low Stock'],
  ['આઈટમ / મીઠાઈનું નામ', 'Item Name'],
  ['કેટેગરી', 'Category'],
  ['વેચાણ ભાવ (₹)', 'Sale Rate (₹)'],
  ['હાલનો સ્ટોક', 'Current Stock'],
  ['ઓનલાઈન QR', 'Online QR'],
  ['એક્શન', 'Action']
]);

replaceInFile('src/components/products/ProductModal.tsx', [
  ['ઓનલાઈન ઓર્ડર મેનુ (Customer QR & Web Order Portal)', 'Online Order Menu (Customer QR & Web Portal)'],
  ['શું આ મીઠાઈ ગ્રાહકોને ઓનલાઈન ઓર્ડર અને QR મેનુમાં આપવી છે?', 'Show this sweet in public online ordering and QR menu?'],
  ['✅ ONLINE: YES (ઓનલાઈન દેખાશે)', '✅ ONLINE: YES (Visible Online)'],
  ['🚫 ONLINE: NO (ઓનલાઈન બંધ / છુપાયેલ)', '🚫 ONLINE: NO (Hidden from Online)'],
  ['Item Name (મીઠાઈ / વસ્તુનું નામ) *', 'Item Name *'],
  ['Gujarati / Regional Name (ગુજરાતી નામ)', 'Regional / Alternate Name'],
  ['Category (કેટેગરી) *', 'Category *'],
  ['Unit (એકમ) *', 'Unit *'],
  ['Selling Price / Rate (વેચાણ ભાવ ₹) *', 'Selling Price / Rate (₹) *'],
  ['Purchase Rate / Cost (ખરીદી પડતર ભાવ ₹)', 'Purchase Cost (₹)'],
  ['Opening Stock (શરૂઆતનો સ્ટોક)', 'Opening Stock'],
  ['Low Stock Alert Quantity (ઓછા સ્ટોકની ચેતવણી)', 'Low Stock Alert Qty'],
  ['Shelf Life (Days) / એક્સપાયરી દિવસો', 'Shelf Life (Days)'],
  ['HSN / SAC Code (એચએસએન કોડ)', 'HSN / SAC Code'],
  ['GST Rate (%) / જીએસટી ટકા', 'GST Rate (%)'],
  ['Cancel (રદ)', 'Cancel'],
  ['Save Product (સેવ કરો)', 'Save Item']
]);

// 2. DashboardView.tsx & DashboardOrderWidget.tsx
replaceInFile('src/components/dashboard/DashboardView.tsx', [
  ['Business Overview & Live Performance', 'Business Overview & Live Performance'],
  ['Today\'s Sales (આજનું વેચાણ)', 'Today\'s Sales'],
  ['Today\'s Purchases (આજની ખરીદી)', 'Today\'s Purchases'],
  ['Total Receivables (લેવાના નાણાં)', 'Total Receivables (To Collect)'],
  ['Total Payables (ચૂકવવાના નાણાં)', 'Total Payables (To Pay)'],
  ['Low Stock Items (ઓછો સ્ટોક)', 'Low Stock Alerts'],
  ['Active Advance Orders (એડવાન્સ ઓર્ડર)', 'Active Advance Orders'],
  ['Recent Invoices (તાજેતરના બિલ)', 'Recent Invoices'],
  ['Monthly Sales Trend (માસિક વેચાણ)', 'Monthly Sales Trend'],
  ['Top Selling Sweets (સૌથી વધુ વેચાતી મીઠાઈ)', 'Top Selling Sweets']
]);

replaceInFile('src/components/dashboard/DashboardOrderWidget.tsx', [
  ['Advance Orders Summary (ઓર્ડર પ્લાનર)', 'Advance Orders & Production Summary'],
  ['Morning Slot (સવાર)', 'Morning Slot'],
  ['Evening Slot (સાંજ)', 'Evening Slot'],
  ['View Order Planner (પ્લાનર જુઓ)', 'View Order Planner']
]);

// 3. CustomersView.tsx & PartyLedgerModal.tsx & PaymentModal.tsx
replaceInFile('src/components/parties/CustomersView.tsx', [
  ['Customer & Party Management (ગ્રાહક ખાતાવહી)', 'Customer & Party Management'],
  ['Total Parties (કુલ ગ્રાહકો)', 'Total Customers'],
  ['Total Receivable (કુલ લેણી રકમ)', 'Total Receivables'],
  ['Total Payable (જમા રકમ)', 'Total Payables'],
  ['+ Add Customer (નવા ગ્રાહક ઉમેરો)', '+ Add Customer'],
  ['Party Name (નામ)', 'Customer / Party Name'],
  ['Mobile Number (મોબાઈલ)', 'Mobile Number'],
  ['City / Address (સરનામું)', 'City / Address'],
  ['Balance (બાકી રકમ)', 'Current Balance'],
  ['Actions (એક્શન)', 'Actions']
]);

replaceInFile('src/components/parties/PartyLedgerModal.tsx', [
  ['Party Statement & Ledger (ખાતાવહી વિગત)', 'Customer Statement & Ledger Account'],
  ['Opening Balance (શરૂઆતનું બાકી)', 'Opening Balance'],
  ['Total Debit (ઉધાર)', 'Total Debit (Sales)'],
  ['Total Credit (જમા)', 'Total Credit (Payments)'],
  ['Closing Balance (આખર બાકી)', 'Closing Balance'],
  ['Print Ledger (ખાતાવહી પ્રિન્ટ)', 'Print Statement'],
  ['Export to PDF (પીડીએફ)', 'Export PDF']
]);

replaceInFile('src/components/parties/PaymentModal.tsx', [
  ['Payment-In Receipt (નાણાં જમા પાવતી)', 'Payment-In Receipt (Receive Payment)'],
  ['Payment-Out Voucher (નાણાં ચુકવણી વાઉચર)', 'Payment-Out Voucher (Make Payment)'],
  ['Party Name (પાર્ટીનું નામ) *', 'Party / Customer Name *'],
  ['Payment Amount (રકમ ₹) *', 'Payment Amount (₹) *'],
  ['Payment Date (તારીખ) *', 'Payment Date *'],
  ['Payment Mode (ચુકવણી પ્રકાર)', 'Payment Mode'],
  ['Notes / Reference (નોંધ / ચેક નં)', 'Notes / Reference / Cheque No'],
  ['Save Payment (સેવ કરો)', 'Save Payment Receipt']
]);

// 4. SalesView.tsx, NewSaleModal.tsx, InvoiceDetailsModal.tsx, SalesReturnModal.tsx
replaceInFile('src/components/sales/SalesView.tsx', [
  ['Sale Invoices & Billing (વેચાણ બિલ)', 'Sale Invoices & Billing'],
  ['Total Sales (કુલ વેચાણ)', 'Total Sales Value'],
  ['Paid Amount (મળેલ રકમ)', 'Total Paid Amount'],
  ['Unpaid / Credit (બાકી રકમ)', 'Credit / Unpaid Balance'],
  ['+ Add Sale Invoice (નવું બિલ)', '+ Add Sale Invoice'],
  ['Invoice # (બિલ નં)', 'Invoice #'],
  ['Date (તારીખ)', 'Date'],
  ['Party Name (ગ્રાહક)', 'Party / Customer Name'],
  ['Grand Total (કુલ રકમ)', 'Grand Total'],
  ['Balance Due (બાકી)', 'Balance Due'],
  ['Status (સ્ટેટસ)', 'Status']
]);

replaceInFile('src/components/sales/NewSaleModal.tsx', [
  ['Sale Invoice (વેચાણ બિલ)', 'Sale Invoice'],
  ['Party Name (ગ્રાહક / પાર્ટીનું નામ) *', 'Customer / Party Name *'],
  ['Invoice Date (બિલ તારીખ) *', 'Invoice Date *'],
  ['Due Date (ચુકવણી છેલ્લી તારીખ)', 'Payment Due Date'],
  ['Payment Mode (ચુકવણી મોડ)', 'Payment Mode'],
  ['Item Name (મીઠાઈ / વસ્તુ)', 'Item / Sweet Name'],
  ['Quantity (જથ્થો)', 'Qty'],
  ['Rate (ભાવ ₹)', 'Rate (₹)'],
  ['Amount (રકમ ₹)', 'Amount (₹)'],
  ['Subtotal (માલ રકમ)', 'Subtotal'],
  ['Discount (ડિસ્કાઉન્ટ)', 'Discount'],
  ['Delivery Charges (ભાડું)', 'Delivery Charges'],
  ['Round Off (રાઉન્ડ ઓફ)', 'Round Off'],
  ['Grand Total (કુલ બિલ રકમ)', 'Grand Total'],
  ['Received Amount (મળેલ રોકડા/UPI)', 'Received Amount'],
  ['Save & Print (સેવ & પ્રિન્ટ)', 'Save & Print Invoice'],
  ['Save Invoice (Ctrl+S)', 'Save Invoice (Ctrl+S)']
]);

// 5. PurchasesView.tsx, NewPurchaseModal.tsx
replaceInFile('src/components/purchases/PurchasesView.tsx', [
  ['Purchase Bills (ખરીદી વાઉચર્સ)', 'Purchase Bills & Supplier Invoices'],
  ['Total Purchases (કુલ ખરીદી)', 'Total Purchases'],
  ['+ Add Purchase Bill (નવી ખરીદી)', '+ Add Purchase Bill']
]);

replaceInFile('src/components/purchases/NewPurchaseModal.tsx', [
  ['Purchase Bill (ખરીદી વાઉચર)', 'Purchase Bill'],
  ['Supplier / Party Name (વેપારીનું નામ) *', 'Supplier / Vendor Name *'],
  ['Bill Date (ખરીદી તારીખ) *', 'Bill Date *'],
  ['Supplier Bill No (વેપારી બિલ નં)', 'Supplier Invoice Ref #']
]);

// 6. ExpensesView.tsx, ExpenseModal.tsx
replaceInFile('src/components/expenses/ExpensesView.tsx', [
  ['Expense Management (ધંધાકીય ખર્ચ વાઉચર્સ)', 'Expense Management & Vouchers'],
  ['+ Add Expense Voucher (નવો ખર્ચ)', '+ Add Expense Voucher']
]);

replaceInFile('src/components/expenses/ExpenseModal.tsx', [
  ['Expense Voucher (ખર્ચ વાઉચર)', 'Expense Voucher'],
  ['Expense Category (ખર્ચ કેટેગરી) *', 'Expense Category *'],
  ['Amount (ખર્ચ રકમ ₹) *', 'Expense Amount (₹) *']
]);

// 7. RojmelView.tsx (Cash & Bank Daybook)
replaceInFile('src/components/accounting/RojmelView.tsx', [
  ['Rojmel (રોજમેળ / Cash & Bank Daybook)', 'Rojmel / Cash & Bank Daybook'],
  ['Opening Balance (શરૂઆતની સિલક)', 'Opening Balance'],
  ['Total Inflow / Jama (આવક / જમા)', 'Total Cash Inflow (Jama)'],
  ['Total Outflow / Udhar (જાવક / ઉધાર)', 'Total Cash Outflow (Udhar)'],
  ['Closing Balance (આખર સિલક)', 'Closing Balance'],
  ['Print Rojmel (રોજમેળ પ્રિન્ટ)', 'Print Daily Cashbook']
]);

// 8. ReportsView.tsx & GoogleSheetPnLView.tsx
replaceInFile('src/components/reports/ReportsView.tsx', [
  ['Reports & Analytics (રિપોર્ટ્સ & ઓડિટ)', 'Reports & Financial Analytics'],
  ['Sales Summary Report (વેચાણ રિપોર્ટ)', 'Sales Summary Report'],
  ['Purchase Summary Report (ખરીદી રિપોર્ટ)', 'Purchase Summary Report'],
  ['Item-wise Profitability (નફો રિપોર્ટ)', 'Item-wise Profit & Margin Report'],
  ['Stock Valuation Report (સ્ટોક મૂલ્યાંકન)', 'Stock Valuation & Physical Inventory']
]);

replaceInFile('src/components/reports/GoogleSheetPnLView.tsx', [
  ['Live Google Sheet Style Profit & Loss (નફો-નુકસાન પત્રક)', 'Live Profit & Loss Sheet (Google Sheet View)'],
  ['Total Income / Sales (કુલ વેચાણ આવક)', 'Total Revenue / Sales'],
  ['Cost of Goods Sold (માલ પડતર ખર્ચ)', 'Cost of Goods Sold (COGS)'],
  ['Gross Profit (કાચો નફો)', 'Gross Profit'],
  ['Operating Expenses (ધંધાકીય ખર્ચાઓ)', 'Operating Expenses'],
  ['Net Profit (ચોખ્ખો નફો)', 'Net Profit']
]);

// 9. SettingsView.tsx, BackupRestoreView.tsx
replaceInFile('src/components/settings/SettingsView.tsx', [
  ['વેચાણ બિલ (Sale Invoice)', 'Sale Invoice'],
  ['ઉધાર પાવતી / વાઉચર બુક (Payment Out)', 'Payment Out Voucher'],
  ['જમા પાવતી / Payment In (Receipt)', 'Payment In (Receipt)'],
  ['ખર્ચ વાઉચર (Expense Voucher)', 'Expense Voucher'],
  ['સેલ રિટર્ન / ક્રેડિટ નોટ (Sale Return)', 'Sale Return (Credit Note)'],
  ['ખરીદી બિલ (Purchase Bill)', 'Purchase Bill'],
  ['ખરીદી રિટર્ન / ડેબિટ નોટ (Purchase Return)', 'Purchase Return (Debit Note)'],
  ['એડવાન્સ ઓર્ડર બુકિંગ (Advance Order)', 'Advance Order Booking'],
  ['Prefix (આગળનો કોડ)', 'Prefix Code'],
  ['ક્યાંથી શરૂ કરવો (Start No)', 'Starting Sequence No'],
  ['વાઉચર બુક નંબર (Start No) *', 'Voucher Starting No *'],
  ['Prefix (પાવતી કોડ)', 'Prefix Code'],
  ['Prefix (વાઉચર કોડ / ખાલી પણ રાખી શકો)', 'Prefix (e.g. PAY- or PV-)'],
  ['placeholder="PAY- અથવા PV-"', 'placeholder="PAY- or PV-"'],
  ['{saving ? \'સેવ થઈ રહ્યું છે...\' : \'💾 વાઉચર નંબરિંગ સેટિંગ્સ સેવ કરો (Save Numbering Settings)\'}', '{saving ? \'Saving...\' : \'💾 Save Voucher Numbering Settings\'}'],
  ['+ Add New Fixed Rickshaw Driver (નવા રિક્ષા ડ્રાઈવર ઉમેરો)', '+ Add New Fixed Rickshaw Driver'],
  ['DEFAULT RENT (ભાડું ₹)', 'DEFAULT RENT (₹)'],
  ['{editingVenueId ? \'✏️ Edit Delivery Venue / Party Plot\' : \'+ Add New Delivery Venue / Party Plot (ડિલિવરી સ્થળ / પાર્ટી પ્લોટ ઉમેરો)\'}', '{editingVenueId ? \'✏️ Edit Delivery Venue / Party Plot\' : \'+ Add New Delivery Venue / Party Plot\'}'],
  ['Area / Landmark (વિસ્તાર)', 'Area / Landmark'],
  ['VENUE / PARTY PLOT NAME (સ્થળનું નામ)', 'VENUE / PARTY PLOT NAME'],
  ['AREA / LANDMARK (વિસ્તાર)', 'AREA / LANDMARK'],
  ['CUSTOMER CHARGE (ગ્રાહક ચાર્જ ₹)', 'CUSTOMER CHARGE (₹)'],
  ['DRIVER RENT (રિક્ષા ભાડું ₹)', 'DRIVER RENT (₹)'],
  ['DELIVERY PROFIT (નફો ₹)', 'DELIVERY PROFIT (₹)']
]);

replaceInFile('src/components/settings/BackupRestoreView.tsx', [
  ['Clear Trial Data & Start Fresh for LIVE Business (ટ્રાયલ ડેટા સાફ કરો / લાઈવ શરૂઆત)', 'Clear Trial Data & Start Fresh for LIVE Business']
]);

// 10. InventoryView.tsx, StockAdjustmentModal.tsx
replaceInFile('src/components/inventory/InventoryView.tsx', [
  ['Inventory, Valuation & Stock Movements (સ્ટોક રજીસ્ટર)', 'Inventory, Valuation & Stock Movements']
]);

replaceInFile('src/components/inventory/StockAdjustmentModal.tsx', [
  ['title="Audited Stock Adjustment (સ્ટોક સુધારો)"', 'title="Audited Stock Adjustment"']
]);

// 11. LoginModal.tsx & MasterPinDialog.tsx
replaceInFile('src/components/auth/LoginModal.tsx', [
  ['setError(err.message || \'ખોટો યુઝરનેમ અથવા પાસવર્ડ (Invalid username or password)\');', 'setError(err.message || \'Invalid username or password\');'],
  ['વ્યવસાયિક બિલિંગ, ખાતાવહી, ઉત્પાદન અને રોજમેળ મેનેજમેન્ટ', 'Complete Wholesale Sweets Billing, Inventory, Production & Order Management'],
  ['ત્વરિત લોગિન:', 'Quick Sign In:'],
  ['યુઝરનેમ (Username)', 'Username'],
  ['પાસવર્ડ (Password)', 'Password'],
  ['{loading ? \'વેરિફાઈંગ...\' : \'🔐 Sign In to ERP (લોગઇન કરો)\'}', '{loading ? \'Verifying...\' : \'🔐 Sign In to ERP\'}']
]);

replaceInFile('src/components/common/MasterPinDialog.tsx', [
  ['message = \'આ વેચાણ બિલ રદ કરવા માટે 4-અંકનો Master PIN (1234) દાખલ કરો.\',', 'message = \'Enter 4-digit Master Security PIN (1234) to proceed with this action.\','],
  ['setError(\'❌ ખોટો Master PIN છે! (Incorrect Master PIN. Access Denied)\');', 'setError(\'❌ Incorrect Master Security PIN! Access Denied\');'],
  ['🔒 સુરક્ષા અધિકૃતતા (Security Authentication)', '🔒 Security Authorization Required'],
  ['🔑 Enter Master PIN (માસ્ટર પિન):', '🔑 Enter Master Security PIN:'],
  ['Cancel (રદ)', 'Cancel']
]);

console.log('All ERP components converted to clean English successfully!');
