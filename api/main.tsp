import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

/**
 * API «Календаря звонков»: Гости бронируют встречи с Владельцем без регистрации.
 * Поведение и правила — docs/spec.md. Все моменты времени — UTC (ISO 8601, `...Z`).
 */
@service(#{ title: "Calendar Booking API" })
@info(#{ version: "1.0.0" })
@server("http://localhost:8080", "Локальный backend")
namespace CalendarBooking;

// ───────────────────────── Скаляры ─────────────────────────

/** id Типа встречи: задаёт Владелец, уникален и неизменяем, используется в адресе `/book/{id}`. */
@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
@minLength(2)
@maxLength(40)
scalar MeetingTypeId extends string;

/** Идентификатор Бронирования (UUID), выдаёт сервер. */
@format("uuid")
scalar BookingId extends string;

// ───────────────────────── Ошибки ─────────────────────────

/** Ошибка проверки одного поля. */
model FieldError {
  /** Имя поля запроса, например `guestEmail`. */
  field: string;

  /** Понятный человеку текст на русском. */
  message: string;
}

/** Поля запроса не прошли проверку. */
@error
model ValidationError {
  @statusCode _: 400;
  code: "validation_failed";
  message: string;
  fieldErrors: FieldError[];
}

/** Тип встречи с таким id не найден. */
@error
model MeetingTypeNotFoundError {
  @statusCode _: 404;
  code: "meeting_type_not_found";
  message: string;
}

/** Бронирование с таким id не найдено. */
@error
model BookingNotFoundError {
  @statusCode _: 404;
  code: "booking_not_found";
  message: string;
}

/** Тип встречи с таким id уже существует. */
@error
model MeetingTypeExistsError {
  @statusCode _: 409;
  code: "meeting_type_exists";
  message: string;
}

/**
 * Время пересекается с существующим Бронированием любого Типа встречи
 * (в том числе проигравший одновременный запрос).
 */
@error
model SlotTakenError {
  @statusCode _: 409;
  code: "slot_taken";
  message: string;
}

/** Старт вне Окна записи или Рабочих часов, не на сетке :00/:30 или уже в прошлом. */
@error
model SlotUnavailableError {
  @statusCode _: 422;
  code: "slot_unavailable";
  message: string;
}

model Created<T> {
  @statusCode _: 201;
  @body body: T;
}

// ───────────────────────── Модели ─────────────────────────

/** Профиль Владельца, задаётся конфигурацией сервера. */
model Owner {
  @minLength(1) name: string;

  /** Короткое описание для страниц Гостя. */
  bio: string;

  /** Часовой пояс Рабочих часов, IANA (`Asia/Almaty`). */
  timeZone: string;
}

/** Тип встречи. */
model MeetingType {
  id: MeetingTypeId;

  @minLength(1)
  @maxLength(100)
  name: string;

  @maxLength(500)
  description?: string;

  /** Длительность в минутах: 15…240, кратно 15. */
  @minValue(15)
  @maxValue(240)
  durationMinutes: int32;
}

/** Слот: возможное время начала встречи выбранного Типа встречи. */
model Slot {
  /** Начало, UTC. */
  startAt: utcDateTime;

  /** Окончание = начало + длительность Типа встречи, UTC. */
  endAt: utcDateTime;

  /** `busy` — интервал `[startAt, endAt)` пересекается с любым Бронированием. */
  status: "available" | "busy";
}

/** Запрос Гостя на Бронирование. */
model CreateBookingRequest {
  meetingTypeId: MeetingTypeId;

  /** Начало встречи, UTC; должно совпадать со стартом свободного Слота. */
  startAt: utcDateTime;

  @minLength(1)
  @maxLength(100)
  guestName: string;

  @format("email")
  guestEmail: string;

  @maxLength(500)
  comment?: string;
}

/** Бронирование. */
model Booking {
  id: BookingId;
  meetingTypeId: MeetingTypeId;

  /** Название Типа встречи на момент чтения — для подтверждения и списка Владельца. */
  meetingTypeName: string;

  /** Начало, UTC. */
  startAt: utcDateTime;

  /** Окончание, UTC; вычисляет сервер. */
  endAt: utcDateTime;

  guestName: string;
  guestEmail: string;
  comment?: string;
  createdAt: utcDateTime;
}

/** Состояние сервиса. */
model Health {
  status: "ok";
}

// ───────────────────────── Операции ─────────────────────────

@tag("System")
@route("/api/health")
interface System {
  /** Проверка, что сервис поднят и отвечает. */
  @get
  @operationId("getHealth")
  health(): Health;
}

@tag("Owner")
@route("/api/owner")
interface OwnerProfile {
  /** Профиль Владельца. */
  @get
  @operationId("getOwner")
  get(): Owner;
}

@tag("MeetingTypes")
@route("/api/meeting-types")
interface MeetingTypes {
  /** Каталог Типов встреч. */
  @get
  @operationId("listMeetingTypes")
  list(): MeetingType[];

  /** Создание Типа встречи (Владелец). */
  @post
  @operationId("createMeetingType")
  create(@body body: MeetingType): Created<MeetingType> | ValidationError | MeetingTypeExistsError;

  /** Один Тип встречи. */
  @get
  @route("{id}")
  @operationId("getMeetingType")
  get(@path id: string): MeetingType | MeetingTypeNotFoundError;

  /**
   * Все старты Окна записи (14 дней с сегодняшнего по часовому поясу Владельца,
   * пн–пт 09:00–18:00, шаг 30 минут) со статусом, по возрастанию `startAt`.
   * Прошедшие старты не возвращаются.
   */
  @get
  @route("{id}/slots")
  @operationId("listSlots")
  slots(@path id: string): Slot[] | MeetingTypeNotFoundError;
}

@tag("Bookings")
@route("/api/bookings")
interface Bookings {
  /** Предстоящие встречи всех Типов (ещё не закончившиеся), по возрастанию `startAt`. */
  @get
  @operationId("listUpcomingBookings")
  list(): Booking[];

  /** Создание Бронирования Гостем. */
  @post
  @operationId("createBooking")
  create(@body body: CreateBookingRequest):
    | Created<Booking>
    | ValidationError
    | MeetingTypeNotFoundError
    | SlotTakenError
    | SlotUnavailableError;

  /** Одно Бронирование — для страницы подтверждения. */
  @get
  @route("{id}")
  @operationId("getBooking")
  get(@path id: string): Booking | BookingNotFoundError;
}
