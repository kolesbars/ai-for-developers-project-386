import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import { theme } from '../theme'

/** Рендерит всё приложение на адресе `path` — так же, как `main.tsx`, но с `MemoryRouter`. */
export const renderAt = (path: string) =>
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
