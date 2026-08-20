import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';
import { productService } from './productService.js';

export const recipeService = {
  getRecipes(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT r.*, p.name as product_name, p.code as product_code, p.selling_rate,
             rv.version_number, rv.status as version_status, rv.expected_yield,
             rv.labour_cost_rate, rv.overhead_cost_rate, rv.packaging_cost
      FROM recipes r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN recipe_versions rv ON r.active_version_id = rv.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (r.name LIKE ? OR r.code LIKE ? OR p.name LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.active !== undefined) {
      query += ' AND r.active = ?';
      params.push(filters.active ? 1 : 0);
    }

    query += ' ORDER BY r.name ASC';
    return db.prepare(query).all(...params);
  },

  getRecipeById(id) {
    const db = getDatabase();
    const recipe = db.prepare(`
      SELECT r.*, p.name as product_name, p.code as product_code, p.selling_rate, p.unit as product_unit
      FROM recipes r
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.id = ?
    `).get(id);

    if (!recipe) return null;

    // Load all versions
    const versions = db.prepare(`
      SELECT * FROM recipe_versions
      WHERE recipe_id = ?
      ORDER BY version_number DESC
    `).all(id);

    // Load items for active or specified version
    const activeVersionId = recipe.active_version_id || (versions[0] ? versions[0].id : null);
    let items = [];
    if (activeVersionId) {
      items = this.getRecipeVersionItems(activeVersionId);
    }

    return {
      ...recipe,
      versions,
      activeVersion: versions.find(v => v.id === activeVersionId) || null,
      items
    };
  },

  getRecipeVersionItems(versionId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT ri.*,
        CASE
          WHEN ri.item_type = 'RAW_MATERIAL' THEN rm.name
          WHEN ri.item_type = 'SEMI_FINISHED' THEN p.name
          ELSE rm.name
        END as item_name,
        CASE
          WHEN ri.item_type = 'RAW_MATERIAL' THEN rm.code
          WHEN ri.item_type = 'SEMI_FINISHED' THEN p.code
          ELSE rm.code
        END as item_code,
        CASE
          WHEN ri.item_type = 'RAW_MATERIAL' THEN rm.current_stock
          WHEN ri.item_type = 'SEMI_FINISHED' THEN p.current_stock
          ELSE 0.0
        END as available_stock,
        rm.current_purchase_rate,
        rm.average_purchase_rate,
        rm.last_purchase_rate
      FROM recipe_items ri
      LEFT JOIN raw_materials rm ON ri.raw_material_id = rm.id
      LEFT JOIN products p ON ri.semi_finished_product_id = p.id
      WHERE ri.recipe_version_id = ?
      ORDER BY ri.id ASC
    `).all(versionId);
  },

  // Calculate detailed costing for a recipe with custom scaling or costing method
  calculateRecipeCost(recipeId, versionId = null, targetBatchSize = null, costingMethodOverride = null) {
    const db = getDatabase();
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) throw new Error('Recipe not found');

    const version = versionId ? recipe.versions.find(v => v.id === versionId) : recipe.activeVersion;
    if (!version) throw new Error('Recipe version not found');

    const items = this.getRecipeVersionItems(version.id);
    const settings = settingsService.getSettings();
    const method = costingMethodOverride || settings.costing_method || 'WEIGHTED_AVERAGE';

    const baseBatchSize = Number(recipe.batch_size) || 10.0;
    const targetSize = targetBatchSize !== null ? Number(targetBatchSize) : baseBatchSize;
    const scaleFactor = baseBatchSize > 0 ? targetSize / baseBatchSize : 1.0;

    let totalMaterialCost = 0.0;
    const calculatedItems = items.map(item => {
      const scaledQty = Number(item.quantity) * scaleFactor;

      // Determine rate based on costing method
      let rate = 0.0;
      if (item.item_type === 'RAW_MATERIAL') {
        if (method === 'LAST_PURCHASE') rate = Number(item.last_purchase_rate) || Number(item.current_purchase_rate);
        else if (method === 'STANDARD') rate = Number(item.standard_rate) || Number(item.average_purchase_rate);
        else rate = Number(item.average_purchase_rate) || Number(item.current_purchase_rate);
      } else if (item.item_type === 'SEMI_FINISHED') {
        // Find semi finished product's purchase rate or calculated recipe cost
        const sfp = db.prepare('SELECT purchase_rate FROM products WHERE id = ?').get(item.semi_finished_product_id);
        rate = sfp ? Number(sfp.purchase_rate) : 0.0;
      } else {
        rate = Number(item.current_purchase_rate) || Number(item.standard_rate);
      }

      // Convert unit if item unit differs from raw material base unit
      const lineCost = scaledQty * rate;
      totalMaterialCost += lineCost;

      return {
        ...item,
        scaled_quantity: Math.round(scaledQty * 1000) / 1000,
        rate_used: rate,
        costing_method: method,
        line_cost: Math.round(lineCost * 100) / 100
      };
    });

    // Calculate Labour Cost
    let totalLabour = 0.0;
    if (version.labour_cost_type === 'PER_KG') {
      totalLabour = targetSize * Number(version.labour_cost_rate || 0.0);
    } else {
      // PER_BATCH scales with batch multiplier
      totalLabour = Number(version.labour_cost_rate || 0.0) * scaleFactor;
    }

    // Calculate Overhead Cost (Gas, Electricity, Machinery)
    let totalOverhead = 0.0;
    if (version.overhead_cost_type === 'PCT_MATERIAL') {
      totalOverhead = (totalMaterialCost * Number(version.overhead_cost_rate || 0.0)) / 100.0;
    } else if (version.overhead_cost_type === 'PER_KG') {
      totalOverhead = targetSize * Number(version.overhead_cost_rate || 0.0);
    } else {
      totalOverhead = Number(version.overhead_cost_rate || 0.0) * scaleFactor;
    }

    // Packaging Cost
    const totalPackaging = Number(version.packaging_cost || 0.0) * scaleFactor;

    // Total Cost
    const totalBatchCost = totalMaterialCost + totalLabour + totalOverhead + totalPackaging;

    // Expected Output taking into account expected wastage %
    const expectedWastagePct = Number(version.expected_wastage_pct) || 0.0;
    const expectedYield = targetSize * (1 - (expectedWastagePct / 100.0));
    const costPerKg = expectedYield > 0 ? totalBatchCost / expectedYield : 0.0;
    const costPerGm = costPerKg / 1000.0;

    return {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      version_number: version.version_number,
      target_batch_size: targetSize,
      target_batch_unit: recipe.batch_unit,
      expected_yield: Math.round(expectedYield * 1000) / 1000,
      expected_wastage_pct: expectedWastagePct,
      costing_method: method,
      items: calculatedItems,
      total_material_cost: Math.round(totalMaterialCost * 100) / 100,
      total_labour_cost: Math.round(totalLabour * 100) / 100,
      total_overhead_cost: Math.round(totalOverhead * 100) / 100,
      total_packaging_cost: Math.round(totalPackaging * 100) / 100,
      total_batch_cost: Math.round(totalBatchCost * 100) / 100,
      cost_per_kg: Math.round(costPerKg * 100) / 100,
      cost_per_gm: Math.round(costPerGm * 10000) / 10000,
      selling_rate: Number(recipe.selling_rate) || 0.0,
      estimated_gross_profit_per_kg: Math.round(((Number(recipe.selling_rate) || 0) - costPerKg) * 100) / 100,
      estimated_gross_margin_pct: Number(recipe.selling_rate) > 0
        ? Math.round((((Number(recipe.selling_rate) - costPerKg) / Number(recipe.selling_rate)) * 100) * 10) / 10
        : 0
    };
  },

  createRecipe(data, username = 'Admin') {
    return runInTransaction((db) => {
      let code = data.code;
      if (!code) {
        const count = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count + 1;
        code = `REC-${String(count).padStart(3, '0')}`;
      }

      // 1. Create Recipe Header
      const recipeRes = db.prepare(`
        INSERT INTO recipes (code, name, product_id, batch_size, batch_unit, description, is_semi_finished, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        code,
        data.name,
        data.product_id,
        data.batch_size || 10.0,
        data.batch_unit || 'KG',
        data.description || '',
        data.is_semi_finished ? 1 : 0
      );

      const recipeId = recipeRes.lastInsertRowid;

      // 2. Create Initial Recipe Version (v1)
      const verRes = db.prepare(`
        INSERT INTO recipe_versions (
          recipe_id, version_number, effective_date, expected_yield, expected_yield_unit,
          expected_wastage_pct, labour_cost_type, labour_cost_rate, overhead_cost_type,
          overhead_cost_rate, packaging_cost, notes, status, created_by, approved_by
        ) VALUES (?, 1, CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        recipeId,
        data.expected_yield || data.batch_size || 10.0,
        data.batch_unit || 'KG',
        data.expected_wastage_pct || 4.0,
        data.labour_cost_type || 'PER_BATCH',
        data.labour_cost_rate || 500.0,
        data.overhead_cost_type || 'PER_BATCH',
        data.overhead_cost_rate || 200.0,
        data.packaging_cost || 100.0,
        data.notes || 'Initial standard recipe version',
        username,
        username
      );

      const versionId = verRes.lastInsertRowid;
      db.prepare('UPDATE recipes SET active_version_id = ? WHERE id = ?').run(versionId, recipeId);
      db.prepare('UPDATE products SET recipe_id = ? WHERE id = ?').run(recipeId, data.product_id);

      // 3. Insert Items
      if (Array.isArray(data.items)) {
        const insertItem = db.prepare(`
          INSERT INTO recipe_items (recipe_version_id, item_type, raw_material_id, semi_finished_product_id, quantity, unit, standard_rate, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(
            versionId,
            item.item_type || 'RAW_MATERIAL',
            item.raw_material_id || null,
            item.semi_finished_product_id || null,
            item.quantity,
            item.unit || 'KG',
            item.standard_rate || 0.0,
            item.notes || ''
          );
        }
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'RECIPES', ?, ?)
      `).run(username, String(recipeId), `Created recipe: ${data.name} (v1)`);

      return this.getRecipeById(recipeId);
    });
  },

  createNewVersion(recipeId, data, username = 'Admin') {
    return runInTransaction((db) => {
      const recipe = this.getRecipeById(recipeId);
      if (!recipe) throw new Error('Recipe not found');

      const maxVer = db.prepare('SELECT MAX(version_number) as max_v FROM recipe_versions WHERE recipe_id = ?').get(recipeId);
      const nextVersionNum = (maxVer.max_v || 0) + 1;

      // Mark old active version as ARCHIVED if activating new version
      if (data.status === 'ACTIVE') {
        db.prepare(`UPDATE recipe_versions SET status = 'ARCHIVED' WHERE recipe_id = ? AND status = 'ACTIVE'`).run(recipeId);
      }

      const verRes = db.prepare(`
        INSERT INTO recipe_versions (
          recipe_id, version_number, effective_date, expected_yield, expected_yield_unit,
          expected_wastage_pct, labour_cost_type, labour_cost_rate, overhead_cost_type,
          overhead_cost_rate, packaging_cost, notes, status, created_by, approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recipeId,
        nextVersionNum,
        data.effective_date || new Date().toISOString().split('T')[0],
        data.expected_yield || recipe.batch_size,
        data.expected_yield_unit || recipe.batch_unit,
        data.expected_wastage_pct || 4.0,
        data.labour_cost_type || 'PER_BATCH',
        data.labour_cost_rate || 500.0,
        data.overhead_cost_type || 'PER_BATCH',
        data.overhead_cost_rate || 200.0,
        data.packaging_cost || 100.0,
        data.notes || `Version ${nextVersionNum} update`,
        data.status || 'ACTIVE',
        username,
        username
      );

      const versionId = verRes.lastInsertRowid;

      if (data.status === 'ACTIVE') {
        db.prepare('UPDATE recipes SET active_version_id = ? WHERE id = ?').run(versionId, recipeId);
      }

      // Insert Items
      if (Array.isArray(data.items)) {
        const insertItem = db.prepare(`
          INSERT INTO recipe_items (recipe_version_id, item_type, raw_material_id, semi_finished_product_id, quantity, unit, standard_rate, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.items) {
          insertItem.run(
            versionId,
            item.item_type || 'RAW_MATERIAL',
            item.raw_material_id || null,
            item.semi_finished_product_id || null,
            item.quantity,
            item.unit || 'KG',
            item.standard_rate || 0.0,
            item.notes || ''
          );
        }
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'RECIPES', ?, ?)
      `).run(username, String(recipeId), `Created new Recipe Version ${nextVersionNum} for ${recipe.name}`);

      return this.getRecipeById(recipeId);
    });
  },

  updateRecipe(recipeId, data, username = 'Admin') {
    return runInTransaction((db) => {
      const recipe = this.getRecipeById(recipeId);
      if (!recipe) throw new Error('Recipe not found');

      // 1. Update recipe header
      if (data.name !== undefined || data.batch_size !== undefined || data.batch_unit !== undefined || data.description !== undefined) {
        db.prepare(`
          UPDATE recipes 
          SET name = COALESCE(?, name),
              batch_size = COALESCE(?, batch_size),
              batch_unit = COALESCE(?, batch_unit),
              description = COALESCE(?, description)
          WHERE id = ?
        `).run(data.name || null, data.batch_size ? Number(data.batch_size) : null, data.batch_unit || null, data.description || null, recipeId);
      }

      // 2. Locate or create active version
      let versionId = recipe.active_version_id;
      if (!versionId && recipe.versions && recipe.versions.length > 0) {
        versionId = recipe.versions[0].id;
      }

      if (!versionId) {
        const verRes = db.prepare(`
          INSERT INTO recipe_versions (
            recipe_id, version_number, effective_date, expected_yield, expected_yield_unit,
            expected_wastage_pct, status, created_by, approved_by
          ) VALUES (?, 1, CURRENT_DATE, ?, ?, 0, 'ACTIVE', ?, ?)
        `).run(recipeId, data.batch_size ? Number(data.batch_size) : 1, data.batch_unit || 'KG', username, username);
        versionId = verRes.lastInsertRowid;
        db.prepare('UPDATE recipes SET active_version_id = ? WHERE id = ?').run(versionId, recipeId);
      }

      // 3. Update items in active version
      if (Array.isArray(data.items)) {
        db.prepare('DELETE FROM recipe_items WHERE recipe_version_id = ?').run(versionId);

        const insertItem = db.prepare(`
          INSERT INTO recipe_items (recipe_version_id, item_type, raw_material_id, semi_finished_product_id, quantity, unit, standard_rate, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of data.items) {
          const itemName = item.name || item.item_name;
          if (!itemName && !item.raw_material_id) continue;

          let rawId = item.raw_material_id;
          if (!rawId && itemName) {
            const existingRaw = db.prepare('SELECT id, current_purchase_rate FROM raw_materials WHERE name = ? COLLATE NOCASE').get(itemName);
            if (existingRaw) {
              rawId = existingRaw.id;
            } else {
              const newRaw = db.prepare(`
                INSERT INTO raw_materials (code, name, unit, current_purchase_rate, active)
                VALUES (?, ?, ?, ?, 1)
              `).run(`RAW-${Date.now().toString().slice(-4)}`, itemName, item.unit || 'KG', Number(item.rate) || 0);
              rawId = newRaw.lastInsertRowid;
            }
          }

          insertItem.run(
            versionId,
            item.item_type || 'RAW_MATERIAL',
            rawId || null,
            item.semi_finished_product_id || null,
            Number(item.quantity) || 0,
            item.unit || 'KG',
            Number(item.rate || item.standard_rate || item.current_purchase_rate) || 0.0,
            item.notes || ''
          );
        }
      }

      // Ensure product links to recipe
      if (recipe.product_id) {
        db.prepare('UPDATE products SET recipe_id = ? WHERE id = ?').run(recipeId, recipe.product_id);
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'UPDATE', 'RECIPES', ?, ?)
      `).run(username, String(recipeId), `Updated recipe: ${recipe.name}`);

      return this.getRecipeById(recipeId);
    });
  }
};
