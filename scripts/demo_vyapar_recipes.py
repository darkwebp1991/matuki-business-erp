import sqlite3
import pandas as pd

vyapar_db_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyapar_db_path)

# Query recipes from Vyapar
df_recipes = pd.read_sql_query("""
    SELECT 
        ki_assembled.item_id as sweet_id,
        ki_assembled.item_name as sweet_name,
        COUNT(ida.id) as ingredient_count
    FROM item_def_assembly ida
    JOIN kb_items ki_assembled ON ida.assembled_item_id = ki_assembled.item_id
    GROUP BY ki_assembled.item_id, ki_assembled.item_name
    ORDER BY ki_assembled.item_name ASC
""", conn)

print(f"Total Sweet Recipes present in Vyapar: {len(df_recipes)}")
print("\n--- SAMPLE 20 RECIPES IN VYAPAR WITH INGREDIENTS COUNT ---")
for idx, row in df_recipes.head(20).iterrows():
    print(f"{idx+1}. {row['sweet_name']} -> {row['ingredient_count']} Ingredients")

# Let's inspect 3 diverse recipes in full detail:
sample_sweets = ['KAJU KATLI', 'MOTICHUR LAADU', 'MALAI PENDA', 'GULAB JAMBU']
for sw in sample_sweets:
    df_sw = pd.read_sql_query(f"""
        SELECT 
            ki_assembled.item_name as sweet_name,
            ki_raw.item_name as ingredient_name,
            ida.def_assembly_item_qty as quantity,
            u.unit_short_name as unit
        FROM item_def_assembly ida
        JOIN kb_items ki_assembled ON ida.assembled_item_id = ki_assembled.item_id
        JOIN kb_items ki_raw ON ida.def_assembly_item_id = ki_raw.item_id
        JOIN kb_item_units u ON ida.def_assembly_item_unit_id = u.unit_id
        WHERE ki_assembled.item_name LIKE '%{sw}%'
    """, conn)
    if not df_sw.empty:
        print(f"\n==========================================")
        print(f"RECIPE: {df_sw['sweet_name'].iloc[0]}")
        print(f"==========================================")
        for _, r in df_sw.iterrows():
            print(f"  * {r['ingredient_name']}: {r['quantity']} {r['unit']}")

conn.close()
