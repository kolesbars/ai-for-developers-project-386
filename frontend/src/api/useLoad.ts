import { type DependencyList, useEffect, useState } from 'react'
import { api, type components } from './client'

/** Состояние загрузки ресурса API; `not-found` — ответ 404. */
export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'not-found' }
  | { state: 'error' }
  | { state: 'ready'; data: T }

/**
 * Загружает ресурс при монтировании и при смене [deps]; `data` нет — ошибка (openapi-fetch не бросает
 * на 4xx/5xx). Второй элемент — правка загруженных данных (например, добавить созданный Тип встречи).
 */
export function useLoad<T>(
  load: () => Promise<{ data?: T; response: Response }>,
  deps: DependencyList,
): [Loadable<T>, (update: (data: T) => T) => void] {
  const [value, setValue] = useState<Loadable<T>>({ state: 'loading' })
  useEffect(() => {
    let active = true
    load().then(
      ({ data, response }) => {
        if (!active) return
        if (data !== undefined) setValue({ state: 'ready', data })
        else setValue({ state: response.status === 404 ? 'not-found' : 'error' })
      },
      () => active && setValue({ state: 'error' }),
    )
    return () => {
      active = false
    }
    // Зависимости задаёт вызывающий: `load` — новая функция на каждом рендере.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  const update = (change: (data: T) => T) =>
    setValue((current) => (current.state === 'ready' ? { state: 'ready', data: change(current.data) } : current))
  return [value, update]
}

type Owner = components['schemas']['Owner']

/** Профиль Владельца — украшение страниц Гостя: пока не загружен или при ошибке — `null`. */
export function useOwner(): Owner | null {
  const [owner] = useLoad(() => api.GET('/api/owner'), [])
  return owner.state === 'ready' ? owner.data : null
}
