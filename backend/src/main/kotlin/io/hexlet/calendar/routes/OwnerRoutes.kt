package io.hexlet.calendar.routes

import io.hexlet.calendar.owner.Owner
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get

fun Route.ownerRoutes(owner: Owner) {
    get("/api/owner") {
        call.respond(owner)
    }
}
