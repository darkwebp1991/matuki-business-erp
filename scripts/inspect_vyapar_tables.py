import os
import glob
import sqlite3

backup_dir = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup"
vyp_files = sorted(glob.glob(os.path.join(backup_dir, "*.vyp")), key=os.path.getmtime, reverse=True)

for f in vyp_files[:4]:
    print(f"\n=======================================================")
    print(f"DATABASE: {os.path.basename(f)} ({os.path.getsize(f) / (1024*1024):.2f} MB)")
    print(f"=======================================================")
    try:
        conn = sqlite3.connect(f)
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
        print(f"Error opening DB {f}: {e}")
