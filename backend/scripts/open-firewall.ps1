# Allow inbound LAN connections to the Xeno Mini CRM ports.
# RUN AS ADMINISTRATOR (right-click > Run with PowerShell, or from an elevated shell).
#
#   powershell -ExecutionPolicy Bypass -File .\open-firewall.ps1

$ports = 3000, 4000, 5001
foreach ($p in $ports) {
  $name = "Xeno Mini CRM $p"
  if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $p -Action Allow | Out-Null
    Write-Host "Added firewall rule for port $p" -ForegroundColor Green
  } else {
    Write-Host "Firewall rule for port $p already exists" -ForegroundColor Yellow
  }
}
