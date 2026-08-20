@echo off
title MATUKI BUSINESS ERP - RESTORE VYAPAR IMPORTED DATABASE
color 0A
cls
echo ===============================================================================
echo            RESTORE VYAPAR IMPORTED ERP DATABASE (1,749 ITEMS, 443 PARTIES)
echo ===============================================================================
echo.
echo [1/3] Stopping running node servers...
taskkill /F /IM node.exe /T >nul 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Restoring Vyapar Imported ERP database...
copy /y "backups\MATUKI_WITH_VYAPAR_DATA_BACKUP.db" "data\matuki.db" >nul

echo.
echo ===============================================================================
echo SUCCESS: Vyapar imported data (1,749 Products, 443 Customers, 145 Recipes) restored!
echo ===============================================================================
echo.
echo Starting Matuki ERP...
start "" "START_MATUKI_ERP.bat"
