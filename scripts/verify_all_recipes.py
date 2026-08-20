import sqlite3
import pandas as pd

conn = sqlite3.connect(r"F:\Matuki Business ERP\data\matuki.db")
cur = conn.cursor()

# Check all recipes and their linked products
df = pd.read_sql_query("""
    SELECT 
        r.id as recipe_id,
        r.name as recipe_name,
        r.product_id,
        p.name as product_name,
        (SELECT COUNT(*) FROM recipe_items ri WHERE ri.recipe_version_id = r.active_version_id) as ingredient_count
    FROM recipes r
    LEFT JOIN products p ON r.product_id = p.id
    ORDER BY r.name ASC
""", conn)

print("Total Recipes in Matuki ERP:", len(df))
print("\nUnlinked recipes (product_id is null or invalid):", df['product_name'].isna().sum())
print("\nRecipes with 0 ingredients:", (df['ingredient_count'] == 0).sum())

print("\nSample 15 recipes with their product and ingredient count:")
print(df.head(15))

conn.close()
