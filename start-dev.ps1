$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "API"
$FrontendDir = Join-Path $Root "frontend-react"

Write-Host "Starting TheWay API on http://localhost:3001"
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$ApiDir'; npm.cmd run dev"
)

Write-Host "Starting TheWay React frontend on http://localhost:5173"
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$FrontendDir'; npm.cmd run dev"
)

Write-Host ""
Write-Host "Open http://localhost:5173"
