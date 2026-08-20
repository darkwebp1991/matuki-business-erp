// Export any array of objects to CSV download
export function exportToCSV(data: any[], filename = 'export.csv') {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => (
    headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'string') {
        // Escape quotes
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  ));

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Google Sheet P&L Grid to CSV
export function exportPnLToCSV(pnlData: any, filename = 'Matuki_Sweets_PnL.csv') {
  if (!pnlData || !pnlData.columns) return;

  const cols = pnlData.columns;
  const colHeaders = ['PARTICULARS / ACCOUNT HEAD', ...cols.map((c: any) => c.label)];

  const formatVal = (v: number) => v.toFixed(2);

  const lines: string[][] = [
    ['MATUKI SWEETS - TRADING & MANUFACTURING PROFIT AND LOSS STATEMENT'],
    [`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, `Closing Stock Valuation: Rs. ${pnlData.current_inventory_valuation}`],
    [],
    colHeaders,
    ['--- 1. REVENUE & GROSS SALES ---', ...cols.map(() => '')],
    ['Gross Sweets Sales & Revenue', ...cols.map((c: any) => formatVal(c.data.revenue))],
    ['Total Gross Inflow (A)', ...cols.map((c: any) => formatVal(c.data.revenue))],
    [],
    ['--- 2. COST OF GOODS SOLD (COGS) ---', ...cols.map(() => '')],
    ['Raw Material Purchases (Cashew, Ghee, Sugar, Mawa, Milk)', ...cols.map((c: any) => formatVal(c.data.raw_purchases))],
    ['Direct Karigar Wages & Labour', ...cols.map((c: any) => formatVal(c.data.direct_labour))],
    ['Direct Factory Overhead (Gas Cylinders, Power)', ...cols.map((c: any) => formatVal(c.data.direct_overhead))],
    ['Cost of Goods Sold (COGS) (B)', ...cols.map((c: any) => formatVal(c.data.cogs))],
    [],
    ['--- 3. GROSS MANUFACTURING PROFIT ---', ...cols.map(() => '')],
    ['Gross Profit (A - B)', ...cols.map((c: any) => formatVal(c.data.gross_profit))],
    ['Gross Profit Margin (%)', ...cols.map((c: any) => `${c.data.gross_margin_pct}%`)],
    [],
    ['--- 4. INDIRECT OPERATING EXPENSES ---', ...cols.map(() => '')],
    ['Total Shop Rent, Staff, Electricity, Marketing', ...cols.map((c: any) => formatVal(c.data.operating_expenses))],
    [],
    ['--- 5. NET PROFIT ---', ...cols.map(() => '')],
    ['Net Business Profit', ...cols.map((c: any) => formatVal(c.data.net_profit))],
    ['Net Profit Margin (%)', ...cols.map((c: any) => `${c.data.net_margin_pct}%`)]
  ];

  const csvRows = lines.map(row => (
    row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
  ));

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Physical Stock Audit Checklist for 3 Branches (Printable on A4 / Editable in Excel)
export function exportStockAuditCSV(items: any[], summary: any, auditMonth: string, auditorName: string = 'Suraj Bhai / Paresh Patel') {
  const headers = [
    'Item Code',
    'Item Name',
    'Category',
    'Unit',
    'Cost Rate (Rs)',
    'ERP Book Qty',
    'Factory Physical Count (MFG)',
    'Variance Qty (+/-)',
    'Factory Valuation (Rs)',
    'Physical Audit Remarks / Checked By'
  ];

  const rows = items.map(i => [
    i.item_code,
    i.item_name,
    i.category_name,
    i.unit,
    i.cost_rate,
    i.system_stock,
    i.factory_stock,
    i.variance_qty,
    i.total_valuation,
    ''
  ]);

  const csvRows = [
    [`MATUKI SWEETS - MONTHLY STOCK AUDIT & 3-BRANCH VALUATION HISAB (${auditMonth})`],
    [`Audit Instructions: 1. Count items physically at Central Factory & Godown (MFG). 2. For Sarthana and Katargam branches, enter direct category-wise totals and final valuation.`],
    [],
    [`--- SECTION 1: FACTORY & GODOWN ITEM-WISE PHYSICAL COUNT ---`],
    headers,
    ...rows,
    [],
    [`--- SECTION 2: 3-BRANCH CLOSING VALUATION SUMMARY (GOOGLE P&L HISAB) ---`],
    [`1. Central Factory & Godown (MFG) Audited Valuation:`, `Rs. ${summary?.factory_valuation || 0}`],
    [`2. Sarthana Branch Direct Valuation:`, `Rs. ${summary?.sarthana_valuation || 0}`, `Category Breakdown Notes:`, `${summary?.sarthana_notes || 'Kaju Sweets, Mawa, Farsan'}`],
    [`3. Katargam Branch Direct Valuation:`, `Rs. ${summary?.katargam_valuation || 0}`, `Category Breakdown Notes:`, `${summary?.katargam_notes || 'Kaju Katli, Bengali Sweets, Boxes'}`],
    [],
    [`💰 TOTAL CLOSING STOCK (P&L WN 4):`, `Rs. ${summary?.total_valuation || 0}`],
    [`Auditor Name:`, `${auditorName || 'Suraj Bhai / Paresh Patel'}`]
  ];

  const formattedLines = csvRows.map(row => (
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ));

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + formattedLines.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Matuki_Stock_Audit_3_Branches_${auditMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse uploaded CSV content into array of objects
export function parseCSV(text: string): Array<Record<string, any>> {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Find header line (first line containing 'Item Code' or 'Item Name' or at least 4 comma separated fields)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('item code') || l.includes('item name') || l.includes('factory') || l.includes('rate')) {
      headerIndex = i;
      break;
    }
  }

  // Helper to split CSV row handling quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[headerIndex]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: Array<Record<string, any>> = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < 2) continue;
    // Skip summary or total rows
    const firstVal = (values[0] || '').toLowerCase();
    if (firstVal === 'totals' || firstVal === 'total' || firstVal.startsWith('matuki')) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

// Download Sample CSV Template for Items / Sweets Master
export function downloadItemTemplateCSV() {
  const headers = ['Item Name', 'Category', 'Unit', 'Sale Price (Rs)', 'Cost Price (Rs)', 'Min Stock Alert', 'HSN Code', 'Available Online (1/0)'];
  const sampleRows = [
    ['Kaju Katli (કાજુ કતરી)', 'Kaju Sweets', 'KG', '950', '720', '10', '21069099', '1'],
    ['Kesar Peda (કેસર પેંડા)', 'Mawa Sweets', 'KG', '580', '420', '5', '21069099', '1'],
    ['Surti Farsan Mix (સુરતી ફરસાણ)', 'Desi Ghee Snacks', 'KG', '360', '240', '15', '21069099', '1'],
    ['Cashew W320 Raw (કાજુ ટુકડા)', 'Nuts & Dry Fruits', 'KG', '0', '680', '25', '08013210', '0'],
    ['Desi Cow Ghee (શુદ્ધ ઘી)', 'Dairy & Fats', 'KG', '0', '650', '50', '04059020', '0']
  ];

  const lines = [headers, ...sampleRows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', 'Matuki_Items_Bulk_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download Sample CSV Template for Customers / Parties
export function downloadCustomerTemplateCSV() {
  const headers = ['Party Name', 'Mobile No', 'Address', 'City', 'Credit Limit (Rs)', 'Opening Balance (Rs)', 'GSTIN', 'Notes'];
  const sampleRows = [
    ['Rameshwar Caterers & Mandap', '9825012345', 'Main Ring Road', 'Surat', '100000', '0', '24AAACM1234F1Z5', 'Wholesale catering partner'],
    ['Mahalaxmi Sweets & Snacks', '9898011223', 'Station Road', 'Surat', '50000', '0', '', 'Regular weekly buyer'],
    ['Pareshbhai Patel (VIP)', '9876543210', 'Katargam', 'Surat', '25000', '0', '', 'Retail VIP account']
  ];

  const lines = [headers, ...sampleRows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', 'Matuki_Customers_Bulk_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download Sample CSV Template for Suppliers / Vendors
export function downloadSupplierTemplateCSV() {
  const headers = ['Supplier Name', 'Mobile No', 'Contact Person', 'Address', 'City', 'Bank Name', 'Account No', 'IFSC Code', 'UPI ID', 'Opening Balance (Rs)'];
  const sampleRows = [
    ['Shreeji Dairy & Desi Ghee', '9824055667', 'Rajeshbhai', 'APMC Market', 'Surat', 'HDFC Bank', '50200012345678', 'HDFC0001234', 'shreeji@hdfcbank', '0'],
    ['Gujarat Dryfruits Syndicate', '9925099887', 'Dineshbhai', 'Relief Road', 'Ahmedabad', 'ICICI Bank', '001105001234', 'ICIC0000011', 'gujdry@icici', '0'],
    ['Vimal Packaging Boxes', '9898122334', 'Vimalbhai', 'GIDC Sachin', 'Surat', 'SBI Bank', '302911223344', 'SBIN0001234', '', '0']
  ];

  const lines = [headers, ...sampleRows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', 'Matuki_Suppliers_Bulk_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
