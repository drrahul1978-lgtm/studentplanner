@echo off
title Student Planner - Setup
color 0A
echo.
echo  ===================================
echo    Student Planner - First Time Setup
echo  ===================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [!] Node.js is not installed.
    echo.
    echo  Opening the Node.js download page...
    echo  Install it, then run this file again.
    echo.
    start https://nodejs.org
    pause
    exit
)

echo  [OK] Node.js found!
echo.
echo  Installing app... please wait...
echo.
cd /d "%~dp0"
call npm install --silent 2>nul
echo.
echo  [OK] Installation complete!
echo.
echo  Starting Student Planner...
echo.
start "" cmd /c "cd /d "%~dp0" && npm start"
timeout /t 3 >nul
exit
