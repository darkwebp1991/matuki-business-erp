import os
import glob
import sqlite3

backup_dir = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup"
vyp_files = sorted(glob.glob(os.path.join(backup_dir, "*.vyp")), key=os.path.getmtime, reverse=True)

for f in vyp_files:
    fname = os.path.basename(f)
    try:
        conn = sqlite3.connect(f)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(kb_firms)")
        cols = [c[1] for c in cur.fetchall()]
        cur.execute(f"SELECT * FROM kb_firms LIMIT 3")
        firms = cur.fetchall()
        print(f"\nFile: {fname} (Modified: {os.path.getmtime(f)})")
        for firm in firms:
            d = dict(zip(cols, firm))
            print(f"  -> Firm Name: {d.get('firm_name') or d.get('name') or d.get('business_name')} | Info: {d}")
        conn.close()
    except Exception as e:
        print(f"\nFile: {fname} -> Error: {e}")
