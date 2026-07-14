# Рамазан ППР — PostgreSQL (отдельный комплект)

Эта папка не изменяет рабочую локальную версию. Она предназначена для
перехода на PostgreSQL и загрузки приложения в интернет.

## Содержимое

- `schema.sql` — таблицы и индексы;
- `db-postgres.js` — адаптер чтения и дельта-записи;
- `migrate-json-to-postgres.js` — перенос текущего `data/db.json`;
- `.env.example` — настройки подключения;
- `install-local-postgres.ps1` — краткий маршрут локальной установки.

## Локальный маршрут

1. Установить PostgreSQL 16/17.
2. Создать пользователя и базу:

```sql
CREATE USER ppr_user WITH PASSWORD 'СЛОЖНЫЙ_ПАРОЛЬ';
CREATE DATABASE ppr_control OWNER ppr_user;
```

3. Создать таблицы:

```powershell
psql -U ppr_user -d ppr_control -f schema.sql
```

4. Установить библиотеку:

```powershell
npm install
```

5. Задать переменную подключения:

```powershell
$env:DATABASE_URL="postgresql://ppr_user:ПАРОЛЬ@localhost:5432/ppr_control"
$env:PGSSL="disable"
```

6. Перенести текущую базу:

```powershell
node migrate-json-to-postgres.js "C:\Users\A.Kairat.CORP\Desktop\Рамазан ППР\Рабочая версия\data\db.json"
```

## Маршрут для интернета

### Render

1. Создать PostgreSQL Database в Render.
2. Скопировать `Internal Database URL`.
3. В Web Service добавить переменную `DATABASE_URL`.
4. В Build Command указать `npm install`.
5. Один раз выполнить `schema.sql` через Render Shell.
6. Запустить миграцию.

### Railway

1. Создать проект и добавить PostgreSQL.
2. Railway автоматически создаст `DATABASE_URL`.
3. Загрузить приложение из GitHub.
4. Выполнить `schema.sql` и миграцию.

### Neon

1. Создать проект Neon.
2. Скопировать Connection string.
3. Указать её как `DATABASE_URL` на сервере приложения.
4. Выполнить схему и миграцию.

## Безопасность

- Не загружайте `.env` и пароли в GitHub.
- Перед миграцией сохраните копию `data/db.json`.
- Сначала проверьте новую базу на тестовом адресе.
- После проверки можно переключить основной сервер на PostgreSQL.
