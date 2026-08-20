@echo off
title MATUKI BUSINESS ERP - DATABASE BACKUP TOOL
color 0B
cls
echo ===============================================================================
echo                MATUKI BUSINESS ERP - ONE-CLICK DATABASE BACKUP
echo ===============================================================================
echo.

set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set SOURCE_DB=%~dp0data\matuki.db
if not exist "%SOURCE_DB%" (
    set SOURCE_DB=%LOCALAPPDATA%\Matuki Business ERP\data\matuki.db
)

if not exist "%SOURCE_DB%" (
    echo [ERROR] Database file matuki.db not found!
    pause
    exit /b 1
)

set TARGET_BACKUP=%BACKUP_DIR%\matuki_backup_%TIMESTAMP%.db
echo Backing up database:
echo Source: "%SOURCE_DB%"
echo Target: "%TARGET_BACKUP%"
echo.

copy /Y "%SOURCE_DB%" "%TARGET_BACKUP%" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Backup created successfully at:
    echo %TARGET_BACKUP%
) else (
    echo [ERROR] Failed to copy database!
)

echo.
echo ===============================================================================
pause
