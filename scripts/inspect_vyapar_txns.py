import sqlite3
import pandas as pd

vyp_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyp_path)
cur = conn.cursor()

print("=== 1. TRANSACTION TYPES & COUNTS IN VYAPAR ===")
df_types = pd.read_sql_query("""
    SELECT 
        txn_type,
        COUNT(*) as count,
        MIN(txn_date) as earliest_date,
        MAX(txn_date) as latest_date,
        SUM(txn_cash_amount + txn_balance_amount) as total_value
    FROM kb_transactions
    GROUP BY txn_type
""", conn)
print(df_types)

print("\n=== 2. SAMPLE SALES INVOICES (txn_type == 1) ===")
df_sales = pd.read_sql_query("""
    SELECT 
        t.txn_id,
        t.txn_ref_number_char as invoice_no,
        t.txn_date,
        t.txn_name_id,
        n.full_name as party_name,
        (t.txn_cash_amount + t.txn_balance_amount) as grand_total,
        t.txn_cash_amount as paid_amount,
        t.txn_balance_amount as due_amount,
        t.txn_display_name
    FROM kb_transactions t
    LEFT JOIN kb_names n ON t.txn_name_id = n.name_id
    WHERE t.txn_type = 1
    ORDER BY t.txn_date DESC
    LIMIT 5
""", conn)
print(df_sales)

print("\n=== 3. SAMPLE PURCHASES (txn_type == 2) ===")
df_purchases = pd.read_sql_query("""
    SELECT 
        t.txn_id,
        t.txn_ref_number_char as bill_no,
        t.txn_date,
        t.txn_name_id,
        n.full_name as party_name,
        (t.txn_cash_amount + t.txn_balance_amount) as grand_total,
        t.txn_cash_amount as paid_amount,
        t.txn_balance_amount as due_amount
    FROM kb_transactions t
    LEFT JOIN kb_names n ON t.txn_name_id = n.name_id
    WHERE t.txn_type = 2
    ORDER BY t.txn_date DESC
    LIMIT 5
""", conn)
print(df_purchases)

print("\n=== 4. SAMPLE LINE ITEMS (kb_lineitems) ===")
cur.execute("PRAGMA table_info(kb_lineitems)")
cols = [c[1] for c in cur.fetchall()]
print("Lineitem Columns:", cols)

df_lines = pd.read_sql_query("""
    SELECT 
        l.lineitem_txn_id,
        l.lineitem_item_id,
        i.item_name,
        l.lineitem_quantity,
        l.lineitem_price,
        l.lineitem_total_amount
    FROM kb_lineitems l
    LEFT JOIN kb_items i ON l.lineitem_item_id = i.item_id
    LIMIT 10
""", conn)
print(df_lines)

conn.close()
