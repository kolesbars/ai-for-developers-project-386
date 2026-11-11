export const formatDuration = (minutes: number) => `${minutes} мин`

/** Инициалы вместо аватара: первые буквы первых двух слов имени. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
