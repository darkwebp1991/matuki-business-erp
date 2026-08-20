$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\MATUKI BUSINESS ERP.lnk")
$Shortcut.TargetPath = "F:\Matuki Business ERP\START_MATUKI_ERP.bat"
$Shortcut.WorkingDirectory = "F:\Matuki Business ERP"
$Shortcut.Description = "Start Matuki Business ERP (Offline Billing & Accounts)"
$Shortcut.Save()
Write-Host "Created Desktop Shortcut: $DesktopPath\MATUKI BUSINESS ERP.lnk"
