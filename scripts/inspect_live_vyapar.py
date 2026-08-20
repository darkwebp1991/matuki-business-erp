import os
import sqlite3

live_db = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\DIPS"
print(f"Inspecting LIVE Vyapar DB: {live_db}")
try:
    conn = sqlite3.connect(live_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Total Tables ({len(tables)}):")
    for tbl in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
            cnt = cursor.fetchone()[0]
            if cnt > 0:
                print(f"  - {tbl}: {cnt} rows")
        except Exception as te:
            pass
    conn.close()
except Exception as e:
    print(f"Error opening live DB: {e}")
