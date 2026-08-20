import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';

export const expenseService = {
  getExpenses(filters = {}) {
    const db = getDatabase();
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.supplier_id) {
      query += ' AND supplier_id = ?';
      params.push(Number(filters.supplier_id));
    }
    if (filters.expense_type) {
      query += ' AND expense_type = ?';
      params.push(filters.expense_type);
    }
    if (filters.pl_category) {
      query += ' AND pl_category = ?';
      params.push(filters.pl_category);
    }
    if (filters.location) {
      query += ' AND location = ?';
      params.push(filters.location);
    }
    if (filters.search) {
      query += ' AND (expense_no LIKE ? OR category LIKE ? OR notes LIKE ? OR reference_no LIKE ? OR supplier_name LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY date DESC, id DESC';
    return db.prepare(query).all(...params);
  },

  getExpenseCategories() {
    const db = getDatabase();
    const categories = [
      'Commercial Gas Cylinders (LPG)',
      'Karigar Daily Wages (કારીગર મજૂરી)',
      'Factory Electricity & Power',
      'Showroom / Shop Rent',
      'Sweet Boxes & Packaging Materials',
      'Staff Salaries & Helper Wages',
      'Transport & Delivery Vehicle Fuel',
      'Showroom Electricity & Water',
      'Machinery Maintenance & Repairs',
      'Marketing & Signboards',
      'Tea & Staff Refreshments',
      'General & Miscellaneous Expenses'
    ];
    return categories;
  },

  createExpense(data, username = 'Admin') {
    return runInTransaction((db) => {
      const expenseNo = data.expense_no || settingsService.getNextDocumentNumber('EXPENSE');
      const amount = Number(data.amount) || 0.0;
      if (amount <= 0) throw new Error('Expense amount must be greater than 0');

      const isOverhead = data.is_manufacturing_overhead ? 1 : 0;
      const date = data.date || new Date().toISOString().split('T')[0];

      // Resolve Supplier details if provided
      let supplierId = data.supplier_id ? Number(data.supplier_id) : null;
      let supplierName = data.supplier_name || '';
      let expenseType = data.expense_type || 'DIRECT';
      let plCategory = data.pl_category || 'DIRECT_EXPENSES';
      let location = data.location || 'FACTORY';

      if (supplierId) {
        const sup = db.prepare('SELECT id, name, expense_type, pl_category, allocated_location FROM suppliers WHERE id = ?').get(supplierId);
        if (sup) {
          supplierName = sup.name;
          if (!data.expense_type && sup.expense_type) expenseType = sup.expense_type;
          if (!data.pl_category && sup.pl_category) plCategory = sup.pl_category;
          if (!data.location && sup.allocated_location) location = sup.allocated_location;
        }
      }

      // Resolve Account
      let accountId = data.account_id ? Number(data.account_id) : null;
      let accountName = data.account_name || '';
      let accountType = 'CASH';

      if (accountId) {
        const acc = db.prepare('SELECT id, account_name, account_type FROM payment_accounts WHERE id = ?').get(accountId);
        if (acc) {
          accountName = acc.account_name;
          accountType = acc.account_type;
        }
      } else {
        const isBank = (data.payment_mode || '').toUpperCase().includes('BANK') || (data.payment_mode || '').toUpperCase() === 'CHEQUE';
        const isUPI = (data.payment_mode || '').toUpperCase().includes('UPI');
        const defaultType = isUPI ? 'UPI' : (isBank ? 'BANK' : 'CASH');
        const defAcc = db.prepare('SELECT id, account_name, account_type FROM payment_accounts WHERE account_type = ? ORDER BY is_default DESC LIMIT 1').get(defaultType)
          || db.prepare('SELECT id, account_name, account_type FROM payment_accounts ORDER BY is_default DESC LIMIT 1').get();
        if (defAcc) {
          accountId = defAcc.id;
          accountName = defAcc.account_name;
          accountType = defAcc.account_type;
        }
      }

      const res = db.prepare(`
        INSERT INTO expenses (
          expense_no, date, category, amount, payment_mode, reference_no, notes,
          is_manufacturing_overhead, account_id, account_name, bill_photo_url,
          supplier_id, supplier_name, expense_type, pl_category, location, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseNo,
        date,
        data.category,
        amount,
        data.payment_mode || accountType,
        data.reference_no || '',
        data.notes || '',
        isOverhead,
        accountId,
        accountName,
        data.bill_photo_url || '',
        supplierId,
        supplierName,
        expenseType,
        plCategory,
        location,
        username
      );

      const expenseId = res.lastInsertRowid;

      // Double-entry ledger: Expense Debit (Expense Category), Account Credit (Money Out)
      db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, account_id, account_name, notes
        ) VALUES (?, 'EXPENSE', ?, ?, 'EXPENSE', ?, ?, ?, 0.0, ?, ?, ?)
      `).run(
        date,
        expenseId,
        data.category,
        expenseId,
        expenseNo,
        amount,
        accountId,
        accountName,
        `Expense: ${data.category} - ${data.notes || ''}`
      );

      db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, account_id, account_name, notes
        ) VALUES (?, ?, ?, ?, 'EXPENSE', ?, ?, 0.0, ?, ?, ?, ?)
      `).run(
        date,
        accountType,
        accountId || 1,
        accountName || 'Cash Account',
        expenseId,
        expenseNo,
        amount,
        accountId,
        accountName,
        `Paid for Expense #${expenseNo} from ${accountName}`
      );

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'EXPENSES', ?, ?)
      `).run(username, String(expenseId), `Recorded expense ${expenseNo} of ₹${amount} for ${data.category} from ${accountName}`);

      return { id: expenseId, expense_no: expenseNo, amount, category: data.category, account_name: accountName };
    });
  }
};
