import sqlite3
import pandas as pd

vyp_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyp_path)

df_stock = pd.read_sql_query("""
    SELECT item_id, item_name, item_stock_quantity, item_sale_unit_price, item_purchase_unit_price, item_stock_value
    FROM kb_items
    WHERE item_stock_quantity != 0
    ORDER BY item_stock_quantity ASC
""", conn)

print("Total items with non-zero stock in Vyapar:", len(df_stock))
print("Negative stock items:", (df_stock['item_stock_quantity'] < 0).sum())
print("Positive stock items:", (df_stock['item_stock_quantity'] > 0).sum())
print("\nTop 10 Negative Stock items in Vyapar:")
print(df_stock.head(10)[['item_name', 'item_stock_quantity', 'item_sale_unit_price']])
print("\nTop 10 Positive Stock items in Vyapar:")
print(df_stock.tail(10)[['item_name', 'item_stock_quantity', 'item_purchase_unit_price']])

conn.close()
