@echo off
REM Stop server and caddy started by start-hidden
cd /d "%~dp0.."
REM If pid file exists, try to stop those PIDs
set PIDFILE=%~dp0hidden_pids.json
if exist "%PIDFILE%" (
  for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-Content -Raw -Path '%PIDFILE%' | ConvertFrom-Json) | ConvertTo-Json -Compress"`) do set JSON=%%i
  REM extract node pid
  for /f "delims=: tokens=2" %%a in ('echo %JSON% ^| findstr /i "node"') do set NODEPID=%%~a
  for /f "delims:, tokens=1" %%b in ("%NODEPID%") do set NODEPID=%%~b
  set NODEPID=%NODEPID:~0,10%
  if defined NODEPID (
    taskkill /PID %NODEPID% /F >nul 2>nul
  )
  REM extract caddy pid
  for /f "delims/: tokens=2" %%a in ('echo %JSON% ^| findstr /i "caddy"') do set CADDOYPID=%%~a
  if defined CADDOYPID (
    set CADDOYPID=%CADDOYPID:~0,10%
    taskkill /PID %CADDOYPID% /F >nul 2>nul
  )
  del /f /q "%PIDFILE%" >nul 2>nul
)
REM Also fallback to killing any node server.js processes
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
REM kill caddy processes as fallback
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'caddy.exe' -or ($_.CommandLine -like '*caddy*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Stop commands issued.
exit /b 0
