@echo off
setlocal

set "EXE_PATH=%~dp0resource-display.exe"
set "VBS_PATH=%~dp0resource-display-autostart.vbs"

if not exist "%EXE_PATH%" (
    echo [ERROR] resource-display.exe not found in "%~dp0"
    pause
    exit /b 1
)

echo Creating VBS script for hidden launch...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WScript.Sleep 12000
echo WshShell.Run """%EXE_PATH%""", 0, False
) > "%VBS_PATH%"

echo [OK] Autostart script configured!
echo.
pause
