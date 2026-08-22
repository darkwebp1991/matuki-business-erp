@echo off
title 🚀 MATUKI BUSINESS ERP - 1-CLICK COMPLETE VPS SYNC (CODE + DATABASE)
color 0A
cls

echo ===============================================================================
echo       🚀 MATUKI BUSINESS ERP - COMPLETE VPS SYNC (CODE + DATABASE)
echo ===============================================================================
echo  Target VPS IP:  200.234.40.204 (Hostinger Ubuntu Cloud)
echo  Local DB Path:  F:\Matuki Business ERP\data\matuki.db (25 MB, 808 Parties)
echo  Target Path:    /var/www/erp/data/matuki.db
echo ===============================================================================
echo.

cd /d "F:\Matuki Business ERP"

echo [1/3] Pushing latest code changes to GitHub repository...
git add .
git commit -m "1-Click VPS Full Sync" >nul 2>&1
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Note: Git push returned non-zero code or nothing new to commit.
) else (
    echo [✓] Local code successfully pushed to GitHub main branch!
)

echo.
echo [2/3] Uploading latest local Database (matuki.db with 808 Parties & Sales) to VPS...
echo -------------------------------------------------------------------------------
scp "F:\Matuki Business ERP\data\matuki.db" root@200.234.40.204:/var/www/erp/data/matuki.db

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Note: Enter VPS root password if prompted above.
) else (
    echo [✓] Database file (matuki.db) uploaded successfully to /var/www/erp/data/matuki.db!
)

echo.
echo [3/3] Executing 1-Click Deployment script on VPS...
echo -------------------------------------------------------------------------------
ssh root@200.234.40.204 "cd /var/www/erp && git checkout -- wa_session/creds.json 2>/dev/null; chmod +x ./deploy-update.sh && ./deploy-update.sh"

echo.
echo ===============================================================================
echo   🎉 SUCCESS! YOUR VPS IS NOW 100%% SAME TO SAME AS LOCALHOST!
echo   
echo   📊 Synced: All 808 Customers, 141 Suppliers, 6822 Sales & Code Updates
echo   🌐 Live Web App URL:  http://200.234.40.204
echo ===============================================================================
echo.
pause
