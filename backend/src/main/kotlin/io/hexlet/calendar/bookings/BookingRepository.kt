package io.hexlet.calendar.bookings

import io.hexlet.calendar.db.EXCLUSION_VIOLATION
import io.hexlet.calendar.db.query
import io.hexlet.calendar.routes.ApiException
import java.sql.ResultSet
import java.sql.SQLException
import java.sql.Timestamp
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
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

    /**
     * Непересечение гарантирует БД (exclusion constraint `bookings_no_overlap`), в том числе при
     * одновременных запросах.
     * @throws ApiException `slot_taken`, если интервал пересекается с любым Бронированием.
     */
    suspend fun insert(
        draft: BookingDraft,
        endAt: Instant,
        meetingTypeName: String,
        now: Instant,
    ): Booking {
        val id = UUID.randomUUID()
        // PostgreSQL хранит микросекунды — ответ POST совпадает с последующим GET.
        val createdAt = now.truncatedTo(ChronoUnit.MICROS)
        dataSource.query { connection ->
            connection
                .prepareStatement(
                    """
                    INSERT INTO bookings (id, meeting_type_id, start_at, end_at, guest_name, guest_email, comment, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """.trimIndent(),
                ).use { statement ->
                    statement.setObject(1, id)
                    statement.setString(2, draft.meetingTypeId)
                    statement.setTimestamp(3, Timestamp.from(draft.startAt))
                    statement.setTimestamp(4, Timestamp.from(endAt))
                    statement.setString(5, draft.guestName)
                    statement.setString(6, draft.guestEmail)
                    statement.setString(7, draft.comment)
                    statement.setTimestamp(8, Timestamp.from(createdAt))
                    try {
                        statement.executeUpdate()
                    } catch (e: SQLException) {
                        if (e.sqlState == EXCLUSION_VIOLATION) throw ApiException.slotTaken() else throw e
                    }
                }
        }
        return Booking(
            id = id.toString(),
            meetingTypeId = draft.meetingTypeId,
            meetingTypeName = meetingTypeName,
            startAt = draft.startAt.toString(),
            endAt = endAt.toString(),
            guestName = draft.guestName,
            guestEmail = draft.guestEmail,
            comment = draft.comment,
            createdAt = createdAt.toString(),
        )
    }

    /** Бронирование с `meetingTypeName` на момент чтения; `null`, если нет (в том числе для id не в формате UUID). */
    suspend fun find(id: String): Booking? {
        val uuid = runCatching { UUID.fromString(id) }.getOrNull() ?: return null
        return dataSource.query { connection ->
            connection.prepareStatement("$SELECT WHERE b.id = ?").use { statement ->
                statement.setObject(1, uuid)
                statement.executeQuery().use { rows -> if (rows.next()) rows.toBooking() else null }
            }
        }
    }

    /** Предстоящие встречи всех Типов: ещё не закончившиеся (`endAt > now`), по возрастанию `startAt`. */
    suspend fun upcoming(now: Instant): List<Booking> =
        dataSource.query { connection ->
            connection.prepareStatement("$SELECT WHERE b.end_at > ? ORDER BY b.start_at").use { statement ->
                statement.setTimestamp(1, Timestamp.from(now))
                statement.executeQuery().use { rows -> generateSequence { if (rows.next()) rows.toBooking() else null }.toList() }
            }
        }

    private fun ResultSet.toBooking() =
        Booking(
            id = getString("id"),
            meetingTypeId = getString("meeting_type_id"),
            meetingTypeName = getString("meeting_type_name"),
            startAt = getTimestamp("start_at").toInstant().toString(),
            endAt = getTimestamp("end_at").toInstant().toString(),
            guestName = getString("guest_name"),
            guestEmail = getString("guest_email"),
            comment = getString("comment"),
            createdAt = getTimestamp("created_at").toInstant().toString(),
        )
}

private const val SELECT =
    "SELECT b.id, b.meeting_type_id, m.name AS meeting_type_name, b.start_at, b.end_at, b.guest_name, b.guest_email, " +
        "b.comment, b.created_at FROM bookings b JOIN meeting_types m ON m.id = b.meeting_type_id"
