import {
  Alert,
  Anchor,
  Avatar,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Link, useParams } from 'react-router'
import { api, type components } from '../api/client'
import { useLoad, useOwner } from '../api/useLoad'
import { timeZoneNote } from '../format'
import { bookingPath, homePath } from '../routes'
import { icsHref } from './booking/ics'
import { formatDay, formatRange } from './booking/schedule'

type Booking = components['schemas']['Booking']
type Owner = components['schemas']['Owner']

/** Подтверждение `/booking/{bookingId}`: всё берётся с сервера, поэтому переживает перезагрузку. */
export function ConfirmationPage() {
  const { bookingId = '' } = useParams()
  const [page] = useLoad(() => api.GET('/api/bookings/{id}', { params: { path: { id: bookingId } } }), [bookingId])
  // Пояс Владельца для подсказки; без профиля подсказка — без него.
  const owner = useOwner()

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Anchor component={Link} to={homePath}>
          ← В каталог
        </Anchor>
        {page.state === 'loading' && <Loader aria-label="Загрузка" />}
        {page.state === 'not-found' && <Title order={1}>Бронирование не найдено</Title>}
        {page.state === 'error' && (
          <Alert color="red" role="alert">
            Не удалось загрузить бронирование. Обновите страницу.
          </Alert>
        )}
        {page.state === 'ready' && <Confirmation booking={page.data} owner={owner} />}
      </Stack>
    </Container>
  )
}

function Confirmation({ booking, owner }: { booking: Booking; owner: Owner | null }) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack gap="md" align="center" ta="center">
        <Avatar color="teal" radius="xl" size="lg" aria-hidden>
          ✓
        </Avatar>
        <Title order={1} size="h2">
          Вы записаны
        </Title>
        <Stack gap={4}>
          <Text fw={600}>{booking.meetingTypeName}</Text>
          <Text>{`${formatDay(new Date(booking.startAt))}, ${formatRange(booking)}`}</Text>
        </Stack>
        <Text size="sm" c="dimmed">
          {timeZoneNote(owner?.timeZone)}
        </Text>
        <Text size="sm">{`${booking.guestName} · ${booking.guestEmail}`}</Text>
        <Group justify="center">
          <Button component="a" href={icsHref(booking)} download="meeting.ics" variant="light">
            Добавить в календарь
          </Button>
          <Button component={Link} to={bookingPath(booking.meetingTypeId)} variant="default">
            Записаться ещё
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
