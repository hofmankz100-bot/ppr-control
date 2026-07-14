@echo off
"%LOCALAPPDATA%\PostgreSQL\17\pgsql\bin\pg_ctl.exe" -D "%LOCALAPPDATA%\PostgreSQL\17\data" -l "%LOCALAPPDATA%\PostgreSQL\17\postgres.log" -o "-p 5432" start
pause
