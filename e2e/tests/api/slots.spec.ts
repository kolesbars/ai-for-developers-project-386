import { expect, test } from '@playwright/test'
import { createMeetingType, uniqueId } from '../support'

test('GET /api/meeting-types/{id}/slots — старты Окна записи по контракту Slot', async ({
  request,
}) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('slots'),
    name: 'Консультация',
    durationMinutes: 60,
  })

  const response = await request.get(`/api/meeting-types/${meetingType.id}/slots`)

  expect(response.status()).toBe(200)
  const slots: { startAt: string; endAt: string; status: string }[] = await response.json()
  expect(slots.length).toBeGreaterThan(0)
  for (const slot of slots.slice(0, 5)) {
    expect(slot.startAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00Z$/)
    expect(Date.parse(slot.endAt) - Date.parse(slot.startAt)).toBe(60 * 60 * 1000)
    expect(['available', 'busy']).toContain(slot.status)
  }
})

test('GET /api/meeting-types/{id}/slots — 404 для неизвестного Типа встречи', async ({
  request,
}) => {
  const response = await request.get(`/api/meeting-types/${uniqueId('missing')}/slots`)

  expect(response.status()).toBe(404)
  expect(await response.json()).toMatchObject({ code: 'meeting_type_not_found' })
})
