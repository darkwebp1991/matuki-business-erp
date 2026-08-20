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

// 1. RojmelView.tsx
replaceInFile('src/components/accounting/RojmelView.tsx', [
  ['સ્ટાફ મેમ્બર દિવસના અંતે ૧-ક્લિકમાં આ ફ્રેમનો ફોટો અને વિગતવાર લખાણ માલિકના વોટ્સએપ પર મોકલી શકે છે', 'Export and share daily closing daybook summary to WhatsApp'],
  ['{isCapturing ? \'Capturing Snapshot...\' : \'📱 Send to WhatsApp (વોટ્સએપ પર મોકલો)\'}', '{isCapturing ? \'Capturing Snapshot...\' : \'📱 Send to WhatsApp\'}'],
  ['<h3 style={{ margin: \'4px 0\', fontSize: \'1.1rem\' }}>દૈનિક Daily Cashbook પત્રક (DAILY ROJMEL DAYBOOK)</h3>', '<h3 style={{ margin: \'4px 0\', fontSize: \'1.1rem\' }}>DAILY CASH & BANK DAYBOOK (ROJMEL)</h3>'],
  ['તારીખ:', 'Date:'],
  ['થી', 'to'],
  ['ખાતું:', 'Account:'],
  ['બધા ખાતાઓ', 'All Accounts'],
  ['<th style={{ padding: \'10px 12px\', textAlign: \'left\', width: \'110px\', color: \'#475569\', fontWeight: 800 }}>તારીખ (Date)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'left\', width: \'110px\', color: \'#475569\', fontWeight: 800 }}>Date</th>'],
  ['<th style={{ padding: \'10px 12px\', textAlign: \'left\', width: \'130px\', color: \'#475569\', fontWeight: 800 }}>વાઉચર નં (Voucher)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'left\', width: \'130px\', color: \'#475569\', fontWeight: 800 }}>Voucher #</th>'],
  ['<th style={{ padding: \'10px 12px\', textAlign: \'left\', color: \'#475569\', fontWeight: 800 }}>વિગત / પાર્ટીનું નામ (Party / Particulars)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'left\', color: \'#475569\', fontWeight: 800 }}>Particulars / Party</th>'],
  ['<th style={{ padding: \'10px 12px\', textAlign: \'left\', width: \'180px\', color: \'#475569\', fontWeight: 800 }}>ખાતું / માધ્યમ (Account)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'left\', width: \'180px\', color: \'#475569\', fontWeight: 800 }}>Account</th>'],
  ['<th style={{ padding: \'10px 14px\', textAlign: \'right\', width: \'130px\', color: \'#15803d\', fontWeight: 900 }}>Inflow / જમા (Inflow ₹)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'right\', width: \'130px\', color: \'#15803d\', fontWeight: 900 }}>Inflow (Receipt ₹)</th>'],
  ['<th style={{ padding: \'10px 14px\', textAlign: \'right\', width: \'130px\', color: \'#b91c1c\', fontWeight: 900 }}>Outflow / ઉધાર (Outflow ₹)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'right\', width: \'130px\', color: \'#b91c1c\', fontWeight: 900 }}>Outflow (Payment ₹)</th>'],
  ['<th style={{ padding: \'10px 12px\', textAlign: \'left\', color: \'#475569\', fontWeight: 700 }}>નોંધ (Remarks)</th>', '<th style={{ padding: \'8px 10px\', textAlign: \'left\', color: \'#475569\', fontWeight: 700 }}>Remarks</th>'],
  ['🌟 શરૂઆતની Balance (Opening Balance Brought Forward)', '🌟 Opening Balance Brought Forward'],
  ['આ તારીખ માટે કોઈ Daily Cashbook એન્ટ્રી મળી નથી (No transactions recorded for this period).', 'No transactions recorded for this selected date range.'],
  ['કુલ સરવાળો (Period Totals & Net Closing Balance):', 'Period Totals & Net Closing Balance:'],
  ['આખર Balance', 'Closing Balance'],
  ['ખાતા અને પેમેન્ટ માધ્યમ મેનેજમેન્ટ (Cash & Bank Accounts)', 'Cash & Bank Accounts Management'],
  ['દરેક બેંક એકાઉન્ટ, કેશ ડ્રોવર અને UPI QR ની લાઈવ Balance અને વિગતો', 'Live balances and settings for bank accounts, cash registers, and UPI QR'],
  ['<Plus size={16} /> + નવું બેંક/રોકડ ખાતું ઉમેરો', '<Plus size={15} /> + Add New Account'],
  ['લાઈવ Balance (Live Balance):', 'Live Balance:'],
  ['<ArrowRightLeft size={18} /> 💸 Contra Fund Transfer (રોકડ બેંક ટ્રાન્સફર)', '<ArrowRightLeft size={16} /> 💸 Contra Fund Transfer (Internal Transfer)'],
  ['<label className="form-label">📤 From Account (ક્યાંથી ઉપાડ્યા? / Source) *</label>', '<label className="form-label">📤 From Account (Source) *</label>'],
  ['<label className="form-label">📥 To Account (ક્યાં જમા કર્યા? / Destination) *</label>', '<label className="form-label">📥 To Account (Destination) *</label>'],
  ['<label className="form-label">Transfer Amount (રકમ ₹) *</label>', '<label className="form-label">Transfer Amount (₹) *</label>'],
  ['<label className="form-label">Account Name (ખાતાનું નામ) *</label>', '<label className="form-label">Account Name *</label>'],
  ['<option value="CASH">💵 Cash (રોકડ)</option>', '<option value="CASH">💵 Cash Register</option>'],
  ['<option value="BANK">🏦 Bank Account (બેંક એકાઉન્ટ)</option>', '<option value="BANK">🏦 Bank Account</option>'],
  ['<option value="UPI">📱 UPI / QR Code (ઓનલાઇન ક્યૂઆર)</option>', '<option value="UPI">📱 UPI / QR Code</option>'],
  ['<option value="OTHER">🪙 Other (અન્ય)</option>', '<option value="OTHER">🪙 Other</option>'],
  ['<label className="form-label">Opening Balance (શરૂઆતની Balance ₹)</label>', '<label className="form-label">Opening Balance (₹)</label>']
]);

// 2. Expenses
replaceInFile('src/components/expenses/ExpenseModal.tsx', [
  ['Expense (ખર્ચ વાઉચર)', 'Expense Voucher']
]);
replaceInFile('src/components/expenses/ExpensesView.tsx', [
  ['Expenses & Overheads (ધંધાકીય ખર્ચ)', 'Expenses & Overheads']
]);

// 3. Manufacturing
replaceInFile('src/components/manufacturing/ManufacturingView.tsx', [
  ['Manufacturing & Production Batches (ઉત્પાદન)', 'Manufacturing & Production Batches']
]);
replaceInFile('src/components/manufacturing/NewBatchModal.tsx', [
  ['Factory Overheads & Karigar Wages (કારીગર મજૂરી અને ગેસ ખર્ચ)', 'Factory Overheads & Karigar Wages']
]);

// 4. CustomersView.tsx
replaceInFile('src/components/parties/CustomersView.tsx', [
  ['*🧾 MATUKI SWEETS - વેચાણ બિલ*', '*🧾 MATUKI SWEETS - Sale Invoice*'],
  ['*ઇન્વોઇસ નં:*', '*Invoice #:*'],
  ['*તારીખ:*', '*Date:*'],
  ['*ગ્રાહક:*', '*Customer:*'],
  ['*આઈટમ વિગત:*', '*Items:*'],
  ['*કુલ બિલ રકમ:*', '*Grand Total:*'],
  ['*જમા રકમ:*', '*Paid Amount:*'],
  ['*બાકી રકમ:*', '*Balance Due:*'],
  ['*📊 શ્રી માતુકી સ્વીટ્સ - ગ્રાહક ખાતાવહી સ્ટેટમેન્ટ*', '*📊 Matuki Sweets - Customer Account Statement*'],
  ['*પાર્ટીનું નામ:*', '*Customer Name:*'],
  ['*મોબાઈલ:*', '*Mobile:*'],
  ['*કુલ બાકી રકમ (Balance Due):*', '*Balance Due:*']
]);

// 5. exportUtils.ts & pdfStatementGenerator.ts
replaceInFile('src/utils/exportUtils.ts', [
  ['--- 1. REVENUE & GROSS SALES (જમા / આવક) ---', '--- 1. REVENUE & GROSS SALES ---'],
  ['--- 2. COST OF GOODS SOLD (COGS / ઉત્પાદન પડતર) ---', '--- 2. COST OF GOODS SOLD (COGS) ---'],
  ['Direct Karigar Wages (કારીગર મજૂરી)', 'Direct Karigar Wages & Labour'],
  ['--- 3. GROSS MANUFACTURING PROFIT (કાચો નફો) ---', '--- 3. GROSS MANUFACTURING PROFIT ---'],
  ['--- 4. INDIRECT OPERATING EXPENSES (ઓપરેટિંગ ખર્ચ) ---', '--- 4. INDIRECT OPERATING EXPENSES ---'],
  ['--- 5. NET PROFIT (ચોખ્ખો નફો) ---', '--- 5. NET PROFIT ---']
]);
replaceInFile('src/utils/pdfStatementGenerator.ts', [
  ['(Balance લેવાના)', '(To Collect)']
]);

console.log('All 10 remaining files cleaned successfully!');
