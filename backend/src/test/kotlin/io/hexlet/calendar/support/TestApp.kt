package io.hexlet.calendar.support

import io.hexlet.calendar.db.Database
import io.hexlet.calendar.module
import io.hexlet.calendar.owner.Owner
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import javax.sql.DataSource

/**
 * Одна embedded PostgreSQL на весь прогон тестов (старт — пара секунд).
 * Перед каждым тестом таблицы очищаются, схема (миграции) остаётся.
 */
object TestDatabase {
    val dataSource: DataSource by lazy { Database.embedded() }

    fun reset() {
        dataSource.connection.use { connection ->
            connection.createStatement().use {
                it.execute(
                    """
                    DO ${'$'}${'$'}
                    DECLARE tables text;
                    BEGIN
                        SELECT string_agg(format('%I', tablename), ', ') INTO tables
                        FROM pg_tables
                        WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history';
                        IF tables IS NOT NULL THEN
                            EXECUTE 'TRUNCATE ' || tables || ' CASCADE';
                        END IF;
                    END ${'$'}${'$'};
                    """.trimIndent(),
                )
            }
        }
    }
}

/** «Сейчас» по умолчанию в тестах: четверг 12.11.2026, 08:00 по Алматы (UTC+5). */
val DEFAULT_NOW: Instant = Instant.parse("2026-11-12T03:00:00Z")

fun fixedClock(now: Instant = DEFAULT_NOW): Clock = Clock.fixed(now, ZoneOffset.UTC)

/**
 * Поднимает `Application.module()` на общей тестовой БД (очищенной) с зафиксированным временем.
 * Запросы и ответы — сырой JSON: тест видит ровно то, что уходит по сети.
 */
fun apiTest(
    clock: Clock = fixedClock(),
    owner: Owner = Owner.fromEnvironment { null },
    block: suspend ApplicationTestBuilder.() -> Unit,
) = testApplication {
    TestDatabase.reset()
    application { module(dataSource = TestDatabase.dataSource, clock = clock, owner = owner, staticDir = null) }
    block()
}

suspend fun HttpClient.postJson(
    path: String,
    json: String,
): HttpResponse =
    post(path) {
        contentType(ContentType.Application.Json)
        setBody(json)
    }

suspend fun HttpClient.getJson(path: String): HttpResponse = get(path)

suspend fun HttpResponse.json(): JsonElement = Json.parseToJsonElement(bodyAsText())
