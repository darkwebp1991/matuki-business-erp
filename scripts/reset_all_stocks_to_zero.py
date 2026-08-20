import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

matuki_db_path = r"F:\Matuki Business ERP\data\matuki.db"
conn = sqlite3.connect(matuki_db_path)
cur = conn.cursor()

print("======================================================================")
print("     MATUKI BUSINESS ERP -- RESETTING ALL ITEM STOCKS TO 0 QTY")
print("======================================================================")

# 1. Reset products stock
cur.execute("UPDATE products SET opening_stock = 0.0, current_stock = 0.0")
prod_updated = cur.rowcount

# 2. Reset raw_materials stock
cur.execute("UPDATE raw_materials SET opening_stock = 0.0, current_stock = 0.0")
raw_updated = cur.rowcount

# 3. Clear stock movements and adjustments so history starts clean
cur.execute("DELETE FROM stock_movements")
cur.execute("DELETE FROM stock_adjustments")

conn.commit()

# Verify
cur.execute("SELECT COUNT(*), SUM(current_stock) FROM products")
p_check = cur.fetchone()
cur.execute("SELECT COUNT(*), SUM(current_stock) FROM raw_materials")
r_check = cur.fetchone()

conn.close()

print(f"[OK] Reset {prod_updated} Finished Products to 0 stock (Sum: {p_check[1]})")
print(f"[OK] Reset {raw_updated} Raw Materials to 0 stock (Sum: {r_check[1]})")
print("======================================================================")
print("ALL ITEM STOCKS SET TO EXACTLY 0.00 QTY!")
print("======================================================================")
