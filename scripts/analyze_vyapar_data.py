import sqlite3
import json

db_path = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup\9099093394__t_2024_03_13_13_51_11_u25k___1753071238387.vyp"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def print_table_info(table_name, limit=3):
    print(f"\n=======================================================")
    print(f"TABLE: {table_name}")
    print(f"=======================================================")
    cursor.execute(f"PRAGMA table_info([{table_name}])")
    columns = [row[1] for row in cursor.fetchall()]
    print("COLUMNS:", columns)
    
    cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
    total_cnt = cursor.fetchone()[0]
    print(f"TOTAL ROWS: {total_cnt}")
    
    cursor.execute(f"SELECT * FROM [{table_name}] LIMIT {limit}")
    rows = cursor.fetchall()
    for idx, r in enumerate(rows):
        row_dict = dict(zip(columns, r))
        print(f"\n--- Sample Row {idx+1} ---")
        print(json.dumps({k: str(v) for k, v in row_dict.items() if v is not None and v != ''}, indent=2))

# 1. Items (Products & Raw Materials)
print_table_info("kb_items", limit=3)

# 2. Parties (Customers & Suppliers)
print_table_info("kb_names", limit=3)

# 3. Manufacturing Assembly / Recipes
print_table_info("item_def_assembly", limit=5)

# 4. Manufacturing Additional Costs
print_table_info("item_def_assembly_additional_costs", limit=3)

# 5. Party Item Rates
print_table_info("kb_party_item_rate", limit=3)

conn.close()
