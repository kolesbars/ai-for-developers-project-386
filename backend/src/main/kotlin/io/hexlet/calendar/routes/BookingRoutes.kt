package io.hexlet.calendar.routes

import io.hexlet.calendar.bookings.BookingRepository
import io.hexlet.calendar.bookings.CreateBookingRequest
import io.hexlet.calendar.meetingtypes.MeetingTypeRepository
import io.hexlet.calendar.slots.BookingWindow
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.time.Clock

fun Route.bookingRoutes(
    meetingTypes: MeetingTypeRepository,
    bookings: BookingRepository,
    bookingWindow: BookingWindow,
    clock: Clock,
) {
    route("/api/bookings") {
        get {
            call.respond(bookings.upcoming(clock.instant()))
        }

        post {
            val draft = call.receive<CreateBookingRequest>().validate()
            val meetingType = meetingTypes.require(draft.meetingTypeId)
            val duration = meetingType.duration
            val now = clock.instant()
            if (!bookingWindow.isStart(draft.startAt, now, duration)) throw ApiException.slotUnavailable()
            val booking =
                bookings.insert(draft, draft.startAt.plus(duration), meetingType.name, now) ?: throw ApiException.slotTaken()
            call.respond(HttpStatusCode.Created, booking)
        }

        get("{id}") {
            val booking = bookings.find(call.parameters["id"]!!) ?: throw ApiException.bookingNotFound()
            call.respond(booking)
        }
    }
}
