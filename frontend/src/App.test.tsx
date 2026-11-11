import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi } from './test/api'
import { renderAt } from './test/render'

const consultation = {
  id: 'consultation',
  name: 'Консультация',
  description: 'Подробный разбор вашего вопроса.',
  durationMinutes: 60,
}
const intro = { id: 'intro', name: 'Знакомство', durationMinutes: 15 }

describe('главная страница', () => {
  it('показывает приветствие', async () => {
    mockApi({ 'GET /api/meeting-types': { body: [] } })
    renderAt('/')

    expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Здравствуйте! Здесь можно записаться на звонок с владельцем: выберите тип встречи, удобный день и время — подтверждение придёт сразу.',
      ),
    ).toBeInTheDocument()
    await screen.findByText('Пока нет доступных типов встреч.')
  })

  it('показывает Типы встреч из API со ссылками на запись', async () => {
    mockApi({ 'GET /api/meeting-types': { body: [consultation, intro] } })
    renderAt('/')

    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(2)

    const first = within(cards[0])
    expect(first.getByRole('heading', { name: 'Консультация' })).toBeInTheDocument()
    expect(first.getByText('Подробный разбор вашего вопроса.')).toBeInTheDocument()
    expect(first.getByText('60 мин')).toBeInTheDocument()
    expect(first.getByRole('link', { name: 'Выбрать время' })).toHaveAttribute(
      'href',
      '/book/consultation',
    )

    const second = within(cards[1])
    expect(second.getByRole('heading', { name: 'Знакомство' })).toBeInTheDocument()
    expect(second.getByText('15 мин')).toBeInTheDocument()
    expect(second.getByRole('link', { name: 'Выбрать время' })).toHaveAttribute('href', '/book/intro')
  })

  it('сообщает, что Типов встреч пока нет', async () => {
    mockApi({ 'GET /api/meeting-types': { body: [] } })
    renderAt('/')

    expect(await screen.findByText('Пока нет доступных типов встреч.')).toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('сообщает об ошибке загрузки', async () => {
    mockApi({ 'GET /api/meeting-types': { status: 500, body: { code: 'oops', message: 'oops' } } })
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить типы встреч')
  })
})

describe('страница записи (заглушка)', () => {
  it('показывает Тип встречи из API', async () => {
    mockApi({ 'GET /api/meeting-types/consultation': { body: consultation } })
    renderAt('/book/consultation')

    expect(
      await screen.findByRole('heading', { name: 'Запись на «Консультация»' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Назад' })).toHaveAttribute('href', '/')
  })

  it('сообщает, что Тип встречи не найден, по ответу 404', async () => {
    mockApi({
      'GET /api/meeting-types/unknown': {
        status: 404,
        body: { code: 'meeting_type_not_found', message: 'Тип встречи не найден' },
      },
    })
    renderAt('/book/unknown')

    expect(await screen.findByRole('heading', { name: 'Тип встречи не найден' })).toBeInTheDocument()
  })
})

describe('неизвестный адрес', () => {
  it('показывает страницу «не найдена» со ссылкой на главную', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/')
  })
})
