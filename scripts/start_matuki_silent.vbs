Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "F:\Matuki Business ERP"
WshShell.Run """F:\Matuki Business ERP\scripts\start_servers_background.bat""", 0, False
Set WshShell = Nothing
