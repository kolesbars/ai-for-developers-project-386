// Временные данные до появления API: форма совпадает с будущим контрактом,
// чтобы при переходе на backend заменился только источник данных.

export type Owner = {
  name: string
  bio: string
}

export type MeetingType = {
  id: string
  title: string
  description: string
  durationMinutes: number
}

export const owner: Owner = {
  name: 'Владелец календаря',
  bio: 'Выберите удобное время для встречи',
}

export const meetingTypes: MeetingType[] = [
  {
    id: 'intro',
    title: 'Знакомство',
    description: 'Короткий разговор, чтобы познакомиться и обсудить задачу.',
    durationMinutes: 15,
  },
  {
    id: 'consultation',
    title: 'Консультация',
    description: 'Подробный разбор вашего вопроса с рекомендациями.',
    durationMinutes: 60,
  },
]

export const findMeetingType = (id: string): MeetingType | undefined =>
  meetingTypes.find((type) => type.id === id)
