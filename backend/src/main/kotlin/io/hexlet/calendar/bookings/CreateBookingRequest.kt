package io.hexlet.calendar.bookings

import io.hexlet.calendar.routes.ApiException
import io.hexlet.calendar.routes.FieldError
import kotlinx.serialization.Serializable
import java.time.Instant

private val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

/** Проверенный запрос Гостя: что бронировать и кто. */
data class BookingDraft(
    val meetingTypeId: String,
    val startAt: Instant,
    val guestName: String,
    val guestEmail: String,
    val comment: String?,
)

/**
 * Тело `POST /api/bookings` (схема `CreateBookingRequest`). Поля nullable, чтобы отсутствие поля
 * давало ошибку этого поля, а не общую ошибку разбора JSON. Правила — docs/spec.md §4.
 */
@Serializable
data class CreateBookingRequest(
    val meetingTypeId: String? = null,
    val startAt: String? = null,
    val guestName: String? = null,
    val guestEmail: String? = null,
    val comment: String? = null,
) {
    /** @throws ApiException `validation_failed` со всеми нарушенными полями. */
    fun validate(): BookingDraft {
        val errors = mutableListOf<FieldError>()
        if (meetingTypeId.isNullOrBlank()) errors += FieldError("meetingTypeId", "Выберите Тип встречи")
        val start = startAt?.let { runCatching { Instant.parse(it) }.getOrNull() }
        if (start == null) errors += FieldError("startAt", "Время начала — момент ISO 8601, например 2026-11-12T05:00:00Z")
        if (guestName == null || guestName.isBlank() || guestName.length > 100) {
            errors += FieldError("guestName", "Имя обязательно, до 100 символов")
        }
        if (guestEmail == null || !EMAIL_PATTERN.matches(guestEmail)) errors += FieldError("guestEmail", "Некорректный email")
        if (comment != null && comment.length > 500) errors += FieldError("comment", "Комментарий — до 500 символов")
        if (errors.isNotEmpty()) throw ApiException.validationFailed(errors)
        return BookingDraft(meetingTypeId!!, start!!, guestName!!, guestEmail!!, comment)
    }
}
