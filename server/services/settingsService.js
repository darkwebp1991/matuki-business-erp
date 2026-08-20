import { getDatabase } from '../database/connection.js';

export const settingsService = {
  getSettings() {
    const db = getDatabase();
    const s = db.prepare('SELECT * FROM business_settings ORDER BY id ASC LIMIT 1').get() || {};
    return {
      ...s,
      company_name: s.business_name || s.company_name || 'MATUKI SWEETS & SNACKS',
      phone: s.mobile || s.phone || '+91 98765 43210'
    };
  },

  getNextDocumentNumber(type) {
    const db = getDatabase();
    const settings = this.getSettings();

    const computeNext = (table, col, prefix, startSeq, filter = '') => {
      let query = `SELECT ${col} as doc_no FROM ${table}`;
      if (filter) query += ` WHERE ${filter}`;
      const rows = db.prepare(query).all();
      
      let maxNum = startSeq - 1;
      for (const r of rows) {
        if (r.doc_no) {
          const str = String(r.doc_no).trim();
          // Extract trailing digits
          const match = str.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }

      let nextSeq = Math.max(startSeq, maxNum + 1);
      let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
      
      // Ensure candidate is truly unique
      while (db.prepare(`SELECT 1 FROM ${table} WHERE ${col} = ?`).get(candidate)) {
        nextSeq++;
        candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
      }
      return candidate;
    };

    switch ((type || '').toUpperCase()) {
      case 'SALE': {
        const prefix = settings.invoice_prefix ?? 'MS/26-27/';
        const startSeq = Number(settings.sale_start_seq) || 1;
        return computeNext('sales', 'invoice_no', prefix, startSeq);
      }
      case 'SALE_RETURN': {
        const prefix = settings.sale_return_prefix ?? 'SR/26-27/';
        const startSeq = Number(settings.sale_return_start_seq) || 1;
        return computeNext('sales_returns', 'return_no', prefix, startSeq);
      }
      case 'PAYMENT_IN': {
        const prefix = settings.payment_in_prefix ?? 'RCT-';
        const startSeq = Number(settings.payment_in_start_seq) || 1;
        return computeNext('payments', 'payment_no', prefix, startSeq, "party_type = 'CUSTOMER'");
      }
      case 'PAYMENT_OUT': {
        const prefix = settings.payment_out_prefix ?? 'PAY-';
        const startSeq = Number(settings.payment_out_start_seq) || 1;
        return computeNext('payments', 'payment_no', prefix, startSeq, "party_type = 'SUPPLIER'");
      }
      case 'EXPENSE': {
        const prefix = settings.expense_prefix ?? 'EXP-';
        const startSeq = Number(settings.expense_start_seq) || 1;
        return computeNext('expenses', 'expense_no', prefix, startSeq);
      }
      case 'PURCHASE': {
        const prefix = settings.purchase_prefix ?? 'PO/26-27/';
        const startSeq = Number(settings.purchase_start_seq) || 1;
        return computeNext('purchases', 'purchase_no', prefix, startSeq);
      }
      case 'PURCHASE_RETURN': {
        const prefix = settings.purchase_return_prefix ?? 'PR/26-27/';
        const startSeq = Number(settings.purchase_return_start_seq) || 1;
        return computeNext('purchase_returns', 'return_no', prefix, startSeq);
      }
      case 'ADVANCE_ORDER': {
        const prefix = settings.advance_order_prefix ?? 'ORD-';
        const startSeq = Number(settings.advance_order_start_seq) || 1;
        return computeNext('advance_orders', 'order_no', prefix, startSeq);
      }
      default:
        return '';
    }
  },

  updateSettings(data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getSettings();

    db.prepare(`
      UPDATE business_settings SET
        business_name = ?,
        subtitle = ?,
        address = ?,
        mobile = ?,
        email = ?,
        gstin = ?,
        invoice_prefix = ?,
        sale_start_seq = ?,
        sale_return_prefix = ?,
        sale_return_start_seq = ?,
        purchase_prefix = ?,
        purchase_start_seq = ?,
        purchase_return_prefix = ?,
        purchase_return_start_seq = ?,
        payment_in_prefix = ?,
        payment_in_start_seq = ?,
        payment_out_prefix = ?,
        payment_out_start_seq = ?,
        expense_prefix = ?,
        expense_start_seq = ?,
        advance_order_prefix = ?,
        advance_order_start_seq = ?,
        manufacturing_prefix = ?,
        financial_year = ?,
        currency_symbol = ?,
        costing_method = ?,
        allow_negative_stock = ?,
        default_tax_rate = ?,
        default_units = ?,
        backup_folder = ?,
        invoice_terms = ?,
        upi_id = ?,
        upi_qr_image = ?,
        template_polite = ?,
        template_weekly = ?,
        template_urgent = ?,
        template_dispatch = ?,
        partner_1_mobile = ?,
        partner_2_mobile = ?,
        partner_3_mobile = ?,
        auto_rojmel_time = ?,
        auto_rojmel_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.business_name ?? existing.business_name,
      data.subtitle ?? existing.subtitle,
      data.address ?? existing.address,
      data.mobile ?? existing.mobile,
      data.email ?? existing.email,
      data.gstin ?? existing.gstin,
      data.invoice_prefix ?? existing.invoice_prefix,
      data.sale_start_seq !== undefined ? Number(data.sale_start_seq) : (existing.sale_start_seq || 1),
      data.sale_return_prefix ?? existing.sale_return_prefix ?? 'SR/26-27/',
      data.sale_return_start_seq !== undefined ? Number(data.sale_return_start_seq) : (existing.sale_return_start_seq || 1),
      data.purchase_prefix ?? existing.purchase_prefix,
      data.purchase_start_seq !== undefined ? Number(data.purchase_start_seq) : (existing.purchase_start_seq || 1),
      data.purchase_return_prefix ?? existing.purchase_return_prefix ?? 'PR/26-27/',
      data.purchase_return_start_seq !== undefined ? Number(data.purchase_return_start_seq) : (existing.purchase_return_start_seq || 1),
      data.payment_in_prefix ?? existing.payment_in_prefix ?? 'RCT-',
      data.payment_in_start_seq !== undefined ? Number(data.payment_in_start_seq) : (existing.payment_in_start_seq || 1),
      data.payment_out_prefix ?? existing.payment_out_prefix ?? 'PAY-',
      data.payment_out_start_seq !== undefined ? Number(data.payment_out_start_seq) : (existing.payment_out_start_seq || 1),
      data.expense_prefix ?? existing.expense_prefix ?? 'EXP-',
      data.expense_start_seq !== undefined ? Number(data.expense_start_seq) : (existing.expense_start_seq || 1),
      data.advance_order_prefix ?? existing.advance_order_prefix ?? 'ORD-',
      data.advance_order_start_seq !== undefined ? Number(data.advance_order_start_seq) : (existing.advance_order_start_seq || 1),
      data.manufacturing_prefix ?? existing.manufacturing_prefix,
      data.financial_year ?? existing.financial_year,
      data.currency_symbol ?? existing.currency_symbol,
      data.costing_method ?? existing.costing_method,
      data.allow_negative_stock !== undefined ? (data.allow_negative_stock ? 1 : 0) : existing.allow_negative_stock,
      data.default_tax_rate ?? existing.default_tax_rate,
      data.default_units ?? existing.default_units,
      data.backup_folder ?? existing.backup_folder,
      data.invoice_terms ?? existing.invoice_terms,
      data.upi_id ?? existing.upi_id ?? 'Q070321548@ybl',
      data.upi_qr_image ?? existing.upi_qr_image ?? '/payment_qr.png',
      data.template_polite ?? existing.template_polite ?? null,
      data.template_weekly ?? existing.template_weekly ?? null,
      data.template_urgent ?? existing.template_urgent ?? null,
      data.template_dispatch ?? existing.template_dispatch ?? null,
      data.partner_1_mobile ?? existing.partner_1_mobile ?? '+91 90818 22283',
      data.partner_2_mobile ?? existing.partner_2_mobile ?? '',
      data.partner_3_mobile ?? existing.partner_3_mobile ?? '',
      data.auto_rojmel_time ?? existing.auto_rojmel_time ?? '20:45',
      data.auto_rojmel_enabled !== undefined ? (data.auto_rojmel_enabled ? 1 : 0) : (existing.auto_rojmel_enabled !== undefined ? existing.auto_rojmel_enabled : 1),
      existing.id || 1
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'EDIT', 'SETTINGS', '1', 'Updated business configuration and numbering series')
    `).run(username);

    return this.getSettings();
  }
};
