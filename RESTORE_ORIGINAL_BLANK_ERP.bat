@echo off
title MATUKI BUSINESS ERP - RESTORE ORIGINAL BLANK ERP
color 0C
cls
echo ===============================================================================
echo            RESTORE ORIGINAL CLEAN / BLANK ERP DATABASE
echo ===============================================================================
echo.
echo WARNING: This will revert your database back to the original clean state
echo (before importing Vyapar products, parties, and recipes).
echo.
echo Your current data will be safely saved in backups\BEFORE_RESTORE_AUTO.db
echo.
set /p confirm=Are you sure you want to restore blank database? (Y/N): 
if /i "%confirm%" neq "Y" (
    echo.
    echo Operation cancelled by user.
    pause
    exit /b 0
)

echo.
echo [1/3] Stopping running node servers...
taskkill /F /IM node.exe /T >nul 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Taking safety backup of current database...
if not exist "backups" mkdir "backups"
copy /y "data\matuki.db" "backups\BEFORE_RESTORE_AUTO_%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.db" >nul

echo [3/3] Restoring original blank ERP database...
copy /y "backups\ORIGINAL_BLANK_ERP_BACKUP.db" "data\matuki.db" >nul

echo.
echo ===============================================================================
echo SUCCESS: Original Blank ERP Database has been restored!
echo ===============================================================================
echo.
echo Starting Matuki ERP...
start "" "START_MATUKI_ERP.bat"
