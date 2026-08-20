$src = 'C:\Users\MATUKI\.gemini\antigravity\scratch\matuki-business-erp'
$dst = 'F:\Matuki Business ERP'

Write-Host "Creating destination directory: $dst"
if (!(Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
}

Write-Host "1. Copying full project files, builds, scripts and node_modules..."
robocopy $src $dst /E /R:2 /W:1 /NP /NFL /NDL /XD "$src\data" "$src\wa_session"

Write-Host "2. Copying live SQLite database..."
$dbSrc = 'C:\Users\MATUKI\AppData\Local\Matuki Business ERP\data\matuki.db'
$dbDst = Join-Path $dst 'data'
if (!(Test-Path $dbDst)) {
    New-Item -ItemType Directory -Path $dbDst -Force | Out-Null
}
Copy-Item -Path $dbSrc -Destination (Join-Path $dbDst 'matuki.db') -Force
Write-Host "Database copied to: $dbDst\matuki.db (Size: $((Get-Item (Join-Path $dbDst 'matuki.db')).Length / 1KB) KB)"

Write-Host "3. Copying WhatsApp session files..."
$waSrc = 'C:\Users\MATUKI\AppData\Local\Matuki Business ERP\wa_session'
$waDst = Join-Path $dst 'wa_session'
if (!(Test-Path $waDst)) {
    New-Item -ItemType Directory -Path $waDst -Force | Out-Null
}
robocopy $waSrc $waDst /E /R:2 /W:1 /NP /NFL /NDL

Write-Host "4. Creating README in destination..."
$readmeContent = @"
===============================================================================
                    MATUKI BUSINESS ERP - PORTABLE BACKUP
===============================================================================

Location: F:\Matuki Business ERP

HOW TO RUN THE ERP FROM THIS FOLDER:
-----------------------------------
1. Double-click on:  START_MATUKI_ERP.bat
   - This automatically starts both Backend (port 4321) and Frontend (port 5173).
   - Opens your browser automatically to http://localhost:5173

HOW TO BACKUP YOUR DATABASE ANYTIME:
------------------------------------
1. Double-click on:  BACKUP_DATABASE.bat
   - This creates a timestamped copy of your database in F:\Matuki Business ERP\backups\

DATABASE LOCATION:
------------------
- Live SQLite database: F:\Matuki Business ERP\data\matuki.db

WHATSAPP SESSION:
-----------------
- Session files: F:\Matuki Business ERP\wa_session\
  (Your WhatsApp stays linked without needing to scan QR code again)

ALL SOURCE CODE & ASSETS:
-------------------------
- src\       (React TypeScript Frontend UI)
- server\    (Node.js SQLite Offline Backend)
- public\    (QR payment images, logos, fonts)

===============================================================================
"@
Set-Content -Path (Join-Path $dst 'README_FIRST.txt') -Value $readmeContent -Encoding UTF8

Write-Host "All files successfully shifted to F:\Matuki Business ERP!"
