import { getDatabase, runInTransaction } from '../database/connection.js';
import { settingsService } from './settingsService.js';
import { recipeService } from './recipeService.js';

export const manufacturingService = {
  getOrders(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT m.*, p.name as finished_product_name, p.code as finished_product_code,
             r.name as recipe_name, r.code as recipe_code, rv.version_number
      FROM manufacturing_orders m
      LEFT JOIN products p ON m.finished_product_id = p.id
      LEFT JOIN recipes r ON m.recipe_id = r.id
      LEFT JOIN recipe_versions rv ON m.recipe_version_id = rv.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (m.manufacturing_no LIKE ? OR m.batch_number LIKE ? OR p.name LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.status) {
      query += ' AND m.status = ?';
      params.push(filters.status);
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND m.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY m.date DESC, m.id DESC';
    return db.prepare(query).all(...params);
  },

  getOrderById(id) {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT m.*, p.name as finished_product_name, p.code as finished_product_code, p.unit as product_unit,
             r.name as recipe_name, r.code as recipe_code, rv.version_number
      FROM manufacturing_orders m
      LEFT JOIN products p ON m.finished_product_id = p.id
      LEFT JOIN recipes r ON m.recipe_id = r.id
      LEFT JOIN recipe_versions rv ON m.recipe_version_id = rv.id
      WHERE m.id = ?
    `).get(id);

    if (!order) return null;

    const items = db.prepare(`
      SELECT mi.*,
        CASE
          WHEN mi.item_type = 'RAW_MATERIAL' THEN rm.name
          WHEN mi.item_type = 'SEMI_FINISHED' THEN p.name
          ELSE 'Unknown'
        END as item_name,
        CASE
          WHEN mi.item_type = 'RAW_MATERIAL' THEN rm.code
          WHEN mi.item_type = 'SEMI_FINISHED' THEN p.code
          ELSE 'Unknown'
        END as item_code
      FROM manufacturing_items mi
      LEFT JOIN raw_materials rm ON mi.raw_material_id = rm.id
      LEFT JOIN products p ON mi.semi_finished_product_id = p.id
      WHERE mi.manufacturing_order_id = ?
    `).all(id);

    const wastages = db.prepare(`
      SELECT * FROM manufacturing_wastage
      WHERE manufacturing_order_id = ?
    `).all(id);

    return {
      ...order,
      items,
      wastages
    };
  },

  // Create & Execute Production Batch
  createManufacturingBatch(data, username = 'Admin') {
    return runInTransaction((db) => {
      const settings = settingsService.getSettings();
      const allowNegative = settings.allow_negative_stock === 1;

      // 1. Load Recipe & Costing details
      const recipe = recipeService.getRecipeById(data.recipe_id);
      if (!recipe) throw new Error('Recipe not found');

      const versionId = data.recipe_version_id || recipe.active_version_id;
      const version = recipe.versions.find(v => v.id === versionId);
      if (!version) throw new Error('Recipe version not found');

      const plannedQty = Number(data.planned_quantity) || Number(recipe.batch_size);
      const actualOutput = Number(data.actual_output) || plannedQty;
      if (actualOutput <= 0) throw new Error('Actual production output must be greater than 0');

      // 2. Generate numbers
      const mfgCount = db.prepare('SELECT COUNT(*) as count FROM manufacturing_orders').get().count + 1;
      const prefix = settings.manufacturing_prefix || 'MFG/26-27/';
      const mfgNo = data.manufacturing_no || `${prefix}${String(mfgCount).padStart(3, '0')}`;
      const batchNo = data.batch_number || `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(mfgCount).padStart(2, '0')}`;

      // 3. Process Consumed Items & Calculate Material Cost Snapshot
      const recipeItems = recipeService.getRecipeVersionItems(version.id);
      const scaleFactor = Number(recipe.batch_size) > 0 ? plannedQty / Number(recipe.batch_size) : 1.0;

      let totalMaterialCost = 0.0;
      const consumedItemsToSave = [];

      for (const rItem of recipeItems) {
        const plannedItemQty = Number(rItem.quantity) * scaleFactor;
        // User can override actual consumed qty if provided
        const customItem = (data.items || []).find(i => (
          (i.raw_material_id && i.raw_material_id === rItem.raw_material_id) ||
          (i.semi_finished_product_id && i.semi_finished_product_id === rItem.semi_finished_product_id)
        ));
        const actualItemQty = customItem ? Number(customItem.actual_quantity) : plannedItemQty;

        let unitCostSnapshot = 0.0;
        let itemName = '';

        if (rItem.item_type === 'RAW_MATERIAL') {
          const rm = db.prepare('SELECT id, name, current_stock, current_purchase_rate, average_purchase_rate, last_purchase_rate FROM raw_materials WHERE id = ?').get(rItem.raw_material_id);
          if (!rm) throw new Error(`Raw material ID ${rItem.raw_material_id} not found`);
          itemName = rm.name;

          // Check stock availability
          if (!allowNegative && (rm.current_stock - actualItemQty) < -0.001) {
            throw new Error(`Insufficient stock for ${rm.name}. Required: ${actualItemQty} ${rItem.unit}, Available: ${rm.current_stock} ${rItem.unit}`);
          }

          // Rate according to costing method
          const method = settings.costing_method || 'WEIGHTED_AVERAGE';
          if (method === 'LAST_PURCHASE') unitCostSnapshot = Number(rm.last_purchase_rate) || Number(rm.current_purchase_rate);
          else if (method === 'STANDARD') unitCostSnapshot = Number(rItem.standard_rate) || Number(rm.average_purchase_rate);
          else unitCostSnapshot = Number(rm.average_purchase_rate) || Number(rm.current_purchase_rate);

          // Deduct raw material stock
          db.prepare('UPDATE raw_materials SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(actualItemQty, rm.id);

          // Record Stock OUT Movement
          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (?, 'RAW_MATERIAL', ?, ?, 'MANUFACTURING_CONSUMPTION', ?, ?, ?, ?, ?, 'MANUFACTURING', 0, ?, ?, ?)
          `).run(
            data.date || new Date().toISOString().split('T')[0],
            rm.id,
            rm.name,
            -actualItemQty, // OUT is negative
            rItem.unit,
            -actualItemQty,
            unitCostSnapshot,
            actualItemQty * unitCostSnapshot,
            batchNo,
            `Consumed in batch ${batchNo} for ${recipe.product_name}`,
            username
          );
        } else if (rItem.item_type === 'SEMI_FINISHED') {
          const sfp = db.prepare('SELECT id, name, current_stock, purchase_rate, selling_rate FROM products WHERE id = ?').get(rItem.semi_finished_product_id);
          if (!sfp) throw new Error(`Semi-finished product ID ${rItem.semi_finished_product_id} not found`);
          itemName = sfp.name;

          if (!allowNegative && (sfp.current_stock - actualItemQty) < -0.001) {
            throw new Error(`Insufficient stock for ${sfp.name}. Required: ${actualItemQty} ${rItem.unit}, Available: ${sfp.current_stock} ${rItem.unit}`);
          }

          unitCostSnapshot = Number(sfp.purchase_rate) || 0.0;

          // Deduct semi-finished stock
          db.prepare('UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(actualItemQty, sfp.id);

          // Record Stock OUT Movement
          db.prepare(`
            INSERT INTO stock_movements (
              movement_date, item_type, item_id, item_name, movement_type,
              quantity, unit, base_quantity, cost_rate, total_cost_value,
              reference_type, reference_id, reference_no, notes, created_by
            ) VALUES (?, 'SEMI_FINISHED', ?, ?, 'MANUFACTURING_CONSUMPTION', ?, ?, ?, ?, ?, 'MANUFACTURING', 0, ?, ?, ?)
          `).run(
            data.date || new Date().toISOString().split('T')[0],
            sfp.id,
            sfp.name,
            -actualItemQty,
            rItem.unit,
            -actualItemQty,
            unitCostSnapshot,
            actualItemQty * unitCostSnapshot,
            batchNo,
            `Consumed semi-finished ${sfp.name} in batch ${batchNo}`,
            username
          );
        }

        const lineCost = actualItemQty * unitCostSnapshot;
        totalMaterialCost += lineCost;

        consumedItemsToSave.push({
          item_type: rItem.item_type,
          raw_material_id: rItem.raw_material_id,
          semi_finished_product_id: rItem.semi_finished_product_id,
          planned_quantity: plannedItemQty,
          actual_quantity: actualItemQty,
          unit: rItem.unit,
          unit_cost_snapshot: unitCostSnapshot,
          total_cost_snapshot: lineCost
        });
      }

      // 4. Labour, Overhead, and Packaging costs
      let labourCost = data.total_labour_cost !== undefined ? Number(data.total_labour_cost) : (
        version.labour_cost_type === 'PER_KG' ? actualOutput * Number(version.labour_cost_rate || 0) : Number(version.labour_cost_rate || 0) * scaleFactor
      );

      let overheadCost = data.total_overhead_cost !== undefined ? Number(data.total_overhead_cost) : (
        version.overhead_cost_type === 'PCT_MATERIAL' ? (totalMaterialCost * Number(version.overhead_cost_rate || 0)) / 100 :
        (version.overhead_cost_type === 'PER_KG' ? actualOutput * Number(version.overhead_cost_rate || 0) : Number(version.overhead_cost_rate || 0) * scaleFactor)
      );

      let packagingCost = data.total_packaging_cost !== undefined ? Number(data.total_packaging_cost) : Number(version.packaging_cost || 0) * scaleFactor;

      // 5. Total Batch Cost & ACTUAL Cost per unit (DIVIDED BY ACTUAL OUTPUT AS PER GOLDEN RULE!)
      const totalBatchCost = totalMaterialCost + labourCost + overheadCost + packagingCost;
      const actualCostPerUnit = actualOutput > 0 ? totalBatchCost / actualOutput : 0.0;

      // Standard cost calculation based on version expected yield
      const standardCostCalculation = recipeService.calculateRecipeCost(recipe.id, version.id, plannedQty);
      const standardCostPerUnit = standardCostCalculation.cost_per_kg;
      const variance = actualCostPerUnit - standardCostPerUnit;
      const variancePct = standardCostPerUnit > 0 ? (variance / standardCostPerUnit) * 100 : 0.0;

      // Wastage tracking
      const wastageQty = data.wastage_quantity !== undefined ? Number(data.wastage_quantity) : Math.max(0, plannedQty - actualOutput);
      const wastagePct = plannedQty > 0 ? (wastageQty / plannedQty) * 100 : 0.0;

      // 6. Insert Manufacturing Order Record
      const orderRes = db.prepare(`
        INSERT INTO manufacturing_orders (
          manufacturing_no, date, finished_product_id, recipe_id, recipe_version_id,
          batch_number, planned_quantity, planned_unit, actual_output, actual_unit,
          wastage_quantity, wastage_pct, wastage_reason, production_location, operator,
          notes, status, total_material_cost, total_labour_cost, total_overhead_cost,
          total_packaging_cost, total_batch_cost, cost_per_unit, standard_cost_per_unit,
          cost_variance, cost_variance_pct, costing_method_used, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mfgNo,
        data.date || new Date().toISOString().split('T')[0],
        recipe.product_id,
        recipe.id,
        version.id,
        batchNo,
        plannedQty,
        recipe.batch_unit || 'KG',
        actualOutput,
        data.actual_unit || recipe.batch_unit || 'KG',
        wastageQty,
        Math.round(wastagePct * 100) / 100,
        data.wastage_reason || '',
        data.production_location || 'Main Sweets Factory',
        data.operator || 'Master Karigar',
        data.notes || '',
        Math.round(totalMaterialCost * 100) / 100,
        Math.round(labourCost * 100) / 100,
        Math.round(overheadCost * 100) / 100,
        Math.round(packagingCost * 100) / 100,
        Math.round(totalBatchCost * 100) / 100,
        Math.round(actualCostPerUnit * 100) / 100,
        Math.round(standardCostPerUnit * 100) / 100,
        Math.round(variance * 100) / 100,
        Math.round(variancePct * 100) / 100,
        settings.costing_method || 'WEIGHTED_AVERAGE',
        username
      );

      const mfgId = orderRes.lastInsertRowid;

      // 7. Save Items Snapshots
      const insertMfgItem = db.prepare(`
        INSERT INTO manufacturing_items (
          manufacturing_order_id, item_type, raw_material_id, semi_finished_product_id,
          planned_quantity, actual_quantity, unit, unit_cost_snapshot, total_cost_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of consumedItemsToSave) {
        insertMfgItem.run(
          mfgId,
          item.item_type,
          item.raw_material_id || null,
          item.semi_finished_product_id || null,
          item.planned_quantity,
          item.actual_quantity,
          item.unit,
          item.unit_cost_snapshot,
          item.total_cost_snapshot
        );
      }

      // 8. Save Wastage Record
      if (wastageQty > 0) {
        db.prepare(`
          INSERT INTO manufacturing_wastage (
            manufacturing_order_id, wastage_type, quantity, unit, cost_loss, reason, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          mfgId,
          data.wastage_type || 'NORMAL_PROCESS_LOSS',
          wastageQty,
          recipe.batch_unit || 'KG',
          wastageQty * actualCostPerUnit,
          data.wastage_reason || 'Normal moisture evaporation and edge cuts',
          data.notes || ''
        );
      }

      // 9. Increase Finished Product Stock & Update Product's Purchase/Production Rate
      const prodType = recipe.is_semi_finished ? 'SEMI_FINISHED' : 'FINISHED_PRODUCT';
      db.prepare(`
        UPDATE products SET
          current_stock = current_stock + ?,
          purchase_rate = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(actualOutput, actualCostPerUnit, recipe.product_id);

      // Record Stock IN Movement for Finished Goods
      db.prepare(`
        INSERT INTO stock_movements (
          movement_date, item_type, item_id, item_name, movement_type,
          quantity, unit, base_quantity, cost_rate, total_cost_value,
          reference_type, reference_id, reference_no, notes, created_by
        ) VALUES (?, ?, ?, ?, 'MANUFACTURING_OUTPUT', ?, ?, ?, ?, ?, 'MANUFACTURING', ?, ?, ?, ?)
      `).run(
        data.date || new Date().toISOString().split('T')[0],
        prodType,
        recipe.product_id,
        recipe.product_name,
        actualOutput,
        data.actual_unit || 'KG',
        actualOutput,
        actualCostPerUnit,
        totalBatchCost,
        mfgId,
        batchNo,
        `Produced batch ${batchNo} (${actualOutput} ${recipe.batch_unit}) @ ₹${actualCostPerUnit.toFixed(2)}/unit`,
        username
      );

      // 10. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES (?, 'CREATE', 'MANUFACTURING', ?, ?)
      `).run(username, String(mfgId), `Produced batch ${batchNo}: ${actualOutput} KG ${recipe.product_name} (Cost: ₹${actualCostPerUnit.toFixed(2)}/KG)`);

      return this.getOrderById(mfgId);
    });
  },

  // Automated Kitchen Shortage & BOM Ingredient Explosion Calculator
  getKitchenShortageCalculator(targetDate, slot = 'ALL') {
    const db = getDatabase();
    const date = targetDate || new Date().toISOString().split('T')[0];

    // 1. Fetch Advance Orders for target date
    let orderQuery = `
      SELECT ao.id, ao.order_no, ao.customer_name, ao.delivery_slot, ao.delivery_time,
             aoi.product_id, aoi.item_name, aoi.quantity, aoi.unit
      FROM advance_orders ao
      JOIN advance_order_items aoi ON ao.id = aoi.order_id
      WHERE ao.delivery_date = ? AND ao.status IN ('PENDING', 'IN_PRODUCTION', 'READY')
    `;
    const params = [date];
    if (slot !== 'ALL') {
      orderQuery += ` AND ao.delivery_slot = ?`;
      params.push(slot);
    }
    const orderItems = db.prepare(orderQuery).all(...params);

    // 2. Aggregate sweet requirements
    const sweetReqs = {};
    for (const item of orderItems) {
      const key = item.product_id ? `prod_${item.product_id}` : `name_${item.item_name.toLowerCase().trim()}`;
      if (!sweetReqs[key]) {
        sweetReqs[key] = {
          product_id: item.product_id || null,
          item_name: item.item_name,
          unit: item.unit || 'KG',
          total_ordered_qty: 0,
          current_stock: 0,
          shortage_qty: 0,
          caterers: []
        };
      }
      sweetReqs[key].total_ordered_qty += Number(item.quantity) || 0;
      if (!sweetReqs[key].caterers.includes(item.customer_name)) {
        sweetReqs[key].caterers.push(item.customer_name);
      }
    }

    // 3. Match each sweet with Current Stock & Recipe
    const allProducts = db.prepare(`SELECT id, name, current_stock, unit FROM products WHERE active = 1`).all();
    const allRecipes = recipeService.getRecipes({ active: true });

    const rawMaterialAggregates = {};

    const sweetsList = Object.values(sweetReqs).map(sw => {
      let matchedProd = null;
      if (sw.product_id) {
        matchedProd = allProducts.find(p => p.id === sw.product_id);
      } else {
        matchedProd = allProducts.find(p => p.name.toLowerCase().trim() === sw.item_name.toLowerCase().trim());
      }

      const currentStock = matchedProd ? Number(matchedProd.current_stock) || 0 : 0;
      const shortageQty = Math.max(0, sw.total_ordered_qty - currentStock);

      const matchedRecipe = matchedProd
        ? allRecipes.find(r => r.product_id === matchedProd.id)
        : allRecipes.find(r => r.name.toLowerCase().trim().includes(sw.item_name.toLowerCase().trim()));

      let explodedIngredients = [];
      if (matchedRecipe) {
        const fullRecipe = recipeService.getRecipeById(matchedRecipe.id);
        const batchSize = Number(fullRecipe.batch_size) || 1.0;
        const scaleFactor = (shortageQty > 0 ? shortageQty : sw.total_ordered_qty) / batchSize;

        explodedIngredients = (fullRecipe.items || []).map(rItem => {
          const requiredQty = Math.round((Number(rItem.quantity) * scaleFactor) * 100) / 100;
          const rmId = rItem.raw_material_id || rItem.id;
          const rmName = rItem.item_name;
          const rmUnit = rItem.unit || 'KG';
          const rmStock = Number(rItem.available_stock) || 0;

          if (shortageQty > 0) {
            if (!rawMaterialAggregates[rmId]) {
              rawMaterialAggregates[rmId] = {
                raw_material_id: rmId,
                name: rmName,
                unit: rmUnit,
                total_required_qty: 0,
                current_stock: rmStock,
                net_shortage: 0
              };
            }
            rawMaterialAggregates[rmId].total_required_qty += requiredQty;
          }

          return {
            raw_material_id: rmId,
            name: rmName,
            unit: rmUnit,
            required_qty: requiredQty,
            current_stock: rmStock
          };
        });
      }

      return {
        ...sw,
        product_id: matchedProd ? matchedProd.id : sw.product_id,
        current_stock: currentStock,
        shortage_qty: shortageQty,
        has_recipe: !!matchedRecipe,
        recipe_id: matchedRecipe ? matchedRecipe.id : null,
        recipe_name: matchedRecipe ? matchedRecipe.name : null,
        ingredients: explodedIngredients
      };
    });

    const rawMaterialsList = Object.values(rawMaterialAggregates).map(rm => {
      const netShortage = Math.max(0, rm.total_required_qty - rm.current_stock);
      return {
        ...rm,
        total_required_qty: Math.round(rm.total_required_qty * 100) / 100,
        current_stock: Math.round(rm.current_stock * 100) / 100,
        net_shortage: Math.round(netShortage * 100) / 100,
        status: netShortage > 0 ? 'SHORTAGE' : 'IN_STOCK'
      };
    }).sort((a, b) => b.net_shortage - a.net_shortage);

    return {
      target_date: date,
      slot: slot,
      total_orders_count: new Set(orderItems.map(i => i.id)).size,
      sweets_production_needed: sweetsList,
      raw_materials_required: rawMaterialsList
    };
  }
};
