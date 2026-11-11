import { expect, test } from '@playwright/test'
import { createMeetingType, uniqueId } from '../support'

test('Гость выбирает день и время на странице записи', async ({ page, request }) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('e2e-book'),
    name: `Разбор ${Date.now()}`,
    description: 'Посмотрим ваш код',
    durationMinutes: 30,
  })

  await page.goto('/')
  await page
    .getByRole('article')
    .filter({ hasText: meetingType.name })
    .getByRole('link', { name: 'Выбрать время' })
    .click()

  const summary = page.getByRole('region', { name: 'Сводка' })
  await expect(summary.getByRole('heading', { name: meetingType.name })).toBeVisible()
  await expect(summary.getByText('30 мин')).toBeVisible()
  await expect(summary.getByText(/^Время показано в вашем часовом поясе/)).toBeVisible()

  // По умолчанию выбран первый день со свободным временем.
  const calendar = page.getByRole('group', { name: 'Выберите день' })
  await expect(calendar.locator('[aria-pressed="true"]')).toHaveCount(1)

  const times = page.getByRole('region', { name: 'Время' })
  await expect(times.getByRole('button', { name: 'Выберите время' })).toBeDisabled()
  const time = times.getByRole('button', { name: /^\d\d:\d\d$/ }).first()
  const label = await time.innerText()
  await time.click()

  await expect(
    times.getByRole('button', { name: new RegExp(`^Продолжить · ${label}–\\d\\d:\\d\\d$`) }),
  ).toBeEnabled()
  await expect(summary.getByText(new RegExp(`^${label}–`))).toBeVisible()
})
