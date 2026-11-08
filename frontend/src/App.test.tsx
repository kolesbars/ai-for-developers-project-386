import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

const renderApp = () =>
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )

describe('App (smoke)', () => {
  it('рендерится и показывает, что backend отвечает', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    renderApp()

    expect(screen.getByRole('heading', { name: 'Календарь звонков' })).toBeInTheDocument()
    expect(await screen.findByText('работает')).toBeInTheDocument()
  })

  it('показывает недоступность backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    renderApp()

    expect(await screen.findByText('недоступен')).toBeInTheDocument()
  })
})
