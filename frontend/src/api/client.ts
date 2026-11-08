import createClient from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Типизированный клиент API. Типы генерируются из api/openapi/openapi.yaml
 * командой `mise run api:sdk` — schema.d.ts вручную не редактировать.
 */
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? globalThis.location?.origin,
  // Берём fetch в момент вызова, а не при импорте модуля (удобно для тестов).
  fetch: (request) => globalThis.fetch(request),
})

export type { components, paths } from './schema'
