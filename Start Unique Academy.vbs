Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d D:\Unique && node launcher.js", 0, False

