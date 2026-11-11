package io.hexlet.calendar

import io.hexlet.calendar.support.apiTest
import io.hexlet.calendar.support.fixedClock
import io.hexlet.calendar.support.getJson
import io.hexlet.calendar.support.json
import io.hexlet.calendar.support.postJson
import io.ktor.client.statement.HttpResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.ApplicationTestBuilder
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

/** Даты в комментариях — по Алматы (UTC+5); «сейчас» по умолчанию — чт 12.11.2026 08:00. */
class BookingsTest {
    private suspend fun ApplicationTestBuilder.meetingType(
        id: String,
        name: String,
        durationMinutes: Int,
    ) {
        val response = client.postJson("/api/meeting-types", """{"id":"$id","name":"$name","durationMinutes":$durationMinutes}""")
        assertEquals(HttpStatusCode.Created, response.status)
    }

    private suspend fun ApplicationTestBuilder.book(
        meetingTypeId: String,
        startAt: String,
    ) = client.postJson(
        "/api/bookings",
        """{"meetingTypeId":"$meetingTypeId","startAt":"$startAt","guestName":"Мария","guestEmail":"maria@example.com"}""",
    )

    private suspend fun HttpResponse.code() = json().jsonObject.str("code")

    private fun JsonObject.str(key: String) = getValue(key).jsonPrimitive.content

    @Test
    fun `из N одновременных запросов на пересекающееся время успешен ровно один`() =
        apiTest {
            meetingType("hour", "Час", 60)
            meetingType("half", "Полчаса", 30)
            // 10:00–11:00 и 10:30–11:00 разных Типов — все пересекаются со всеми
            val requests = List(20) { if (it % 2 == 0) "hour" to "2026-11-12T05:00:00Z" else "half" to "2026-11-12T05:30:00Z" }

            val statuses = coroutineScope { requests.map { (type, start) -> async { book(type, start).status } }.awaitAll() }

            assertEquals(1, statuses.count { it == HttpStatusCode.Created })
            assertEquals(requests.size - 1, statuses.count { it == HttpStatusCode.Conflict })
        }

    @Test
    fun `старт не из сетки текущего Окна записи — 422 slot_unavailable`() =
        apiTest(clock = fixedClock(Instant.parse("2026-11-12T05:00:00Z"))) {
            // «сейчас» — чт 12.11 10:00
            meetingType("hour", "Час", 60)
            val unavailable =
                mapOf(
                    "2026-11-12T04:30:00Z" to "в прошлом (09:30)",
                    "2026-11-12T05:00:00Z" to "ровно сейчас (10:00)",
                    "2026-11-12T05:15:00Z" to "не на сетке :00/:30",
                    "2026-11-12T12:30:00Z" to "не помещается в Рабочие часы (17:30–18:30)",
                    "2026-11-13T03:30:00Z" to "до начала Рабочих часов (08:30)",
                    "2026-11-14T05:00:00Z" to "суббота",
                    "2026-11-26T05:00:00Z" to "за пределами 14 дней (чт 26.11)",
                )

            for ((startAt, case) in unavailable) {
                val response = book("hour", startAt)
                assertEquals(HttpStatusCode.UnprocessableEntity, response.status, case)
                assertEquals("slot_unavailable", response.code(), case)
            }
            assertEquals(HttpStatusCode.Created, book("hour", "2026-11-25T12:00:00Z").status) // последний старт Окна
        }

    @Test
    fun `бронирование несуществующего Типа встречи — 404 meeting_type_not_found`() =
        apiTest {
            val response = book("missing", "2026-11-12T05:00:00Z")

            assertEquals(HttpStatusCode.NotFound, response.status)
            assertEquals("meeting_type_not_found", response.code())
        }

    @Test
    fun `GET по id возвращает то же Бронирование, что и POST`() =
        apiTest {
            meetingType("hour", "Час", 60)
            val created = book("hour", "2026-11-12T05:00:00Z").json().jsonObject

            val response = client.getJson("/api/bookings/${created.str("id")}")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(created, response.json())
        }

    @Test
    fun `GET неизвестного Бронирования — 404 booking_not_found`() =
        apiTest {
            for (id in listOf("6f1c2d4e-0b7a-4a51-9a63-2f0d8f6c1e10", "not-a-uuid")) {
                val response = client.getJson("/api/bookings/$id")
                assertEquals(HttpStatusCode.NotFound, response.status, id)
                assertEquals("booking_not_found", response.code(), id)
            }
        }

    private suspend fun HttpResponse.invalidFields(): List<String> {
        assertEquals(HttpStatusCode.BadRequest, status)
        val body = json().jsonObject
        assertEquals("validation_failed", body.str("code"))
        return body.getValue("fieldErrors").jsonArray.map { it.jsonObject.str("field") }
    }

    @Test
    fun `пустой запрос — 400 со всеми обязательными полями`() =
        apiTest {
            val fields = client.postJson("/api/bookings", "{}").invalidFields()

            assertEquals(listOf("meetingTypeId", "startAt", "guestName", "guestEmail"), fields)
        }

    @Test
    fun `каждое неверное поле — 400 validation_failed с этим полем`() =
        apiTest {
            meetingType("hour", "Час", 60)
            val valid =
                mapOf(
                    "meetingTypeId" to "\"hour\"",
                    "startAt" to "\"2026-11-12T05:00:00Z\"",
                    "guestName" to "\"Мария\"",
                    "guestEmail" to "\"maria@example.com\"",
                )
            val invalid =
                listOf(
                    "startAt" to "\"завтра в 10\"",
                    "startAt" to "\"2026-11-12T10:00:00\"",
                    "guestName" to "\"\"",
                    "guestName" to "\"${"я".repeat(101)}\"",
                    "guestEmail" to "\"maria\"",
                    "guestEmail" to "\"maria@\"",
                    "guestEmail" to "\"ma ria@example.com\"",
                    "comment" to "\"${"я".repeat(501)}\"",
                )

            for ((field, value) in invalid) {
                val body = (valid + (field to value)).entries.joinToString(",", "{", "}") { (k, v) -> "\"$k\":$v" }
                assertEquals(listOf(field), client.postJson("/api/bookings", body).invalidFields(), "$field = $value")
            }
        }

    @Test
    fun `битый JSON — 400 validation_failed`() =
        apiTest {
            assertEquals(emptyList(), client.postJson("/api/bookings", """{"guestName":""").invalidFields())
        }

    /** Таблица примыкания из спецификации §3 при Бронировании 10:00–11:00. */
    @Test
    fun `пересечение с Бронированием 10-00–11-00 — 409 slot_taken, встык — 201`() =
        apiTest {
            meetingType("hour", "Час", 60)
            meetingType("other-hour", "Другой час", 60)
            meetingType("half", "Полчаса", 30)
            assertEquals(HttpStatusCode.Created, book("hour", "2026-11-12T05:00:00Z").status)

            val sameType = book("hour", "2026-11-12T05:00:00Z") // 10:00–11:00
            assertEquals(HttpStatusCode.Conflict, sameType.status)
            assertEquals("slot_taken", sameType.code())
            assertEquals(HttpStatusCode.Conflict, book("other-hour", "2026-11-12T05:00:00Z").status) // другой Тип
            assertEquals(HttpStatusCode.Conflict, book("half", "2026-11-12T05:30:00Z").status) // 10:30–11:00
            assertEquals(HttpStatusCode.Conflict, book("hour", "2026-11-12T04:30:00Z").status) // 09:30–10:30
            assertEquals(HttpStatusCode.Created, book("hour", "2026-11-12T06:00:00Z").status) // 11:00–12:00
            assertEquals(HttpStatusCode.Created, book("other-hour", "2026-11-12T04:00:00Z").status) // 09:00–10:00
        }

    @Test
    fun `бронирование свободного слота — 201, endAt и meetingTypeName считает сервер`() =
        apiTest {
            meetingType("consultation", "Консультация", 60)

            val response =
                client.postJson(
                    "/api/bookings",
                    """
                    {"meetingTypeId":"consultation","startAt":"2026-11-12T05:00:00Z",
                     "guestName":"Мария Смирнова","guestEmail":"maria@example.com","comment":"Про контракт API"}
                    """.trimIndent(),
                )

            assertEquals(HttpStatusCode.Created, response.status)
            val booking = response.json().jsonObject
            assertEquals("consultation", booking.str("meetingTypeId"))
            assertEquals("Консультация", booking.str("meetingTypeName"))
            assertEquals("2026-11-12T05:00:00Z", booking.str("startAt"))
            assertEquals("2026-11-12T06:00:00Z", booking.str("endAt"))
            assertEquals("Мария Смирнова", booking.str("guestName"))
            assertEquals("maria@example.com", booking.str("guestEmail"))
            assertEquals("Про контракт API", booking.str("comment"))
            assertEquals("2026-11-12T03:00:00Z", booking.str("createdAt"))
            assertEquals(36, booking.str("id").length)
        }
}
