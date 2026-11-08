@echo off
title Unique Academy - Real-Time Fingerprint Sync
echo ========================================================
echo   UNIQUE ACADEMY - REAL-TIME ATTENDANCE SYNC MONITOR
echo ========================================================
echo   Leave this window open or minimized on your desk.
echo   Whenever ANY student places their finger on the MB460,
echo   their attendance will instantly appear in the web app!
echo ========================================================
echo.
cd /d "%~dp0"
python sync.py --live
pause
