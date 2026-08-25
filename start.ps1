# PowerShell Launcher for SadakSuraksha AI Platform
Set-Location $PSScriptRoot
$env:PATH = "$HOME\.local\bin;" + $env:PATH
$env:PYTHONPATH = "."

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Starting SadakSuraksha AI // Road Hazard Intelligence Platform..." -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Host "Using Astral uv package manager..." -ForegroundColor Green
    uv sync
    Write-Host "`nServer running on http://127.0.0.1:8000" -ForegroundColor Green
    uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
} else {
    Write-Host "uv not found, using standard Python & pip..." -ForegroundColor Yellow
    if (-not (Test-Path ".venv")) {
        Write-Host "Creating virtual environment..." -ForegroundColor Yellow
        python -m venv .venv
    }
    & ".\.venv\Scripts\activate.ps1"
    Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "`nServer running on http://127.0.0.1:8000" -ForegroundColor Green
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
}

