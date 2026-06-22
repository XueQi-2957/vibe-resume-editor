@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Python
  pause & exit /b 1
)

echo 清理残留进程...
for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| findstr ":4173"') do taskkill /F /PID %%a >nul 2>nul
timeout /t 1 /nobreak >nul

echo start VibeResume 服务器...
start "VibeResume" /B python -u serve.py 4173 > server.log 2>&1
timeout /t 3 /nobreak >nul

start "" "http://localhost:4173/editor.html?v=%RANDOM%%RANDOM%"
echo.
echo [VibeResume] 启动成功！
echo   start at：http://localhost:4173/editor.html
echo   resume saved at resumes/ 
echo.
pause
