# TypeSpec → OpenAPI 3.0: даты, ошибки, валидации

Исследование к issue [#4](https://github.com/kolesbars/ai-for-developers-project-386/issues/4)
(карта — [#2](https://github.com/kolesbars/ai-for-developers-project-386/issues/2)).

**Вопрос.** Как в TypeSpec выражаются и во что превращаются в OpenAPI 3.0.0 и `openapi-typescript`:
дата-время (`utcDateTime`, `offsetDateTime`, `plainDate`, `plainTime`), ошибки как union ответов
с разными статусами (400/404/409/422), валидации (`@minValue`, `@maxValue`, `@pattern`, `@minLength`),
query-параметры диапазона дат? Что даёт чистую схему и удобные типы, а что ломается или теряется?

**Версии (проверено эмпирически, 2026-11-11):** `@typespec/compiler`/`http`/`openapi`/`openapi3` 1.17.0
(`api/package.json`), эмиттер с `openapi-versions: ["3.0.0"]` (`api/tspconfig.yaml`),
`openapi-typescript` 7.13.0, `openapi-fetch` 0.17.0 (`frontend/package.json`, установленные версии
в `node_modules`).

**Источники.** Главный — собственный прогон: пробные контракты
[`typespec-openapi3-mapping/main.tsp`](typespec-openapi3-mapping/main.tsp) и
[`typespec-openapi3-mapping/edge-cases.tsp`](typespec-openapi3-mapping/edge-cases.tsp), скомпилированные
`tsp compile` и пропущенные через `openapi-typescript`, плюс проверка типов клиента
[`typespec-openapi3-mapping/check-client.ts`](typespec-openapi3-mapping/check-client.ts) через `tsc --strict`.
Объяснения «почему так» — по исходникам пакетов в `node_modules` (пути указаны у каждого вывода).
Документация: [typespec.io — built-in types](https://typespec.io/docs/language-basics/built-in-types/),
[built-in decorators](https://typespec.io/docs/standard-library/built-in-decorators/),
[HTTP: responses](https://typespec.io/docs/libraries/http/responses/),
[openapi3 emitter options](https://typespec.io/docs/emitters/openapi3/reference/emitter/).

## Итог (TL;DR)

1. **Момент времени — `utcDateTime`**, дата — `plainDate`. Оба дают `type: string` с `format: date-time` / `date`;
   в TS это просто `string` (не `Date`), парсить на фронтенде вручную.
2. **`offsetDateTime` неотличим от `utcDateTime`** в OpenAPI (оба `format: date-time`), а «UTC» нигде
   не выражено — договорённость «сервер отдаёт `...Z`» надо писать в `/** doc */`.
3. **`plainTime` → `format: time`** — нестандартный для OpenAPI 3.0 формат (есть в JSON Schema, не в OAS 3.0),
   в TS — `string`. Для часов работы лучше `string` с `@pattern("^\\d{2}:\\d{2}$")`, если вообще нужно в API.
4. **Ошибки — отдельные модели с `@error` и `@statusCode _: NNN`, в ответе — union**
   `Ok | BadRequestError | NotFoundError | ConflictError | ValidationError`. Каждый статус становится
   отдельным ответом со своим `$ref`; с литеральным `code: "SLOT_TAKEN"` получается дискриминированный union,
   и `openapi-fetch` даёт `error`, который сужается по `error.code` с исчерпывающей проверкой.
5. **Валидации строк/чисел/массивов переносятся 1:1** (`minLength`/`maxLength`/`pattern`/`minimum`/`maximum`/
   `minItems`/`maxItems`, `exclusiveMinimum: true` в стиле 3.0), но **в TS-типах их нет** — только в YAML.
   Проверять на backend и (по желанию) в форме.
6. **Теряется молча:** `@minValue` на `utcDateTime` (нет в схеме, без предупреждения), сообщение второго
   аргумента `@pattern`, описание 422 по умолчанию — «Client error» (лечится `/** doc */` на модели ошибки).
7. **Диапазон дат в query** — `@query from: plainDate, @query to: plainDate` (или `utcDateTime`); в TS они
   обязательные `string`. Модель с `@query`-полями, разворачиваемая `...DateRange`, уезжает в
   `components.parameters` с именами вида `DateRange.from` — работает, но читается хуже; inline-параметры чище.
8. **`operationId`** по умолчанию `Interface_op` (стратегия `parent-container`); в проекте уже задаётся явно
   `@operationId` — так и продолжать.

## 1. Дата и время

Пробная модель (`main.tsp`):

```tsp
model Dates {
  utc: utcDateTime;
  offset: offsetDateTime;
  date: plainDate;
  time: plainTime;
  dur: duration;
  @encode(DateTimeKnownEncoding.unixTimestamp, int64) unix: utcDateTime;
  @encode(DurationKnownEncoding.seconds, int32) durSeconds: duration;
}
```

OpenAPI 3.0.0 (выдержка из сгенерированного `out/openapi.yaml`):

```yaml
utc:        { type: string,  format: date-time }
offset:     { type: string,  format: date-time }
date:       { type: string,  format: date }
time:       { type: string,  format: time }
dur:        { type: string,  format: duration }
unix:       { type: integer, format: unixtime }
durSeconds: { type: integer, format: int32 }
```

`openapi-typescript`:

```ts
Dates: {
  /** Format: date-time */ utc: string;
  /** Format: date-time */ offset: string;
  /** Format: date */      date: string;
  /** Format: time */      time: string;
  /** Format: duration */  dur: string;
  /** Format: unixtime */  unix: number;
  /** Format: int32 */     durSeconds: number;
};
```

Почему так — таблица соответствий в `@typespec/openapi3/dist/src/std-scalar-schemas.js`
(`utcDateTime`/`offsetDateTime` → `date-time`, `plainDate` → `date`, `plainTime` → `time`,
`duration` → `duration`) и слияние кодировок в `@typespec/openapi3/dist/src/encoding.js`
(`unixTimestamp` → `format: unixtime`, `rfc7231` → `http-date`).

Выводы и подводные камни:

- **`offsetDateTime` == `utcDateTime` на проводе.** Семантика TypeSpec (`utcDateTime` — момент в UTC,
  `offsetDateTime` — со смещением) в OpenAPI не сохраняется. Для бронирований нужен абсолютный момент →
  `utcDateTime`; формат ответа (`2026-11-11T09:00:00Z`) зафиксировать в doc-комментарии.
- **`plainTime` → `format: time`** — в OpenAPI 3.0 такого формата в реестре нет (форматы 3.0 — `date`,
  `date-time`, `password`, `byte`, `binary` + числовые); валидаторы на стороне Ktor/фронта его, скорее всего,
  проигнорируют. Для «часов работы» в API лучше явная строка с паттерном или вообще не выносить их в API
  (они фиксированы спецификацией).
- **`@encode(unixTimestamp, int64)` даёт `format: unixtime`, а не `int64`** — формат нестандартный, в TS `number`.
  Не использовать: ISO-строки читаемее и совпадают с `kotlinx.datetime.Instant`.
- **В заголовке** `utcDateTime` кодируется как `http-date` автоматически (см. `edge-cases.tsp`,
  `If-Modified-Since` → `format: http-date`).
- **На фронте — `string`, не `Date`.** CLI `openapi-typescript` не превращает `date-time` в `Date`
  (это возможно только через `transform` в Node API, и тогда типы будут врать: `openapi-fetch` не парсит JSON
  в `Date`). Оставить `string`, парсить в одном месте (утилита форматирования).

## 2. Ошибки как union ответов

```tsp
/** Тело запроса не прошло валидацию. */
@error
model ValidationError {
  @statusCode _: 422;
  code: "VALIDATION_ERROR";
  message: string;
  fields: Record<string>;
}
// аналогично BadRequestError (400), NotFoundError (404), ConflictError (409, code: "SLOT_TAKEN")

model Created<T> { @statusCode _: 201; @body body: T; }

@post create(@body body: EventTypeInput):
  | Created<Booking> | BadRequestError | NotFoundError | ConflictError | ValidationError;
```

OpenAPI:

```yaml
responses:
  '201': { description: ..., content: { application/json: { schema: { $ref: '#/components/schemas/Booking' } } } }
  '400': { ..., schema: { $ref: '#/components/schemas/BadRequestError' } }
  '404': { ..., schema: { $ref: '#/components/schemas/NotFoundError' } }
  '409': { ..., schema: { $ref: '#/components/schemas/ConflictError' } }
  '422':
    description: Тело запроса не прошло валидацию.   # без /** doc */ было бы "Client error"
    content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } }
...
ConflictError:
  type: object
  required: [code, message]
  properties:
    code: { type: string, enum: [SLOT_TAKEN] }
    message: { type: string }
```

Поле `@statusCode _` в схему тела не попадает — модель ошибки чистая.

`openapi-typescript` даёт по ключу на статус, а `openapi-fetch` объединяет все 4xx/5xx/`default`
(список `ErrorStatus` в `openapi-typescript-helpers/dist/index.d.ts`) в тип `error`. Проверено в
`check-client.ts` под `tsc --strict` — компилируется без ошибок:

```ts
const { data, error } = await api.POST('/api/bookings', { body })
if (error) {
  switch (error.code) {
    case 'SLOT_TAKEN': return `занято: ${error.message}`
    case 'VALIDATION_ERROR': return Object.keys(error.fields).join(',') // доступно после сужения
    case 'NOT_FOUND':
    case 'BAD_REQUEST': return error.message
    default: { const never: never = error; return never }               // исчерпывающая проверка
  }
}
const start: string = data.start // после if(error) data — Booking
```

Варианты и подводные камни (`edge-cases.tsp`):

- **Две ошибки с одним статусом** (`SlotTakenError` и `OutOfWindowError`, оба 409) → один ответ `'409'` со
  `schema: anyOf: [$ref SlotTakenError, $ref OutOfWindowError]`; в TS — union, сужение по `code` работает.
  Это нормальный способ различать причины конфликта.
- **`@statusCode _: 400 | 422`** на одной модели → два одинаковых ответа `'400'` и `'422'` с одной схемой.
  Работает, но фронт не отличит их по типу — лучше отдельные модели.
- **Общее тело + обёртка** (`model NotFound { @statusCode _: 404; @body body: ErrorBody }`) → ответ ссылается
  на `ErrorBody`, отдельной схемы `NotFound` нет. Удобно для одного `ErrorBody` на всё, но тогда `code: string`
  и сужения нет.
- **Ошибка без `@statusCode`** (`@error model GenericError {...}`) → ответ `default`. Не использовать для
  ожидаемых ошибок домена: фронт не увидит конкретных статусов.
- **Описание ответа** берётся из `/** doc */` модели; иначе — стандартные фразы («The request conflicts...»,
  а для 422 — неинформативное «Client error»).
- **Литеральный `code`** обязателен для сужения: при `code: string` все ошибки в TS сливаются в один тип.
- Несовпадение статуса и тела — ответственность backend: Ktor-тесты должны проверять и статус, и `code`.

## 3. Валидации

```tsp
@pattern("^[a-z0-9-]+$") @minLength(3) @maxLength(40)
scalar Slug extends string;

model EventTypeInput {
  @minLength(1) @maxLength(100) title: string;
  slug: Slug;
  @minValue(5) @maxValue(480) durationMinutes: int32;
  @minValueExclusive(0) price?: float64;
  @minItems(1) @maxItems(3) tags: string[];
  @format("email") email: string;
  note?: string | null;
  kind: "one-on-one" | "group";
}
```

OpenAPI:

```yaml
title:           { type: string, minLength: 1, maxLength: 100 }
slug:            { $ref: '#/components/schemas/Slug' }
durationMinutes: { type: integer, format: int32, minimum: 5, maximum: 480 }
price:           { type: number, format: double, minimum: 0, exclusiveMinimum: true }
tags:            { type: array, items: { type: string }, minItems: 1, maxItems: 3 }
email:           { type: string, format: email }
note:            { type: string, nullable: true }
kind:            { type: string, enum: [one-on-one, group] }
Slug:            { type: string, minLength: 3, maxLength: 40, pattern: ^[a-z0-9-]+$ }
```

TS:

```ts
EventTypeInput: {
  title: string;
  slug: components["schemas"]["Slug"];   // Slug: string
  /** Format: int32 */ durationMinutes: number;
  /** Format: double */ price?: number;
  tags: string[];
  /** Format: email */ email: string;
  note?: string | null;
  /** @enum {string} */ kind: "one-on-one" | "group";
};
```

- Все ограничения доходят до YAML (`exclusiveMinimum: true` — булев стиль OpenAPI 3.0,
  `@typespec/openapi3/dist/src/schema-emitter-3-0.js`), **но в TS остаются только типы** — `minLength`,
  `pattern`, диапазоны в `.d.ts` не попадают (даже в JSDoc). Значит, ограничения — документация контракта
  и обязанность backend; на фронте их дублировать вручную, если нужны в форме.
- Именованный `scalar Slug extends string` с декораторами выносится в `components.schemas.Slug` и
  переиспользуется; в TS — алиас `string`.
- `string | null` → `nullable: true`, union строковых литералов → `enum` и TS-union — оба чистые.
- **Теряется:** `@minValue(utcDateTime.fromISO(...))` на дате компилируется без ошибок и предупреждений, но
  в схеме ограничения нет (`edge-cases.tsp`, поле `Window.start`). Ограничение окна записи (14 дней) в
  контракте не выразить — только в doc и на backend (вернуть 422/409).
- **Теряется:** второй аргумент `@pattern(pattern, "Время в формате HH:mm")` — в OpenAPI 3.0 только `pattern`.
- `int8` → `format: int8` (нестандартно для 3.0), для чисел лучше `int32`.

## 4. Query-параметры диапазона дат

Inline (`main.tsp`):

```tsp
@get list(@query from: utcDateTime, @query to: utcDateTime, @query day?: plainDate,
          @query eventTypeId: string): Booking[] | BadRequestError | NotFoundError;
```

```yaml
- { name: from, in: query, required: true,  schema: { type: string, format: date-time }, explode: false }
- { name: to,   in: query, required: true,  schema: { type: string, format: date-time }, explode: false }
- { name: day,  in: query, required: false, schema: { type: string, format: date },      explode: false }
```

```ts
query: { from: string; to: string; day?: string; eventTypeId: string };
```

`check-client.ts` подтверждает: вызов без обязательного `to` — ошибка типов.

Через spread модели (`edge-cases.tsp`):

```tsp
model DateRange {
  /** Начало диапазона, включительно. */ @query from: plainDate;
  /** Конец диапазона, не включительно. */ @query to: plainDate;
}
@get slots(...DateRange, @query tz?: string = "Europe/Moscow", @query limit?: int32 = 20,
           @query(#{ explode: true }) ids?: string[]): string[] | NotFound;
```

```yaml
parameters:
  - $ref: '#/components/parameters/DateRange.from'
  - $ref: '#/components/parameters/DateRange.to'
  - { name: tz,    in: query, required: false, schema: { type: string, default: Europe/Moscow }, explode: false }
  - { name: limit, in: query, required: false, schema: { type: integer, format: int32, default: 20 }, explode: false }
  - { name: ids,   in: query, required: false, schema: { type: array, items: { type: string } } }
components:
  parameters:
    DateRange.from: { name: from, in: query, required: true, description: Начало диапазона, включительно., ... }
```

```ts
query: {
  /** @description Начало диапазона, включительно. */
  from: components["parameters"]["DateRange.from"];
  ...
  tz?: string; limit?: number; ids?: string[];
};
```

- Оба варианта дают правильные TS-типы. Spread выносит параметры в `components.parameters` с ключами через
  точку — валидно, но YAML и подсказки IDE читаются хуже; для 1–2 эндпоинтов проще inline.
- Значения по умолчанию (`= 20`) попадают в `schema.default`, но в TS параметр просто опциональный.
- `explode: false` у скаляров эмиттер ставит сам — на сериализацию одиночных значений не влияет.
- Полуоткрытость `[from, to)` и часовой пояс в схеме не выражаются — только в doc-комментариях
  (они попадают в `description` и в JSDoc TS).
- `plainDate` для «дней» и `utcDateTime` для «моментов»: если фронт выбирает день в календаре, проще
  передавать `plainDate` и считать границы на backend в часовом поясе Владельца из спецификации.

## Рекомендации для контракта проекта

| Нужно | Конструкция | Почему |
| --- | --- | --- |
| Начало/конец бронирования, слота | `utcDateTime` + doc «ISO 8601, UTC (`Z`)» | однозначный момент, `format: date-time`, совпадает с `Instant` |
| День в календаре | `plainDate` | `format: date`, без часового пояса |
| Время суток | не выносить или `string` + `@pattern` | `plainTime` → нестандартный `format: time` |
| Длительность Типа встречи | `int32` минут + `@minValue`/`@maxValue` | `duration` → ISO-строка `PT30M`, неудобно в UI |
| Ошибки | модель на каждый случай: `@error`, `@statusCode _`, литеральный `code`, `message`, `/** doc */` | отдельный ответ на статус, сужение по `code` в `openapi-fetch` |
| Несколько причин 409 | несколько моделей с одним статусом | `anyOf` + TS-union |
| 422 | `ValidationError` с `fields: Record<string>` | без doc описание — «Client error» |
| Успешное создание | `Created<T>` / `{ @statusCode _: 201; @body body: T }` | явный 201 |
| Ограничения полей | `@minLength`/`@maxLength`/`@pattern`/`@minValue`/`@maxValue`, именованные `scalar` | доходят до YAML; в TS — нет, проверять на backend |
| Диапазон дат | inline `@query from`, `@query to` + doc «`[from, to)`» | чистые параметры, обязательность в TS |
| `operationId` | явный `@operationId` | иначе `Interface_op` |

Не использовать: `offsetDateTime` (не отличим от UTC), `@encode(unixTimestamp)` (`format: unixtime`),
`@minValue` на датах (молча теряется), ошибку без `@statusCode` для доменных ошибок (уходит в `default`),
`code: string` в моделях ошибок (нет сужения).

## Как воспроизвести

Из `research/typespec-openapi3-mapping/` (зависимости — корневой `node_modules`; `out*/` в `.gitignore`):

```bash
export PATH=$HOME/.local/bin:<repo>/node_modules/.bin:$PATH
mise exec -- tsp compile .                       # main.tsp → out/openapi.yaml
mise exec -- tsp compile edge-cases.tsp \
  --option "@typespec/openapi3.emitter-output-dir={project-root}/out-edge"
mise exec -- openapi-typescript out/openapi.yaml -o out/schema.d.ts
mise exec -- openapi-typescript out-edge/openapi.yaml -o out-edge/schema.d.ts
mise exec -- tsc --noEmit --strict --module esnext --moduleResolution bundler \
  --target es2022 --skipLibCheck check-client.ts
```
