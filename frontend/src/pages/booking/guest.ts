/** Данные Гостя. Хранит их страница записи, поэтому они переживают возврат к выбору времени. */
export type GuestValues = { guestName: string; guestEmail: string; comment: string }
export type GuestErrors = Partial<Record<keyof GuestValues, string>>

export const emptyGuest: GuestValues = { guestName: '', guestEmail: '', comment: '' }

// Те же правила, что у сервера (CreateBookingRequest): длины в символах UTF-16, как `.length`.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Проверка в браузере до отправки; пустой объект — можно отправлять. */
export function validateGuest(values: GuestValues): GuestErrors {
  const errors: GuestErrors = {}
  const name = values.guestName.trim()
  if (!name) errors.guestName = 'Укажите имя'
  else if (name.length > 100) errors.guestName = 'Не больше 100 символов'
  if (!EMAIL.test(values.guestEmail.trim())) errors.guestEmail = 'Проверьте email'
  if (values.comment.length > 500) errors.comment = 'Не больше 500 символов'
  return errors
}
