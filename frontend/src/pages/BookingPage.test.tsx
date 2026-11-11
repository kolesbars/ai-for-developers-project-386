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

/** @param more — дополнительные или заменяющие ответы API (например, на `POST /api/bookings`). */
const openBookingPage = (slots: unknown[], more: Parameters<typeof mockApi>[0] = {}) => {
  const fetch = mockApi({
    'GET /api/owner': { body: owner },
    'GET /api/meeting-types/consultation': { body: consultation },
    'GET /api/meeting-types/consultation/slots': { body: slots },
    ...more,
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
    // Окно — с сегодняшнего до последнего дня со Слотами: остальные дни месяца — не кнопки.
    expect(days.getAllByRole('button')).toHaveLength(5)
    expect(days.queryByRole('button', { name: 'среда, 11 ноября' })).not.toBeInTheDocument()
    expect(days.queryByRole('button', { name: 'вторник, 17 ноября' })).not.toBeInTheDocument()
  })

  it('сетка месяца пн–вс с заголовком месяца; Окно на стыке месяцев — две сетки', async () => {
    openBookingPage([
      slot('2026-11-30T04:00:00Z'), // пн 30 ноября
      slot('2026-12-01T04:00:00Z'), // вт 1 декабря
    ])

    const days = await calendar()
    const november = within(days.getByRole('grid', { name: 'ноябрь 2026' }))
    const december = within(days.getByRole('grid', { name: 'декабрь 2026' }))
    expect(november.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Пн',
      'Вт',
      'Ср',
      'Чт',
      'Пт',
      'Сб',
      'Вс',
    ])
    // Ноябрь 2026 начинается в воскресенье: 1-е — последняя клетка первой недели.
    const firstWeek = november.getAllByRole('row')[1]
    expect(within(firstWeek).getAllByRole('gridcell').at(-1)).toHaveTextContent('1')
    expect(november.getByRole('button', { name: 'понедельник, 30 ноября' })).toBeEnabled()
    expect(december.getByRole('button', { name: 'вторник, 1 декабря' })).toBeEnabled()
    // Декабрь 2026 начинается во вторник: понедельник — пустая клетка, 31-е — в сетке, но не кнопка.
    expect(within(december.getAllByRole('row')[1]).getAllByRole('gridcell')[0]).toHaveTextContent('')
    expect(december.getByText('31')).toBeInTheDocument()
    expect(december.queryByRole('button', { name: 'четверг, 31 декабря' })).not.toBeInTheDocument()
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

/** Выбирает 07:00 четверга (первого дня) и жмёт «Продолжить». */
const continueAt0700 = async () => {
  fireEvent.click((await times()).getByRole('button', { name: '07:00' }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить · 07:00–08:00' }))
  return within(await screen.findByRole('form', { name: 'Ваши данные' }))
}

describe('страница записи: форма «Ваши данные»', () => {
  it('заменяет календарь и время, сводка остаётся; «← Другое время» возвращает к выбору', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z'), slot('2026-11-12T05:00:00Z')])

    const form = await continueAt0700()
    expect(form.getByRole('textbox', { name: 'Имя' })).toBeInTheDocument()
    expect(form.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
    expect(form.getByRole('textbox', { name: /Комментарий/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Выберите день' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Время' })).not.toBeInTheDocument()
    const summary = within(screen.getByRole('region', { name: 'Сводка' }))
    expect(summary.getByText('07:00–08:00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← Другое время' }))

    expect((await times()).getByRole('button', { name: '07:00' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('form', { name: 'Ваши данные' })).not.toBeInTheDocument()
  })

  it('проверяет поля до отправки и не обращается к серверу', async () => {
    const fetch = openBookingPage([slot('2026-11-12T04:00:00Z')])

    const form = await continueAt0700()
    fireEvent.change(form.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'maria@example' },
    })
    fireEvent.change(form.getByRole('textbox', { name: /Комментарий/ }), {
      target: { value: 'x'.repeat(501) },
    })
    fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

    expect(form.getByRole('textbox', { name: 'Имя' })).toHaveAccessibleDescription('Укажите имя')
    expect(form.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Проверьте email',
    )
    expect(form.getByRole('textbox', { name: /Комментарий/ })).toHaveAccessibleDescription(
      /Не больше 500 символов/,
    )
    expect(fetch.mock.calls.map(([request]) => (request as Request).method)).not.toContain('POST')
  })
})

const booking = {
  id: '6f1c2d4e-0b7a-4a51-9a63-2f0d8f6c1e10',
  meetingTypeId: 'consultation',
  meetingTypeName: 'Консультация',
  startAt: '2026-11-12T04:00:00Z',
  endAt: '2026-11-12T05:00:00Z',
  guestName: 'Мария Смирнова',
  guestEmail: 'maria@example.com',
  comment: 'Про контракт API',
  createdAt: '2026-11-12T03:00:00Z',
}

const fillGuest = (form: ReturnType<typeof within>, comment = '') => {
  fireEvent.change(form.getByRole('textbox', { name: 'Имя' }), {
    target: { value: ' Мария Смирнова ' },
  })
  fireEvent.change(form.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'maria@example.com' },
  })
  fireEvent.change(form.getByRole('textbox', { name: /Комментарий/ }), {
    target: { value: comment },
  })
}

const postedBodies = async (fetch: ReturnType<typeof mockApi>) =>
  Promise.all(
    fetch.mock.calls
      .map(([request]) => request as Request)
      .filter((request) => request.method === 'POST')
      .map((request) => request.clone().json()),
  )

describe('страница записи: отправка', () => {
  it('создаёт Бронирование и открывает подтверждение', async () => {
    const fetch = openBookingPage([slot('2026-11-12T04:00:00Z')], {
      'POST /api/bookings': { status: 201, body: booking },
      [`GET /api/bookings/${booking.id}`]: { body: booking },
    })

    const form = await continueAt0700()
    fillGuest(form, 'Про контракт API')
    fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

    expect(await screen.findByRole('heading', { name: 'Вы записаны' })).toBeInTheDocument()
    expect(await postedBodies(fetch)).toEqual([
      {
        meetingTypeId: 'consultation',
        startAt: '2026-11-12T04:00:00Z',
        guestName: 'Мария Смирнова',
        guestEmail: 'maria@example.com',
        comment: 'Про контракт API',
      },
    ])
  })

  it('без комментария не отправляет поле comment', async () => {
    const fetch = openBookingPage([slot('2026-11-12T04:00:00Z')], {
      'POST /api/bookings': { status: 201, body: { ...booking, comment: undefined } },
      [`GET /api/bookings/${booking.id}`]: { body: { ...booking, comment: undefined } },
    })

    const form = await continueAt0700()
    fillGuest(form)
    fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

    expect(await screen.findByRole('heading', { name: 'Вы записаны' })).toBeInTheDocument()
    expect((await postedBodies(fetch))[0]).not.toHaveProperty('comment')
  })

  it('показывает fieldErrors сервера под полями', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z')], {
      'POST /api/bookings': {
        status: 400,
        body: {
          code: 'validation_failed',
          message: 'Проверьте поля формы',
          fieldErrors: [{ field: 'guestEmail', message: 'Некорректный email' }],
        },
      },
    })

    const form = await continueAt0700()
    fillGuest(form)
    fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

    expect(
      await form.findByText('Некорректный email'),
    ).toBeInTheDocument()
    expect(form.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Некорректный email',
    )
    expect(form.getByRole('textbox', { name: 'Email' })).toHaveValue('maria@example.com')
  })

  it('сообщает о сбое отправки, данные формы остаются', async () => {
    openBookingPage([slot('2026-11-12T04:00:00Z')], {
      'POST /api/bookings': { status: 500, body: { code: 'oops', message: 'oops' } },
    })

    const form = await continueAt0700()
    fillGuest(form)
    fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

    expect(await form.findByRole('alert')).toHaveTextContent('Не удалось записаться')
    expect(form.getByRole('textbox', { name: 'Имя' })).toHaveValue(' Мария Смирнова ')
  })
})

describe('страница записи: конфликт', () => {
  const thursday = slot('2026-11-12T04:00:00Z') // чт 07:00 Москвы
  const monday0900 = '2026-11-16T06:00:00Z' // пн 09:00 Москвы
  const monday1000 = '2026-11-16T07:00:00Z' // пн 10:00 Москвы

  it.each([
    [
      409,
      'slot_taken',
      'Это время только что заняли. Выберите другое — ниже актуальное расписание',
    ],
    [422, 'slot_unavailable', 'Это время больше недоступно'],
  ])(
    '%i %s: возврат к выбору времени, сообщение, новое расписание, данные формы сохранены',
    async (status, code, notice) => {
      const fetch = openBookingPage([], {
        'GET /api/meeting-types/consultation/slots': [
          { body: [thursday, slot(monday0900), slot(monday1000)] },
          { body: [thursday, slot(monday0900), slot(monday1000, 'busy')] },
        ],
        'POST /api/bookings': { status, body: { code, message: 'с сервера' } },
      })

      fireEvent.click((await calendar()).getByRole('button', { name: 'понедельник, 16 ноября' }))
      fireEvent.click((await times()).getByRole('button', { name: '10:00' }))
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить · 10:00–11:00' }))
      const form = within(await screen.findByRole('form', { name: 'Ваши данные' }))
      fillGuest(form, 'Про контракт API')
      fireEvent.click(form.getByRole('button', { name: 'Записаться' }))

      // Гость снова выбирает время на том же дне, расписание — уже обновлённое.
      const list = await times()
      expect(await list.findByRole('button', { name: '10:00 занято' })).toBeDisabled()
      expect(list.getByRole('alert')).toHaveTextContent(notice)
      expect(list.getByRole('heading', { name: 'понедельник, 16 ноября' })).toBeInTheDocument()
      expect(list.getByRole('button', { name: 'Выберите время' })).toBeDisabled()
      expect(
        fetch.mock.calls.filter(([r]) => (r as Request).url.endsWith('/slots')),
      ).toHaveLength(2)

      fireEvent.click(list.getByRole('button', { name: '09:00' }))
      fireEvent.click(list.getByRole('button', { name: 'Продолжить · 09:00–10:00' }))
      const again = within(await screen.findByRole('form', { name: 'Ваши данные' }))
      expect(again.getByRole('textbox', { name: 'Имя' })).toHaveValue(' Мария Смирнова ')
      expect(again.getByRole('textbox', { name: 'Email' })).toHaveValue('maria@example.com')
      expect(again.getByRole('textbox', { name: /Комментарий/ })).toHaveValue('Про контракт API')
    },
  )
})
