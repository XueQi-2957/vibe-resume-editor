@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=4173"
set "HOST=127.0.0.1"
set "BASE_URL=http://%HOST%:%PORT%"
set "URL=%BASE_URL%/editor.html"

echo [VibeResume] Starting editor service...

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found. Please install Python or add it to PATH.
  pause
  exit /b 1
)

echo [1/3] Cleaning port %PORT%...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  taskkill /F /PID %%P >nul 2>nul
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 1000"

echo [2/3] Starting unified server on port %PORT%...
start "VibeResume Server" /B cmd /c "python -u serve.py %PORT% 1>NUL 2>NUL"

echo [3/3] Checking service...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; for ($i=0; $i -lt 20; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing '%BASE_URL%/version' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch { }; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 (
  echo [ERROR] Server failed to start.
  pause
  exit /b 1
)

:open_editor
if /I "%VIBERESUME_NO_OPEN%"=="1" (
  echo Editor ready.
) else (
  echo Opening editor...
  start "" "%URL%"
)

echo.
echo [VibeResume] Started successfully.
echo   Editor: %URL%
echo   Save:   %BASE_URL%/save
echo   Export: %BASE_URL%/export-pdf
echo.
echo Keep this window open while editing.
echo Press any key to close this launcher window.
echo.
if /I not "%VIBERESUME_NO_PAUSE%"=="1" pause
