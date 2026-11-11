import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '../test/api'
import { renderAt } from '../test/render'

// Пояс браузера в тестах — Europe/Moscow (UTC+3), Владельца — Asia/Almaty (UTC+5).
// «Сейчас» — четверг 12.11.2026, 06:00 по Москве.
const NOW = new Date('2026-11-12T03:00:00Z')

const consultation = {
  id: 'consultation',
  name: 'Консультация',
  description: 'Подробный разбор вашего вопроса.',
  durationMinutes: 60,
}
const owner = { name: 'Анна Смирнова', bio: 'Консультации по Kotlin', timeZone: 'Asia/Almaty' }

/** Слот длительностью 60 минут; начало — UTC. */
const slot = (startAt: string, status: 'available' | 'busy' = 'available') => ({
  startAt,
  endAt: new Date(Date.parse(startAt) + 60 * 60_000).toISOString().replace('.000', ''),
  status,
})

const openBookingPage = (slots: unknown[]) => {
  const fetch = mockApi({
    'GET /api/owner': { body: owner },
    'GET /api/meeting-types/consultation': { body: consultation },
    'GET /api/meeting-types/consultation/slots': { body: slots },
  })
  renderAt('/book/consultation')
  return fetch
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('страница записи: загрузка', () => {
  it('ссылка «← Назад» ведёт в каталог', async () => {
    openBookingPage([])

    expect(await screen.findByRole('link', { name: '← Назад' })).toHaveAttribute('href', '/')
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

  it('сообщает об ошибке загрузки расписания', async () => {
    mockApi({
      'GET /api/meeting-types/consultation': { body: consultation },
      'GET /api/meeting-types/consultation/slots': {
        status: 500,
        body: { code: 'oops', message: 'oops' },
      },
    })
    renderAt('/book/consultation')

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить расписание')
  })

  it('без профиля Владельца показывает сводку и время', async () => {
    mockApi({
      'GET /api/meeting-types/consultation': { body: consultation },
      'GET /api/meeting-types/consultation/slots': { body: [slot('2026-11-12T04:00:00Z')] },
    })
    renderAt('/book/consultation')

    expect(await screen.findByRole('heading', { name: 'Консультация' })).toBeInTheDocument()
    expect((await times()).getByRole('button', { name: '07:00' })).toBeEnabled()
  })
})

describe('страница записи: сводка', () => {
  it('показывает Владельца, Тип встречи и подсказку о часовом поясе', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z')])

    const summary = within(await screen.findByRole('region', { name: 'Сводка' }))
    expect(await summary.findByText('Анна Смирнова')).toBeInTheDocument()
    expect(summary.getByRole('heading', { name: 'Консультация' })).toBeInTheDocument()
    expect(summary.getByText('60 мин')).toBeInTheDocument()
    expect(summary.getByText('Подробный разбор вашего вопроса.')).toBeInTheDocument()
    expect(
      summary.getByText(
        'Время показано в вашем часовом поясе (Europe/Moscow). Владелец работает по времени Алматы, пн–пт 09:00–18:00.',
      ),
    ).toBeInTheDocument()
  })
})

const calendar = async () => within(await screen.findByRole('group', { name: 'Выберите день' }))
const times = async () => within(await screen.findByRole('region', { name: 'Время' }))
const timeLabels = (list: ReturnType<typeof within>) =>
  list
    .getAllByRole('button', { name: /^\d\d:\d\d/ })
    .map((button: HTMLElement) => button.textContent)

describe('страница записи: день', () => {
  it('по умолчанию выбран первый день со свободным временем, время — в поясе браузера', async () => {
    openBookingPage([
      slot('2026-11-12T04:00:00Z', 'busy'), // чт 09:00 Алматы = 07:00 Москвы
      slot('2026-11-13T04:00:00Z'), // пт 07:00 Москвы
      slot('2026-11-13T05:30:00Z'), // пт 08:30 Москвы
    ])

    const days = await calendar()
    expect(days.getByRole('button', { name: 'пятница, 13 ноября' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const list = await times()
    expect(list.getByRole('heading', { name: 'пятница, 13 ноября' })).toBeInTheDocument()
    expect(timeLabels(list)).toEqual(['07:00', '08:30'])
  })
})

describe('страница записи: занятое время и недоступные дни', () => {
  it('занятое время зачёркнуто, подписано «занято» и недоступно', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z', 'busy'), slot('2026-11-12T05:00:00Z')])

    const list = await times()
    const busy = list.getByRole('button', { name: '07:00 занято' })
    expect(busy).toBeDisabled()
    expect(busy.querySelector('.mantine-Button-label')).toHaveStyle({
      textDecoration: 'line-through',
    })
    expect(list.getByRole('button', { name: '08:00' })).toBeEnabled()
  })

  it('выходные, дни без свободного времени и дни вне Окна записи недоступны', async () => {
    openBookingPage([
      slot('2026-11-12T04:00:00Z', 'busy'), // чт — всё занято
      slot('2026-11-13T04:00:00Z'), // пт — свободно
      slot('2026-11-16T04:00:00Z'), // пн — свободно
    ])

    const days = await calendar()
    expect(days.getByRole('button', { name: 'четверг, 12 ноября' })).toBeDisabled()
    expect(days.getByRole('button', { name: 'пятница, 13 ноября' })).toBeEnabled()
    expect(days.getByRole('button', { name: 'суббота, 14 ноября' })).toBeDisabled()
    expect(days.getByRole('button', { name: 'воскресенье, 15 ноября' })).toBeDisabled()
    expect(days.getByRole('button', { name: 'понедельник, 16 ноября' })).toBeEnabled()
    // Окно — 14 дней с сегодняшнего: с 12 по 25 ноября.
    expect(days.getAllByRole('button')).toHaveLength(14)
    expect(days.getByRole('button', { name: 'среда, 25 ноября' })).toBeDisabled()
  })

  it('без свободного времени в Окне сообщает об этом', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z', 'busy')])

    expect(
      (await times()).getByRole('heading', { name: 'Нет свободного времени' }),
    ).toBeInTheDocument()
  })
})

describe('страница записи: выбор времени', () => {
  it('выбранные день и время попадают в сводку и в кнопку «Продолжить»', async () => {
    openBookingPage([
      slot('2026-11-12T04:00:00Z'), // чт 07:00 Москвы
      slot('2026-11-16T06:00:00Z'), // пн 09:00 Москвы
      slot('2026-11-16T07:00:00Z'), // пн 10:00 Москвы
    ])

    const list = await times()
    expect(list.getByRole('button', { name: 'Выберите время' })).toBeDisabled()

    fireEvent.click((await calendar()).getByRole('button', { name: 'понедельник, 16 ноября' }))
    expect(list.getByRole('heading', { name: 'понедельник, 16 ноября' })).toBeInTheDocument()
    fireEvent.click(list.getByRole('button', { name: '10:00' }))

    expect(list.getByRole('button', { name: '10:00' })).toHaveAttribute('aria-pressed', 'true')
    expect(list.getByRole('button', { name: 'Продолжить · 10:00–11:00' })).toBeEnabled()
    const summary = within(screen.getByRole('region', { name: 'Сводка' }))
    expect(summary.getByText('понедельник, 16 ноября')).toBeInTheDocument()
    expect(summary.getByText('10:00–11:00')).toBeInTheDocument()
  })

  it('смена дня сбрасывает выбранное время', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z'), slot('2026-11-16T06:00:00Z')])

    const list = await times()
    fireEvent.click(list.getByRole('button', { name: '07:00' }))
    fireEvent.click((await calendar()).getByRole('button', { name: 'понедельник, 16 ноября' }))

    expect(list.getByRole('button', { name: 'Выберите время' })).toBeDisabled()
    const summary = within(screen.getByRole('region', { name: 'Сводка' }))
    expect(summary.queryByText('07:00–08:00')).not.toBeInTheDocument()
  })
})
