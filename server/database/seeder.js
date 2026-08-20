import { getDatabase, runInTransaction } from './connection.js';

export function seedSweetsData(force = false) {
  const db = getDatabase();

  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get()?.count || 0;
  if (salesCount > 10 && force && !process.env.ALLOW_LIVE_RESET) {
    console.warn(`[SAFETY GUARD] Force seeding blocked: Database contains ${salesCount} live sales bills.`);
    return { success: false, message: `Seeding blocked: Database contains ${salesCount} live sales. Set ALLOW_LIVE_RESET=true to override.` };
  }

  const rawCount = db.prepare('SELECT COUNT(*) as count FROM raw_materials').get();
  if (rawCount.count > 0 && !force) {
    console.log('Database already seeded. Skipping.');
    return { success: true, message: 'Database already populated' };
  }

  return runInTransaction((db) => {
    console.log('Seeding rich Sweets ERP demonstration dataset...');

    if (force) {
      db.exec('PRAGMA foreign_keys = OFF;');
      try {
        db.exec('DELETE FROM ledger_entries;');
        db.exec('DELETE FROM stock_movements;');
        db.exec('DELETE FROM stock_adjustments;');
        db.exec('DELETE FROM manufacturing_wastage;');
        db.exec('DELETE FROM manufacturing_items;');
        db.exec('DELETE FROM manufacturing_orders;');
        db.exec('DELETE FROM vasan_ledger;');
        db.exec('DELETE FROM sale_items;');
        db.exec('DELETE FROM sales_return_items;');
        db.exec('DELETE FROM sales_returns;');
        db.exec('DELETE FROM sales;');
        db.exec('DELETE FROM purchase_items;');
        db.exec('DELETE FROM purchase_return_items;');
        db.exec('DELETE FROM purchase_returns;');
        db.exec('DELETE FROM purchases;');
        db.exec('DELETE FROM payments;');
        db.exec('DELETE FROM expenses;');
        db.exec('DELETE FROM advance_order_items;');
        db.exec('DELETE FROM advance_orders;');
        db.exec('DELETE FROM whatsapp_inbound_orders;');
        db.exec('DELETE FROM recipe_items;');
        db.exec('DELETE FROM recipe_versions;');
        db.exec('DELETE FROM recipes;');
        db.exec('DELETE FROM raw_material_price_history;');
        db.exec('DELETE FROM products;');
        db.exec('DELETE FROM raw_materials;');
        db.exec('DELETE FROM customers;');
        db.exec('DELETE FROM suppliers;');
      } finally {
        db.exec('PRAGMA foreign_keys = ON;');
      }
    }

    // 1. Categories lookup (with auto-seeding default categories if missing)
    let catRows = db.prepare('SELECT id, name, type FROM categories').all();
    if (catRows.length === 0) {
      const insertCat = db.prepare('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)');
      insertCat.run('Kaju Sweets (કાજુ મીઠાઈ)', 'FINISHED_PRODUCT', 'Premium Cashew based traditional sweets');
      insertCat.run('Mawa / Khoya Sweets (માવા મીઠાઈ)', 'FINISHED_PRODUCT', 'Rich reduced milk sweets (Peda, Barfi)');
      insertCat.run('Bengali Sweets (બંગાળી મીઠાઈ)', 'FINISHED_PRODUCT', 'Chhena based syrups & sweets (Rasgulla, Rasmalai)');
      insertCat.run('Desi Ghee Snacks & Namkeen (નમકીન)', 'FINISHED_PRODUCT', 'Savory snacks, Farsan, Mathri');
      insertCat.run('Nuts & Dry Fruits', 'RAW_MATERIAL', 'Cashew W320/Kaju Tukda, Almonds, Pistachio');
      insertCat.run('Dairy & Fats', 'RAW_MATERIAL', 'Pure Desi Ghee, Fresh Full Cream Buffalo Milk, Mawa');
      insertCat.run('Sweeteners & Spices', 'RAW_MATERIAL', 'Refined Sugar, Green Cardamom (Elaichi), Pure Saffron (Kesar)');
      insertCat.run('Packaging Boxes & Foil', 'PACKAGING', 'Sweet Boxes (250g, 500g, 1kg), Silver Vark (Foil), Carry Bags');
      insertCat.run('Semi-Finished Bases', 'SEMI_FINISHED', 'Fresh In-house Mawa, Kaju Paste, Sugar Syrup (Chashni)');
      insertCat.run('Factory Overheads', 'EXPENSE', 'LPG Commercial Cylinders, Karigar Daily Wages, Electricity, Shop Rent');
      catRows = db.prepare('SELECT id, name, type FROM categories').all();
    }

    const catMap = {};
    for (const c of catRows) {
      catMap[c.type] = c.id;
      catMap[c.name] = c.id;
    }
    const defaultCatId = catRows[0]?.id || 1;
    const getCatId = (key) => catMap[key] || catMap['RAW_MATERIAL'] || catMap['FINISHED_PRODUCT'] || defaultCatId;

    // 2. Suppliers
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (supplier_no, name, mobile, address, gstin, opening_balance, credit_terms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const sup1 = insertSupplier.run('SUP-001', 'Shree Ganesh Dry Fruits Syndicate', '+91 98251 11223', 'APMC Market, Ring Road, Surat', '24AABCS1111A1Z1', 0.0, 'Net 15 Days').lastInsertRowid;
    const sup2 = insertSupplier.run('SUP-002', 'Surat Dairy Farmers Cooperative', '+91 94281 33445', 'Sumul Dairy Road, Katargam, Surat', '24AADFS2222B1Z2', 0.0, 'Weekly Tuesday').lastInsertRowid;
    const sup3 = insertSupplier.run('SUP-003', 'Apex Packaging & Foils Ltd', '+91 99090 55667', 'GIDC Industrial Estate, Sachin, Surat', '24AAPFL3333C1Z3', 0.0, 'Immediate').lastInsertRowid;

    // 3. Raw Materials
    const insertRM = db.prepare(`
      INSERT INTO raw_materials (
        code, name, category_id, unit, current_purchase_rate, average_purchase_rate,
        last_purchase_rate, standard_rate, min_stock, opening_stock, current_stock,
        default_supplier_id, gst_rate, hsn_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const rmCashew = insertRM.run('RM-KJU', 'Cashew W320 Whole (કાજુ)', getCatId('RAW_MATERIAL'), 'KG', 800.0, 800.0, 800.0, 780.0, 25.0, 100.0, 100.0, sup1, 5.0, '08013210').lastInsertRowid;
    const rmSugar = insertRM.run('RM-SGR', 'Refined M-30 Sugar (ખાંડ)', getCatId('RAW_MATERIAL'), 'KG', 45.0, 45.0, 45.0, 44.0, 50.0, 500.0, 500.0, sup1, 5.0, '17019990').lastInsertRowid;
    const rmGhee = insertRM.run('RM-GHEE', 'Pure Desi Cow Ghee (શુદ્ધ ઘી)', getCatId('RAW_MATERIAL'), 'KG', 620.0, 620.0, 620.0, 600.0, 20.0, 80.0, 80.0, sup2, 5.0, '04059020').lastInsertRowid;
    const rmMilk = insertRM.run('RM-MILK', 'Fresh Full Cream Milk 6% Fat (દૂધ)', getCatId('RAW_MATERIAL'), 'LTR', 65.0, 65.0, 65.0, 62.0, 40.0, 150.0, 150.0, sup2, 0.0, '04012000').lastInsertRowid;
    const rmMawa = insertRM.run('RM-MAWA', 'Fresh Khoya / Mawa (માવો)', getCatId('RAW_MATERIAL'), 'KG', 340.0, 340.0, 340.0, 330.0, 15.0, 60.0, 60.0, sup2, 5.0, '04052000').lastInsertRowid;
    const rmPista = insertRM.run('RM-PISTA', 'Iranian Pistachio Slices (પિસ્તા)', getCatId('RAW_MATERIAL'), 'KG', 1450.0, 1450.0, 1450.0, 1400.0, 5.0, 15.0, 15.0, sup1, 5.0, '08025100').lastInsertRowid;
    const rmElaichi = insertRM.run('RM-ELC', 'Green Cardamom Bold 8mm (એલચી)', getCatId('RAW_MATERIAL'), 'KG', 2800.0, 2800.0, 2800.0, 2700.0, 2.0, 8.0, 8.0, sup1, 5.0, '09083100').lastInsertRowid;
    const rmKesar = insertRM.run('RM-KSR', 'Kashmiri Mogra Saffron (કેસર)', getCatId('RAW_MATERIAL'), 'GM', 240.0, 240.0, 240.0, 230.0, 10.0, 50.0, 50.0, sup1, 5.0, '09102010').lastInsertRowid;
    const rmSilver = insertRM.run('RM-VRK', 'Pure Silver Vark (ચાંદી વરખ)', getCatId('PACKAGING'), 'PCS', 3.0, 3.0, 3.0, 2.8, 100.0, 1000.0, 1000.0, sup3, 5.0, '71069290').lastInsertRowid;
    const rmBox1kg = insertRM.run('RM-BX1K', 'Matuki Royal Sweet Box 1 KG', getCatId('PACKAGING'), 'PCS', 22.0, 22.0, 22.0, 20.0, 100.0, 500.0, 500.0, sup3, 12.0, '48191000').lastInsertRowid;

    // Record Opening Stock Movements for Raw Materials
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (
        movement_date, item_type, item_id, item_name, movement_type,
        quantity, unit, base_quantity, cost_rate, total_cost_value,
        reference_type, reference_id, reference_no, notes
      ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, 'OPENING_STOCK', ?, ?, ?, ?, ?, 'OPENING', 0, 'INIT-2026', 'Opening balance inventory')
    `);

    insertMovement.run('RAW_MATERIAL', rmCashew, 'Cashew W320 Whole', 100.0, 'KG', 100.0, 800.0, 80000.0);
    insertMovement.run('RAW_MATERIAL', rmSugar, 'Refined M-30 Sugar', 500.0, 'KG', 500.0, 45.0, 22500.0);
    insertMovement.run('RAW_MATERIAL', rmGhee, 'Pure Desi Cow Ghee', 80.0, 'KG', 80.0, 620.0, 49600.0);
    insertMovement.run('RAW_MATERIAL', rmMilk, 'Fresh Full Cream Milk', 150.0, 'LTR', 150.0, 65.0, 9750.0);
    insertMovement.run('RAW_MATERIAL', rmMawa, 'Fresh Khoya / Mawa', 60.0, 'KG', 60.0, 340.0, 20400.0);
    insertMovement.run('RAW_MATERIAL', rmPista, 'Iranian Pistachio Slices', 15.0, 'KG', 15.0, 1450.0, 21750.0);
    insertMovement.run('RAW_MATERIAL', rmElaichi, 'Green Cardamom Bold', 8.0, 'KG', 8.0, 2800.0, 22400.0);
    insertMovement.run('RAW_MATERIAL', rmKesar, 'Kashmiri Mogra Saffron', 50.0, 'GM', 0.05, 240.0, 12000.0);
    insertMovement.run('RAW_MATERIAL', rmSilver, 'Pure Silver Vark', 1000.0, 'PCS', 1000.0, 3.0, 3000.0);
    insertMovement.run('RAW_MATERIAL', rmBox1kg, 'Matuki Royal Sweet Box 1 KG', 500.0, 'PCS', 500.0, 22.0, 11000.0);

    // 4. Finished Products & Semi-Finished Products
    const insertProd = db.prepare(`
      INSERT INTO products (
        code, barcode, name, category_id, subcategory, product_type, unit,
        purchase_rate, selling_rate, wholesale_rate, min_stock, max_stock,
        gst_rate, hsn_code, opening_stock, opening_stock_rate, current_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pKajuKatli = insertProd.run('PRD-KK', '890100100001', 'Kaju Katli Diamond Special (કાજુ કતરી)', getCatId('FINISHED_PRODUCT'), 'Kaju Sweets', 'FINISHED_PRODUCT', 'KG', 760.0, 980.0, 890.0, 10.0, 150.0, 5.0, '21069099', 25.0, 760.0, 25.0).lastInsertRowid;
    const pKesarPeda = insertProd.run('PRD-KP', '890100100002', 'Shreeji Kesar Peda (કેસર પેંડા)', getCatId('FINISHED_PRODUCT'), 'Mawa Sweets', 'FINISHED_PRODUCT', 'KG', 480.0, 680.0, 610.0, 8.0, 100.0, 5.0, '21069099', 20.0, 480.0, 20.0).lastInsertRowid;
    const pMotichoor = insertProd.run('PRD-ML', '890100100003', 'Desi Ghee Motichoor Ladoo (મોતીચૂર લાડુ)', getCatId('FINISHED_PRODUCT'), 'Ghee Sweets', 'FINISHED_PRODUCT', 'KG', 360.0, 540.0, 480.0, 12.0, 120.0, 5.0, '21069099', 30.0, 360.0, 30.0).lastInsertRowid;
    const pGulabJamun = insertProd.run('PRD-GJ', '890100100004', 'Angoori Gulab Jamun (ગુલાબ જાંબુ)', getCatId('FINISHED_PRODUCT'), 'Mawa Sweets', 'FINISHED_PRODUCT', 'KG', 320.0, 480.0, 420.0, 15.0, 100.0, 5.0, '21069099', 18.0, 320.0, 18.0).lastInsertRowid;

    // Semi-Finished Product: Kaju Paste
    const pKajuPaste = insertProd.run('SFP-KJP', '890100100005', 'Prepared Fine Kaju Paste (કાજુ પેસ્ટ)', getCatId('SEMI_FINISHED'), 'Semi-Finished', 'SEMI_FINISHED_PRODUCT', 'KG', 720.0, 820.0, 800.0, 5.0, 50.0, 5.0, '21069099', 10.0, 720.0, 10.0).lastInsertRowid;

    insertMovement.run('FINISHED_PRODUCT', pKajuKatli, 'Kaju Katli Diamond Special', 25.0, 'KG', 25.0, 760.0, 19000.0);
    insertMovement.run('FINISHED_PRODUCT', pKesarPeda, 'Shreeji Kesar Peda', 20.0, 'KG', 20.0, 480.0, 9600.0);
    insertMovement.run('FINISHED_PRODUCT', pMotichoor, 'Desi Ghee Motichoor Ladoo', 30.0, 'KG', 30.0, 360.0, 10800.0);
    insertMovement.run('FINISHED_PRODUCT', pGulabJamun, 'Angoori Gulab Jamun', 18.0, 'KG', 18.0, 320.0, 5760.0);
    insertMovement.run('SEMI_FINISHED', pKajuPaste, 'Prepared Fine Kaju Paste', 10.0, 'KG', 10.0, 720.0, 7200.0);

    // 5. Recipe: Kaju Katli Standard Recipe (10 KG Batch)
    const insertRecipe = db.prepare(`
      INSERT INTO recipes (code, name, product_id, batch_size, batch_unit, description, is_semi_finished, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const recKaju = insertRecipe.run('REC-KK-01', 'Standard Pure Kaju Katli Batch', pKajuKatli, 10.0, 'KG', 'Traditional diamond cut Kaju Katli with silver foil', 0).lastInsertRowid;

    // Recipe Version 1
    const insertRecVer = db.prepare(`
      INSERT INTO recipe_versions (
        recipe_id, version_number, effective_date, expected_yield, expected_yield_unit,
        expected_wastage_pct, labour_cost_type, labour_cost_rate, overhead_cost_type,
        overhead_cost_rate, packaging_cost, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const recKajuVer1 = insertRecVer.run(
      recKaju, 1, '2026-04-01', 10.0, 'KG', 4.0,
      'PER_BATCH', 500.0, 'PER_BATCH', 200.0, 100.0,
      'Approved authentic formula for Diwali & Daily retail counter', 'ACTIVE'
    ).lastInsertRowid;

    // Update recipe active version
    db.prepare('UPDATE recipes SET active_version_id = ? WHERE id = ?').run(recKajuVer1, recKaju);
    db.prepare('UPDATE products SET recipe_id = ? WHERE id = ?').run(recKaju, pKajuKatli);

    // Recipe Items
    const insertRecItem = db.prepare(`
      INSERT INTO recipe_items (recipe_version_id, item_type, raw_material_id, semi_finished_product_id, quantity, unit, standard_rate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRecItem.run(recKajuVer1, 'RAW_MATERIAL', rmCashew, null, 8.0, 'KG', 800.0, 'Cashew W320 Whole graded');
    insertRecItem.run(recKajuVer1, 'RAW_MATERIAL', rmSugar, null, 4.0, 'KG', 45.0, 'Refined clean sugar syrup');
    insertRecItem.run(recKajuVer1, 'RAW_MATERIAL', rmGhee, null, 0.2, 'KG', 620.0, '200 GM Pure Cow Ghee for shine');
    insertRecItem.run(recKajuVer1, 'PACKAGING', rmSilver, null, 50.0, 'PCS', 3.0, 'Silver Vark sheets applied on top');

    // Recipe: Kesar Peda (10 KG Batch)
    const recPeda = insertRecipe.run('REC-KP-01', 'Rich Saffron Mawa Peda Formula', pKesarPeda, 10.0, 'KG', 'Rich slow cooked Mawa infused with Kashmiri Kesar & Elaichi', 0).lastInsertRowid;
    const recPedaVer1 = insertRecVer.run(
      recPeda, 1, '2026-04-01', 10.0, 'KG', 5.0,
      'PER_BATCH', 450.0, 'PER_BATCH', 180.0, 80.0,
      'Standard Katargam branch recipe', 'ACTIVE'
    ).lastInsertRowid;
    db.prepare('UPDATE recipes SET active_version_id = ? WHERE id = ?').run(recPedaVer1, recPeda);
    db.prepare('UPDATE products SET recipe_id = ? WHERE id = ?').run(recPeda, pKesarPeda);

    insertRecItem.run(recPedaVer1, 'RAW_MATERIAL', rmMawa, null, 7.5, 'KG', 340.0, 'Fresh soft khoya');
    insertRecItem.run(recPedaVer1, 'RAW_MATERIAL', rmSugar, null, 3.2, 'KG', 45.0, 'Fine sugar');
    insertRecItem.run(recPedaVer1, 'RAW_MATERIAL', rmKesar, null, 5.0, 'GM', 240.0, '5 GM Saffron dissolved in warm milk');
    insertRecItem.run(recPedaVer1, 'RAW_MATERIAL', rmElaichi, null, 0.05, 'KG', 2800.0, '50 GM Freshly crushed cardamom');
    insertRecItem.run(recPedaVer1, 'RAW_MATERIAL', rmPista, null, 0.2, 'KG', 1450.0, '200 GM Pistachio garnish');

    // 6. Customers
    const insertCust = db.prepare(`
      INSERT INTO customers (customer_no, name, mobile, address, gstin, opening_balance, credit_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const cust1 = insertCust.run('CUST-001', 'Rameshwar Sweets & Caterers', '+91 98980 12345', 'Ghod Dod Road, Surat', '24AAACR9999R1Z1', 0.0, 100000.0).lastInsertRowid;
    const cust2 = insertCust.run('CUST-002', 'Patel Brothers Corporate Sweets', '+91 97270 54321', 'Varachha Main Road, Surat', '', 0.0, 50000.0).lastInsertRowid;
    const cust3 = insertCust.run('CUST-003', 'Shreeji Retail Counter Walk-in', '+91 98240 88990', 'Katargam, Surat', '', 0.0, 0.0).lastInsertRowid;

    // 7. Seed Sample Manufacturing Batch with LOCKED HISTORICAL COST SNAPSHOT
    const insertMfg = db.prepare(`
      INSERT INTO manufacturing_orders (
        manufacturing_no, date, finished_product_id, recipe_id, recipe_version_id,
        batch_number, planned_quantity, planned_unit, actual_output, actual_unit,
        wastage_quantity, wastage_pct, wastage_reason, production_location, operator,
        notes, status, total_material_cost, total_labour_cost, total_overhead_cost,
        total_packaging_cost, total_batch_cost, cost_per_unit, standard_cost_per_unit,
        cost_variance, cost_variance_pct, costing_method_used, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Master Example Calculation:
    // Cashew 8 KG @ 800 = 6400, Sugar 4 KG @ 45 = 180, Ghee 200g @ 600/kg = 120, Silver = 100 => Mat = 6800
    // Labour = 500, Gas/Overhead = 200, Packaging = 100 => Total = 7600
    // Actual output = 9.6 KG => Cost per KG = 7600 / 9.6 = 791.67 / KG
    const mfg1 = insertMfg.run(
      'MFG/26-27/001', '2026-08-01', pKajuKatli, recKaju, recKajuVer1,
      'BAT-2026-0801', 10.0, 'KG', 9.6, 'KG',
      0.4, 4.0, 'Normal steam process loss & corner edge trimmings', 'Main Katargam Workshop', 'Karigar Bhikhubhai',
      'Batch completed with premium diamond shine', 'COMPLETED',
      6800.0, 500.0, 200.0, 100.0, 7600.0, 791.67, 760.0, 31.67, 4.17, 'WEIGHTED_AVERAGE', 'Master Admin'
    ).lastInsertRowid;

    const insertMfgItem = db.prepare(`
      INSERT INTO manufacturing_items (
        manufacturing_order_id, item_type, raw_material_id, semi_finished_product_id,
        planned_quantity, actual_quantity, unit, unit_cost_snapshot, total_cost_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertMfgItem.run(mfg1, 'RAW_MATERIAL', rmCashew, null, 8.0, 8.0, 'KG', 800.0, 6400.0);
    insertMfgItem.run(mfg1, 'RAW_MATERIAL', rmSugar, null, 4.0, 4.0, 'KG', 45.0, 180.0);
    insertMfgItem.run(mfg1, 'RAW_MATERIAL', rmGhee, null, 0.2, 0.2, 'KG', 600.0, 120.0);
    insertMfgItem.run(mfg1, 'RAW_MATERIAL', rmSilver, null, 50.0, 50.0, 'PCS', 2.0, 100.0);

    const insertMfgWastage = db.prepare(`
      INSERT INTO manufacturing_wastage (
        manufacturing_order_id, wastage_type, quantity, unit, cost_loss, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMfgWastage.run(mfg1, 'NORMAL_PROCESS_LOSS', 0.4, 'KG', 304.0, 'Normal moisture evaporation during boiling', 'Standard moisture loss');

    // 8. Sample Sales Transaction with Wholesale Delivery & Vasan
    const insertSale = db.prepare(`
      INSERT INTO sales (
        invoice_no, date, customer_id, customer_name, customer_mobile,
        subtotal, discount_amount, tax_amount, round_off, grand_total,
        paid_amount, due_amount, payment_mode, status, notes, created_by,
        delivery_venue, delivery_address, driver_id, driver_name, driver_mobile,
        rickshaw_rent, rickshaw_rent_status, vasan_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const s1 = insertSale.run(
      'MS/26-27/001', '2026-08-05', cust1, 'Rameshwar Sweets & Caterers', '+91 98980 12345',
      9800.0, 300.0, 9500.0,
      5000.0, 4500.0, 'CREDIT', 'Catering wholesale order for wedding', 'Cashier Mahesh',
      'Avadh Utopia Party Plot', 'Dumas Road, Near Airport, Surat', 1, 'Raju Bhai Rickshaw', '+91 98251 11001',
      150.0, 'PENDING', 'Choki: 2'
    ).lastInsertRowid;

    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit, rate, discount, gst_rate, gst_amount, amount, vasan_type, vasan_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?)
    `);
    insertSaleItem.run(s1, pKajuKatli, 'Kaju Katli Diamond Special', 10.0, 'KG', 980.0, 300.0, 9500.0, 'Choki', 2);

    // Insert Vasan entry
    db.prepare(`
      INSERT INTO vasan_ledger (sale_id, customer_id, customer_name, driver_id, driver_name, date, item_name, vasan_type, issued_qty, returned_qty, due_qty, status, notes)
      VALUES (?, ?, ?, ?, ?, '2026-08-05', 'Kaju Katli Diamond Special', 'Choki', 2, 0, 2, 'PENDING_RETURN', 'Issued with Bill #MS/26-27/001')
    `).run(s1, cust1, 'Rameshwar Sweets & Caterers', 1, 'Raju Bhai Rickshaw');

    // Ledger entries for Sale #1
    const insertLedger = db.prepare(`
      INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Customer debited for total invoice
    insertLedger.run('2026-08-05', 'CUSTOMER', cust1, 'Rameshwar Sweets & Caterers', 'SALE', s1, 'MS/26-27/001', 9500.0, 0.0, 'Bill #MS/26-27/001 (Delivered: Avadh Utopia Party Plot)');
    // Cash received credited
    insertLedger.run('2026-08-05', 'CUSTOMER', cust1, 'Rameshwar Sweets & Caterers', 'PAYMENT_RECEIVED', s1, 'MS/26-27/001', 0.0, 5000.0, 'Part cash collection on bill');
    insertLedger.run('2026-08-05', 'CASH', 1, 'Counter Cash Drawer', 'PAYMENT_RECEIVED', s1, 'MS/26-27/001', 5000.0, 0.0, 'Counter cash received from Rameshwar');

    // 9. Sample Expenses
    const insertExp = db.prepare(`
      INSERT INTO expenses (expense_no, date, category, amount, payment_mode, reference_no, notes, is_manufacturing_overhead, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const exp1 = insertExp.run('EXP-2627-01', '2026-08-02', 'Commercial Gas Cylinders (LPG)', 3400.0, 'CASH', 'GAS-4491', '2x 19kg commercial cylinders for sweet preparation', 1, 'Admin').lastInsertRowid;
    const exp2 = insertExp.run('EXP-2627-02', '2026-08-03', 'Karigar Daily Wages (કારીગર મજૂરી)', 4500.0, 'CASH', 'WAGE-W1', 'Sweet Master team weekly advance', 1, 'Admin').lastInsertRowid;
    const exp3 = insertExp.run('EXP-2627-03', '2026-08-04', 'Shop Electricity Bill', 6800.0, 'BANK_TRANSFER', 'DGVCL-9921', 'Katargam Showroom power bill', 0, 'Admin').lastInsertRowid;
    const exp4 = insertExp.run('EXP-2627-04', '2026-08-05', 'Shop Rent (શોપ ભાડું)', 15000.0, 'BANK_TRANSFER', 'RENT-AUG', 'Main Bazar store monthly rent', 0, 'Admin').lastInsertRowid;

    insertLedger.run('2026-08-02', 'EXPENSE', 0, 'Commercial Gas Cylinders', 'EXPENSE', exp1, 'EXP-2627-01', 3400.0, 0.0, 'LPG Gas');
    insertLedger.run('2026-08-03', 'EXPENSE', 0, 'Karigar Wages', 'EXPENSE', exp2, 'EXP-2627-02', 4500.0, 0.0, 'Direct Labour');
    insertLedger.run('2026-08-04', 'EXPENSE', 0, 'Electricity', 'EXPENSE', exp3, 'EXP-2627-03', 6800.0, 0.0, 'Showroom Power');
    insertLedger.run('2026-08-05', 'EXPENSE', 0, 'Rent', 'EXPENSE', exp4, 'EXP-2627-04', 15000.0, 0.0, 'Store Rent');

    // 10. Audit log for initialization
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES ('System', 'CREATE', 'DATABASE', 'SEED-01', 'Initial sweets ERP dataset populated successfully')
    `).run();

    console.log('Seeding completed successfully!');
    return { success: true, message: 'Sample Sweets dataset seeded successfully' };
  });
}
