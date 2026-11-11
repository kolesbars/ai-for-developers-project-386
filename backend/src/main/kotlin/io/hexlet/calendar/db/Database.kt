package io.hexlet.calendar.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres
import org.flywaydb.core.Flyway
import org.slf4j.LoggerFactory
import java.net.URI
import javax.sql.DataSource

/**
 * Источник соединений с PostgreSQL.
 *
 * `DATABASE_URL` задан — подключаемся к нему (`jdbc:postgresql://…` или `postgres://user:pass@host:port/db`).
 * Не задан — поднимаем embedded PostgreSQL (zonky) во временном каталоге: данные живут до остановки процесса.
 */
object Database {
    private val log = LoggerFactory.getLogger(Database::class.java)

    fun fromEnvironment(): DataSource {
        val url = System.getenv("DATABASE_URL")?.takeIf { it.isNotBlank() }
        return if (url == null) embedded() else external(url)
    }

    /** Запускает embedded PostgreSQL на свободном порту; останавливается вместе с JVM. */
    fun embedded(): DataSource {
        val postgres = EmbeddedPostgres.builder().start()
        Runtime.getRuntime().addShutdownHook(Thread { postgres.close() })
        log.info("DATABASE_URL не задан — embedded PostgreSQL на порту {}", postgres.port)
        return pool(postgres.getJdbcUrl("postgres", "postgres"), "postgres", "postgres")
    }

    private fun external(url: String): DataSource {
        if (url.startsWith("jdbc:")) return pool(url, null, null)
        val uri = URI(url)
        val (user, password) =
            uri.userInfo
                ?.split(":", limit = 2)
                .orEmpty()
                .let { it.getOrNull(0) to it.getOrNull(1) }
        val port = if (uri.port == -1) 5432 else uri.port
        return pool("jdbc:postgresql://${uri.host}:$port${uri.path}", user, password)
    }

    private fun pool(
        jdbcUrl: String,
        user: String?,
        password: String?,
    ): DataSource =
        HikariDataSource(
            HikariConfig().apply {
                this.jdbcUrl = jdbcUrl
                user?.let { username = it }
                password?.let { this.password = it }
                maximumPoolSize = 10
            },
        )

    /** Применяет миграции из `resources/db/migration`. */
    fun migrate(dataSource: DataSource) {
        Flyway
            .configure()
            .dataSource(dataSource)
            .load()
            .migrate()
    }
}
