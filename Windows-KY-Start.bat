@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js が必要です。https://nodejs.org/ からLTSをインストールしてください。
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000"
node server.mjs
pause
