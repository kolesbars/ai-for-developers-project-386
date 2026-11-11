package io.hexlet.calendar.db

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.sql.Connection
import javax.sql.DataSource

/** SQLSTATE PostgreSQL: нарушение уникальности. */
const val UNIQUE_VIOLATION = "23505"

/** SQLSTATE PostgreSQL: нарушение exclusion constraint (пересечение интервалов `bookings_no_overlap`). */
const val EXCLUSION_VIOLATION = "23P01"

/** Выполняет блокирующий JDBC-код на пуле IO с соединением из пула (autocommit). */
suspend fun <T> DataSource.query(block: (Connection) -> T): T = withContext(Dispatchers.IO) { connection.use(block) }
