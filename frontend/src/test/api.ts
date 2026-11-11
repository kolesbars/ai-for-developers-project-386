import { vi } from 'vitest'

type Reply = { status?: number; body: unknown }

/**
 * Подменяет backend на уровне `fetch`, через который ходит `api` из `src/api/client.ts`.
 * Ключ — `'METHOD /path'` (без query), значение — ответ или очередь ответов (по одному на запрос,
 * последний повторяется). Незаявленный запрос — 501, чтобы тест сразу показал, куда страница
 * пошла без спроса.
 *
 * @returns шпион `fetch` — по нему можно проверить отправленные запросы.
 */
export function mockApi(routes: Record<string, Reply | Reply[]>) {
  const calls = new Map<string, number>()
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input instanceof Request ? input : new Request(input)
    const key = `${request.method} ${new URL(request.url).pathname}`
    const route = routes[key]
    const n = calls.get(key) ?? 0
    calls.set(key, n + 1)
    const reply = Array.isArray(route)
      ? route[Math.min(n, route.length - 1)]
      : (route ?? { status: 501, body: { code: 'not_mocked', message: key } })
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
