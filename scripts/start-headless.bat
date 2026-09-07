@echo off
REM Headless launcher: starts Node and Caddy (if present) with hidden windows
REM Usage: double-click or run from terminal. Keeps windows hidden.
setlocal
set ROOT=%~dp0..
powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
  @echo off

  $root = (Resolve-Path $root).Path
