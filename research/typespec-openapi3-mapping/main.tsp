// Пробный контракт для research/typespec-openapi3-mapping.md.
// Не часть API проекта. Компиляция: см. ../typespec-openapi3-mapping.md, раздел «Как воспроизвести».
import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Mapping probe" })
namespace Probe;

// ---------- 1. Даты и время ----------
model Dates {
  utc: utcDateTime;
  offset: offsetDateTime;
  date: plainDate;
  time: plainTime;
  dur: duration;

  @encode(DateTimeKnownEncoding.unixTimestamp, int64)
  unix: utcDateTime;

  @encode(DurationKnownEncoding.seconds, int32)
  durSeconds: duration;
}

// ---------- 2. Валидации ----------
@pattern("^[a-z0-9-]+$")
@minLength(3)
@maxLength(40)
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

// ---------- 3. Ошибки ----------
/** Тело запроса не прошло валидацию. */
@error
model ValidationError {
  @statusCode _: 422;
  code: "VALIDATION_ERROR";
  message: string;
  fields: Record<string>;
}

@error
model NotFoundError {
  @statusCode _: 404;
  code: "NOT_FOUND";
  message: string;
}

@error
model ConflictError {
  @statusCode _: 409;
  code: "SLOT_TAKEN";
  message: string;
}

@error
model BadRequestError {
  @statusCode _: 400;
  code: "BAD_REQUEST";
  message: string;
}

// Ошибка без @statusCode → ответ "default"
@error
model GenericError {
  code: string;
  message: string;
}

model Booking {
  id: string;
  start: utcDateTime;
  end: utcDateTime;
}

model Created<T> {
  @statusCode _: 201;
  @body body: T;
}

// ---------- 4. Query-параметры диапазона ----------
@route("/api/slots")
interface Slots {
  @get list(
    @query from: utcDateTime,
    @query to: utcDateTime,
    @query day?: plainDate,
    @query eventTypeId: string,
  ): Booking[] | BadRequestError | NotFoundError;
}

@route("/api/bookings")
interface Bookings {
  @post create(@body body: EventTypeInput):
    | Created<Booking>
    | BadRequestError
    | NotFoundError
    | ConflictError
    | ValidationError;

  @get @route("{id}") read(@path id: string): Booking | NotFoundError;

  @delete @route("{id}") remove(@path id: string): NoContentResponse | GenericError;

  @get @route("/dates") dates(): Dates;
}
