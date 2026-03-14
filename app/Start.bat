@echo off
title Student Planner
cd /d "%~dp0"
start "" cmd /c "npm start"
timeout /t 2 >nul
exit
