import sqlite3
import pandas as pd

vyapar_db_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyapar_db_path)

df = pd.read_sql_query("""
    SELECT 
        ida.id,
        ida.assembled_item_id,
        ki_assembled.item_name as sweet_name,
        ida.def_assembly_item_id,
        ki_raw.item_name as ingredient_name,
        ida.def_assembly_item_qty as quantity,
        u.unit_name,
        u.unit_short_name
    FROM item_def_assembly ida
    JOIN kb_items ki_assembled ON ida.assembled_item_id = ki_assembled.item_id
    JOIN kb_items ki_raw ON ida.def_assembly_item_id = ki_raw.item_id
    JOIN kb_item_units u ON ida.def_assembly_item_unit_id = u.unit_id
    WHERE ida.assembled_item_id = 641
""", conn)
print("=== VYAPAR RECIPE FOR AFGHANI MEVA (item_id 641) ===")
print(df[['id', 'ingredient_name', 'quantity', 'unit_short_name']])

print("\n=== CHECK WHAT IS CURRENTLY IN MATUKI ERP FOR AFGHANI MEVA ===")
m_conn = sqlite3.connect(r"F:\Matuki Business ERP\data\matuki.db")
df_matuki = pd.read_sql_query("""
    SELECT 
        r.id as recipe_id,
        r.name as recipe_name,
        p.id as product_id,
        p.name as product_name,
        ri.id as recipe_item_id,
        ri.item_type,
        ri.raw_material_id,
        rm.name as raw_material_name,
        ri.semi_finished_product_id,
        p2.name as semi_product_name,
        ri.quantity,
        ri.unit
    FROM recipes r
    JOIN products p ON r.product_id = p.id
    LEFT JOIN recipe_versions rv ON r.active_version_id = rv.id
    LEFT JOIN recipe_items ri ON rv.id = ri.recipe_version_id
    LEFT JOIN raw_materials rm ON ri.raw_material_id = rm.id
    LEFT JOIN products p2 ON ri.semi_finished_product_id = p2.id
    WHERE r.name LIKE '%AFGHANI MEVA%' OR p.name LIKE '%AFGHANI MEVA%'
""", m_conn)
print(df_matuki)

conn.close()
m_conn.close()
