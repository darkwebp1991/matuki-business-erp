import sqlite3
import os
import sys

vyapar_db_path = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup\9099093394__t_2024_03_13_13_51_11_u25k___1753071238387.vyp"
matuki_db_path = r"F:\Matuki Business ERP\data\matuki.db"

print("======================================================================")
print("   MATUKI BUSINESS ERP -- AUTOMATED VYAPAR FULL DATA MIGRATION")
print("======================================================================")
print(f"Source Vyapar DB: {vyapar_db_path}")
print(f"Target Matuki DB: {matuki_db_path}")

if not os.path.exists(vyapar_db_path):
    print(f"ERROR: Vyapar database not found at {vyapar_db_path}")
    sys.exit(1)

v_conn = sqlite3.connect(vyapar_db_path)
v_cur = v_conn.cursor()

m_conn = sqlite3.connect(matuki_db_path)
m_cur = m_conn.cursor()

# ----------------------------------------------------------------------
# 1. UNIT MAPPING DICTIONARY
# ----------------------------------------------------------------------
v_cur.execute("SELECT unit_id, unit_name, unit_short_name FROM kb_item_units")
unit_rows = v_cur.fetchall()
unit_map = {}
for uid, uname, ushort in unit_rows:
    s = (ushort or uname or 'KG').upper().strip()
    if 'KG' in s or 'KILO' in s:
        unit_map[uid] = 'KG'
    elif 'GM' in s or 'GRAM' in s:
        unit_map[uid] = 'GM'
    elif 'LTR' in s or 'LITRE' in s:
        unit_map[uid] = 'LTR'
    elif 'ML' in s:
        unit_map[uid] = 'ML'
    elif 'PCS' in s or 'PIECE' in s:
        unit_map[uid] = 'PCS'
    elif 'BOX' in s:
        unit_map[uid] = 'BOX'
    elif 'BTL' in s or 'BOTTLE' in s:
        unit_map[uid] = 'BTL'
    elif 'PAC' in s or 'PACK' in s:
        unit_map[uid] = 'PAC'
    elif 'CAN' in s:
        unit_map[uid] = 'CAN'
    else:
        unit_map[uid] = s[:6]

print(f"\n[1/5] Loaded {len(unit_map)} unit definitions from Vyapar.")

# ----------------------------------------------------------------------
# 2. IMPORT CUSTOMERS & SUPPLIERS
# ----------------------------------------------------------------------
v_cur.execute("""
    SELECT name_id, full_name, phone_number, amount, name_type, address, name_gstin_number, email, pincode, credit_limit
    FROM kb_names
""")
parties = v_cur.fetchall()

cust_count = 0
supp_count = 0
party_id_map = {} # v_id -> m_id

for p in parties:
    name_id, full_name, phone, amount, name_type, address, gstin, email, pincode, credit_limit = p
    full_name = (full_name or '').strip()
    if not full_name or full_name.upper() in ['GENERAL MAINTENANCE', 'SALARY', 'GODOWN RENT']:
        continue
    
    phone = (phone or '').strip()
    address = (address or '').strip()
    gstin = (gstin or '').strip()
    email = (email or '').strip()
    amount = float(amount or 0.0)
    credit_limit = float(credit_limit or 0.0)

    if name_type == 1:
        # Customer / Caterer
        m_cur.execute("SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) OR (mobile != '' AND mobile = ?)", (full_name, phone))
        existing = m_cur.fetchone()
        if existing:
            m_id = existing[0]
            m_cur.execute("""
                UPDATE customers SET
                    mobile = COALESCE(NULLIF(?, ''), mobile),
                    address = COALESCE(NULLIF(?, ''), address),
                    gstin = COALESCE(NULLIF(?, ''), gstin),
                    opening_balance = CASE WHEN opening_balance = 0 THEN ? ELSE opening_balance END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (phone, address, gstin, amount, m_id))
        else:
            cust_no = f"CUST-{name_id:04d}"
            m_cur.execute("""
                INSERT INTO customers (customer_no, name, mobile, address, gstin, opening_balance, credit_limit, email, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (cust_no, full_name, phone, address, gstin, amount, credit_limit, email))
            m_id = m_cur.lastrowid
        
        party_id_map[name_id] = m_id
        cust_count += 1

    elif name_type == 2:
        # Supplier / Vendor
        m_cur.execute("SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(?) OR (mobile != '' AND mobile = ?)", (full_name, phone))
        existing = m_cur.fetchone()
        if existing:
            m_id = existing[0]
            m_cur.execute("""
                UPDATE suppliers SET
                    mobile = COALESCE(NULLIF(?, ''), mobile),
                    address = COALESCE(NULLIF(?, ''), address),
                    gstin = COALESCE(NULLIF(?, ''), gstin),
                    opening_balance = CASE WHEN opening_balance = 0 THEN ? ELSE opening_balance END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (phone, address, gstin, amount, m_id))
        else:
            supp_no = f"SUPP-{name_id:04d}"
            m_cur.execute("""
                INSERT INTO suppliers (supplier_no, name, mobile, address, gstin, opening_balance, email, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """, (supp_no, full_name, phone, address, gstin, amount, email))
            m_id = m_cur.lastrowid
        
        party_id_map[name_id] = m_id
        supp_count += 1

print(f"[2/5] Imported/Synced {cust_count} Customers and {supp_count} Suppliers.")

# ----------------------------------------------------------------------
# 3. IDENTIFY RAW MATERIALS VS FINISHED PRODUCTS
# ----------------------------------------------------------------------
v_cur.execute("SELECT DISTINCT def_assembly_item_id FROM item_def_assembly")
raw_item_ids = set(r[0] for r in v_cur.fetchall())

v_cur.execute("SELECT DISTINCT assembled_item_id FROM item_def_assembly")
finished_item_ids = set(r[0] for r in v_cur.fetchall())

v_cur.execute("""
    SELECT item_id, item_name, item_code, item_sale_unit_price, item_purchase_unit_price, 
           item_stock_quantity, item_type, base_unit_id, item_min_stock_quantity, item_hsn_sac_code
    FROM kb_items
    WHERE item_is_active = 1 OR item_is_active IS NULL
""")
items = v_cur.fetchall()

product_count = 0
raw_mat_count = 0
item_id_map = {} # v_item_id -> (type: 'PRODUCT'|'RAW', id: m_id)

for it in items:
    v_id, name, code, sale_price, purchase_price, stock_qty, itype, base_unit_id, min_stock, hsn = it
    name = (name or '').strip()
    if not name:
        continue
    
    code = (code or '').strip()
    sale_price = float(sale_price or 0.0)
    purchase_price = float(purchase_price or 0.0)
    stock_qty = float(stock_qty or 0.0)
    min_stock = float(min_stock or 0.0)
    hsn = (hsn or '').strip()
    unit = unit_map.get(base_unit_id, 'KG')

    is_raw_material = (v_id in raw_item_ids and v_id not in finished_item_ids)

    if is_raw_material:
        # Insert or Update Raw Material
        m_cur.execute("SELECT id FROM raw_materials WHERE LOWER(TRIM(name)) = LOWER(?)", (name,))
        existing = m_cur.fetchone()
        if existing:
            rm_id = existing[0]
            m_cur.execute("""
                UPDATE raw_materials SET
                    code = COALESCE(NULLIF(?, ''), code),
                    unit = ?,
                    current_purchase_rate = CASE WHEN current_purchase_rate = 0 THEN ? ELSE current_purchase_rate END,
                    current_stock = CASE WHEN current_stock = 0 THEN ? ELSE current_stock END,
                    hsn_code = COALESCE(NULLIF(?, ''), hsn_code),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (code, unit, purchase_price if purchase_price > 0 else sale_price, stock_qty, hsn, rm_id))
        else:
            m_cur.execute("""
                INSERT INTO raw_materials (code, name, unit, current_purchase_rate, standard_rate, min_stock, opening_stock, current_stock, hsn_code, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (code or f"RM-{v_id}", name, unit, purchase_price if purchase_price > 0 else sale_price, purchase_price, min_stock, stock_qty, stock_qty, hsn))
            rm_id = m_cur.lastrowid

        item_id_map[v_id] = ('RAW', rm_id)
        raw_mat_count += 1

    else:
        # Finished Good / Sweet / Snack Product
        m_cur.execute("SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(?)", (name,))
        existing = m_cur.fetchone()
        if existing:
            p_id = existing[0]
            m_cur.execute("""
                UPDATE products SET
                    code = COALESCE(NULLIF(?, ''), code),
                    unit = ?,
                    selling_rate = CASE WHEN selling_rate = 0 THEN ? ELSE selling_rate END,
                    purchase_rate = CASE WHEN purchase_rate = 0 THEN ? ELSE purchase_rate END,
                    current_stock = CASE WHEN current_stock = 0 THEN ? ELSE current_stock END,
                    hsn_code = COALESCE(NULLIF(?, ''), hsn_code),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (code, unit, sale_price, purchase_price, stock_qty, hsn, p_id))
        else:
            m_cur.execute("""
                INSERT INTO products (code, name, unit, selling_rate, purchase_rate, min_stock, opening_stock, current_stock, hsn_code, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (code or f"PRD-{v_id}", name, unit, sale_price, purchase_price, min_stock, stock_qty, stock_qty, hsn))
            p_id = m_cur.lastrowid

        item_id_map[v_id] = ('PRODUCT', p_id)
        product_count += 1

print(f"[3/5] Imported/Synced {product_count} Products and {raw_mat_count} Raw Materials.")

# ----------------------------------------------------------------------
# 4. IMPORT MANUFACTURING RECIPES (BOM / ASSEMBLY)
# ----------------------------------------------------------------------
v_cur.execute("""
    SELECT DISTINCT assembled_item_id 
    FROM item_def_assembly
""")
assembled_items = [r[0] for r in v_cur.fetchall()]
recipe_count = 0
recipe_item_count = 0

for v_assembled_id in assembled_items:
    if v_assembled_id not in item_id_map:
        continue
    
    prod_type, prod_id = item_id_map[v_assembled_id]
    
    # Get product details
    m_cur.execute("SELECT name, code, unit FROM products WHERE id = ?", (prod_id,))
    p_row = m_cur.fetchone()
    if not p_row:
        continue
    
    prod_name, prod_code, prod_unit = p_row
    recipe_name = f"{prod_name} Recipe"
    recipe_code = f"REC-{prod_id:04d}"

    # Check if recipe already exists
    m_cur.execute("SELECT id FROM recipes WHERE product_id = ?", (prod_id,))
    existing_rec = m_cur.fetchone()
    
    if existing_rec:
        recipe_id = existing_rec[0]
    else:
        m_cur.execute("""
            INSERT INTO recipes (code, name, product_id, batch_size, batch_unit, description, active)
            VALUES (?, ?, ?, 1.0, ?, 'Imported from Vyapar Manufacturing Formula', 1)
        """, (recipe_code, recipe_name, prod_id, prod_unit))
        recipe_id = m_cur.lastrowid

    # Create / get active version
    m_cur.execute("SELECT id FROM recipe_versions WHERE recipe_id = ? AND version_number = 1", (recipe_id,))
    v_row = m_cur.fetchone()
    if v_row:
        version_id = v_row[0]
        m_cur.execute("DELETE FROM recipe_items WHERE recipe_version_id = ?", (version_id,))
    else:
        m_cur.execute("""
            INSERT INTO recipe_versions (recipe_id, version_number, effective_date, expected_yield, expected_yield_unit, status, notes)
            VALUES (?, 1, CURRENT_DATE, 1.0, ?, 'ACTIVE', 'Standard Vyapar Formula')
        """, (recipe_id, prod_unit))
        version_id = m_cur.lastrowid
        m_cur.execute("UPDATE recipes SET active_version_id = ? WHERE id = ?", (version_id, recipe_id))

    # Link product to recipe
    m_cur.execute("UPDATE products SET recipe_id = ? WHERE id = ?", (recipe_id, prod_id))

    # Fetch all ingredients for this assembled item
    v_cur.execute("""
        SELECT def_assembly_item_id, def_assembly_item_qty, def_assembly_item_unit_id
        FROM item_def_assembly
        WHERE assembled_item_id = ?
    """, (v_assembled_id,))
    ingredients = v_cur.fetchall()

    for ing_v_id, ing_qty, ing_unit_id in ingredients:
        ing_qty = float(ing_qty or 0.0)
        if ing_qty <= 0:
            continue
        
        ing_unit = unit_map.get(ing_unit_id, 'KG')
        
        # Check if ingredient is mapped to raw_material or product
        if ing_v_id in item_id_map:
            ing_type, ing_db_id = item_id_map[ing_v_id]
            if ing_type == 'RAW':
                m_cur.execute("""
                    INSERT INTO recipe_items (recipe_version_id, item_type, raw_material_id, quantity, unit, standard_rate)
                    VALUES (?, 'RAW_MATERIAL', ?, ?, ?, 0.0)
                """, (version_id, ing_db_id, ing_qty, ing_unit))
            else:
                m_cur.execute("""
                    INSERT INTO recipe_items (recipe_version_id, item_type, semi_finished_product_id, quantity, unit, standard_rate)
                    VALUES (?, 'SEMI_FINISHED', ?, ?, ?, 0.0)
                """, (version_id, ing_db_id, ing_qty, ing_unit))
            
            recipe_item_count += 1

    recipe_count += 1

print(f"[4/5] Created/Configured {recipe_count} Sweet Recipes with {recipe_item_count} Ingredients.")

# ----------------------------------------------------------------------
# 5. COMMIT & SUMMARY
# ----------------------------------------------------------------------
m_conn.commit()
m_conn.close()
v_conn.close()

print("\n======================================================================")
print("SUCCESS: VYAPAR DATA IMPORT COMPLETE & COMMITTED SUCCESSFULLY!")
print("======================================================================")
print(f"  * Customers Imported:      {cust_count}")
print(f"  * Suppliers Imported:      {supp_count}")
print(f"  * Finished Products:       {product_count}")
print(f"  * Raw Materials:           {raw_mat_count}")
print(f"  * Sweet Recipes Configured:{recipe_count} ({recipe_item_count} ingredients)")
print("======================================================================\n")
