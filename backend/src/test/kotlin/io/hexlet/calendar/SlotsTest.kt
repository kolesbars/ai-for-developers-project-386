package io.hexlet.calendar

import io.hexlet.calendar.support.apiTest
import io.hexlet.calendar.support.fixedClock
import io.hexlet.calendar.support.getJson
import io.hexlet.calendar.support.insertBooking
import io.hexlet.calendar.support.json
import io.hexlet.calendar.support.postJson
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.ApplicationTestBuilder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Даты в комментариях — по Алматы (UTC+5); «сейчас» по умолчанию — чт 12.11.2026 08:00. */
class SlotsTest {
    private suspend fun ApplicationTestBuilder.slotsOf(
        id: String,
        durationMinutes: Int,
    ): List<JsonObject> {
        client.postJson("/api/meeting-types", """{"id":"$id","name":"$id","durationMinutes":$durationMinutes}""")
        val response = client.getJson("/api/meeting-types/$id/slots")
        assertEquals(HttpStatusCode.OK, response.status)
        return response.json().jsonArray.map { it.jsonObject }
    }

    private fun JsonObject.startAt() = getValue("startAt").jsonPrimitive.content

    private fun slot(
        startAt: String,
        endAt: String,
        status: String = "available",
    ) = Json.parseToJsonElement("""{"startAt":"$startAt","endAt":"$endAt","status":"$status"}""")

    @Test
    fun `окно начинается сегодня в 09-00, слот длиной в Тип встречи`() =
        apiTest {
            val slots = slotsOf("hour", 60)

            assertEquals(slot("2026-11-12T04:00:00Z", "2026-11-12T05:00:00Z"), slots.first())
            assertEquals(slot("2026-11-12T04:30:00Z", "2026-11-12T05:30:00Z"), slots[1])
        }

    @Test
    fun `в выходные слотов нет — после пятницы сразу понедельник`() =
        apiTest {
            val starts = slotsOf("hour", 60).map { it.startAt() }

            // пт 13.11 17:00 → пн 16.11 09:00
            val fridayLast = starts.indexOf("2026-11-13T12:00:00Z")
            assertEquals("2026-11-16T04:00:00Z", starts[fridayLast + 1])
            assertTrue(starts.none { it.startsWith("2026-11-14") || it.startsWith("2026-11-15") })
        }

    @Test
    fun `окно — 14 календарных дней с сегодняшнего`() =
        apiTest {
            val starts = slotsOf("hour", 60).map { it.startAt() }

            // чт 12.11 … ср 25.11: 10 рабочих дней по 17 стартов (09:00…17:00)
            assertEquals(170, starts.size)
            assertEquals("2026-11-25T12:00:00Z", starts.last())
        }

    @Test
    fun `окно сдвигается с текущей датой`() =
        apiTest(clock = fixedClock(Instant.parse("2026-11-26T03:00:00Z"))) {
            val starts = slotsOf("hour", 60).map { it.startAt() }

            // чт 26.11 … ср 09.12
            assertEquals("2026-11-26T04:00:00Z", starts.first())
            assertEquals("2026-12-09T12:00:00Z", starts.last())
        }

    @Test
    fun `последний старт дня — 18-00 минус длительность`() =
        apiTest {
            val lastToday = { slots: List<JsonObject> -> slots.map { it.startAt() }.last { it.startsWith("2026-11-12") } }

            assertEquals("2026-11-12T12:30:00Z", lastToday(slotsOf("short", 15))) // 17:30
            assertEquals("2026-11-12T12:00:00Z", lastToday(slotsOf("hour", 60))) // 17:00
            assertEquals("2026-11-12T09:00:00Z", lastToday(slotsOf("long", 240))) // 14:00–18:00
        }

    @Test
    fun `старты 15-минутного Типа — только в 00 и 30`() =
        apiTest {
            val today = slotsOf("short", 15).map { it.startAt() }.filter { it.startsWith("2026-11-12") }

            assertEquals(18, today.size) // 09:00, 09:30 … 17:30
            assertTrue(today.all { it.substring(14, 16) in setOf("00", "30") })
        }

    @Test
    fun `сегодня — только старты позже текущего момента`() =
        apiTest(clock = fixedClock(Instant.parse("2026-11-12T05:10:00Z"))) {
            // 10:10 → первый старт 10:30
            assertEquals("2026-11-12T05:30:00Z", slotsOf("hour", 60).first().startAt())
        }

    @Test
    fun `старт ровно в текущий момент уже не возвращается`() =
        apiTest(clock = fixedClock(Instant.parse("2026-11-12T05:00:00Z"))) {
            // 10:00 → первый старт 10:30
            assertEquals("2026-11-12T05:30:00Z", slotsOf("hour", 60).first().startAt())
        }

    @Test
    fun `после конца рабочего дня окно начинается завтра`() =
        apiTest(clock = fixedClock(Instant.parse("2026-11-12T12:30:00Z"))) {
            // 17:30, 60-минутный Тип: сегодня стартов нет
            assertEquals("2026-11-13T04:00:00Z", slotsOf("hour", 60).first().startAt())
        }

    @Test
    fun `слот занят, если пересекается с Бронированием любого Типа встречи`() =
        apiTest {
            client.postJson("/api/meeting-types", """{"id":"other","name":"Другой","durationMinutes":60}""")
            // Бронирование 10:00–11:00 другого Типа встречи
            insertBooking("other", Instant.parse("2026-11-12T05:00:00Z"), Instant.parse("2026-11-12T06:00:00Z"))

            val hour = slotsOf("hour", 60).associate { it.startAt() to it.getValue("status").jsonPrimitive.content }
            assertEquals("available", hour["2026-11-12T04:00:00Z"]) // 09:00–10:00 — встык
            assertEquals("busy", hour["2026-11-12T04:30:00Z"]) // 09:30–10:30
            assertEquals("busy", hour["2026-11-12T05:00:00Z"]) // 10:00–11:00
            assertEquals("busy", hour["2026-11-12T05:30:00Z"]) // 10:30–11:30
            assertEquals("available", hour["2026-11-12T06:00:00Z"]) // 11:00–12:00 — встык

            val half = slotsOf("half", 30).associate { it.startAt() to it.getValue("status").jsonPrimitive.content }
            assertEquals("available", half["2026-11-12T04:30:00Z"]) // 09:30–10:00
            assertEquals("busy", half["2026-11-12T05:30:00Z"]) // 10:30–11:00
            assertEquals("available", half["2026-11-12T06:00:00Z"]) // 11:00–11:30
            assertEquals("available", half["2026-11-13T05:00:00Z"]) // завтра 10:00
        }

    @Test
    fun `слоты несуществующего Типа встречи — 404 meeting_type_not_found`() =
        apiTest {
            val response = client.getJson("/api/meeting-types/missing/slots")

            assertEquals(HttpStatusCode.NotFound, response.status)
            assertEquals(
                "meeting_type_not_found",
                response
                    .json()
                    .jsonObject["code"]
                    ?.jsonPrimitive
                    ?.content,
            )
        }
}
