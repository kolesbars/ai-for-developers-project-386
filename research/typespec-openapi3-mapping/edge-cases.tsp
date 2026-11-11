// Пограничные случаи. Компилируется отдельно: tsp compile edge-cases.tsp (см. ../typespec-openapi3-mapping.md).
import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Edge cases probe" })
namespace Edge;

// A. Две разные ошибки с одним статусом 409.
@error
model SlotTakenError {
  @statusCode _: 409;
  code: "SLOT_TAKEN";
  message: string;
}

@error
model OutOfWindowError {
  @statusCode _: 409;
  code: "OUT_OF_WINDOW";
  message: string;
}

// B. Одна модель ошибки на несколько статусов.
@error
model ProblemError {
  @statusCode _: 400 | 422;
  code: string;
  message: string;
}

// C. Общая модель тела ошибки + обёртки со статусом (без дублирования полей).
model ErrorBody {
  code: string;
  message: string;
}

@error
model NotFound {
  @statusCode _: 404;
  @body body: ErrorBody;
}

// D. Диапазон дат как модель с @query, разворачиваемая spread-ом.
model DateRange {
  /** Начало диапазона, включительно. */
  @query from: plainDate;

  /** Конец диапазона, не включительно. */
  @query to: plainDate;
}

// E. Ограничения на дату-время и прочее.
model Window {
  @minValue(utcDateTime.fromISO("2026-01-01T00:00:00Z"))
  start: utcDateTime;

  @pattern("^\\d{2}:\\d{2}$", "Время в формате HH:mm")
  hhmm: string;

  @minValue(0) @maxValue(23) hour: int8;
}

@route("/edge")
interface EdgeOps {
  @post @route("book") book(@body body: Window): {
    @statusCode _: 201;
  } | SlotTakenError | OutOfWindowError | ProblemError;

  @get @route("slots") slots(
    ...DateRange,
    @query tz?: string = "Europe/Moscow",
    @query limit?: int32 = 20,
    @query(#{ explode: true }) ids?: string[],
    @query at?: plainTime,
    @header("If-Modified-Since") since?: utcDateTime,
  ): string[] | NotFound;
}
