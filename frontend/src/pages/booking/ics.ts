import type { components } from '../../api/client'

type Booking = components['schemas']['Booking']

/** `2026-11-16T07:00:00Z` → `20261116T070000Z` (iCalendar, UTC). */
const icsTime = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Экранирование TEXT по RFC 5545: `\`, `;`, `,` и переводы строк. */
const icsText = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')

/** Ссылка «Добавить в календарь»: data-URL с одним событием Бронирования. */
export function icsHref(booking: Booking) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar Booking//RU',
    'BEGIN:VEVENT',
    `UID:${booking.id}`,
    `DTSTAMP:${icsTime(booking.createdAt)}`,
    `DTSTART:${icsTime(booking.startAt)}`,
    `DTEND:${icsTime(booking.endAt)}`,
    `SUMMARY:${icsText(booking.meetingTypeName)}`,
    ...(booking.comment ? [`DESCRIPTION:${icsText(booking.comment)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}
