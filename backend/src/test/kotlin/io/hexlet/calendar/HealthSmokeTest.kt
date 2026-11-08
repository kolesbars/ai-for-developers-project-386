package io.hexlet.calendar

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HealthSmokeTest {
    @Test
    fun `приложение поднимается и отвечает на health`() =
        testApplication {
            application { module() }

            val response = client.get("/api/health")

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.contentType()!!.match(ContentType.Application.Json))
            assertEquals("""{"status":"ok"}""", response.bodyAsText())
        }
}
