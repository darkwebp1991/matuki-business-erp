import sqlite3

db_path = r"F:\Matuki Business ERP\data\matuki.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA foreign_keys = OFF")

# Clean transaction and inventory tables
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
    cur.execute(f"DELETE FROM [{tbl}]")
    print(f"Cleared table: {tbl}")

# Re-enable foreign keys
cur.execute("PRAGMA foreign_keys = ON")
conn.commit()
conn.close()
print("\nDatabase reset to clean blank ERP state!")
