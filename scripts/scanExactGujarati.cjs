const fs = require('fs');

const files = [
  'src/App.tsx',
  'src/api/client.ts',
  'src/components/accounting/RojmelView.tsx',
  'src/components/expenses/ExpenseModal.tsx',
  'src/components/expenses/ExpensesView.tsx',
  'src/components/manufacturing/ManufacturingView.tsx',
  'src/components/manufacturing/NewBatchModal.tsx',
  'src/components/parties/CustomersView.tsx',
  'src/components/parties/PartyLedgerModal.tsx',
  'src/components/parties/PaymentModal.tsx',
  'src/components/products/ProductModal.tsx',
  'src/components/products/ProductsView.tsx',
  'src/components/products/RawMaterialModal.tsx',
  'src/components/products/RawMaterialsView.tsx',
  'src/components/purchases/NewPurchaseModal.tsx',
  'src/components/purchases/PurchasesView.tsx',
  'src/components/reports/GoogleSheetPnLView.tsx',
  'src/components/reports/ReportsView.tsx'
];

const gujRegex = /[\u0A80-\u0AFF]/;
files.forEach(f => {
  if (fs.existsSync(f)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (gujRegex.test(l)) {
        console.log(`${f}:${i + 1} ${l.trim()}`);
      }
    });
  }
});
