import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi } from '../test/api'
import { renderAt } from '../test/render'

// Пояс браузера в тестах — Europe/Moscow (UTC+3).
const booking = {
  id: '6f1c2d4e-0b7a-4a51-9a63-2f0d8f6c1e10',
  meetingTypeId: 'consultation',
  meetingTypeName: 'Консультация',
  startAt: '2026-11-16T07:00:00Z',
  endAt: '2026-11-16T08:00:00Z',
  guestName: 'Мария Смирнова',
  guestEmail: 'maria@example.com',
  comment: 'Про контракт API',
  createdAt: '2026-11-12T03:00:00Z',
}
const owner = { name: 'Анна Смирнова', bio: 'Консультации по Kotlin', timeZone: 'Asia/Almaty' }

const openConfirmation = () => {
  mockApi({
    'GET /api/owner': { body: owner },
    [`GET /api/bookings/${booking.id}`]: { body: booking },
  })
  renderAt(`/booking/${booking.id}`)
}

describe('подтверждение', () => {
  it('по адресу Бронирования показывает Тип встречи, время, пояс и данные Гостя', async () => {
    openConfirmation()

    expect(await screen.findByRole('heading', { name: 'Вы записаны' })).toBeInTheDocument()
    expect(screen.getByText('Консультация')).toBeInTheDocument()
    expect(screen.getByText('понедельник, 16 ноября, 10:00–11:00')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Время показано в вашем часовом поясе (Europe/Moscow). Владелец работает по времени Алматы, пн–пт 09:00–18:00.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Мария Смирнова · maria@example.com')).toBeInTheDocument()
  })

  it('«Записаться ещё» ведёт на страницу записи того же Типа встречи', async () => {
    openConfirmation()

    expect(await screen.findByRole('link', { name: 'Записаться ещё' })).toHaveAttribute(
      'href',
      '/book/consultation',
    )
  })

  it('«Добавить в календарь» отдаёт .ics с временем встречи в UTC', async () => {
    openConfirmation()

    const link = await screen.findByRole('link', { name: 'Добавить в календарь' })
    expect(link).toHaveAttribute('download', 'meeting.ics')
    const href = link.getAttribute('href') ?? ''
    expect(href).toMatch(/^data:text\/calendar;charset=utf-8,/)
    const ics = decodeURIComponent(href.slice(href.indexOf(',') + 1))
    expect(ics.split('\r\n')).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        `UID:${booking.id}`,
        'DTSTART:20261116T070000Z',
        'DTEND:20261116T080000Z',
        'SUMMARY:Консультация',
        'END:VEVENT',
        'END:VCALENDAR',
      ]),
    )
  })

  it('сообщает, что Бронирование не найдено, по ответу 404', async () => {
    mockApi({
      'GET /api/bookings/unknown': {
        status: 404,
        body: { code: 'booking_not_found', message: 'Бронирование не найдено' },
      },
    })
    renderAt('/booking/unknown')

    expect(
      await screen.findByRole('heading', { name: 'Бронирование не найдено' }),
    ).toBeInTheDocument()
  })
})
