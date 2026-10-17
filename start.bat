@echo off
echo ==========================================
echo       Starting Civic Fix Platform
echo ==========================================

REM Start PostgreSQL server on port 5433 if not running
echo [1/3] Checking PostgreSQL on port 5433...
netstat -ano | findstr 5433 >nul
if %errorlevel% neq 0 (
    echo Starting PostgreSQL 17 on port 5433...
    start "CivicFix PostgreSQL" /min "C:\Program Files\PostgreSQL\17\bin\postgres.exe" -D "%~dp0backend\pgdata" -p 5433
    timeout /t 2 /nobreak >nul
) else (
    echo PostgreSQL is already running on port 5433.
)

REM Start Backend API
echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "CivicFix Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Start Frontend Dev Server
echo [3/3] Starting Vite Frontend on http://localhost:5173...
start "CivicFix Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services launched!
echo Access the frontend web app at: http://localhost:5173
echo API documentation (Swagger) at: http://localhost:8000/docs
echo.
pause
