const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export const ID_MAX_LENGTH = 40

/** id Типа встречи из названия (spec §7): транслит, латиница/цифры через дефис, до 40 символов. */
export function slugify(name: string): string {
  return [...name.toLowerCase()]
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-/, '')
    .slice(0, ID_MAX_LENGTH)
    .replace(/-$/, '')
}

export type MeetingTypeField = 'id' | 'name' | 'description' | 'durationMinutes'
export type FieldErrors = Partial<Record<MeetingTypeField, string>>

export type MeetingTypeDraft = {
  id: string
  name: string
  description: string
  durationMinutes: number | string
}

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Проверки до отправки (spec §4); тексты — как у backend. Пустой объект — ошибок нет. */
export function validate(draft: MeetingTypeDraft): FieldErrors {
  const errors: FieldErrors = {}
  const { id, name, description } = draft
  const duration = Number(draft.durationMinutes)
  if (!ID_PATTERN.test(id) || id.length < 2 || id.length > ID_MAX_LENGTH)
    errors.id = '2–40 символов: строчные латинские буквы и цифры, слова через дефис'
  if (!name.trim() || name.length > 100) errors.name = 'Название обязательно, до 100 символов'
  if (description.length > 500) errors.description = 'Описание — до 500 символов'
  if (draft.durationMinutes === '' || !Number.isInteger(duration) || duration < 15 || duration > 240 || duration % 15)
    errors.durationMinutes = 'Длительность — от 15 до 240 минут, кратно 15'
  return errors
}
