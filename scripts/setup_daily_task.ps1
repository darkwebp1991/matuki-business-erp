# Register Windows Scheduled Task for Matuki ERP Daily 8:30 AM Auto-Start
$TaskName = "Matuki_ERP_Daily_AutoStart"
$Description = "Automatically starts Matuki Business ERP Node.js Backend and Frontend daily at 8:30 AM without user intervention (even if screen is locked)."

$Action = New-ScheduledTaskAction `
    -Execute "wscript.exe" `
    -Argument "`"F:\Matuki Business ERP\scripts\start_matuki_silent.vbs`"" `
    -WorkingDirectory "F:\Matuki Business ERP"

# Trigger 1: Daily at 8:30 AM
$TriggerDaily = New-ScheduledTaskTrigger -Daily -At "08:30AM"

# Trigger 2: At Logon
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

# Unregister if already exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Register the new task for the current user
Register-ScheduledTask `
    -TaskName $TaskName `
    -Description $Description `
    -Action $Action `
    -Trigger @($TriggerDaily, $TriggerLogon) `
    -Settings $Settings `
    -User $env:USERNAME

Write-Host "==========================================================="
Write-Host "SUCCESS: Windows Scheduled Task '$TaskName' Registered!"
Write-Host "Schedule: Daily at 8:30 AM + At Logon"
Write-Host "==========================================================="
