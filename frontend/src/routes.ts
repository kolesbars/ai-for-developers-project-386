// Пути приложения: шаблон для роутера и построитель ссылки живут рядом,
// чтобы смена адреса страницы записи была правкой в одном месте.

export const homePath = '/'

export const bookingRoute = '/book/:id'

export const bookingPath = (meetingTypeId: string) => `/book/${meetingTypeId}`
