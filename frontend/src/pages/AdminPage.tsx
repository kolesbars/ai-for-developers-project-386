import { Alert, Avatar, Badge, Box, Container, Flex, Group, Loader, NavLink, Stack, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api, type components } from '../api/client'
import { initials } from '../format'
import { homePath } from '../routes'
import { type MeetingType, MeetingTypesSection } from './admin/MeetingTypesSection'
import { type Booking, UpcomingMeetings } from './admin/UpcomingMeetings'

type Owner = components['schemas']['Owner']

type Loadable<T> = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: T }

/** Загружает данные раздела; `data` нет — ошибка (openapi-fetch не бросает на 4xx/5xx). */
function useLoad<T>(load: () => Promise<{ data?: T }>): Loadable<T> {
  const [value, setValue] = useState<Loadable<T>>({ state: 'loading' })
  useEffect(() => {
    let active = true
    load()
      .then(({ data }) => data ?? Promise.reject(new Error('no data')))
      .then(
        (data) => active && setValue({ state: 'ready', data }),
        () => active && setValue({ state: 'error' }),
      )
    return () => {
      active = false
    }
    // Загрузка один раз при открытии страницы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return value
}

const count = (value: Loadable<unknown[]>) =>
  value.state === 'ready' && (
    <Badge size="sm" variant="light">
      {value.data.length}
    </Badge>
  )

function Section<T>({ value, children }: { value: Loadable<T>; children: (data: T) => React.ReactNode }) {
  if (value.state === 'loading') return <Loader aria-label="Загрузка" />
  if (value.state === 'error')
    return (
      <Alert color="red" role="alert">
        Не удалось загрузить данные. Обновите страницу.
      </Alert>
    )
  return children(value.data)
}

/** Админка Владельца `/admin` (spec §7): боковое меню и разделы. */
export function AdminPage() {
  const owner = useLoad<Owner>(() => api.GET('/api/owner'))
  const bookings = useLoad<Booking[]>(() => api.GET('/api/bookings'))
  const meetingTypes = useLoad<MeetingType[]>(() => api.GET('/api/meeting-types'))
  const [section, setSection] = useState<'meetings' | 'types'>('meetings')

  return (
    <Container size="lg" py="xl">
      <Flex direction={{ base: 'column', sm: 'row' }} gap="xl" align="flex-start">
        <Stack w={{ base: '100%', sm: 240 }} gap={4} component="nav" aria-label="Разделы админки">
          {owner.state === 'ready' && (
            <Group gap="sm" mb="md" wrap="nowrap">
              <Avatar color="violet" radius="xl" aria-hidden>
                {initials(owner.data.name)}
              </Avatar>
              <Box>
                <Text fw={600} size="sm">
                  {owner.data.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {owner.data.timeZone}
                </Text>
              </Box>
            </Group>
          )}
          <NavLink
            component="button"
            label="Предстоящие встречи"
            active={section === 'meetings'}
            onClick={() => setSection('meetings')}
            rightSection={count(bookings)}
          />
          <NavLink
            component="button"
            label="Типы встреч"
            active={section === 'types'}
            onClick={() => setSection('types')}
            rightSection={count(meetingTypes)}
          />
          <NavLink label="Открыть страницу для Гостей ↗" component={Link} to={homePath} />
        </Stack>
        <Box style={{ flex: 1 }} w="100%">
          {section === 'meetings' ? (
            <Section value={bookings}>{(data) => <UpcomingMeetings bookings={data} />}</Section>
          ) : (
            // #21: «+ Новый тип» с модальным окном — в `actions`, после создания перезагрузить список.
            <Section value={meetingTypes}>{(data) => <MeetingTypesSection meetingTypes={data} />}</Section>
          )}
        </Box>
      </Flex>
    </Container>
  )
}
