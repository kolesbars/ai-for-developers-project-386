// PROTOTYPE — выбросить. Данные в памяти по правилам карты wayfinder:
// Asia/Almaty (UTC+5), окно 14 дней с сегодняшнего, пн–пт 09:00–18:00, старты :00/:30,
// прошедшие старты скрыты, занятые — status 'busy'.

export type Slot = { startAt: string; endAt: string; status: 'available' | 'busy' }
export type Booking = {
  id: string
  meetingTypeId: string
  startAt: string
  endAt: string
  guestName: string
  guestEmail: string
  comment?: string
}

const OWNER_OFFSET_MIN = 5 * 60
const MIN = 60_000
const DAY = 24 * 60 * MIN

export const owner = {
  name: 'Алёна Рожкова',
  bio: 'Помогаю командам договориться об API до того, как написан код.',
  timeZone: 'Asia/Almaty',
}

export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function almatyMidnight(now: Date): number {
  const shifted = new Date(now.getTime() + OWNER_OFFSET_MIN * MIN)
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - OWNER_OFFSET_MIN * MIN
}

// Чужие бронирования: детерминированно «засеваем» по 2–3 встречи в рабочий день.
export const bookings: Booking[] = (() => {
  const base = almatyMidnight(new Date())
  const out: Booking[] = []
  for (let d = 0; d < 14; d++) {
    const dayStart = base + d * DAY
    const wd = new Date(dayStart + OWNER_OFFSET_MIN * MIN).getUTCDay()
    if (wd === 0 || wd === 6) continue
    const picks = [[10 * 60, 60], [13 * 60 + 30, 15], [16 * 60, 15]].filter((_, i) => (d + i) % 3 !== 0)
    if (d === 3) picks.push([9 * 60, 9 * 60]) // целиком занятый день
    for (const [m, len] of picks) {
      const s = dayStart + (m + OWNER_OFFSET_MIN - OWNER_OFFSET_MIN) * MIN
      out.push({
        id: crypto.randomUUID(),
        meetingTypeId: len === 60 ? 'consultation' : 'intro',
        startAt: new Date(s).toISOString(),
        endAt: new Date(s + len * MIN).toISOString(),
        guestName: ['Иван Петров', 'Мария Смирнова', 'Олег Ким'][(d + m) % 3]!,
        guestEmail: ['ivan@example.com', 'maria@example.com', 'oleg@example.com'][(d + m) % 3]!,
        comment: m === 10 * 60 ? 'Хочу обсудить контракт API' : undefined,
      })
    }
  }
  return out
})()

export function buildSlots(durationMinutes: number, now = new Date()): Slot[] {
  const base = almatyMidnight(now)
  const slots: Slot[] = []
  for (let d = 0; d < 14; d++) {
    const dayStart = base + d * DAY
    const wd = new Date(dayStart + OWNER_OFFSET_MIN * MIN).getUTCDay()
    if (wd === 0 || wd === 6) continue
    for (let m = 9 * 60; m + durationMinutes <= 18 * 60; m += 30) {
      const s = dayStart + m * MIN
      if (s <= now.getTime()) continue
      const e = s + durationMinutes * MIN
      const busy = bookings.some((b) => Date.parse(b.startAt) < e && s < Date.parse(b.endAt))
      slots.push({ startAt: new Date(s).toISOString(), endAt: new Date(e).toISOString(), status: busy ? 'busy' : 'available' })
    }
  }
  return slots
}

/** Дни окна (по дате браузера) — включая выходные, чтобы их можно было показать недоступными. */
export function windowDays(now = new Date()): string[] {
  const base = almatyMidnight(now)
  const keys = new Set<string>()
  for (let d = 0; d < 14; d++) keys.add(localDayKey(new Date(base + d * DAY + 12 * 60 * MIN).toISOString()))
  return [...keys]
}

export const localDayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso))
export const fmtRange = (s: Slot | Booking) => `${fmtTime(s.startAt)}–${fmtTime(s.endAt)}`
export const fmtDayKey = (key: string) => dayFmt.format(new Date(`${key}T12:00:00`))
export const fmtDayKeyShort = (key: string) => shortDayFmt.format(new Date(`${key}T12:00:00`))
export const dayPart = (iso: string) => {
  const h = new Date(iso).getHours()
  return h < 12 ? 'Утро' : h < 15 ? 'День' : 'Вечер'
}

export type CreateResult =
  | { ok: true; booking: Booking }
  | { ok: false; code: 'slot_taken' | 'slot_unavailable'; message: string }

export function createBooking(
  input: Omit<Booking, 'id' | 'endAt'>,
  durationMinutes: number,
  simulateConflict: boolean,
): CreateResult {
  const s = Date.parse(input.startAt)
  const e = s + durationMinutes * MIN
  if (simulateConflict) {
    bookings.push({ ...input, id: crypto.randomUUID(), endAt: new Date(e).toISOString(), guestName: 'Быстрый Гость' })
  }
  if (bookings.some((b) => Date.parse(b.startAt) < e && s < Date.parse(b.endAt))) {
    return { ok: false, code: 'slot_taken', message: 'Это время только что заняли. Выберите другое — ниже актуальное расписание.' }
  }
  const booking = { ...input, id: crypto.randomUUID(), endAt: new Date(e).toISOString() }
  bookings.push(booking)
  return { ok: true, booking }
}

export function icsHref(b: Booking, title: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${b.id}`, `DTSTART:${f(b.startAt)}`, `DTEND:${f(b.endAt)}`, `SUMMARY:${title} — ${owner.name}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`
}
