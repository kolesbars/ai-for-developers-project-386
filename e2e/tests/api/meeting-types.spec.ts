import { expect, test } from '@playwright/test'
import { uniqueId } from '../support'

test('POST /api/meeting-types создаёт Тип встречи, повтор id — 409', async ({ request }) => {
  const meetingType = {
    id: uniqueId('api'),
    name: 'Консультация',
    description: 'Разбор вопроса',
    durationMinutes: 60,
  }

  const created = await request.post('/api/meeting-types', { data: meetingType })
  expect(created.status()).toBe(201)
  expect(await created.json()).toEqual(meetingType)

  const again = await request.post('/api/meeting-types', {
    data: { ...meetingType, name: 'Другое' },
  })
  expect(again.status()).toBe(409)
  expect(await again.json()).toMatchObject({ code: 'meeting_type_exists' })
})

test('GET /api/meeting-types возвращает созданный Тип встречи', async ({ request }) => {
  const meetingType = { id: uniqueId('api'), name: 'Знакомство', durationMinutes: 15 }
  await request.post('/api/meeting-types', { data: meetingType })

  const list = await request.get('/api/meeting-types')

  expect(list.status()).toBe(200)
  expect(await list.json()).toContainEqual(meetingType)
})
