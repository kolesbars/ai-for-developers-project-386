# Календарь звонков


[![hexlet-check](https://github.com/kolesbars/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/kolesbars/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

Окно записи занимает 14 календарных дней и сдвигается с течением времени. Начало с сегодняшнего или завтрашнего дня, часы работы владельца и часовой пояс вы выбираете и записываете в спецификации. Длительность слота совпадает с длительностью типа встречи, шаг доступных стартов тоже фиксируется в спецификации. Пересечение интервалов запрещено, включая частичное наложение разных типов. Следующая встреча может начинаться в момент окончания предыдущей. Правила действуют и для двух запросов, пришедших одновременно.

## Стек

| Часть | Технологии |
|---|---|
| Контракт API | [TypeSpec](https://typespec.io) → OpenAPI 3.0.0 (`api/openapi/openapi.yaml`) |
| Backend | Kotlin, Ktor, JDK 21, Gradle wrapper, JUnit 5, ktlint |
| БД | PostgreSQL, миграции Flyway; без `DATABASE_URL` — embedded PostgreSQL (zonky) |
| Frontend | TypeScript, React, Vite, Mantine, Vitest, ESLint |
| API- и e2e-тесты | Playwright (`request` и установленный Google Chrome) |
| SDK для frontend | генерируется из OpenAPI: `openapi-typescript` + `openapi-fetch` |
| Инструменты и задачи | [mise](https://mise.jdx.dev) (`mise.toml`) |
| CI | GitHub Actions → `mise run check` на каждый push |

Версии JDK и Node зафиксированы в `mise.toml`, Gradle — в `backend/gradle/wrapper`,
npm-пакеты — в `package-lock.json`.

## Структура

```
api/        TypeSpec-контракт и сгенерированный openapi.yaml
backend/    Ktor-приложение (Gradle)
frontend/   Vite + React; src/api/schema.d.ts генерируется из OpenAPI
e2e/        Playwright: tests/api — HTTP-запросы к backend, tests/e2e — браузер
mise.toml   версии инструментов, переменные окружения и задачи
```

## Установка

Нужен только [mise](https://mise.jdx.dev/getting-started.html), остальное он поставит сам.

```bash
git clone https://github.com/kolesbars/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise trust
mise install
mise run install
```

## Использование

```bash
mise run dev
```

Backend — http://localhost:8080 (`GET /api/health`), frontend — http://localhost:5173
(запросы `/api` проксируются на backend). Без `DATABASE_URL` backend поднимает embedded
PostgreSQL во временном каталоге — данные живут до остановки backend. Внешняя БД:
`DATABASE_URL=postgres://user:pass@host:5432/db` (или `jdbc:postgresql://…`).
Профиль Владельца (`GET /api/owner`) — из `OWNER_NAME`, `OWNER_BIO` и `OWNER_TIME_ZONE`
(по умолчанию `Asia/Almaty`); незаданные берутся по умолчанию.

| Команда | Что делает |
|---|---|
| `mise run check` | все проверки: контракт, линтеры, тесты, сборка (то же, что в CI) |
| `mise run lint` | ktlint + ESLint + проверка типов |
| `mise run test` | JUnit + Vitest + Playwright (API и e2e) |
| `mise run test:api` / `test:e2e` | только API- или только браузерные тесты Playwright |
| `mise run format` | автоисправление стиля |
| `mise run build` | fat jar backend и статика frontend |
| `mise run api:sdk` | TypeSpec → OpenAPI → `frontend/src/api/schema.d.ts` |
| `mise tasks` | список всех задач |

После изменения `api/*.tsp` запустите `mise run api:sdk` и закоммитьте сгенерированные
файлы — CI проверяет, что они актуальны.

## Запуск в контейнере

Один образ из корневого `Dockerfile`: Ktor отдаёт API под `/api` и собранный frontend (остальные
пути — `index.html`, чтобы работал клиентский роутинг). Многоэтапная сборка: frontend (Node) и fat
jar (JDK 21), в итоговом образе — только JRE, `app.jar` и статика; процесс работает не от root.

```bash
docker build -t calendar .
docker run --rm -e PORT=8080 -p 8080:8080 calendar
```

Приложение стартует само и слушает порт из `PORT` — http://localhost:8080. Без `DATABASE_URL`
внутри контейнера поднимается embedded PostgreSQL.

С отдельным PostgreSQL 17 (том `db-data`, данные переживают перезапуск):

```bash
docker compose up --build
```

| Переменная | Значение |
|---|---|
| `PORT` | порт HTTP-сервера; в образе по умолчанию `8080`, хостинг задаёт свой |
| `BACKEND_PORT` | запасной вариант без `PORT` (локальная разработка, e2e) |
| `DATABASE_URL` | PostgreSQL (`postgres://user:pass@host:port/db` или `jdbc:…`); не задан — embedded |
| `STATIC_DIR` | каталог со статикой frontend, в образе `/app/public` |
| `OWNER_NAME`, `OWNER_BIO`, `OWNER_TIME_ZONE` | профиль Владельца; берутся из окружения или `.env` |
| `APP_PORT` | порт на хосте для `docker compose`, по умолчанию `8080` |

Остановить compose и удалить данные: `docker compose down --volumes`. CI (job `docker`) поднимает
compose и отдельно запускает образ с `PORT=3000` без БД, проверяя `GET /api/health` и `/`.

## Деплой

Публичная ссылка: **https://calendar-a7mo.onrender.com** (Гость — `/`, Владелец — `/admin`).

Сервис развёрнут на [Render](https://render.com) (Free Web Service) по Blueprint `render.yaml`:
Render собирает корневой `Dockerfile` и задаёт `PORT` сам. Blueprint подключён по публичному URL
репозитория, поэтому авто-деплоя нет: новую версию выкатывает Manual Deploy в Render Dashboard
(или подключение GitHub к Render). Своя копия: Render Dashboard → New → Blueprint → репозиторий.

Сценарий Гостя и Владельца (включая отказ повторного бронирования) проверяется по публичной ссылке
тем же набором Playwright, что и локально — без подъёма локальных серверов:

```bash
E2E_BASE_URL=https://calendar-a7mo.onrender.com npm run test --workspace e2e
```

**Данные сбрасываются.** На хостинге не задан `DATABASE_URL`, поэтому используется embedded
PostgreSQL внутри контейнера: Типы встреч и бронирования пропадают при каждом перезапуске —
после деплоя, рестарта и пробуждения (бесплатный инстанс засыпает после ~15 минут без запросов,
первый запрос после этого идёт ~1 минуту). Чтобы данные сохранялись, задайте `DATABASE_URL`
внешнего PostgreSQL в Environment сервиса.

## MCP для агента

В `.mcp.json` — проектная конфигурация MCP для Claude Code (секретов в файле нет):

- `render` — [Render MCP](https://render.com/docs/mcp-server): статус деплоев, логи, переменные
  сервиса. Ключ берётся из переменной окружения: создайте API key в Render (Account Settings →
  API Keys) и перед запуском `claude` выполните `export RENDER_API_KEY=…`. Ключ не коммитьте.
- `playwright` — [Playwright MCP](https://github.com/microsoft/playwright-mcp): агент проходит
  сценарий Гостя и Владельца в браузере по публичной ссылке. Ключей не нужно.

При первом запуске Claude Code спросит, доверять ли серверам из `.mcp.json`.

## Коммиты

[Conventional Commits](https://www.conventionalcommits.org/ru/): `feat`, `fix`, `docs`, `chore`,
`ci`, `test`, `refactor`, `!` для breaking changes; необязательная область — `api`, `backend`,
`frontend`, `e2e`. Например: `feat(frontend): страница записи`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
