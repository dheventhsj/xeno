$ErrorActionPreference = "Continue"
$root = (Resolve-Path "$PSScriptRoot\..\..").Path

Write-Host "Starting XenoPilot..." -ForegroundColor Cyan

if (Get-Command docker -ErrorAction SilentlyContinue) {
  if (-not (docker ps -q 2>$null)) {
    Write-Host "Starting Docker Postgres + Redis..." -ForegroundColor Yellow
    docker compose -f "$root\backend\docker-compose.yml" up -d
    Start-Sleep -Seconds 4
  }
} else {
  Write-Host "Docker is not installed or running. Skipping Docker setup and falling back to inline channel/queue fallbacks." -ForegroundColor Yellow
}

Set-Location $root
if (-not (Test-Path "node_modules")) { npm install }
npm run db:generate 2>$null
npm run db:push 2>$null

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev:channel"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host ""
Write-Host "XenoPilot running:" -ForegroundColor Green
Write-Host "  CRM:     http://localhost:3000"
Write-Host "  Channel: http://localhost:5001/health"
Write-Host ""
Write-Host "First time? Run: npm run db:seed" -ForegroundColor Yellow
