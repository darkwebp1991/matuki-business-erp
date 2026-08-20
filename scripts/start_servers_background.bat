@echo off
setlocal enabledelayedexpansion

:: Set Working Directory to the ERP Root Folder
cd /d "F:\Matuki Business ERP"

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir "logs"

echo ======================================================= >> logs\auto_start.log
echo [MATUKI AUTO-START] Triggered at %DATE% %TIME% >> logs\auto_start.log

:: 1. Check if Node.js Backend is already running on port 4321
netstat -ano | findstr /R /C:":4321 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Port 4321 not detected. Starting Matuki Node Backend... >> logs\auto_start.log
    start "Matuki ERP Backend (4321)" /min "C:\Program Files\nodejs\node.exe" server/index.js
    echo [SUCCESS] Backend Node process launched. >> logs\auto_start.log
) else (
    echo [INFO] Backend is already running on port 4321. >> logs\auto_start.log
)

:: 2. Check if Vite Frontend is running on port 5173
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Port 5173 not detected. Starting Matuki Frontend... >> logs\auto_start.log
    start "Matuki ERP Frontend (5173)" /min cmd.exe /c "npm run dev -- --host --port 5173"
    echo [SUCCESS] Frontend process launched. >> logs\auto_start.log
) else (
    echo [INFO] Frontend is already running on port 5173. >> logs\auto_start.log
)

echo [MATUKI AUTO-START] Completed at %DATE% %TIME% >> logs\auto_start.log
echo ======================================================= >> logs\auto_start.log

exit /b 0
