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
    id: 'fe8bce70-67e3-4e23-8ffb-5f344c55496a',
    title: 'Знакомство',
    description: 'Короткий разговор, чтобы познакомиться и обсудить задачу.',
    durationMinutes: 15,
  },
  {
    id: 'ae92ea3e-bd30-42bb-b890-f06f7a00b294',
    title: 'Консультация',
    description: 'Подробный разбор вашего вопроса с рекомендациями.',
    durationMinutes: 30,
  },
]

export const findMeetingType = (id: string): MeetingType | undefined =>
  meetingTypes.find((type) => type.id === id)
