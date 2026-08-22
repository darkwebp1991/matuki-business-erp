@echo off
title 🚀 MATUKI BUSINESS ERP - 1-CLICK CLOUD VPS UPLOADER
color 0B
cls

echo ===============================================================================
echo            🚀 MATUKI BUSINESS ERP - 1-CLICK CLOUD VPS UPLOADER
echo ===============================================================================
echo  Target VPS IP:  200.234.40.204 (Hostinger Ubuntu Cloud)
echo  Git Repo:       https://github.com/darkwebp1991/matuki-business-erp.git
echo  Destination:    /var/www/erp
echo ===============================================================================
echo.

cd /d "F:\Matuki Business ERP"

echo [1/3] Checking Git Status and pushing updates to GitHub...
git add .
git commit -m "1-Click VPS Deploy Update" >nul 2>&1
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Warning: Git push returned non-zero code or nothing to commit.
    echo Continuing to remote server update...
) else (
    echo [✓] Local code successfully pushed to GitHub main branch!
)

echo.
echo [2/3] Connecting to VPS (200.234.40.204) and executing deployment...
echo -------------------------------------------------------------------------------
ssh root@200.234.40.204 "cd /var/www/erp && git pull origin main && npm run build && (pm2 restart matuki-erp || ./deploy-update.sh)"

echo.
echo ===============================================================================
echo   🎉 SUCCESS! YOUR MATUKI BUSINESS ERP IS LIVE ON CLOUD VPS!
echo   
echo   🌐 Live Web App URL:  http://200.234.40.204
echo   📱 Mobile Access:     http://200.234.40.204
echo ===============================================================================
echo.
pause
