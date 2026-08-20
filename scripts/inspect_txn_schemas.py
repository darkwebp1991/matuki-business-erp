import sqlite3

conn = sqlite3.connect(r"F:\Matuki Business ERP\data\matuki.db")
cur = conn.cursor()

for t in ['sales', 'sale_items', 'purchases', 'purchase_items', 'expenses']:
    cur.execute(f"PRAGMA table_info([{t}])")
    print(f"\nSchema for {t}:")
    print([c[1] for c in cur.fetchall()])

conn.close()
