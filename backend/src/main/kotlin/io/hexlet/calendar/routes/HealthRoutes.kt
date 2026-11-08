package io.hexlet.calendar.routes

import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import kotlinx.serialization.Serializable

/** Соответствует схеме `Health` в api/openapi/openapi.yaml. */
@Serializable
data class Health(
    val status: String,
)

fun Route.healthRoutes() {
    get("/api/health") {
        call.respond(Health(status = "ok"))
    }
}
