package io.hexlet.calendar.meetingtypes

import io.hexlet.calendar.routes.ApiException
import io.hexlet.calendar.routes.FieldError
import kotlinx.serialization.Serializable

private val ID_PATTERN = Regex("^[a-z0-9]+(-[a-z0-9]+)*$")

/**
 * Тело `POST /api/meeting-types` (схема `MeetingType`). Поля nullable, чтобы отсутствие поля
 * давало понятную ошибку этого поля, а не общую ошибку разбора JSON. Правила — docs/spec.md §4.
 */
@Serializable
data class CreateMeetingTypeRequest(
    val id: String? = null,
    val name: String? = null,
    val description: String? = null,
    val durationMinutes: Int? = null,
) {
    /** @throws ApiException `validation_failed` со всеми нарушенными полями. */
    fun validate(): MeetingType {
        val errors = mutableListOf<FieldError>()
        if (id == null || id.length !in 2..40 || !ID_PATTERN.matches(id)) {
            errors += FieldError("id", "2–40 символов: строчные латинские буквы и цифры, слова через дефис")
        }
        if (name == null || name.length !in 1..100) {
            errors += FieldError("name", "Название обязательно, до 100 символов")
        }
        if (description != null && description.length > 500) {
            errors += FieldError("description", "Описание — до 500 символов")
        }
        if (durationMinutes == null || durationMinutes !in 15..240 || durationMinutes % 15 != 0) {
            errors += FieldError("durationMinutes", "Длительность — от 15 до 240 минут, кратно 15")
        }
        if (errors.isNotEmpty()) throw ApiException.validationFailed(errors)
        return MeetingType(id!!, name!!, description, durationMinutes!!)
    }
}
