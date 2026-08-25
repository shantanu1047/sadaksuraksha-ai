@echo off
title SadakSuraksha AI Platform
cd /d "%~dp0"
echo ====================================================================
echo Starting SadakSuraksha AI // Road Hazard Intelligence Platform...
echo ====================================================================
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
set "PYTHONPATH=."

where uv >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using Astral uv package manager...
    call uv sync
    echo.
    echo Launching Server on http://127.0.0.1:8000 ...
    call uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo uv not found, falling back to standard Python...
    where python >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Neither uv nor python was found on your system PATH!
        echo Please install Python 3.11+ from https://www.python.org/downloads/
        pause
        exit /b 1
    )
    if not exist ".venv" (
        echo Creating virtual environment...
        python -m venv .venv
    )
    call .venv\Scripts\activate.bat
    echo Installing dependencies from requirements.txt...
    pip install -r requirements.txt
    echo.
    echo Launching Server on http://127.0.0.1:8000 ...
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
)
pause

