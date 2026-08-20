import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';
import { autoInvoiceDispatchService } from './autoInvoiceDispatchService.js';

// Standard Replacement / Missing Container Valuation
export const VASAN_DEFAULT_RATES = {
  'Dol': 500.0,
  'Steel Dol': 600.0,
  'Milton': 1500.0,
  'Choki': 400.0,
  'Carat': 250.0,
  'Steel Dabba': 350.0,
  'Petharo': 800.0,
  'Plastic Tub': 200.0,
  'Tray': 150.0,
  'Other': 200.0
};

export const salesService = {
  getSales(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT s.*, c.mobile as customer_registered_mobile, c.gstin as customer_gstin
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (s.invoice_no LIKE ? OR s.customer_name LIKE ? OR s.customer_mobile LIKE ? OR s.driver_name LIKE ? OR s.delivery_venue LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.customer_id) {
      query += ' AND s.customer_id = ?';
      params.push(filters.customer_id);
    }
    if (filters.driver_id) {
      query += ' AND s.driver_id = ?';
      params.push(filters.driver_id);
    }
    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND s.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY s.date DESC, s.id DESC';
    return db.prepare(query).all(...params);
  },

  getSaleById(id) {
    const db = getDatabase();
    const sale = db.prepare(`
      SELECT s.*, c.mobile as customer_registered_mobile, c.gstin as customer_gstin, c.address as customer_address
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(id);

    if (!sale) return null;

    const items = db.prepare(`
      SELECT si.*, p.code as product_code, p.hsn_code
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(id);

    const vasanEntries = db.prepare(`
      SELECT * FROM vasan_ledger WHERE sale_id = ?
    `).all(id);

    return { ...sale, items, vasanEntries };
  },

  getCustomerLastItemRates(customerId) {
    if (!customerId) return {};
    const db = getDatabase();
    const rows = db.prepare(`
      WITH RankedSales AS (
        SELECT 
          si.product_id,
          si.rate as last_rate,
          si.discount as last_discount,
          s.date as last_date,
          s.invoice_no,
          ROW_NUMBER() OVER (PARTITION BY si.product_id ORDER BY s.date DESC, s.id DESC) as rn
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.customer_id = ? AND s.status = 'ACTIVE' AND si.product_id IS NOT NULL AND si.rate > 0
      )
      SELECT product_id, last_rate, last_discount, last_date, invoice_no
      FROM RankedSales
      WHERE rn = 1
    `).all(Number(customerId));

    const rateMap = {};
    for (const r of rows) {
      rateMap[r.product_id] = {
        rate: r.last_rate,
        discount: r.last_discount,
        last_date: r.last_date,
        invoice_no: r.invoice_no
      };
    }
    return rateMap;
  },

  createSale(data, username = 'Cashier') {
    return runInTransaction((db) => {
      const settings = settingsService.getSettings();
      const allowNegative = settings.allow_negative_stock === 1;

      const invoiceNo = data.invoice_no || settingsService.getNextDocumentNumber('SALE');

      // --- RULE: PREVENT DUPLICATE IDENTICAL SALES / BILLS ---
      const saleDate = data.date || new Date().toISOString().split('T')[0];
      const custId = data.customer_id ? Number(data.customer_id) : null;
      const custName = data.customer_name ? data.customer_name.trim() : '';
      const inputItems = data.items || [];

      if ((custId || custName) && inputItems.length > 0) {
        const existingSales = db.prepare(`
          SELECT id, invoice_no, grand_total, date
          FROM sales
          WHERE date = ?
            AND status != 'CANCELLED'
            AND (
              (? IS NOT NULL AND customer_id = ?)
              OR (customer_name IS NOT NULL AND LOWER(TRIM(customer_name)) = LOWER(TRIM(?)))
            )
        `).all(saleDate, custId, custId, custName);

        for (const existing of existingSales) {
          const existingItems = db.prepare('SELECT product_id, product_name, quantity, rate FROM sale_items WHERE sale_id = ?').all(existing.id);
          if (existingItems.length === inputItems.length) {
            const normalizeSaleItem = (it) => `${it.product_id || 0}_${(it.product_name || '').trim().toLowerCase()}_${Number(it.quantity || 0).toFixed(3)}_${Number(it.rate || 0).toFixed(2)}`;
            const set1 = inputItems.map(normalizeSaleItem).sort();
            const set2 = existingItems.map(normalizeSaleItem).sort();
            const isIdentical = set1.every((val, idx) => val === set2[idx]);
            if (isIdentical) {
              throw new Error(`Duplicate Bill Detected! An identical invoice #${existing.invoice_no} (₹${existing.grand_total}) already exists for this party on ${saleDate} with the exact same items & quantities.`);
            }
          }
        }
      }

      // 1. Validate & calculate line items
      let subtotal = 0.0;
      const itemsToSave = [];
      const vasanCounts = {};

      for (const item of (data.items || [])) {
        const vasanType = item.vasan_type || 'NONE';
        const vasanQty = Number(item.vasan_qty) || 0.0;
        const hasVasan = vasanType !== 'NONE' && vasanQty > 0;

        const vasanType2 = item.vasan_type_2 || 'NONE';
        const vasanQty2 = Number(item.vasan_qty_2) || 0.0;
        const hasVasan2 = vasanType2 !== 'NONE' && vasanQty2 > 0;

        // Case 1: Standard Sweet / Product Item
        if (item.product_id) {
          const prod = db.prepare('SELECT id, name, code, current_stock, unit, purchase_rate, selling_rate FROM products WHERE id = ?').get(item.product_id);
          if (!prod) throw new Error(`Product ID ${item.product_id} not found`);

          const qty = Number(item.quantity) || 0.0;
          if (qty <= 0) throw new Error(`Invalid quantity for ${prod.name}`);

          const rate = Number(item.rate) !== undefined ? Number(item.rate) : Number(prod.selling_rate);
          const discount = Number(item.discount) || 0.0;
          const lineTotal = (qty * rate) - discount;

          subtotal += lineTotal;

          if (hasVasan) {
            vasanCounts[vasanType] = (vasanCounts[vasanType] || 0) + vasanQty;
          }
          if (hasVasan2) {
            vasanCounts[vasanType2] = (vasanCounts[vasanType2] || 0) + vasanQty2;
          }

          itemsToSave.push({
            product_id: prod.id,
            product_name: prod.name,
            unit: item.unit || prod.unit || 'KG',
            purchase_rate: Number(prod.purchase_rate) || 0.0,
            quantity: qty,
            rate,
            discount,
            amount: Math.round(lineTotal * 100) / 100,
            vasan_type: vasanType,
            vasan_qty: vasanQty,
            vasan_type_2: vasanType2,
            vasan_qty_2: vasanQty2
          });
        } 
        // Case 2: Blank Sweet Row used for 2nd/Outer Vasan (e.g. Dol packed in Carat)
        else if (hasVasan || hasVasan2) {
          const customName = item.product_name?.trim() || (hasVasan2 ? `Outer Vasan (${vasanType} & ${vasanType2})` : `Outer Vasan (${vasanType})`);

          if (hasVasan) {
            vasanCounts[vasanType] = (vasanCounts[vasanType] || 0) + vasanQty;
          }
          if (hasVasan2) {
            vasanCounts[vasanType2] = (vasanCounts[vasanType2] || 0) + vasanQty2;
          }

          itemsToSave.push({
            product_id: null,
            product_name: customName,
            unit: 'CONTAINER',
            purchase_rate: 0.0,
            quantity: 0.0,
            rate: 0.0,
            discount: 0.0,
            amount: 0.0,
            vasan_type: vasanType,
            vasan_qty: vasanQty,
            vasan_type_2: vasanType2,
            vasan_qty_2: vasanQty2
          });
        }
      }

      // Build vasan summary string (e.g. "Dol: 2, Carat: 1, Milton: 5")
      const vasanSummary = Object.entries(vasanCounts)
        .map(([type, q]) => `${type}: ${q}`)
        .join(', ');

      const discountAmount = Number(data.discount_amount) || 0.0;
      const deliveryCharge = Number(data.delivery_charge) || 0.0;
      const roundOff = Number(data.round_off) || 0.0;
      const grandTotal = Math.round((subtotal - discountAmount + deliveryCharge + roundOff) * 100) / 100;

      const advanceAdjusted = Math.min(grandTotal, Math.max(0, Number(data.advance_adjusted) || 0.0));
      const currentPaid = (data.paid_amount !== undefined && data.paid_amount !== null && !isNaN(Number(data.paid_amount))) 
        ? Number(data.paid_amount) 
        : (data.payment_mode === 'CREDIT' ? 0.0 : Math.max(0, grandTotal - advanceAdjusted));
      const totalPaid = Math.min(grandTotal, advanceAdjusted + currentPaid);
      const dueAmount = Math.max(0, grandTotal - totalPaid);

      let customerId = data.customer_id || null;
      let customerName = data.customer_name || 'Cash Walk-in Customer';

      if (customerId) {
        const cust = db.prepare('SELECT id, name, mobile, advance_balance FROM customers WHERE id = ?').get(customerId);
        if (cust) {
          customerName = cust.name;
        }
      }

      const driverId = data.driver_id ? Number(data.driver_id) : null;
      let driverName = data.driver_name || '';
      let driverMobile = data.driver_mobile || '';
      let driverDefaultRent = 150.0;

      if (driverId) {
        const driver = db.prepare('SELECT id, name, mobile, vehicle_no, default_rent FROM drivers WHERE id = ?').get(driverId);
        if (driver) {
          driverName = driver.name;
          driverMobile = driver.mobile;
          driverDefaultRent = Number(driver.default_rent) || 150.0;
        }
      }

      // Rickshaw rent for driver hisab: uses explicit or driver's standard trip rate
      const rickshawRent = data.rickshaw_rent !== undefined ? Number(data.rickshaw_rent) : (driverId ? driverDefaultRent : 0.0);
      const deliveryVenue = data.delivery_venue || '';
      const deliveryAddress = data.delivery_address || '';
      const googleMapLink = data.google_map_link || '';
      const tripType = data.trip_type || 'ROUND_TRIP';

      const billedBy = data.billed_by || username || 'Admin';

      // 2. Insert Sale Record
      const saleRes = db.prepare(`
        INSERT INTO sales (
          invoice_no, date, customer_id, customer_name, customer_mobile,
          subtotal, discount_amount, delivery_charge, advance_adjusted, tax_amount, round_off, grand_total,
          paid_amount, due_amount, payment_mode, status, notes, created_by, billed_by,
          delivery_venue, delivery_address, driver_id, driver_name, driver_mobile,
          rickshaw_rent, rickshaw_rent_status, vasan_summary, google_map_link, trip_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
      `).run(
        invoiceNo,
        data.date || new Date().toISOString().split('T')[0],
        customerId,
        customerName,
        data.customer_mobile || '',
        Math.round(subtotal * 100) / 100,
        discountAmount,
        deliveryCharge,
        advanceAdjusted,
        roundOff,
        grandTotal,
        totalPaid,
        dueAmount,
        data.payment_mode || 'CASH',
        data.notes || '',
        username,
        billedBy,
        deliveryVenue,
        deliveryAddress,
        driverId,
        driverName,
        driverMobile,
        rickshawRent,
        vasanSummary,
        googleMapLink,
        tripType
      );

      const saleId = saleRes.lastInsertRowid;

      // Deduct advance from customer's advance_balance
      if (customerId && advanceAdjusted > 0) {
        db.prepare('UPDATE customers SET advance_balance = MAX(0, advance_balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(advanceAdjusted, customerId);
      }

      // 3. Save Items & Deduct Stock & Record Vasan
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit, rate, discount, gst_rate, gst_amount, amount, vasan_type, vasan_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?)
      `);

      const insertVasan = db.prepare(`
        INSERT INTO vasan_ledger (
          sale_id, customer_id, customer_name, driver_id, driver_name,
          date, item_name, vasan_type, issued_qty, returned_qty, due_qty, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'PENDING_RETURN', ?)
      `);

      for (const item of itemsToSave) {
        insertItem.run(
          saleId,
          item.product_id || null,
          item.product_name,
          item.quantity,
          item.unit,
          item.rate,
          item.discount,
          item.amount,
          item.vasan_type,
          item.vasan_qty
        );

        // Deduct product stock ONLY if valid product_id exists (Zero-Stock Allowed)
        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);

          // Record Stock OUT Movement
          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (?, 'FINISHED_PRODUCT', ?, ?, 'SALES_OUT', ?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?)
          `).run(
            data.date || new Date().toISOString().split('T')[0],
            item.product_id,
            item.product_name,
            -item.quantity,
            item.unit,
            -item.quantity,
            item.purchase_rate,
            item.quantity * item.purchase_rate,
            saleId,
            invoiceNo,
            `Wholesale Sale to ${customerName} (Bill #${invoiceNo})`,
            username
          );
        }

        // Primary Vasan Container tracking
        if (item.vasan_type !== 'NONE' && item.vasan_qty > 0) {
          insertVasan.run(
            saleId,
            customerId,
            customerName,
            driverId,
            driverName,
            data.date || new Date().toISOString().split('T')[0],
            item.product_name,
            item.vasan_type,
            item.vasan_qty,
            item.vasan_qty,
            item.quantity > 0 
              ? `Issued with Bill #${invoiceNo} (${item.quantity} ${item.unit} ${item.product_name})`
              : `Outer/Packing Container with Bill #${invoiceNo} (${item.product_name})`
          );
        }

        // Secondary Vasan Container tracking (e.g. Dol packed in Carat)
        if (item.vasan_type_2 && item.vasan_type_2 !== 'NONE' && item.vasan_qty_2 > 0) {
          insertVasan.run(
            saleId,
            customerId,
            customerName,
            driverId,
            driverName,
            data.date || new Date().toISOString().split('T')[0],
            `${item.product_name} (2nd Container)`,
            item.vasan_type_2,
            item.vasan_qty_2,
            item.vasan_qty_2,
            `Outer Packing Container with Bill #${invoiceNo} (${item.product_name})`
          );
        }
      }

      // 4. Double-Entry Customer Ledger
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (customerId) {
        // Debit customer for bill total
        insertLedger.run(
          data.date || new Date().toISOString().split('T')[0],
          'CUSTOMER',
          customerId,
          customerName,
          'SALE',
          saleId,
          invoiceNo,
          grandTotal,
          0.0,
          `Bill #${invoiceNo}${deliveryVenue ? ' (Delivered: ' + deliveryVenue + ')' : ''}${advanceAdjusted > 0 ? ' [Advance Adjusted: ₹' + advanceAdjusted + ']' : ''}`
        );

        // Credit customer for current cash/upi paid now (excluding advance which was already credited previously)
        if (currentPaid > 0) {
          insertLedger.run(
            data.date || new Date().toISOString().split('T')[0],
            'CUSTOMER',
            customerId,
            customerName,
            'PAYMENT_RECEIVED',
            saleId,
            invoiceNo,
            0.0,
            currentPaid,
            `Receipt against Bill #${invoiceNo} (${data.payment_mode || 'CASH'})`
          );
        }
      }

      // Track payment in Cash / Bank for current cash collection
      if (currentPaid > 0) {
        const isCash = (data.payment_mode || 'CASH') === 'CASH';
        insertLedger.run(
          data.date || new Date().toISOString().split('T')[0],
          isCash ? 'CASH' : 'BANK',
          1,
          isCash ? 'Counter Cash Drawer' : 'Bank Account',
          'PAYMENT_RECEIVED',
          saleId,
          invoiceNo,
          currentPaid,
          0.0,
          `Sale collection from ${customerName} (Bill #${invoiceNo})`
        );
      }

      const created = this.getSaleById(saleId);
      return created;
    });

    if (created && created.id) {
      try {
        autoInvoiceDispatchService.scheduleSaleInvoice(created.id);
      } catch (err) {
        console.warn('Auto invoice schedule notice:', err.message);
      }
    }
    return created;
  },

  updateSale(id, data, username = 'Cashier') {
    return runInTransaction((db) => {
      const existingSale = this.getSaleById(id);
      if (!existingSale) throw new Error('Sales invoice not found');
      if (existingSale.status === 'CANCELLED') throw new Error('Cannot edit a cancelled invoice');

      // 1. Restore previous stock deducted by original items
      for (const item of (existingSale.items || [])) {
        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
        }
      }

      // 2. Restore previous advance deduction if any
      if (existingSale.customer_id && existingSale.advance_adjusted > 0) {
        db.prepare('UPDATE customers SET advance_balance = advance_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existingSale.advance_adjusted, existingSale.customer_id);
      }

      // 3. Remove old linked entries for this sale (items, stock_movements, vasan_ledger, ledger_entries)
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
      db.prepare("DELETE FROM stock_movements WHERE reference_type = 'SALE' AND reference_id = ?").run(id);
      db.prepare('DELETE FROM vasan_ledger WHERE sale_id = ?').run(id);
      db.prepare("DELETE FROM ledger_entries WHERE voucher_type IN ('SALE', 'PAYMENT_RECEIVED') AND voucher_id = ?").run(id);

      // 4. Validate & calculate new items
      let subtotal = 0.0;
      const itemsToSave = [];
      const vasanCounts = {};

      for (const item of (data.items || [])) {
        const vasanType = item.vasan_type || 'NONE';
        const vasanQty = Number(item.vasan_qty) || 0.0;
        const hasVasan = vasanType !== 'NONE' && vasanQty > 0;

        const vasanType2 = item.vasan_type_2 || 'NONE';
        const vasanQty2 = Number(item.vasan_qty_2) || 0.0;

        let prod = null;
        if (item.product_id) {
          prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        }

        const quantity = Number(item.quantity) || 0.0;
        const unit = item.unit || prod?.unit || 'KG';
        const rate = Number(item.rate) !== undefined ? Number(item.rate) : (prod?.selling_rate || 0.0);
        const discount = Number(item.discount) || 0.0;
        const lineTotal = Math.max(0, (quantity * rate) - discount);

        subtotal += lineTotal;

        if (hasVasan) {
          vasanCounts[vasanType] = (vasanCounts[vasanType] || 0) + vasanQty;
        }
        if (vasanType2 !== 'NONE' && vasanQty2 > 0) {
          vasanCounts[vasanType2] = (vasanCounts[vasanType2] || 0) + vasanQty2;
        }

        itemsToSave.push({
          product_id: item.product_id || null,
          product_name: item.product_name || prod?.name || 'Custom Sweet Item',
          quantity,
          unit,
          rate,
          discount,
          amount: lineTotal,
          purchase_rate: prod?.purchase_rate || (rate * 0.7),
          vasan_type: vasanType,
          vasan_qty: vasanQty,
          vasan_type_2: vasanType2,
          vasan_qty_2: vasanQty2
        });
      }

      const vasanSummary = Object.entries(vasanCounts).map(([type, qty]) => `${type}: ${qty}`).join(', ');

      const deliveryCharge = Number(data.delivery_charge) || 0.0;
      const discountAmount = Number(data.discount_amount) || 0.0;
      const grandTotal = Math.max(0, subtotal + deliveryCharge - discountAmount);

      const customerId = data.customer_id ? Number(data.customer_id) : null;
      let customerName = data.customer_name?.trim() || 'Cash Walk-in Customer';
      let customerMobile = data.customer_mobile?.trim() || '';

      if (customerId) {
        const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (cust) {
          customerName = cust.name;
          if (!customerMobile) customerMobile = cust.mobile || '';
        }
      }

      let advanceAdjusted = Number(data.advance_adjusted) || 0.0;
      let currentPaid = Number(data.paid_amount) || 0.0;
      let totalEffectivePaid = currentPaid + advanceAdjusted;
      let dueAmount = Math.max(0, grandTotal - totalEffectivePaid);

      const driverId = data.driver_id ? Number(data.driver_id) : null;
      let driverName = data.driver_name?.trim() || '';
      let driverMobile = data.driver_mobile?.trim() || '';

      if (driverId) {
        const d = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        if (d) {
          driverName = d.name;
          driverMobile = d.mobile || '';
        }
      }

      const deliveryVenue = data.delivery_venue?.trim() || '';
      const deliveryAddress = data.delivery_address?.trim() || '';
      const rickshawRent = Number(data.rickshaw_rent) || 0.0;
      const rickshawRentStatus = data.rickshaw_rent_status || (rickshawRent > 0 ? 'PENDING' : 'PAID');
      const tripType = data.trip_type || existingSale.trip_type || 'ROUND_TRIP';

      const billedBy = data.billed_by || username || 'Admin';

      // Update Sales Header
      db.prepare(`
        UPDATE sales SET
          date = ?, customer_id = ?, customer_name = ?, customer_mobile = ?,
          delivery_venue = ?, delivery_address = ?, driver_id = ?, driver_name = ?, driver_mobile = ?,
          rickshaw_rent = ?, rickshaw_rent_status = ?, vasan_summary = ?,
          subtotal = ?, tax_amount = 0.0, discount_amount = ?, delivery_charge = ?,
          grand_total = ?, advance_adjusted = ?, paid_amount = ?, due_amount = ?,
          payment_mode = ?, notes = ?, billed_by = ?, trip_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.date || existingSale.date,
        customerId,
        customerName,
        customerMobile,
        deliveryVenue,
        deliveryAddress,
        driverId,
        driverName,
        driverMobile,
        rickshawRent,
        rickshawRentStatus,
        vasanSummary,
        subtotal,
        discountAmount,
        deliveryCharge,
        grandTotal,
        advanceAdjusted,
        currentPaid,
        dueAmount,
        data.payment_mode || 'CASH',
        data.notes || '',
        billedBy,
        tripType,
        id
      );

      // Deduct advance from customer's advance_balance
      if (customerId && advanceAdjusted > 0) {
        db.prepare('UPDATE customers SET advance_balance = MAX(0, advance_balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(advanceAdjusted, customerId);
      }

      // Insert Items, Deduct Stock, Record Vasan
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit, rate, discount, gst_rate, gst_amount, amount, vasan_type, vasan_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?)
      `);

      const insertVasan = db.prepare(`
        INSERT INTO vasan_ledger (
          sale_id, customer_id, customer_name, driver_id, driver_name,
          date, item_name, vasan_type, issued_qty, returned_qty, due_qty, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'PENDING_RETURN', ?)
      `);

      for (const item of itemsToSave) {
        insertItem.run(
          id,
          item.product_id || null,
          item.product_name,
          item.quantity,
          item.unit,
          item.rate,
          item.discount,
          item.amount,
          item.vasan_type,
          item.vasan_qty
        );

        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (?, 'FINISHED_PRODUCT', ?, ?, 'SALES_OUT', ?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?)
          `).run(
            data.date || existingSale.date,
            item.product_id,
            item.product_name,
            -item.quantity,
            item.unit,
            -item.quantity,
            item.purchase_rate,
            item.quantity * item.purchase_rate,
            id,
            existingSale.invoice_no,
            `Updated Wholesale Sale to ${customerName} (Bill #${existingSale.invoice_no})`,
            username
          );
        }

        if (item.vasan_type !== 'NONE' && item.vasan_qty > 0) {
          insertVasan.run(
            id,
            customerId,
            customerName,
            driverId,
            driverName,
            data.date || existingSale.date,
            item.product_name,
            item.vasan_type,
            item.vasan_qty,
            item.vasan_qty,
            `Issued with Updated Bill #${existingSale.invoice_no}`
          );
        }
      }

      // Customer Ledger
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (customerId) {
        insertLedger.run(
          data.date || existingSale.date,
          'CUSTOMER',
          customerId,
          customerName,
          'SALE',
          id,
          existingSale.invoice_no,
          grandTotal,
          0.0,
          `Updated Bill #${existingSale.invoice_no}${deliveryVenue ? ' (Delivered: ' + deliveryVenue + ')' : ''}${advanceAdjusted > 0 ? ' [Advance: ₹' + advanceAdjusted + ']' : ''}`
        );

        if (currentPaid > 0) {
          insertLedger.run(
            data.date || existingSale.date,
            'CUSTOMER',
            customerId,
            customerName,
            'PAYMENT_RECEIVED',
            id,
            existingSale.invoice_no,
            0.0,
            currentPaid,
            `Receipt against Updated Bill #${existingSale.invoice_no} (${data.payment_mode || 'CASH'})`
          );
        }
      }

      if (currentPaid > 0) {
        const isCash = (data.payment_mode || 'CASH') === 'CASH';
        insertLedger.run(
          data.date || existingSale.date,
          isCash ? 'CASH' : 'BANK',
          1,
          isCash ? 'Counter Cash Drawer' : 'Bank Account',
          'PAYMENT_RECEIVED',
          id,
          existingSale.invoice_no,
          currentPaid,
          0.0,
          `Sale collection from ${customerName} (Bill #${existingSale.invoice_no})`
        );
      }

      const updated = this.getSaleById(id);
      return updated;
    });

    if (updated && updated.id) {
      try {
        autoInvoiceDispatchService.scheduleSaleInvoice(updated.id);
      } catch (err) {
        console.warn('Auto invoice reschedule notice:', err.message);
      }
    }
    return updated;
  },

  cancelSale(id, reason = 'Cancelled by user', username = 'Admin') {
    return runInTransaction((db) => {
      const sale = this.getSaleById(id);
      if (!sale) throw new Error('Sales invoice not found');
      if (sale.status === 'CANCELLED') throw new Error('Invoice is already cancelled');

      // 1. Restore stock of all sold items
      for (const item of (sale.items || [])) {
        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (CURRENT_DATE, 'FINISHED_PRODUCT', ?, ?, 'SALES_CANCEL_IN', ?, ?, ?, ?, ?, 'SALE_CANCEL', ?, ?, ?, ?)
          `).run(
            item.product_id,
            item.product_name,
            item.quantity,
            item.unit,
            item.quantity,
            item.rate,
            item.amount,
            sale.id,
            sale.invoice_no,
            `Stock restored on cancellation of Bill #${sale.invoice_no}`,
            username
          );
        }
      }

      // 2. Restore customer's advance balance if advance was deducted
      if (sale.customer_id && sale.advance_adjusted > 0) {
        db.prepare('UPDATE customers SET advance_balance = advance_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sale.advance_adjusted, sale.customer_id);
      }

      // 3. Mark vasan ledger as CANCELLED
      db.prepare(`UPDATE vasan_ledger SET status = 'CANCELLED', due_qty = 0, notes = notes || ' [Cancelled with Bill #' || ? || ']' WHERE sale_id = ?`).run(sale.invoice_no, sale.id);

      // 4. Reverse ledger entries
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (CURRENT_DATE, ?, ?, ?, 'CANCEL_REVERSAL', ?, ?, ?, ?, ?)
      `);

      if (sale.customer_id) {
        insertLedger.run(
          'CUSTOMER',
          sale.customer_id,
          sale.customer_name,
          sale.id,
          sale.invoice_no,
          0.0,
          sale.grand_total,
          `Credit reversal on cancellation of Bill #${sale.invoice_no} (${reason})`
        );

        if (sale.paid_amount > 0) {
          insertLedger.run(
            'CUSTOMER',
            sale.customer_id,
            sale.customer_name,
            sale.id,
            sale.invoice_no,
            sale.paid_amount,
            0.0,
            `Debit reversal for refunded payment on cancellation of Bill #${sale.invoice_no}`
          );
        }
      }

      // 5. Update Sale status to CANCELLED
      db.prepare(`UPDATE sales SET status = 'CANCELLED', notes = notes || ' [CANCELLED: ' || ? || ']', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(reason, id);

      // 6. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CANCEL', 'SALES', ?, ?)
      `).run(username, String(id), `Cancelled wholesale bill ${sale.invoice_no} (${reason})`);

      return this.getSaleById(id);
    });

    try {
      autoInvoiceDispatchService.cancelSchedule('SALE', id);
    } catch (err) {}

    return result;
  },

  deleteSale(id, username = 'Admin') {
    const result = runInTransaction((db) => {
      const sale = this.getSaleById(id);
      if (!sale) throw new Error('Sales invoice not found');

      // 1. Restore stock of all sold items
      for (const item of (sale.items || [])) {
        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
        }
      }

      // 2. Restore customer's advance balance if advance was deducted
      if (sale.customer_id && sale.advance_adjusted > 0) {
        db.prepare('UPDATE customers SET advance_balance = advance_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sale.advance_adjusted, sale.customer_id);
      }

      // 3. Remove all stock movements for this sale
      db.prepare("DELETE FROM stock_movements WHERE reference_type = 'SALE' AND reference_id = ?").run(id);

      // 4. Remove all vasan tracker entries for this sale
      db.prepare("DELETE FROM vasan_ledger WHERE sale_id = ?").run(id);

      // 5. Remove all ledger entries for this sale (both customer debit, cash/bank receipt, cancel reversal)
      db.prepare("DELETE FROM ledger_entries WHERE voucher_type IN ('SALE', 'PAYMENT_RECEIVED', 'CANCEL_REVERSAL', 'SALES_RETURN') AND voucher_id = ?").run(id);

      // 6. Delete linked sales returns if any
      const returnIds = db.prepare('SELECT id FROM sales_returns WHERE sale_id = ?').all(id).map(r => r.id);
      if (returnIds.length > 0) {
        const placeholders = returnIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM sales_return_items WHERE return_id IN (${placeholders})`).run(...returnIds);
        db.prepare(`DELETE FROM sales_returns WHERE id IN (${placeholders})`).run(...returnIds);
      }

      // 7. Unlink converted advance orders if any
      db.prepare("UPDATE advance_orders SET converted_sale_id = NULL, converted_invoice_no = NULL, status = 'PENDING' WHERE converted_sale_id = ?").run(id);

      // 8. Delete sale line items
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);

      // 9. Delete the sale record itself permanently (0 trace left!)
      db.prepare('DELETE FROM sales WHERE id = ?').run(id);

      // 10. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'DELETE', 'SALES', ?, ?)
      `).run(username, String(id), `Permanently deleted wholesale bill #${sale.invoice_no} (${sale.customer_name} - ₹${sale.grand_total})`);

      return { success: true, message: `Bill #${sale.invoice_no} has been permanently deleted from everywhere.` };
    });

    try {
      autoInvoiceDispatchService.cancelSchedule('SALE', id);
    } catch (err) {}

    return result;
  },

  // ----------------------------------------------------
  // SALES RETURN WITH AUTOMATIC VASAN CONTAINER RETURN
  // ----------------------------------------------------
  createSalesReturn(data, username = 'Cashier') {
    const created = runInTransaction((db) => {
      const sale = this.getSaleById(data.sale_id);
      if (!sale) throw new Error('Original sales bill not found');

      const count = db.prepare('SELECT COUNT(*) as count FROM sales_returns').get().count + 1;
      const returnNo = `SR/26-27/${String(count).padStart(3, '0')}`;
      const returnDate = data.date || new Date().toISOString().split('T')[0];

      let totalReturnAmount = 0.0;
      const returnItemsToSave = [];

      for (const item of (data.return_items || [])) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;
        const rate = Number(item.rate) || 0;
        const amt = qty * rate;
        totalReturnAmount += amt;

        returnItemsToSave.push({
          product_id: item.product_id,
          product_name: item.product_name || 'Sweet Item',
          quantity: qty,
          unit: item.unit || 'KG',
          rate,
          amount: amt
        });
      }

      const billedBy = data.billed_by || username || 'Cashier';

      // 1. Insert Sales Return Header
      const retRes = db.prepare(`
        INSERT INTO sales_returns (
          return_no, date, sale_id, invoice_no, customer_id, total_amount, refund_mode, reason, status, created_by, billed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        returnNo,
        returnDate,
        sale.id,
        sale.invoice_no,
        sale.customer_id,
        totalReturnAmount,
        data.refund_mode || 'CREDIT_NOTE',
        data.reason || 'Sweets & Vasan Return',
        username,
        billedBy
      );
      const returnId = retRes.lastInsertRowid;

      // 2. Insert Return Items & Restore Stock
      const insertRetItem = db.prepare(`
        INSERT INTO sales_return_items (return_id, product_id, quantity, unit, rate, gst_rate, amount)
        VALUES (?, ?, ?, ?, ?, 0.0, ?)
      `);

      for (const item of returnItemsToSave) {
        insertRetItem.run(returnId, item.product_id, item.quantity, item.unit, item.rate, item.amount);

        // Increase product stock
        db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);

        // Stock IN Movement
        db.prepare(`
          INSERT INTO stock_movements (
            movement_date, item_type, item_id, item_name, movement_type,
            quantity, unit, base_quantity, cost_rate, total_cost_value,
            reference_type, reference_id, reference_no, notes, created_by
          ) VALUES (?, 'FINISHED_PRODUCT', ?, ?, 'SALES_RETURN_IN', ?, ?, ?, ?, ?, 'SALES_RETURN', ?, ?, ?, ?)
        `).run(
          returnDate,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit,
          item.quantity,
          item.rate,
          item.amount,
          returnId,
          returnNo,
          `Sales return from ${sale.customer_name} (against Bill #${sale.invoice_no})`,
          username
        );
      }

      // 3. Process Returned Vasan Containers (e.g. 3 Choki, 2 Milton returned)
      const returnedVasanList = data.returned_vasan || [];
      const vasanReturnNotes = [];

      for (const vas of returnedVasanList) {
        const vasQty = Number(vas.returned_qty) || 0;
        if (vasQty <= 0) continue;

        // Find matching pending vasan entry for this sale
        let vasEntry = null;
        if (vas.vasan_ledger_id) {
          vasEntry = db.prepare('SELECT * FROM vasan_ledger WHERE id = ?').get(vas.vasan_ledger_id);
        } else {
          vasEntry = db.prepare('SELECT * FROM vasan_ledger WHERE sale_id = ? AND vasan_type = ? AND due_qty > 0 LIMIT 1').get(sale.id, vas.vasan_type);
        }

        if (vasEntry) {
          const newReturned = Number(vasEntry.returned_qty) + vasQty;
          const newDue = Math.max(0, Number(vasEntry.issued_qty) - newReturned);
          const newStatus = newDue === 0 ? 'RETURNED' : 'PARTIAL';

          db.prepare(`
            UPDATE vasan_ledger
            SET returned_qty = ?, due_qty = ?, status = ?, return_date = ?, notes = notes || ' [Returned ' || ? || ' via Return #' || ? || ']'
            WHERE id = ?
          `).run(newReturned, newDue, newStatus, returnDate, vasQty, returnNo, vasEntry.id);

          vasanReturnNotes.push(`${vasEntry.vasan_type}: ${vasQty}`);
        }
      }

      // 4. Reverse Customer Khata / Ledger
      if (sale.customer_id && totalReturnAmount > 0) {
        const insertLedger = db.prepare(`
          INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Credit customer to reduce their receivable Khata balance
        insertLedger.run(
          returnDate,
          'CUSTOMER',
          sale.customer_id,
          sale.customer_name,
          'SALES_RETURN',
          returnId,
          returnNo,
          0.0,
          totalReturnAmount,
          `Sales Return #${returnNo} (against Bill #${sale.invoice_no})${vasanReturnNotes.length ? ' | Vasan Returned: ' + vasanReturnNotes.join(', ') : ''}`
        );

        // If refund was paid out in cash
        if (data.refund_mode === 'CASH') {
          insertLedger.run(
            returnDate,
            'CUSTOMER',
            sale.customer_id,
            sale.customer_name,
            'PAYMENT_MADE',
            returnId,
            returnNo,
            totalReturnAmount,
            0.0,
            `Cash refund for Sales Return #${returnNo}`
          );

          insertLedger.run(
            returnDate,
            'CASH',
            1,
            'Cash Drawer',
            'PAYMENT_MADE',
            returnId,
            returnNo,
            0.0,
            totalReturnAmount,
            `Cash refund given to ${sale.customer_name}`
          );
        }
      }

      // 5. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'SALES_RETURN', ?, ?)
      `).run(username, String(returnId), `Created Sales Return ${returnNo} for ${sale.customer_name} (₹${totalReturnAmount}, Vasan: ${vasanReturnNotes.join(', ') || 'None'})`);

      return {
        success: true,
        id: returnId,
        return_id: returnId,
        return_no: returnNo,
        total_amount: totalReturnAmount,
        vasan_returned: vasanReturnNotes.join(', ')
      };
    });

    if (created && (created.id || created.return_id)) {
      try {
        autoInvoiceDispatchService.scheduleSaleReturnInvoice(created.id || created.return_id);
      } catch (err) {}
    }

    return created;
  },

  getSalesReturns(filters = {}) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sales_returns ORDER BY date DESC, id DESC').all();
  },

  // ----------------------------------------------------
  // VASAN YADI (વાસણ યાદી) & CHARGE MISSING VASAN TO CUSTOMER
  // ----------------------------------------------------
  getVasanYadi(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT 
        s.id as sale_id,
        s.invoice_no,
        s.date,
        s.customer_id,
        s.customer_name,
        s.customer_mobile,
        s.delivery_venue,
        s.delivery_address,
        s.driver_name,
        s.driver_mobile
      FROM sales s
      WHERE s.status = 'ACTIVE' AND s.id IN (SELECT DISTINCT sale_id FROM vasan_ledger)
    `;
    const params = [];

    if (filters.customer_id) {
      query += ' AND s.customer_id = ?';
      params.push(filters.customer_id);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND s.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY s.date DESC, s.id DESC';
    const salesWithVasan = db.prepare(query).all(...params);

    const getEntriesStmt = db.prepare('SELECT * FROM vasan_ledger WHERE sale_id = ?');

    let totalBills = salesWithVasan.length;
    let totalIssuedAll = 0;
    let totalReturnedAll = 0;
    let totalDueAll = 0;
    let totalRecoverableValueAll = 0;

    const yadi = salesWithVasan.map(s => {
      const entries = getEntriesStmt.all(s.sale_id);
      
      const containers = entries.map(e => {
        const rate = VASAN_DEFAULT_RATES[e.vasan_type] || 200.0;
        const dueQty = Number(e.due_qty) || 0;
        const missingAmount = dueQty * rate;

        totalIssuedAll += Number(e.issued_qty) || 0;
        totalReturnedAll += Number(e.returned_qty) || 0;
        totalDueAll += dueQty;
        totalRecoverableValueAll += missingAmount;

        return {
          id: e.id,
          item_name: e.item_name,
          vasan_type: e.vasan_type,
          issued_qty: Number(e.issued_qty),
          returned_qty: Number(e.returned_qty),
          due_qty: dueQty,
          status: e.status,
          rate,
          missing_amount: missingAmount,
          notes: e.notes
        };
      });

      const billDueCount = containers.reduce((sum, c) => sum + c.due_qty, 0);
      const billMissingValue = containers.reduce((sum, c) => sum + c.missing_amount, 0);

      return {
        ...s,
        containers,
        total_due_count: billDueCount,
        total_missing_value: billMissingValue,
        is_all_returned: billDueCount === 0
      };
    });

    return {
      yadi: filters.pending_only ? yadi.filter(y => !y.is_all_returned) : yadi,
      summary: {
        total_bills: totalBills,
        total_issued: totalIssuedAll,
        total_returned: totalReturnedAll,
        total_due: totalDueAll,
        total_recoverable_value: totalRecoverableValueAll,
        standard_rates: VASAN_DEFAULT_RATES
      }
    };
  },

  chargeMissingVasanToCustomer(data, username = 'Admin') {
    return runInTransaction((db) => {
      const sale = this.getSaleById(data.sale_id);
      if (!sale) throw new Error('Sales bill not found');
      if (!sale.customer_id) throw new Error('Cannot charge missing Vasan to anonymous cash customer. Please select a customer with an active Khata.');

      const itemsToCharge = data.items || [];
      if (!itemsToCharge.length) throw new Error('No missing Vasan items specified to charge');

      let totalChargeAmount = 0.0;
      const chargeDescriptions = [];

      for (const item of itemsToCharge) {
        const entry = db.prepare('SELECT * FROM vasan_ledger WHERE id = ?').get(item.id);
        if (!entry) continue;

        const qty = Number(item.missing_qty) || entry.due_qty;
        const rate = Number(item.rate) || (VASAN_DEFAULT_RATES[entry.vasan_type] || 200.0);
        const lineCharge = qty * rate;
        totalChargeAmount += lineCharge;

        chargeDescriptions.push(`${qty}x ${entry.vasan_type} (@₹${rate}) = ₹${lineCharge}`);

        // Update Vasan ledger entry to mark as charged
        db.prepare(`
          UPDATE vasan_ledger
          SET due_qty = 0, status = 'CHARGED_TO_CUSTOMER', notes = notes || ' [CHARGED TO CUSTOMER: ₹' || ? || ']'
          WHERE id = ?
        `).run(lineCharge, entry.id);
      }

      if (totalChargeAmount <= 0) throw new Error('Invalid charge amount');

      // Post debit entry to customer ledger Khata
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (CURRENT_DATE, 'CUSTOMER', ?, ?, 'VASAN_CHARGE', ?, ?, ?, 0.0, ?)
      `);

      const voucherNo = `VASAN-CHG-${sale.invoice_no}`;
      insertLedger.run(
        sale.customer_id,
        sale.customer_name,
        sale.id,
        voucherNo,
        totalChargeAmount,
        `Missing / Unreturned Vasan Replacement Charge for Bill #${sale.invoice_no} (${chargeDescriptions.join(', ')})`
      );

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'VASAN_CHARGE', ?, ?)
      `).run(username, String(sale.id), `Charged ₹${totalChargeAmount} for unreturned Vasan to ${sale.customer_name} on Bill ${sale.invoice_no}`);

      return {
        success: true,
        sale_id: sale.id,
        customer_name: sale.customer_name,
        total_charged: totalChargeAmount,
        breakdown: chargeDescriptions.join(', ')
      };
    });
  },

  // ----------------------------------------------------
  // RICKSHAW DRIVERS & DELIVERY LOCATIONS MASTER
  // ----------------------------------------------------
  getDrivers() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM drivers WHERE active = 1 ORDER BY is_default DESC, is_personal DESC, name ASC').all();
  },

  setDefaultDriver(driverId) {
    const db = getDatabase();
    db.exec('UPDATE drivers SET is_default = 0');
    db.prepare('UPDATE drivers SET is_default = 1 WHERE id = ?').run(Number(driverId));
    return db.prepare('SELECT * FROM drivers WHERE id = ?').get(Number(driverId));
  },

  createDriver(data) {
    const db = getDatabase();
    const isDefault = data.is_default ? 1 : 0;
    if (isDefault) {
      db.exec('UPDATE drivers SET is_default = 0');
    }
    const res = db.prepare(`
      INSERT INTO drivers (name, mobile, vehicle_no, default_rent, is_default, is_personal, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      data.name,
      data.mobile || '',
      data.vehicle_no || '',
      Number(data.default_rent) || 0.0,
      isDefault,
      data.is_personal ? 1 : 0
    );
    return db.prepare('SELECT * FROM drivers WHERE id = ?').get(res.lastInsertRowid);
  },

  // ----------------------------------------------------
  // AREA DELIVERY & RICKSHAW RATE MASTER (એરિયા મુજબ રેટ)
  // ----------------------------------------------------
  getAreaDeliveryRates() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM area_delivery_rates WHERE active = 1 ORDER BY area_name ASC').all();
  },

  createAreaDeliveryRate(data) {
    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO area_delivery_rates (area_name, customer_charge, driver_rent, notes, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      data.area_name?.trim(),
      Number(data.customer_charge) || 0.0,
      Number(data.driver_rent) || 0.0,
      data.notes || ''
    );
    return db.prepare('SELECT * FROM area_delivery_rates WHERE id = ?').get(res.lastInsertRowid);
  },

  updateAreaDeliveryRate(id, data) {
    const db = getDatabase();
    db.prepare(`
      UPDATE area_delivery_rates 
      SET area_name = ?, customer_charge = ?, driver_rent = ?, notes = ?
      WHERE id = ?
    `).run(
      data.area_name?.trim(),
      Number(data.customer_charge) || 0.0,
      Number(data.driver_rent) || 0.0,
      data.notes || '',
      Number(id)
    );
    return db.prepare('SELECT * FROM area_delivery_rates WHERE id = ?').get(Number(id));
  },

  deleteAreaDeliveryRate(id) {
    const db = getDatabase();
    db.prepare('UPDATE area_delivery_rates SET active = 0 WHERE id = ?').run(Number(id));
    return { success: true, id: Number(id) };
  },

  getDeliveryLocations() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM delivery_locations WHERE active = 1 ORDER BY venue_name ASC').all();
  },

  createDeliveryLocation(data) {
    const db = getDatabase();
    const mapLink = data.google_map_link || (data.venue_name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.venue_name + ', ' + (data.area_landmark || '') + ', Surat')}` : '');
    const res = db.prepare(`
      INSERT INTO delivery_locations (venue_name, address, area_landmark, customer_charge, driver_rent, contact_person, contact_mobile, google_map_link, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      data.venue_name,
      data.address,
      data.area_landmark || '',
      Number(data.customer_charge) || 0.0,
      Number(data.driver_rent) || 0.0,
      data.contact_person || '',
      data.contact_mobile || '',
      mapLink
    );
    return db.prepare('SELECT * FROM delivery_locations WHERE id = ?').get(res.lastInsertRowid);
  },

  updateDeliveryLocation(id, data) {
    const db = getDatabase();
    const mapLink = data.google_map_link !== undefined ? data.google_map_link : (data.venue_name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.venue_name + ', ' + (data.area_landmark || '') + ', Surat')}` : '');
    db.prepare(`
      UPDATE delivery_locations 
      SET venue_name = ?, address = ?, area_landmark = ?, customer_charge = ?, driver_rent = ?, contact_person = ?, contact_mobile = ?, google_map_link = ?
      WHERE id = ?
    `).run(
      data.venue_name,
      data.address,
      data.area_landmark || '',
      Number(data.customer_charge) || 0.0,
      Number(data.driver_rent) || 0.0,
      data.contact_person || '',
      data.contact_mobile || '',
      mapLink,
      Number(id)
    );
    return db.prepare('SELECT * FROM delivery_locations WHERE id = ?').get(Number(id));
  },

  deleteDeliveryLocation(id) {
    const db = getDatabase();
    db.prepare('UPDATE delivery_locations SET active = 0 WHERE id = ?').run(Number(id));
    return { success: true, id: Number(id) };
  },

  // ----------------------------------------------------
  // RICKSHAW DRIVER DELIVERY & RENT "HISAB" REPORT
  // ----------------------------------------------------
  getDriverTripsReport(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT 
        s.id as sale_id,
        s.date,
        s.invoice_no,
        s.customer_name,
        s.customer_mobile,
        s.delivery_venue,
        s.delivery_address,
        s.driver_id,
        s.driver_name,
        s.driver_mobile,
        s.rickshaw_rent,
        s.rickshaw_rent_status,
        s.vasan_summary,
        s.grand_total,
        s.status,
        COALESCE(s.trip_type, 'ROUND_TRIP') as trip_type
      FROM sales s
      WHERE s.status = 'ACTIVE' AND (s.driver_id IS NOT NULL OR s.driver_name != '')
    `;
    const params = [];

    if (filters.driver_id) {
      query += ' AND s.driver_id = ?';
      params.push(filters.driver_id);
    }
    if (filters.rent_status) {
      query += ' AND s.rickshaw_rent_status = ?';
      params.push(filters.rent_status);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND s.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY s.date DESC, s.id DESC';
    const trips = db.prepare(query).all(...params);

    const totalRent = trips.reduce((sum, t) => sum + Number(t.rickshaw_rent || 0), 0);
    const pendingRent = trips.filter(t => t.rickshaw_rent_status === 'PENDING').reduce((sum, t) => sum + Number(t.rickshaw_rent || 0), 0);
    const paidRent = trips.filter(t => t.rickshaw_rent_status === 'PAID').reduce((sum, t) => sum + Number(t.rickshaw_rent || 0), 0);

    return {
      trips,
      summary: {
        total_trips: trips.length,
        total_rent: totalRent,
        pending_rent: pendingRent,
        paid_rent: paidRent
      }
    };
  },

  settleDriverRent(saleIds = []) {
    const db = getDatabase();
    if (!saleIds.length) return { updated: 0 };
    const placeholders = saleIds.map(() => '?').join(',');
    const res = db.prepare(`UPDATE sales SET rickshaw_rent_status = 'PAID' WHERE id IN (${placeholders})`).run(...saleIds);
    return { updated: res.changes };
  },

  // ----------------------------------------------------
  // VASAN (CONTAINER / MILTON / CHOKI) TRACKING LEDGER
  // ----------------------------------------------------
  getVasanLedger(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT v.*, s.invoice_no, s.delivery_venue, s.delivery_address
      FROM vasan_ledger v
      LEFT JOIN sales s ON v.sale_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.customer_id) {
      query += ' AND v.customer_id = ?';
      params.push(filters.customer_id);
    }
    if (filters.driver_id) {
      query += ' AND v.driver_id = ?';
      params.push(filters.driver_id);
    }
    if (filters.vasan_type) {
      query += ' AND v.vasan_type = ?';
      params.push(filters.vasan_type);
    }
    if (filters.status) {
      query += ' AND v.status = ?';
      params.push(filters.status);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND v.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY v.date DESC, v.id DESC';
    const entries = db.prepare(query).all(...params);

    const totalIssued = entries.reduce((sum, e) => sum + Number(e.issued_qty || 0), 0);
    const totalReturned = entries.reduce((sum, e) => sum + Number(e.returned_qty || 0), 0);
    const totalDue = entries.reduce((sum, e) => sum + Number(e.due_qty || 0), 0);

    return {
      entries,
      summary: {
        total_records: entries.length,
        total_issued: totalIssued,
        total_returned: totalReturned,
        total_due: totalDue
      }
    };
  },

  returnVasan(id, returnedQty, notes = '') {
    const db = getDatabase();
    const entry = db.prepare('SELECT * FROM vasan_ledger WHERE id = ?').get(id);
    if (!entry) throw new Error('Vasan ledger entry not found');

    const newReturned = Number(entry.returned_qty) + Number(returnedQty);
    const newDue = Math.max(0, Number(entry.issued_qty) - newReturned);
    const newStatus = newDue === 0 ? 'RETURNED' : 'PARTIAL';

    db.prepare(`
      UPDATE vasan_ledger
      SET returned_qty = ?, due_qty = ?, status = ?, return_date = CURRENT_DATE, notes = notes || ' [' || ? || ']'
      WHERE id = ?
    `).run(newReturned, newDue, newStatus, notes || `Returned ${returnedQty} ${entry.vasan_type}`, id);

    return db.prepare('SELECT * FROM vasan_ledger WHERE id = ?').get(id);
  }
};
