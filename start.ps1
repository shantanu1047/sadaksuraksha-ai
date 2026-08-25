# PowerShell Launcher for AERO-VISION Platform
Set-Location $PSScriptRoot
$env:PATH = "$HOME\.local\bin;" + $env:PATH
$env:PYTHONPATH = "."

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Starting AERO-VISION Multimodal Road Hazard AI Platform..." -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

uv sync
Write-Host "`nServer running on http://127.0.0.1:8000" -ForegroundColor Green
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
