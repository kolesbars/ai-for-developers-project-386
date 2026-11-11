package io.hexlet.calendar.routes

import io.hexlet.calendar.bookings.BookingRepository
import io.hexlet.calendar.meetingtypes.CreateMeetingTypeRequest
import io.hexlet.calendar.meetingtypes.MeetingTypeRepository
import io.hexlet.calendar.slots.BookingWindow
import io.hexlet.calendar.slots.Slot
import io.hexlet.calendar.slots.SlotStatus
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.time.Clock

/** Тип встречи по id из адреса или запроса; нет — `404 meeting_type_not_found`. */
internal suspend fun MeetingTypeRepository.require(id: String) = find(id) ?: throw ApiException.meetingTypeNotFound()

fun Route.meetingTypeRoutes(
    meetingTypes: MeetingTypeRepository,
    bookings: BookingRepository,
    bookingWindow: BookingWindow,
    clock: Clock,
) {
    route("/api/meeting-types") {
        get {
            call.respond(meetingTypes.list())
        }

        post {
            val meetingType = call.receive<CreateMeetingTypeRequest>().validate()
            if (!meetingTypes.insert(meetingType, clock.instant())) throw ApiException.meetingTypeExists()
            call.respond(HttpStatusCode.Created, meetingType)
        }

        get("{id}") {
            call.respond(meetingTypes.require(call.parameters["id"]!!))
        }

        get("{id}/slots") {
            val duration = meetingTypes.require(call.parameters["id"]!!).duration
            val starts = bookingWindow.starts(clock.instant(), duration)
            val busy = if (starts.isEmpty()) emptyList() else bookings.busyIntervals(starts.first(), starts.last().plus(duration))
            val slots =
                starts.map { start ->
                    val end = start.plus(duration)
                    val status = if (busy.any { it.overlaps(start, end) }) SlotStatus.BUSY else SlotStatus.AVAILABLE
                    Slot(startAt = start.toString(), endAt = end.toString(), status = status)
                }
            call.respond(slots)
        }
    }
}
