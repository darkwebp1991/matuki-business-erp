@echo off
title MATUKI SWEETS OFFLINE BUSINESS ERP
echo ================================================================
echo   MATUKI SWEETS OFFLINE BUSINESS MANAGEMENT ^& MANUFACTURING ERP
echo ================================================================
echo Starting local offline SQLite backend server...
cd /d "%~dp0"
start "" cmd /c "node server/index.js"
timeout /t 2 >nul
echo Starting user interface...
start "" cmd /c "npm run preview -- --port 5173"
timeout /t 2 >nul
start http://localhost:5173
echo.
echo Application running offline at: http://localhost:5173
echo Business Database: %LOCALAPPDATA%\Matuki Business ERP\data\matuki.db
echo.
pause
