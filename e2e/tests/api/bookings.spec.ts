import { type APIRequestContext, expect, test } from '@playwright/test'
import { createMeetingType, uniqueId } from '../support'

const guest = { guestName: 'Мария Смирнова', guestEmail: 'maria@example.com' }

/**
 * Случайный свободный старт: Бронирования не пересекаются между любыми Типами встреч, а БД общая
 * для всех тестов (и переиспользуется между запусками), поэтому не берём всегда первый Слот.
 */
async function freeStart(request: APIRequestContext, meetingTypeId: string) {
  const response = await request.get(`/api/meeting-types/${meetingTypeId}/slots`)
  const slots: { startAt: string; status: string }[] = await response.json()
  const available = slots.filter((slot) => slot.status === 'available')
  expect(available.length).toBeGreaterThan(0)
  return available[Math.floor(Math.random() * available.length)].startAt
}

test('POST /api/bookings — 201, повторно на то же время — 409 slot_taken', async ({ request }) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('book'),
    name: 'Консультация',
    durationMinutes: 30,
  })
  const startAt = await freeStart(request, meetingType.id)

  const created = await request.post('/api/bookings', {
    data: { meetingTypeId: meetingType.id, startAt, ...guest, comment: 'Про контракт API' },
  })

  expect(created.status()).toBe(201)
  const booking = await created.json()
  expect(booking).toMatchObject({
    meetingTypeId: meetingType.id,
    meetingTypeName: 'Консультация',
    startAt,
    endAt: new Date(Date.parse(startAt) + 30 * 60 * 1000).toISOString().replace('.000Z', 'Z'),
    ...guest,
    comment: 'Про контракт API',
  })
  expect(await (await request.get(`/api/bookings/${booking.id}`)).json()).toEqual(booking)

  const again = await request.post('/api/bookings', {
    data: { meetingTypeId: meetingType.id, startAt, ...guest },
  })
  expect(again.status()).toBe(409)
  expect(await again.json()).toMatchObject({ code: 'slot_taken' })
})

test('POST /api/bookings — 400 validation_failed с fieldErrors', async ({ request }) => {
  const response = await request.post('/api/bookings', {
    data: { meetingTypeId: 'any', startAt: '2026-11-12T05:00:00Z', guestName: '', guestEmail: 'maria' },
  })

  expect(response.status()).toBe(400)
  const body = await response.json()
  expect(body.code).toBe('validation_failed')
  expect(body.fieldErrors.map((e: { field: string }) => e.field)).toEqual(['guestName', 'guestEmail'])
})

test('POST /api/bookings — 422 slot_unavailable для старта в прошлом', async ({ request }) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('past'),
    name: 'Консультация',
    durationMinutes: 30,
  })

  const response = await request.post('/api/bookings', {
    data: { meetingTypeId: meetingType.id, startAt: '2020-01-06T05:00:00Z', ...guest },
  })

  expect(response.status()).toBe(422)
  expect(await response.json()).toMatchObject({ code: 'slot_unavailable' })
})
