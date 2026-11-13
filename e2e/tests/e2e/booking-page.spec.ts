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

test('Гость бронирует время и видит подтверждение, которое переживает перезагрузку', async ({
  page,
  request,
}) => {
  const meetingType = await createMeetingType(request, {
    id: uniqueId('e2e-confirm'),
    name: `Созвон ${Date.now()}`,
    durationMinutes: 30,
  })
  const guestName = `Гость ${Date.now()}`

  await page.goto(`/book/${meetingType.id}`)
  // Бронирования пересекаются глобально, а БД общая для параллельных тестов: берём случайное
  // свободное время выбранного дня, а не первое.
  const free = page.getByRole('region', { name: 'Время' }).getByRole('button', { name: /^\d\d:\d\d$/ })
  await expect(free.first()).toBeVisible()
  const time = free.nth(Math.floor(Math.random() * (await free.count())))
  const label = await time.innerText()
  await time.click()
  await page.getByRole('button', { name: /^Продолжить · / }).click()

  const form = page.getByRole('form', { name: 'Ваши данные' })
  await form.getByRole('button', { name: 'Записаться' }).click()
  await expect(form.getByText('Укажите имя')).toBeVisible()
  await form.getByRole('textbox', { name: 'Имя' }).fill(guestName)
  await form.getByRole('textbox', { name: 'Email' }).fill('guest@example.com')
  await form.getByRole('button', { name: 'Записаться' }).click()

  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/)
  const expectConfirmation = async () => {
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(page.getByText(meetingType.name)).toBeVisible()
    await expect(page.getByText(new RegExp(`, ${label}–\\d\\d:\\d\\d$`))).toBeVisible()
    await expect(page.getByText(`${guestName} · guest@example.com`)).toBeVisible()
  }
  await expectConfirmation()
  await page.reload()
  await expectConfirmation()
  await expect(page.getByRole('link', { name: 'Записаться ещё' })).toHaveAttribute(
    'href',
    `/book/${meetingType.id}`,
  )
})
