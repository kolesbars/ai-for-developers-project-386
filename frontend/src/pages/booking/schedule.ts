import type { components } from '../../api/client'

export type Slot = components['schemas']['Slot']

/** День календаря в поясе браузера. `key` — локальная дата `YYYY-MM-DD`. */
export type Day = { key: string; date: Date; slots: Slot[]; free: number }

/** Длина Окна записи в днях (spec §3). */
const WINDOW_DAYS = 14

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Локальная дата (пояс браузера) момента из API. */
export const dayKey = (iso: string) => keyOf(new Date(iso))

const atNoon = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/**
 * Раскладывает Слоты по дням браузера (spec §6) и достраивает сплошной ряд дней Окна записи:
 * с сегодняшнего на 14 дней, а если из-за разницы поясов Слоты выходят за этот ряд — до них.
 * Дни без Слотов (выходные) тоже в ряду: календарь покажет их серыми.
 */
export function windowDays(slots: Slot[], now: Date): Day[] {
  const byDay = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = dayKey(slot.startAt)
    byDay.set(key, [...(byDay.get(key) ?? []), slot])
  }
  const today = keyOf(now)
  const keys = [...byDay.keys()].sort()
  const first = keys[0] && keys[0] < today ? keys[0] : today
  const lastOfWindow = keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + WINDOW_DAYS - 1))
  const lastSlotDay = keys.at(-1)
  const last = lastSlotDay && lastSlotDay > lastOfWindow ? lastSlotDay : lastOfWindow

  const days: Day[] = []
  for (let date = atNoon(first); keyOf(date) <= last; date.setDate(date.getDate() + 1)) {
    const key = keyOf(date)
    const daySlots = byDay.get(key) ?? []
    days.push({
      key,
      date: new Date(date),
      slots: daySlots,
      free: daySlots.filter((slot) => slot.status === 'available').length,
    })
  }
  return days
}

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
/** «10:00–11:00» в поясе браузера. */
export const formatRange = (slot: Pick<Slot, 'startAt' | 'endAt'>) => `${formatTime(slot.startAt)}–${formatTime(slot.endAt)}`
/** «пятница, 13 ноября». */
export const formatDay = (date: Date) => dayFormat.format(date)
