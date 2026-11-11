import { vi } from 'vitest'

type Reply = { status?: number; body: unknown }

/**
 * Подменяет backend на уровне `fetch`, через который ходит `api` из `src/api/client.ts`.
 * Ключ — `'METHOD /path'` (без query), значение — ответ. Незаявленный запрос — 501, чтобы тест
 * сразу показал, куда страница пошла без спроса.
 *
 * @returns шпион `fetch` — по нему можно проверить отправленные запросы.
 */
export function mockApi(routes: Record<string, Reply>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input instanceof Request ? input : new Request(input)
    const key = `${request.method} ${new URL(request.url).pathname}`
    const reply = routes[key] ?? { status: 501, body: { code: 'not_mocked', message: key } }
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
