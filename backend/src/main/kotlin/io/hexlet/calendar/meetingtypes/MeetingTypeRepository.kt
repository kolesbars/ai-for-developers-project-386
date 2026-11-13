package io.hexlet.calendar.meetingtypes

import io.hexlet.calendar.db.UNIQUE_VIOLATION
import io.hexlet.calendar.db.query
import java.sql.ResultSet
import java.sql.SQLException
import java.sql.Timestamp
import java.time.Instant
import javax.sql.DataSource

/** Хранилище Типов встреч (таблица `meeting_types`). Каталог — в порядке создания. */
class MeetingTypeRepository(
    private val dataSource: DataSource,
) {
    suspend fun list(): List<MeetingType> =
        dataSource.query { connection ->
            connection.prepareStatement("$SELECT ORDER BY created_at, id").use { statement ->
                statement.executeQuery().use { rows -> generateSequence { if (rows.next()) rows.toMeetingType() else null }.toList() }
            }
        }

    suspend fun find(id: String): MeetingType? =
        dataSource.query { connection ->
            connection.prepareStatement("$SELECT WHERE id = ?").use { statement ->
                statement.setString(1, id)
                statement.executeQuery().use { rows -> if (rows.next()) rows.toMeetingType() else null }
            }
        }

    /** @return `false`, если Тип встречи с таким id уже есть. */
    suspend fun insert(
        meetingType: MeetingType,
        createdAt: Instant,
    ): Boolean =
        dataSource.query { connection ->
            try {
                connection
                    .prepareStatement(
                        "INSERT INTO meeting_types (id, name, description, duration_minutes, created_at) VALUES (?, ?, ?, ?, ?)",
                    ).use { statement ->
                        statement.setString(1, meetingType.id)
                        statement.setString(2, meetingType.name)
                        statement.setString(3, meetingType.description)
                        statement.setInt(4, meetingType.durationMinutes)
                        statement.setTimestamp(5, Timestamp.from(createdAt))
                        statement.executeUpdate()
                    }
                true
            } catch (e: SQLException) {
                if (e.sqlState == UNIQUE_VIOLATION) false else throw e
            }
        }

    private fun ResultSet.toMeetingType() =
        MeetingType(
            id = getString("id"),
            name = getString("name"),
            description = getString("description"),
            durationMinutes = getInt("duration_minutes"),
        )

    private companion object {
        const val SELECT = "SELECT id, name, description, duration_minutes FROM meeting_types"
    }
}
