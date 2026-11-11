import { MantineProvider } from '@mantine/core'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { meetingTypes, owner } from './data/catalog'
import { formatDuration } from './format'
import { bookingPath } from './routes'

const renderAt = (path: string) =>
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )

describe('главная страница', () => {
  it('показывает приветствие и Владельца', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Здравствуйте! Здесь можно записаться на звонок с владельцем: выберите тип встречи, удобный день и время — подтверждение придёт сразу.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: owner.name })).toBeInTheDocument()
    expect(screen.getByText(owner.bio)).toBeInTheDocument()
  })

  it('показывает типы встреч со ссылками на запись', () => {
    renderAt('/')

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(meetingTypes.length)

    meetingTypes.forEach((type, index) => {
      const card = within(cards[index])
      expect(card.getByRole('heading', { name: type.title })).toBeInTheDocument()
      expect(card.getByText(type.description)).toBeInTheDocument()
      expect(card.getByText(formatDuration(type.durationMinutes))).toBeInTheDocument()
      expect(card.getByRole('link', { name: 'Выбрать время' })).toHaveAttribute(
        'href',
        bookingPath(type.id),
      )
    })
  })
})

describe('страница записи (заглушка)', () => {
  it.each(meetingTypes)('показывает тип встречи «$title»', (type) => {
    renderAt(bookingPath(type.id))

    expect(screen.getByRole('heading', { name: `Запись на «${type.title}»` })).toBeInTheDocument()
    expect(screen.getByText('Скоро здесь появится выбор времени.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Назад' })).toHaveAttribute('href', '/')
  })

  it('сообщает, что тип встречи не найден', () => {
    renderAt(bookingPath('unknown'))

    expect(screen.getByRole('heading', { name: 'Тип встречи не найден' })).toBeInTheDocument()
  })
})

describe('неизвестный адрес', () => {
  it('показывает страницу «не найдена» со ссылкой на главную', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/')
  })
})
