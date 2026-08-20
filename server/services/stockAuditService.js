import { getDatabase, runInTransaction } from '../database/connection.js';

export const stockAuditService = {
  /**
   * Get physical stock audit template pre-filled with factory items & branch valuation headers
   */
  getAuditTemplate(auditMonth = null) {
    const db = getDatabase();
    const targetMonth = auditMonth || new Date().toISOString().slice(0, 7); // e.g. '2026-08'

    // Check if an audit for this month already exists
    const existingAudit = db.prepare(`
      SELECT * FROM branch_stock_audits 
      WHERE audit_month = ? 
      ORDER BY id DESC LIMIT 1
    `).get(targetMonth);

    let savedItemsMap = new Map();
    if (existingAudit) {
      const savedItems = db.prepare(`
        SELECT * FROM branch_stock_audit_items WHERE audit_id = ?
      `).all(existingAudit.id);
      savedItems.forEach(si => {
        savedItemsMap.set(`${si.item_type}_${si.item_id}`, si);
      });
    }

    const items = [];

    // 1. Raw Materials (Factory & Godown)
    const rawMaterials = db.prepare(`
      SELECT rm.id, rm.code, rm.name, 'RAW_MATERIAL' as item_type, rm.unit,
             rm.current_stock as system_stock, rm.average_purchase_rate as cost_rate,
             c.name as category_name
      FROM raw_materials rm
      LEFT JOIN categories c ON rm.category_id = c.id
      WHERE rm.active = 1
      ORDER BY c.name, rm.name
    `).all();

    rawMaterials.forEach(rm => {
      const key = `RAW_MATERIAL_${rm.id}`;
      const saved = savedItemsMap.get(key);
      const costRate = Number(rm.cost_rate) || 0;
      const sysStock = Number(rm.system_stock) || 0;

      const factoryStock = saved ? Number(saved.factory_stock) : sysStock;
      const variance = factoryStock - sysStock;
      const valuation = factoryStock * costRate;

      items.push({
        item_type: 'RAW_MATERIAL',
        item_id: rm.id,
        item_code: rm.code || `RM-${rm.id}`,
        item_name: rm.name,
        category_name: rm.category_name || 'Raw Material',
        unit: rm.unit || 'KG',
        cost_rate: Math.round(costRate * 100) / 100,
        system_stock: Math.round(sysStock * 100) / 100,
        factory_stock: Math.round(factoryStock * 100) / 100,
        sarthana_stock: saved ? Number(saved.sarthana_stock || 0) : 0,
        katargam_stock: saved ? Number(saved.katargam_stock || 0) : 0,
        total_physical_stock: Math.round(factoryStock * 100) / 100,
        variance_qty: Math.round(variance * 100) / 100,
        total_valuation: Math.round(valuation * 100) / 100
      });
    });

    // 2. Finished & Semi-Finished Products
    const products = db.prepare(`
      SELECT p.id, p.code, p.name, p.product_type as item_type, p.unit,
             p.current_stock as system_stock, p.purchase_rate as cost_rate,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
      ORDER BY c.name, p.name
    `).all();

    products.forEach(p => {
      const key = `${p.item_type}_${p.id}`;
      const saved = savedItemsMap.get(key);
      const costRate = Number(p.cost_rate) || 0;
      const sysStock = Number(p.system_stock) || 0;

      const factoryStock = saved ? Number(saved.factory_stock) : sysStock;
      const variance = factoryStock - sysStock;
      const valuation = factoryStock * costRate;

      items.push({
        item_type: p.item_type,
        item_id: p.id,
        item_code: p.code || `PRD-${p.id}`,
        item_name: p.name,
        category_name: p.category_name || 'Finished Product',
        unit: p.unit || 'KG',
        cost_rate: Math.round(costRate * 100) / 100,
        system_stock: Math.round(sysStock * 100) / 100,
        factory_stock: Math.round(factoryStock * 100) / 100,
        sarthana_stock: saved ? Number(saved.sarthana_stock || 0) : 0,
        katargam_stock: saved ? Number(saved.katargam_stock || 0) : 0,
        total_physical_stock: Math.round(factoryStock * 100) / 100,
        variance_qty: Math.round(variance * 100) / 100,
        total_valuation: Math.round(valuation * 100) / 100
      });
    });

    // Factory item-wise valuation total
    const factoryValuation = items.reduce((sum, i) => sum + (i.factory_stock * i.cost_rate), 0);
    const sarthanaValuation = existingAudit ? Number(existingAudit.sarthana_valuation || 0) : 125000;
    const katargamValuation = existingAudit ? Number(existingAudit.katargam_valuation || 0) : 95000;
    const totalValuation = factoryValuation + sarthanaValuation + katargamValuation;
    const totalVarianceValue = items.reduce((sum, i) => sum + (i.variance_qty * i.cost_rate), 0);

    return {
      audit_month: targetMonth,
      is_saved: Boolean(existingAudit),
      audit_no: existingAudit ? existingAudit.audit_no : `AUD-${targetMonth}`,
      audit_date: existingAudit ? existingAudit.audit_date : `${targetMonth}-28`,
      auditor_name: existingAudit ? existingAudit.auditor_name : 'Suraj Bhai / Paresh Patel',
      sarthana_valuation: sarthanaValuation,
      sarthana_notes: existingAudit ? (existingAudit.sarthana_notes || '') : 'Kaju Sweets ₹50,000 | Mawa ₹40,000 | Farsan ₹20,000 | Packaging ₹15,000',
      katargam_valuation: katargamValuation,
      katargam_notes: existingAudit ? (existingAudit.katargam_notes || '') : 'Kaju Katli ₹40,000 | Bengali Sweets ₹30,000 | Gift Boxes ₹25,000',
      notes: existingAudit ? existingAudit.notes : '',
      summary: {
        factory_valuation: Math.round(factoryValuation * 100) / 100,
        sarthana_valuation: Math.round(sarthanaValuation * 100) / 100,
        katargam_valuation: Math.round(katargamValuation * 100) / 100,
        total_valuation: Math.round(totalValuation * 100) / 100,
        total_variance_value: Math.round(totalVarianceValue * 100) / 100,
        total_items: items.length
      },
      items
    };
  },

  /**
   * Save physical audit: Factory item-by-item + Sarthana/Katargam Direct Category Totals
   */
  saveBranchStockAudit(data, username = 'Admin') {
    return runInTransaction((db) => {
      const auditMonth = data.audit_month || new Date().toISOString().slice(0, 7);
      const auditDate = data.audit_date || new Date().toISOString().split('T')[0];
      const auditorName = data.auditor_name || username || 'Admin';
      const notes = data.notes || `Monthly Physical Audit - ${auditMonth}`;
      const items = Array.isArray(data.items) ? data.items : [];

      const sarthanaValuation = Math.max(0, Number(data.sarthana_valuation) || 0);
      const sarthanaNotes = data.sarthana_notes || '';
      const katargamValuation = Math.max(0, Number(data.katargam_valuation) || 0);
      const katargamNotes = data.katargam_notes || '';

      if (items.length === 0) {
        throw new Error('No items provided in stock audit');
      }

      // Check if audit exists for this month to update, or create new
      const existing = db.prepare('SELECT id, audit_no FROM branch_stock_audits WHERE audit_month = ?').get(auditMonth);
      let auditId = existing ? existing.id : null;
      let auditNo = existing ? existing.audit_no : `AUD-${auditMonth}`;

      let factoryValuation = 0;
      let totalVarianceVal = 0;

      // 1. Process Factory item counts
      const processedItems = items.map(item => {
        const itemType = item.item_type;
        const itemId = Number(item.item_id);
        const costRate = Number(item.cost_rate) || 0;
        const sysStock = Number(item.system_stock) || 0;
        const fStock = Math.max(0, Number(item.factory_stock) || 0);
        const varianceQty = fStock - sysStock;
        const itemVal = fStock * costRate;

        factoryValuation += (fStock * costRate);
        totalVarianceVal += (varianceQty * costRate);

        return {
          item_type: itemType,
          item_id: itemId,
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          category_name: item.category_name || '',
          unit: item.unit || 'KG',
          cost_rate: costRate,
          system_stock: sysStock,
          factory_stock: fStock,
          sarthana_stock: 0,
          katargam_stock: 0,
          total_physical_stock: fStock,
          variance_qty: varianceQty,
          total_valuation: itemVal
        };
      });

      const totalValuation = factoryValuation + sarthanaValuation + katargamValuation;

      // 2. Insert or update branch_stock_audits header
      if (auditId) {
        db.prepare(`
          UPDATE branch_stock_audits
          SET audit_date = ?, auditor_name = ?, factory_valuation = ?,
              sarthana_valuation = ?, sarthana_notes = ?, katargam_valuation = ?,
              katargam_notes = ?, total_valuation = ?, total_variance_value = ?,
              notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          auditDate,
          auditorName,
          Math.round(factoryValuation * 100) / 100,
          Math.round(sarthanaValuation * 100) / 100,
          sarthanaNotes,
          Math.round(katargamValuation * 100) / 100,
          katargamNotes,
          Math.round(totalValuation * 100) / 100,
          Math.round(totalVarianceVal * 100) / 100,
          notes,
          auditId
        );

        // Delete old items to refresh
        db.prepare('DELETE FROM branch_stock_audit_items WHERE audit_id = ?').run(auditId);
      } else {
        const res = db.prepare(`
          INSERT INTO branch_stock_audits (
            audit_no, audit_date, audit_month, auditor_name, factory_valuation,
            sarthana_valuation, sarthana_notes, katargam_valuation, katargam_notes,
            total_valuation, total_variance_value, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPLIED', ?)
        `).run(
          auditNo,
          auditDate,
          auditMonth,
          auditorName,
          Math.round(factoryValuation * 100) / 100,
          Math.round(sarthanaValuation * 100) / 100,
          sarthanaNotes,
          Math.round(katargamValuation * 100) / 100,
          katargamNotes,
          Math.round(totalValuation * 100) / 100,
          Math.round(totalVarianceVal * 100) / 100,
          notes
        );
        auditId = res.lastInsertRowid;
      }

      // 3. Insert all audit items & update current inventory stock in 1-Click
      const insertItemStmt = db.prepare(`
        INSERT INTO branch_stock_audit_items (
          audit_id, item_type, item_id, item_code, item_name, category_name,
          unit, cost_rate, system_stock, factory_stock, sarthana_stock,
          katargam_stock, total_physical_stock, variance_qty, total_valuation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        insertItemStmt.run(
          auditId,
          item.item_type,
          item.item_id,
          item.item_code,
          item.item_name,
          item.category_name,
          item.unit,
          item.cost_rate,
          item.system_stock,
          item.factory_stock,
          0,
          0,
          item.factory_stock,
          item.variance_qty,
          item.total_valuation
        );

        // --- 1-CLICK STOCK UPDATE IN ERP INVENTORY ---
        if (item.item_type === 'RAW_MATERIAL') {
          db.prepare(`
            UPDATE raw_materials 
            SET current_stock = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(item.factory_stock, item.item_id);
        } else {
          db.prepare(`
            UPDATE products 
            SET current_stock = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(item.factory_stock, item.item_id);
        }

        // Record stock movement if there is a variance
        if (Math.abs(item.variance_qty) > 0.001) {
          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, 'STOCK_AUDIT', ?, ?, ?, ?, ?, 'STOCK_AUDIT', ?, ?, ?, ?)
          `).run(
            item.item_type,
            item.item_id,
            item.item_name,
            item.variance_qty,
            item.unit,
            item.variance_qty,
            item.cost_rate,
            Math.abs(item.variance_qty * item.cost_rate),
            auditId,
            auditNo,
            `Monthly Factory Physical Stock Audit (${auditMonth}): Factory=${item.factory_stock} ${item.unit}`,
            username
          );
        }
      }

      // Record Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'STOCK_AUDIT_APPLIED', 'INVENTORY', ?, ?)
      `).run(
        username,
        auditNo,
        `Monthly 3-Branch Physical Audit saved for ${auditMonth}. Factory: ₹${factoryValuation.toFixed(2)}, Sarthana: ₹${sarthanaValuation.toFixed(2)}, Katargam: ₹${katargamValuation.toFixed(2)}. Total: ₹${totalValuation.toFixed(2)}`
      );

      return {
        success: true,
        audit_no: auditNo,
        audit_month: auditMonth,
        audit_date: auditDate,
        factory_valuation: Math.round(factoryValuation * 100) / 100,
        sarthana_valuation: Math.round(sarthanaValuation * 100) / 100,
        sarthana_notes: sarthanaNotes,
        katargam_valuation: Math.round(katargamValuation * 100) / 100,
        katargam_notes: katargamNotes,
        total_valuation: Math.round(totalValuation * 100) / 100,
        total_variance_value: Math.round(totalVarianceVal * 100) / 100,
        total_items: processedItems.length
      };
    });
  },

  /**
   * Get latest audit or audit for a specific month
   */
  getAuditByMonth(auditMonth = null) {
    const db = getDatabase();
    let query = 'SELECT * FROM branch_stock_audits';
    const params = [];
    if (auditMonth) {
      query += ' WHERE audit_month = ?';
      params.push(auditMonth);
    }
    query += ' ORDER BY audit_month DESC, id DESC LIMIT 1';

    const audit = db.prepare(query).get(...params);
    if (!audit) return null;

    const items = db.prepare(`
      SELECT * FROM branch_stock_audit_items 
      WHERE audit_id = ? 
      ORDER BY category_name, item_name
    `).all(audit.id);

    return {
      ...audit,
      items
    };
  },

  /**
   * Get historical audit list
   */
  getAuditHistory() {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, audit_no, audit_date, audit_month, auditor_name,
             factory_valuation, sarthana_valuation, sarthana_notes,
             katargam_valuation, katargam_notes, total_valuation,
             total_variance_value, status, notes, created_at
      FROM branch_stock_audits
      ORDER BY audit_month DESC, id DESC
    `).all();
  },

  /**
   * Import parsed CSV / Excel rows and update stock in 1-Click
   */
  importAuditData(parsedRows, auditMonth, auditorName = 'Admin', sarthanaVal = 0, sarthanaNotes = '', katargamVal = 0, katargamNotes = '', username = 'Admin') {
    const template = this.getAuditTemplate(auditMonth);
    const itemMap = new Map();

    // Map template items by code & lower name for fast matching
    template.items.forEach(it => {
      if (it.item_code) itemMap.set(it.item_code.toLowerCase().trim(), it);
      itemMap.set(it.item_name.toLowerCase().trim(), it);
    });

    const updatedItems = template.items.map(tItem => {
      const matched = parsedRows.find(r => {
        const rCode = (r['Item Code'] || r['ItemCode'] || r['code'] || '').toString().toLowerCase().trim();
        const rName = (r['Item Name'] || r['ItemName'] || r['name'] || '').toString().toLowerCase().trim();
        return (rCode && rCode === (tItem.item_code || '').toLowerCase().trim()) ||
               (rName && rName === tItem.item_name.toLowerCase().trim());
      });

      if (matched) {
        const fQty = Number(matched['Factory Stock (MFG)'] ?? matched['Factory Stock'] ?? matched['factory_stock'] ?? matched['Godown'] ?? matched['Physical Qty'] ?? tItem.factory_stock) || 0;
        const rate = Number(matched['Cost Rate'] ?? matched['Rate'] ?? matched['cost_rate'] ?? tItem.cost_rate) || tItem.cost_rate;

        return {
          ...tItem,
          cost_rate: rate,
          factory_stock: fQty,
          total_physical_stock: fQty,
          variance_qty: fQty - tItem.system_stock,
          total_valuation: fQty * rate
        };
      }
      return tItem;
    });

    return this.saveBranchStockAudit({
      audit_month: auditMonth || template.audit_month,
      audit_date: new Date().toISOString().split('T')[0],
      auditor_name: auditorName,
      sarthana_valuation: sarthanaVal || template.sarthana_valuation,
      sarthana_notes: sarthanaNotes || template.sarthana_notes,
      katargam_valuation: katargamVal || template.katargam_valuation,
      katargam_notes: katargamNotes || template.katargam_notes,
      notes: `Imported via 1-Click Excel Upload (${parsedRows.length} items parsed)`,
      items: updatedItems
    }, username);
  }
};
