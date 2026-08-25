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
    $pyCmd = $null
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pyCmd = "python"
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        $pyCmd = "py"
    } else {
        $possiblePaths = @(
            "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
            "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
            "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
            "C:\Program Files\Python313\python.exe",
            "C:\Python313\python.exe"
        )
        foreach ($p in $possiblePaths) {
            if (Test-Path $p) {
                $pyCmd = $p
                $dir = Split-Path $p
                $env:PATH = "$dir;$dir\Scripts;" + $env:PATH
                break
            }
        }
    }

    if (-not $pyCmd) {
        Write-Host "`n[ERROR] Python 3.13 was installed but python.exe is not in PATH." -ForegroundColor Red
        Write-Host "Please check 'Add Python to environment variables' in Python installer." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Found Python: $pyCmd" -ForegroundColor Green
    if (-not (Test-Path ".venv")) {
        Write-Host "Creating virtual environment..." -ForegroundColor Yellow
        & $pyCmd -m venv .venv
    }
    if (Test-Path ".\.venv\Scripts\activate.ps1") {
        & ".\.venv\Scripts\activate.ps1"
    }
    Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "`nServer running on http://127.0.0.1:8000" -ForegroundColor Green
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
}


