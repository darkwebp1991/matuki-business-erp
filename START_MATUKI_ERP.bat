@echo off
title MATUKI BUSINESS ERP - STARTUP CONTROLLER
color 0A
cls
echo ===============================================================================
echo                MATUKI BUSINESS ERP - OFFLINE SYSTEM LAUNCHER
echo ===============================================================================
echo.
echo [1/3] Checking Node.js Environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18+) to run Matuki ERP.
    pause
    exit /b 1
)

echo [2/3] Starting Matuki Backend Server (Port 4321)...
start "Matuki ERP Backend (Port 4321)" /min cmd /c "node server/index.js"

echo [3/3] Starting Matuki Web Frontend (Port 5173)...
start "Matuki ERP Frontend (Port 5173)" /min cmd /c "npm run dev -- --host --port 5173"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo ===============================================================================
echo   SUCCESS! Matuki Business ERP is running:
echo   - Web App URL:      http://localhost:5173
echo   - Local Wi-Fi URL:  Check Mobile Wi-Fi button in Navbar
echo   - Backend API:      http://localhost:4321
echo   - Database File:    data\matuki.db
echo ===============================================================================
echo.
echo Opening browser...
start http://localhost:5173

echo.
echo Keep this window open or minimize it. Press any key to stop all Matuki servers.
pause >nul

echo.
echo Stopping Matuki ERP servers...
taskkill /F /IM node.exe /T >nul 2>nul
echo All Matuki ERP processes stopped cleanly.
timeout /t 2 /nobreak >nul
