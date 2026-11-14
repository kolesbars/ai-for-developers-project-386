export const formatDuration = (minutes: number) => `${minutes} мин`

/** Часовой пояс браузера — в нём Гость видит всё время (spec §6). */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Короткое русское название пояса из ICU: `Asia/Almaty` → «Алматы», `Europe/Moscow` → «Москва».
 * Неизвестный браузеру пояс показывается как есть.
 */
const zoneName = (timeZone: string) => {
  try {
    return (
      new Intl.DateTimeFormat('ru-RU', { timeZone, timeZoneName: 'shortGeneric' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? timeZone
    )
  } catch {
    return timeZone
  }
}

/**
 * Подсказка рядом со Слотами и в подтверждении (spec §6). Пояс Владельца — из `GET /api/owner`;
 * пока профиль не загружен, вторая половина не показывается. Рабочие часы в контракте не передаются,
 * поэтому повторяют spec §3.
 */
export const timeZoneNote = (ownerTimeZone?: string) =>
  `Время показано в вашем часовом поясе (${browserTimeZone()}).` +
  (ownerTimeZone ? ` Владелец работает по времени ${zoneName(ownerTimeZone)}, пн–пт 09:00–18:00.` : '')

/**
 * Цвет подсказки о часовом поясе: `dimmed` (gray.6) на белом даёт контраст ~3.3:1 и на телефоне
 * почти не читается; gray.7 — ~8:1 (WCAG AA), в тёмной теме — dark.1.
 */
export const NOTE_COLOR = 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))'

/** Инициалы вместо аватара: первые буквы первых двух слов имени. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
