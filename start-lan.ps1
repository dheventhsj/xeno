# Xeno Mini CRM - LAN launcher
# Builds (if needed) and starts all three services bound to 0.0.0.0 so the
# product is reachable from any device on your local network.
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\start-lan.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Detect the primary LAN IPv4 (skip loopback / link-local).
$lan = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Sort-Object -Property SkipAsSource |
  Select-Object -First 1).IPAddress
if (-not $lan) { $lan = "localhost" }

Write-Host "Detected LAN IP: $lan" -ForegroundColor Cyan

# Build all workspaces if dist / .next are missing.
if (-not (Test-Path "$root\services\crm-backend\dist")) { npm --workspace services/crm-backend run build }
if (-not (Test-Path "$root\services\fake-provider\dist")) { npm --workspace services/fake-provider run build }
if (-not (Test-Path "$root\apps\web\.next")) { npm --workspace apps/web run build }

# Launch each service in its own window so logs stay readable.
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npm --workspace services/crm-backend start"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npm --workspace services/fake-provider start"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; npx --workspace apps/web next start -H 0.0.0.0 -p 3000"

Write-Host ""
Write-Host "Xeno Mini CRM is starting up." -ForegroundColor Green
Write-Host "  Open on this machine : http://localhost:3000"
Write-Host "  Open on the LAN      : http://${lan}:3000"
Write-Host "  Backend API          : http://${lan}:4000/api/health"
Write-Host ""
Write-Host "If other devices cannot connect, run open-firewall.ps1 as Administrator once." -ForegroundColor Yellow
