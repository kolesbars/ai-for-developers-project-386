package io.hexlet.calendar.meetingtypes

import kotlinx.serialization.Serializable
import java.time.Duration

/** Соответствует схеме `MeetingType` в api/openapi/openapi.yaml. */
@Serializable
data class MeetingType(
    val id: String,
    val name: String,
    val description: String? = null,
    val durationMinutes: Int,
) {
    /** Длительность Слота этого Типа встречи (в JSON не попадает: нет backing field). */
    val duration: Duration get() = Duration.ofMinutes(durationMinutes.toLong())
}
