import { describe, expect, it } from 'vitest'
import { slugify } from './meetingTypeForm'

describe('slugify — id из названия транслитом', () => {
  it.each([
    ['Консультация', 'konsultatsiya'],
    ['Разбор кода 1:1', 'razbor-koda-1-1'],
    ['  Щука и ёж!  ', 'schuka-i-ezh'],
    ['Code Review', 'code-review'],
    ['Подъём', 'podem'],
  ])('%s → %s', (name, id) => {
    expect(slugify(name)).toBe(id)
  })

  it('не длиннее 40 символов и без висячего дефиса', () => {
    expect(slugify('Очень длинное название встречи для проверки обрезки')).toBe(
      'ochen-dlinnoe-nazvanie-vstrechi-dlya-pro',
    )
    expect(slugify(`${'x'.repeat(39)} yz`)).toBe('x'.repeat(39))
  })
})
