@echo off
title SadakSuraksha AI Platform
cd /d "%~dp0"
echo ====================================================================
echo Starting SadakSuraksha AI // Road Hazard Intelligence Platform...
echo ====================================================================
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
set "PYTHONPATH=."

set "PY_CMD="

:: 1. Check if uv is installed
where uv >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using Astral uv package manager...
    call uv sync
    echo.
    echo Launching Server on http://127.0.0.1:8000 ...
    call uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
    pause
    exit /b 0
)

:: 2. Check if python is in PATH
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
)

:: 3. Check if Windows 'py' launcher is available
if "%PY_CMD%"=="" (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=py -3"
    )
)

:: 4. Search common default installation directories for Python
if "%PY_CMD%"=="" (
    for %%V in (313 312 311 310) do (
        if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
            set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
            set "PATH=%LOCALAPPDATA%\Programs\Python\Python%%V;%LOCALAPPDATA%\Programs\Python\Python%%V\Scripts;%PATH%"
            goto :found_python
        )
        if exist "%ProgramFiles%\Python%%V\python.exe" (
            set "PY_CMD=%ProgramFiles%\Python%%V\python.exe"
            set "PATH=%ProgramFiles%\Python%%V;%ProgramFiles%\Python%%V\Scripts;%PATH%"
            goto :found_python
        )
        if exist "C:\Python%%V\python.exe" (
            set "PY_CMD=C:\Python%%V\python.exe"
            set "PATH=C:\Python%%V;C:\Python%%V\Scripts;%PATH%"
            goto :found_python
        )
    )
)

:found_python
if "%PY_CMD%"=="" (
    echo.
    echo ====================================================================
    echo [ERROR] Python 3.13 was installed but 'python.exe' is not on your PATH.
    echo ====================================================================
    echo Fix:
    echo 1. Open Windows Search -> Type 'Environment Variables'
    echo 2. Or re-run the Python Installer -> Select 'Modify' -> Check 'Add Python to environment variables'
    echo.
    pause
    exit /b 1
)

echo Found Python: %PY_CMD%
if not exist ".venv" (
    echo Creating virtual environment...
    %PY_CMD% -m venv .venv
)

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    set "RUN_PY=python"
) else (
    set "RUN_PY=%PY_CMD%"
)

echo Installing dependencies from requirements.txt...
%RUN_PY% -m pip install -r requirements.txt
echo.
echo ====================================================================
echo Launching Server on http://127.0.0.1:8000 ...
echo ====================================================================
%RUN_PY% -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause

