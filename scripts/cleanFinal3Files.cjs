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

// 1. client.ts
replaceInFile('src/api/client.ts', [
  ['// Payment Modes & Bank Accounts Master (રોકડ, બેંક અને યુપીઆઇ ખાતાઓ)', '// Payment Modes & Bank Accounts Master'],
  ['// Daily Rojmel Daybook (દૈનિક રોજમેળ)', '// Daily Rojmel Daybook'],
  ['// Advance Caterer Orders & Production Planner (એડવાન્સ કેટરર્સ ઓર્ડર પ્લાનર)', '// Advance Caterer Orders & Production Planner'],
  ['// WhatsApp Inbound Orders & Outlet Sync (આઉટલેટ ૧ & ૨ વોટ્સએપ ઓર્ડર)', '// WhatsApp Inbound Orders & Outlet Sync'],
  ['// Online Item Toggle & Public Self-Order Portal (ઓનલાઈન મેનુ & ગ્રાહક QR ઓર્ડર)', '// Online Item Toggle & Public Self-Order Portal']
]);

// 2. App.tsx
replaceInFile('src/App.tsx', [
  ['addToast(\'info\', \'સફળતાપૂર્વક લોગઆઉટ થયા (Logged out successfully)\');', 'addToast(\'info\', \'Logged out successfully.\');'],
  ['addToast(\'success\', `સ્વાગત છે, ${user.full_name || user.username}! (Welcome)`);', 'addToast(\'success\', `Welcome back, ${user.full_name || user.username}!`);']
]);

// 3. RojmelView.tsx
replaceInFile('src/components/accounting/RojmelView.tsx', [
  ['return `📊 *${bName} — દૈનિક Daily Cashbook*', 'return `📊 *${bName} — Daily Cashbook*'],
  ['⏰ *સમય:*', '⏰ *Time:*'],
  ['🛍️ *આજનું કુલ વેચાણ (Total Sales):*', '🛍️ *Total Sales:*'],
  ['• બિલ:', '• Bills:'],
  ['| જથ્થો:', '| Weight:'],
  ['• રોકડ વેચાણ:', '• Cash Sales:'],
  ['| ઉધાર વેચાણ:', '| Credit Sales:'],
  ['💰 *શરૂઆતની Balance (Opening):*', '💰 *Opening Balance:*'],
  ['• રોકડ:', '• Cash:'],
  ['| બેંક:', '| Bank:'],
  ['🟢 *આજની Inflow (Total Inflow / જમા):*', '🟢 *Total Inflow (Receipts):*'],
  ['🔴 *આજની Outflow (Total Outflow / ઉધાર):*', '🔴 *Total Outflow (Payments):*'],
  ['📈 *ચોખ્ખો ફેરફાર (Net Flow):*', '📈 *Net Flow:*'],
  ['💵 *રોકડ Balance:*', '💵 *Cash Balance:*'],
  ['🏦 *બેંક Balance:*', '🏦 *Bank Balance:*'],
  ['SALE / વેચાણ', 'SALE'],
  ['RECEIPT / જમા', 'RECEIPT'],
  ['PURCHASE / ખરીદી', 'PURCHASE'],
  ['PAYMENT / ચુકવણી', 'PAYMENT'],
  ['EXPENSE / ખર્ચ', 'EXPENSE'],
  ['CONTRA / ટ્રાન્સફર', 'CONTRA'],
  ['દૈનિક રોકડ, બેંક અને યુપીઆઇ Inflow-Outflow મેળ, Balance હિસાબ અને ખાતા વહીવટ', 'Daily cash, bank, and UPI inflow/outflow reconciliation, closing balance, and daybook ledger'],
  ['<ArrowRightLeft size={16} /> 💸 Contra Transfer (રોકડ બેંક ટ્રાન્સફર)', '<ArrowRightLeft size={14} /> 💸 Contra Transfer'],
  ['<Printer size={16} /> Print Rojmel Sheet (પ્રિન્ટ)', '<Printer size={14} /> Print Daybook'],
  ['<BookOpen size={17} /> 📖 દૈનિક Daily Cashbook (Daily Daybook)', '<BookOpen size={15} /> 📖 Daily Cashbook (Rojmel Daybook)'],
  ['<Wallet size={17} /> 🏦 ખાતાઓ અને Balance (Payment Accounts & Live Balances)', '<Wallet size={15} /> 🏦 Payment Accounts & Live Balances'],
  ['{ id: \'today\', label: \'આજનો મેળ (Today)\' }', '{ id: \'today\', label: \'Today\' }'],
  ['{ id: \'yesterday\', label: \'ગઈકાલ (Yesterday)\' }', '{ id: \'yesterday\', label: \'Yesterday\' }'],
  ['{ id: \'this_week\', label: \'આ અઠવાડિયું (This Week)\' }', '{ id: \'this_week\', label: \'This Week\' }'],
  ['{ id: \'this_month\', label: \'આ મહિનો (This Month)\' }', '{ id: \'this_month\', label: \'This Month\' }'],
  ['દૈનિક મેળ હિસાબ સારાંશ (Daily Daybook Summary)', 'Daily Daybook Financial Summary'],
  ['સમય:', 'Time:'],
  ['{/* 1. Total Sales for Selected Date (કુલ વેચાણ) */}', '{/* 1. Total Sales for Selected Date */}'],
  ['કુલ વેચાણ (TOTAL SALES)', 'TOTAL SALES'],
  ['<span>બિલ: <strong>{rojmelData?.sales_summary?.total_bills || 0}</strong></span>', '<span>Bills: <strong>{rojmelData?.sales_summary?.total_bills || 0}</strong></span>'],
  ['<span>જથ્થો: <strong>{rojmelData?.sales_summary?.total_kg || 0} KG</strong></span>', '<span>Weight: <strong>{rojmelData?.sales_summary?.total_kg || 0} KG</strong></span>'],
  ['<span>રોકડ: {formatCurrency(rojmelData?.sales_summary?.cash_sales || 0)}</span>', '<span>Cash: {formatCurrency(rojmelData?.sales_summary?.cash_sales || 0)}</span>'],
  ['શરૂઆતની Balance (OPENING)', 'OPENING BALANCE'],
  ['<span>રોકડ: {formatCurrency(rojmelData?.opening_cash || 0)}</span>', '<span>Cash: {formatCurrency(rojmelData?.opening_cash || 0)}</span>'],
  ['<span>બેંક: {formatCurrency(rojmelData?.opening_bank || 0)}</span>', '<span>Bank: {formatCurrency(rojmelData?.opening_bank || 0)}</span>'],
  ['કુલ Inflow (TOTAL INFLOW / જમા)', 'TOTAL INFLOW (RECEIPTS)'],
  ['વેચાણ, ગ્રાહક જમા રકમ અને બેંક Inflow', 'Sales receipts, party collections, and account inflows'],
  ['કુલ Outflow (TOTAL OUTFLOW / ઉધાર)', 'TOTAL OUTFLOW (PAYMENTS)'],
  ['ખરીદી, વેપારી ચુકવણી અને કારખાના ખર્ચા', 'Material purchases, vendor payments, and operational expenses'],
  ['ચોખ્ખો ફેરફાર:', 'Net Flow:'],
  ['<span style={{ fontWeight: 800, color: \'#475569\' }}>હાજર Balance:</span>', '<span style={{ fontWeight: 800, color: \'#475569\' }}>Closing Balances:</span>'],
  ['💵 રોકડ ગલ્લો:', '💵 Cash Drawer:'],
  ['🏦 બેંક એકાઉન્ટ:', '🏦 Bank Account:'],
  ['<CheckCircle2 size={15} /> દિવસનો મેળ બંધ (Daybook Balanced)', '<CheckCircle2 size={14} /> Daybook Reconciled & Balanced'],
  ['દૈનિક મેળ સ્નેપશોટ અને વોટ્સએપ શેરિંગ (1-Click Owner WhatsApp Share)', '1-Click Daily Daybook Snapshot & WhatsApp Share'],
  ['આ તારીખ માટે કોઈ Daily Cashbook એન્ટ્રી મળી નto (No transactions recorded for this period).', 'No transactions recorded for this date range.'],
  ['<label className="form-label">📤 From Account (ક્યાંto ઉપાડ્યા? / Source) *</label>', '<label className="form-label">📤 From Account (Source) *</label>']
]);

console.log('Final 3 files cleaned!');
