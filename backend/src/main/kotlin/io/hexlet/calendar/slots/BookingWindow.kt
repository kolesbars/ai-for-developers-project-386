package io.hexlet.calendar.slots

import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

/** Часовой пояс Владельца по умолчанию (спецификация §3). */
val OWNER_TIME_ZONE: ZoneId = ZoneId.of("Asia/Almaty")

private const val WINDOW_DAYS = 14L
private val WORK_START: LocalTime = LocalTime.of(9, 0)
private val WORK_END: LocalTime = LocalTime.of(18, 0)
private val STEP: Duration = Duration.ofMinutes(30)
private val WEEKEND = setOf(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY)

/**
 * Сетка стартов Окна записи (спецификация §3): дни D…D+13 по поясу Владельца, пн–пт,
 * старты с шагом 30 минут от 09:00 до 18:00 − длительность, только позже [now].
 * Единственный источник правил расписания: и для списка Слотов, и для проверки `startAt` Бронирования.
 */
class BookingWindow(
    private val zone: ZoneId = OWNER_TIME_ZONE,
) {
    fun starts(
        now: Instant,
        duration: Duration,
    ): List<Instant> {
        val today = now.atZone(zone).toLocalDate()
        val lastStart = WORK_END.minus(duration)
        return (0 until WINDOW_DAYS)
            .map { today.plusDays(it) }
            .filter { it.dayOfWeek !in WEEKEND }
            .flatMap { day ->
                generateSequence(WORK_START) { it.plus(STEP) }
                    .takeWhile { !it.isAfter(lastStart) }
                    .map { day.atTime(it).atZone(zone).toInstant() }
            }.filter { it.isAfter(now) }
    }

    /** `true`, если [start] — старт из сетки текущего Окна записи (иначе `422 slot_unavailable`). */
    fun isStart(
        start: Instant,
        now: Instant,
        duration: Duration,
    ): Boolean = start in starts(now, duration)
}
