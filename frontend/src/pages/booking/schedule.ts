import type { components } from '../../api/client'

export type Slot = components['schemas']['Slot']

/** День календаря в поясе браузера. `key` — локальная дата `YYYY-MM-DD`. */
export type Day = { key: string; date: Date; slots: Slot[]; free: number }

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Локальная дата (пояс браузера) момента из API. */
export const dayKey = (iso: string) => keyOf(new Date(iso))

const atNoon = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/**
 * Группирует моменты по локальной дате браузера (spec §6), сохраняя порядок внутри дня.
 * Ключи — в порядке первого появления.
 */
export function groupByDay<T extends { startAt: string }>(items: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>()
  for (const item of items) {
    const key = dayKey(item.startAt)
    days.set(key, [...(days.get(key) ?? []), item])
  }
  return days
}

/**
 * Раскладывает Слоты по дням браузера и достраивает сплошной ряд дней Окна записи. Границы Окна
 * берутся из ответа API, а не из копии правил: с сегодняшнего (или с первого Слота, если из-за
 * разницы поясов он раньше) до последнего дня со Слотами. Дни без Слотов внутри ряда (выходные)
 * тоже в нём: календарь покажет их серыми.
 */
export function windowDays(slots: Slot[], now: Date): Day[] {
  const byDay = groupByDay(slots)
  const today = keyOf(now)
  const keys = [...byDay.keys()].sort()
  const first = keys[0] && keys[0] < today ? keys[0] : today
  const lastSlotDay = keys.at(-1)
  const last = lastSlotDay && lastSlotDay > today ? lastSlotDay : today

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

/** Клетка сетки месяца: день Окна записи, день месяца вне Окна или пустая клетка до 1-го числа. */
export type MonthCell = { date: Date; day?: Day } | null

/** Месяц календаря: `title` — «ноябрь 2026», `weeks` — недели пн–вс. */
export type Month = { key: string; title: string; weeks: MonthCell[][] }

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long' })

/** Сетки месяцев пн–вс, которые покрывают дни Окна записи (spec §7). */
export function monthGrids(days: Day[]): Month[] {
  const byKey = new Map(days.map((day) => [day.key, day]))
  const months: Month[] = []
  for (const day of days) {
    const year = day.date.getFullYear()
    const month = day.date.getMonth()
    const key = `${year}-${pad(month + 1)}`
    if (months.at(-1)?.key === key) continue
    const lead = (new Date(year, month, 1).getDay() + 6) % 7
    const cells: MonthCell[] = Array.from({ length: lead }, () => null)
    for (let date = new Date(year, month, 1, 12); date.getMonth() === month; date.setDate(date.getDate() + 1)) {
      cells.push({ date: new Date(date), day: byKey.get(keyOf(date)) })
    }
    while (cells.length % 7) cells.push(null)
    const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
    months.push({ key, title: `${monthFormat.format(day.date)} ${year}`, weeks })
  }
  return months
}

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
/** «10:00–11:00» в поясе браузера. */
export const formatRange = (interval: Pick<Slot, 'startAt' | 'endAt'>) =>
  `${formatTime(interval.startAt)}–${formatTime(interval.endAt)}`
/** «пятница, 13 ноября». */
export const formatDay = (date: Date) => dayFormat.format(date)
