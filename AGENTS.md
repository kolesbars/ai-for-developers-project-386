# AGENTS.md — Краткая инструкция для AI-агентов

Учебный сервис бронирования встреч «Календарь звонков» (Cal.com-like), проект Хекслета.
Репозиторий: https://github.com/kolesbars/ai-for-developers-project-386.

## Архитектура и структура

Contract-first: любое изменение API начинается с контракта.

- **Контракт API**: `api/main.tsp` (TypeSpec, источник правды) → `api/openapi/openapi.yaml`
  (OpenAPI 3.0.0, committed) → `frontend/src/api/schema.d.ts` (SDK, committed).
- **Backend**: Kotlin/Ktor в `backend/`, реализует контракт вручную (без codegen): DTO `@Serializable`
  должны совпадать со схемами, проверка — тесты через `testApplication` на `Application.module()`.
  Роуты — `Route.xxxRoutes()` в пакете `routes`, все эндпоинты под `/api`. Порт — `BACKEND_PORT`.
- **Frontend**: React/TypeScript/Vite/Mantine в `frontend/`, роутинг — `react-router`
  (пути в `src/routes.ts`). К backend — только через `api` из `src/api/client.ts`; Vite проксирует `/api`.
  Тесты (Vitest) рендерят внутри `MantineProvider` и `MemoryRouter`.
- **npm workspaces**: корневой `package.json` объединяет `api` и `frontend`, один lockfile.
- **Документация**: `README.md`, `GLOSSARY.md`, `docs/adr/`, `docs/agents/`.

Подробности см. в `README.md` и `CLAUDE.md` (Claude-специфичные указания).

## Доменные правила

- Окно записи — 14 календарных дней, сдвигается со временем; начало окна, часы работы Владельца,
  часовой пояс и шаг стартов фиксируются в спецификации.
- Длительность слота = длительность Типа встречи.
- Пересечения бронирований запрещены, в том числе частичные и между разными Типами встреч;
  интервалы полуоткрытые `[start, end)` — встреча может начаться в момент окончания предыдущей.
- Правила держатся и при одновременных запросах — гарантия на уровне БД
  (exclusion constraint / блокировка в транзакции), а не только проверкой в коде.

## Команды

```bash
mise install && mise run install  # инструменты и зависимости
mise run check                    # всё, что гоняет CI: контракт → SDK, lint, тесты, сборки
mise run api:sdk                  # TypeSpec → OpenAPI → schema.d.ts (коммитить вместе с .tsp)
mise run dev                      # backend :8080 + frontend :5173
mise run lint | test | build | format
```

Один тест:

```bash
cd backend && ./gradlew test --tests 'io.hexlet.calendar.HealthSmokeTest'
npm run test --workspace frontend -- src/App.test.tsx -t 'не найден'
```

Перед завершением работы `mise run check` должен быть зелёным.

## Правила коммитов

- Conventional Commits (`feat`, `fix`, `docs`, `chore`, `ci`, `test`, `refactor`, `!` для breaking)
  с необязательной областью (`api`, `backend`, `frontend`, `e2e`): `feat(frontend): страница записи`.
- commitlint нет — соблюдать вручную. CI (`.github/workflows/ci.yml`) идёт на каждый push.

## Запреты

- Не редактировать вручную `api/openapi/openapi.yaml` и `frontend/src/api/schema.d.ts` —
  перегенерировать через `mise run api:sdk`; CI (`api:verify`) падает на незакоммиченном дрейфе.
- Не редактировать, не удалять и не переименовывать `.github/workflows/hexlet-check.yml`.
- Не поднимать TypeScript выше `~5.9` (typescript-eslint и openapi-typescript не поддерживают TS 7).
- Не коммитить реальные ключи, токены, сертификаты.

## Подробная документация

- `README.md` — стек, установка, команды.
- `CLAUDE.md` — Claude-специфичные указания и локальное окружение.
- `GLOSSARY.md` — терминология (Владелец, Гость, Тип встречи); `docs/adr/` — архитектурные решения.
  Как их использовать — `docs/agents/domain.md`.
- Issues — GitHub Issues kolesbars/ai-for-developers-project-386: `docs/agents/issue-tracker.md`;
  метки `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`:
  `docs/agents/triage-labels.md`.
