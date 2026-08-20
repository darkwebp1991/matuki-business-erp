import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';

export const purchaseService = {
  getPurchases(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT p.*, s.mobile as supplier_mobile, s.gstin as supplier_gstin
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (p.purchase_no LIKE ? OR p.supplier_name LIKE ? OR p.supplier_invoice_no LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND p.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY p.date DESC, p.id DESC';
    return db.prepare(query).all(...params);
  },

  getPurchaseById(id) {
    const db = getDatabase();
    const purchase = db.prepare(`
      SELECT p.*, s.mobile as supplier_mobile, s.gstin as supplier_gstin, s.address as supplier_address
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id);

    if (!purchase) return null;

    const items = db.prepare(`
      SELECT pi.*,
        CASE
          WHEN pi.item_type = 'RAW_MATERIAL' THEN rm.code
          WHEN pi.item_type = 'PRODUCT' THEN prd.code
          ELSE ''
        END as item_code
      FROM purchase_items pi
      LEFT JOIN raw_materials rm ON pi.raw_material_id = rm.id
      LEFT JOIN products prd ON pi.product_id = prd.id
      WHERE pi.purchase_id = ?
    `).all(id);

    return { ...purchase, items };
  },

  createPurchase(data, username = 'Admin') {
    return runInTransaction((db) => {
      const purchaseNo = data.purchase_no || settingsService.getNextDocumentNumber('PURCHASE');

      // Get supplier details
      const supplier = db.prepare('SELECT id, name FROM suppliers WHERE id = ?').get(data.supplier_id);
      if (!supplier) throw new Error('Supplier not found');

      // Compute totals safely
      let subtotal = 0.0;
      let taxTotal = 0.0;
      const itemsToSave = [];

      for (const item of (data.items || [])) {
        const qty = Number(item.quantity) || 0.0;
        const rate = Number(item.rate) || 0.0;
        const discount = Number(item.discount) || 0.0;
        const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : 5.0;

        const baseAmount = (qty * rate) - discount;
        const gstAmount = (baseAmount * gstRate) / 100.0;
        const lineTotal = baseAmount + gstAmount;

        subtotal += baseAmount;
        taxTotal += gstAmount;

        itemsToSave.push({
          ...item,
          quantity: qty,
          rate,
          discount,
          gst_rate: gstRate,
          gst_amount: Math.round(gstAmount * 100) / 100,
          amount: Math.round(lineTotal * 100) / 100
        });
      }

      const discountAmount = Number(data.discount_amount) || 0.0;
      const roundOff = Number(data.round_off) || 0.0;
      const grandTotal = Math.round((subtotal + taxTotal - discountAmount + roundOff) * 100) / 100;
      const paidAmount = Number(data.paid_amount) || 0.0;
      const dueAmount = Math.max(0, grandTotal - paidAmount);

      // 1. Insert Purchase Voucher
      const purchaseRes = db.prepare(`
        INSERT INTO purchases (
          purchase_no, date, supplier_id, supplier_name, supplier_invoice_no, supplier_invoice_date,
          subtotal, discount_amount, tax_amount, round_off, grand_total, paid_amount, due_amount,
          payment_mode, status, notes, bill_photo_url, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
      `).run(
        purchaseNo,
        data.date || new Date().toISOString().split('T')[0],
        supplier.id,
        supplier.name,
        data.supplier_invoice_no || '',
        data.supplier_invoice_date || null,
        Math.round(subtotal * 100) / 100,
        discountAmount,
        Math.round(taxTotal * 100) / 100,
        roundOff,
        grandTotal,
        paidAmount,
        dueAmount,
        data.payment_mode || 'CASH',
        data.notes || '',
        data.bill_photo_url || '',
        username
      );

      const purchaseId = purchaseRes.lastInsertRowid;

      // 2. Save Purchase Items, update Stock & Weighted Average Rate
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, item_type, raw_material_id, product_id, item_name,
          quantity, unit, rate, discount, gst_rate, gst_amount, amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of itemsToSave) {
        insertItem.run(
          purchaseId,
          item.item_type || 'RAW_MATERIAL',
          item.raw_material_id || null,
          item.product_id || null,
          item.item_name,
          item.quantity,
          item.unit,
          item.rate,
          item.discount,
          item.gst_rate,
          item.gst_amount,
          item.amount
        );

        if (item.item_type === 'RAW_MATERIAL' && item.raw_material_id) {
          const rm = db.prepare('SELECT * FROM raw_materials WHERE id = ?').get(item.raw_material_id);
          if (rm) {
            const currentStock = Number(rm.current_stock) || 0.0;
            const newStock = currentStock + item.quantity;
            const oldAvg = Number(rm.average_purchase_rate) || Number(rm.current_purchase_rate) || item.rate;

            // Weighted average formula: (current_stock * old_avg + qty * rate) / (current_stock + qty)
            let newAvg = item.rate;
            if (newStock > 0) {
              newAvg = ((Math.max(0, currentStock) * oldAvg) + (item.quantity * item.rate)) / newStock;
            }

            // Update raw material rates and stock
            db.prepare(`
              UPDATE raw_materials SET
                current_stock = current_stock + ?,
                current_purchase_rate = ?,
                average_purchase_rate = ?,
                last_purchase_rate = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(item.quantity, item.rate, Math.round(newAvg * 100) / 100, item.rate, rm.id);

            // Log price history
            db.prepare(`
              INSERT INTO raw_material_price_history (raw_material_id, purchase_id, old_rate, new_rate, effective_date)
              VALUES (?, ?, ?, ?, ?)
            `).run(rm.id, purchaseId, rm.current_purchase_rate, item.rate, data.date || new Date().toISOString().split('T')[0]);

            // Record Stock IN Movement
            db.prepare(`
              INSERT INTO stock_movements (
                movement_date, item_type, item_id, item_name, movement_type,
                quantity, unit, base_quantity, cost_rate, total_cost_value,
                reference_type, reference_id, reference_no, notes, created_by
              ) VALUES (?, 'RAW_MATERIAL', ?, ?, 'PURCHASE_IN', ?, ?, ?, ?, ?, 'PURCHASE', ?, ?, ?, ?)
            `).run(
              data.date || new Date().toISOString().split('T')[0],
              rm.id,
              rm.name,
              item.quantity,
              item.unit,
              item.quantity,
              item.rate,
              item.amount,
              purchaseId,
              purchaseNo,
              `Purchase from ${supplier.name} (Bill #${data.supplier_invoice_no || purchaseNo})`,
              username
            );
          }
        } else if (item.item_type === 'PRODUCT' && item.product_id) {
          db.prepare(`
            UPDATE products SET
              current_stock = current_stock + ?,
              purchase_rate = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.quantity, item.rate, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (?, 'FINISHED_PRODUCT', ?, ?, 'PURCHASE_IN', ?, ?, ?, ?, ?, 'PURCHASE', ?, ?, ?, ?)
          `).run(
            data.date || new Date().toISOString().split('T')[0],
            item.product_id,
            item.item_name,
            item.quantity,
            item.unit,
            item.quantity,
            item.rate,
            item.amount,
            purchaseId,
            purchaseNo,
            `Purchased from ${supplier.name}`,
            username
          );
        }
      }

      // 3. Double-Entry Supplier Ledger
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Credit supplier for total bill amount
      insertLedger.run(
        data.date || new Date().toISOString().split('T')[0],
        'SUPPLIER',
        supplier.id,
        supplier.name,
        'PURCHASE',
        purchaseId,
        purchaseNo,
        0.0,
        grandTotal,
        `Purchase Invoice #${purchaseNo} (Supplier Inv: ${data.supplier_invoice_no || '-'})`
      );

      // If paid amount > 0, record supplier payment (Debit Supplier)
      if (paidAmount > 0) {
        insertLedger.run(
          data.date || new Date().toISOString().split('T')[0],
          'SUPPLIER',
          supplier.id,
          supplier.name,
          'PAYMENT_MADE',
          purchaseId,
          purchaseNo,
          paidAmount,
          0.0,
          `Paid on Purchase via ${data.payment_mode || 'CASH'}`
        );

        // Record in payments table
        const payCount = db.prepare('SELECT COUNT(*) as count FROM payments').get().count + 1;
        db.prepare(`
          INSERT INTO payments (payment_no, payment_date, party_type, party_id, party_name, amount, payment_mode, reference_no, notes, created_by)
          VALUES (?, ?, 'SUPPLIER', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `PAY-SUP-${String(payCount).padStart(3, '0')}`,
          data.date || new Date().toISOString().split('T')[0],
          supplier.id,
          supplier.name,
          paidAmount,
          data.payment_mode || 'CASH',
          purchaseNo,
          `Immediate payment on purchase ${purchaseNo}`,
          username
        );
      }

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'PURCHASES', ?, ?)
      `).run(username, String(purchaseId), `Created purchase ${purchaseNo} from ${supplier.name} for ₹${grandTotal}`);

      return this.getPurchaseById(purchaseId);
    });
  },

  // --- PURCHASE RETURNS / DEBIT NOTES (ડેબિટ નોટ) ---
  getPurchaseReturns(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT * FROM purchase_returns WHERE 1=1';
    const params = [];
    if (filters.supplier_id) {
      query += ' AND supplier_id = ?';
      params.push(filters.supplier_id);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }
    query += ' ORDER BY date DESC, id DESC';
    const returns = db.prepare(query).all(...params);

    if (returns.length === 0) {
      let ledgerQuery = `
        SELECT
          id,
          voucher_no as return_no,
          entry_date as date,
          party_id as supplier_id,
          party_name as supplier_name,
          debit_amount as total_amount,
          notes as reason
        FROM ledger_entries
        WHERE voucher_type IN ('PURCHASE_RETURN', 'DEBIT_NOTE')
      `;
      const lParams = [];
      if (filters.supplier_id) {
        ledgerQuery += ' AND party_id = ?';
        lParams.push(filters.supplier_id);
      }
      ledgerQuery += ' ORDER BY entry_date DESC, id DESC';
      return db.prepare(ledgerQuery).all(...lParams);
    }
    return returns;
  },

  createPurchaseReturn(data, username = 'Admin') {
    return runInTransaction((db) => {
      const returnNo = data.return_no || settingsService.getNextDocumentNumber('DEBIT_NOTE');
      const date = data.date || new Date().toISOString().split('T')[0];
      const purchaseId = data.purchase_id || null;
      const supplierId = data.supplier_id;
      const supplierName = data.supplier_name || 'Supplier';
      const totalAmount = Number(data.total_amount || data.grand_total || 0.0);
      const reason = data.reason || data.notes || 'Purchase Return / Debit Note';

      const res = db.prepare(`
        INSERT INTO purchase_returns (return_no, date, purchase_id, supplier_id, supplier_name, total_amount, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(returnNo, date, purchaseId, supplierId, supplierName, totalAmount, reason, username);

      const returnId = res.lastInsertRowid;

      // Debit Supplier (reduces supplier payable balance)
      db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, notes
        ) VALUES (?, 'SUPPLIER', ?, ?, 'PURCHASE_RETURN', ?, ?, ?, 0.0, ?)
      `).run(date, supplierId, supplierName, returnId, returnNo, totalAmount, `Debit Note / Return #${returnNo}: ${reason}`);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'PURCHASE_RETURNS', ?, ?)
      `).run(username, String(returnId), `Created Purchase Return / Debit Note ${returnNo} for ${supplierName} (₹${totalAmount})`);

      return { id: returnId, return_no: returnNo, total_amount: totalAmount };
    });
  }
};
