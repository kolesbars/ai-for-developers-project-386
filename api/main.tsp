import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Calendar Booking API" })
@info(#{ version: "0.1.0" })
@server("http://localhost:8080", "Локальный backend")
namespace CalendarBooking;

/** Состояние сервиса. */
model Health {
  status: "ok";
}

@tag("System")
@route("/api/health")
interface System {
  /** Проверка, что сервис поднят и отвечает. */
  @get
  @operationId("getHealth")
  health(): Health;
}
