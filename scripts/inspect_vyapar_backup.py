import os
import zipfile
import glob
import sqlite3

backup_dir = r"C:\Users\MATUKI\AppData\Roaming\Vyaparapp\VyaparBackup"
vyp_files = sorted(glob.glob(os.path.join(backup_dir, "*.vyp")), key=os.path.getmtime, reverse=True)

print(f"Found {len(vyp_files)} .vyp backup files.")
for f in vyp_files[:5]:
    print(f"\n--- Checking file: {os.path.basename(f)} ({os.path.getsize(f)} bytes) ---")
    try:
        if zipfile.is_zipfile(f):
            print("Is valid ZIP archive! Contents:")
            with zipfile.ZipFile(f, 'r') as z:
                for info in z.infolist()[:15]:
                    print(f"  {info.filename} ({info.file_size} bytes)")
        else:
            with open(f, 'rb') as fp:
                header = fp.read(16)
                print(f"Not standard zip. Header: {header}")
    except Exception as e:
        print(f"Error inspecting {f}: {e}")
