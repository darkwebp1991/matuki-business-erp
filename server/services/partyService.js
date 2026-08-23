import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';

export const partyService = {
  // Auto-sync missing parties to customers master list
  ensureCustomerExists(name, mobile = '') {
    if (!name) return null;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === 'Walk-in Caterer' || trimmedName === 'Cash Walk-in Customer') {
      return null;
    }

    const db = getDatabase();

    // 1. Check if exists in customers table (case-insensitive)
    const existingCust = db.prepare('SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(trimmedName);
    if (existingCust) return existingCust.id;

    // 2. Check if exists in suppliers table to grab mobile if needed
    let finalMobile = (mobile || '').trim();
    if (!finalMobile) {
      const existingSupp = db.prepare('SELECT mobile FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(trimmedName);
      if (existingSupp && existingSupp.mobile) {
        finalMobile = existingSupp.mobile;
      }
    }

    // 3. Auto-create customer in customers master table!
    try {
      const trimmedMobile = (finalMobile || '').trim();

      const maxRow = db.prepare("SELECT MAX(id) as max_id FROM customers").get();
      const nextId = (maxRow?.max_id || 800) + 1;
      let custNo = `CUST-${nextId}`;

      const dupCheck = db.prepare("SELECT id FROM customers WHERE customer_no = ?").get(custNo);
      if (dupCheck) {
        custNo = `CUST-${nextId}-${Math.floor(Math.random() * 1000)}`;
      }

      const insertStmt = db.prepare(`
        INSERT INTO customers (customer_no, name, mobile, address, opening_balance, active)
        VALUES (?, ?, ?, '', 0, 1)
      `);
      const res = insertStmt.run(custNo, trimmedName, trimmedMobile);
      const newId = Number(res.lastInsertRowid);
      console.log(`[Auto-Sync] Auto-created missing customer "${trimmedName}" (${custNo}) in Customers Master List (ID: ${newId})`);
      return newId;
    } catch (err) {
      console.error('Error auto-creating customer:', err);
      return null;
    }
  },

  autoSyncAllMissingParties() {
    const db = getDatabase();
    try {
      // 1. Sync missing parties from advance_orders & sales into customers master table
      const query1 = `
        SELECT DISTINCT party_name, party_mobile FROM (
          SELECT customer_name as party_name, customer_mobile as party_mobile FROM advance_orders WHERE customer_name IS NOT NULL AND TRIM(customer_name) != '' AND customer_name != 'Walk-in Caterer' AND customer_name != 'Cash Walk-in Customer'
          UNION
          SELECT customer_name as party_name, customer_mobile as party_mobile FROM sales WHERE customer_name IS NOT NULL AND TRIM(customer_name) != '' AND customer_name != 'Cash Walk-in Customer'
        )
        WHERE LOWER(TRIM(party_name)) NOT IN (SELECT LOWER(TRIM(name)) FROM customers)
      `;
      const missing1 = db.prepare(query1).all();
      for (const row of missing1) {
        const newCustId = partyService.ensureCustomerExists(row.party_name, row.party_mobile);
        if (newCustId) {
          db.prepare('UPDATE advance_orders SET customer_id = ? WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?)) AND (customer_id IS NULL OR customer_id = 0)').run(newCustId, row.party_name);
          db.prepare('UPDATE sales SET customer_id = ? WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?)) AND (customer_id IS NULL OR customer_id = 0)').run(newCustId, row.party_name);
        }
      }

      // 2. Sync suppliers who have sales or advance orders into customers table
      const query2 = `
        SELECT s.id, s.name, s.mobile
        FROM suppliers s
        WHERE LOWER(TRIM(s.name)) NOT IN (SELECT LOWER(TRIM(name)) FROM customers)
          AND (
            EXISTS (SELECT 1 FROM sales WHERE customer_id = s.id OR LOWER(TRIM(customer_name)) = LOWER(TRIM(s.name)))
            OR EXISTS (SELECT 1 FROM advance_orders WHERE customer_id = s.id OR LOWER(TRIM(customer_name)) = LOWER(TRIM(s.name)))
          )
      `;
      const missingSuppliers = db.prepare(query2).all();
      for (const s of missingSuppliers) {
        const newCustId = partyService.ensureCustomerExists(s.name, s.mobile);
        if (newCustId) {
          db.prepare('UPDATE sales SET customer_id = ? WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?)) OR customer_id = ?').run(newCustId, s.name, s.id);
          db.prepare('UPDATE advance_orders SET customer_id = ? WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?)) OR customer_id = ?').run(newCustId, s.name, s.id);
        }
      }
    } catch (err) {
      console.error('Error in autoSyncAllMissingParties:', err);
    }
  },

  // --- CUSTOMERS ---
  getCustomers(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT c.*,
        (COALESCE(c.opening_balance, 0)
          + COALESCE((SELECT SUM(grand_total) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND status != 'CANCELLED'), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'CUSTOMER' AND (party_id = c.id OR party_name = c.name)), 0)
          - COALESCE((SELECT SUM(total_amount) FROM sales_returns WHERE customer_id = c.id AND status != 'CANCELLED'), 0)
          + COALESCE((SELECT SUM(debit_amount - credit_amount) FROM ledger_entries WHERE party_type = 'CUSTOMER' AND (party_id = c.id OR party_name = c.name) AND voucher_type NOT IN ('SALE', 'PAYMENT_IN', 'CREDIT_NOTE', 'OPENING_BALANCE')), 0)
        ) as current_balance,
        (SELECT COUNT(*) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND status != 'CANCELLED') as total_invoices,
        (SELECT COALESCE(SUM(grand_total), 0) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND status != 'CANCELLED') as total_sales_amount,
        (SELECT MAX(payment_date) FROM payments WHERE party_type = 'CUSTOMER' AND (party_id = c.id OR party_name = c.name)) as last_payment_date,
        (SELECT MAX(date) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND status != 'CANCELLED') as last_sale_date,
        (SELECT MIN(date) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND due_amount > 0 AND status != 'CANCELLED') as oldest_unpaid_sale_date,
        (SELECT COALESCE(SUM(due_amount), 0) FROM sales WHERE (customer_id = c.id OR customer_name = c.name) AND due_amount > 0 AND status != 'CANCELLED' AND date <= date('now', '-30 days')) as unpaid_30d_amount
      FROM customers c
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (c.name LIKE ? OR c.mobile LIKE ? OR c.customer_no LIKE ? OR c.city LIKE ? OR c.address LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.active !== undefined) {
      query += ' AND c.active = ?';
      params.push(filters.active ? 1 : 0);
    }

    query += ' ORDER BY c.name ASC';
    const rows = db.prepare(query).all(...params);

    const now = new Date();
    const todayMs = now.getTime();

    return rows.map(c => {
      const curBal = Number(c.current_balance || 0);
      let riskZone = 'GREEN';
      let daysSinceLastPay = null;
      let daysOverdue = 0;
      let riskReason = 'Healthy account / Balance cleared';
      let strictFollowup = false;

      if (c.last_payment_date) {
        const payDate = new Date(c.last_payment_date);
        daysSinceLastPay = Math.max(0, Math.floor((todayMs - payDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      if (curBal > 0) {
        if (c.oldest_unpaid_sale_date) {
          const oldestSale = new Date(c.oldest_unpaid_sale_date);
          daysOverdue = Math.max(0, Math.floor((todayMs - oldestSale.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (c.last_sale_date) {
          const lastSale = new Date(c.last_sale_date);
          daysOverdue = Math.max(0, Math.floor((todayMs - lastSale.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (daysSinceLastPay !== null) {
          daysOverdue = daysSinceLastPay;
        } else {
          daysOverdue = 35; // opening balance default
        }

        if (daysOverdue >= 30 || (daysSinceLastPay !== null && daysSinceLastPay >= 30) || Number(c.unpaid_30d_amount) > 0) {
          riskZone = 'RED';
          strictFollowup = true;
          riskReason = `30+ Days Overdue (${daysOverdue}d) with ₹${Math.round(curBal).toLocaleString('en-IN')} pending! Strict follow-up required.`;
        } else if (daysOverdue >= 15 || (daysSinceLastPay !== null && daysSinceLastPay >= 15)) {
          riskZone = 'YELLOW';
          riskReason = `Aging 15-30 Days (${daysOverdue}d). Pending: ₹${Math.round(curBal).toLocaleString('en-IN')}. Follow-up due.`;
        } else {
          riskZone = 'GREEN';
          riskReason = `Active / Recent Credit (${daysOverdue}d). Safe terms.`;
        }
      } else if (curBal < 0) {
        riskZone = 'GREEN';
        riskReason = `Advance deposit held: ₹${Math.round(Math.abs(curBal)).toLocaleString('en-IN')}`;
      }

      return {
        ...c,
        current_balance: curBal,
        risk_zone: riskZone,
        days_since_last_payment: daysSinceLastPay,
        days_overdue: daysOverdue,
        risk_reason: riskReason,
        strict_followup_needed: strictFollowup
      };
    });
  },

  getCustomerById(id) {
    const db = getDatabase();
    const customer = db.prepare(`
      SELECT c.*,
        (COALESCE(c.opening_balance, 0)
          + COALESCE((SELECT SUM(grand_total) FROM sales WHERE customer_id = c.id AND status = 'ACTIVE'), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'CUSTOMER' AND party_id = c.id), 0)
          + COALESCE((SELECT SUM(debit_amount - credit_amount) FROM ledger_entries WHERE party_type = 'CUSTOMER' AND (party_id = c.id OR party_name = c.name) AND voucher_type NOT IN ('SALE', 'PAYMENT_IN', 'OPENING_BALANCE', 'RECEIPT')), 0)
        ) as current_balance,
        (SELECT COUNT(*) FROM sales WHERE customer_id = c.id AND status != 'CANCELLED') as total_invoices,
        (SELECT COALESCE(SUM(grand_total), 0) FROM sales WHERE customer_id = c.id AND status != 'CANCELLED') as total_sales_amount,
        (SELECT MAX(payment_date) FROM payments WHERE party_type = 'CUSTOMER' AND party_id = c.id) as last_payment_date,
        (SELECT MAX(date) FROM sales WHERE customer_id = c.id AND status != 'CANCELLED') as last_sale_date,
        (SELECT MIN(date) FROM sales WHERE customer_id = c.id AND due_amount > 0 AND status != 'CANCELLED') as oldest_unpaid_sale_date,
        (SELECT COALESCE(SUM(due_amount), 0) FROM sales WHERE customer_id = c.id AND due_amount > 0 AND status != 'CANCELLED' AND date <= date('now', '-30 days')) as unpaid_30d_amount
      FROM customers c
      WHERE c.id = ?
    `).get(id);

    if (!customer) return null;

    // Sales history
    const sales = db.prepare(`
      SELECT * FROM sales WHERE customer_id = ? ORDER BY date DESC, id DESC LIMIT 50
    `).all(id);

    // Payments history
    const payments = db.prepare(`
      SELECT * FROM payments WHERE party_type = 'CUSTOMER' AND party_id = ? ORDER BY payment_date DESC, id DESC LIMIT 50
    `).all(id);

    const now = new Date();
    const todayMs = now.getTime();
    const curBal = Number(customer.current_balance || 0);
    let riskZone = 'GREEN';
    let daysSinceLastPay = null;
    let daysOverdue = 0;
    let riskReason = 'Healthy account / Balance cleared';
    let strictFollowup = false;

    if (customer.last_payment_date) {
      const payDate = new Date(customer.last_payment_date);
      daysSinceLastPay = Math.max(0, Math.floor((todayMs - payDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    if (curBal > 0) {
      if (customer.oldest_unpaid_sale_date) {
        const oldestSale = new Date(customer.oldest_unpaid_sale_date);
        daysOverdue = Math.max(0, Math.floor((todayMs - oldestSale.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (customer.last_sale_date) {
        const lastSale = new Date(customer.last_sale_date);
        daysOverdue = Math.max(0, Math.floor((todayMs - lastSale.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (daysSinceLastPay !== null) {
        daysOverdue = daysSinceLastPay;
      } else {
        daysOverdue = 35;
      }

      if (daysOverdue >= 30 || (daysSinceLastPay !== null && daysSinceLastPay >= 30) || Number(customer.unpaid_30d_amount) > 0) {
        riskZone = 'RED';
        strictFollowup = true;
        riskReason = `30+ Days Overdue (${daysOverdue}d) with ₹${Math.round(curBal).toLocaleString('en-IN')} pending! Strict follow-up required.`;
      } else if (daysOverdue >= 15 || (daysSinceLastPay !== null && daysSinceLastPay >= 15)) {
        riskZone = 'YELLOW';
        riskReason = `Aging 15-30 Days (${daysOverdue}d). Pending: ₹${Math.round(curBal).toLocaleString('en-IN')}. Follow-up due.`;
      } else {
        riskZone = 'GREEN';
        riskReason = `Active / Recent Credit (${daysOverdue}d). Safe terms.`;
      }
    } else if (curBal < 0) {
      riskZone = 'GREEN';
      riskReason = `Advance deposit held: ₹${Math.round(Math.abs(curBal)).toLocaleString('en-IN')}`;
    }

    return {
      ...customer,
      sales,
      payments,
      current_balance: curBal,
      risk_zone: riskZone,
      days_since_last_payment: daysSinceLastPay,
      days_overdue: daysOverdue,
      risk_reason: riskReason,
      strict_followup_needed: strictFollowup
    };
  },

  getCustomerSmartRecommendations(id) {
    const db = getDatabase();
    const cId = Number(id);
    if (!cId) return { frequentVenues: [], frequentProducts: [] };

    const cust = db.prepare('SELECT name FROM customers WHERE id = ?').get(cId);
    const cName = cust ? cust.name : '';

    // 1. Most Frequently & Recently Used Delivery Venues for this Customer
    let frequentVenues = [];
    try {
      const venuesQuery = `
        SELECT delivery_venue as venue_name, COUNT(*) as usage_count, MAX(last_used) as last_used_date FROM (
          SELECT delivery_venue, created_at as last_used FROM advance_orders WHERE (customer_id = ? OR (customer_name = ? AND ? != '')) AND delivery_venue != '' AND delivery_venue IS NOT NULL
          UNION ALL
          SELECT delivery_venue, date as last_used FROM sales WHERE (customer_id = ? OR (customer_name = ? AND ? != '')) AND delivery_venue != '' AND delivery_venue IS NOT NULL
        )
        GROUP BY delivery_venue
        ORDER BY usage_count DESC, last_used_date DESC
        LIMIT 5
      `;
      const rawVenues = db.prepare(venuesQuery).all(cId, cName, cName, cId, cName, cName);
      
      const getLocStmt = db.prepare('SELECT * FROM delivery_locations WHERE LOWER(venue_name) = LOWER(?) OR LOWER(venue_name) LIKE LOWER(?) LIMIT 1');
      frequentVenues = rawVenues.map(v => {
        const locMatch = getLocStmt.get(v.venue_name, `%${v.venue_name}%`);
        return {
          venue_name: v.venue_name,
          usage_count: v.usage_count,
          address: locMatch?.address || '',
          area_landmark: locMatch?.area_landmark || '',
          customer_charge: locMatch?.customer_charge || 0,
          driver_rent: locMatch?.driver_rent || 0
        };
      });
    } catch (err) {
      console.error('Error fetching frequent venues:', err);
    }

    // 2. Most Frequently & Recently Ordered Products for this Customer
    let frequentProducts = [];
    try {
      const productsQuery = `
        SELECT 
          product_id, 
          item_name, 
          COUNT(*) as order_count, 
          SUM(quantity) as total_qty
        FROM (
          SELECT aoi.product_id, aoi.item_name as item_name, aoi.quantity 
          FROM advance_order_items aoi
          JOIN advance_orders ao ON aoi.order_id = ao.id
          WHERE (ao.customer_id = ? OR (ao.customer_name = ? AND ? != ''))

          UNION ALL

          SELECT si.product_id, si.product_name as item_name, si.quantity
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE (s.customer_id = ? OR (s.customer_name = ? AND ? != ''))
        )
        WHERE item_name IS NOT NULL AND item_name != ''
        GROUP BY product_id, item_name
        ORDER BY order_count DESC, total_qty DESC
        LIMIT 8
      `;
      const rawProducts = db.prepare(productsQuery).all(cId, cName, cName, cId, cName, cName);

      const getProdStmt = db.prepare('SELECT selling_rate, unit, code FROM products WHERE id = ?');
      const getProdByNameStmt = db.prepare('SELECT id, selling_rate, unit, code FROM products WHERE LOWER(name) = LOWER(?) LIMIT 1');

      frequentProducts = rawProducts.map(p => {
        let pInfo = p.product_id ? getProdStmt.get(p.product_id) : null;
        let finalProdId = p.product_id;
        if (!pInfo) {
          const matchByName = getProdByNameStmt.get(p.item_name);
          if (matchByName) {
            pInfo = matchByName;
            finalProdId = matchByName.id;
          }
        }
        return {
          product_id: finalProdId || null,
          item_name: p.item_name,
          order_count: p.order_count,
          total_qty: p.total_qty,
          unit: pInfo?.unit || 'KG',
          rate: pInfo?.selling_rate || 0,
          code: pInfo?.code || ''
        };
      });
    } catch (err) {
      console.error('Error fetching frequent products:', err);
    }

    // 3. Most Frequently Used Rickshaw Driver for this Customer
    let frequentDriver = null;
    try {
      const driverQuery = `
        SELECT driver_id, COUNT(*) as usage_count FROM (
          SELECT driver_id FROM sales WHERE (customer_id = ? OR (customer_name = ? AND ? != '')) AND driver_id IS NOT NULL AND driver_id != 0
          UNION ALL
          SELECT driver_id FROM advance_orders WHERE (customer_id = ? OR (customer_name = ? AND ? != '')) AND driver_id IS NOT NULL AND driver_id != 0
        )
        GROUP BY driver_id
        ORDER BY usage_count DESC
        LIMIT 1
      `;
      const topDrv = db.prepare(driverQuery).get(cId, cName, cName, cId, cName, cName);
      if (topDrv && topDrv.driver_id) {
        const drvInfo = db.prepare('SELECT id, name, mobile FROM drivers WHERE id = ?').get(topDrv.driver_id);
        if (drvInfo) {
          frequentDriver = {
            id: drvInfo.id,
            name: drvInfo.name,
            mobile: drvInfo.mobile,
            usage_count: topDrv.usage_count
          };
        }
      }
    } catch (err) {
      console.error('Error fetching frequent driver:', err);
    }

    // 4. Product Vasan Preferences Memory
    let productVasanMap = {};
    try {
      const vasanQuery = `
        SELECT product_id, item_name, vasan_type, COUNT(*) as cnt FROM (
          SELECT product_id, product_name as item_name, vasan_type FROM sale_items WHERE vasan_type IS NOT NULL AND vasan_type != 'NONE' AND vasan_type != ''
          UNION ALL
          SELECT product_id, item_name, vasan_type FROM advance_order_items WHERE vasan_type IS NOT NULL AND vasan_type != 'NONE' AND vasan_type != ''
        )
        GROUP BY product_id, item_name, vasan_type
        ORDER BY cnt DESC
      `;
      const vasanRows = db.prepare(vasanQuery).all();
      for (const row of vasanRows) {
        if (row.product_id && !productVasanMap[row.product_id]) {
          productVasanMap[row.product_id] = row.vasan_type;
        }
        if (row.item_name && !productVasanMap[row.item_name.toLowerCase().trim()]) {
          productVasanMap[row.item_name.toLowerCase().trim()] = row.vasan_type;
        }
      }
    } catch (err) {
      console.error('Error fetching product vasan map:', err);
    }

    return {
      frequentVenues,
      frequentProducts,
      frequentDriver,
      productVasanMap
    };
  },

  createCustomer(data, username = 'Admin') {
    return runInTransaction((db) => {
      const trimmedName = (data.name || '').trim();
      const trimmedMobile = (data.mobile || '').trim();

      if (!trimmedName) {
        throw new Error('Customer / Party name is required.');
      }

      // Check duplicate name
      const existingByName = db.prepare('SELECT id, customer_no, name, mobile FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)').get(trimmedName);
      if (existingByName) {
        throw new Error(`A customer with name "${trimmedName}" already exists (${existingByName.customer_no})! Duplicate names are not allowed.`);
      }

      // Check duplicate mobile (if mobile is provided)
      if (trimmedMobile && trimmedMobile.replace(/\D/g, '').length >= 7) {
        const existingByMobile = db.prepare('SELECT id, customer_no, name, mobile FROM customers WHERE mobile = ? AND mobile != \'\'').get(trimmedMobile);
        if (existingByMobile) {
          throw new Error(`Mobile number "${trimmedMobile}" is already registered to "${existingByMobile.name}" (${existingByMobile.customer_no})! Duplicate mobile numbers are not allowed.`);
        }
      }

      let no = data.customer_no;
      if (!no) {
        const count = db.prepare('SELECT COUNT(*) as count FROM customers').get().count + 1;
        no = `CUST-${String(count).padStart(3, '0')}`;
      }

      const advanceAmount = Number(data.advance_amount || data.advance_balance) || 0.0;
      const openingBalance = Number(data.opening_balance) || 0.0;

      const result = db.prepare(`
        INSERT INTO customers (
          customer_no, name, mobile, email, address, city, gstin,
          opening_balance, advance_balance, credit_limit, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        no,
        trimmedName,
        trimmedMobile,
        (data.email || '').trim(),
        (data.address || '').trim(),
        (data.city || '').trim(),
        (data.gstin || '').trim().toUpperCase(),
        openingBalance,
        advanceAmount,
        Number(data.credit_limit) || 50000.0,
        (data.notes || '').trim(),
        data.active !== undefined ? (data.active ? 1 : 0) : 1
      );

      const newId = result.lastInsertRowid;

      // If opening balance != 0, record in ledger
      if (openingBalance !== 0) {
        db.prepare(`
          INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
          VALUES (CURRENT_DATE, 'CUSTOMER', ?, ?, 'OPENING_BALANCE', 0, 'INIT', ?, ?, 'Customer Opening Balance')
        `).run(
          newId,
          trimmedName,
          openingBalance > 0 ? openingBalance : 0.0,
          openingBalance < 0 ? Math.abs(openingBalance) : 0.0
        );
      }

      // If advance amount > 0, record in ledger as Advance Booking Deposit (Credit)
      if (advanceAmount > 0) {
        db.prepare(`
          INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
          VALUES (CURRENT_DATE, 'CUSTOMER', ?, ?, 'RECEIPT', 0, 'ADV-INIT', 0.0, ?, 'Order Booking Advance Deposit')
        `).run(
          newId,
          trimmedName,
          advanceAmount
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'CUSTOMERS', ?, ?)
      `).run(username, String(newId), `Created customer ${trimmedName} (${no}) with advance ₹${advanceAmount}`);

      return this.getCustomerById(newId);
    });
  },

  updateCustomer(id, data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getCustomerById(id);
    if (!existing) throw new Error('Customer not found');

    const trimmedName = data.name !== undefined ? data.name.trim() : existing.name;
    const trimmedMobile = data.mobile !== undefined ? data.mobile.trim() : existing.mobile;

    if (!trimmedName) {
      throw new Error('Customer name cannot be empty.');
    }

    // Check duplicate name with other records
    if (trimmedName && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupName = db.prepare('SELECT id, customer_no, name FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?').get(trimmedName, id);
      if (dupName) {
        throw new Error(`Another customer with name "${trimmedName}" already exists (${dupName.customer_no})!`);
      }
    }

    // Check duplicate mobile with other records
    if (trimmedMobile && trimmedMobile !== existing.mobile && trimmedMobile.replace(/\D/g, '').length >= 7) {
      const dupMobile = db.prepare('SELECT id, customer_no, name FROM customers WHERE mobile = ? AND mobile != \'\' AND id != ?').get(trimmedMobile, id);
      if (dupMobile) {
        throw new Error(`Mobile number "${trimmedMobile}" is already registered to "${dupMobile.name}" (${dupMobile.customer_no})!`);
      }
    }

    db.prepare(`
      UPDATE customers SET
        customer_no = ?,
        name = ?,
        mobile = ?,
        email = ?,
        address = ?,
        city = ?,
        gstin = ?,
        credit_limit = ?,
        notes = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.customer_no ?? existing.customer_no,
      trimmedName,
      trimmedMobile,
      data.email ?? existing.email ?? '',
      data.address ?? existing.address,
      data.city ?? existing.city ?? '',
      data.gstin ?? existing.gstin,
      data.credit_limit !== undefined ? Number(data.credit_limit) : existing.credit_limit,
      data.notes ?? existing.notes ?? '',
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      id
    );

    // Update name in ledger entries if changed (some historical rows only match by
    // party_name since they lack a party_id, so update those too)
    if (trimmedName && trimmedName !== existing.name) {
      db.prepare(`
        UPDATE ledger_entries SET party_name = ? WHERE party_type = 'CUSTOMER' AND (party_id = ? OR party_name = ?)
      `).run(trimmedName, id, existing.name);
    }

    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'EDIT', 'CUSTOMERS', ?, ?)
    `).run(username, String(id), `Updated customer: ${trimmedName}`);

    return this.getCustomerById(id);
  },

  // --- SUPPLIERS ---
  getSuppliers(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT s.*,
        (COALESCE(s.opening_balance, 0)
          + COALESCE((SELECT SUM(grand_total) FROM purchases WHERE (supplier_id = s.id OR supplier_name = s.name) AND status != 'CANCELLED'), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'SUPPLIER' AND (party_id = s.id OR party_name = s.name)), 0)
          + COALESCE((SELECT SUM(credit_amount - debit_amount) FROM ledger_entries WHERE party_type = 'SUPPLIER' AND (party_id = s.id OR party_name = s.name) AND voucher_type NOT IN ('PURCHASE', 'PAYMENT_OUT', 'OPENING_BALANCE')), 0)
        ) as current_balance,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id OR supplier_name = s.name) as total_purchases,
        (SELECT COALESCE(SUM(grand_total), 0) FROM purchases WHERE (supplier_id = s.id OR supplier_name = s.name) AND status = 'ACTIVE') as total_purchase_amount
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (s.name LIKE ? OR s.mobile LIKE ? OR s.supplier_no LIKE ? OR s.city LIKE ? OR s.contact_person LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.active !== undefined) {
      query += ' AND s.active = ?';
      params.push(filters.active ? 1 : 0);
    }
    if (filters.expense_type) {
      query += ' AND s.expense_type = ?';
      params.push(filters.expense_type);
    }
    if (filters.pl_category) {
      query += ' AND s.pl_category = ?';
      params.push(filters.pl_category);
    }
    if (filters.allocated_location) {
      query += ' AND s.allocated_location = ?';
      params.push(filters.allocated_location);
    }

    query += ' ORDER BY s.name ASC';
    return db.prepare(query).all(...params);
  },

  getSupplierById(id) {
    const db = getDatabase();
    const supplier = db.prepare(`
      SELECT s.*,
        (COALESCE(s.opening_balance, 0)
          + COALESCE((SELECT SUM(grand_total) FROM purchases WHERE supplier_id = s.id AND status = 'ACTIVE'), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE party_type = 'SUPPLIER' AND party_id = s.id), 0)
          + COALESCE((SELECT SUM(credit_amount - debit_amount) FROM ledger_entries WHERE party_type = 'SUPPLIER' AND (party_id = s.id OR party_name = s.name) AND voucher_type NOT IN ('PURCHASE', 'PAYMENT_OUT', 'OPENING_BALANCE')), 0)
        ) as current_balance,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as total_purchases,
        (SELECT COALESCE(SUM(grand_total), 0) FROM purchases WHERE supplier_id = s.id AND status = 'ACTIVE') as total_purchase_amount
      FROM suppliers s
      WHERE s.id = ?
    `).get(id);

    if (!supplier) return null;

    const purchases = db.prepare(`
      SELECT * FROM purchases WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 50
    `).all(id);

    const payments = db.prepare(`
      SELECT * FROM payments WHERE party_type = 'SUPPLIER' AND party_id = ? ORDER BY payment_date DESC, id DESC LIMIT 50
    `).all(id);

    return { ...supplier, purchases, payments };
  },

  createSupplier(data, username = 'Admin') {
    return runInTransaction((db) => {
      const trimmedName = (data.name || '').trim();
      const trimmedMobile = (data.mobile || '').trim();

      if (!trimmedName) {
        throw new Error('Supplier / Vendor name is required.');
      }

      // Check duplicate name
      const existingByName = db.prepare('SELECT id, supplier_no, name FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(?)').get(trimmedName);
      if (existingByName) {
        throw new Error(`A supplier with name "${trimmedName}" already exists (${existingByName.supplier_no})! Duplicate entries are not allowed.`);
      }

      // Check duplicate mobile
      if (trimmedMobile && trimmedMobile.replace(/\D/g, '').length >= 7) {
        const existingByMobile = db.prepare('SELECT id, supplier_no, name FROM suppliers WHERE mobile = ? AND mobile != \'\'').get(trimmedMobile);
        if (existingByMobile) {
          throw new Error(`Mobile number "${trimmedMobile}" is already registered to "${existingByMobile.name}" (${existingByMobile.supplier_no})!`);
        }
      }

      let no = data.supplier_no;
      if (!no) {
        const count = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count + 1;
        no = `SUP-${String(count).padStart(3, '0')}`;
      }

      const result = db.prepare(`
        INSERT INTO suppliers (
          supplier_no, name, contact_person, mobile, email, address, city, gstin,
          opening_balance, credit_terms, expense_type, pl_category, allocated_location,
          bank_name, bank_account_no, bank_ifsc, upi_id, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        no,
        trimmedName,
        (data.contact_person || '').trim(),
        trimmedMobile,
        (data.email || '').trim(),
        (data.address || '').trim(),
        (data.city || '').trim(),
        (data.gstin || '').trim().toUpperCase(),
        Number(data.opening_balance) || 0.0,
        data.credit_terms || 'Net 15 Days',
        data.expense_type || 'DIRECT',
        data.pl_category || 'DIRECT_EXPENSES',
        data.allocated_location || 'FACTORY',
        (data.bank_name || '').trim(),
        (data.bank_account_no || '').trim(),
        (data.bank_ifsc || '').trim().toUpperCase(),
        (data.upi_id || '').trim(),
        (data.notes || '').trim(),
        data.active !== undefined ? (data.active ? 1 : 0) : 1
      );

      const newId = result.lastInsertRowid;

      if (Number(data.opening_balance) !== 0) {
        const opBal = Number(data.opening_balance);
        db.prepare(`
          INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
          VALUES (CURRENT_DATE, 'SUPPLIER', ?, ?, 'OPENING_BALANCE', 0, 'INIT', ?, ?, 'Supplier Opening Balance')
        `).run(
          newId,
          trimmedName,
          opBal < 0 ? Math.abs(opBal) : 0.0,
          opBal > 0 ? opBal : 0.0
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'SUPPLIERS', ?, ?)
      `).run(username, String(newId), `Created supplier ${trimmedName} (${no})`);

      return this.getSupplierById(newId);
    });
  },

  updateSupplier(id, data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getSupplierById(id);
    if (!existing) throw new Error('Supplier not found');

    const trimmedName = data.name !== undefined ? data.name.trim() : existing.name;
    const trimmedMobile = data.mobile !== undefined ? data.mobile.trim() : existing.mobile;

    if (!trimmedName) {
      throw new Error('Supplier name cannot be empty.');
    }

    // Check duplicate name
    if (trimmedName && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupName = db.prepare('SELECT id, supplier_no, name FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?').get(trimmedName, id);
      if (dupName) {
        throw new Error(`Another supplier with name "${trimmedName}" already exists (${dupName.supplier_no})!`);
      }
    }

    // Check duplicate mobile
    if (trimmedMobile && trimmedMobile !== existing.mobile && trimmedMobile.replace(/\D/g, '').length >= 7) {
      const dupMobile = db.prepare('SELECT id, supplier_no, name FROM suppliers WHERE mobile = ? AND mobile != \'\' AND id != ?').get(trimmedMobile, id);
      if (dupMobile) {
        throw new Error(`Mobile number "${trimmedMobile}" is already registered to "${dupMobile.name}" (${dupMobile.supplier_no})!`);
      }
    }

    db.prepare(`
      UPDATE suppliers SET
        supplier_no = ?,
        name = ?,
        contact_person = ?,
        mobile = ?,
        email = ?,
        address = ?,
        city = ?,
        gstin = ?,
        credit_terms = ?,
        expense_type = ?,
        pl_category = ?,
        allocated_location = ?,
        bank_name = ?,
        bank_account_no = ?,
        bank_ifsc = ?,
        upi_id = ?,
        notes = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.supplier_no ?? existing.supplier_no,
      trimmedName,
      data.contact_person ?? existing.contact_person ?? '',
      trimmedMobile,
      data.email ?? existing.email ?? '',
      data.address ?? existing.address,
      data.city ?? existing.city ?? '',
      data.gstin ?? existing.gstin,
      data.credit_terms ?? existing.credit_terms,
      data.expense_type ?? existing.expense_type ?? 'DIRECT',
      data.pl_category ?? existing.pl_category ?? 'DIRECT_EXPENSES',
      data.allocated_location ?? existing.allocated_location ?? 'FACTORY',
      data.bank_name ?? existing.bank_name ?? '',
      data.bank_account_no ?? existing.bank_account_no ?? '',
      data.bank_ifsc ?? existing.bank_ifsc ?? '',
      data.upi_id ?? existing.upi_id ?? '',
      data.notes ?? existing.notes ?? '',
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      id
    );

    // Update name in ledger entries if changed (some historical rows only match by
    // party_name since they lack a party_id, so update those too)
    if (trimmedName && trimmedName !== existing.name) {
      db.prepare(`
        UPDATE ledger_entries SET party_name = ? WHERE party_type = 'SUPPLIER' AND (party_id = ? OR party_name = ?)
      `).run(trimmedName, id, existing.name);
    }

    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'EDIT', 'SUPPLIERS', ?, ?)
    `).run(username, String(id), `Updated supplier: ${trimmedName}`);

    return this.getSupplierById(id);
  },

  // --- LEDGER STATEMENTS & RUNNING BALANCES ---
  getPartyLedgerStatement(partyType, partyId, startDate = null, endDate = null) {
    const db = getDatabase();
    const pId = Number(partyId);
    if (isNaN(pId)) throw new Error(`Invalid ${partyType} ID provided`);
    
    // 1. Fetch Party details
    let party = null;
    if (partyType === 'CUSTOMER') {
      party = db.prepare('SELECT id, customer_no as code, name, mobile, address, gstin, opening_balance, credit_limit FROM customers WHERE id = ?').get(pId);
    } else {
      party = db.prepare('SELECT id, supplier_no as code, name, mobile, address, gstin, opening_balance, credit_terms FROM suppliers WHERE id = ?').get(pId);
    }

    if (!party) throw new Error(`${partyType} ID ${partyId} not found`);

    // 2. Fetch all entries (Sales, Purchases, Payments, Returns, Ledger Entries) for this party
    let allEntries = [];

    if (partyType === 'CUSTOMER') {
      // Fetch Sales
      const partySales = db.prepare(`
        SELECT date as entry_date, 'SALE' as voucher_type, invoice_no as voucher_no,
               grand_total as debit_amount, 0 as credit_amount, COALESCE(notes, 'Sale Invoice') as notes
        FROM sales
        WHERE status = 'ACTIVE' AND (customer_id = ? OR customer_name = ?)
      `).all(pId, party.name);

      // Fetch Payments Received
      const partyPayments = db.prepare(`
        SELECT payment_date as entry_date, 'PAYMENT_IN' as voucher_type, payment_no as voucher_no,
               0 as debit_amount, amount as credit_amount, COALESCE(notes, 'Payment Received') as notes
        FROM payments
        WHERE party_type = 'CUSTOMER' AND (party_id = ? OR party_name = ?)
      `).all(pId, party.name);

      // Fetch Credit Notes / Ledger Returns (excluding OPENING_BALANCE as it is handled via master opening_balance)
      const partyLedger = db.prepare(`
        SELECT entry_date, voucher_type, voucher_no, debit_amount, credit_amount, notes
        FROM ledger_entries
        WHERE party_type = 'CUSTOMER' AND (party_id = ? OR party_name = ?) AND voucher_type NOT IN ('SALE', 'PAYMENT_IN', 'OPENING_BALANCE')
      `).all(pId, party.name);

      allEntries = [...partySales, ...partyPayments, ...partyLedger];
    } else {
      // Fetch Purchases
      const partyPurchases = db.prepare(`
        SELECT date as entry_date, 'PURCHASE' as voucher_type, purchase_no as voucher_no,
               0 as debit_amount, grand_total as credit_amount, COALESCE(notes, 'Purchase Invoice') as notes
        FROM purchases
        WHERE status = 'ACTIVE' AND (supplier_id = ? OR supplier_name = ?)
      `).all(pId, party.name);

      // Fetch Payments Paid
      const partyPayments = db.prepare(`
        SELECT payment_date as entry_date, 'PAYMENT_OUT' as voucher_type, payment_no as voucher_no,
               amount as debit_amount, 0 as credit_amount, COALESCE(notes, 'Payment Paid') as notes
        FROM payments
        WHERE party_type = 'SUPPLIER' AND (party_id = ? OR party_name = ?)
      `).all(pId, party.name);

      // Fetch Debit Notes / Ledger Returns (excluding OPENING_BALANCE)
      const partyLedger = db.prepare(`
        SELECT entry_date, voucher_type, voucher_no, debit_amount, credit_amount, notes
        FROM ledger_entries
        WHERE party_type = 'SUPPLIER' AND (party_id = ? OR party_name = ?) AND voucher_type NOT IN ('PURCHASE', 'PAYMENT_OUT', 'OPENING_BALANCE')
      `).all(pId, party.name);

      allEntries = [...partyPurchases, ...partyPayments, ...partyLedger];
    }

    // Sort entries chronologically
    allEntries.sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || ''));

    // 3. Compute base opening balance at start of all transactions so that
    // final net closing balance equals party.opening_balance (the current balance).
    const netAllEntriesActivity = allEntries.reduce((sum, e) => {
      if (partyType === 'CUSTOMER') {
        return sum + (Number(e.debit_amount || 0) - Number(e.credit_amount || 0));
      } else {
        return sum + (Number(e.credit_amount || 0) - Number(e.debit_amount || 0));
      }
    }, 0);

    const baseOpeningBalance = Number(party.opening_balance || 0) - netAllEntriesActivity;

    let openingBalance = baseOpeningBalance;
    let periodEntries = allEntries;

    if (startDate) {
      const before = allEntries.filter(e => (e.entry_date || '') < startDate);
      for (const e of before) {
        if (partyType === 'CUSTOMER') {
          openingBalance += (Number(e.debit_amount || 0) - Number(e.credit_amount || 0));
        } else {
          openingBalance += (Number(e.credit_amount || 0) - Number(e.debit_amount || 0));
        }
      }
      periodEntries = allEntries.filter(e => (e.entry_date || '') >= startDate);
    }
    if (endDate) {
      periodEntries = periodEntries.filter(e => (e.entry_date || '') <= endDate);
    }

    // 4. Compute running balance starting from period opening balance
    let runningBalance = openingBalance;
    const computedEntries = periodEntries.map(entry => {
      if (partyType === 'CUSTOMER') {
        runningBalance += (Number(entry.debit_amount || 0) - Number(entry.credit_amount || 0));
      } else {
        runningBalance += (Number(entry.credit_amount || 0) - Number(entry.debit_amount || 0));
      }

      return {
        ...entry,
        running_balance: Math.round(runningBalance * 100) / 100
      };
    });

    const totalDebit = periodEntries.reduce((sum, e) => sum + Number(e.debit_amount || 0), 0);
    const totalCredit = periodEntries.reduce((sum, e) => sum + Number(e.credit_amount || 0), 0);

    return {
      party,
      party_type: partyType,
      party_id: partyId,
      startDate: startDate || (periodEntries.length > 0 ? periodEntries[0].entry_date : null),
      endDate: endDate || (periodEntries.length > 0 ? periodEntries[periodEntries.length - 1].entry_date : null),
      opening_balance: Math.round(openingBalance * 100) / 100,
      total_debit: Math.round(totalDebit * 100) / 100,
      total_credit: Math.round(totalCredit * 100) / 100,
      closing_balance: Math.round(runningBalance * 100) / 100,
      entries: computedEntries
    };
  },

  // --- PAYMENTS & RECEIPTS ---
  getPayments(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT p.*,
        CASE
          WHEN p.party_type = 'CUSTOMER' THEN 'PAYMENT_IN'
          ELSE 'PAYMENT_OUT'
        END as type_code
      FROM payments p
      WHERE 1=1
    `;
    const params = [];

    if (filters.party_type) {
      query += ' AND p.party_type = ?';
      params.push(filters.party_type);
    }
    if (filters.party_id) {
      query += ' AND p.party_id = ?';
      params.push(filters.party_id);
    }
    if (filters.type) {
      if (filters.type === 'PAYMENT_IN' || filters.type === 'PAYMENT_RECEIVED') {
        query += " AND p.party_type = 'CUSTOMER'";
      } else if (filters.type === 'PAYMENT_OUT' || filters.type === 'PAYMENT_MADE') {
        query += " AND p.party_type = 'SUPPLIER'";
      }
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND date(p.payment_date) BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }
    if (filters.search) {
      query += ' AND (p.payment_no LIKE ? OR p.party_name LIKE ? OR p.notes LIKE ? OR p.reference_no LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY p.payment_date DESC, p.id DESC';
    const paymentsList = db.prepare(query).all(...params);

    if (paymentsList.length === 0) {
      let ledgerQuery = `
        SELECT
          l.id,
          l.voucher_no as payment_no,
          l.entry_date as payment_date,
          l.party_type,
          l.party_id,
          l.party_name,
          CASE WHEN l.party_type = 'CUSTOMER' THEN l.credit_amount ELSE l.debit_amount END as amount,
          CASE WHEN l.party_type = 'CUSTOMER' THEN 'PAYMENT_IN' ELSE 'PAYMENT_OUT' END as type_code,
          'CASH/BANK' as payment_mode,
          l.notes,
          'Cashier' as created_by
        FROM ledger_entries l
        WHERE l.voucher_type IN ('PAYMENT_RECEIVED', 'PAYMENT_MADE', 'PAYMENT_IN', 'PAYMENT_OUT')
          AND l.party_type IN ('CUSTOMER', 'SUPPLIER')
      `;
      const ledgerParams = [];
      if (filters.party_type) {
        ledgerQuery += ' AND l.party_type = ?';
        ledgerParams.push(filters.party_type);
      }
      if (filters.party_id) {
        ledgerQuery += ' AND l.party_id = ?';
        ledgerParams.push(filters.party_id);
      }
      if (filters.startDate && filters.endDate) {
        ledgerQuery += ' AND date(l.entry_date) BETWEEN ? AND ?';
        ledgerParams.push(filters.startDate, filters.endDate);
      }
      ledgerQuery += ' ORDER BY l.entry_date DESC, l.id DESC LIMIT 500';
      return db.prepare(ledgerQuery).all(...ledgerParams);
    }

    return paymentsList;
  },

  recordPaymentReceipt(data, username = 'Cashier') {
    return runInTransaction((db) => {
      const partyType = data.party_type; // 'CUSTOMER' or 'SUPPLIER'
      const partyId = data.party_id;
      const amount = Number(data.amount) || 0.0;
      if (amount <= 0) throw new Error('Payment amount must be greater than 0');

      let partyName = '';
      if (partyType === 'CUSTOMER') {
        const c = db.prepare('SELECT name FROM customers WHERE id = ?').get(partyId);
        if (!c) throw new Error('Customer not found');
        partyName = c.name;
      } else {
        const s = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(partyId);
        if (!s) throw new Error('Supplier not found');
        partyName = s.name;
      }

      const paymentNo = data.payment_no || data.reference_no || settingsService.getNextDocumentNumber(partyType === 'CUSTOMER' ? 'PAYMENT_IN' : 'PAYMENT_OUT');
      const date = data.payment_date || new Date().toISOString().split('T')[0];

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

      // 1. Insert payment record
      const payRes = db.prepare(`
        INSERT INTO payments (payment_no, payment_date, party_type, party_id, party_name, amount, payment_mode, reference_no, notes, account_id, account_name, attachment_url, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentNo,
        date,
        partyType,
        partyId,
        partyName,
        amount,
        data.payment_mode || accountType,
        data.reference_no || '',
        data.notes || '',
        accountId,
        accountName,
        data.attachment_url || data.bill_photo_url || '',
        username
      );

      const paymentId = payRes.lastInsertRowid;

      // 2. Ledger Entry for Party & Account
      const insertLedger = db.prepare(`
        INSERT INTO ledger_entries (
          entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no,
          debit_amount, credit_amount, account_id, account_name, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (partyType === 'CUSTOMER') {
        // Customer Receipt -> Credit Customer
        insertLedger.run(
          date, 'CUSTOMER', partyId, partyName, 'PAYMENT_RECEIVED', paymentId, paymentNo,
          0.0, amount, accountId, accountName, `Payment Received in ${accountName} (${data.payment_mode || accountType}) - ${data.notes || ''}`
        );
        // Debit Cash / Bank Account (Money In)
        insertLedger.run(
          date, accountType, accountId || 1, accountName || 'Cash Account', 'PAYMENT_RECEIVED', paymentId, paymentNo,
          amount, 0.0, accountId, accountName, `Receipt from ${partyName} in ${accountName}`
        );
      } else {
        // Supplier Payment -> Debit Supplier
        insertLedger.run(
          date, 'SUPPLIER', partyId, partyName, 'PAYMENT_MADE', paymentId, paymentNo,
          amount, 0.0, accountId, accountName, `Payment Made from ${accountName} (${data.payment_mode || accountType}) - ${data.notes || ''}`
        );
        // Credit Cash / Bank Account (Money Out)
        insertLedger.run(
          date, accountType, accountId || 1, accountName || 'Cash Account', 'PAYMENT_MADE', paymentId, paymentNo,
          0.0, amount, accountId, accountName, `Payment to ${partyName} from ${accountName}`
        );
      }

      // 3. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'PAYMENTS', ?, ?)
      `).run(username, String(paymentId), `Recorded ${partyType} payment ${paymentNo} of ₹${amount} for ${partyName} in ${accountName}`);

      return { id: paymentId, payment_no: paymentNo, amount, partyName, account_name: accountName };
    });
  },

  // Bulk Import Customers from Excel/CSV
  bulkImportCustomers(customers, username = 'Admin') {
    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error('No customers provided for bulk import');
    }

    return runInTransaction((db) => {
      let inserted = 0;
      let updated = 0;
      const errors = [];

      const insertStmt = db.prepare(`
        INSERT INTO customers (
          customer_no, name, mobile, address, city, credit_limit, opening_balance,
          gstin, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const updateStmt = db.prepare(`
        UPDATE customers SET
          mobile = COALESCE(?, mobile),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          credit_limit = COALESCE(?, credit_limit),
          opening_balance = COALESCE(?, opening_balance),
          gstin = COALESCE(?, gstin),
          notes = COALESCE(?, notes)
        WHERE name = ? OR (mobile != '' AND mobile = ?)
      `);

      for (let idx = 0; idx < customers.length; idx++) {
        const c = customers[idx];
        try {
          const name = (c.name || c['Party Name'] || c['Customer Name'] || '').trim();
          if (!name) {
            errors.push(`Row ${idx + 1}: Customer/Party name is required`);
            continue;
          }

          const mobile = (c.mobile || c['Mobile No'] || c['Mobile'] || '').trim();
          const address = (c.address || c['Address'] || '').trim();
          const city = (c.city || c['City'] || 'Surat').trim();
          const creditLimit = Number(c.credit_limit || c['Credit Limit (Rs)'] || c['Credit Limit'] || 50000);
          const openingBal = Number(c.opening_balance || c['Opening Balance (Rs)'] || c['Opening Balance'] || 0);
          const gstin = (c.gstin || c['GSTIN'] || '').trim();
          const notes = (c.notes || c['Notes'] || '').trim();
          const custNo = `CUST-${String(Date.now()).slice(-6)}-${idx + 1}`;

          const existing = db.prepare("SELECT id FROM customers WHERE name = ? OR (mobile != '' AND mobile = ?)").get(name, mobile);
          if (existing) {
            updateStmt.run(mobile || null, address || null, city || null, creditLimit, openingBal, gstin || null, notes || null, name, mobile);
            updated++;
          } else {
            insertStmt.run(custNo, name, mobile, address, city, creditLimit, openingBal, gstin, notes);
            inserted++;
          }
        } catch (err) {
          errors.push(`Row ${idx + 1} (${c.name || 'Unknown'}): ${err.message}`);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'BULK_IMPORT', 'CUSTOMERS', 'ALL', ?)
      `).run(username, `Bulk imported ${inserted} customers, updated ${updated} customers from Excel/CSV`);

      return { success: true, inserted, updated, total: customers.length, errors };
    });
  },

  // Bulk Import Suppliers from Excel/CSV
  bulkImportSuppliers(suppliers, username = 'Admin') {
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      throw new Error('No suppliers provided for bulk import');
    }

    return runInTransaction((db) => {
      let inserted = 0;
      let updated = 0;
      const errors = [];

      const insertStmt = db.prepare(`
        INSERT INTO suppliers (
          supplier_no, name, contact_person, mobile, address, city,
          bank_name, bank_account_no, bank_ifsc, upi_id,
          opening_balance, gstin, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const updateStmt = db.prepare(`
        UPDATE suppliers SET
          contact_person = COALESCE(?, contact_person),
          mobile = COALESCE(?, mobile),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          bank_name = COALESCE(?, bank_name),
          bank_account_no = COALESCE(?, bank_account_no),
          bank_ifsc = COALESCE(?, bank_ifsc),
          upi_id = COALESCE(?, upi_id),
          opening_balance = COALESCE(?, opening_balance),
          gstin = COALESCE(?, gstin),
          notes = COALESCE(?, notes)
        WHERE name = ? OR (mobile != '' AND mobile = ?)
      `);

      for (let idx = 0; idx < suppliers.length; idx++) {
        const s = suppliers[idx];
        try {
          const name = (s.name || s['Supplier Name'] || s['Vendor Name'] || '').trim();
          if (!name) {
            errors.push(`Row ${idx + 1}: Supplier/Vendor name is required`);
            continue;
          }

          const contactPerson = (s.contact_person || s['Contact Person'] || '').trim();
          const mobile = (s.mobile || s['Mobile No'] || s['Mobile'] || '').trim();
          const address = (s.address || s['Address'] || '').trim();
          const city = (s.city || s['City'] || 'Surat').trim();
          const bankName = (s.bank_name || s['Bank Name'] || '').trim();
          const bankAccountNo = (s.bank_account_no || s['Account No'] || s['Bank Account No'] || '').trim();
          const bankIfsc = (s.bank_ifsc || s['IFSC Code'] || s['Bank IFSC'] || '').trim();
          const upiId = (s.upi_id || s['UPI ID'] || '').trim();
          const openingBal = Number(s.opening_balance || s['Opening Balance (Rs)'] || s['Opening Balance'] || 0);
          const gstin = (s.gstin || s['GSTIN'] || '').trim();
          const notes = (s.notes || s['Notes'] || '').trim();
          const suppNo = `SUPP-${String(Date.now()).slice(-6)}-${idx + 1}`;

          const existing = db.prepare("SELECT id FROM suppliers WHERE name = ? OR (mobile != '' AND mobile = ?)").get(name, mobile);
          if (existing) {
            updateStmt.run(contactPerson || null, mobile || null, address || null, city || null, bankName || null, bankAccountNo || null, bankIfsc || null, upiId || null, openingBal, gstin || null, notes || null, name, mobile);
            updated++;
          } else {
            insertStmt.run(suppNo, name, contactPerson, mobile, address, city, bankName, bankAccountNo, bankIfsc, upiId, openingBal, gstin, notes);
            inserted++;
          }
        } catch (err) {
          errors.push(`Row ${idx + 1} (${s.name || 'Unknown'}): ${err.message}`);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'BULK_IMPORT', 'SUPPLIERS', 'ALL', ?)
      `).run(username, `Bulk imported ${inserted} suppliers, updated ${updated} suppliers from Excel/CSV`);

      return { success: true, inserted, updated, total: suppliers.length, errors };
    });
  }
};
