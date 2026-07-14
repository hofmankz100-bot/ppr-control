@echo off
set PGROOT=C:\ppr-postgres
set PGBIN=%PGROOT%\pgsql\bin
set PGDATA=%PGROOT%\data

"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" stop -m fast
