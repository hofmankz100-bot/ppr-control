# PostgreSQL для ППР Контроль

## Текущее рабочее подключение

PostgreSQL уже развернут portable-вариантом:

```text
C:\ppr-postgres
```

Приложение подключено через файл `.env`:

```env
DATABASE_URL=postgres://ppr_user:ppr_password@127.0.0.1:5433/ppr_control
```

Проверка:

```text
http://10.0.0.125:8080/api/health
```

Должно быть:

```json
"storage": {
  "mode": "postgres"
}
```

## Скрипты

```text
start-postgres.bat   - запустить PostgreSQL
stop-postgres.bat    - остановить PostgreSQL
start-project.bat    - запустить PostgreSQL и проект
```

## Ручная установка PostgreSQL через обычный инсталлятор

Если позже понадобится системная служба Windows, можно поставить PostgreSQL отдельно и создать базу так:

## 1. Создать базу

```sql
CREATE DATABASE ppr_control;
CREATE USER ppr_user WITH PASSWORD 'ppr_password';
GRANT ALL PRIVILEGES ON DATABASE ppr_control TO ppr_user;
```

Если PostgreSQL 15+:

```sql
\c ppr_control
GRANT ALL ON SCHEMA public TO ppr_user;
```

## 2. Включить PostgreSQL в проекте

Скопируйте файл `.env.postgres.example` в `.env` и проверьте пароль:

```env
PORT=8080
DATABASE_URL=postgres://ppr_user:ppr_password@127.0.0.1:5433/ppr_control
PG_POOL_SIZE=10
PGSSL=disable
```

## 3. Запустить сервер

```powershell
npm start
```

При первом запуске сервер создаст таблицу `ppr_settings` и перенесет текущее состояние из `data/db.json` в PostgreSQL. JSON-файл останется как резервная копия.

## 4. Проверить режим хранения

Откройте:

```text
http://10.0.0.125:8080/api/health
```

Должно быть:

```json
"storage": {
  "mode": "postgres"
}
```

Если PostgreSQL недоступен, сервер продолжит работать через JSON и покажет `json-fallback`.
