package io.hexlet.calendar.routes

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import kotlinx.serialization.Serializable

/** Соответствует схемам ошибок контракта: `{code, message, fieldErrors?}`. */
@Serializable
data class ApiError(
    val code: String,
    val message: String,
    val fieldErrors: List<FieldError>? = null,
)

/** Соответствует схеме `FieldError`. */
@Serializable
data class FieldError(
    val field: String,
    val message: String,
)

/**
 * Бросается из роутов; StatusPages превращает в ответ с [status] и телом [ApiError].
 * Новые коды ошибок — фабрики в companion рядом с существующими.
 */
class ApiException(
    val status: HttpStatusCode,
    val error: ApiError,
) : RuntimeException(error.message) {
    companion object {
        fun validationFailed(fieldErrors: List<FieldError>) =
            ApiException(HttpStatusCode.BadRequest, ApiError("validation_failed", "Проверьте поля формы", fieldErrors))

        fun meetingTypeExists() = ApiException(HttpStatusCode.Conflict, ApiError("meeting_type_exists", "Тип встречи с таким id уже есть"))

        fun slotTaken() = ApiException(HttpStatusCode.Conflict, ApiError("slot_taken", "Это время только что заняли. Выберите другое."))

        fun slotUnavailable() =
            ApiException(HttpStatusCode.UnprocessableEntity, ApiError("slot_unavailable", "Это время больше недоступно."))

        fun bookingNotFound() = ApiException(HttpStatusCode.NotFound, ApiError("booking_not_found", "Бронирование не найдено"))

        fun meetingTypeNotFound() = ApiException(HttpStatusCode.NotFound, ApiError("meeting_type_not_found", "Тип встречи не найден"))
    }
}

fun Application.installErrorHandling() {
    install(StatusPages) {
        exception<ApiException> { call, e -> call.respond(e.status, e.error) }
        // Тело не разобралось как JSON нужной формы (не тот тип поля, битый JSON).
        exception<BadRequestException> { call, _ ->
            val e = ApiException.validationFailed(emptyList())
            call.respond(e.status, e.error)
        }
    }
}
