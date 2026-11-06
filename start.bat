@echo off
cd /d "%~dp0"
echo Kosmic: http://localhost:5173  - close this window to stop
start "" http://localhost:5173
python -m http.server 5173
