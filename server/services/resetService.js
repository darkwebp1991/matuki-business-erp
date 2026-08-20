import { getDatabase, runInTransaction } from '../database/connection.js';
import { backupService } from './backupService.js';
import { seedSweetsData } from '../database/seeder.js';

export const resetService = {
  // Option 1: Clean All Trial Transactions & Orders (Keeps Products, Customers, Suppliers, Recipes, Drivers, Venues)
  clearTrialTransactions(username = 'Admin') {
    // 1. Take automatic safety snapshot backup first!
    let backupResult = null;
    try {
      backupResult = backupService.createBackup('PRE_RESET_TRANSACTIONS', username);
    } catch (e) {
      console.warn('Pre-reset backup warning:', e.message);
    }

    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF;');
    try {
      // 2. Delete all transaction, voucher, and ledger records
      const cleared = {
        sales: db.prepare('SELECT COUNT(*) as count FROM sales').get()?.count || 0,
        purchases: db.prepare('SELECT COUNT(*) as count FROM purchases').get()?.count || 0,
        payments: db.prepare('SELECT COUNT(*) as count FROM payments').get()?.count || 0,
        expenses: db.prepare('SELECT COUNT(*) as count FROM expenses').get()?.count || 0,
        ledger_entries: db.prepare('SELECT COUNT(*) as count FROM ledger_entries').get()?.count || 0,
        manufacturing_orders: db.prepare('SELECT COUNT(*) as count FROM manufacturing_orders').get()?.count || 0,
        vasan_records: db.prepare('SELECT COUNT(*) as count FROM vasan_ledger').get()?.count || 0
      };

      db.exec(`
        DELETE FROM raw_material_price_history;
        DELETE FROM vasan_ledger;
        DELETE FROM sale_items;
        DELETE FROM sales_returns;
        DELETE FROM sales;
        DELETE FROM purchase_return_items;
        DELETE FROM purchase_items;
        DELETE FROM purchase_returns;
        DELETE FROM purchases;
        DELETE FROM payments;
        DELETE FROM expenses;
        DELETE FROM ledger_entries;
        DELETE FROM advance_order_items;
        DELETE FROM advance_orders;
        DELETE FROM whatsapp_inbound_orders;
        DELETE FROM manufacturing_wastage;
        DELETE FROM manufacturing_items;
        DELETE FROM manufacturing_orders;
        DELETE FROM stock_adjustments;
        DELETE FROM stock_movements;
      `);

      // 3. Reset product, customer, supplier balances to ZERO (0.00)
      db.exec(`
        UPDATE products SET current_stock = 0.0, opening_stock = 0.0;
        UPDATE raw_materials SET current_stock = 0.0, opening_stock = 0.0;
        UPDATE customers SET opening_balance = 0.0, advance_balance = 0.0;
        UPDATE suppliers SET opening_balance = 0.0;
      `);
      try {
        db.exec(`UPDATE payment_accounts SET opening_balance = 0.0;`);
      } catch (e) {}

      // 4. Reset auto-increment sequence counters for clean live invoice numbers (MS/26-27/001, etc.)
      try {
        db.exec(`
          DELETE FROM sqlite_sequence WHERE name IN (
            'sales', 'sale_items', 'sales_returns', 
            'purchases', 'purchase_items', 'purchase_returns', 'purchase_return_items',
            'payments', 'expenses', 'ledger_entries', 
            'vasan_ledger', 'manufacturing_orders', 
            'manufacturing_items', 'manufacturing_wastage',
            'advance_orders', 'advance_order_items',
            'whatsapp_inbound_orders',
            'stock_adjustments', 'stock_movements'
          );
        `);
      } catch (e) {
        console.warn('sqlite_sequence reset note:', e.message);
      }

      // 5. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'RESET_DATA', 'SYSTEM', 'TRANSACTIONS', ?)
      `).run(username, `Cleared all trial transactions (${cleared.sales} sales, ${cleared.purchases} purchases, ${cleared.payments} payments, ${cleared.ledger_entries} ledgers). System ready for LIVE billing.`);

      // 6. Return master counts to show what is preserved
      const preserved = {
        products: db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get()?.count || 0,
        customers: db.prepare('SELECT COUNT(*) as count FROM customers WHERE active = 1').get()?.count || 0,
        suppliers: db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE active = 1').get()?.count || 0,
        recipes: db.prepare('SELECT COUNT(*) as count FROM recipes').get()?.count || 0,
        drivers: db.prepare('SELECT COUNT(*) as count FROM drivers WHERE active = 1').get()?.count || 0,
        locations: db.prepare('SELECT COUNT(*) as count FROM delivery_locations WHERE active = 1').get()?.count || 0
      };

      return {
        success: true,
        mode: 'TRANSACTIONS_CLEARED',
        message: 'All trial transactions, sales bills, purchases, payments, and ledger entries have been cleared! System is 100% clean and ready for LIVE business.',
        cleared,
        preserved,
        backup_file: backupResult?.filename || null
      };
    } finally {
      db.exec('PRAGMA foreign_keys = ON;');
    }
  },

  // Option 2: Full Factory Clean Reset (Zero Out Everything except Settings, Users, Units & Categories)
  factoryReset(username = 'Admin') {
    // 1. Take automatic safety snapshot backup first!
    let backupResult = null;
    try {
      backupResult = backupService.createBackup('PRE_FACTORY_RESET', username);
    } catch (e) {
      console.warn('Pre-reset backup warning:', e.message);
    }

    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF;');
    try {
      return runInTransaction((db) => {
        db.exec(`
          DELETE FROM vasan_ledger;
          DELETE FROM sale_items;
          DELETE FROM sales_return_items;
          DELETE FROM sales_returns;
          DELETE FROM sales;
          DELETE FROM purchase_items;
          DELETE FROM purchase_return_items;
          DELETE FROM purchase_returns;
          DELETE FROM purchases;
          DELETE FROM payments;
          DELETE FROM expenses;
          DELETE FROM ledger_entries;
          DELETE FROM advance_order_items;
          DELETE FROM advance_orders;
          DELETE FROM whatsapp_inbound_orders;
          DELETE FROM manufacturing_wastage;
          DELETE FROM manufacturing_items;
          DELETE FROM manufacturing_orders;
          DELETE FROM stock_adjustments;
          DELETE FROM stock_movements;
          DELETE FROM recipe_items;
          DELETE FROM recipe_versions;
          DELETE FROM recipes;
          DELETE FROM raw_material_price_history;
          DELETE FROM raw_materials;
          DELETE FROM products;
          DELETE FROM customers;
          DELETE FROM suppliers;
        `);

        // Reset auto-increment sequence counters
        try {
          db.exec('DELETE FROM sqlite_sequence;');
        } catch (e) {}

        // Audit Log
        db.prepare(`
          INSERT INTO audit_logs (username, action, module, record_id, notes)
          VALUES (?, 'FACTORY_RESET', 'SYSTEM', 'ALL', 'Executed complete factory clean reset.')
        `).run(username);

        return {
          success: true,
          mode: 'FACTORY_RESET_COMPLETE',
          message: 'Factory Reset complete. All trial data, products, parties, and vouchers have been cleared.',
          backup_file: backupResult?.filename || null
        };
      });
    } finally {
      db.exec('PRAGMA foreign_keys = ON;');
    }
  },

  // Option 3: Reload Sample Demo Sweets Dataset
  reloadDemoData(username = 'Admin') {
    // Take safety snapshot first
    try {
      backupService.createBackup('PRE_DEMO_RELOAD', username);
    } catch (e) {}

    const result = seedSweetsData(true);
    return {
      success: true,
      message: 'Demo Sweet Shop Dataset reloaded successfully with sample recipes, items, and transactions!',
      details: result
    };
  }
};
