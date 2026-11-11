package io.hexlet.calendar.meetingtypes

import kotlinx.serialization.Serializable

/** Соответствует схеме `MeetingType` в api/openapi/openapi.yaml. */
@Serializable
data class MeetingType(
    val id: String,
    val name: String,
    val description: String? = null,
    val durationMinutes: Int,
)
