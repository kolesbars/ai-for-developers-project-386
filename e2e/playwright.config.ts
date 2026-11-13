import { defineConfig, devices } from '@playwright/test'

// Отдельные порты, чтобы не мешать `mise run dev` (8080/5173).
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 18080)
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 14173)
const backendUrl = `http://localhost:${backendPort}`
const frontendUrl = `http://localhost:${frontendPort}`

/**
 * Два проекта поверх настоящих серверов:
 * - `api` — прямые HTTP-запросы (`request`) к backend;
 * - `e2e` — браузер против собранного frontend (vite preview проксирует /api на backend).
 *
 * Backend — собранный fat jar (`mise run build:backend`) с embedded PostgreSQL: каждый запуск
 * начинается с пустой БД. Frontend — собранный `frontend/dist` (`mise run build:frontend`).
 * Браузер — установленный Google Chrome (`channel: 'chrome'`), без загрузки Chromium.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: backendUrl },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: frontendUrl },
    },
  ],
  webServer: [
    {
      command: 'java -jar ../backend/build/libs/calendar-backend.jar',
      env: { BACKEND_PORT: String(backendPort) },
      url: `${backendUrl}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx vite preview --port ${frontendPort} --strictPort`,
      cwd: '../frontend',
      env: { BACKEND_URL: backendUrl },
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
