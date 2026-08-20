import sqlite3
import pandas as pd

vyp_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyp_path)
cur = conn.cursor()

print("=== 1. ANALYZING kb_names (Parties) ===")
df_names = pd.read_sql_query("""
    SELECT name_id, full_name, phone_number, amount, name_type, name_expense_type, name_is_active 
    FROM kb_names
""", conn)

print("Total Parties:", len(df_names))
print("\nSum of amount grouped by name_type:")
print(df_names.groupby('name_type')['amount'].agg(['count', 'sum', lambda x: (x > 0).sum(), lambda x: (x < 0).sum()]))

pos_sum = df_names[df_names['amount'] > 0]['amount'].sum()
neg_sum = df_names[df_names['amount'] < 0]['amount'].sum()
print(f"\nPositive Amounts Sum (All parties): {pos_sum:,.2f}")
print(f"Negative Amounts Sum (All parties): {neg_sum:,.2f}")

print("\n=== 2. ANALYZING kb_transactions ===")
cur.execute("PRAGMA table_info(kb_transactions)")
cols = [c[1] for c in cur.fetchall()]
print("Transaction columns:", cols)

cur.execute("SELECT DISTINCT txn_type FROM kb_transactions")
types = cur.fetchall()
print("\nTransaction Types in kb_transactions:", types)

df_txns = pd.read_sql_query("""
    SELECT txn_type, COUNT(*) as cnt, SUM(txn_total_amount) as total_amt, SUM(txn_balance_amount) as bal_amt
    FROM kb_transactions
    GROUP BY txn_type
""", conn)
print(df_txns)

print("\n=== 3. CHECKING PARTY BALANCES FROM TRANSACTIONS ===")
# In Vyapar, let's see how party balance is calculated
df_party_bal = pd.read_sql_query("""
    SELECT 
        t.txn_name_id,
        n.full_name,
        n.amount as name_amount,
        n.name_type,
        SUM(CASE 
            WHEN t.txn_type IN (1, 4) THEN t.txn_balance_amount -- Sale / Debit Note
            WHEN t.txn_type IN (2, 3) THEN -t.txn_balance_amount -- Purchase / Credit Note
            ELSE 0 
        END) as txn_balance_sum
    FROM kb_transactions t
    JOIN kb_names n ON t.txn_name_id = n.name_id
    GROUP BY t.txn_name_id
    LIMIT 15
""", conn)
print(df_party_bal)

conn.close()
