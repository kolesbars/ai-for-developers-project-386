import { Alert, Button, Card, Container, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api, type components } from '../api/client'
import { formatDuration } from '../format'
import { bookingPath } from '../routes'

type MeetingType = components['schemas']['MeetingType']

type Catalog =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; meetingTypes: MeetingType[] }

// Временный профиль до GET /api/owner (тикет #15).
const owner = {
  name: 'Владелец календаря',
  bio: 'Выберите удобное время для встречи',
}

export function HomePage() {
  const [catalog, setCatalog] = useState<Catalog>({ state: 'loading' })

  useEffect(() => {
    let active = true
    api
      .GET('/api/meeting-types')
      .then(({ data }) => data ?? Promise.reject(new Error('no data')))
      .then(
        (meetingTypes) => active && setCatalog({ state: 'ready', meetingTypes }),
        () => active && setCatalog({ state: 'error' }),
      )
    return () => {
      active = false
    }
  }, [])

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={1}>Календарь звонков</Title>
          <Text size="lg">
            Здравствуйте! Здесь можно записаться на звонок с владельцем: выберите тип встречи,
            удобный день и время — подтверждение придёт сразу.
          </Text>
        </Stack>

        <Stack gap={4} component="section" aria-label="Владелец">
          <Title order={2}>{owner.name}</Title>
          <Text c="dimmed">{owner.bio}</Text>
        </Stack>

        <section aria-label="Типы встреч">
          {catalog.state === 'loading' && <Loader aria-label="Загрузка" />}
          {catalog.state === 'error' && (
            <Alert color="red" role="alert">
              Не удалось загрузить типы встреч. Обновите страницу.
            </Alert>
          )}
          {catalog.state === 'ready' && catalog.meetingTypes.length === 0 && (
            <Text c="dimmed">Пока нет доступных типов встреч.</Text>
          )}
          {catalog.state === 'ready' && catalog.meetingTypes.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {catalog.meetingTypes.map((type) => (
                <Card key={type.id} withBorder padding="lg" component="article">
                  <Stack gap="xs" h="100%">
                    <Title order={3}>{type.name}</Title>
                    {type.description && <Text>{type.description}</Text>}
                    <Text c="dimmed" size="sm">
                      {formatDuration(type.durationMinutes)}
                    </Text>
                    <Button component={Link} to={bookingPath(type.id)} mt="auto" fullWidth>
                      Выбрать время
                    </Button>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </section>
      </Stack>
    </Container>
  )
}
