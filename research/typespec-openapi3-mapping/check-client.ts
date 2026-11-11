// Проверка типов openapi-fetch поверх сгенерированных схем (только tsc --noEmit, не запускается).
import createClient from 'openapi-fetch'
import type { paths } from './out/schema'

const api = createClient<paths>({ baseUrl: 'http://localhost:8080' })

export async function demo() {
  const { data, error, response } = await api.POST('/api/bookings', {
    body: {
      title: 'Звонок',
      slug: 'call',
      durationMinutes: 30,
      tags: ['a'],
      email: 'a@b.c',
      kind: 'group',
      note: null,
    },
  })

  if (error) {
    // error: BadRequestError | NotFoundError | ConflictError | ValidationError
    switch (error.code) {
      case 'SLOT_TAKEN':
        return `занято: ${error.message}`
      case 'VALIDATION_ERROR':
        return Object.keys(error.fields).join(',') // fields доступно только после сужения
      case 'NOT_FOUND':
      case 'BAD_REQUEST':
        return error.message
      default: {
        const never: never = error // исчерпывающая проверка
        return never
      }
    }
  }
  // data: Booking; start — просто string, Date не получаем
  const start: string = data.start
  void response
  return start
}

export async function missingQuery() {
  // @ts-expect-error — query-параметры обязательны и типизированы
  await api.GET('/api/slots', { params: { query: { from: '2026-01-01T00:00:00Z' } } })
}
