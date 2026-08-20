import { getDatabase } from '../database/connection.js';

export const vasanMasterService = {
  // Get all Vasan Master items
  getAllVasans(includeInactive = false) {
    const db = getDatabase();
    let query = 'SELECT * FROM vasan_master';
    if (!includeInactive) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY id ASC';
    return db.prepare(query).all();
  },

  // Get single Vasan by ID
  getVasanById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM vasan_master WHERE id = ?').get(id);
  },

  // Find Vasan by Name (fuzzy matching for sales auto-fill)
  findVasanByName(name) {
    if (!name) return null;
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM vasan_master 
      WHERE (name LIKE ? OR gujarati_name LIKE ?) AND active = 1
      LIMIT 1
    `).get(`%${name.trim()}%`, `%${name.trim()}%`);
  },

  // Create new Vasan master item
  createVasan(data, username = 'Admin') {
    const db = getDatabase();
    if (!data.name || !data.name.trim()) {
      throw new Error('Vasan item name is required');
    }

    const name = data.name.trim();
    const existing = db.prepare('SELECT id FROM vasan_master WHERE LOWER(name) = LOWER(?)').get(name);
    if (existing) {
      throw new Error(`A Vasan item with name "${name}" already exists`);
    }

    const gujaratiName = (data.gujarati_name || '').trim();
    const unit = data.unit || 'PCS';
    const replacementPrice = Number(data.replacement_price) >= 0 ? Number(data.replacement_price) : 500.0;
    const defaultDeposit = Number(data.default_deposit) >= 0 ? Number(data.default_deposit) : 0.0;
    const totalInventoryQty = Number(data.total_inventory_qty) >= 0 ? Number(data.total_inventory_qty) : 100.0;
    const notes = data.notes || '';

    const stmt = db.prepare(`
      INSERT INTO vasan_master (name, gujarati_name, unit, replacement_price, default_deposit, total_inventory_qty, notes, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(name, gujaratiName, unit, replacementPrice, defaultDeposit, totalInventoryQty, notes);
    return this.getVasanById(result.lastInsertRowid);
  },

  // Update existing Vasan master item
  updateVasan(id, data, username = 'Admin') {
    const db = getDatabase();
    const existing = this.getVasanById(id);
    if (!existing) {
      throw new Error('Vasan item not found');
    }

    if (data.name && data.name.trim()) {
      const duplicate = db.prepare('SELECT id FROM vasan_master WHERE LOWER(name) = LOWER(?) AND id != ?').get(data.name.trim(), id);
      if (duplicate) {
        throw new Error(`Another Vasan item named "${data.name.trim()}" already exists`);
      }
    }

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const gujaratiName = data.gujarati_name !== undefined ? data.gujarati_name.trim() : existing.gujarati_name;
    const unit = data.unit !== undefined ? data.unit : existing.unit;
    const replacementPrice = data.replacement_price !== undefined ? Number(data.replacement_price) : existing.replacement_price;
    const defaultDeposit = data.default_deposit !== undefined ? Number(data.default_deposit) : existing.default_deposit;
    const totalInventoryQty = data.total_inventory_qty !== undefined ? Number(data.total_inventory_qty) : existing.total_inventory_qty;
    const notes = data.notes !== undefined ? data.notes : existing.notes;
    const active = data.active !== undefined ? (data.active ? 1 : 0) : existing.active;

    db.prepare(`
      UPDATE vasan_master
      SET name = ?, gujarati_name = ?, unit = ?, replacement_price = ?, default_deposit = ?, total_inventory_qty = ?, notes = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, gujaratiName, unit, replacementPrice, defaultDeposit, totalInventoryQty, notes, active, id);

    return this.getVasanById(id);
  },

  // Delete or soft-delete Vasan master item
  deleteVasan(id) {
    const db = getDatabase();
    // Check if used in vasan_ledger
    const inUse = db.prepare('SELECT COUNT(*) as count FROM vasan_ledger WHERE vasan_id = ?').get(id);
    if (inUse && inUse.count > 0) {
      // Soft delete
      db.prepare('UPDATE vasan_master SET active = 0 WHERE id = ?').run(id);
      return { success: true, message: 'Vasan item marked as inactive as it has ledger transaction history' };
    } else {
      db.prepare('DELETE FROM vasan_master WHERE id = ?').run(id);
      return { success: true, message: 'Vasan item deleted permanently' };
    }
  }
};
