package io.hexlet.calendar.bookings

import kotlinx.serialization.Serializable

/** Соответствует схеме `Booking`: моменты — ISO 8601 в UTC, `endAt` и `meetingTypeName` считает сервер. */
@Serializable
data class Booking(
    val id: String,
    val meetingTypeId: String,
    val meetingTypeName: String,
    val startAt: String,
    val endAt: String,
    val guestName: String,
    val guestEmail: String,
    val comment: String? = null,
    val createdAt: String,
)
