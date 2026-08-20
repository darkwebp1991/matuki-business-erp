import { getDatabase, runInTransaction } from '../database/connection.js';

export const productService = {
  // --- UNITS & UNIT CONVERSIONS ---
  getUnits() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM units ORDER BY name ASC').all();
  },

  createUnit(data) {
    const db = getDatabase();
    const name = (data.name || '').trim();
    const symbol = (data.symbol || data.short_name || '').trim().toUpperCase();
    if (!name) throw new Error('Unit name is required');
    if (!symbol) throw new Error('Unit symbol / code is required');

    const existing = db.prepare('SELECT id FROM units WHERE UPPER(symbol) = ?').get(symbol);
    if (existing) throw new Error(`Unit with symbol "${symbol}" already exists.`);

    const result = db.prepare(`
      INSERT INTO units (name, symbol, unit_type, base_unit, conversion_to_base, is_base)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name,
      symbol,
      data.unit_type || 'COUNT',
      data.base_unit || symbol,
      Number(data.conversion_to_base) || 1.0,
      data.is_base ? 1 : 0
    );
    return { id: result.lastInsertRowid, name, symbol, ...data };
  },

  updateUnit(id, data) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    if (!existing) throw new Error('Unit not found');

    const name = (data.name || existing.name).trim();
    const symbol = (data.symbol || data.short_name || existing.symbol).trim().toUpperCase();

    const dup = db.prepare('SELECT id FROM units WHERE UPPER(symbol) = ? AND id != ?').get(symbol, id);
    if (dup) throw new Error(`Another unit with symbol "${symbol}" already exists.`);

    db.prepare(`
      UPDATE units SET
        name = ?,
        symbol = ?,
        unit_type = ?,
        base_unit = ?,
        conversion_to_base = ?,
        is_base = ?
      WHERE id = ?
    `).run(
      name,
      symbol,
      data.unit_type || existing.unit_type,
      data.base_unit || existing.base_unit,
      Number(data.conversion_to_base) || existing.conversion_to_base,
      data.is_base !== undefined ? (data.is_base ? 1 : 0) : existing.is_base,
      id
    );
    return { id, name, symbol, ...data };
  },

  deleteUnit(id) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    if (!existing) throw new Error('Unit not found');

    // Check if unit is in use by products or raw materials
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE UPPER(unit) = ? OR UPPER(unit) LIKE ?').get(existing.symbol.toUpperCase(), `%${existing.symbol.toUpperCase()}%`)?.count || 0;
    const rmCount = db.prepare('SELECT COUNT(*) as count FROM raw_materials WHERE UPPER(unit) = ? OR UPPER(unit) LIKE ?').get(existing.symbol.toUpperCase(), `%${existing.symbol.toUpperCase()}%`)?.count || 0;

    if (prodCount > 0 || rmCount > 0) {
      throw new Error(`Cannot delete unit "${existing.name}" (${existing.symbol}) because it is assigned to ${prodCount} products and ${rmCount} raw materials.`);
    }

    db.prepare('DELETE FROM units WHERE id = ?').run(id);
    return { success: true, message: `Unit "${existing.name}" (${existing.symbol}) deleted successfully.` };
  },

  convertQuantity(qty, fromUnitSymbol, toUnitSymbol) {
    if (fromUnitSymbol === toUnitSymbol) return qty;
    const db = getDatabase();
    const fromUnit = db.prepare('SELECT * FROM units WHERE symbol = ?').get(fromUnitSymbol);
    const toUnit = db.prepare('SELECT * FROM units WHERE symbol = ?').get(toUnitSymbol);

    if (!fromUnit || !toUnit) return qty;
    if (fromUnit.unit_type !== toUnit.unit_type) return qty; // cannot convert weight to volume

    // convert to base, then to target
    const inBase = qty * (fromUnit.conversion_to_base || 1.0);
    const result = inBase / (toUnit.conversion_to_base || 1.0);
    return Math.round(result * 10000) / 10000;
  },

  // --- CATEGORIES ---
  getCategories(type = null) {
    const db = getDatabase();
    if (type) {
      return db.prepare(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) as product_count,
          (SELECT COUNT(*) FROM raw_materials rm WHERE rm.category_id = c.id AND rm.active = 1) as raw_material_count
        FROM categories c 
        WHERE c.type = ? 
        ORDER BY c.name ASC
      `).all(type);
    }
    return db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) as product_count,
        (SELECT COUNT(*) FROM raw_materials rm WHERE rm.category_id = c.id AND rm.active = 1) as raw_material_count
      FROM categories c 
      ORDER BY c.type ASC, c.name ASC
    `).all();
  },

  createCategory(data) {
    const db = getDatabase();
    const name = (data.name || '').trim();
    if (!name) throw new Error('Category name is required');

    const existing = db.prepare('SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)').get(name);
    if (existing) throw new Error(`Category "${name}" already exists.`);

    const result = db.prepare('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)').run(
      name, data.type || 'FINISHED_PRODUCT', data.description || ''
    );
    return { id: result.lastInsertRowid, name, type: data.type || 'FINISHED_PRODUCT', description: data.description || '' };
  },

  updateCategory(id, data) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new Error('Category not found');

    const name = (data.name || existing.name).trim();
    if (!name) throw new Error('Category name cannot be empty');

    const dup = db.prepare('SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?').get(name, id);
    if (dup) throw new Error(`Another category with name "${name}" already exists.`);

    db.prepare('UPDATE categories SET name = ?, type = ?, description = ? WHERE id = ?').run(
      name,
      data.type || existing.type,
      data.description !== undefined ? data.description : existing.description,
      id
    );
    return { id, name, type: data.type || existing.type, description: data.description !== undefined ? data.description : existing.description };
  },

  deleteCategory(id) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new Error('Category not found');

    // Reassign any linked products and raw materials to NULL
    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('UPDATE raw_materials SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    return { success: true, message: `Category "${existing.name}" deleted successfully.` };
  },

  // --- PRODUCTS ---
  getProducts(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT p.*, c.name as category_name, r.name as recipe_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN recipes r ON p.recipe_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.product_type) {
      query += ' AND p.product_type = ?';
      params.push(filters.product_type);
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.active !== undefined) {
      query += ' AND p.active = ?';
      params.push(filters.active ? 1 : 0);
    } else if (!filters.include_inactive) {
      query += ' AND p.active = 1';
    }

    query += ' ORDER BY p.name ASC';
    return db.prepare(query).all(...params);
  },

  getProductById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT p.*, c.name as category_name, r.name as recipe_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN recipes r ON p.recipe_id = r.id
      WHERE p.id = ?
    `).get(id);
  },

  createProduct(data, username = 'Admin') {
    return runInTransaction((db) => {
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        throw new Error('Product / Item name is required.');
      }

      // Check duplicate name
      const existingByName = db.prepare('SELECT id, code, name FROM products WHERE LOWER(TRIM(name)) = LOWER(?) AND active = 1').get(trimmedName);
      if (existingByName) {
        throw new Error(`An item with name "${trimmedName}" already exists (${existingByName.code})! Duplicate items are not allowed.`);
      }

      // Check duplicate code if explicitly provided
      if (data.code && data.code.trim()) {
        const existingByCode = db.prepare('SELECT id, code, name FROM products WHERE LOWER(TRIM(code)) = LOWER(?)').get(data.code.trim());
        if (existingByCode) {
          throw new Error(`Item code "${data.code.trim()}" is already assigned to "${existingByCode.name}"!`);
        }
      }

      // Check duplicate barcode if provided
      if (data.barcode && data.barcode.trim()) {
        const existingByBarcode = db.prepare('SELECT id, code, name FROM products WHERE barcode = ? AND barcode != \'\'').get(data.barcode.trim());
        if (existingByBarcode) {
          throw new Error(`Barcode "${data.barcode.trim()}" is already assigned to "${existingByBarcode.name}" (${existingByBarcode.code})!`);
        }
      }

      // generate unique code if not provided
      let code = data.code ? data.code.trim() : null;
      if (!code) {
        const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count + 1;
        code = `PRD-${String(count).padStart(3, '0')}`;
      }

      const result = db.prepare(`
        INSERT INTO products (
          code, barcode, name, category_id, subcategory, product_type, unit,
          purchase_rate, selling_rate, wholesale_rate, min_stock, max_stock,
          gst_rate, hsn_code, opening_stock, opening_stock_rate, current_stock, available_online, active, recipe_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code,
        data.barcode ? data.barcode.trim() : null,
        trimmedName,
        data.category_id || null,
        data.subcategory || '',
        data.product_type || 'FINISHED_PRODUCT',
        data.unit || 'KG',
        data.purchase_rate || 0.0,
        data.selling_rate || 0.0,
        data.wholesale_rate || 0.0,
        data.min_stock || 5.0,
        data.max_stock || 500.0,
        data.gst_rate !== undefined ? data.gst_rate : 5.0,
        data.hsn_code || '21069099',
        data.opening_stock || 0.0,
        data.opening_stock_rate || 0.0,
        data.opening_stock || 0.0, // current stock starts with opening
        data.available_online !== undefined ? (data.available_online ? 1 : 0) : 1,
        data.active !== undefined ? (data.active ? 1 : 0) : 1,
        data.recipe_id || null
      );

      const newId = result.lastInsertRowid;

      // Record opening stock movement if opening_stock > 0
      if (Number(data.opening_stock) > 0) {
        db.prepare(`
          INSERT INTO stock_movements (
            movement_date, item_type, item_id, item_name, movement_type,
            quantity, unit, base_quantity, cost_rate, total_cost_value,
            reference_type, reference_id, reference_no, notes, created_by
          ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, 'OPENING_STOCK', ?, ?, ?, ?, ?, 'OPENING', ?, 'INIT', 'Initial product opening stock', ?)
        `).run(
          data.product_type || 'FINISHED_PRODUCT',
          newId,
          trimmedName,
          data.opening_stock,
          data.unit || 'KG',
          data.opening_stock,
          data.opening_stock_rate || 0.0,
          Number(data.opening_stock) * Number(data.opening_stock_rate || 0.0),
          newId,
          username
        );
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'PRODUCTS', ?, ?)
      `).run(username, String(newId), `Created product: ${trimmedName} (${code})`);

      return this.getProductById(newId);
    });
  },

  updateProduct(id, data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getProductById(id);
    if (!existing) throw new Error('Product not found');

    const trimmedName = data.name !== undefined ? data.name.trim() : existing.name;
    if (!trimmedName) {
      throw new Error('Product name cannot be empty.');
    }

    if (trimmedName && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupName = db.prepare('SELECT id, code, name FROM products WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ? AND active = 1').get(trimmedName, id);
      if (dupName) {
        throw new Error(`Another item with name "${trimmedName}" already exists (Code: ${dupName.code})!`);
      }
    }

    if (data.code && data.code.trim() && data.code.trim().toLowerCase() !== (existing.code || '').toLowerCase()) {
      const dupCode = db.prepare('SELECT id, code, name FROM products WHERE LOWER(TRIM(code)) = LOWER(?) AND id != ?').get(data.code.trim(), id);
      if (dupCode) {
        throw new Error(`Item code "${data.code.trim()}" is already assigned to "${dupCode.name}"!`);
      }
    }

    if (data.barcode && data.barcode.trim() && data.barcode.trim() !== (existing.barcode || '')) {
      const dupBarcode = db.prepare('SELECT id, code, name FROM products WHERE barcode = ? AND barcode != \'\' AND id != ?').get(data.barcode.trim(), id);
      if (dupBarcode) {
        throw new Error(`Barcode "${data.barcode.trim()}" is already assigned to "${dupBarcode.name}" (${dupBarcode.code})!`);
      }
    }

    db.prepare(`
      UPDATE products SET
        code = ?,
        barcode = ?,
        name = ?,
        category_id = ?,
        subcategory = ?,
        product_type = ?,
        unit = ?,
        purchase_rate = ?,
        selling_rate = ?,
        wholesale_rate = ?,
        min_stock = ?,
        max_stock = ?,
        gst_rate = ?,
        hsn_code = ?,
        available_online = ?,
        active = ?,
        recipe_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.code ?? existing.code,
      data.barcode ?? existing.barcode,
      data.name ?? existing.name,
      data.category_id ?? existing.category_id,
      data.subcategory ?? existing.subcategory,
      data.product_type ?? existing.product_type,
      data.unit ?? existing.unit,
      data.purchase_rate ?? existing.purchase_rate,
      data.selling_rate ?? existing.selling_rate,
      data.wholesale_rate ?? existing.wholesale_rate,
      data.min_stock ?? existing.min_stock,
      data.max_stock ?? existing.max_stock,
      data.gst_rate ?? existing.gst_rate,
      data.hsn_code ?? existing.hsn_code,
      data.available_online !== undefined ? (data.available_online ? 1 : 0) : (existing.available_online !== undefined ? existing.available_online : 1),
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      data.recipe_id ?? existing.recipe_id,
      id
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'UPDATE', 'PRODUCTS', ?, ?)
    `).run(username, String(id), `Updated product: ${data.name || existing.name} (Online: ${data.available_online !== undefined ? (data.available_online ? 'YES' : 'NO') : 'Unchanged'})`);

    return this.getProductById(id);
  },

  toggleOnlineStatus(id, availableOnline, username = 'Admin') {
    const db = getDatabase();
    const val = availableOnline ? 1 : 0;
    db.prepare('UPDATE products SET available_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(val, id);
    return this.getProductById(id);
  },

  deleteProduct(id, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getProductById(id);
    if (!existing) throw new Error('Product not found');

    // Check if item has transactions in sales, purchases, or advance orders
    const saleCount = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(id)?.count || 0;
    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?').get(id)?.count || 0;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM advance_order_items WHERE product_id = ?').get(id)?.count || 0;
    const returnCount = db.prepare('SELECT COUNT(*) as count FROM sales_return_items WHERE product_id = ?').get(id)?.count || 0;

    if (saleCount > 0 || purchaseCount > 0 || orderCount > 0 || returnCount > 0) {
      // Soft delete: mark active = 0 and available_online = 0 to preserve historical accounting & rojmel integrity
      db.prepare('UPDATE products SET active = 0, available_online = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'SOFT_DELETE', 'PRODUCTS', ?, ?)
      `).run(username, String(id), `Deactivated product with transaction history: ${existing.name}`);
      return { success: true, message: `Item "${existing.name}" deleted and removed from inventory.`, soft_deleted: true };
    } else {
      // Hard delete: remove clean from related records
      try {
        db.prepare('DELETE FROM recipe_items WHERE product_id = ?').run(id);
        db.prepare('DELETE FROM manufacturing_items WHERE product_id = ?').run(id);
        db.prepare('UPDATE recipes SET product_id = NULL WHERE product_id = ?').run(id);
        db.prepare('DELETE FROM stock_movements WHERE (item_type = ? AND item_id = ?) OR item_id = ?').run(existing.product_type || 'FINISHED_PRODUCT', id, id);
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        db.prepare(`
          INSERT INTO audit_logs (username, action, module, record_id, notes)
          VALUES (?, 'DELETE', 'PRODUCTS', ?, ?)
        `).run(username, String(id), `Hard deleted product: ${existing.name}`);
        return { success: true, message: `Item "${existing.name}" deleted permanently.`, hard_deleted: true };
      } catch (err) {
        db.prepare('UPDATE products SET active = 0, available_online = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: true, message: `Item "${existing.name}" deleted and removed from inventory.`, soft_deleted: true };
      }
    }
  },

  getOnlineMenu() {
    const db = getDatabase();
    return db.prepare(`
      SELECT p.id, p.code, p.name, p.category_id, c.name as category_name,
             p.selling_rate, p.unit, p.subcategory, p.available_online
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.available_online = 1
      ORDER BY c.name ASC, p.name ASC
    `).all();
  },

  // --- RAW MATERIALS ---
  getRawMaterials(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT rm.*, c.name as category_name, s.name as default_supplier_name
      FROM raw_materials rm
      LEFT JOIN categories c ON rm.category_id = c.id
      LEFT JOIN suppliers s ON rm.default_supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (rm.name LIKE ? OR rm.code LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s);
    }
    if (filters.active !== undefined) {
      query += ' AND rm.active = ?';
      params.push(filters.active ? 1 : 0);
    } else if (!filters.include_inactive) {
      query += ' AND rm.active = 1';
    }

    query += ' ORDER BY rm.name ASC';
    return db.prepare(query).all(...params);
  },

  getRawMaterialById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT rm.*, c.name as category_name, s.name as default_supplier_name
      FROM raw_materials rm
      LEFT JOIN categories c ON rm.category_id = c.id
      LEFT JOIN suppliers s ON rm.default_supplier_id = s.id
      WHERE rm.id = ?
    `).get(id);
  },

  createRawMaterial(data, username = 'Admin') {
    return runInTransaction((db) => {
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        throw new Error('Raw material name is required.');
      }

      // Check duplicate name
      const existingByName = db.prepare('SELECT id, code, name FROM raw_materials WHERE LOWER(TRIM(name)) = LOWER(?) AND active = 1').get(trimmedName);
      if (existingByName) {
        throw new Error(`A raw material with name "${trimmedName}" already exists (${existingByName.code})! Duplicate entries are not allowed.`);
      }

      // Check duplicate code if provided
      if (data.code && data.code.trim()) {
        const existingByCode = db.prepare('SELECT id, code, name FROM raw_materials WHERE LOWER(TRIM(code)) = LOWER(?)').get(data.code.trim());
        if (existingByCode) {
          throw new Error(`Raw material code "${data.code.trim()}" is already assigned to "${existingByCode.name}"!`);
        }
      }

      let code = data.code ? data.code.trim() : null;
      if (!code) {
        const count = db.prepare('SELECT COUNT(*) as count FROM raw_materials').get().count + 1;
        code = `RM-${String(count).padStart(3, '0')}`;
      }

      const rate = Number(data.current_purchase_rate) || 0.0;
      const result = db.prepare(`
        INSERT INTO raw_materials (
          code, name, category_id, unit, current_purchase_rate, average_purchase_rate,
          last_purchase_rate, standard_rate, min_stock, opening_stock, current_stock,
          default_supplier_id, gst_rate, hsn_code, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code,
        trimmedName,
        data.category_id || null,
        data.unit || 'KG',
        rate,
        rate, // initial average is the current rate
        rate, // initial last rate is the current rate
        data.standard_rate || rate,
        data.min_stock || 10.0,
        data.opening_stock || 0.0,
        data.opening_stock || 0.0,
        data.default_supplier_id || null,
        data.gst_rate !== undefined ? data.gst_rate : 5.0,
        data.hsn_code || '08013210',
        data.active !== undefined ? (data.active ? 1 : 0) : 1
      );

      const newId = result.lastInsertRowid;

      if (Number(data.opening_stock) > 0) {
        db.prepare(`
          INSERT INTO stock_movements (
            movement_date, item_type, item_id, item_name, movement_type,
            quantity, unit, base_quantity, cost_rate, total_cost_value,
            reference_type, reference_id, reference_no, notes, created_by
          ) VALUES (CURRENT_TIMESTAMP, 'RAW_MATERIAL', ?, ?, 'OPENING_STOCK', ?, ?, ?, ?, ?, 'OPENING', ?, 'INIT', 'Initial raw material opening stock', ?)
        `).run(
          newId,
          trimmedName,
          data.opening_stock,
          data.unit || 'KG',
          data.opening_stock,
          rate,
          Number(data.opening_stock) * rate,
          newId,
          username
        );
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'RAW_MATERIALS', ?, ?)
      `).run(username, String(newId), `Created raw material: ${trimmedName} (${code})`);

      return this.getRawMaterialById(newId);
    });
  },

  updateRawMaterial(id, data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getRawMaterialById(id);
    if (!existing) throw new Error('Raw material not found');

    const trimmedName = data.name !== undefined ? data.name.trim() : existing.name;
    if (!trimmedName) {
      throw new Error('Raw material name cannot be empty.');
    }

    if (trimmedName && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupName = db.prepare('SELECT id, code, name FROM raw_materials WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ? AND active = 1').get(trimmedName, id);
      if (dupName) {
        throw new Error(`Another raw material with name "${trimmedName}" already exists (${dupName.code})!`);
      }
    }

    if (data.code && data.code.trim() && data.code.trim().toLowerCase() !== (existing.code || '').toLowerCase()) {
      const dupCode = db.prepare('SELECT id, code, name FROM raw_materials WHERE LOWER(TRIM(code)) = LOWER(?) AND id != ?').get(data.code.trim(), id);
      if (dupCode) {
        throw new Error(`Raw material code "${data.code.trim()}" is already assigned to "${dupCode.name}"!`);
      }
    }

    const newRate = data.current_purchase_rate !== undefined ? Number(data.current_purchase_rate) : existing.current_purchase_rate;

    // Check if rate changed and log to price history
    if (newRate !== existing.current_purchase_rate) {
      db.prepare(`
        INSERT INTO raw_material_price_history (raw_material_id, old_rate, new_rate, effective_date)
        VALUES (?, ?, ?, CURRENT_DATE)
      `).run(id, existing.current_purchase_rate, newRate);
    }

    db.prepare(`
      UPDATE raw_materials SET
        code = ?,
        name = ?,
        category_id = ?,
        unit = ?,
        current_purchase_rate = ?,
        standard_rate = ?,
        min_stock = ?,
        default_supplier_id = ?,
        gst_rate = ?,
        hsn_code = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.code ?? existing.code,
      data.name ?? existing.name,
      data.category_id ?? existing.category_id,
      data.unit ?? existing.unit,
      newRate,
      data.standard_rate ?? existing.standard_rate,
      data.min_stock ?? existing.min_stock,
      data.default_supplier_id ?? existing.default_supplier_id,
      data.gst_rate ?? existing.gst_rate,
      data.hsn_code ?? existing.hsn_code,
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      id
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'EDIT', 'RAW_MATERIALS', ?, ?)
    `).run(username, String(id), `Updated raw material: ${data.name || existing.name}`);

    return this.getRawMaterialById(id);
  },

  deleteRawMaterial(id, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getRawMaterialById(id);
    if (!existing) throw new Error('Raw material not found');

    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE raw_material_id = ?').get(id)?.count || 0;

    if (purchaseCount > 0) {
      db.prepare('UPDATE raw_materials SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'SOFT_DELETE', 'RAW_MATERIALS', ?, ?)
      `).run(username, String(id), `Deactivated raw material with purchase history: ${existing.name}`);
      return { success: true, message: `Raw material "${existing.name}" deleted and hidden from inventory.`, soft_deleted: true };
    } else {
      try {
        db.prepare('DELETE FROM recipe_items WHERE raw_material_id = ?').run(id);
        db.prepare('DELETE FROM stock_movements WHERE item_id = ? AND item_type = \'RAW_MATERIAL\'').run(id);
        db.prepare('DELETE FROM raw_materials WHERE id = ?').run(id);
        db.prepare(`
          INSERT INTO audit_logs (username, action, module, record_id, notes)
          VALUES (?, 'DELETE', 'RAW_MATERIALS', ?, ?)
        `).run(username, String(id), `Permanently deleted raw material: ${existing.name}`);
        return { success: true, message: `Raw material "${existing.name}" deleted permanently.`, hard_deleted: true };
      } catch (err) {
        db.prepare('UPDATE raw_materials SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: true, message: `Raw material "${existing.name}" deactivated and removed from inventory.`, soft_deleted: true };
      }
    }
  },

  // Bulk Import Products / Items from Excel/CSV
  bulkImportProducts(items, username = 'Admin') {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided for bulk import');
    }

    return runInTransaction((db) => {
      let inserted = 0;
      let updated = 0;
      const errors = [];

      const existingCategories = db.prepare('SELECT * FROM categories').all();
      const existingUnits = db.prepare('SELECT * FROM units').all();

      const getOrCreateCategoryId = (catName, prodType = 'FINISHED_PRODUCT') => {
        if (!catName) return null;
        const trimmed = catName.trim();
        const found = existingCategories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
        if (found) return found.id;
        const res = db.prepare('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)').run(trimmed, prodType, 'Auto-created from Excel import');
        const newCat = { id: res.lastInsertRowid, name: trimmed, type: prodType };
        existingCategories.push(newCat);
        return newCat.id;
      };

      const getValidUnit = (unitSymbol) => {
        if (!unitSymbol) return 'KG';
        const trimmed = unitSymbol.trim().toUpperCase();
        const found = existingUnits.find(u => u.symbol.toUpperCase() === trimmed || u.name.toUpperCase() === trimmed);
        return found ? found.symbol : 'KG';
      };

      const insertStmt = db.prepare(`
        INSERT INTO products (
          code, name, category_id, unit,
          purchase_rate, selling_rate, wholesale_rate, min_stock,
          current_stock, opening_stock, opening_stock_rate, hsn_code, gst_rate,
          product_type, available_online, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStmt = db.prepare(`
        UPDATE products SET
          category_id = COALESCE(?, category_id),
          unit = COALESCE(?, unit),
          purchase_rate = ?,
          selling_rate = ?,
          wholesale_rate = ?,
          min_stock = ?,
          hsn_code = ?,
          available_online = ?
        WHERE code = ? OR name = ?
      `);

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        try {
          const name = (item.name || item['Item Name'] || '').trim();
          if (!name) {
            errors.push(`Row ${idx + 1}: Item name is required`);
            continue;
          }

          const code = (item.code || item['Item Code'] || `ITM-${String(Date.now()).slice(-6)}-${idx + 1}`).trim();
          const categoryName = item.category || item['Category'] || 'General Sweets';
          const categoryId = getOrCreateCategoryId(categoryName);
          const unit = getValidUnit(item.unit || item['Unit']);
          const salePrice = Number(item.sale_price || item['Sale Price (Rs)'] || item['Sale Price'] || 0);
          const costPrice = Number(item.cost_price || item['Cost Price (Rs)'] || item['Cost Price'] || 0);
          const wholesalePrice = Number(item.wholesale_price || item['Wholesale Price'] || salePrice);
          const minStock = Number(item.min_stock_alert || item['Min Stock Alert'] || item['Min Stock'] || 5);
          const hsnCode = (item.hsn_code || item['HSN Code'] || '21069099').trim();
          const availableOnline = item.available_online !== undefined ? (Number(item.available_online) ? 1 : 0) : 1;

          const existing = db.prepare('SELECT id FROM products WHERE code = ? OR name = ?').get(code, name);
          if (existing) {
            updateStmt.run(categoryId, unit, costPrice, salePrice, wholesalePrice, minStock, hsnCode, availableOnline, code, name);
            updated++;
          } else {
            insertStmt.run(
              code, name, categoryId, unit,
              costPrice, salePrice, wholesalePrice, minStock,
              0.0, 0.0, costPrice, hsnCode, 5.0,
              'FINISHED_PRODUCT', availableOnline, 1
            );
            inserted++;
          }
        } catch (err) {
          errors.push(`Row ${idx + 1} (${item.name || 'Unknown'}): ${err.message}`);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'BULK_IMPORT', 'PRODUCTS', 'ALL', ?)
      `).run(username, `Bulk imported ${inserted} products, updated ${updated} products from Excel/CSV`);

      return {
        success: true,
        inserted,
        updated,
        total: items.length,
        errors
      };
    });
  }
};
