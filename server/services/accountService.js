import { getDatabase, runInTransaction } from '../database/connection.js';

export const accountService = {
  getPaymentAccounts(activeOnly = true) {
    const db = getDatabase();
    let query = `
      SELECT 
        pa.*,
        COALESCE(pa.opening_balance, 0) +
        COALESCE((
          SELECT SUM(le.debit_amount) - SUM(le.credit_amount)
          FROM ledger_entries le
          WHERE (le.account_id = pa.id) OR 
                (le.account_id IS NULL AND (
                  (pa.account_type = 'CASH' AND pa.is_default = 1 AND le.party_type = 'CASH') OR
                  (pa.account_type = 'BANK' AND pa.is_default = 1 AND le.party_type = 'BANK')
                ))
        ), 0) as current_balance,
        (
          SELECT COUNT(*)
          FROM ledger_entries le
          WHERE le.account_id = pa.id
        ) as total_transactions
      FROM payment_accounts pa
    `;

    if (activeOnly) {
      query += ' WHERE pa.active = 1';
    }

    query += ' ORDER BY pa.is_default DESC, pa.account_name ASC';
    return db.prepare(query).all();
  },

  getPaymentAccountById(id) {
    const db = getDatabase();
    const account = db.prepare(`
      SELECT 
        pa.*,
        COALESCE(pa.opening_balance, 0) +
        COALESCE((
          SELECT SUM(le.debit_amount) - SUM(le.credit_amount)
          FROM ledger_entries le
          WHERE (le.account_id = pa.id) OR 
                (le.account_id IS NULL AND (
                  (pa.account_type = 'CASH' AND pa.is_default = 1 AND le.party_type = 'CASH') OR
                  (pa.account_type = 'BANK' AND pa.is_default = 1 AND le.party_type = 'BANK')
                ))
        ), 0) as current_balance
      FROM payment_accounts pa
      WHERE pa.id = ?
    `).get(id);

    return account || null;
  },

  createPaymentAccount(data, username = 'Admin') {
    return runInTransaction((db) => {
      const name = data.account_name?.trim();
      if (!name) throw new Error('Account name is required');

      // If set as default, remove default flag from others of the same type
      if (data.is_default) {
        db.prepare('UPDATE payment_accounts SET is_default = 0 WHERE account_type = ?').run(data.account_type || 'CASH');
      }

      const res = db.prepare(`
        INSERT INTO payment_accounts (
          account_name, account_type, account_number, bank_name, ifsc_code, opening_balance, is_default, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        data.account_type || 'CASH',
        data.account_number || '',
        data.bank_name || '',
        data.ifsc_code || '',
        Number(data.opening_balance) || 0.0,
        data.is_default ? 1 : 0,
        data.notes || ''
      );

      const newId = res.lastInsertRowid;

      // If opening balance > 0, log in ledger entries
      const opBal = Number(data.opening_balance) || 0.0;
      if (opBal !== 0) {
        db.prepare(`
          INSERT INTO ledger_entries (
            entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
            debit_amount, credit_amount, account_id, account_name, notes
          ) VALUES (CURRENT_DATE, ?, ?, ?, 'OPENING_BALANCE', 0, 'ACC-INIT', ?, ?, ?, ?, 'Account Initial Opening Balance')
        `).run(
          data.account_type || 'CASH',
          newId,
          name,
          opBal > 0 ? opBal : 0.0,
          opBal < 0 ? Math.abs(opBal) : 0.0,
          newId,
          name
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'ACCOUNTS', ?, ?)
      `).run(username, String(newId), `Created payment account ${name}`);

      return this.getPaymentAccountById(newId);
    });
  },

  updatePaymentAccount(id, data, username = 'Admin') {
    return runInTransaction((db) => {
      const existing = this.getPaymentAccountById(id);
      if (!existing) throw new Error('Account not found');

      if (data.is_default) {
        db.prepare('UPDATE payment_accounts SET is_default = 0 WHERE account_type = ? AND id != ?').run(data.account_type || existing.account_type, id);
      }

      db.prepare(`
        UPDATE payment_accounts SET
          account_name = ?,
          account_type = ?,
          account_number = ?,
          bank_name = ?,
          ifsc_code = ?,
          opening_balance = ?,
          is_default = ?,
          active = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.account_name ?? existing.account_name,
        data.account_type ?? existing.account_type,
        data.account_number ?? existing.account_number,
        data.bank_name ?? existing.bank_name,
        data.ifsc_code ?? existing.ifsc_code,
        data.opening_balance !== undefined ? Number(data.opening_balance) : existing.opening_balance,
        data.is_default !== undefined ? (data.is_default ? 1 : 0) : existing.is_default,
        data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
        data.notes ?? existing.notes,
        id
      );

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'EDIT', 'ACCOUNTS', ?, ?)
      `).run(username, String(id), `Updated payment account ${data.account_name || existing.account_name}`);

      return this.getPaymentAccountById(id);
    });
  },

  deletePaymentAccount(id, username = 'Admin') {
    return runInTransaction((db) => {
      const existing = this.getPaymentAccountById(id);
      if (!existing) throw new Error('Account not found');

      // Check if transactions exist
      const count = db.prepare('SELECT COUNT(*) as count FROM ledger_entries WHERE account_id = ?').get(id).count;
      if (count > 0) {
        // Soft delete
        db.prepare('UPDATE payment_accounts SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      } else {
        // Hard delete
        db.prepare('DELETE FROM payment_accounts WHERE id = ?').run(id);
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'DELETE', 'ACCOUNTS', ?, ?)
      `).run(username, String(id), `Deleted payment account ${existing.account_name}`);

      return { success: true, message: `Account ${existing.account_name} deleted` };
    });
  },

  // --- CONTRA TRANSFER (રોકડ બેંકમાં જમા / બેંકમાંથી રોકડ ઉપાડ) ---
  transferFunds(data, username = 'Admin') {
    return runInTransaction((db) => {
      const fromAccountId = Number(data.from_account_id);
      const toAccountId = Number(data.to_account_id);
      const amount = Number(data.amount);
      const date = data.date || new Date().toISOString().split('T')[0];
      const notes = data.notes || 'Internal Contra Transfer';

      if (!fromAccountId || !toAccountId) throw new Error('Source and destination accounts are required');
      if (fromAccountId === toAccountId) throw new Error('Source and destination accounts cannot be the same');
      if (!amount || amount <= 0) throw new Error('Transfer amount must be greater than 0');

      const fromAcc = this.getPaymentAccountById(fromAccountId);
      const toAcc = this.getPaymentAccountById(toAccountId);

      if (!fromAcc || !toAcc) throw new Error('Account not found');

      const count = db.prepare("SELECT COUNT(*) as count FROM ledger_entries WHERE voucher_type = 'CONTRA'").get().count + 1;
      const voucherNo = `CTR-${String(count).padStart(4, '0')}`;

      // 1. Credit Source Account (Money Out)
      db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, account_id, account_name, notes
        ) VALUES (?, ?, ?, ?, 'CONTRA', 0, ?, 0.0, ?, ?, ?, ?)
      `).run(
        date,
        fromAcc.account_type,
        fromAccountId,
        fromAcc.account_name,
        voucherNo,
        amount,
        fromAccountId,
        fromAcc.account_name,
        `Transferred to ${toAcc.account_name}${notes ? ' - ' + notes : ''}`
      );

      // 2. Debit Destination Account (Money In)
      db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, account_id, account_name, notes
        ) VALUES (?, ?, ?, ?, 'CONTRA', 0, ?, ?, 0.0, ?, ?, ?)
      `).run(
        date,
        toAcc.account_type,
        toAccountId,
        toAcc.account_name,
        voucherNo,
        amount,
        toAccountId,
        toAcc.account_name,
        `Received from ${fromAcc.account_name}${notes ? ' - ' + notes : ''}`
      );

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'CONTRA', 0, ?)
      `).run(username, `Transferred ₹${amount} from ${fromAcc.account_name} to ${toAcc.account_name} (${voucherNo})`);

      return {
        success: true,
        voucher_no: voucherNo,
        from_account: fromAcc.account_name,
        to_account: toAcc.account_name,
        amount,
        date
      };
    });
  }
};
