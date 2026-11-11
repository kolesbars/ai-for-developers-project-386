import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router'
import { findMeetingType } from '../data/catalog'
import { homePath } from '../routes'

export function BookingPage() {
  const { id } = useParams()
  const meetingType = id ? findMeetingType(id) : undefined

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Anchor component={Link} to={homePath}>
          ← Назад
        </Anchor>
        {meetingType ? (
          <>
            <Title order={1}>Запись на «{meetingType.title}»</Title>
            <Text>Скоро здесь появится выбор времени.</Text>
          </>
        ) : (
          <Title order={1}>Тип встречи не найден</Title>
        )}
      </Stack>
    </Container>
  )
}
