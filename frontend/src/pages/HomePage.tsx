import { Button, Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { meetingTypes, owner } from '../data/catalog'
import { formatDuration } from '../format'
import { bookingPath } from '../routes'

export function HomePage() {
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

        <SimpleGrid cols={{ base: 1, sm: 2 }} component="section" aria-label="Типы встреч">
          {meetingTypes.map((type) => (
            <Card key={type.id} withBorder radius="md" padding="lg" component="article">
              <Stack gap="xs" h="100%">
                <Title order={3}>{type.title}</Title>
                <Text>{type.description}</Text>
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
      </Stack>
    </Container>
  )
}
