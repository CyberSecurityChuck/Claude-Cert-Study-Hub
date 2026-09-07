@echo off
REM Start Node and Caddy hidden (no visible windows). Uses PowerShell start-hidden.ps1.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-hidden.ps1" "%~dp0.."
exit /b %ERRORLEVEL%
