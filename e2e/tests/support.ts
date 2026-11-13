import type { APIRequestContext } from '@playwright/test'

/**
 * Уникальный id Типа встречи для теста: серверы могут переиспользоваться между запусками
 * (`reuseExistingServer` локально), поэтому тесты не рассчитывают на пустую БД.
 */
export const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/** URL backend для прямых запросов из e2e-тестов (в проекте `api` это `baseURL`). */
export const backendUrl =
  process.env.E2E_BASE_URL?.replace(/\/$/, '') ??
  `http://localhost:${process.env.E2E_BACKEND_PORT ?? 18080}`

export async function createMeetingType(
  request: APIRequestContext,
  meetingType: { id: string; name: string; description?: string; durationMinutes: number },
) {
  const response = await request.post(`${backendUrl}/api/meeting-types`, { data: meetingType })
  if (response.status() !== 201) {
    throw new Error(`createMeetingType: ${response.status()} ${await response.text()}`)
  }
  return meetingType
}
