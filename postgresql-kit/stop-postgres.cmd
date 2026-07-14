@echo off
"%LOCALAPPDATA%\PostgreSQL\17\pgsql\bin\pg_ctl.exe" -D "%LOCALAPPDATA%\PostgreSQL\17\data" stop
pause
