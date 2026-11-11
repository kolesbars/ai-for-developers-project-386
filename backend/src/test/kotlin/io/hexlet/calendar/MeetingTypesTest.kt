package io.hexlet.calendar

import io.hexlet.calendar.support.apiTest
import io.hexlet.calendar.support.getJson
import io.hexlet.calendar.support.json
import io.hexlet.calendar.support.postJson
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class MeetingTypesTest {
    private val consultation =
        """
        {"id":"consultation","name":"Консультация","description":"Разбор вопроса","durationMinutes":60}
        """.trimIndent()

    @Test
    fun `созданный Тип встречи возвращается и попадает в каталог`() =
        apiTest {
            val created = client.postJson("/api/meeting-types", consultation)

            assertEquals(HttpStatusCode.Created, created.status)
            assertEquals(Json.parseToJsonElement(consultation), created.json())

            val list = client.getJson("/api/meeting-types")
            assertEquals(HttpStatusCode.OK, list.status)
            assertEquals(Json.parseToJsonElement("[$consultation]"), list.json())
        }

    @Test
    fun `повторный id отклоняется с meeting_type_exists`() =
        apiTest {
            client.postJson("/api/meeting-types", consultation)

            val again = client.postJson("/api/meeting-types", """{"id":"consultation","name":"Другое","durationMinutes":30}""")

            assertEquals(HttpStatusCode.Conflict, again.status)
            assertEquals(
                "meeting_type_exists",
                again
                    .json()
                    .jsonObject["code"]
                    ?.jsonPrimitive
                    ?.content,
            )
            assertEquals(
                1,
                client
                    .getJson("/api/meeting-types")
                    .json()
                    .jsonArray.size,
            )
        }

    @Test
    fun `Тип встречи читается по id`() =
        apiTest {
            client.postJson("/api/meeting-types", consultation)

            val found = client.getJson("/api/meeting-types/consultation")

            assertEquals(HttpStatusCode.OK, found.status)
            assertEquals(Json.parseToJsonElement(consultation), found.json())
        }

    @Test
    fun `неизвестный id — 404 meeting_type_not_found`() =
        apiTest {
            val missing = client.getJson("/api/meeting-types/nope")

            assertEquals(HttpStatusCode.NotFound, missing.status)
            assertEquals(
                "meeting_type_not_found",
                missing
                    .json()
                    .jsonObject["code"]
                    ?.jsonPrimitive
                    ?.content,
            )
        }

    @Test
    fun `каждое правило поля даёт 400 validation_failed с ошибкой этого поля`() =
        apiTest {
            // поле, которое должно быть в fieldErrors → тело запроса
            val cases =
                listOf(
                    "id" to """{"name":"Звонок","durationMinutes":30}""",
                    "id" to """{"id":"a","name":"Звонок","durationMinutes":30}""",
                    "id" to """{"id":"${"a".repeat(41)}","name":"Звонок","durationMinutes":30}""",
                    "id" to """{"id":"Bad_Id","name":"Звонок","durationMinutes":30}""",
                    "id" to """{"id":"-call","name":"Звонок","durationMinutes":30}""",
                    "id" to """{"id":"call--me","name":"Звонок","durationMinutes":30}""",
                    "name" to """{"id":"call","durationMinutes":30}""",
                    "name" to """{"id":"call","name":"","durationMinutes":30}""",
                    "name" to """{"id":"call","name":"   ","durationMinutes":30}""",
                    "name" to """{"id":"call","name":"${"я".repeat(101)}","durationMinutes":30}""",
                    "description" to """{"id":"call","name":"Звонок","description":"${"я".repeat(501)}","durationMinutes":30}""",
                    "durationMinutes" to """{"id":"call","name":"Звонок"}""",
                    "durationMinutes" to """{"id":"call","name":"Звонок","durationMinutes":0}""",
                    "durationMinutes" to """{"id":"call","name":"Звонок","durationMinutes":255}""",
                    "durationMinutes" to """{"id":"call","name":"Звонок","durationMinutes":20}""",
                )

            for ((field, body) in cases) {
                val response = client.postJson("/api/meeting-types", body)
                val error = response.json().jsonObject

                assertEquals(HttpStatusCode.BadRequest, response.status, body)
                assertEquals("validation_failed", error["code"]?.jsonPrimitive?.content, body)
                val fields = error["fieldErrors"]!!.jsonArray.map { it.jsonObject["field"]?.jsonPrimitive?.content }
                assertEquals(listOf(field), fields, body)
            }
            assertEquals("[]", client.getJson("/api/meeting-types").json().toString())
        }

    @Test
    fun `тело не той формы — 400 validation_failed`() =
        apiTest {
            for (body in listOf("""{"id":"call","name":"Звонок","durationMinutes":"полчаса"}""", "не json")) {
                val response = client.postJson("/api/meeting-types", body)

                assertEquals(HttpStatusCode.BadRequest, response.status, body)
                assertEquals(
                    "validation_failed",
                    response
                        .json()
                        .jsonObject["code"]
                        ?.jsonPrimitive
                        ?.content,
                    body,
                )
            }
        }

    @Test
    fun `граничные значения полей принимаются`() =
        apiTest {
            val bodies =
                listOf(
                    """{"id":"ab","name":"Я","durationMinutes":15}""",
                    """{"id":"${"a".repeat(40)}","name":"${"я".repeat(100)}","description":"${"я".repeat(500)}","durationMinutes":240}""",
                    """{"id":"intro-call-2","name":"Знакомство","description":"","durationMinutes":45}""",
                )

            for (body in bodies) {
                assertEquals(HttpStatusCode.Created, client.postJson("/api/meeting-types", body).status, body)
            }
        }
}
