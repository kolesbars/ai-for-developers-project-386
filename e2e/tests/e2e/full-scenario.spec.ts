import { expect, test, type Page } from '@playwright/test'
import { uniqueId } from '../support'

/** Гость выбирает время `label` на странице записи и переходит к форме. */
async function openFormAt(page: Page, meetingTypeId: string, label: string) {
  await page.goto(`/book/${meetingTypeId}`)
  await page.getByRole('region', { name: 'Время' }).getByRole('button', { name: label, exact: true }).click()
  await page.getByRole('button', { name: /^Продолжить · / }).click()
  return page.getByRole('form', { name: 'Ваши данные' })
}

test('Владелец создаёт Тип встречи, Гость записывается, второй Гость получает конфликт, Владелец видит встречу', async ({
  page,
  browser,
}) => {
  const id = uniqueId('e2e-full')
  const name = `Полный сценарий ${Date.now()}`
  const guestName = `Гость ${Date.now()}`

  // Владелец создаёт Тип встречи в админке.
  await page.goto('/admin')
  await page.getByRole('navigation', { name: 'Разделы админки' }).getByRole('button', { name: /^Типы встреч/ }).click()
  await page.getByRole('button', { name: '+ Новый тип' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый Тип встречи' })
  await dialog.getByRole('textbox', { name: 'Название' }).fill(name)
  await dialog.getByRole('textbox', { name: 'id (адрес страницы записи)' }).fill(id)
  await dialog.getByRole('textbox', { name: 'Длительность, минут' }).fill('45')
  await dialog.getByRole('button', { name: 'Создать' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('article').filter({ hasText: name })).toBeVisible()

  // Гость находит Тип на главной и выбирает случайное свободное время (БД общая для параллельных тестов).
  await page.goto('/')
  await page.getByRole('article').filter({ hasText: name }).getByRole('link', { name: 'Выбрать время' }).click()
  await expect(page).toHaveURL(new RegExp(`/book/${id}$`))
  const free = page.getByRole('region', { name: 'Время' }).getByRole('button', { name: /^\d\d:\d\d$/ })
  await expect(free.first()).toBeVisible()
  const label = await free.nth(Math.floor(Math.random() * (await free.count()))).innerText()

  // Второй Гость в другом браузере открывает форму на то же время, пока оно ещё свободно.
  const rival = await browser.newContext()
  const rivalPage = await rival.newPage()
  const rivalForm = await openFormAt(rivalPage, id, label)

  // Первый Гость записывается и видит подтверждение.
  const form = await openFormAt(page, id, label)
  await form.getByRole('textbox', { name: 'Имя' }).fill(guestName)
  await form.getByRole('textbox', { name: 'Email' }).fill('guest@example.com')
  await form.getByRole('textbox', { name: 'Комментарий' }).fill('Обсудим e2e')
  await form.getByRole('button', { name: 'Записаться' }).click()
  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
  await expect(page.getByText(new RegExp(`, ${label}–\\d\\d:\\d\\d$`))).toBeVisible()

  // Второй Гость отправляет форму на занятое время и получает сообщение о конфликте.
  await rivalForm.getByRole('textbox', { name: 'Имя' }).fill('Опоздавший')
  await rivalForm.getByRole('textbox', { name: 'Email' }).fill('late@example.com')
  await rivalForm.getByRole('button', { name: 'Записаться' }).click()
  const times = rivalPage.getByRole('region', { name: 'Время' })
  await expect(times.getByRole('alert')).toContainText('Это время только что заняли')
  await expect(times.getByRole('button', { name: `${label} занято` })).toBeDisabled()
  await expect(rivalPage).toHaveURL(new RegExp(`/book/${id}$`))
  await rival.close()

  // Владелец видит встречу в «Предстоящих».
  await page.goto('/admin')
  await page.getByRole('navigation', { name: 'Разделы админки' }).getByRole('button', { name: /^Предстоящие встречи/ }).click()
  const meeting = page.getByRole('article').filter({ hasText: guestName })
  await expect(meeting).toHaveCount(1)
  await expect(meeting).toContainText(new RegExp(`^${label}–\\d\\d:\\d\\d`))
  await expect(meeting).toContainText(name)
  await expect(meeting).toContainText('guest@example.com')
  await expect(meeting).toContainText('«Обсудим e2e»')
  await expect(page.getByText('Опоздавший')).toHaveCount(0)
})
