import os
import zipfile
import sqlite3
import pandas as pd

vyb_path = r"C:\Users\MATUKI\Pictures\New folder\18-08-2026_15.40.41_SWEETS..._VypBackup.vyb"
extract_dir = r"F:\Matuki Business ERP\scratch\extracted_vyapar"
os.makedirs(extract_dir, exist_ok=True)

with zipfile.ZipFile(vyb_path, 'r') as z:
    z.extractall(extract_dir)
    extracted_files = z.namelist()

print(f"Extracted {len(extracted_files)} files to {extract_dir}")
vyp_file = os.path.join(extract_dir, extracted_files[0])
print(f"Main database file: {vyp_file} ({os.path.getsize(vyp_file) / (1024*1024):.2f} MB)")

conn = sqlite3.connect(vyp_file)
cur = conn.cursor()

# 1. Check Firm Details
print("\n=== FIRM / COMPANY INFO ===")
cur.execute("SELECT * FROM kb_firms")
cols = [c[0] for c in cur.description]
for r in cur.fetchall():
    d = dict(zip(cols, r))
    print(f"Firm Name: {d.get('firm_name')} | Phone: {d.get('firm_phone')} | State: {d.get('firm_state')} | Address: {d.get('firm_address')}")

# 2. Count Tables
print("\n=== KEY TABLE COUNTS ===")
for tbl in ['kb_names', 'kb_items', 'item_def_assembly', 'kb_party_item_rate', 'kb_transactions', 'kb_lineitems', 'kb_item_units']:
    try:
        cur.execute(f"SELECT COUNT(*) FROM [{tbl}]")
        print(f"  - {tbl}: {cur.fetchone()[0]} rows")
    except Exception as e:
        print(f"  - {tbl}: Error ({e})")

# 3. Sample Parties
print("\n=== SAMPLE PARTIES (kb_names) ===")
df_p = pd.read_sql_query("SELECT name_id, full_name, phone_number, amount, name_type FROM kb_names WHERE phone_number != '' LIMIT 8", conn)
print(df_p)

# 4. Sample Recipes
print("\n=== SAMPLE RECIPES (item_def_assembly) ===")
df_r = pd.read_sql_query("""
    SELECT 
        i_fin.item_name as finished_sweet,
        i_raw.item_name as ingredient,
        a.def_assembly_item_qty as qty,
        u.unit_short_name as unit
    FROM item_def_assembly a
    LEFT JOIN kb_items i_fin ON a.assembled_item_id = i_fin.item_id
    LEFT JOIN kb_items i_raw ON a.def_assembly_item_id = i_raw.item_id
    LEFT JOIN kb_item_units u ON a.def_assembly_item_unit_id = u.unit_id
    LIMIT 10
""", conn)
print(df_r)

conn.close()
