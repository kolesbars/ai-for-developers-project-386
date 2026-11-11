import '@mantine/core/styles.css'

import { createTheme, MantineProvider } from '@mantine/core'

// PROTOTYPE: визуальное направление — фиолетовый акцент, мягкие скругления.
const theme = createTheme({ primaryColor: 'violet', defaultRadius: 'md', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' })
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)
