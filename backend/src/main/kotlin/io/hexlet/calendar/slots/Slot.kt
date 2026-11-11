package io.hexlet.calendar.slots

import kotlinx.serialization.Serializable

/** Соответствует схеме `Slot`: моменты — ISO 8601 в UTC. */
@Serializable
data class Slot(
    val startAt: String,
    val endAt: String,
    val status: String,
)
