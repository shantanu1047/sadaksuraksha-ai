@echo off
title SadakSuraksha AI + SmartCity Vision AI  -  Unified Launcher
echo ================================================================
echo   SadakSuraksha AI  -  Unified Dual-Service Launcher
echo ================================================================
echo.
echo   [Port 8001]  SmartCity Vision AI  (YOLO 5-Hazard + Multimodal)
echo   [Port 8000]  SadakSuraksha AI     (GIS Dashboard + IRC Engine)
echo.
echo ================================================================
echo.

REM ── Configuration ──
set SMARTCITY_DIR=C:\Users\Shant\.gemini\antigravity\scratch\SmartCity_AI
set SADAKSURAKSHA_DIR=%~dp0

REM ── 1. Launch SmartCity Vision AI on port 8001 ──
echo [1/2] Starting SmartCity Vision AI on http://127.0.0.1:8001 ...
start "SmartCity Vision AI (Port 8001)" cmd /k "cd /d %SMARTCITY_DIR% && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

REM Give SmartCity AI a few seconds to initialize the model
echo      Waiting 5 seconds for model load...
timeout /t 5 /nobreak >nul

REM ── 2. Launch SadakSuraksha AI on port 8000 ──
echo [2/2] Starting SadakSuraksha AI on http://127.0.0.1:8000 ...
start "SadakSuraksha AI (Port 8000)" cmd /k "cd /d %SADAKSURAKSHA_DIR% && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo.
echo ================================================================
echo   Both services are starting in separate windows.
echo.
echo   Dashboard:        http://127.0.0.1:8000
echo   Citizen Portal:   http://127.0.0.1:8000/report
echo   Vision AI Health: http://127.0.0.1:8001/health
echo ================================================================
echo.
pause
