@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
  node server.mjs
  exit /b %errorlevel%
)
where python >nul 2>nul
if %errorlevel% equ 0 (
  python server.py
  exit /b %errorlevel%
)
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 server.py
  exit /b %errorlevel%
)
echo Necesitas Node.js o Python 3 instalado para iniciar el servidor HTTP local en http://127.0.0.1:4200.
exit /b 1
