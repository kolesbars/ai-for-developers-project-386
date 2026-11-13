import {
  Alert,
  Avatar,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Link } from 'react-router'
import { api } from '../api/client'
import { useLoad, useOwner } from '../api/useLoad'
import { formatDuration, initials } from '../format'
import { bookingPath } from '../routes'

export function HomePage() {
  const [catalog] = useLoad(() => api.GET('/api/meeting-types'), [])
  // Профиль — украшение каталога: при ошибке блок просто не показывается.
  const owner = useOwner()

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={1}>Календарь звонков</Title>
          <Text size="lg">
            Здравствуйте! Здесь можно записаться на звонок с владельцем: выберите тип встречи,
            удобный день и время. Регистрация не нужна.
          </Text>
        </Stack>

        {owner && (
          <Group gap="md" wrap="nowrap" component="section" aria-label="Владелец">
            <Avatar size="lg" radius="xl" color="violet" aria-hidden>
              {initials(owner.name)}
            </Avatar>
            <Stack gap={4}>
              <Title order={2}>{owner.name}</Title>
              {owner.bio && <Text c="dimmed">{owner.bio}</Text>}
            </Stack>
          </Group>
        )}

        <section aria-label="Типы встреч">
          {catalog.state === 'loading' && <Loader aria-label="Загрузка" />}
          {(catalog.state === 'error' || catalog.state === 'not-found') && (
            <Alert color="red" role="alert">
              Не удалось загрузить типы встреч. Обновите страницу.
            </Alert>
          )}
          {catalog.state === 'ready' && catalog.data.length === 0 && (
            <Text c="dimmed">Пока нет доступных типов встреч.</Text>
          )}
          {catalog.state === 'ready' && catalog.data.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {catalog.data.map((type) => (
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
