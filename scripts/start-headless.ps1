param(
  [Parameter(Mandatory=$true)]
  [string]$Root
)
try {
  $root = (Resolve-Path $Root).Path
} catch {
  Write-Error "Invalid root path: $Root"
  exit 2
}
Set-Location $root
# find node executable
$node = (Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $node) {
  $cands = @("$env:ProgramFiles\nodejs\node.exe","$env:LocalAppData\Programs\nodejs\node.exe","$env:ProgramFiles(x86)\nodejs\node.exe")
  foreach ($c in $cands) { if (Test-Path $c) { $node = $c; break } }
}
if (-not $node) { Write-Output "ERROR: node.exe not found. Exiting."; exit 2 }
# stop existing node server processes that look like our server
try {
  Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} catch {}
# start node server hidden
$appDir = Join-Path $root 'app'
Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $appDir -WindowStyle Hidden | Out-Null
Write-Output "Started Node server (hidden) using $node"
# start Caddy if present (hidden)
$caddy = Join-Path $root 'infra\caddy.exe'
if (Test-Path $caddy) {
  Start-Process -FilePath $caddy -ArgumentList 'run','--config',(Join-Path $root 'infra\Caddyfile') -WorkingDirectory $root -WindowStyle Hidden | Out-Null
  Write-Output "Started Caddy (hidden)"
}
exit 0
