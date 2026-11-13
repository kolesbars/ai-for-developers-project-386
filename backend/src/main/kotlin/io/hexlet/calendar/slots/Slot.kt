package io.hexlet.calendar.slots

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Соответствует `Slot.status` контракта: `"available" | "busy"`. */
@Serializable
enum class SlotStatus {
    @SerialName("available")
    AVAILABLE,

    @SerialName("busy")
    BUSY,
}

/** Соответствует схеме `Slot`: моменты — ISO 8601 в UTC. */
@Serializable
data class Slot(
    val startAt: String,
    val endAt: String,
    val status: SlotStatus,
)
