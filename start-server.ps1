<#
  start-server.ps1

  Convenience script for Windows to ensure the API server is running.
  - Checks if http://localhost:3001/api/health responds; if so, does nothing.
  - If not running, installs server dependencies (if needed) and starts the server
    in a new terminal window so it keeps running.

  Usage: Right-click -> Run with PowerShell, or run from a PowerShell prompt:
    & "D:\Games\mini capstone\Mini_Capstone\start-server.ps1"

  Notes:
  - This script uses the local `server` folder. Adjust `$serverDir` if needed.
  - It requires Node/npm to be installed and available on PATH.
#>

Set-StrictMode -Version Latest

$serverDir = Join-Path $PSScriptRoot 'server'
$healthUrl = 'http://localhost:3001/api/health'

Write-Host "Checking API health at $healthUrl ..."
try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        Write-Host "API already running. Response: $($resp.StatusCode)"
        exit 0
    }
} catch {
    Write-Host "API not reachable; will attempt to start it."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found on PATH. Install Node.js (LTS) from https://nodejs.org and re-run this script."
    exit 1
}

if (-not (Test-Path $serverDir)) {
    Write-Error "Server folder not found: $serverDir"
    exit 1
}

# If node_modules missing, run npm install first
$nodeModules = Join-Path $serverDir 'node_modules'
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing server dependencies (this may take a minute)..."
    Push-Location $serverDir
    & npm.cmd install
    $installExit = $LASTEXITCODE
    Pop-Location
    if ($installExit -ne 0) {
        Write-Error "npm install failed (exit code $installExit). Fix errors and retry."
        exit $installExit
    }
}

Write-Host "Starting API server in a new terminal window..."
# Start server in a new cmd window so it stays running and shows logs.
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d `"$serverDir`" && npm run start" -WorkingDirectory $serverDir

Write-Host "Server start command issued. A new window should appear with the server logs."
exit 0
