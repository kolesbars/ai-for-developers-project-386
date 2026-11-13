import { Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { components } from '../../api/client'
import { dayKey, formatDay, formatRange, groupByDay } from '../booking/schedule'

export type Booking = components['schemas']['Booking']

/** Встречи по дням браузера (spec §6); порядок — как пришёл с сервера (по возрастанию `startAt`). */
const byDay = (bookings: Booking[]) => [...groupByDay(bookings).values()]

/** Раздел «Предстоящие встречи»: лента по дням или пустое состояние (spec §7). */
export function UpcomingMeetings({ bookings }: { bookings: Booking[] }) {
  return (
    <Stack>
      <Title order={2}>Предстоящие встречи</Title>
      {bookings.length === 0 && (
        <Paper withBorder p="xl" ta="center" c="dimmed">
          Пока никто не записался. Поделитесь ссылкой на Тип встречи.
        </Paper>
      )}
      {byDay(bookings).map((day) => {
        const label = formatDay(new Date(day[0].startAt))
        return (
          <Stack key={dayKey(day[0].startAt)} gap="xs" component="section" aria-label={label}>
            <Title order={3} size="h4" tt="capitalize">
              {label}
            </Title>
            {day.map((booking) => (
              <Paper key={booking.id} withBorder p="md" component="article">
                <Group gap="xs">
                  <Text fw={600}>{formatRange(booking)}</Text>
                  <Badge variant="light">{booking.meetingTypeName}</Badge>
                </Group>
                <Text size="sm" mt={4}>
                  {booking.guestName} ·{' '}
                  <Anchor href={`mailto:${booking.guestEmail}`} size="sm">
                    {booking.guestEmail}
                  </Anchor>
                </Text>
                {booking.comment && (
                  <Text size="sm" c="dimmed" mt={4}>
                    «{booking.comment}»
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
