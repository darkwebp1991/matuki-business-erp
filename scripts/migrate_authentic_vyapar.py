import sqlite3
import os
import sys

vyapar_db_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
matuki_db_path = r"F:\Matuki Business ERP\data\matuki.db"

print("======================================================================")
print("   MATUKI BUSINESS ERP -- ACCURATE VYAPAR FULL DATA MIGRATION")
print("======================================================================")
print(f"Source DB: {vyapar_db_path}")
print(f"Target DB: {matuki_db_path}")

if not os.path.exists(vyapar_db_path):
    print(f"ERROR: Vyapar database not found at {vyapar_db_path}")
    sys.exit(1)

# Connect to Vyapar DB
v_conn = sqlite3.connect(vyapar_db_path)
v_cur = v_conn.cursor()

# Connect to Matuki DB
m_conn = sqlite3.connect(matuki_db_path)
m_cur = m_conn.cursor()

# ----------------------------------------------------------------------
# 0. CLEAN RESET TABLES (To avoid any duplicate or stale rows)
# ----------------------------------------------------------------------
m_cur.execute("PRAGMA foreign_keys = OFF")
tables_to_clear = [
    'advance_order_items', 'advance_orders',
    'sale_items', 'sales', 'sales_returns', 'sales_return_items',
    'purchase_items', 'purchases', 'purchase_returns', 'purchase_return_items',
    'payments', 'expenses', 'ledger_entries',
    'manufacturing_wastage', 'manufacturing_items', 'manufacturing_orders',
    'stock_movements', 'stock_adjustments', 'vasan_ledger',
    'recipe_items', 'recipe_versions', 'recipes',
    'products', 'raw_materials', 'customers', 'suppliers'
]
for tbl in tables_to_clear:
    m_cur.execute(f"DELETE FROM [{tbl}]")
m_cur.execute("PRAGMA foreign_keys = ON")
print("\n[0/4] Database tables cleaned for pristine migration.")

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
    elif 'BAG' in s:
        unit_map[uid] = 'BAG'
    else:
        unit_map[uid] = s[:6]

print(f"[1/4] Loaded {len(unit_map)} unit definitions from Vyapar.")

# ----------------------------------------------------------------------
# 2. IMPORT CUSTOMERS (Receivables) & SUPPLIERS (Payables)
# ----------------------------------------------------------------------
# Business Rule:
#   - amount < 0  -> SUPPLIER / VENDOR (We owe them money = Payable). opening_balance = abs(amount)
#   - amount > 0  -> CUSTOMER / CATERER (They owe us money = Receivable). opening_balance = amount
#   - amount == 0 -> If name_type == 2 -> Supplier, else -> Customer
v_cur.execute("""
    SELECT name_id, full_name, phone_number, amount, name_type, address, name_gstin_number, email, pincode, credit_limit
    FROM kb_names
    WHERE (name_is_active = 1 OR name_is_active IS NULL)
""")
parties = v_cur.fetchall()

cust_count = 0
supp_count = 0
total_receivable_imported = 0.0
total_payable_imported = 0.0

for p in parties:
    name_id, full_name, phone, amount, name_type, address, gstin, email, pincode, credit_limit = p
    full_name = (full_name or '').strip()
    if not full_name:
        continue
    
    phone = (phone or '').strip()
    address = (address or '').strip()
    gstin = (gstin or '').strip()
    email = (email or '').strip()
    amount = float(amount or 0.0)
    credit_limit = float(credit_limit or 0.0)

    # Determine Customer vs Supplier
    is_supplier = (amount < 0) or (name_type == 2)

    if is_supplier:
        # Supplier / Vendor / Creditor
        opening_payable = abs(amount)
        supp_no = f"SUPP-{name_id:04d}"
        m_cur.execute("""
            INSERT INTO suppliers (supplier_no, name, mobile, address, gstin, opening_balance, email, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (supp_no, full_name, phone, address, gstin, opening_payable, email))
        supp_count += 1
        total_payable_imported += opening_payable

    else:
        # Customer / Caterer / Debtor
        opening_receivable = amount
        cust_no = f"CUST-{name_id:04d}"
        m_cur.execute("""
            INSERT INTO customers (customer_no, name, mobile, address, gstin, opening_balance, credit_limit, email, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (cust_no, full_name, phone, address, gstin, opening_receivable, credit_limit, email))
        cust_count += 1
        total_receivable_imported += opening_receivable

print(f"[2/4] Imported {cust_count} Customers (Total Receivable: Rs {total_receivable_imported:,.2f})")
print(f"      Imported {supp_count} Suppliers (Total Payable: Rs {total_payable_imported:,.2f})")

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
item_id_map = {}

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
        # Insert Raw Material
        m_cur.execute("""
            INSERT INTO raw_materials (code, name, unit, current_purchase_rate, standard_rate, min_stock, opening_stock, current_stock, hsn_code, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (code or f"RM-{v_id}", name, unit, purchase_price if purchase_price > 0 else sale_price, purchase_price, min_stock, stock_qty, stock_qty, hsn))
        rm_id = m_cur.lastrowid
        item_id_map[v_id] = ('RAW', rm_id)
        raw_mat_count += 1

    else:
        # Insert Finished Product
        m_cur.execute("""
            INSERT INTO products (code, name, unit, selling_rate, purchase_rate, min_stock, opening_stock, current_stock, hsn_code, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (code or f"PRD-{v_id}", name, unit, sale_price, purchase_price, min_stock, stock_qty, stock_qty, hsn))
        p_id = m_cur.lastrowid
        item_id_map[v_id] = ('PRODUCT', p_id)
        product_count += 1

print(f"[3/4] Imported {product_count} Products and {raw_mat_count} Raw Materials.")

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

    m_cur.execute("""
        INSERT INTO recipes (code, name, product_id, batch_size, batch_unit, description, active)
        VALUES (?, ?, ?, 1.0, ?, 'Imported from Vyapar Formula', 1)
    """, (recipe_code, recipe_name, prod_id, prod_unit))
    recipe_id = m_cur.lastrowid

    # Create active version
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

print(f"[4/4] Created/Configured {recipe_count} Sweet Recipes with {recipe_item_count} Ingredients.")

# ----------------------------------------------------------------------
# 5. COMMIT & SUMMARY
# ----------------------------------------------------------------------
m_conn.commit()
m_conn.close()
v_conn.close()

print("\n======================================================================")
print("SUCCESS: AUTHENTIC VYAPAR FULL DATA MIGRATION COMMITTED!")
print("======================================================================")
print(f"  * Total Customers:         {cust_count}")
print(f"  * Total Receivable (Due):  Rs {total_receivable_imported:,.2f}")
print(f"  * Total Suppliers:         {supp_count}")
print(f"  * Total Payable (Due):     Rs {total_payable_imported:,.2f}")
print(f"  * Finished Products:       {product_count}")
print(f"  * Raw Materials:           {raw_mat_count}")
print(f"  * Sweet Recipes:           {recipe_count} ({recipe_item_count} ingredients)")
print("======================================================================\n")
