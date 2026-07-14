@echo off
cd /d "%~dp0"
call "%~dp0start-postgres.bat"

netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo PPR Control already running on port 8080.
  exit /b 0
)

npm start
