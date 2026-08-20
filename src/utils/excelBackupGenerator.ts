import { exportToCSV } from './exportUtils';
import { formatCurrency, formatDate } from './formatters';

export const exportAllDataToMasterExcel = (data: any) => {
  const tables = data.tables || {};
  const summary = data.summary || {};
  const today = new Date().toISOString().split('T')[0];

  // 1. MASTER SUMMARY SHEET
  const masterRows: any[] = [
    ['MATUKI SWEETS - COMPLETE BUSINESS BACKUP & DATA AUDIT'],
    ['Export Date', new Date().toLocaleString('en-IN')],
    ['Business Name', 'MATUKI SWEETS (Katargam, Surat)'],
    ['Total Sales Revenue (₹)', summary.total_sales || 0],
    ['Total Purchases (₹)', summary.total_purchases || 0],
    ['Total Registered Customers', summary.total_customers || 0],
    ['Total Registered Suppliers', summary.total_suppliers || 0],
    ['Total Product Catalog Items', summary.total_products || 0],
    ['Total Stock Inventory Valuation (₹)', summary.total_inventory_valuation || 0],
    [],
    ['=== 1. SALES INVOICES REGISTER ==='],
    ['Invoice #', 'Date', 'Customer Name', 'Mobile', 'Delivery Venue / Address', 'Rickshaw Driver', 'Driver Rent (₹)', 'Rent Status', 'Vasan Notes', 'Grand Total (₹)', 'Paid (₹)', 'Due (₹)', 'Payment Mode', 'Notes']
  ];

  (tables.sales || []).forEach((s: any) => {
    masterRows.push([
      s.invoice_no,
      formatDate(s.date),
      s.customer_name,
      s.customer_mobile || '',
      s.delivery_venue || s.delivery_address || '',
      s.rickshaw_driver_name || '',
      s.rickshaw_rent || 0,
      s.rickshaw_rent_status || 'NONE',
      s.vasan_notes || '',
      s.grand_total,
      s.paid_amount,
      s.due_amount,
      s.payment_mode,
      s.notes || ''
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 2. CUSTOMERS KHATA & RECEIVABLES ===']);
  masterRows.push(['Code', 'Customer Name', 'Mobile', 'Address', 'GSTIN', 'Opening Balance (₹)', 'Current Balance Due (₹)', 'Credit Limit (₹)']);
  (tables.customers || []).forEach((c: any) => {
    masterRows.push([
      c.code || '',
      c.name,
      c.mobile || '',
      c.address || '',
      c.gstin || '',
      c.opening_balance || 0,
      c.current_balance || 0,
      c.credit_limit || 0
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 3. ITEMS CATALOG & STOCK VALUATION ===']);
  masterRows.push(['Item Code', 'Item Name', 'Category', 'Type', 'Unit', 'Purchase/Mfg Rate (₹)', 'Selling Rate (₹)', 'Current Stock', 'Stock Valuation (₹)']);
  (tables.products || []).forEach((p: any) => {
    masterRows.push([
      p.code,
      p.name,
      p.category,
      p.product_type,
      p.unit,
      p.purchase_rate,
      p.selling_rate,
      p.current_stock,
      p.stock_valuation || (p.current_stock * p.purchase_rate)
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 4. PURCHASES REGISTER ===']);
  masterRows.push(['Purchase #', 'Date', 'Supplier Name', 'Supplier Bill #', 'Grand Total (₹)', 'Paid (₹)', 'Due (₹)', 'Payment Mode', 'Notes']);
  (tables.purchases || []).forEach((p: any) => {
    masterRows.push([
      p.purchase_no,
      formatDate(p.date),
      p.supplier_name,
      p.supplier_invoice_no || '',
      p.grand_total,
      p.paid_amount,
      p.due_amount,
      p.payment_mode,
      p.notes || ''
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 5. PAYMENTS & COLLECTIONS JOURNAL ===']);
  masterRows.push(['Receipt #', 'Date', 'Party Type', 'Party Name', 'Amount (₹)', 'Mode', 'Notes']);
  (tables.payments || []).forEach((pay: any) => {
    masterRows.push([
      pay.payment_no,
      formatDate(pay.payment_date),
      pay.party_type,
      pay.party_name,
      pay.amount,
      pay.payment_mode,
      pay.notes || ''
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 6. MANUFACTURING BATCHES ===']);
  masterRows.push(['Batch #', 'Production Date', 'Sweet Product', 'Output Qty', 'Unit', 'Raw Material Cost (₹)', 'Labour Cost (₹)', 'Overhead (₹)', 'Total Cost (₹)', 'Cost/KG (₹)', 'Karigar Name']);
  (tables.manufacturing_batches || []).forEach((mb: any) => {
    masterRows.push([
      mb.batch_no,
      formatDate(mb.production_date),
      mb.product_name,
      mb.actual_qty,
      mb.unit,
      mb.raw_material_cost,
      mb.labour_cost,
      mb.other_expenses,
      mb.total_cost,
      mb.unit_cost,
      mb.karigar_name || ''
    ]);
  });

  masterRows.push([]);
  masterRows.push(['=== 7. VASAN (CONTAINER) TRACKING LEDGER ===']);
  masterRows.push(['Date', 'Invoice #', 'Customer Name', 'Venue', 'Sweet Item', 'Container Type', 'Issued Qty', 'Returned Qty', 'Pending Due Qty', 'Status']);
  (tables.vasan_ledger || []).forEach((v: any) => {
    masterRows.push([
      formatDate(v.date),
      v.invoice_no,
      v.customer_name,
      v.delivery_venue || '',
      v.item_name,
      v.vasan_type,
      v.issued_qty,
      v.returned_qty,
      v.due_qty,
      v.status
    ]);
  });

  // Export Master Consolidated File
  exportToCSV(masterRows, `MATUKI_MASTER_COMPLETE_BACKUP_${today}.csv`);
};

export const exportIndividualTableExcel = (tableName: string, data: any[]) => {
  const today = new Date().toISOString().split('T')[0];
  exportToCSV(data, `Matuki_Table_${tableName}_${today}.csv`);
};
