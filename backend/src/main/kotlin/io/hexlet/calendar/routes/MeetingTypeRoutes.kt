package io.hexlet.calendar.routes

import io.hexlet.calendar.meetingtypes.CreateMeetingTypeRequest
import io.hexlet.calendar.meetingtypes.MeetingTypeRepository
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.time.Clock

fun Route.meetingTypeRoutes(
    meetingTypes: MeetingTypeRepository,
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
            val meetingType = meetingTypes.find(call.parameters["id"]!!) ?: throw ApiException.meetingTypeNotFound()
            call.respond(meetingType)
        }
    }
}
