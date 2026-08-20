import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, getDatabase, closeDatabase } from '../database/connection.js';
import { settingsService } from './settingsService.js';

function getDefaultBackupDir() {
  const isWindows = process.platform === 'win32';
  const localAppData = isWindows ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')) : path.join(os.homedir(), '.matuki-erp');
  const backupDir = path.join(localAppData, 'Matuki Business ERP', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

export const backupService = {
  getBackupFolder() {
    const settings = settingsService.getSettings();
    if (settings.backup_folder && fs.existsSync(settings.backup_folder)) {
      return settings.backup_folder;
    }
    return getDefaultBackupDir();
  },

  getBackupHistory() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM backup_logs ORDER BY backup_date DESC LIMIT 50').all();
  },

  getDatabaseStats() {
    const db = getDatabase();
    let dbSize = 0;
    try {
      if (fs.existsSync(DB_PATH)) {
        dbSize = fs.statSync(DB_PATH).size;
      }
    } catch (e) {}

    const counts = {
      sales: db.prepare('SELECT COUNT(*) as count FROM sales').get()?.count || 0,
      sale_items: db.prepare('SELECT COUNT(*) as count FROM sale_items').get()?.count || 0,
      purchases: db.prepare('SELECT COUNT(*) as count FROM purchases').get()?.count || 0,
      customers: db.prepare('SELECT COUNT(*) as count FROM customers').get()?.count || 0,
      suppliers: db.prepare('SELECT COUNT(*) as count FROM suppliers').get()?.count || 0,
      products: db.prepare('SELECT COUNT(*) as count FROM products').get()?.count || 0,
      recipes: db.prepare('SELECT COUNT(*) as count FROM recipes').get()?.count || 0,
      batches: db.prepare('SELECT COUNT(*) as count FROM manufacturing_orders').get()?.count || 0,
      payments: db.prepare('SELECT COUNT(*) as count FROM payments').get()?.count || 0,
      ledger_entries: db.prepare('SELECT COUNT(*) as count FROM ledger_entries').get()?.count || 0,
      vasan_records: db.prepare('SELECT COUNT(*) as count FROM vasan_ledger').get()?.count || 0,
      driver_trips: db.prepare('SELECT COUNT(*) as count FROM sales WHERE driver_id IS NOT NULL').get()?.count || 0,
      expenses: db.prepare('SELECT COUNT(*) as count FROM expenses').get()?.count || 0
    };

    const lastBackup = db.prepare('SELECT * FROM backup_logs ORDER BY backup_date DESC LIMIT 1').get() || null;

    return {
      db_path: DB_PATH,
      db_size_bytes: dbSize,
      db_size_formatted: `${(dbSize / (1024 * 1024)).toFixed(2)} MB (${(dbSize / 1024).toFixed(1)} KB)`,
      backup_folder: this.getBackupFolder(),
      counts,
      last_backup: lastBackup
    };
  },

  createBackup(backupType = 'MANUAL', username = 'Admin') {
    const backupDir = this.getBackupFolder();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Flush WAL to main database file before copying
    const db = getDatabase();
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      console.warn('Checkpoint warning:', e.message);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `matuki_sweets_backup_${timestamp}.db`;
    const destPath = path.join(backupDir, filename);

    // Copy SQLite database safely
    fs.copyFileSync(DB_PATH, destPath);
    const stats = fs.statSync(destPath);

    // Record in database log
    db.prepare(`
      INSERT INTO backup_logs (file_path, file_size_bytes, backup_type, status, notes)
      VALUES (?, ?, ?, 'SUCCESS', ?)
    `).run(destPath, stats.size, backupType, `Backup created by ${username}`);

    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'BACKUP', 'SYSTEM', ?, ?)
    `).run(username, filename, `Created local backup: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    return {
      success: true,
      filename,
      file_path: destPath,
      file_size_bytes: stats.size,
      backup_date: new Date().toISOString()
    };
  },

  restoreBackup(backupFilePath, username = 'Admin') {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found at path: ${backupFilePath}`);
    }

    // 1. Verify integrity of the backup file using temporary SQLite connection
    try {
      const checkDb = new DatabaseSync(backupFilePath);
      const integrity = checkDb.prepare('PRAGMA integrity_check;').get();
      checkDb.close();
      if (!integrity || Object.values(integrity)[0] !== 'ok') {
        throw new Error('Database integrity check failed for selected backup file.');
      }
    } catch (err) {
      throw new Error(`Invalid or corrupted SQLite backup file: ${err.message}`);
    }

    // 2. Create emergency pre-restore snapshot of current database
    try {
      this.createBackup('PRE_RESTORE', username);
    } catch (err) {
      console.warn('Could not create pre-restore backup:', err.message);
    }

    // 3. Close current connection
    closeDatabase();

    // Remove old WAL and SHM files if present so new database opens cleanly
    const walFile = `${DB_PATH}-wal`;
    const shmFile = `${DB_PATH}-shm`;
    if (fs.existsSync(walFile)) {
      try { fs.unlinkSync(walFile); } catch (e) {}
    }
    if (fs.existsSync(shmFile)) {
      try { fs.unlinkSync(shmFile); } catch (e) {}
    }

    // 4. Overwrite main database file
    fs.copyFileSync(backupFilePath, DB_PATH);

    // 5. Re-open database and log audit
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = ON;');
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'RESTORE', 'SYSTEM', ?, ?)
    `).run(username, path.basename(backupFilePath), `Restored database from ${path.basename(backupFilePath)}`);

    const stats = this.getDatabaseStats();

    return {
      success: true,
      message: 'Database restored successfully! All records verified and loaded.',
      stats
    };
  },

  restoreFromBuffer(buffer, originalFilename = 'uploaded_backup.db', username = 'Admin') {
    const backupDir = this.getBackupFolder();
    const tempRestorePath = path.join(backupDir, `restore_staging_${Date.now()}.db`);
    
    // Save uploaded buffer to staging file
    fs.writeFileSync(tempRestorePath, buffer);

    try {
      const result = this.restoreBackup(tempRestorePath, username);
      return result;
    } finally {
      // Clean up temporary staging file
      if (fs.existsSync(tempRestorePath)) {
        try { fs.unlinkSync(tempRestorePath); } catch (e) {}
      }
    }
  },

  // Export ALL Business Data for Excel / Google Sheets Inspection
  exportAllDataForExcel() {
    const db = getDatabase();

    const sales = db.prepare(`
      SELECT 
        s.id, s.invoice_no, s.date, s.customer_name, s.customer_mobile, 
        s.delivery_venue, s.delivery_address, s.driver_name, s.rickshaw_rent, s.rickshaw_rent_status,
        s.vasan_summary, s.subtotal, s.delivery_charge, s.discount_amount, s.grand_total, s.paid_amount, s.due_amount, s.payment_mode, s.notes
      FROM sales s
      ORDER BY s.date DESC, s.id DESC
    `).all();

    const saleItems = db.prepare(`
      SELECT 
        si.id, si.sale_id, s.invoice_no, s.date, s.customer_name,
        si.product_name, si.quantity, si.unit, si.rate, si.amount, si.vasan_type, si.vasan_qty
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      ORDER BY s.date DESC, si.id ASC
    `).all();

    const customers = db.prepare(`
      SELECT 
        c.id, c.customer_no as code, c.name, c.mobile, c.address, c.gstin, c.opening_balance, c.credit_limit,
        COALESCE(c.opening_balance + (SELECT COALESCE(SUM(debit_amount) - SUM(credit_amount), 0) FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id = c.id), 0) as current_balance
      FROM customers c
      WHERE c.active = 1
      ORDER BY c.name ASC
    `).all();

    const suppliers = db.prepare(`
      SELECT 
        s.id, s.supplier_no as code, s.name, s.mobile, s.address, s.gstin, s.opening_balance,
        COALESCE(s.opening_balance + (SELECT COALESCE(SUM(credit_amount) - SUM(debit_amount), 0) FROM ledger_entries WHERE party_type = 'SUPPLIER' AND party_id = s.id), 0) as current_payable
      FROM suppliers s
      WHERE s.active = 1
      ORDER BY s.name ASC
    `).all();

    const purchases = db.prepare(`
      SELECT 
        p.id, p.purchase_no, p.date, p.supplier_name, p.supplier_invoice_no,
        p.subtotal, p.grand_total, p.paid_amount, p.due_amount, p.payment_mode, p.notes
      FROM purchases p
      ORDER BY p.date DESC, p.id DESC
    `).all();

    const products = db.prepare(`
      SELECT 
        p.id, p.code, p.name, COALESCE(c.name, 'General') as category, p.product_type, p.unit, p.selling_rate, p.purchase_rate, p.current_stock, p.min_stock,
        (p.current_stock * p.purchase_rate) as stock_valuation
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
      ORDER BY p.name ASC
    `).all();

    const payments = db.prepare(`
      SELECT 
        pay.id, pay.payment_no, pay.payment_date, pay.party_type, pay.party_name, pay.payment_mode, pay.amount, pay.notes
      FROM payments pay
      ORDER BY pay.payment_date DESC, pay.id DESC
    `).all();

    const ledgerEntries = db.prepare(`
      SELECT 
        le.id, le.entry_date, le.party_type, le.party_name, le.voucher_type, le.voucher_no, le.debit_amount, le.credit_amount, le.notes
      FROM ledger_entries le
      ORDER BY le.entry_date DESC, le.id DESC
    `).all();

    const batches = db.prepare(`
      SELECT 
        mo.id, mo.manufacturing_no as batch_no, mo.date as production_date, p.name as product_name,
        mo.planned_quantity as target_qty, mo.actual_output as actual_qty, mo.actual_unit as unit,
        mo.total_material_cost as raw_material_cost, mo.total_labour_cost as labour_cost,
        mo.total_overhead_cost as other_expenses, mo.total_batch_cost as total_cost,
        mo.cost_per_unit as unit_cost, mo.operator as karigar_name, mo.status
      FROM manufacturing_orders mo
      LEFT JOIN products p ON mo.finished_product_id = p.id
      ORDER BY mo.date DESC, mo.id DESC
    `).all();

    const vasanLedger = db.prepare(`
      SELECT 
        vl.id, vl.date, COALESCE(s.invoice_no, '-') as invoice_no, vl.customer_name,
        COALESCE(s.delivery_venue, '') as delivery_venue, vl.item_name, vl.vasan_type,
        vl.issued_qty, vl.returned_qty, vl.due_qty, vl.status
      FROM vasan_ledger vl
      LEFT JOIN sales s ON vl.sale_id = s.id
      ORDER BY vl.date DESC, vl.id DESC
    `).all();

    const expenses = db.prepare(`
      SELECT 
        e.id, e.date, e.expense_no, e.category, e.amount, e.payment_mode, e.reference_no, e.notes
      FROM expenses e
      ORDER BY e.date DESC, e.id DESC
    `).all();

    return {
      exported_at: new Date().toISOString(),
      business_name: 'MATUKI SWEETS',
      summary: {
        total_sales: sales.reduce((sum, s) => sum + Number(s.grand_total), 0),
        total_purchases: purchases.reduce((sum, p) => sum + Number(p.grand_total), 0),
        total_customers: customers.length,
        total_suppliers: suppliers.length,
        total_products: products.length,
        total_inventory_valuation: products.reduce((sum, p) => sum + Number(p.stock_valuation || 0), 0)
      },
      tables: {
        sales,
        sale_items: saleItems,
        customers,
        suppliers,
        purchases,
        products,
        payments,
        ledger_entries: ledgerEntries,
        manufacturing_batches: batches,
        vasan_ledger: vasanLedger,
        expenses
      }
    };
  },

  initDailyBackupScheduler() {
    console.log('⏰ Daily 9:00 PM Auto Backup Scheduler initialized...');

    const checkAndRunBackup = () => {
      try {
        const now = new Date();
        const currentHour = now.getHours(); // 21 is 9:00 PM
        const todayStr = now.toISOString().split('T')[0];

        // Trigger backup if current hour is 9 PM (21) or later and today's backup is missing
        if (currentHour >= 21) {
          const db = getDatabase();
          const existing = db.prepare(`
            SELECT id FROM backup_logs 
            WHERE (backup_type LIKE '%9PM%' OR backup_type = 'DAILY_AUTO_9PM') 
              AND strftime('%Y-%m-%d', backup_date) = ?
          `).get(todayStr);

          if (!existing) {
            console.log(`🚀 Executing Daily 9:00 PM Auto Backup for ${todayStr}...`);
            this.createBackup('DAILY_AUTO_9PM', 'Daily 9:00 PM Auto Scheduler');

            // Save copy to project ./backups directory
            const projectBackupDir = path.join(process.cwd(), 'backups');
            if (!fs.existsSync(projectBackupDir)) {
              fs.mkdirSync(projectBackupDir, { recursive: true });
            }
            const localDest = path.join(projectBackupDir, `MATUKI_DAILY_9PM_${todayStr}.db`);
            fs.copyFileSync(DB_PATH, localDest);
            console.log(`✅ Daily 9:00 PM Auto Backup saved at: ${localDest}`);
          }
        }
      } catch (err) {
        console.error('Error in daily 9 PM auto backup scheduler:', err.message);
      }
    };

    // Run immediate check on server start
    checkAndRunBackup();

    // Check every 2 minutes
    setInterval(checkAndRunBackup, 2 * 60 * 1000);
  }
};
