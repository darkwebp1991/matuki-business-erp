import { getDatabase } from '../database/connection.js';
import { settingsService } from './settingsService.js';

export const advanceOrderService = {
  // 1. Get List of Advance Orders with Rich Filters
  getAdvanceOrders: ({ startDate, endDate, deliveryDate, status, slot, customerId, search }) => {
    const db = getDatabase();
    let query = `
      SELECT 
        o.*,
        c.name as customer_name_actual,
        c.mobile as customer_mobile_actual,
        c.address as customer_address,
        (SELECT COUNT(*) FROM advance_order_items WHERE order_id = o.id) as item_count
      FROM advance_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (deliveryDate) {
      query += ' AND o.delivery_date = ?';
      params.push(deliveryDate);
    } else {
      if (startDate) {
        query += ' AND o.delivery_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND o.delivery_date <= ?';
        params.push(endDate);
      }
    }

    if (status && status !== 'ALL') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (slot && slot !== 'ALL') {
      query += ' AND o.delivery_slot = ?';
      params.push(slot);
    }

    if (customerId) {
      query += ' AND o.customer_id = ?';
      params.push(Number(customerId));
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ' AND (o.order_no LIKE ? OR o.customer_name LIKE ? OR o.delivery_venue LIKE ? OR o.notes LIKE ?)';
      params.push(s, s, s, s);
    }

    query += " ORDER BY o.delivery_date ASC, CASE o.delivery_slot WHEN 'MORNING' THEN 1 WHEN 'EVENING' THEN 2 ELSE 3 END, o.id ASC";

    const orders = db.prepare(query).all(...params);

    // Fetch items for each order
    const getItemStmt = db.prepare('SELECT * FROM advance_order_items WHERE order_id = ? ORDER BY id ASC');
    return orders.map(ord => ({
      ...ord,
      items: getItemStmt.all(ord.id)
    }));
  },

  // 2. Get Single Order by ID
  getOrderById: (id) => {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT 
        o.*,
        c.name as customer_name_actual,
        c.mobile as customer_mobile_actual,
        c.address as customer_address
      FROM advance_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(Number(id));

    if (!order) return null;

    order.items = db.prepare('SELECT * FROM advance_order_items WHERE order_id = ? ORDER BY id ASC').all(order.id);
    return order;
  },

  // 3. Get Daily Slot Summary (Morning vs Evening + Kitchen Item Aggregation)
  getDailyOrdersSummary: (date) => {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const orders = advanceOrderService.getAdvanceOrders({ deliveryDate: targetDate });

    const morningOrders = orders.filter(o => o.delivery_slot === 'MORNING');
    const eveningOrders = orders.filter(o => o.delivery_slot === 'EVENING' || o.delivery_slot === 'ALL_DAY');

    // Aggregate Kitchen Items needed for the whole day & per slot with Math Formula (e.g. 15 + 25 + 10 = 50 KG)
    const aggregateKitchenItems = (orderList) => {
      const itemMap = {};
      for (const ord of orderList) {
        if (ord.status === 'CANCELLED') continue;
        for (const item of (ord.items || [])) {
          const key = `${item.item_name}__${item.unit}`;
          if (!itemMap[key]) {
            itemMap[key] = {
              product_id: item.product_id,
              item_name: item.item_name,
              unit: item.unit,
              total_qty: 0,
              order_count: 0,
              caterers: [],
              breakdown_list: [],
              notes_list: []
            };
          }
          const itemQty = Number(item.quantity) || 0;
          itemMap[key].total_qty += itemQty;
          itemMap[key].order_count += 1;
          if (!itemMap[key].caterers.includes(ord.customer_name)) {
            itemMap[key].caterers.push(ord.customer_name);
          }
          itemMap[key].breakdown_list.push({
            customer_name: ord.customer_name,
            qty: itemQty,
            unit: item.unit,
            time: ord.delivery_time,
            notes: item.notes || ord.notes || ''
          });
          if (item.notes && !itemMap[key].notes_list.includes(item.notes)) {
            itemMap[key].notes_list.push(item.notes);
          }
        }
      }

      return Object.values(itemMap).map(k => {
        const total = Math.round(k.total_qty * 100) / 100;
        let formula = '';
        if (k.breakdown_list.length > 1) {
          const qtyParts = k.breakdown_list.map(b => b.qty).join(' + ');
          formula = `${qtyParts} = ${total} ${k.unit}`;
        } else {
          formula = `${total} ${k.unit}`;
        }
        return {
          ...k,
          total_qty: total,
          breakdown_formula: formula
        };
      }).sort((a, b) => b.total_qty - a.total_qty);
    };

    const morningKitchen = aggregateKitchenItems(morningOrders);
    const eveningKitchen = aggregateKitchenItems(eveningOrders);
    const dayKitchen = aggregateKitchenItems(orders);

    const totalDayAmount = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + (Number(o.total_amount) || 0) : sum, 0);
    const totalDayWeight = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + (Number(o.total_weight_kg) || 0) : sum, 0);

    return {
      date: targetDate,
      total_orders_count: orders.length,
      total_day_amount: Math.round(totalDayAmount * 100) / 100,
      total_day_weight_kg: Math.round(totalDayWeight * 100) / 100,
      morning: {
        slot_name: 'MORNING (સવારનો સ્લોટ)',
        orders_count: morningOrders.length,
        total_amount: Math.round(morningOrders.reduce((s, o) => o.status !== 'CANCELLED' ? s + (Number(o.total_amount) || 0) : s, 0) * 100) / 100,
        total_weight_kg: Math.round(morningOrders.reduce((s, o) => o.status !== 'CANCELLED' ? s + (Number(o.total_weight_kg) || 0) : s, 0) * 100) / 100,
        orders: morningOrders,
        kitchen_summary: morningKitchen
      },
      evening: {
        slot_name: 'EVENING (સાંજનો સ્લોટ)',
        orders_count: eveningOrders.length,
        total_amount: Math.round(eveningOrders.reduce((s, o) => o.status !== 'CANCELLED' ? s + (Number(o.total_amount) || 0) : s, 0) * 100) / 100,
        total_weight_kg: Math.round(eveningOrders.reduce((s, o) => o.status !== 'CANCELLED' ? s + (Number(o.total_weight_kg) || 0) : s, 0) * 100) / 100,
        orders: eveningOrders,
        kitchen_summary: eveningKitchen
      },
      all_kitchen_summary: dayKitchen
    };
  },

  // 4. Create Advance Order
  createAdvanceOrder: (data) => {
    const db = getDatabase();

    // Generate Sequential Order Number
    const orderNo = data.order_no || settingsService.getNextDocumentNumber('ADVANCE_ORDER');

    // Resolve Customer info
    let customerName = data.customer_name || 'Walk-in Caterer';
    let customerMobile = data.customer_mobile || '';
    if (data.customer_id) {
      const cust = db.prepare('SELECT name, mobile FROM customers WHERE id = ?').get(Number(data.customer_id));
      if (cust) {
        customerName = cust.name;
        if (!customerMobile) customerMobile = cust.mobile || '';
      }
    }

    const items = data.items || [];
    if (items.length === 0) {
      throw new Error('At least one item is required to place an advance order.');
    }

    // --- RULE: PREVENT DUPLICATE IDENTICAL ORDERS ---
    const checkDate = data.delivery_date || new Date().toISOString().split('T')[0];
    const custId = data.customer_id ? Number(data.customer_id) : null;
    const existingOrders = db.prepare(`
      SELECT id, order_no, customer_id, customer_name, customer_mobile, total_amount, delivery_date, delivery_slot
      FROM advance_orders
      WHERE delivery_date = ? 
        AND status != 'CANCELLED'
        AND (
          (? IS NOT NULL AND customer_id = ?) 
          OR (customer_name IS NOT NULL AND LOWER(TRIM(customer_name)) = LOWER(TRIM(?)))
          OR (? != '' AND customer_mobile = ?)
        )
    `).all(
      checkDate,
      custId,
      custId,
      customerName,
      customerMobile || '',
      customerMobile || ''
    );

    for (const existing of existingOrders) {
      const existingItems = db.prepare('SELECT product_id, item_name, quantity, rate FROM advance_order_items WHERE order_id = ?').all(existing.id);
      if (existingItems.length === items.length) {
        const normalizeItem = (it) => `${it.product_id || 0}_${(it.item_name || '').trim().toLowerCase()}_${Number(it.quantity || 0).toFixed(3)}_${Number(it.rate || 0).toFixed(2)}`;
        const set1 = items.map(normalizeItem).sort();
        const set2 = existingItems.map(normalizeItem).sort();
        const isIdentical = set1.every((val, idx) => val === set2[idx]);
        if (isIdentical) {
          throw new Error(`Duplicate Order Detected! An identical order #${existing.order_no} already exists for "${customerName}" on delivery date ${checkDate} with the exact same items and quantities. If this is a different order, please modify the item or quantity.`);
        }
      }
    }
    let totalWeightKg = 0;
    let totalAmount = 0;

    for (const itm of items) {
      const qty = Number(itm.quantity) || 0;
      const rate = Number(itm.rate) || 0;
      const itmTotal = Math.round(qty * rate * 100) / 100;
      totalItems += 1;
      if (itm.unit === 'KG' || !itm.unit) {
        totalWeightKg += qty;
      }
      totalAmount += itmTotal;
    }

    const deliveryCharge = Number(data.customer_delivery_charge) || 0;
    const driverRate = Number(data.driver_delivery_rate) || 0;
    totalAmount += deliveryCharge;

    const insertOrderStmt = db.prepare(`
      INSERT INTO advance_orders (
        order_no, customer_id, customer_name, customer_mobile, delivery_date, delivery_slot,
        delivery_time, delivery_venue, customer_delivery_charge, driver_delivery_rate, status,
        total_items, total_weight_kg, total_amount, advance_paid, notes, trip_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertOrderStmt.run(
      orderNo,
      data.customer_id ? Number(data.customer_id) : null,
      customerName,
      customerMobile,
      data.delivery_date || new Date().toISOString().split('T')[0],
      data.delivery_slot || 'MORNING',
      data.delivery_time || '08:00 AM',
      data.delivery_venue || '',
      deliveryCharge,
      driverRate,
      data.status || 'PENDING',
      totalItems,
      Math.round(totalWeightKg * 100) / 100,
      Math.round(totalAmount * 100) / 100,
      Number(data.advance_paid) || 0,
      data.notes || '',
      data.trip_type || 'ROUND_TRIP'
    );

    const orderId = result.lastInsertRowid;

    // Insert Items
    const insertItemStmt = db.prepare(`
      INSERT INTO advance_order_items (order_id, product_id, item_name, quantity, unit, rate, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const itm of items) {
      const qty = Number(itm.quantity) || 0;
      const rate = Number(itm.rate) || 0;
      const itmTotal = Math.round(qty * rate * 100) / 100;
      insertItemStmt.run(
        orderId,
        itm.product_id ? Number(itm.product_id) : null,
        itm.item_name || 'Sweet Item',
        qty,
        itm.unit || 'KG',
        rate,
        itmTotal,
        itm.notes || ''
      );
    }

    return advanceOrderService.getOrderById(orderId);
  },

  // 5. Update Advance Order
  updateAdvanceOrder: (id, data) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM advance_orders WHERE id = ?').get(Number(id));
    if (!existing) throw new Error(`Advance order ID ${id} not found`);

    let customerName = data.customer_name || existing.customer_name;
    let customerMobile = data.customer_mobile || existing.customer_mobile;
    if (data.customer_id && data.customer_id !== existing.customer_id) {
      const cust = db.prepare('SELECT name, mobile FROM customers WHERE id = ?').get(Number(data.customer_id));
      if (cust) {
        customerName = cust.name;
        if (!customerMobile) customerMobile = cust.mobile || '';
      }
    }

    const items = data.items || [];
    let totalItems = 0;
    let totalWeightKg = 0;
    let totalAmount = 0;

    for (const itm of items) {
      const qty = Number(itm.quantity) || 0;
      const rate = Number(itm.rate) || 0;
      const itmTotal = Math.round(qty * rate * 100) / 100;
      totalItems += 1;
      if (itm.unit === 'KG' || !itm.unit) {
        totalWeightKg += qty;
      }
      totalAmount += itmTotal;
    }

    const deliveryCharge = data.customer_delivery_charge !== undefined ? Number(data.customer_delivery_charge) : existing.customer_delivery_charge;
    const driverRate = data.driver_delivery_rate !== undefined ? Number(data.driver_delivery_rate) : existing.driver_delivery_rate;
    totalAmount += deliveryCharge;

    db.prepare(`
      UPDATE advance_orders SET
        customer_id = ?,
        customer_name = ?,
        customer_mobile = ?,
        delivery_date = ?,
        delivery_slot = ?,
        delivery_time = ?,
        delivery_venue = ?,
        customer_delivery_charge = ?,
        driver_delivery_rate = ?,
        status = ?,
        total_items = ?,
        total_weight_kg = ?,
        total_amount = ?,
        advance_paid = ?,
        notes = ?,
        trip_type = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.customer_id ? Number(data.customer_id) : existing.customer_id,
      customerName,
      customerMobile,
      data.delivery_date || existing.delivery_date,
      data.delivery_slot || existing.delivery_slot,
      data.delivery_time || existing.delivery_time,
      data.delivery_venue !== undefined ? data.delivery_venue : existing.delivery_venue,
      deliveryCharge,
      driverRate,
      data.status || existing.status,
      totalItems,
      Math.round(totalWeightKg * 100) / 100,
      Math.round(totalAmount * 100) / 100,
      data.advance_paid !== undefined ? Number(data.advance_paid) : existing.advance_paid,
      data.notes !== undefined ? data.notes : existing.notes,
      data.trip_type || existing.trip_type || 'ROUND_TRIP',
      Number(id)
    );

    // Re-insert Items if provided
    if (data.items && Array.isArray(data.items)) {
      db.prepare('DELETE FROM advance_order_items WHERE order_id = ?').run(Number(id));
      const insertItemStmt = db.prepare(`
        INSERT INTO advance_order_items (order_id, product_id, item_name, quantity, unit, rate, total_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const itm of data.items) {
        const qty = Number(itm.quantity) || 0;
        const rate = Number(itm.rate) || 0;
        const itmTotal = Math.round(qty * rate * 100) / 100;
        insertItemStmt.run(
          Number(id),
          itm.product_id ? Number(itm.product_id) : null,
          itm.item_name || 'Sweet Item',
          qty,
          itm.unit || 'KG',
          rate,
          itmTotal,
          itm.notes || ''
        );
      }
    }

    return advanceOrderService.getOrderById(id);
  },

  // 6. Update Status Only
  updateStatus: (id, status) => {
    const db = getDatabase();
    db.prepare('UPDATE advance_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, Number(id));
    return advanceOrderService.getOrderById(id);
  },

  // 7. Convert Order to Sale Bill (Links newly created invoice)
  convertToSale: (orderId, saleId, invoiceNo) => {
    const db = getDatabase();
    db.prepare(`
      UPDATE advance_orders 
      SET status = 'BILLED', 
          converted_sale_id = ?, 
          converted_invoice_no = ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(Number(saleId), invoiceNo || '', Number(orderId));

    return advanceOrderService.getOrderById(orderId);
  },

  // 8. Delete Advance Order
  deleteAdvanceOrder: (id) => {
    const db = getDatabase();
    const orderId = Number(id);

    // 1. Unlink any WhatsApp Inbound Orders that point to this advance order
    try {
      db.prepare(`
        UPDATE whatsapp_inbound_orders 
        SET converted_order_id = NULL, 
            converted_order_no = '', 
            status = 'PENDING',
            updated_at = CURRENT_TIMESTAMP
        WHERE converted_order_id = ?
      `).run(orderId);
    } catch (e) {
      console.warn('Could not unlink whatsapp_inbound_orders:', e.message);
    }

    // 2. Delete all Line Items
    db.prepare('DELETE FROM advance_order_items WHERE order_id = ?').run(orderId);

    // 3. Delete Advance Order Record
    const result = db.prepare('DELETE FROM advance_orders WHERE id = ?').run(orderId);

    return { 
      success: true, 
      message: `Advance order #${id} deleted successfully`,
      deletedCount: result.changes 
    };
  }
};
