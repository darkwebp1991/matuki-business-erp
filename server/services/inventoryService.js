import { getDatabase, runInTransaction } from '../database/connection.js';

export const inventoryService = {
  getInventorySummary() {
    const db = getDatabase();

    // Raw Materials Valuation
    const rawVal = db.prepare(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN current_stock > 0 THEN current_stock * COALESCE(NULLIF(average_purchase_rate, 0), current_purchase_rate, standard_rate, 0) ELSE 0 END), 0) as total_valuation,
        COALESCE(SUM(CASE WHEN current_stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count
      FROM raw_materials
      WHERE active = 1
    `).get();

    // Finished Goods Valuation
    const finishedVal = db.prepare(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN current_stock > 0 THEN current_stock * COALESCE(NULLIF(purchase_rate, 0), selling_rate * 0.75, 0) ELSE 0 END), 0) as total_valuation,
        COALESCE(SUM(CASE WHEN current_stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count
      FROM products
      WHERE active = 1
    `).get();

    // Semi-Finished Goods Valuation
    const semiVal = { count: 0, total_valuation: 0, low_stock_count: 0 };

    const totalValuation = rawVal.total_valuation + finishedVal.total_valuation + semiVal.total_valuation;
    const totalLowStock = rawVal.low_stock_count + finishedVal.low_stock_count + semiVal.low_stock_count;

    return {
      total_valuation: Math.round(totalValuation * 100) / 100,
      total_low_stock: totalLowStock,
      raw_materials: {
        count: rawVal.count,
        valuation: Math.round(rawVal.total_valuation * 100) / 100,
        low_stock_count: rawVal.low_stock_count
      },
      finished_products: {
        count: finishedVal.count,
        valuation: Math.round(finishedVal.total_valuation * 100) / 100,
        low_stock_count: finishedVal.low_stock_count
      },
      semi_finished: {
        count: semiVal.count,
        valuation: Math.round(semiVal.total_valuation * 100) / 100,
        low_stock_count: semiVal.low_stock_count
      }
    };
  },

  getAllStockItems(filters = {}) {
    const db = getDatabase();
    const items = [];

    // 1. Fetch Products
    let prodQuery = `
      SELECT p.id, p.code, p.barcode, p.name, p.product_type as item_type, p.unit,
             p.current_stock, p.min_stock, p.max_stock, p.purchase_rate as cost_rate,
             p.selling_rate, c.name as category_name,
             (p.current_stock * p.purchase_rate) as total_valuation,
             CASE WHEN p.current_stock <= p.min_stock THEN 1 ELSE 0 END as is_low_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
    `;
    const prodItems = db.prepare(prodQuery).all();
    items.push(...prodItems);

    // 2. Fetch Raw Materials
    let rmQuery = `
      SELECT rm.id, rm.code, '' as barcode, rm.name, 'RAW_MATERIAL' as item_type, rm.unit,
             rm.current_stock, rm.min_stock, 1000.0 as max_stock, rm.average_purchase_rate as cost_rate,
             0.0 as selling_rate, c.name as category_name,
             (rm.current_stock * rm.average_purchase_rate) as total_valuation,
             CASE WHEN rm.current_stock <= rm.min_stock THEN 1 ELSE 0 END as is_low_stock
      FROM raw_materials rm
      LEFT JOIN categories c ON rm.category_id = c.id
      WHERE rm.active = 1
    `;
    const rmItems = db.prepare(rmQuery).all();
    items.push(...rmItems);

    // Apply filtering
    let filtered = items;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(i => (
        (i.name && i.name.toLowerCase().includes(s)) ||
        (i.code && i.code.toLowerCase().includes(s)) ||
        (i.barcode && i.barcode.toLowerCase().includes(s))
      ));
    }
    if (filters.item_type) {
      filtered = filtered.filter(i => i.item_type === filters.item_type);
    }
    if (filters.low_stock_only) {
      filtered = filtered.filter(i => i.is_low_stock === 1);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },

  getStockMovements(filters = {}) {
    const db = getDatabase();
    let query = `SELECT * FROM stock_movements WHERE 1=1`;
    const params = [];

    if (filters.item_type) {
      query += ' AND item_type = ?';
      params.push(filters.item_type);
    }
    if (filters.item_id) {
      query += ' AND item_id = ?';
      params.push(filters.item_id);
    }
    if (filters.movement_type) {
      query += ' AND movement_type = ?';
      params.push(filters.movement_type);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND movement_date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }
    if (filters.search) {
      query += ' AND (item_name LIKE ? OR reference_no LIKE ? OR notes LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY movement_date DESC, id DESC LIMIT 200';
    return db.prepare(query).all(...params);
  },

  adjustStock(data, username = 'Admin') {
    return runInTransaction((db) => {
      const itemType = data.item_type; // 'RAW_MATERIAL' or 'FINISHED_PRODUCT' / 'SEMI_FINISHED'
      const itemId = data.item_id;
      const adjustmentQty = Number(data.adjustment_qty); // positive or negative
      const reason = data.reason || 'Manual stock audit';

      if (isNaN(adjustmentQty) || adjustmentQty === 0) {
        throw new Error('Adjustment quantity must be non-zero');
      }

      let currentStock = 0.0;
      let itemName = '';
      let unit = 'KG';
      let costRate = 0.0;

      if (itemType === 'RAW_MATERIAL') {
        const rm = db.prepare('SELECT id, name, current_stock, unit, average_purchase_rate FROM raw_materials WHERE id = ?').get(itemId);
        if (!rm) throw new Error('Raw material not found');
        currentStock = Number(rm.current_stock) || 0.0;
        itemName = rm.name;
        unit = rm.unit;
        costRate = Number(rm.average_purchase_rate) || 0.0;

        const newStock = currentStock + adjustmentQty;
        db.prepare('UPDATE raw_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, itemId);
      } else {
        const prod = db.prepare('SELECT id, name, current_stock, unit, purchase_rate FROM products WHERE id = ?').get(itemId);
        if (!prod) throw new Error('Product not found');
        currentStock = Number(prod.current_stock) || 0.0;
        itemName = prod.name;
        unit = prod.unit;
        costRate = Number(prod.purchase_rate) || 0.0;

        const newStock = currentStock + adjustmentQty;
        db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, itemId);
      }

      const newStock = currentStock + adjustmentQty;
      const count = db.prepare('SELECT COUNT(*) as count FROM stock_adjustments').get().count + 1;
      const adjNo = `ADJ-${String(count).padStart(3, '0')}`;

      // 1. Insert Stock Adjustment Audit Record
      db.prepare(`
        INSERT INTO stock_adjustments (
          adjustment_no, date, item_type, item_id, item_name,
          previous_stock, adjustment_qty, new_stock, unit, reason, user_name
        ) VALUES (?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adjNo,
        itemType,
        itemId,
        itemName,
        currentStock,
        adjustmentQty,
        newStock,
        unit,
        reason,
        username
      );

      // 2. Record Stock Movement
      db.prepare(`
        INSERT INTO stock_movements (
          movement_date, item_type, item_id, item_name, movement_type,
          quantity, unit, base_quantity, cost_rate, total_cost_value,
          reference_type, reference_id, reference_no, notes, created_by
        ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, 'STOCK_ADJUSTMENT', ?, ?, ?, ?, ?, 'ADJUSTMENT', 0, ?, ?, ?)
      `).run(
        itemType,
        itemId,
        itemName,
        adjustmentQty,
        unit,
        adjustmentQty,
        costRate,
        Math.abs(adjustmentQty * costRate),
        adjNo,
        `Stock Adjusted by ${username}: ${reason} (Prev: ${currentStock}, New: ${newStock})`,
        username
      );

      // 3. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'STOCK_ADJUST', 'INVENTORY', ?, ?)
      `).run(username, adjNo, `Adjusted ${itemName} by ${adjustmentQty} ${unit}. Reason: ${reason}`);

      return {
        adjustment_no: adjNo,
        item_name: itemName,
        previous_stock: currentStock,
        adjustment_qty: adjustmentQty,
        new_stock: newStock,
        unit
      };
    });
  }
};
