package io.hexlet.calendar.bookings

import io.hexlet.calendar.db.query
import java.sql.Timestamp
import java.time.Instant
import javax.sql.DataSource

/** Интервал `[start, end)` занятого времени. */
data class BusyInterval(
    val start: Instant,
    val end: Instant,
) {
    fun overlaps(
        otherStart: Instant,
        otherEnd: Instant,
    ): Boolean = start < otherEnd && otherStart < end
}

/** Хранилище Бронирований (таблица `bookings`). */
class BookingRepository(
    private val dataSource: DataSource,
) {
    /** Занятые интервалы всех Типов встреч, пересекающиеся с `[from, to)`. */
    suspend fun busyIntervals(
        from: Instant,
        to: Instant,
    ): List<BusyInterval> =
        dataSource.query { connection ->
            connection
                .prepareStatement("SELECT start_at, end_at FROM bookings WHERE start_at < ? AND end_at > ? ORDER BY start_at")
                .use { statement ->
                    statement.setTimestamp(1, Timestamp.from(to))
                    statement.setTimestamp(2, Timestamp.from(from))
                    statement.executeQuery().use { rows ->
                        generateSequence {
                            if (rows.next()) {
                                BusyInterval(rows.getTimestamp("start_at").toInstant(), rows.getTimestamp("end_at").toInstant())
                            } else {
                                null
                            }
                        }.toList()
                    }
                }
        }
}
