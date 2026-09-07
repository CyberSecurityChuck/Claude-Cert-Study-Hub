@echo off
REM Start server and (optional) Caddy with minimized windows so they do not intrude.
cd /d "%~dp0.."
:: Find node.exe: prefer PATH, then common install locations
where node >nul 2>nul
if errorlevel 1 (
  set "NODE_CAND=%ProgramFiles%\nodejs\node.exe"
  if not exist "%NODE_CAND%" set "NODE_CAND=%LocalAppData%\Programs\nodejs\node.exe"
  if not exist "%NODE_CAND%" set "NODE_CAND=%ProgramFiles(x86)%\nodejs\node.exe"
  if exist "%NODE_CAND%" (
    set "NODE_BIN=%NODE_CAND%"
  ) else (
    echo ERROR: node.exe not found. Please install Node.js or add it to PATH.
    pause
    exit /b 1
  )
) else (
  for /f "usebackq tokens=*" %%i in (`where node 2^>nul`) do set "NODE_BIN=%%i" & goto :NODE_BIN_READY
)
:NODE_BIN_READY
if not defined NODE_BIN set "NODE_BIN=node"

:: Kill any existing node server processes that look like this app (best-effort)
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*') } ^| Select-Object -ExpandProperty ProcessId -ErrorAction SilentlyContinue"') do (
  if "%%p" NEQ "" taskkill /PID %%p /F >nul 2>nul
)

:: Start node server in a minimized window
start "Claude Certs Server (Minimized)" /min cmd /c "cd /d "%~dp0..\app" && "%NODE_BIN%" server.js"

:: If caddy exists, start it minimized too
if exist "%~dp0..\infra\caddy.exe" (
  start "Claude Certs Caddy (Minimized)" /min cmd /c "cd /d "%~dp0.." && "%~dp0..\infra\caddy.exe" run --config "%~dp0..\infra\Caddyfile""
)

echo Started services (minimized). Check your system tray or Task Manager.
exit /b 0