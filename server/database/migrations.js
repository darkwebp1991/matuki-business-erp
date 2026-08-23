import crypto from 'node:crypto';
import { getDatabase } from './connection.js';
import { SCHEMA_SQL } from './schema.js';

export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: {
    dashboard: 'FULL',
    sales: 'FULL',
    advance_orders: 'FULL',
    customers: 'FULL',
    suppliers: 'FULL',
    products: 'FULL',
    purchases: 'FULL',
    expenses: 'FULL',
    rojmel: 'FULL',
    reports: 'FULL',
    google_sheet_pnl: 'FULL',
    attendance: 'FULL',
    todos: 'FULL',
    settings: 'FULL',
    backup: 'FULL'
  },
  MANAGER: {
    dashboard: 'FULL',
    sales: 'FULL',
    advance_orders: 'FULL',
    customers: 'FULL',
    suppliers: 'FULL',
    products: 'FULL',
    purchases: 'FULL',
    expenses: 'FULL',
    rojmel: 'FULL',
    reports: 'FULL',
    google_sheet_pnl: 'FULL',
    attendance: 'FULL',
    todos: 'FULL',
    settings: 'NONE',
    backup: 'NONE'
  },
  CASHIER: {
    dashboard: 'VIEW',
    sales: 'FULL',
    advance_orders: 'FULL',
    customers: 'EDIT',
    suppliers: 'NONE',
    products: 'VIEW',
    purchases: 'NONE',
    expenses: 'VIEW',
    rojmel: 'VIEW',
    reports: 'NONE',
    google_sheet_pnl: 'NONE',
    attendance: 'VIEW',
    todos: 'EDIT',
    settings: 'NONE',
    backup: 'NONE'
  },
  STOREKEEPER: {
    dashboard: 'VIEW',
    sales: 'NONE',
    advance_orders: 'VIEW',
    customers: 'NONE',
    suppliers: 'VIEW',
    products: 'VIEW',
    purchases: 'VIEW',
    expenses: 'NONE',
    rojmel: 'NONE',
    reports: 'NONE',
    google_sheet_pnl: 'VIEW',
    attendance: 'VIEW',
    todos: 'EDIT',
    settings: 'NONE',
    backup: 'NONE'
  },
  PRODUCTION: {
    dashboard: 'VIEW',
    sales: 'NONE',
    advance_orders: 'VIEW',
    customers: 'NONE',
    suppliers: 'NONE',
    products: 'VIEW',
    purchases: 'NONE',
    expenses: 'NONE',
    rojmel: 'NONE',
    reports: 'NONE',
    google_sheet_pnl: 'VIEW',
    attendance: 'VIEW',
    todos: 'EDIT',
    settings: 'NONE',
    backup: 'NONE'
  },
  ACCOUNTANT: {
    dashboard: 'FULL',
    sales: 'VIEW',
    advance_orders: 'VIEW',
    customers: 'FULL',
    suppliers: 'FULL',
    products: 'VIEW',
    purchases: 'FULL',
    expenses: 'FULL',
    rojmel: 'FULL',
    reports: 'FULL',
    google_sheet_pnl: 'FULL',
    attendance: 'FULL',
    todos: 'EDIT',
    settings: 'NONE',
    backup: 'VIEW'
  },
  STAFF: {
    dashboard: 'VIEW',
    sales: 'NONE',
    advance_orders: 'VIEW',
    customers: 'VIEW',
    suppliers: 'NONE',
    products: 'NONE',
    purchases: 'NONE',
    expenses: 'NONE',
    rojmel: 'NONE',
    reports: 'NONE',
    google_sheet_pnl: 'NONE',
    attendance: 'VIEW',
    todos: 'EDIT',
    settings: 'NONE',
    backup: 'NONE'
  }
};

export function hashPassword(password, salt = null) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password, hash, salt) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

export function initDatabase() {
  const db = getDatabase();
  console.log('Initializing SQLite database schema...');
  db.exec(SCHEMA_SQL);

  // Auto-migration for user permissions and mobile
  try { db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}';"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN mobile TEXT DEFAULT '';"); } catch (e) {}

  // Auto-migration for available_online column in products
  try {
    db.exec('ALTER TABLE products ADD COLUMN available_online INTEGER DEFAULT 1;');
  } catch (e) {
    // Column already exists
  }

  // Auto-migration for UPI ID and QR image in business_settings
  try {
    db.exec("ALTER TABLE business_settings ADD COLUMN upi_id TEXT DEFAULT 'Q070321548@ybl';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE business_settings ADD COLUMN upi_qr_image TEXT DEFAULT '/payment_qr.png';");
  } catch (e) {}

  // Auto-migration for customer profile fields
  try { db.exec("ALTER TABLE customers ADD COLUMN email TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE customers ADD COLUMN city TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE customers ADD COLUMN notes TEXT DEFAULT '';"); } catch (e) {}

  // Auto-migration for supplier profile fields
  try { db.exec("ALTER TABLE suppliers ADD COLUMN email TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN city TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN contact_person TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN bank_name TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN bank_account_no TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN bank_ifsc TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN upi_id TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN expense_type TEXT DEFAULT 'DIRECT';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN pl_category TEXT DEFAULT 'DIRECT_EXPENSES';"); } catch (e) {}
  try { db.exec("ALTER TABLE suppliers ADD COLUMN allocated_location TEXT DEFAULT 'FACTORY';"); } catch (e) {}

  // Auto-migration for expenses P&L classification & supplier linking
  try { db.exec("ALTER TABLE expenses ADD COLUMN supplier_id INTEGER;"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN supplier_name TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN expense_type TEXT DEFAULT 'DIRECT';"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN pl_category TEXT DEFAULT 'DIRECT_EXPENSES';"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN location TEXT DEFAULT 'FACTORY';"); } catch (e) {}

  // Auto-migration for sales_goals table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT UNIQUE NOT NULL,
        annual_target REAL DEFAULT 0,
        monthly_targets TEXT DEFAULT '{}',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('Error creating sales_goals table:', e);
  }

  // Auto-migration for vasan_master table
  try {
    db.exec(`
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
    `);
    
    // Seed default Vasan Items if table empty
    const vasanCount = db.prepare('SELECT COUNT(*) as count FROM vasan_master').get();
    if (vasanCount.count === 0) {
      const insertVasan = db.prepare(`
        INSERT INTO vasan_master (name, gujarati_name, unit, replacement_price, default_deposit, total_inventory_qty, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const defaultVasans = [
        ['Sweet Tray / Kundi', 'સ્વીટ ટ્રે / કુંડી', 'PCS', 450.0, 0.0, 150.0, 'Standard steel display sweet tray'],
        ['Steel Tapeli / Patila', 'સ્ટીલ તપેલી / પતીલા', 'PCS', 1200.0, 0.0, 80.0, 'Heavy bottom boiling tapeli for dudhpak/rabdi'],
        ['Large Cooking Kadhai', 'મોટી કડાઈ', 'PCS', 2500.0, 0.0, 30.0, 'Big commercial catering kadhai'],
        ['Milton Insulated Box', 'મિલ્ટન બોક્સ / કેરિયર', 'PCS', 1800.0, 0.0, 50.0, 'Thermal hot/cold food container'],
        ['Milk Can / Steel Barni', 'દૂધની કેન / બરણી', 'PCS', 1500.0, 0.0, 40.0, '40L / 20L heavy steel milk container'],
        ['Petharo / Steel Thali', 'પેઠારો / થાળી', 'PCS', 350.0, 0.0, 200.0, 'Catering sweet setting plate'],
        ['Plastic Heavy Tub', 'પ્લાસ્ટિક ટબ / કેરેટ', 'PCS', 300.0, 0.0, 120.0, 'Heavy industrial washing & storage tub'],
        ['Steel Dabba', 'સ્ટીલ ડબ્બો', 'PCS', 400.0, 0.0, 100.0, 'Storage container for dry sweets']
      ];
      for (const v of defaultVasans) {
        insertVasan.run(v[0], v[1], v[2], v[3], v[4], v[5], v[6]);
      }
    }
  } catch (e) {
    console.error('Error in vasan_master migration:', e);
  }

  // Auto-migration for vasan_ledger columns
  try { db.exec("ALTER TABLE vasan_ledger ADD COLUMN vasan_id INTEGER REFERENCES vasan_master(id);"); } catch (e) {}
  try { db.exec("ALTER TABLE vasan_ledger ADD COLUMN unit_replacement_price REAL DEFAULT 0.0;"); } catch (e) {}
  try { db.exec("ALTER TABLE vasan_ledger ADD COLUMN total_replacement_price REAL DEFAULT 0.0;"); } catch (e) {}

  // Auto-migration for todos table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        user_id INTEGER REFERENCES users(id),
        assigned_to_name TEXT DEFAULT 'Admin',
        due_date DATE NOT NULL,
        due_time TEXT DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        status TEXT NOT NULL DEFAULT 'PENDING',
        is_recurring INTEGER DEFAULT 0,
        recurring_frequency TEXT DEFAULT 'NONE',
        completed_at DATETIME,
        created_by TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed sample todos if table empty
    const todoCount = db.prepare('SELECT COUNT(*) as count FROM todos').get();
    if (todoCount.count === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const insertTodo = db.prepare(`
        INSERT INTO todos (title, description, assigned_to_name, due_date, due_time, priority, status, is_recurring, recurring_frequency, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertTodo.run('Check Ghee & Mawa Raw Material Stock', 'Inspect raw inventory before evening sweet production rush', 'Admin', todayStr, '10:00 AM', 'HIGH', 'PENDING', 1, 'DAILY', 'Admin');
      insertTodo.run('Follow-up with Ketan Bhai on Pending Vasan', 'Collect 4 Milton boxes and 6 sweet trays from yesterday catering order', 'Admin', todayStr, '01:30 PM', 'HIGH', 'PENDING', 0, 'NONE', 'Admin');
      insertTodo.run('Confirm Advance Orders for Tomorrow Morning', 'Review dispatch list and kitchen production quantities', 'Admin', todayStr, '05:00 PM', 'MEDIUM', 'PENDING', 1, 'DAILY', 'Admin');
      insertTodo.run('Weekly Rojmel Cash Drawer Reconciliation', 'Match physical cash drawer with offline daybook ledger', 'Admin', todayStr, '08:30 PM', 'HIGH', 'PENDING', 1, 'WEEKLY', 'Admin');
      insertTodo.run('Order Premium Packaging Boxes & Badam-Pista', 'Place purchase order with wholesale supplier for upcoming festival', 'Admin', tomorrowStr, '11:00 AM', 'MEDIUM', 'PENDING', 0, 'NONE', 'Admin');
    }
    // Auto-migration for todos extra columns
    try { db.exec("ALTER TABLE todos ADD COLUMN is_starred INTEGER DEFAULT 0;"); } catch (e) {}
    try { db.exec("ALTER TABLE todos ADD COLUMN list_category TEXT DEFAULT 'General';"); } catch (e) {}
    try { db.exec("ALTER TABLE todos ADD COLUMN subtasks_json TEXT DEFAULT '[]';"); } catch (e) {}
  } catch (e) {
    console.error('Error in todos migration:', e);
  }

  // Auto-migration for users extra columns
  try { db.exec("ALTER TABLE users ADD COLUMN mobile TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN last_login DATETIME;"); } catch (e) {}

  // Initialize Business Settings if not existing
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM business_settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO business_settings (
        business_name, subtitle, address, mobile, email, gstin,
        invoice_prefix, purchase_prefix, manufacturing_prefix, financial_year,
        currency_symbol, costing_method, allow_negative_stock, default_tax_rate, invoice_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'MATUKI SWEETS',
      'Offline Sweets Manufacturing & Business Management System',
      'Matuki Chowk, Main Bazar, Katargam, Surat, Gujarat - 395004',
      '+91 98765 43210',
      'sales@matukisweets.com',
      '24AAACM1234F1Z5',
      'MS/26-27/',
      'PO/26-27/',
      'MFG/26-27/',
      '2026-2027',
      '₹',
      'WEIGHTED_AVERAGE',
      0,
      5.0,
      '1. Goods once sold will not be taken back without original bill.\n2. Freshly prepared sweets using 100% pure desi ghee & milk.\n3. Please keep mawa sweets refrigerated.'
    );
  }

  // Initialize Default Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const adminPass = hashPassword('admin123');
    const cashierPass = hashPassword('cashier123');
    const productionPass = hashPassword('karigar123');

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, salt, full_name, role, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    insertUser.run('admin', adminPass.hash, adminPass.salt, 'Master Owner (Admin)', 'ADMIN');
    insertUser.run('cashier', cashierPass.hash, cashierPass.salt, 'Front Counter Cashier', 'CASHIER');
    insertUser.run('karigar', productionPass.hash, productionPass.salt, 'Head Sweet Master (Karigar)', 'PRODUCTION');
  }

  // Initialize Standard Units
  const unitsCount = db.prepare('SELECT COUNT(*) as count FROM units').get();
  if (unitsCount.count === 0) {
    const insertUnit = db.prepare(`
      INSERT INTO units (name, symbol, unit_type, base_unit, conversion_to_base, is_base)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUnit.run('Kilogram', 'KG', 'WEIGHT', 'KG', 1.0, 1);
    insertUnit.run('Gram', 'GM', 'WEIGHT', 'KG', 0.001, 0);
    insertUnit.run('Litre', 'LTR', 'VOLUME', 'LTR', 1.0, 1);
    insertUnit.run('Millilitre', 'ML', 'VOLUME', 'LTR', 0.001, 0);
    insertUnit.run('Pieces', 'PCS', 'COUNT', 'PCS', 1.0, 1);
    insertUnit.run('Sweet Box', 'BOX', 'COUNT', 'BOX', 1.0, 1);
    insertUnit.run('Packet', 'PKT', 'COUNT', 'PKT', 1.0, 1);
    insertUnit.run('Dozen', 'DOZ', 'COUNT', 'PCS', 12.0, 0);
  }

  // Initialize Default Categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)');
    insertCat.run('Kaju Sweets (કાજુ મીઠાઈ)', 'FINISHED_PRODUCT', 'Premium Cashew based traditional sweets');
    insertCat.run('Mawa / Khoya Sweets (માવા મીઠાઈ)', 'FINISHED_PRODUCT', 'Rich reduced milk sweets (Peda, Barfi)');
    insertCat.run('Bengali Sweets (બંગાળી મીઠાઈ)', 'FINISHED_PRODUCT', 'Chhena based syrups & sweets (Rasgulla, Rasmalai)');
    insertCat.run('Desi Ghee Snacks & Namkeen (નમકીન)', 'FINISHED_PRODUCT', 'Savory snacks, Farsan, Mathri');
    insertCat.run('Nuts & Dry Fruits', 'RAW_MATERIAL', 'Cashew W320/Kaju Tukda, Almonds, Pistachio');
    insertCat.run('Dairy & Fats', 'RAW_MATERIAL', 'Pure Desi Ghee, Fresh Full Cream Buffalo Milk, Mawa');
    insertCat.run('Sweeteners & Spices', 'RAW_MATERIAL', 'Refined Sugar, Green Cardamom (Elaichi), Pure Saffron (Kesar)');
    insertCat.run('Packaging Boxes & Foil', 'PACKAGING', 'Sweet Boxes (250g, 500g, 1kg), Silver Vark (Foil), Carry Bags');
    insertCat.run('Semi-Finished Bases', 'SEMI_FINISHED', 'Fresh In-house Mawa, Kaju Paste, Sugar Syrup (Chashni)');
    insertCat.run('Factory Overheads', 'EXPENSE', 'LPG Commercial Cylinders, Karigar Daily Wages, Electricity, Shop Rent');
  }

  // Auto-migrate new Catering Wholesale Delivery & Vasan columns
  const alterColumns = [
    { table: 'sales', column: 'delivery_venue', def: 'TEXT DEFAULT ""' },
    { table: 'sales', column: 'delivery_address', def: 'TEXT DEFAULT ""' },
    { table: 'sales', column: 'driver_id', def: 'INTEGER' },
    { table: 'sales', column: 'driver_name', def: 'TEXT DEFAULT ""' },
    { table: 'sales', column: 'driver_mobile', def: 'TEXT DEFAULT ""' },
    { table: 'sales', column: 'delivery_charge', def: 'REAL DEFAULT 0.0' },
    { table: 'sales', column: 'rickshaw_rent', def: 'REAL DEFAULT 0.0' },
    { table: 'sales', column: 'rickshaw_rent_status', def: 'TEXT DEFAULT "PENDING"' },
    { table: 'sales', column: 'vasan_summary', def: 'TEXT DEFAULT ""' },
    { table: 'sale_items', column: 'vasan_type', def: 'TEXT DEFAULT "NONE"' },
    { table: 'sale_items', column: 'vasan_qty', def: 'REAL DEFAULT 0.0' },
    { table: 'drivers', column: 'is_default', def: 'INTEGER DEFAULT 0' },
    { table: 'drivers', column: 'is_personal', def: 'INTEGER DEFAULT 0' },
    { table: 'delivery_locations', column: 'customer_charge', def: 'REAL DEFAULT 0.0' },
    { table: 'delivery_locations', column: 'driver_rent', def: 'REAL DEFAULT 0.0' },
    { table: 'sales', column: 'advance_adjusted', def: 'REAL DEFAULT 0.0' },
    { table: 'customers', column: 'advance_balance', def: 'REAL DEFAULT 0.0' },
    { table: 'payments', column: 'account_id', def: 'INTEGER' },
    { table: 'payments', column: 'account_name', def: 'TEXT DEFAULT ""' },
    { table: 'expenses', column: 'account_id', def: 'INTEGER' },
    { table: 'expenses', column: 'account_name', def: 'TEXT DEFAULT ""' },
    { table: 'sales', column: 'account_id', def: 'INTEGER' },
    { table: 'sales', column: 'account_name', def: 'TEXT DEFAULT ""' },
    { table: 'purchases', column: 'account_id', def: 'INTEGER' },
    { table: 'purchases', column: 'account_name', def: 'TEXT DEFAULT ""' },
    { table: 'ledger_entries', column: 'account_id', def: 'INTEGER' },
    { table: 'ledger_entries', column: 'account_name', def: 'TEXT DEFAULT ""' },
    { table: 'business_settings', column: 'sale_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'sale_return_prefix', def: 'TEXT DEFAULT "SR/26-27/"' },
    { table: 'business_settings', column: 'sale_return_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'purchase_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'purchase_return_prefix', def: 'TEXT DEFAULT "PR/26-27/"' },
    { table: 'business_settings', column: 'purchase_return_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'payment_in_prefix', def: 'TEXT DEFAULT "RCT-"' },
    { table: 'business_settings', column: 'payment_in_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'payment_out_prefix', def: 'TEXT DEFAULT "PAY-"' },
    { table: 'business_settings', column: 'payment_out_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'expense_prefix', def: 'TEXT DEFAULT "EXP-"' },
    { table: 'business_settings', column: 'expense_start_seq', def: 'INTEGER DEFAULT 1' },
    { table: 'business_settings', column: 'advance_order_prefix', def: 'TEXT DEFAULT "ORD-"' },
    { table: 'business_settings', column: 'advance_order_start_seq', def: 'INTEGER DEFAULT 1' }
  ];

  for (const { table, column, def } of alterColumns) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    } catch (e) {
      // Column already exists
    }
  }

  // Ensure payment_accounts table exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL UNIQUE,
        account_type TEXT NOT NULL DEFAULT 'CASH',
        account_number TEXT DEFAULT '',
        bank_name TEXT DEFAULT '',
        ifsc_code TEXT DEFAULT '',
        opening_balance REAL DEFAULT 0.0,
        is_default INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default accounts if empty
    const accCount = db.prepare('SELECT COUNT(*) as count FROM payment_accounts').get().count;
    if (accCount === 0) {
      const insertAcc = db.prepare(`
        INSERT INTO payment_accounts (account_name, account_type, account_number, bank_name, ifsc_code, opening_balance, is_default, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertAcc.run('Counter Cash Drawer (કાઉન્ટર રોકડ)', 'CASH', '', 'Cash Drawer', '', 50000.0, 1, 'Main cash counter in Matuki Sweets');
      insertAcc.run('HDFC Bank Current A/c (બેંક ખાતું)', 'BANK', '50200012345678', 'HDFC Bank, Katargam Branch', 'HDFC0001234', 150000.0, 0, 'Primary Business Current Account');
      insertAcc.run('GPay / PhonePe UPI (ઓનલાઇન QR)', 'UPI', 'matukisweets@hdfcbank', 'UPI / QR Payments', '', 0.0, 0, 'Instant QR code collections');
      insertAcc.run('Petty Cash (ચિલ્લર / પરચૂરણ)', 'CASH', '', 'Factory Petty Cash', '', 5000.0, 0, 'Daily factory micro expenses');
    }
  } catch (e) {
    console.error('Payment accounts migration error:', e.message);
  }

  // Backfill delivery venue rates if 0
  try {
    db.prepare("UPDATE delivery_locations SET customer_charge = 250.0, driver_rent = 200.0 WHERE venue_name LIKE '%Avadh%' AND (customer_charge = 0 OR customer_charge IS NULL)").run();
    db.prepare("UPDATE delivery_locations SET customer_charge = 100.0, driver_rent = 80.0 WHERE venue_name LIKE '%Pramukh%' AND (customer_charge = 0 OR customer_charge IS NULL)").run();
    db.prepare("UPDATE delivery_locations SET customer_charge = 200.0, driver_rent = 150.0 WHERE venue_name LIKE '%Sarthana%' AND (customer_charge = 0 OR customer_charge IS NULL)").run();
    db.prepare("UPDATE delivery_locations SET customer_charge = 250.0, driver_rent = 180.0 WHERE venue_name LIKE '%Green Leaf%' AND (customer_charge = 0 OR customer_charge IS NULL)").run();
    db.prepare("UPDATE delivery_locations SET customer_charge = 150.0, driver_rent = 120.0 WHERE venue_name LIKE '%Radhe Krishna%' AND (customer_charge = 0 OR customer_charge IS NULL)").run();
  } catch (e) {}

  // Ensure sale_items allows NULL product_id for container-only packing rows
  try {
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const prodIdCol = tableInfo.find(c => c.name === 'product_id');
    if (prodIdCol && prodIdCol.notnull === 1) {
      db.exec(`
        PRAGMA foreign_keys=off;
        CREATE TABLE sale_items_new (
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
        INSERT INTO sale_items_new (id, sale_id, product_id, product_name, quantity, unit, rate, discount, gst_rate, gst_amount, amount, vasan_type, vasan_qty)
        SELECT id, sale_id, product_id, product_name, quantity, unit, rate, discount, gst_rate, gst_amount, amount, vasan_type, vasan_qty FROM sale_items;
        DROP TABLE sale_items;
        ALTER TABLE sale_items_new RENAME TO sale_items;
        PRAGMA foreign_keys=on;
      `);
    }
  } catch (e) {
    console.warn('Migration note on sale_items:', e.message);
  }

  // Ensure Personal Rixa (Own Vehicle) exists in drivers
  const personalRixa = db.prepare("SELECT id FROM drivers WHERE name LIKE '%Personal%' OR name LIKE '%પોતાની%'").get();
  if (!personalRixa) {
    const insertPersonal = db.prepare('INSERT INTO drivers (name, mobile, vehicle_no, default_rent, is_default, is_personal, active) VALUES (?, ?, ?, ?, 1, 1, 1)');
    insertPersonal.run('Personal Rixa / Own Delivery (પોતાની પર્સનલ રિક્ષા)', '+91 98251 23456', 'GJ-05-MATUKI-01', 0.0);
  }

  // Seed Fixed Rickshaw Drivers if none exist
  const driverCount = db.prepare('SELECT COUNT(*) as count FROM drivers').get();
  if (driverCount.count === 0) {
    const insertDriver = db.prepare('INSERT INTO drivers (name, mobile, vehicle_no, default_rent, is_default, is_personal, active) VALUES (?, ?, ?, ?, ?, ?, 1)');
    insertDriver.run('Personal Rixa / Own Delivery (પોતાની પર્સનલ રિક્ષા)', '+91 98251 23456', 'GJ-05-MATUKI-01', 0.0, 1, 1);
    insertDriver.run('Raju Bhai Rickshaw', '+91 98251 11001', 'GJ-05-AT-4412', 150.0, 0, 0);
    insertDriver.run('Mahesh Rickshaw Katargam', '+91 97240 22002', 'GJ-05-BX-8831', 180.0, 0, 0);
    insertDriver.run('Bharat Bhai Auto', '+91 99090 33003', 'GJ-05-CY-5509', 150.0, 0, 0);
    insertDriver.run('Mukesh Rixa Surat', '+91 98980 44004', 'GJ-05-DZ-1290', 200.0, 0, 0);
    insertDriver.run('Ramesh Driver', '+91 98790 55005', 'GJ-05-EA-7764', 160.0, 0, 0);
    insertDriver.run('Kishore Bhai Tempo', '+91 96010 66006', 'GJ-05-FB-3382', 300.0, 0, 0);
  }

  // Create Area Delivery Rates Table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS area_delivery_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_name TEXT NOT NULL UNIQUE,
      customer_charge REAL NOT NULL DEFAULT 0.0,
      driver_rent REAL NOT NULL DEFAULT 0.0,
      notes TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed standard Surat Areas with Customer Delivery Charges and Rickshaw Rents
  const areaCount = db.prepare('SELECT COUNT(*) as count FROM area_delivery_rates').get();
  if (areaCount.count === 0) {
    const insertArea = db.prepare('INSERT INTO area_delivery_rates (area_name, customer_charge, driver_rent, notes, active) VALUES (?, ?, ?, ?, 1)');
    const defaultAreas = [
      { name: 'Sarthana (સરથાણા)', customer: 200.0, driver: 150.0, notes: 'Sarthana, Jakatnaka, Valak Patiya, Zoo Road' },
      { name: 'Katargam (કતારગામ)', customer: 100.0, driver: 80.0, notes: 'Katargam Local, Gotalawadi, Laxminarayan' },
      { name: 'Varachha (વરાછા)', customer: 150.0, driver: 120.0, notes: 'Varachha Main Road, Hirabaug, Mini Bazar' },
      { name: 'Mota Varachha (મોટા વરાછા)', customer: 180.0, driver: 130.0, notes: 'Mota Varachha, Sudama Chowk, VIP Circle' },
      { name: 'Yogi Chowk (યોગી ચોક)', customer: 160.0, driver: 120.0, notes: 'Yogi Chowk, Chikuwadi, Punagam Road' },
      { name: 'Simada (સીમાડા)', customer: 180.0, driver: 140.0, notes: 'Simada Gam, BRTS Canal Road' },
      { name: 'Kamrej (કામરેજ)', customer: 250.0, driver: 180.0, notes: 'Kamrej Highway, Char Rasta, Kholvad' },
      { name: 'Adajan (અડાજણ)', customer: 200.0, driver: 150.0, notes: 'Adajan, Honey Park, Palanpur Patia' },
      { name: 'Vesu (વેસુ)', customer: 250.0, driver: 200.0, notes: 'Vesu, VIP Road, University Road' },
      { name: 'Amroli (અમરોલી)', customer: 120.0, driver: 90.0, notes: 'Amroli, Chhaprabhatha, Kosad' },
      { name: 'Utran (ઉત્રાણ)', customer: 130.0, driver: 100.0, notes: 'Utran Power House, Railway Crossing' },
      { name: 'Puna Gam (પુણા ગામ)', customer: 150.0, driver: 110.0, notes: 'Puna Gam, Reshma Row House' },
      { name: 'Rander (રાંદેર)', customer: 180.0, driver: 140.0, notes: 'Rander, Tadwadi, Mora Bhagal' },
      { name: 'Jahangirpura (જહાંગીરપુરા)', customer: 170.0, driver: 130.0, notes: 'Jahangirpura, ISKCON Temple Road' },
      { name: 'Palsana (પલસાણા)', customer: 350.0, driver: 280.0, notes: 'Palsana Char Rasta, Highway' },
      { name: 'Olpad (ઓલપાડ)', customer: 300.0, driver: 240.0, notes: 'Olpad Gam & Industrial Zone' },
      { name: 'Sachin (સચિન)', customer: 300.0, driver: 240.0, notes: 'Sachin GIDC & Surat Navsari Road' },
      { name: 'Dindoli (ડિંડોલી)', customer: 220.0, driver: 170.0, notes: 'Dindoli, Kharvasa Road' },
      { name: 'Godadara (ગોડાદરા)', customer: 180.0, driver: 140.0, notes: 'Godadara, Maharana Pratap Chowk' },
      { name: 'Kadodara (કડોદરા)', customer: 280.0, driver: 220.0, notes: 'Kadodara Char Rasta, NH-48' },
      { name: 'Local Store Pickup (દુકાન પિકઅપ)', customer: 0.0, driver: 0.0, notes: 'Customer direct pickup (No delivery charge)' }
    ];

    for (const a of defaultAreas) {
      insertArea.run(a.name, a.customer, a.driver, a.notes);
    }
  }

  // Create Advance Orders and Order Items Tables if not existing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS advance_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT NOT NULL UNIQUE,
        customer_id INTEGER REFERENCES customers(id),
        customer_name TEXT NOT NULL,
        customer_mobile TEXT DEFAULT '',
        delivery_date DATE NOT NULL,
        delivery_slot TEXT NOT NULL DEFAULT 'MORNING',
        delivery_time TEXT DEFAULT '08:00 AM',
        delivery_venue TEXT DEFAULT '',
        customer_delivery_charge REAL DEFAULT 0.0,
        driver_delivery_rate REAL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'PENDING',
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
    `);

  } catch (err) {
    console.error('Error running advance orders migration:', err);
  }

  // Auto-migration for scheduled_invoice_dispatches table (5-minute auto WhatsApp dispatch)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_invoice_dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_type TEXT NOT NULL DEFAULT 'SALE',
        reference_id INTEGER NOT NULL,
        recipient_mobile TEXT NOT NULL,
        scheduled_at DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER DEFAULT 0,
        last_error TEXT DEFAULT '',
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {}

  // Auto-migration for bill attachment photos & billed_by fields
  try { db.exec("ALTER TABLE purchases ADD COLUMN bill_photo_url TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN bill_photo_url TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE payments ADD COLUMN attachment_url TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE sales ADD COLUMN billed_by TEXT DEFAULT 'Admin';"); } catch (e) {}
  try { db.exec("ALTER TABLE sales_returns ADD COLUMN billed_by TEXT DEFAULT 'Cashier';"); } catch (e) {}

  // Auto-migration for Staff Attendance & Salary Module
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT DEFAULT '',
        pin TEXT NOT NULL DEFAULT '1111',
        address TEXT DEFAULT '',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        designation TEXT DEFAULT 'Staff',
        pin TEXT DEFAULT '',
        aadhar_number TEXT DEFAULT '',
        address TEXT DEFAULT '',
        monthly_salary REAL NOT NULL DEFAULT 0,
        daily_rate REAL DEFAULT 0,
        join_date DATE DEFAULT (DATE('now')),
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('P', 'A', 'H', 'L')),
        in_time TEXT DEFAULT '',
        out_time TEXT DEFAULT '',
        total_hours REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      );

      CREATE TABLE IF NOT EXISTS employee_advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        payment_mode TEXT DEFAULT 'CASH',
        note TEXT DEFAULT '',
        status TEXT DEFAULT 'PAID',
        created_by TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS salary_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        monthly_salary REAL NOT NULL,
        effective_from DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        master_pin TEXT NOT NULL DEFAULT '9999',
        company_name TEXT DEFAULT 'Matuki Sweets & Snacks',
        salary_cycle_day INTEGER DEFAULT 15,
        working_hours_per_day REAL DEFAULT 10.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed branches if empty
    const brCount = db.prepare('SELECT COUNT(*) as count FROM branches').get();
    if (brCount.count === 0) {
      db.prepare(`
        INSERT INTO branches (name, code, pin, address) VALUES
        ('Katargam Main Branch', 'KAT', '1111', 'Main Bazar, Katargam, Surat'),
        ('Sarthana Outlet', 'SAR', '2222', 'Sarthana Jakatnaka, Surat'),
        ('Central Kitchen & Factory', 'MFG', '3333', 'GIDC Industrial Area, Surat')
      `).run();
    }

    // Seed attendance settings if empty
    db.prepare(`
      INSERT OR IGNORE INTO attendance_settings (id, master_pin, company_name, salary_cycle_day)
      VALUES (1, '9999', 'Matuki Sweets & Snacks', 15)
    `).run();

    // Seed employee Paresh if empty
    const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get();
    if (empCount.count === 0) {
      db.prepare(`
        INSERT INTO employees (branch_id, name, phone, designation, pin, monthly_salary, join_date, active)
        VALUES 
        (1, 'PARESH PATEL', '+91 98251 44556', 'CEO / Manager', '6957', 35000.0, '2026-07-26', 1),
        (1, 'SURAJ BHAI', '+91 90818 22283', 'Owner / Cashier', '1234', 40000.0, '2026-01-01', 1),
        (3, 'RAMESH KARIGAR', '+91 98980 12345', 'Head Sweet Chef', '5555', 28000.0, '2026-02-15', 1),
        (3, 'MUKESH HELPER', '+91 98790 54321', 'Kitchen Helper', '4444', 18000.0, '2026-03-01', 1)
      `).run();
    }
  } catch (e) {
    console.error('Error running attendance migrations:', e);
  }

  // Monthly Physical Stock Audit & Verification for 3 Branches (Factory, Sarthana, Katargam)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS branch_stock_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_no TEXT NOT NULL UNIQUE,
        audit_date DATE NOT NULL,
        audit_month TEXT NOT NULL,
        auditor_name TEXT DEFAULT 'Admin',
        factory_valuation REAL DEFAULT 0.0,
        sarthana_valuation REAL DEFAULT 0.0,
        katargam_valuation REAL DEFAULT 0.0,
        total_valuation REAL DEFAULT 0.0,
        total_variance_value REAL DEFAULT 0.0,
        sarthana_notes TEXT DEFAULT '',
        katargam_notes TEXT DEFAULT '',
        status TEXT DEFAULT 'APPLIED',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS branch_stock_audit_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL REFERENCES branch_stock_audits(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        item_code TEXT DEFAULT '',
        item_name TEXT NOT NULL,
        category_name TEXT DEFAULT '',
        unit TEXT NOT NULL DEFAULT 'KG',
        cost_rate REAL DEFAULT 0.0,
        system_stock REAL DEFAULT 0.0,
        factory_stock REAL DEFAULT 0.0,
        sarthana_stock REAL DEFAULT 0.0,
        katargam_stock REAL DEFAULT 0.0,
        total_physical_stock REAL DEFAULT 0.0,
        variance_qty REAL DEFAULT 0.0,
        total_valuation REAL DEFAULT 0.0
      );
    `);

    // Auto-migrate extra columns if table already existed
    try { db.exec("ALTER TABLE branch_stock_audits ADD COLUMN sarthana_notes TEXT DEFAULT '';"); } catch (e) {}
    try { db.exec("ALTER TABLE branch_stock_audits ADD COLUMN katargam_notes TEXT DEFAULT '';"); } catch (e) {}
  } catch (e) {
    console.error('Error creating stock audit tables:', e.message);
  }

  // 3-Partner Automated Daybook & Snapshot Settings
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN partner_1_mobile TEXT DEFAULT '+91 90818 22283';
    `);
  } catch (e) {}
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN partner_2_mobile TEXT DEFAULT '';
    `);
  } catch (e) {}
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN partner_3_mobile TEXT DEFAULT '';
    `);
  } catch (e) {}
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN auto_rojmel_time TEXT DEFAULT '20:45';
    `);
  } catch (e) {}
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN auto_rojmel_enabled INTEGER DEFAULT 1;
    `);
  } catch (e) {}
  try {
    db.exec(`
      ALTER TABLE business_settings ADD COLUMN last_auto_rojmel_date TEXT DEFAULT '';
    `);
  } catch (e) {}

  // Missing template columns in business_settings
  try { db.exec("ALTER TABLE business_settings ADD COLUMN template_polite TEXT DEFAULT NULL;"); } catch (e) {}
  try { db.exec("ALTER TABLE business_settings ADD COLUMN template_weekly TEXT DEFAULT NULL;"); } catch (e) {}
  try { db.exec("ALTER TABLE business_settings ADD COLUMN template_urgent TEXT DEFAULT NULL;"); } catch (e) {}
  try { db.exec("ALTER TABLE business_settings ADD COLUMN template_dispatch TEXT DEFAULT NULL;"); } catch (e) {}

  // Google Map Location Link in sales, advance_orders & delivery_locations
  try { db.exec("ALTER TABLE sales ADD COLUMN google_map_link TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE advance_orders ADD COLUMN google_map_link TEXT DEFAULT '';"); } catch (e) {}
  try { db.exec("ALTER TABLE delivery_locations ADD COLUMN google_map_link TEXT DEFAULT '';"); } catch (e) {}

  // Trip Type (One Way vs Round Trip) in sales & advance_orders
  try { db.exec("ALTER TABLE sales ADD COLUMN trip_type TEXT DEFAULT 'ROUND_TRIP';"); } catch (e) {}
  try { db.exec("ALTER TABLE advance_orders ADD COLUMN trip_type TEXT DEFAULT 'ROUND_TRIP';"); } catch (e) {}

  console.log('Database initialization complete.');
}
