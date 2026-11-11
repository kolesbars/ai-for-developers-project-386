package io.hexlet.calendar

import io.hexlet.calendar.support.TestDatabase
import io.hexlet.calendar.support.fixedClock
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** В контейнере Ktor отдаёт собранный frontend (`STATIC_DIR`) с SPA-fallback на `index.html`. */
class StaticFrontendTest {
    private val indexHtml = "<!doctype html><title>Календарь</title>"

    private fun withStatic(block: suspend ApplicationTestBuilder.() -> Unit) {
        val dir = Files.createTempDirectory("static").toFile()
        File(dir, "index.html").writeText(indexHtml)
        File(dir, "assets").mkdir()
        File(dir, "assets/app.js").writeText("console.log('app')")
        testApplication {
            TestDatabase.reset()
            application { module(dataSource = TestDatabase.dataSource, clock = fixedClock(), staticDir = dir) }
            block()
        }
    }

    @Test
    fun `корень отдаёт index html`() =
        withStatic {
            val response = client.get("/")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(indexHtml, response.bodyAsText())
        }

    @Test
    fun `файлы сборки отдаются как есть`() =
        withStatic {
            val response = client.get("/assets/app.js")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("console.log('app')", response.bodyAsText())
        }

    @Test
    fun `клиентский маршрут получает index html`() =
        withStatic {
            val response = client.get("/book/intro-call")

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.contentType()!!.match(ContentType.Text.Html))
            assertEquals(indexHtml, response.bodyAsText())
        }

    @Test
    fun `API по-прежнему отвечает JSON`() =
        withStatic {
            val response = client.get("/api/health")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("""{"status":"ok"}""", response.bodyAsText())
        }

    @Test
    fun `неизвестный путь API — 404, а не index html`() =
        withStatic {
            val response = client.get("/api/no-such-thing")

            assertEquals(HttpStatusCode.NotFound, response.status)
            assertTrue(!response.bodyAsText().contains("<title>"))
        }
}
