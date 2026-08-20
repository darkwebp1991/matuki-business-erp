import sqlite3
import pandas as pd
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r"F:\Matuki Business ERP\data\matuki.db")
cur = conn.cursor()

print("================================================================")
print("       MATUKI BUSINESS ERP -- RECIPES & MODULE SYNC AUDIT       ")
print("================================================================")

# 1. Check total recipes
cur.execute("SELECT COUNT(*) FROM recipes")
r_count = cur.fetchone()[0]

# 2. Check total recipe items (ingredients)
cur.execute("SELECT COUNT(*) FROM recipe_items")
ri_count = cur.fetchone()[0]

# 3. Check products with recipe_id set
cur.execute("SELECT COUNT(*) FROM products WHERE recipe_id IS NOT NULL")
p_linked_count = cur.fetchone()[0]

# 4. Check total products and raw materials
cur.execute("SELECT COUNT(*) FROM products")
prod_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM raw_materials")
raw_count = cur.fetchone()[0]

# 5. Check customers and suppliers
cur.execute("SELECT COUNT(*), SUM(opening_balance) FROM customers")
cust_info = cur.fetchone()
cur.execute("SELECT COUNT(*), SUM(opening_balance) FROM suppliers")
supp_info = cur.fetchone()

# 6. Check sales and purchases
cur.execute("SELECT COUNT(*) FROM sales")
sales_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM purchases")
pur_count = cur.fetchone()[0]

print(f"[OK] Sweet Manufacturing Recipes: {r_count} Formulas Loaded")
print(f"[OK] Total Ingredients Mapped:     {ri_count} Raw Material Rows")
print(f"[OK] Products Linked with Recipe:  {p_linked_count} Items")
print(f"[OK] Total Finished Products:      {prod_count} Items")
print(f"[OK] Total Raw Materials:          {raw_count} Materials")
print(f"[OK] Total Customers:              {cust_info[0]} (Receivable: Rs {cust_info[1]:,.2f})")
print(f"[OK] Total Suppliers:              {supp_info[0]} (Payable: Rs {supp_info[1]:,.2f})")
print(f"[OK] Historical Sales Invoices:    {sales_count} Bills")
print(f"[OK] Historical Purchase Bills:    {pur_count} Bills")
print("================================================================")

# Show Top 10 Sweet Recipes with their full ingredient breakdown
cur.execute("""
    SELECT r.id, r.name, p.name as product_name,
           (SELECT COUNT(*) FROM recipe_items ri WHERE ri.recipe_version_id = r.active_version_id) as ing_count
    FROM recipes r
    JOIN products p ON r.product_id = p.id
    ORDER BY r.name ASC
    LIMIT 10
""")
top_recs = cur.fetchall()
print("\n--- SAMPLE 10 RECIPES IN MATUKI ERP ---")
for tr in top_recs:
    print(f"  * Recipe #{tr[0]}: {tr[1]} -> Linked to Product: '{tr[2]}' ({tr[3]} Ingredients)")

conn.close()
