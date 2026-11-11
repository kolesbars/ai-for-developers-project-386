import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '../test/api'
import { renderAt } from '../test/render'

// Пояс браузера в тестах — Europe/Moscow (UTC+3).
const owner = { name: 'Анна Смирнова', bio: 'Консультации по Kotlin', timeZone: 'Asia/Almaty' }

const consultation = {
  id: 'consultation',
  name: 'Консультация',
  description: 'Подробный разбор вашего вопроса.',
  durationMinutes: 60,
}
const intro = { id: 'intro', name: 'Знакомство', durationMinutes: 15 }

const booking = (fields: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  guestEmail: 'guest@example.com',
  createdAt: '2026-11-10T10:00:00Z',
  ...fields,
})

const bookings = [
  booking({
    meetingTypeId: 'consultation',
    meetingTypeName: 'Консультация',
    startAt: '2026-11-12T05:00:00Z',
    endAt: '2026-11-12T06:00:00Z',
    guestName: 'Мария Иванова',
    guestEmail: 'maria@example.com',
    comment: 'Про контракт API',
  }),
  booking({
    meetingTypeId: 'intro',
    meetingTypeName: 'Знакомство',
    startAt: '2026-11-12T07:00:00Z',
    endAt: '2026-11-12T07:15:00Z',
    guestName: 'Пётр Сидоров',
  }),
  booking({
    meetingTypeId: 'consultation',
    meetingTypeName: 'Консультация',
    startAt: '2026-11-13T06:30:00Z',
    endAt: '2026-11-13T07:30:00Z',
    guestName: 'Олег Петров',
  }),
]

const openAdmin = (upcoming: unknown[], meetingTypes: unknown[] = [consultation, intro]) => {
  mockApi({
    'GET /api/owner': { body: owner },
    'GET /api/bookings': { body: upcoming },
    'GET /api/meeting-types': { body: meetingTypes },
  })
  renderAt('/admin')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Админка — предстоящие встречи', () => {
  it('показывает встречи всех Типов лентой по дням', async () => {
    openAdmin(bookings)

    const thursday = await screen.findByRole('region', { name: 'четверг, 12 ноября' })
    const friday = screen.getByRole('region', { name: 'пятница, 13 ноября' })

    const [first, second] = within(thursday).getAllByRole('article')
    expect(first).toHaveTextContent('08:00–09:00')
    expect(first).toHaveTextContent('Консультация')
    expect(first).toHaveTextContent('Мария Иванова')
    expect(first).toHaveTextContent('Про контракт API')
    expect(within(first).getByRole('link', { name: 'maria@example.com' })).toHaveAttribute(
      'href',
      'mailto:maria@example.com',
    )
    expect(second).toHaveTextContent('10:00–10:15')
    expect(second).toHaveTextContent('Знакомство')
    expect(second).toHaveTextContent('Пётр Сидоров')

    const [third] = within(friday).getAllByRole('article')
    expect(third).toHaveTextContent('09:30–10:30')
    expect(third).toHaveTextContent('Олег Петров')
  })

  it('без встреч — предлагает поделиться ссылкой', async () => {
    openAdmin([])

    expect(
      await screen.findByText('Пока никто не записался. Поделитесь ссылкой на Тип встречи.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('боковое меню: Владелец, счётчики разделов, ссылка на страницу Гостей', async () => {
    openAdmin(bookings)

    const nav = screen.getByRole('navigation', { name: 'Разделы админки' })
    expect(await within(nav).findByText('Анна Смирнова')).toBeInTheDocument()
    expect(within(nav).getByText('Asia/Almaty')).toBeInTheDocument()
    expect(await within(nav).findByRole('button', { name: 'Предстоящие встречи 3' })).toBeInTheDocument()
    expect(await within(nav).findByRole('button', { name: 'Типы встреч 2' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Открыть страницу для Гостей ↗' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

describe('Админка — Типы встреч', () => {
  it('карточки с адресом страницы записи и копированием ссылки', async () => {
    openAdmin(bookings)

    fireEvent.click(await screen.findByRole('button', { name: /^Типы встреч/ }))

    expect(screen.getByRole('heading', { name: 'Типы встреч' })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole('article')
    expect(first).toHaveTextContent('Консультация')
    expect(first).toHaveTextContent('60 мин')
    expect(first).toHaveTextContent('/book/consultation')
    expect(first).toHaveTextContent('Подробный разбор вашего вопроса.')
    expect(within(first).getByRole('button', { name: 'Скопировать ссылку' })).toBeInTheDocument()
    expect(second).toHaveTextContent('Знакомство')
    expect(second).toHaveTextContent('/book/intro')
    expect(screen.queryByText('Мария Иванова')).not.toBeInTheDocument()
  })
})

describe('Админка — создание Типа встречи', () => {
  const created = { id: 'razbor-koda', name: 'Разбор кода', description: 'Ревью PR', durationMinutes: 45 }

  const openForm = async (createReply: { status?: number; body: unknown }) => {
    const fetch = mockApi({
      'GET /api/owner': { body: owner },
      'GET /api/bookings': { body: [] },
      'GET /api/meeting-types': { body: [consultation] },
      'POST /api/meeting-types': createReply,
    })
    renderAt('/admin')
    fireEvent.click(await screen.findByRole('button', { name: /^Типы встреч/ }))
    fireEvent.click(await screen.findByRole('button', { name: '+ Новый тип' }))
    return { fetch, dialog: await screen.findByRole('dialog', { name: 'Новый Тип встречи' }) }
  }

  const field = (dialog: HTMLElement, label: string | RegExp) => within(dialog).getByLabelText(label)
  const type = (dialog: HTMLElement, label: string | RegExp, value: string) =>
    fireEvent.change(field(dialog, label), { target: { value } })
  const submit = (dialog: HTMLElement) =>
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }))

  const sentBodies = async (fetch: ReturnType<typeof mockApi>) => {
    const posts = fetch.mock.calls
      .map(([input]) => input as Request)
      .filter((request) => request.method === 'POST')
    return Promise.all(posts.map((request) => request.clone().json()))
  }

  it('id подставляется из названия, подсказка показывает ссылку; после создания тип в списке', async () => {
    const { fetch, dialog } = await openForm({ status: 201, body: created })

    type(dialog, /Название/, 'Разбор кода')
    expect(field(dialog, /^id/)).toHaveValue('razbor-koda')
    expect(dialog).toHaveTextContent('Ссылка для Гостей: /book/razbor-koda — изменить потом нельзя')
    type(dialog, /Длительность/, '45')
    type(dialog, /Описание/, 'Ревью PR')
    submit(dialog)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await sentBodies(fetch)).toEqual([created])
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(cards[1]).toHaveTextContent('Разбор кода')
    expect(cards[1]).toHaveTextContent('/book/razbor-koda')
    expect(screen.getByRole('button', { name: 'Типы встреч 2' })).toBeInTheDocument()
  })

  it('ошибки полей показываются до отправки, запрос не уходит', async () => {
    const { fetch, dialog } = await openForm({ status: 201, body: created })

    type(dialog, /Название/, 'Разбор кода')
    type(dialog, /^id/, 'Razbor_koda')
    type(dialog, /Длительность/, '50')
    type(dialog, /Описание/, 'x'.repeat(501))
    submit(dialog)

    expect(
      await within(dialog).findByText('2–40 символов: строчные латинские буквы и цифры, слова через дефис'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Длительность — от 15 до 240 минут, кратно 15')).toBeInTheDocument()
    expect(within(dialog).getByText('Описание — до 500 символов')).toBeInTheDocument()
    expect(field(dialog, /^id/)).toBeInvalid()

    type(dialog, /Название/, '   ')
    submit(dialog)
    expect(await within(dialog).findByText('Название обязательно, до 100 символов')).toBeInTheDocument()
    expect(await sentBodies(fetch)).toEqual([])
  })

  it('id уже занят — ошибка под полем id, форма сохраняется', async () => {
    const { dialog } = await openForm({
      status: 409,
      body: { code: 'meeting_type_exists', message: 'Тип встречи с таким id уже есть' },
    })

    type(dialog, /Название/, 'Консультация')
    submit(dialog)

    const idInput = field(dialog, /^id/)
    expect(await within(dialog).findByText('Тип встречи с таким id уже есть')).toBeInTheDocument()
    expect(idInput).toBeInvalid()
    expect(idInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(within(dialog).getByText('Тип встречи с таким id уже есть').id),
    )
    expect(field(dialog, /Название/)).toHaveValue('Консультация')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('ошибки backend validation_failed — под соответствующими полями', async () => {
    const { dialog } = await openForm({
      status: 400,
      body: {
        code: 'validation_failed',
        message: 'Проверьте поля формы',
        fieldErrors: [{ field: 'name', message: 'Название обязательно, до 100 символов' }],
      },
    })

    type(dialog, /Название/, 'Консультация')
    submit(dialog)

    expect(await within(dialog).findByText('Название обязательно, до 100 символов')).toBeInTheDocument()
    expect(field(dialog, /Название/)).toBeInvalid()
  })
})
