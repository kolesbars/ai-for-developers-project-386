export const formatDuration = (minutes: number) => `${minutes} мин`

/** Часовой пояс браузера — в нём Гость видит всё время (spec §6). */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// Названия городов для подсказки о поясе Владельца; неизвестный пояс показывается как есть.
const cityNames: Record<string, string> = { 'Asia/Almaty': 'Алматы' }

/** Подсказка рядом со Слотами и в подтверждении (spec §6). */
export const timeZoneNote = (ownerTimeZone = 'Asia/Almaty') =>
  `Время показано в вашем часовом поясе (${browserTimeZone()}). ` +
  `Владелец работает по времени ${cityNames[ownerTimeZone] ?? ownerTimeZone}, пн–пт 09:00–18:00.`

/** Инициалы вместо аватара: первые буквы первых двух слов имени. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
