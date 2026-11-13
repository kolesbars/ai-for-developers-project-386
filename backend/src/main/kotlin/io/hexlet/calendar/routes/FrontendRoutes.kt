package io.hexlet.calendar.routes

import io.ktor.http.HttpStatusCode
import io.ktor.server.http.content.staticFiles
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.route
import java.io.File

/**
 * Собранный frontend (в контейнере — `STATIC_DIR`): файлы как есть, остальные пути — `index.html`,
 * чтобы клиентский роутинг работал при прямом заходе. Неизвестные `/api/...` — 404 без тела, а не страница.
 */
fun Route.frontendRoutes(dir: File) {
    route("/api/{...}") {
        handle {
            // Пустое тело: у неизвестного эндпоинта нет кода ошибки в контракте (api/main.tsp).
            call.respond(HttpStatusCode.NotFound)
        }
    }
    staticFiles("/", dir) {
        default("index.html")
    }
}
