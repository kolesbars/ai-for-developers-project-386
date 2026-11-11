import { expect, test } from '@playwright/test'
import { createMeetingType, uniqueId } from '../support'

test('Гость видит в каталоге Тип встречи, созданный через API', async ({ page, request }) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('e2e'),
    name: `Созвон ${Date.now()}`,
    description: 'Обсудим вашу задачу',
    durationMinutes: 45,
  })

  await page.goto('/')

  const card = page.getByRole('article').filter({ hasText: meetingType.name })
  await expect(card.getByRole('heading', { name: meetingType.name })).toBeVisible()
  await expect(card.getByText('Обсудим вашу задачу')).toBeVisible()
  await expect(card.getByText('45 мин')).toBeVisible()
  await expect(card.getByRole('link', { name: 'Выбрать время' })).toHaveAttribute(
    'href',
    `/book/${meetingType.id}`,
  )
})
