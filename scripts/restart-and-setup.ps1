# Helper script to restart PowerShell and run setup
# This ensures the PATH is refreshed after winget installations

Write-Host "Restarting PowerShell to refresh PATH..." -ForegroundColor Yellow
Write-Host ""

# Close current shell and open new one with setup script
$setupScript = Join-Path $PSScriptRoot "setup-local.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..' ; & '$setupScript'"
