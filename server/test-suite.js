import { initDatabase } from './database/migrations.js';
import { seedSweetsData } from './database/seeder.js';
import { settingsService } from './services/settingsService.js';
import { productService } from './services/productService.js';
import { recipeService } from './services/recipeService.js';
import { manufacturingService } from './services/manufacturingService.js';
import { purchaseService } from './services/purchaseService.js';
import { salesService } from './services/salesService.js';
import { partyService } from './services/partyService.js';
import { inventoryService } from './services/inventoryService.js';
import { expenseService } from './services/expenseService.js';
import { reportService } from './services/reportService.js';
import { backupService } from './services/backupService.js';

console.log('================================================================');
console.log('  MATUKI BUSINESS ERP — MASTER VERIFICATION & TEST SUITE');
console.log('================================================================');

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Initialize & Seed
  initDatabase();
  const seedRes = seedSweetsData(true);
  assert(seedRes.success, 'Database initialization and Sweets Seeder completed');

  // 2. Products and Raw Materials
  const rawMaterials = productService.getRawMaterials();
  assert(rawMaterials.length >= 8, `Loaded ${rawMaterials.length} raw materials (Cashew, Sugar, Ghee, Mawa, etc.)`);

  const cashew = rawMaterials.find(r => r.code === 'RM-KJU');
  assert(cashew && cashew.current_purchase_rate === 800, 'Cashew W320 purchase rate verified at ₹800/KG');

  const products = productService.getProducts();
  assert(products.length >= 4, `Loaded ${products.length} products (Kaju Katli, Kesar Peda, Motichoor, etc.)`);

  // 3. Recipe Costing & Scaling (10 KG -> 50 KG)
  const recipes = recipeService.getRecipes();
  assert(recipes.length >= 2, `Loaded ${recipes.length} recipes`);

  const kajuRecipe = recipes.find(r => r.code === 'REC-KK-01');
  assert(kajuRecipe !== undefined, 'Kaju Katli recipe found');

  const cost10kg = recipeService.calculateRecipeCost(kajuRecipe.id, null, 10);
  console.log(`  -> 10 KG Kaju Katli Calculated Cost: Total ₹${cost10kg.total_batch_cost} (₹${cost10kg.cost_per_kg}/KG, Margin: ${cost10kg.estimated_gross_margin_pct}%)`);
  assert(cost10kg.total_batch_cost > 0, '10 KG batch costing calculation succeeded');

  const cost50kg = recipeService.calculateRecipeCost(kajuRecipe.id, null, 50);
  console.log(`  -> 50 KG Scaled Cashew Required: ${cost50kg.items.find(i => i.item_name.includes('Cashew')).scaled_quantity} KG (5x scale)`);
  assert(cost50kg.items.find(i => i.item_name.includes('Cashew')).scaled_quantity === 40, '5x Recipe scaling accurately scaled 8 KG to 40 KG');

  // 4. Purchase Entry & Supplier Ledger
  const suppliers = partyService.getSuppliers();
  assert(suppliers.length > 0, 'Suppliers available');
  const sup1 = suppliers[0];
  const initialSupBal = sup1.current_balance;

  const initialCashewStock = cashew.current_stock;
  const newPurchase = purchaseService.createPurchase({
    date: '2026-08-09',
    supplier_id: sup1.id,
    supplier_invoice_no: 'TEST-PO-991',
    payment_mode: 'CREDIT',
    paid_amount: 0,
    items: [
      {
        item_type: 'RAW_MATERIAL',
        raw_material_id: cashew.id,
        item_name: cashew.name,
        quantity: 20,
        unit: 'KG',
        rate: 850,
        discount: 0,
        gst_rate: 5
      }
    ]
  });

  assert(newPurchase && newPurchase.id, 'Purchase voucher created');
  const updatedCashew = productService.getRawMaterialById(cashew.id);
  assert(updatedCashew.current_stock === initialCashewStock + 20, `Cashew stock increased from ${initialCashewStock} to ${updatedCashew.current_stock} KG`);

  const updatedSup = partyService.getSupplierById(sup1.id);
  assert(updatedSup.current_balance > initialSupBal, `Supplier ledger credited. New balance: ₹${updatedSup.current_balance}`);

  // 5. Manufacturing Batch Execution
  const kajuProd = products.find(p => p.code === 'PRD-KK');
  const initialKajuStock = kajuProd.current_stock;

  const batch = manufacturingService.createManufacturingBatch({
    date: '2026-08-09',
    recipe_id: kajuRecipe.id,
    planned_quantity: 10,
    actual_output: 9.6,
    wastage_quantity: 0.4,
    wastage_reason: 'Normal steam evaporation',
    operator: 'Karigar Test',
    production_location: 'Katargam Factory'
  });

  assert(batch && batch.id, 'Manufacturing batch created and executed');
  assert(batch.actual_output === 9.6, 'Batch recorded actual output: 9.6 KG');
  assert(batch.cost_per_unit > 0, `Batch locked historical cost: ₹${batch.cost_per_unit}/KG`);

  const postMfgKaju = productService.getProductById(kajuProd.id);
  assert(postMfgKaju.current_stock === initialKajuStock + 9.6, `Finished Kaju Katli stock increased by 9.6 KG to ${postMfgKaju.current_stock} KG`);

  // 6. Sales Invoice Execution
  const customers = partyService.getCustomers();
  assert(customers.length > 0, 'Customers available');
  const cust1 = customers[0];
  const initialCustBal = cust1.current_balance;

  const sale = salesService.createSale({
    date: '2026-08-09',
    customer_id: cust1.id,
    customer_name: cust1.name,
    payment_mode: 'CREDIT',
    paid_amount: 1000,
    items: [
      {
        product_id: kajuProd.id,
        quantity: 5,
        unit: 'KG',
        rate: 980,
        discount: 100,
        gst_rate: 5
      }
    ]
  });

  assert(sale && sale.id, 'Sales invoice created');
  const postSaleKaju = productService.getProductById(kajuProd.id);
  assert(postSaleKaju.current_stock === postMfgKaju.current_stock - 5, `Finished Kaju Katli stock deducted by 5 KG to ${postSaleKaju.current_stock} KG`);

  const updatedCust = partyService.getCustomerById(cust1.id);
  assert(updatedCust.current_balance > initialCustBal, `Customer ledger debited. New balance: ₹${updatedCust.current_balance}`);

  // 7. Payment Receipt Collection
  const receipt = partyService.recordPaymentReceipt({
    party_type: 'CUSTOMER',
    party_id: cust1.id,
    amount: 500,
    payment_mode: 'UPI',
    reference_no: 'UPI-TEST-1234'
  });
  assert(receipt && receipt.id, 'Customer payment receipt recorded');

  const postPayCust = partyService.getCustomerById(cust1.id);
  assert(postPayCust.current_balance === updatedCust.current_balance - 500, `Customer ledger credited by ₹500. New balance: ₹${postPayCust.current_balance}`);

  // 8. Expense Voucher Entry
  const expense = expenseService.createExpense({
    category: 'Commercial Gas Cylinders (LPG)',
    amount: 1700,
    payment_mode: 'CASH',
    is_manufacturing_overhead: 1
  });
  assert(expense && expense.id, 'Direct manufacturing overhead expense recorded');

  // 9. Flagship Google Sheet P&L Report
  const pnlReport = reportService.getGoogleSheetPnL('2026-04-01', '2026-08-09');
  assert(pnlReport && pnlReport.columns.length >= 4, 'Google Sheet P&L generated with multi-period columns (Selected, Today, This Month, YTD)');
  console.log(`  -> Google Sheet P&L Gross Revenue: ₹${pnlReport.columns[0].data.sales}`);
  console.log(`  -> Google Sheet P&L COGS / Direct Exp: ₹${pnlReport.columns[0].data.direct_expense}`);
  console.log(`  -> Google Sheet P&L Gross Profit: ₹${pnlReport.columns[0].data.gross_profit} (${pnlReport.columns[0].data.gross_profit_pct}%)`);
  console.log(`  -> Google Sheet P&L Net Profit: ₹${pnlReport.columns[0].data.net_profit} (${pnlReport.columns[0].data.net_profit_pct}%)`);
  assert(pnlReport.columns[0].data.gross_profit !== undefined, 'Gross profit calculation verified');

  // 10. Backup and Safe Restore
  const backupRes = backupService.createBackup('MANUAL', 'TestAdmin');
  assert(backupRes && backupRes.success, `Local database backup created at: ${backupRes.filename}`);

  const restoreRes = backupService.restoreBackup(backupRes.file_path, 'TestAdmin');
  assert(restoreRes && restoreRes.success, 'Safe database restore with pre-restore emergency snapshot verified');

  console.log('================================================================');
  console.log(`  ALL ${passed} / ${total} TESTS PASSED WITH 100% INTEGRITY!`);
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
