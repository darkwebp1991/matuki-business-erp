import sqlite3

db_path = r"F:\Matuki Business ERP\data\matuki.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [row[0] for row in cursor.fetchall()]
print(f"Matuki ERP Tables ({len(tables)}):")
for tbl in tables:
    cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
    cnt = cursor.fetchone()[0]
    print(f"  - {tbl}: {cnt} rows")

for target in ['products', 'raw_materials', 'recipes', 'recipe_ingredients', 'customers', 'suppliers', 'party_item_rates']:
    if target in tables:
        cursor.execute(f"PRAGMA table_info([{target}])")
        cols = [c[1] for c in cursor.fetchall()]
        print(f"\nSchema for {target}: {cols}")

conn.close()
