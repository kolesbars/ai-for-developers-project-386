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

Нужны Docker и Docker Compose (для разработки они не обязательны — хватает mise).

```bash
docker compose up --build
```

Приложение — http://localhost:8080: один контейнер, где Ktor отдаёт API под `/api` и собранный
frontend (остальные пути — `index.html`, чтобы работал клиентский роутинг), плюс отдельный
PostgreSQL 17 с томом `db-data`. Многоэтапный `Dockerfile` собирает frontend (Node) и fat jar
(JDK 21), в итоговом образе — только JRE, `app.jar` и статика.

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | задана в `docker-compose.yml` (сервис `db`) |
| `BACKEND_PORT` | порт внутри контейнера, `8080` |
| `STATIC_DIR` | каталог со статикой frontend, в образе `/app/public` |
| `OWNER_NAME`, `OWNER_BIO`, `OWNER_TIME_ZONE` | профиль Владельца; берутся из окружения или `.env` |
| `APP_PORT` | порт на хосте, по умолчанию `8080` |

Остановить и удалить данные: `docker compose down --volumes`. CI (job `docker`) собирает образ,
поднимает compose и проверяет, что `GET /api/health` отвечает `200`.

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
