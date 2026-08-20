import { initDatabase } from '../server/database/migrations.js';
import { seedSweetsData } from '../server/database/seeder.js';
import { reportService } from '../server/services/reportService.js';

initDatabase();
seedSweetsData(false);

const startDate = '2026-04-01';
const endDate = '2026-08-20';

import { salesService } from '../server/services/salesService.js';
import { partyService } from '../server/services/partyService.js';
import { inventoryService } from '../server/services/inventoryService.js';

const reportsToTest = [
  { name: 'getDashboardMetrics', fn: () => reportService.getDashboardMetrics('this_month') },
  { name: 'getGoogleSheetPnL', fn: () => reportService.getGoogleSheetPnL(startDate, endDate) },
  { name: 'getSaleReport', fn: () => reportService.getSaleReport(startDate, endDate) },
  { name: 'getPurchaseReport', fn: () => reportService.getPurchaseReport(startDate, endDate) },
  { name: 'getDayBook', fn: () => reportService.getDayBook(endDate) },
  { name: 'getAllTransactions', fn: () => reportService.getAllTransactions(startDate, endDate) },
  { name: 'getBillWiseProfit', fn: () => reportService.getBillWiseProfit(startDate, endDate) },
  { name: 'getCashFlow', fn: () => reportService.getCashFlow(startDate, endDate) },
  { name: 'getTrialBalance', fn: () => reportService.getTrialBalance() },
  { name: 'getBalanceSheet', fn: () => reportService.getBalanceSheet() },
  { name: 'getPartyWiseProfitAndLoss', fn: () => reportService.getPartyWiseProfitAndLoss(startDate, endDate) },
  { name: 'getPartyReportByItem', fn: () => reportService.getPartyReportByItem(startDate, endDate) },
  { name: 'getSalePurchaseByParty', fn: () => reportService.getSalePurchaseByParty() },
  { name: 'getItemWiseProfitAndLoss', fn: () => reportService.getItemWiseProfitAndLoss(startDate, endDate) },
  { name: 'getItemCategoryWiseProfitAndLoss', fn: () => reportService.getItemCategoryWiseProfitAndLoss(startDate, endDate) },
  { name: 'getLowStockSummary', fn: () => reportService.getLowStockSummary() },
  { name: 'getManufacturingYieldReport', fn: () => reportService.getManufacturingYieldReport(startDate, endDate) },
  { name: 'getItemMovementAnalysis', fn: () => reportService.getItemMovementAnalysis(startDate, endDate) },
  { name: 'getRojmel', fn: () => reportService.getRojmel(startDate, endDate) },
  { name: 'getDriverTripsReport', fn: () => salesService.getDriverTripsReport({ startDate, endDate }) },
  { name: 'getVasanLedger', fn: () => salesService.getVasanLedger({ startDate, endDate }) },
  { name: 'getVasanYadi', fn: () => salesService.getVasanYadi({ startDate, endDate }) },
  { name: 'getPartyLedgerStatement', fn: () => { const cust = partyService.getCustomers()[0]; return partyService.getPartyLedgerStatement('CUSTOMER', cust.id, startDate, endDate); } },
  { name: 'getAllStockItems', fn: () => inventoryService.getAllStockItems() }
];

console.log('--- TESTING ALL REPORTS IN REPORT SERVICE ---');
let passed = 0;
let failed = 0;

for (const report of reportsToTest) {
  try {
    const res = report.fn();
    console.log(`[PASS] ${report.name}: OK`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${report.name}:`, err.message);
    console.error(err.stack);
    failed++;
  }
}

console.log(`\nRESULTS: ${passed} passed, ${failed} failed out of ${reportsToTest.length} reports.`);
