import sqlite3
import pandas as pd

vyapar_db_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyapar_db_path)
cur = conn.cursor()

# Find item id for AFGHANI MEVA
cur.execute("SELECT item_id, item_name, item_code, item_type, base_unit_id FROM kb_items WHERE item_name LIKE '%AFGHANI MEVA%'")
items = cur.fetchall()
print("Found items matching 'AFGHANI MEVA':", items)

# Check all assembly / manufacturing related tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%assembly%' OR name LIKE '%mfg%' OR name LIKE '%formula%' OR name LIKE '%bom%' OR name LIKE '%recipe%')")
mfg_tables = cur.fetchall()
print("\nManufacturing related tables in Vyapar:", mfg_tables)

# For each matching item, check item_def_assembly
for it in items:
    itm_id = it[0]
    print(f"\n--- item_def_assembly for item_id {itm_id} ({it[1]}) ---")
    df_ass = pd.read_sql_query(f"""
        SELECT 
            ida.*,
            ki.item_name as raw_item_name,
            u.unit_name,
            u.unit_short_name
        FROM item_def_assembly ida
        LEFT JOIN kb_items ki ON ida.def_assembly_item_id = ki.item_id
        LEFT JOIN kb_item_units u ON ida.def_assembly_item_unit_id = u.unit_id
        WHERE ida.assembled_item_id = {itm_id}
    """, conn)
    print(df_ass)

# Also check other tables where AFGHANI MEVA raw materials might be
for tbl in [t[0] for t in mfg_tables]:
    if tbl != 'item_def_assembly':
        print(f"\n--- Checking table {tbl} ---")
        try:
            df = pd.read_sql_query(f"SELECT * FROM {tbl} LIMIT 5", conn)
            print(df)
        except Exception as e:
            print("Error reading", tbl, e)

conn.close()
