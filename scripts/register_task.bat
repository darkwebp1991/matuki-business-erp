@echo off
setlocal
echo Importing Matuki ERP Daily 8:30 AM Task into Windows Task Scheduler...

schtasks /create /tn "Matuki_ERP_Daily_AutoStart" /xml "F:\Matuki Business ERP\scripts\Matuki_ERP_Daily_AutoStart.xml" /f

echo.
echo Verification:
schtasks /query /tn "Matuki_ERP_Daily_AutoStart" /fo LIST /v
