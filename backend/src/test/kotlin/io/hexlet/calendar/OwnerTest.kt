package io.hexlet.calendar

import io.hexlet.calendar.owner.Owner
import io.hexlet.calendar.support.apiTest
import io.hexlet.calendar.support.getJson
import io.hexlet.calendar.support.json
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OwnerTest {
    @Test
    fun `отдаёт профиль Владельца из конфигурации`() =
        apiTest(owner = Owner(name = "Анна Смирнова", bio = "Консультации по Kotlin", timeZone = "Asia/Almaty")) {
            val response = client.getJson("/api/owner")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(
                Json.parseToJsonElement(
                    """{"name":"Анна Смирнова","bio":"Консультации по Kotlin","timeZone":"Asia/Almaty"}""",
                ),
                response.json(),
            )
        }

    @Test
    fun `без переменных окружения — профиль по умолчанию с поясом Алматы`() {
        val owner = Owner.fromEnvironment { null }

        assertEquals("Asia/Almaty", owner.timeZone)
        assertTrue(owner.name.isNotBlank())
    }

    @Test
    fun `переменные окружения задают профиль`() {
        val env = mapOf("OWNER_NAME" to "Иван", "OWNER_BIO" to "О себе", "OWNER_TIME_ZONE" to "Europe/Moscow")

        assertEquals(Owner("Иван", "О себе", "Europe/Moscow"), Owner.fromEnvironment(env::get))
    }

    @Test
    fun `пустые переменные окружения не затирают значения по умолчанию`() {
        val env = mapOf("OWNER_NAME" to "  ", "OWNER_TIME_ZONE" to "")

        val owner = Owner.fromEnvironment(env::get)

        assertTrue(owner.name.isNotBlank())
        assertEquals("Asia/Almaty", owner.timeZone)
    }
}
