@echo off
echo ====================================================
echo Unique Academy - ZKTeco MB460 Attendance Sync
echo ====================================================
cd /d "%~dp0"
python sync.py %*
pause
