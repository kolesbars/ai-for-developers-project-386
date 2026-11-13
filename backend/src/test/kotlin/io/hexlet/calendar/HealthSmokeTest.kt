package io.hexlet.calendar

import io.hexlet.calendar.support.apiTest
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HealthSmokeTest {
    @Test
    fun `приложение поднимается и отвечает на health`() =
        apiTest {
            val response = client.get("/api/health")

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.contentType()!!.match(ContentType.Application.Json))
            assertEquals("""{"status":"ok"}""", response.bodyAsText())
        }
}
