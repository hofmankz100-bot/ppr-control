@echo off
set PGROOT=C:\ppr-postgres
set PGBIN=%PGROOT%\pgsql\bin
set PGDATA=%PGROOT%\data
set PGLOG=%PGROOT%\postgres.log

netstat -ano | findstr ":5433 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo PostgreSQL already running on port 5433.
  exit /b 0
)

"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -o "-p 5433 -c listen_addresses=127.0.0.1" -l "%PGLOG%" start
