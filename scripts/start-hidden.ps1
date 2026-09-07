param([Parameter(Mandatory=$true)][string]$Root)
try { $root = (Resolve-Path $Root).ProviderPath } catch { Write-Error "Invalid root path: $Root"; exit 2 }
Set-Location $root
# locate node
$node = (Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $node) {
  $cands = @("$env:ProgramFiles\nodejs\node.exe","$env:LocalAppData\Programs\nodejs\node.exe","$env:ProgramFiles(x86)\nodejs\node.exe")
  foreach ($c in $cands) { if (Test-Path $c) { $node = $c; break } }
}
if (-not $node) { Write-Error "node.exe not found"; exit 2 }

# pid file
$pidFile = Join-Path $root "scripts\hidden_pids.json"

# stop existing server processes
try {
  $existing = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*Claude Certs*') }
  foreach ($p in $existing) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
} catch {}

# start node hidden
$appDir = Join-Path $root 'app'
$nodeProc = Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $appDir -WindowStyle Hidden -PassThru

$caddyProc = $null
$caddyPath = Join-Path $root 'infra\caddy.exe'
if (Test-Path $caddyPath) {
  $caddyProc = Start-Process -FilePath $caddyPath -ArgumentList 'run','--config',(Join-Path $root 'infra\Caddyfile') -WorkingDirectory $root -WindowStyle Hidden -PassThru
}

# Save PIDs
$pids = @{ node = $nodeProc.Id }
if ($caddyProc) { $pids.caddy = $caddyProc.Id }
try { $pids | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8 -Force } catch {}

Write-Output "started hidden processes: node=$($nodeProc.Id)$(if ($caddyProc) { ", caddy=$($caddyProc.Id)" })"
exit 0
