@echo off
setlocal enabledelayedexpansion
title Claude Certs Platform Launcher
cd /d "%~dp0.."

:CHECK_NODE
where node >nul 2>nul
if errorlevel 1 (
  REM Try common Node.js installation locations before failing
  set "NODE_CAND=%ProgramFiles%\nodejs\node.exe"
  if not exist "%NODE_CAND%" set "NODE_CAND=%LocalAppData%\Programs\nodejs\node.exe"
  if not exist "%NODE_CAND%" set "NODE_CAND=%ProgramFiles(x86)%\nodejs\node.exe"
  if exist "%NODE_CAND%" (
    set "NODE_BIN=%NODE_CAND%"
  ) else (
    cls
    echo.
    echo  ======================================================================
    echo    ERROR: Node.js is not installed or not found in your PATH
    echo  ======================================================================
    echo.
    echo    Please download and install Node.js (v18+ recommended) from:
    echo    https://nodejs.org/
    echo.
    echo    Once installed, restart this script.
    echo.
    pause
    exit /b 1
  )
)
if not defined NODE_BIN (
  for /f "usebackq tokens=*" %%i in (`where node 2^>nul`) do set "NODE_BIN=%%i" & goto :NODE_BIN_READY
)
:NODE_BIN_READY
if not defined NODE_BIN set "NODE_BIN=node"

:MENU
cls
echo.
echo  ======================================================================
echo    CLAUDE CERTIFIED ARCHITECT -- FOUNDATIONS PORTAL LAUNCHER
echo  ======================================================================
echo.
echo    Choose how you want to run the portal:
echo.
echo    [1] Local Mode
echo        Fast, offline or local network access at http://localhost:8000
echo.
echo    [2] Public Internet Mode (Custom Domain + Auto HTTPS)
echo        Expose over the internet with your domain and automated
echo        trusted Let's Encrypt SSL certificates (Ports 80 and 443)
echo.
echo    [3] View Architecture Diagram ^& Setup Guide
echo.
echo    [4] Exit
echo.
set /p MODE="Select an option (1-4) [Default: 1]: "

if "%MODE%"=="" set MODE=1
if "%MODE%"=="1" goto RUN_LOCAL
if "%MODE%"=="2" goto RUN_PUBLIC
if "%MODE%"=="3" goto SHOW_ARCH
if "%MODE%"=="4" exit /b 0

echo Invalid selection. Please choose 1, 2, 3, or 4.
timeout /t 2 >nul
goto MENU

:: ============================================================================
:: MODE 1: LOCAL MODE
:: ============================================================================
:RUN_LOCAL
cls
echo.
echo  ======================================================================
echo    Starting Claude Certs in LOCAL MODE...
echo  ======================================================================
echo.
echo    Study Hub:   http://localhost:8000/
echo    Exam Center: http://localhost:8000/exam-center/
echo.

REM Start the server in a separate window (use discovered NODE_BIN)
start "Claude Certs Server (Port 8000)" cmd /k "cd /d "%~dp0..\app" && "%NODE_BIN%" server.js"

REM Wait for port to bind and open browser
timeout /t 2 >nul
start "" "http://localhost:8000/"

echo.
echo    Study Hub is opening in your default browser.
echo    KEEP the "Claude Certs Server" window running.
echo.
echo    Press any key to return to menu...
pause >nul
goto MENU

:: ============================================================================
:: MODE 2: PUBLIC INTERNET / CUSTOM DOMAIN
:: ============================================================================
:RUN_PUBLIC
cls
echo.
echo  ======================================================================
echo    PUBLIC INTERNET MODE -- CUSTOM DOMAIN ^& AUTOMATED HTTPS
echo  ======================================================================
echo.

set SAVED_DOMAIN=claude-cert.linkpc.net
if exist "infra\domain.txt" (
  set /p SAVED_DOMAIN=<"infra\domain.txt"
)

echo    Current configured domain: !SAVED_DOMAIN!
echo.
set /p USER_DOMAIN="Enter domain name [Press ENTER to use !SAVED_DOMAIN!]: "
if "!USER_DOMAIN!"=="" set USER_DOMAIN=!SAVED_DOMAIN!

REM Save domain
echo !USER_DOMAIN!> "infra\domain.txt"

echo.
echo    [1/3] Ensuring Caddy reverse proxy binary is present...

REM Check if caddy exists locally, in PATH, or user profile
set CADDY_BIN="%~dp0..\infra\caddy.exe"
if not exist !CADDY_BIN! (
  if exist "%USERPROFILE%\caddy.exe" (
    copy "%USERPROFILE%\caddy.exe" "%~dp0..\infra\caddy.exe" >nul 2>nul
  )
)

if not exist !CADDY_BIN! (
  echo          Downloading official Caddy reverse proxy binary...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading Caddy...'; (New-Object System.Net.WebClient).DownloadFile('https://caddyserver.com/api/download?os=windows&arch=amd64', '%~dp0..\infra\caddy.exe')"
  if not exist !CADDY_BIN! (
    echo.
    echo          WARNING: Automatic download failed. Checking if caddy is in PATH...
    where caddy >nul 2>nul
    if errorlevel 1 (
      echo          Error: Could not find or download caddy.exe.
      echo          Please download Caddy from https://caddyserver.com/download and place caddy.exe in the infra/ folder.
      pause
      goto MENU
    )
    set CADDY_BIN=caddy
  )
)
echo          Caddy binary is ready.

echo.
echo    [2/3] Writing Caddyfile for !USER_DOMAIN!...
(
  echo !USER_DOMAIN! {
  echo     reverse_proxy localhost:8000
  echo }
) > "%~dp0..\infra\Caddyfile"
echo          Caddyfile configured.

echo.
echo    [3/3] Pre-flight verification checklist:
echo          [x] DNS A-Record for "!USER_DOMAIN!" must point to your server's Public IP.
echo          [x] Inbound TCP traffic on Port 80 and Port 443 must be allowed on your Cloud/Router firewall.
echo.

REM Start Node.js server
echo    Starting Node.js backend server on localhost:8000...
start "Claude Certs Node Server (Port 8000)" cmd /k "cd /d "%~dp0..\app" && "%NODE_BIN%" server.js"

REM Wait for backend
timeout /t 2 >nul

REM Start Caddy reverse proxy
echo    Starting Caddy reverse proxy with automated Let's Encrypt SSL...
start "Claude Certs Caddy HTTPS Proxy" cmd /k "cd /d "%~dp0.." && !CADDY_BIN! run --config "%~dp0..\infra\Caddyfile""

REM Wait for TLS negotiation and launch browser
timeout /t 3 >nul
start "" "https://!USER_DOMAIN!/"

echo.
echo  ======================================================================
echo    Portals are live with trusted HTTPS:
echo    Study Hub:   https://!USER_DOMAIN!/
echo    Exam Center: https://!USER_DOMAIN!/exam-center/
echo  ======================================================================
echo.
echo    Keep the Node Server and Caddy Proxy windows open.
echo.
echo    Press any key to return to menu...
pause >nul
goto MENU

:: ============================================================================
:: MODE 3: ARCHITECTURE DIAGRAM & SETUP GUIDE
:: ============================================================================
:SHOW_ARCH
cls
echo.
echo  ======================================================================
echo    CLAUDE CERTS ARCHITECTURE ^& DEPLOYMENT OVERVIEW
echo  ======================================================================
echo.
echo                    +------------------------+
echo                    ^|  User / Web Browser    ^|
echo                    +-----------+------------+
echo                                ^|
echo            +-------------------+-------------------+
echo            ^|                                       ^|
echo       [Local Mode]                        [Public Domain Mode]
echo    http://localhost:8000             https://^<your-domain^>.com
echo            ^|                                       ^|
echo            ^|                                       v
echo            ^|                          +------------------------+
echo            ^|                          ^| Caddy Reverse Proxy    ^|
echo            ^|                          ^| (Ports 80 ^& 443)       ^|
echo            ^|                          ^| Auto Let's Encrypt TLS ^|
echo            ^|                          +-----------+------------+
echo            ^|                                       ^| reverse_proxy :8000
echo            v                                       v
echo    +-----------------------------------------------------------+
echo    ^|                  Unified Node.js Server                   ^|
echo    ^|                       (Port 8000)                         ^|
echo    +-------------------------------+---------------------------+
echo    ^|     GET /  (Study Hub)        ^|  GET /exam-center/ (Exam) ^|
echo    ^|     GET /api/* (Unified API)  ^|  AI Tutor ^& Question Gen  ^|
echo    +-------------------------------+---------------------------+
echo.
echo    To expose your server over the internet:
echo    1. Register any domain (e.g. at freedomain.one, DuckDNS, Cloudflare)
echo    2. Point the DNS A-Record to your server's Public IP
echo    3. Open Inbound Ports 80 ^& 443 in Azure Portal / AWS Security Group
echo    4. Choose Option [2] in this launcher -- Caddy handles the rest!
echo.
echo    Detailed guide is available in infra\DEPLOYMENT_GUIDE.md
echo.
echo    [1] Open DEPLOYMENT_GUIDE.md in default editor
echo    [2] Back to Main Menu
echo.
set /p GUIDE_CHOICE="Select option (1-2) [Default: 2]: "
if "%GUIDE_CHOICE%"=="1" (
  start "" "%~dp0..\infra\DEPLOYMENT_GUIDE.md"
)
goto MENU
