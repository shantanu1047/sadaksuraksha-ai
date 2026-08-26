@echo off
title AERO-VISION // Road Hazard AI Platform
cd /d "%~dp0"
echo ====================================================================
echo Starting AERO-VISION Multimodal Road Hazard AI Platform...
echo ====================================================================
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
set "PYTHONPATH=."

echo Checking dependencies...
call uv sync

echo.
echo Launching Server on http://127.0.0.1:8000 ...
echo Press Ctrl+C to stop the server.
echo.
call uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
