package io.hexlet.calendar

import io.hexlet.calendar.bookings.BookingRepository
import io.hexlet.calendar.db.Database
import io.hexlet.calendar.meetingtypes.MeetingTypeRepository
import io.hexlet.calendar.routes.healthRoutes
import io.hexlet.calendar.routes.installErrorHandling
import io.hexlet.calendar.routes.meetingTypeRoutes
import io.hexlet.calendar.slots.BookingWindow
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json
import java.time.Clock
import javax.sql.DataSource

private const val DEFAULT_PORT = 8080

fun main() {
    val port = System.getenv("BACKEND_PORT")?.toIntOrNull() ?: DEFAULT_PORT
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = { module() })
        .start(wait = true)
}

/**
 * @param dataSource PostgreSQL; по умолчанию — `DATABASE_URL` или embedded.
 * @param clock источник «сейчас»; тесты передают `Clock.fixed(...)`.
 */
fun Application.module(
    dataSource: DataSource = Database.fromEnvironment(),
    clock: Clock = Clock.systemUTC(),
) {
    Database.migrate(dataSource)

    install(ContentNegotiation) {
        json(
            Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            },
        )
    }
    install(CallLogging)
    installErrorHandling()

    routing {
        healthRoutes()
        meetingTypeRoutes(MeetingTypeRepository(dataSource), BookingRepository(dataSource), BookingWindow(), clock)
    }
}
