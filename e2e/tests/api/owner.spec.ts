import { expect, test } from '@playwright/test'

test('GET /api/owner отдаёт профиль Владельца', async ({ request }) => {
  const response = await request.get('/api/owner')

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    name: expect.any(String),
    bio: expect.any(String),
    timeZone: 'Asia/Almaty',
  })
})
