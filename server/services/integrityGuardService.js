import { getDatabase, runInTransaction } from '../database/connection.js';

export const integrityGuardService = {
  /**
   * Main Auto-Integrity Audit & Self-Healing Function
   * Runs relinking of party IDs, auto-heals missing ledger entries, and cleans up duplicate zero-balance party rows.
   */
  runIntegrityCheckAndAutoHeal() {
    return runInTransaction((db) => {
      let salesRelinked = 0;
      let purchasesRelinked = 0;
      let paymentsRelinked = 0;
      let ledgerRelinked = 0;
      let duplicateCustDeleted = 0;
      let duplicateSuppDeleted = 0;
      let ledgerAutoHealed = 0;

      // 1. Build Master Customer Name Map (prefer opening_balance > 0, then lowest ID)
      const allCusts = db.prepare(`
        SELECT id, UPPER(TRIM(name)) as clean_name, opening_balance 
        FROM customers 
        ORDER BY opening_balance DESC, id ASC
      `).all();

      const custMap = {};
      for (const c of allCusts) {
        if (c.clean_name && !custMap[c.clean_name]) {
          custMap[c.clean_name] = c.id;
        }
      }

      // Relink Sales Table
      const sales = db.prepare('SELECT id, customer_id, customer_name FROM sales').all();
      for (const s of sales) {
        const cleanName = (s.customer_name || '').trim().toUpperCase();
        if (cleanName && custMap[cleanName]) {
          const correctId = custMap[cleanName];
          if (s.customer_id !== correctId) {
            db.prepare('UPDATE sales SET customer_id = ? WHERE id = ?').run(correctId, s.id);
            salesRelinked++;
          }
        }
      }

      // 2. Build Master Supplier Name Map
      const allSupps = db.prepare(`
        SELECT id, UPPER(TRIM(name)) as clean_name, opening_balance 
        FROM suppliers 
        ORDER BY opening_balance DESC, id ASC
      `).all();

      const suppMap = {};
      for (const s of allSupps) {
        if (s.clean_name && !suppMap[s.clean_name]) {
          suppMap[s.clean_name] = s.id;
        }
      }

      // Relink Purchases Table
      const purchases = db.prepare('SELECT id, supplier_id, supplier_name FROM purchases').all();
      for (const p of purchases) {
        const cleanName = (p.supplier_name || '').trim().toUpperCase();
        if (cleanName && suppMap[cleanName]) {
          const correctId = suppMap[cleanName];
          if (p.supplier_id !== correctId) {
            db.prepare('UPDATE purchases SET supplier_id = ? WHERE id = ?').run(correctId, p.id);
            purchasesRelinked++;
          }
        }
      }

      // Relink Payments Table
      const payments = db.prepare('SELECT id, party_type, party_id, party_name FROM payments').all();
      for (const p of payments) {
        const cleanName = (p.party_name || '').trim().toUpperCase();
        if (p.party_type === 'CUSTOMER' && cleanName && custMap[cleanName]) {
          const correctId = custMap[cleanName];
          if (p.party_id !== correctId) {
            db.prepare('UPDATE payments SET party_id = ? WHERE id = ?').run(correctId, p.id);
            paymentsRelinked++;
          }
        } else if (p.party_type === 'SUPPLIER' && cleanName && suppMap[cleanName]) {
          const correctId = suppMap[cleanName];
          if (p.party_id !== correctId) {
            db.prepare('UPDATE payments SET party_id = ? WHERE id = ?').run(correctId, p.id);
            paymentsRelinked++;
          }
        }
      }

      // Relink Ledger Entries Table
      const ledgers = db.prepare('SELECT id, party_type, party_id, party_name FROM ledger_entries').all();
      for (const l of ledgers) {
        const cleanName = (l.party_name || '').trim().toUpperCase();
        if (l.party_type === 'CUSTOMER' && cleanName && custMap[cleanName]) {
          const correctId = custMap[cleanName];
          if (l.party_id !== correctId) {
            db.prepare('UPDATE ledger_entries SET party_id = ? WHERE id = ?').run(correctId, l.id);
            ledgerRelinked++;
          }
        } else if (l.party_type === 'SUPPLIER' && cleanName && suppMap[cleanName]) {
          const correctId = suppMap[cleanName];
          if (l.party_id !== correctId) {
            db.prepare('UPDATE ledger_entries SET party_id = ? WHERE id = ?').run(correctId, l.id);
            ledgerRelinked++;
          }
        }
      }

      // 3. Auto-Heal Missing Ledger Entries for Sales
      const missingSalesLedgers = db.prepare(`
        SELECT s.id, s.invoice_no, s.date, s.customer_id, s.customer_name, s.grand_total
        FROM sales s
        LEFT JOIN ledger_entries l ON l.party_type = 'CUSTOMER' AND l.voucher_type = 'SALE' AND l.voucher_id = s.id
        WHERE s.status = 'ACTIVE' AND l.id IS NULL
      `).all();

      for (const s of missingSalesLedgers) {
        const cId = custMap[(s.customer_name || '').trim().toUpperCase()] || s.customer_id;
        db.prepare(`
          INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
          VALUES (?, 'CUSTOMER', ?, ?, 'SALE', ?, ?, ?, 0.0, ?)
        `).run(s.date, cId, s.customer_name, s.id, s.invoice_no, s.grand_total, `Bill #${s.invoice_no}`);
        ledgerAutoHealed++;
      }

      // 4. Delete Duplicate Zero-Balance Party Masters that have no transactions
      const custDupRes = db.prepare(`
        DELETE FROM customers
        WHERE opening_balance = 0
          AND id NOT IN (SELECT DISTINCT customer_id FROM sales WHERE customer_id IS NOT NULL)
          AND id NOT IN (SELECT DISTINCT party_id FROM payments WHERE party_type = 'CUSTOMER' AND party_id IS NOT NULL)
          AND id NOT IN (SELECT DISTINCT party_id FROM ledger_entries WHERE party_type = 'CUSTOMER' AND party_id IS NOT NULL AND voucher_type != 'OPENING_BALANCE')
          AND UPPER(TRIM(name)) IN (
              SELECT UPPER(TRIM(name)) FROM customers GROUP BY UPPER(TRIM(name)) HAVING COUNT(*) > 1
          )
      `).run();
      duplicateCustDeleted = custDupRes.changes || 0;

      const suppDupRes = db.prepare(`
        DELETE FROM suppliers
        WHERE opening_balance = 0
          AND id NOT IN (SELECT DISTINCT supplier_id FROM purchases WHERE supplier_id IS NOT NULL)
          AND id NOT IN (SELECT DISTINCT party_id FROM payments WHERE party_type = 'SUPPLIER' AND party_id IS NOT NULL)
          AND id NOT IN (SELECT DISTINCT party_id FROM ledger_entries WHERE party_type = 'SUPPLIER' AND party_id IS NOT NULL AND voucher_type != 'OPENING_BALANCE')
          AND UPPER(TRIM(name)) IN (
              SELECT UPPER(TRIM(name)) FROM suppliers GROUP BY UPPER(TRIM(name)) HAVING COUNT(*) > 1
          )
      `).run();
      duplicateSuppDeleted = suppDupRes.changes || 0;

      const auditSummary = {
        timestamp: new Date().toISOString(),
        status: 'HEALTHY',
        sales_relinked: salesRelinked,
        purchases_relinked: purchasesRelinked,
        payments_relinked: paymentsRelinked,
        ledger_relinked: ledgerRelinked,
        ledger_auto_healed: ledgerAutoHealed,
        duplicate_customers_cleaned: duplicateCustDeleted,
        duplicate_suppliers_cleaned: duplicateSuppDeleted
      };

      console.log(`[INTEGRITY-GUARD] Audit Complete: Sales Relinked=${salesRelinked}, Purchases Relinked=${purchasesRelinked}, Payments Relinked=${paymentsRelinked}, Ledger Auto-Healed=${ledgerAutoHealed}, Duplicates Cleaned=${duplicateCustDeleted + duplicateSuppDeleted}`);
      return auditSummary;
    });
  },

  /**
   * Initializes the Daily 9:15 PM Party Integrity Guard Scheduler & runs instant audit on server boot.
   */
  initDailyScheduler() {
    console.log('⏰ Auto Daily 9:15 PM Party Integrity Guard Scheduler initialized...');

    // Run immediate check on boot
    try {
      this.runIntegrityCheckAndAutoHeal();
    } catch (err) {
      console.error('[INTEGRITY-GUARD] Startup check note:', err.message);
    }

    const scheduleNextRun = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(21, 15, 0, 0); // 9:15 PM daily

      if (now >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const delay = targetTime.getTime() - now.getTime();
      setTimeout(() => {
        try {
          this.runIntegrityCheckAndAutoHeal();
        } catch (e) {
          console.error('[INTEGRITY-GUARD] Scheduled run error:', e);
        }
        scheduleNextRun(); // Reschedule for next day
      }, delay);
    };

    scheduleNextRun();
  }
};
