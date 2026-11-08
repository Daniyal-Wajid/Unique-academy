@echo off
echo ====================================================
echo Unique Academy - Automated Monthly Fee Reminder Dispatch
echo ====================================================
echo Sending automated Fee Reminder SMS to all unpaid students...

curl -X POST "http://localhost:3000/api/sms/cron/fee-reminders" -H "Content-Type: application/json"

echo.
echo ====================================================
echo Fee reminder dispatch completed.
echo ====================================================
pause

