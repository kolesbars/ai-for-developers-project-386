import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    proxy: {
      '/api': backendUrl,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Пояс «браузера» в тестах фиксирован и отличается от пояса Владельца (Asia/Almaty, UTC+5),
    // чтобы тесты ловили показ времени не в том поясе.
    env: { TZ: 'Europe/Moscow' },
  },
})
