import sqlite3
import pandas as pd
import json

vyapar_db = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup\9099093394__t_2024_03_13_13_51_11_u25k___1753071238387.vyp"
conn = sqlite3.connect(vyapar_db)

print("=== 1. PARTIES ANALYSIS (kb_names) ===")
df_parties = pd.read_sql_query("SELECT name_id, full_name, phone_number, amount, name_type, address, name_gstin_number FROM kb_names", conn)
print(f"Total Parties: {len(df_parties)}")
print("Party Types count:")
print(df_parties['name_type'].value_counts())
print("\nSample Customers (name_type == 1 or others):")
print(df_parties[df_parties['phone_number'].notnull() & (df_parties['phone_number'] != '')][['name_id', 'full_name', 'phone_number', 'amount', 'name_type']].head(10))

print("\n=== 2. UNITS MAPPING (kb_item_units) ===")
df_units = pd.read_sql_query("SELECT * FROM kb_item_units", conn)
print(df_units[['unit_id', 'unit_name', 'unit_short_name']])

print("\n=== 3. ITEMS ANALYSIS (kb_items) ===")
df_items = pd.read_sql_query("SELECT item_id, item_name, item_code, item_sale_unit_price, item_purchase_unit_price, item_stock_quantity, item_type, base_unit_id FROM kb_items", conn)
print(f"Total Items: {len(df_items)}")
print("Item Types count:")
print(df_items['item_type'].value_counts())

print("\n=== 4. RECIPES / BOM ANALYSIS (item_def_assembly) ===")
df_assembly = pd.read_sql_query("""
    SELECT 
        a.id,
        a.assembled_item_id,
        i_fin.item_name as finished_good,
        a.def_assembly_item_id,
        i_raw.item_name as raw_material,
        a.def_assembly_item_qty,
        u.unit_short_name as unit
    FROM item_def_assembly a
    LEFT JOIN kb_items i_fin ON a.assembled_item_id = i_fin.item_id
    LEFT JOIN kb_items i_raw ON a.def_assembly_item_id = i_raw.item_id
    LEFT JOIN kb_item_units u ON a.def_assembly_item_unit_id = u.unit_id
""", conn)
print(f"Total Recipe ingredient rows: {len(df_assembly)}")
unique_recipes = df_assembly['finished_good'].unique()
print(f"Total Unique Manufactured Sweets / Products with Recipes: {len(unique_recipes)}")
print("\nFirst 15 Sweets with Recipes in Vyapar:")
for name in unique_recipes[:15]:
    print(f"  • {name}")

print("\nSample Recipe Detail for:", unique_recipes[0] if len(unique_recipes) > 0 else "")
sample_recipe = df_assembly[df_assembly['finished_good'] == unique_recipes[0]]
print(sample_recipe[['raw_material', 'def_assembly_item_qty', 'unit']])

conn.close()
