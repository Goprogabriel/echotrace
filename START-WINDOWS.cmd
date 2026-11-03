@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node scripts\serve.mjs --open
  pause
  exit /b
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\serve.py --open
  pause
  exit /b
)
echo Install Node.js 18+ or Python 3, then open this file again.
echo Alternatively, host the dist folder on a static website host.
pause
