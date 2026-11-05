# Объекты и задачи

Мини-CRM для строительной компании. После входа исполнитель видит свои задачи, постановщик — все. В карточке доступны история и действия для текущей роли.

## Локальный запуск

Понадобятся Node.js 22.9 или новее, pnpm 9.10.0 и запущенный Docker Desktop с Linux-контейнерами. Из корня репозитория выполните:

```sh
pnpm install --frozen-lockfile
pnpm exec supabase start
pnpm exec supabase migration up
```

Скопируйте `apps/api/.env.example` в `apps/api/.env.local`. Выполните `pnpm exec supabase status` и подставьте в файл локальный публичный ключ с префиксом `sb_publishable_`. Браузер получает этот ключ и адрес Supabase через Fastify.

### Первый вход в чистой базе

1. Откройте локальную Studio по адресу http://127.0.0.1:54323. В **Authentication → Users → Add user → Create new user** создайте три аккаунта с разными адресами почты и своими паролями. Подтвердите адреса при создании (Auto Confirm User).
2. В **SQL Editor** выполните запрос ниже, заменив адреса на использованные в первом шаге. Должны вернуться три профиля.

```sql
insert into public.profiles (id, display_name, role)
select u.id, p.name, p.role::public.app_role
from (values
  ('manager@example.test', 'Анна', 'manager'),
  ('worker-a@example.test', 'Иван', 'executor'),
  ('worker-b@example.test', 'Мария', 'executor')
) as p(email, name, role)
join auth.users u on u.email = p.email
on conflict (id) do update
set display_name = excluded.display_name, role = excluded.role
returning display_name, role;
```

Запустите `pnpm dev` и откройте http://localhost:5173. Vite проксирует запросы `/api` в Fastify на http://127.0.0.1:3001. Для остановки нажмите Ctrl+C.

Войдите постановщиком, откройте **Объекты → Новый объект** и создайте в его карточке две задачи для разных исполнителей. Войдите исполнителем в отдельном профиле браузера. В списке появится его задача, в её карточке — кнопка «Взять в работу» и история. Схема и права устанавливаются миграциями, рабочие данные создаются через интерфейс.

## Материалы для сдачи

- [Как работает CRM — объяснение для руководителя](docs/overview.md)
- [Решения, допущения и состояние сдачи](docs/decisions.md)

## Миграции Supabase

Supabase CLI закреплён в зависимостях проекта. Команды выполняются из корня.

Для локальной разработки запустите Docker Desktop, затем `pnpm exec supabase start`. При первом запуске CLI создаст локальную базу и применит миграции из репозитория. Локальный Auth настроен на адрес Vite, открытая регистрация отключена.

Чтобы добавить изменение, выполните `pnpm exec supabase migration new имя_изменения`, заполните созданный SQL-файл и выполните `pnpm exec supabase migration up`. Если вы уже изменили схему в локальной Studio, сгенерируйте файл командой `pnpm exec supabase db diff -f имя_изменения` и проверьте SQL.

Для облачного проекта один раз выполните следующие команды и выберите CRM в списке:

```sh
pnpm exec supabase login
pnpm exec supabase link
```

Перед публикацией проверьте список ожидающих миграций, примените их и сверьте историю:

```sh
pnpm exec supabase db push --remote --dry-run
pnpm exec supabase db push --remote
pnpm exec supabase migration list --remote
```

В облачном проекте отдельно отключите регистрацию в настройках Authentication. Команда `db push` применяет миграции базы, а настройка локального Auth хранится в `supabase/config.toml`.

## Проверка

### Публикация в Timeweb App Platform

Выберите репозиторий CRM, ветку `master` и фреймворк **Dockerfile**. Оставьте путь к директории проекта пустым: Dockerfile находится в корне. Сборку и команду запуска задаёт сам образ. Fastify раздаёт интерфейс и API на порту `8080`; для проверки доступности используйте `GET /api/health`.

В переменных приложения укажите `SUPABASE_URL` (HTTPS-адрес проекта из Supabase) и `SUPABASE_PUBLISHABLE_KEY` (его публичный ключ). Перед проверкой демо примените миграции по инструкции выше и подготовьте учётные записи. В настройках Supabase Auth укажите публичный HTTPS-адрес CRM как Site URL. После деплоя проверьте вход и обновление страницы по прямой ссылке на задачу.

### Проверки кода

После изменения кода запустите автоформатирование и общую проверку из корня монорепозитория. Biome форматирует TypeScript, JSX, CSS, HTML и JSON. Команда `pnpm check` проверяет форматирование, линтинг, порядок импортов и типы. Для отдельного запуска линтера используйте `pnpm lint`.

```sh
pnpm format
pnpm check
pnpm build
```

## Структура

- `apps/web` — React, Vite, Mantine, React Router и TanStack Query.
- `apps/api` — Fastify API.
- `packages/contracts` — общие схемы TypeBox и типы ответов.
- `supabase/migrations` — схема CRM и правила доступа. Постановщик читает все четыре таблицы и может создавать объекты и задачи. При создании задачи он передаёт объект, название, исполнителя и при необходимости описание. База проверяет роль исполнителя, определяет автора и записывает начальный статус в историю. Исполнитель читает свой профиль, назначенные ему задачи, их объекты и историю.
