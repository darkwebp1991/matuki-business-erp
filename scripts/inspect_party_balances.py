import sqlite3
import pandas as pd

vyp_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
conn = sqlite3.connect(vyp_path)

df_neg = pd.read_sql_query("""
    SELECT name_id, full_name, phone_number, amount, name_type, address
    FROM kb_names
    WHERE amount < 0
    ORDER BY amount ASC
""", conn)

print("=== PARTIES WITH NEGATIVE BALANCE (PAYABLE / TO PAY) ===")
print(f"Total Negative Balance Parties: {len(df_neg)}")
print(f"Total Sum: {df_neg['amount'].sum():,.2f}")
print("\nTop 20 Payable Parties:")
print(df_neg.head(20).to_string(index=False))

print("\n=== PARTIES WITH POSITIVE BALANCE (RECEIVABLE / TO RECEIVE) ===")
df_pos = pd.read_sql_query("""
    SELECT name_id, full_name, phone_number, amount, name_type, address
    FROM kb_names
    WHERE amount > 0
    ORDER BY amount DESC
""", conn)
print(f"Total Positive Balance Parties: {len(df_pos)}")
print(f"Total Sum: {df_pos['amount'].sum():,.2f}")
print("\nTop 20 Receivable Parties:")
print(df_pos.head(20).to_string(index=False))

conn.close()
