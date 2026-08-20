export const SCHEMA_SQL = `
-- Business Settings
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL DEFAULT 'MATUKI SWEETS',
  subtitle TEXT NOT NULL DEFAULT 'Offline Sweets Manufacturing & Business Management System',
  address TEXT DEFAULT 'Main Bazar, Katargam, Surat, Gujarat - 395004',
  mobile TEXT DEFAULT '+91 98765 43210',
  email TEXT DEFAULT 'info@matukisweets.com',
  gstin TEXT DEFAULT '24AAACM1234F1Z5',
  invoice_prefix TEXT DEFAULT 'MS/26-27/',
  sale_start_seq INTEGER DEFAULT 1,
  sale_return_prefix TEXT DEFAULT 'SR/26-27/',
  sale_return_start_seq INTEGER DEFAULT 1,
  purchase_prefix TEXT DEFAULT 'PO/26-27/',
  purchase_start_seq INTEGER DEFAULT 1,
  purchase_return_prefix TEXT DEFAULT 'PR/26-27/',
  purchase_return_start_seq INTEGER DEFAULT 1,
  payment_in_prefix TEXT DEFAULT 'RCT-',
  payment_in_start_seq INTEGER DEFAULT 1,
  payment_out_prefix TEXT DEFAULT 'PAY-',
  payment_out_start_seq INTEGER DEFAULT 1,
  expense_prefix TEXT DEFAULT 'EXP-',
  expense_start_seq INTEGER DEFAULT 1,
  advance_order_prefix TEXT DEFAULT 'ORD-',
  advance_order_start_seq INTEGER DEFAULT 1,
  manufacturing_prefix TEXT DEFAULT 'MFG/26-27/',
  financial_year TEXT DEFAULT '2026-2027',
  currency_symbol TEXT DEFAULT '₹',
  costing_method TEXT DEFAULT 'WEIGHTED_AVERAGE', -- WEIGHTED_AVERAGE, LAST_PURCHASE, STANDARD
  allow_negative_stock INTEGER DEFAULT 0, -- 0 = No, 1 = Yes (Admin only)
  default_tax_rate REAL DEFAULT 5.0,
  default_units TEXT DEFAULT 'KG',
  backup_folder TEXT DEFAULT '',
  invoice_terms TEXT DEFAULT '1. Goods once sold will not be taken back without receipt.\\n2. Sweets are prepared with pure ingredients.\\n3. Keep refrigerated for maximum shelf life.',
  upi_id TEXT DEFAULT 'Q070321548@ybl',
  upi_qr_image TEXT DEFAULT '/payment_qr.png',
  template_polite TEXT DEFAULT NULL,
  template_weekly TEXT DEFAULT NULL,
  template_urgent TEXT DEFAULT NULL,
  template_dispatch TEXT DEFAULT NULL,
  partner_1_mobile TEXT DEFAULT '+91 90818 22283',
  partner_2_mobile TEXT DEFAULT '',
  partner_3_mobile TEXT DEFAULT '',
  auto_rojmel_time TEXT DEFAULT '20:45',
  auto_rojmel_enabled INTEGER DEFAULT 1,
  last_auto_rojmel_date TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN', -- ADMIN, MANAGER, CASHIER, PRODUCTION
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Roles & Module Permissions
CREATE TABLE IF NOT EXISTS roles_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view INTEGER DEFAULT 1,
  can_create INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_cancel INTEGER DEFAULT 0,
  can_approve INTEGER DEFAULT 0,
  can_export INTEGER DEFAULT 0,
  UNIQUE(role, module)
);

-- Standard Measurement Units
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL UNIQUE,
  unit_type TEXT NOT NULL, -- WEIGHT, VOLUME, COUNT
  base_unit TEXT NOT NULL, -- KG, LITRE, PCS
  conversion_to_base REAL NOT NULL DEFAULT 1.0, -- e.g. GM -> 0.001 KG, ML -> 0.001 Litre
  is_base INTEGER DEFAULT 0
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- RAW_MATERIAL, FINISHED_PRODUCT, SEMI_FINISHED, PACKAGING, EXPENSE
  description TEXT DEFAULT ''
);

-- Products Master (Finished & Semi-Finished & Services)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  subcategory TEXT DEFAULT '',
  product_type TEXT NOT NULL DEFAULT 'FINISHED_PRODUCT', -- FINISHED_PRODUCT, SEMI_FINISHED_PRODUCT, RAW_MATERIAL, PACKAGING, SERVICE
  unit TEXT NOT NULL DEFAULT 'KG',
  purchase_rate REAL DEFAULT 0.0,
  selling_rate REAL NOT NULL DEFAULT 0.0,
  wholesale_rate REAL DEFAULT 0.0,
  min_stock REAL DEFAULT 5.0,
  max_stock REAL DEFAULT 500.0,
  gst_rate REAL DEFAULT 5.0,
  hsn_code TEXT DEFAULT '21069099',
  opening_stock REAL DEFAULT 0.0,
  opening_stock_rate REAL DEFAULT 0.0,
  current_stock REAL DEFAULT 0.0,
  available_online INTEGER DEFAULT 1, -- 1 = Show in Customer QR & Web Online Order Menu, 0 = Hide
  active INTEGER DEFAULT 1,
  recipe_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Raw Materials Master
CREATE TABLE IF NOT EXISTS raw_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  unit TEXT NOT NULL DEFAULT 'KG',
  current_purchase_rate REAL NOT NULL DEFAULT 0.0,
  average_purchase_rate REAL NOT NULL DEFAULT 0.0,
  last_purchase_rate REAL NOT NULL DEFAULT 0.0,
  standard_rate REAL NOT NULL DEFAULT 0.0,
  min_stock REAL DEFAULT 10.0,
  opening_stock REAL DEFAULT 0.0,
  current_stock REAL DEFAULT 0.0,
  default_supplier_id INTEGER,
  gst_rate REAL DEFAULT 5.0,
  hsn_code TEXT DEFAULT '08013210',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Raw Material Purchase Rate History
CREATE TABLE IF NOT EXISTS raw_material_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_material_id INTEGER NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  purchase_id INTEGER,
  old_rate REAL NOT NULL,
  new_rate REAL NOT NULL,
  effective_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipes Header
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_size REAL NOT NULL DEFAULT 10.0,
  batch_unit TEXT NOT NULL DEFAULT 'KG',
  description TEXT DEFAULT '',
  active_version_id INTEGER,
  is_semi_finished INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Versions (Immutable historical versions)
CREATE TABLE IF NOT EXISTS recipe_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  expected_yield REAL NOT NULL DEFAULT 10.0,
  expected_yield_unit TEXT NOT NULL DEFAULT 'KG',
  expected_wastage_pct REAL NOT NULL DEFAULT 4.0,
  labour_cost_type TEXT DEFAULT 'PER_BATCH', -- PER_BATCH, PER_KG, FIXED
  labour_cost_rate REAL DEFAULT 500.0,
  overhead_cost_type TEXT DEFAULT 'PER_BATCH', -- PER_BATCH, PER_KG, PCT_MATERIAL
  overhead_cost_rate REAL DEFAULT 300.0,
  packaging_cost REAL DEFAULT 100.0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- DRAFT, APPROVED, ACTIVE, ARCHIVED
  created_by TEXT DEFAULT 'Admin',
  approved_by TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, version_number)
);

-- Recipe Items / Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS recipe_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_version_id INTEGER NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'RAW_MATERIAL', -- RAW_MATERIAL, SEMI_FINISHED, PACKAGING
  raw_material_id INTEGER REFERENCES raw_materials(id),
  semi_finished_product_id INTEGER REFERENCES products(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'KG',
  standard_rate REAL DEFAULT 0.0,
  notes TEXT DEFAULT ''
);

-- Manufacturing Orders / Production Batches
CREATE TABLE IF NOT EXISTS manufacturing_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturing_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  finished_product_id INTEGER NOT NULL REFERENCES products(id),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  recipe_version_id INTEGER NOT NULL REFERENCES recipe_versions(id),
  batch_number TEXT NOT NULL UNIQUE,
  planned_quantity REAL NOT NULL,
  planned_unit TEXT NOT NULL DEFAULT 'KG',
  actual_output REAL NOT NULL,
  actual_unit TEXT NOT NULL DEFAULT 'KG',
  wastage_quantity REAL DEFAULT 0.0,
  wastage_pct REAL DEFAULT 0.0,
  wastage_reason TEXT DEFAULT '',
  production_location TEXT DEFAULT 'Surat Sweets Factory',
  operator TEXT DEFAULT 'Master Chef / Karigar',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  -- Locked Historical Cost Snapshots
  total_material_cost REAL NOT NULL DEFAULT 0.0,
  total_labour_cost REAL NOT NULL DEFAULT 0.0,
  total_overhead_cost REAL NOT NULL DEFAULT 0.0,
  total_packaging_cost REAL NOT NULL DEFAULT 0.0,
  total_batch_cost REAL NOT NULL DEFAULT 0.0,
  cost_per_unit REAL NOT NULL DEFAULT 0.0,
  standard_cost_per_unit REAL NOT NULL DEFAULT 0.0,
  cost_variance REAL NOT NULL DEFAULT 0.0,
  cost_variance_pct REAL NOT NULL DEFAULT 0.0,
  costing_method_used TEXT DEFAULT 'WEIGHTED_AVERAGE',
  created_by TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing Consumed Items Snapshot
CREATE TABLE IF NOT EXISTS manufacturing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturing_order_id INTEGER NOT NULL REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- RAW_MATERIAL, SEMI_FINISHED
  raw_material_id INTEGER REFERENCES raw_materials(id),
  semi_finished_product_id INTEGER REFERENCES products(id),
  planned_quantity REAL NOT NULL,
  actual_quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_snapshot REAL NOT NULL,
  total_cost_snapshot REAL NOT NULL
);

-- Manufacturing Wastage Breakdown
CREATE TABLE IF NOT EXISTS manufacturing_wastage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturing_order_id INTEGER NOT NULL REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
  wastage_type TEXT NOT NULL, -- NORMAL_PROCESS_LOSS, SPILLAGE, DAMAGE, BURNING, QUALITY_REJECTION, OTHER
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  cost_loss REAL DEFAULT 0.0,
  reason TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  opening_balance REAL DEFAULT 0.0, -- Positive = Receivable from customer
  advance_balance REAL DEFAULT 0.0, -- Advance deposit held with Matuki Sweets
  credit_limit REAL DEFAULT 50000.0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  opening_balance REAL DEFAULT 0.0, -- Positive = Payable to supplier
  credit_terms TEXT DEFAULT 'Net 15 Days',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales / Invoices
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL DEFAULT 'Cash Customer',
  customer_mobile TEXT DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL DEFAULT 0.0,
  delivery_charge REAL DEFAULT 0.0,
  advance_adjusted REAL DEFAULT 0.0,
  tax_amount REAL DEFAULT 0.0,
  round_off REAL DEFAULT 0.0,
  grand_total REAL NOT NULL DEFAULT 0.0,
  paid_amount REAL NOT NULL DEFAULT 0.0,
  due_amount REAL NOT NULL DEFAULT 0.0,
  payment_mode TEXT NOT NULL DEFAULT 'CASH', -- CASH, UPI, CARD, BANK, CREDIT, SPLIT
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'Cashier',
  delivery_venue TEXT DEFAULT '',
  delivery_address TEXT DEFAULT '',
  driver_id INTEGER,
  driver_name TEXT DEFAULT '',
  driver_mobile TEXT DEFAULT '',
  rickshaw_rent REAL DEFAULT 0.0,
  rickshaw_rent_status TEXT DEFAULT 'PENDING',
  vasan_summary TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sale Line Items
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0.0,
  unit TEXT NOT NULL DEFAULT 'KG',
  rate REAL NOT NULL DEFAULT 0.0,
  discount REAL DEFAULT 0.0,
  gst_rate REAL DEFAULT 0.0,
  gst_amount REAL DEFAULT 0.0,
  amount REAL NOT NULL DEFAULT 0.0,
  vasan_type TEXT DEFAULT 'NONE',
  vasan_qty REAL DEFAULT 0.0
);

-- Sales Returns
CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  invoice_no TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  total_amount REAL NOT NULL,
  refund_mode TEXT DEFAULT 'CASH',
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'ACTIVE',
  created_by TEXT DEFAULT 'Cashier',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  rate REAL NOT NULL,
  gst_rate REAL DEFAULT 5.0,
  amount REAL NOT NULL
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  supplier_invoice_no TEXT DEFAULT '',
  supplier_invoice_date DATE,
  subtotal REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL DEFAULT 0.0,
  tax_amount REAL DEFAULT 0.0,
  round_off REAL DEFAULT 0.0,
  grand_total REAL NOT NULL DEFAULT 0.0,
  paid_amount REAL NOT NULL DEFAULT 0.0,
  due_amount REAL NOT NULL DEFAULT 0.0,
  payment_mode TEXT NOT NULL DEFAULT 'CASH',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'Manager',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'RAW_MATERIAL', -- RAW_MATERIAL, PRODUCT, PACKAGING
  raw_material_id INTEGER REFERENCES raw_materials(id),
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  rate REAL NOT NULL,
  discount REAL DEFAULT 0.0,
  gst_rate REAL DEFAULT 5.0,
  gst_amount REAL DEFAULT 0.0,
  amount REAL NOT NULL
);

-- Purchase Returns
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  purchase_no TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  total_amount REAL NOT NULL,
  refund_mode TEXT DEFAULT 'CASH',
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'ACTIVE',
  created_by TEXT DEFAULT 'Manager',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  raw_material_id INTEGER REFERENCES raw_materials(id),
  product_id INTEGER REFERENCES products(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  rate REAL NOT NULL,
  gst_rate REAL DEFAULT 5.0,
  amount REAL NOT NULL
);

-- Stock Movements (THE GOLDEN RULE: Every stock change has an immutable movement record)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movement_date DATETIME NOT NULL,
  item_type TEXT NOT NULL, -- RAW_MATERIAL, FINISHED_PRODUCT, SEMI_FINISHED, PACKAGING
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  movement_type TEXT NOT NULL, -- PURCHASE_IN, MANUFACTURING_CONSUMPTION, MANUFACTURING_OUTPUT, SALES_OUT, SALES_RETURN_IN, PURCHASE_RETURN_OUT, STOCK_ADJUSTMENT, WASTAGE_OUT, OPENING_STOCK
  quantity REAL NOT NULL, -- Negative for OUT, Positive for IN
  unit TEXT NOT NULL,
  base_quantity REAL NOT NULL, -- Normalized to base unit (e.g. KG or PCS)
  cost_rate REAL DEFAULT 0.0,
  total_cost_value REAL DEFAULT 0.0,
  reference_type TEXT NOT NULL, -- PURCHASE, MANUFACTURING, SALE, SALES_RETURN, PURCHASE_RETURN, ADJUSTMENT, OPENING
  reference_id INTEGER,
  reference_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'System',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stock Adjustments (Audited manual overrides)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adjustment_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  item_type TEXT NOT NULL, -- RAW_MATERIAL, FINISHED_PRODUCT, SEMI_FINISHED, PACKAGING
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  previous_stock REAL NOT NULL,
  adjustment_qty REAL NOT NULL,
  new_stock REAL NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL,
  user_id INTEGER,
  user_name TEXT NOT NULL DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Double-Entry Ledger Entries (Dynamic Party Balance derivation)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date DATE NOT NULL,
  party_type TEXT NOT NULL, -- CUSTOMER, SUPPLIER, CASH, BANK, EXPENSE, SALES_REVENUE, PURCHASE_EXPENSE
  party_id INTEGER,
  party_name TEXT NOT NULL,
  voucher_type TEXT NOT NULL, -- SALE, PURCHASE, PAYMENT_RECEIVED, PAYMENT_MADE, SALES_RETURN, PURCHASE_RETURN, EXPENSE, OPENING_BALANCE
  voucher_id INTEGER,
  voucher_no TEXT NOT NULL,
  debit_amount REAL NOT NULL DEFAULT 0.0,
  credit_amount REAL NOT NULL DEFAULT 0.0,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Party Payments & Receipts
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_no TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL,
  party_type TEXT NOT NULL, -- CUSTOMER (Receipt), SUPPLIER (Payment)
  party_id INTEGER NOT NULL,
  party_name TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'CASH', -- CASH, UPI, CARD, BANK_TRANSFER, CHEQUE
  reference_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'Cashier',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  category TEXT NOT NULL, -- Rent, Electricity, Karigar Wages, Transport, Commercial Gas, Packaging, Repairs, Marketing, Misc
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'CASH',
  reference_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_manufacturing_overhead INTEGER DEFAULT 0, -- 1 = Direct production expense, 0 = Indirect overhead
  created_by TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Immutable Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  username TEXT NOT NULL,
  action TEXT NOT NULL, -- LOGIN, CREATE, EDIT, CANCEL, DELETE, APPROVE, BACKUP, RESTORE, STOCK_ADJUST
  module TEXT NOT NULL, -- SALES, PURCHASES, RECIPES, MANUFACTURING, INVENTORY, PARTIES, SETTINGS
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  notes TEXT DEFAULT ''
);

-- Backup Log Registry
CREATE TABLE IF NOT EXISTS backup_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  backup_type TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL, AUTO_START, AUTO_EXIT, PRE_RESTORE, DAILY
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  notes TEXT DEFAULT ''
);

-- Area-Wise Delivery & Rickshaw Rate Master (એરિયા મુજબ ગ્રાહક ચાર્જ અને રિક્ષા ભાડું માસ્ટર)
CREATE TABLE IF NOT EXISTS area_delivery_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_name TEXT NOT NULL UNIQUE,
  customer_charge REAL NOT NULL DEFAULT 0.0,
  driver_rent REAL NOT NULL DEFAULT 0.0,
  notes TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Locations & Catering Venues Master (ડિલિવરી સ્થળ / વાડી / પાર્ટી પ્લોટ)
CREATE TABLE IF NOT EXISTS delivery_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_name TEXT NOT NULL,
  address TEXT NOT NULL,
  area_landmark TEXT DEFAULT '',
  customer_charge REAL DEFAULT 0.0,
  driver_rent REAL DEFAULT 0.0,
  contact_person TEXT DEFAULT '',
  contact_mobile TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rickshaw & Delivery Drivers Master (રિક્ષા ડ્રાઈવર)
CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT DEFAULT '',
  vehicle_no TEXT DEFAULT '',
  default_rent REAL DEFAULT 150.0,
  is_default INTEGER DEFAULT 0,
  is_personal INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment Modes & Bank Accounts Master (રોકડ, બેંક અને યુપીઆઇ ખાતાઓ - રોજમેળ માટે)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_name TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL DEFAULT 'CASH', -- CASH, BANK, UPI, OTHER
  account_number TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  ifsc_code TEXT DEFAULT '',
  opening_balance REAL DEFAULT 0.0,
  is_default INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vasan / Utensil Master List with Deposit & Missing Replacement Rate
CREATE TABLE IF NOT EXISTS vasan_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  gujarati_name TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'PCS',
  replacement_price REAL NOT NULL DEFAULT 500.0,
  default_deposit REAL DEFAULT 0.0,
  total_inventory_qty REAL DEFAULT 100.0,
  notes TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vasan (Container / Utensil) Tracking Ledger (વાસણ ટ્રેકિંગ - મિલ્ટન / ચોકી / ડબ્બા)
CREATE TABLE IF NOT EXISTS vasan_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  driver_id INTEGER REFERENCES drivers(id),
  driver_name TEXT DEFAULT '',
  date DATE NOT NULL,
  item_name TEXT NOT NULL,
  vasan_id INTEGER REFERENCES vasan_master(id),
  vasan_type TEXT NOT NULL, -- Milton, Choki, Steel Dabba, Petharo, Tray, Plastic Tub, Other
  unit_replacement_price REAL DEFAULT 0.0,
  total_replacement_price REAL DEFAULT 0.0,
  issued_qty REAL NOT NULL DEFAULT 0.0,
  returned_qty REAL NOT NULL DEFAULT 0.0,
  due_qty REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'PENDING_RETURN', -- PENDING_RETURN, RETURNED, PARTIAL
  return_date DATE,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily To-Do Task Management & Reminders
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  assigned_to_name TEXT DEFAULT 'Admin',
  due_date DATE NOT NULL,
  due_time TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  is_recurring INTEGER DEFAULT 0,          -- 0 = Once, 1 = Recurring
  recurring_frequency TEXT DEFAULT 'NONE', -- NONE, DAILY, WEEKLY, MONTHLY
  completed_at DATETIME,
  created_by TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Advance Caterer Orders & Production Booking (એડવાન્સ કેટરર્સ ઓર્ડર બુકિંગ)
CREATE TABLE IF NOT EXISTS advance_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_mobile TEXT DEFAULT '',
  delivery_date DATE NOT NULL,
  delivery_slot TEXT NOT NULL DEFAULT 'MORNING', -- MORNING, EVENING, ALL_DAY
  delivery_time TEXT DEFAULT '08:00 AM',
  delivery_venue TEXT DEFAULT '',
  customer_delivery_charge REAL DEFAULT 0.0,
  driver_delivery_rate REAL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PRODUCTION, READY, DISPATCHED, BILLED, CANCELLED
  total_items INTEGER DEFAULT 0,
  total_weight_kg REAL DEFAULT 0.0,
  total_amount REAL DEFAULT 0.0,
  advance_paid REAL DEFAULT 0.0,
  converted_sale_id INTEGER REFERENCES sales(id),
  converted_invoice_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advance_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES advance_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0.0,
  unit TEXT NOT NULL DEFAULT 'KG',
  rate REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  notes TEXT DEFAULT ''
);

-- WhatsApp Inbound Orders & Outlet Sync Inbox (આઉટલેટ ૧ & ૨ વોટ્સએપ ઓર્ડર ઇનબોક્સ)
CREATE TABLE IF NOT EXISTS whatsapp_inbound_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_name TEXT DEFAULT 'Outlet 1',
  sender_mobile TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  raw_message TEXT NOT NULL,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  parsed_customer_name TEXT DEFAULT '',
  parsed_customer_mobile TEXT DEFAULT '',
  parsed_delivery_date DATE,
  parsed_delivery_slot TEXT DEFAULT 'MORNING_1',
  parsed_delivery_venue TEXT DEFAULT '',
  parsed_advance_amount REAL DEFAULT 0.0,
  parsed_deposit_mode TEXT DEFAULT 'CASH',
  parsed_items_json TEXT DEFAULT '[]',
  converted_order_id INTEGER REFERENCES advance_orders(id),
  converted_order_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- High-Performance Database Indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_code ON raw_materials(code);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_date ON manufacturing_orders(date);
CREATE INDEX IF NOT EXISTS idx_manufacturing_batch ON manufacturing_orders(batch_number);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger_entries(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vasan_customer ON vasan_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_vasan_driver ON vasan_ledger(driver_id);
CREATE INDEX IF NOT EXISTS idx_adv_orders_date ON advance_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_adv_orders_slot ON advance_orders(delivery_slot);
CREATE INDEX IF NOT EXISTS idx_adv_orders_status ON advance_orders(status);
CREATE INDEX IF NOT EXISTS idx_adv_orders_customer ON advance_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_adv_order_items_order ON advance_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wa_orders_status ON whatsapp_inbound_orders(status);
CREATE INDEX IF NOT EXISTS idx_wa_orders_received ON whatsapp_inbound_orders(received_at);
`;
