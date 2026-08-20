import os
import zipfile
import sqlite3

backup_path = r"C:\Users\MATUKI\Pictures\New folder\18-08-2026_15.40.41_SWEETS..._VypBackup.vyb"

print(f"Inspecting file: {backup_path}")
print(f"File Size: {os.path.getsize(backup_path)} bytes")

with open(backup_path, 'rb') as f:
    header = f.read(32)
    print(f"Header bytes: {header}")

if zipfile.is_zipfile(backup_path):
    print("File is a ZIP archive! Contents:")
    with zipfile.ZipFile(backup_path, 'r') as z:
        for info in z.infolist():
            print(f"  {info.filename} ({info.file_size} bytes)")
else:
    print("Not a standard zip file. Checking if SQLite...")
    try:
        conn = sqlite3.connect(backup_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Is a direct SQLite database! Found {len(tables)} tables:")
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM [{t}]")
            cnt = cur.fetchone()[0]
            if cnt > 0:
                print(f"  - {t}: {cnt} rows")
        conn.close()
    except Exception as e:
        print(f"Error checking SQLite: {e}")
