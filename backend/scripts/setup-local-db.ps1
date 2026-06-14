# Creates xenopilot role + database on local PostgreSQL (after Postgres 17 install)
$ErrorActionPreference = "Stop"
# Superuser password from PostgreSQL installer (change if yours differs)
$env:PGPASSWORD = if ($env:POSTGRES_SUPERUSER_PASSWORD) { $env:POSTGRES_SUPERUSER_PASSWORD } else { "postgres" }

$psql = @(
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "C:\Program Files\PostgreSQL\16\bin\psql.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $psql) {
  Write-Host "psql not found. Finish PostgreSQL installer (set superuser password to 'xenopilot' or update this script), then re-run."
  exit 1
}

Write-Host "Using $psql"

& $psql -U postgres -h localhost -c "CREATE USER xenopilot WITH PASSWORD 'xenopilot' CREATEDB;" 2>$null
& $psql -U postgres -h localhost -c "CREATE DATABASE xenopilot OWNER xenopilot;" 2>$null
& $psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE xenopilot TO xenopilot;" 2>$null

Write-Host "Local DB ready: postgresql://xenopilot:xenopilot@localhost:5432/xenopilot"
