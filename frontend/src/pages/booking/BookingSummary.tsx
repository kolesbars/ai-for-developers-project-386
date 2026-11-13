import { Avatar, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { components } from '../../api/client'
import { formatDuration, initials, timeZoneNote } from '../../format'
import { formatDay, formatRange, type Slot } from './schedule'

type MeetingType = components['schemas']['MeetingType']
type Owner = components['schemas']['Owner']

/** Левая панель страницы записи: кто, что, сколько длится и в каком поясе показано время. */
export function BookingSummary({
  meetingType,
  owner,
  selected,
}: {
  meetingType: MeetingType
  owner: Owner | null
  selected: Slot | undefined
}) {
  return (
    <Stack gap="xs" p="lg" component="section" aria-label="Сводка">
      {owner && (
        <Group gap="sm">
          <Avatar color="violet" radius="xl" aria-hidden>
            {initials(owner.name)}
          </Avatar>
          <Text fw={500}>{owner.name}</Text>
        </Group>
      )}
      <Title order={1} size="h2">
        {meetingType.name}
      </Title>
      <Badge variant="light" w="fit-content">
        {formatDuration(meetingType.durationMinutes)}
      </Badge>
      {meetingType.description && (
        <Text c="dimmed" size="sm">
          {meetingType.description}
        </Text>
      )}
      {selected && (
        <Paper bg="var(--mantine-primary-color-light)" p="sm" aria-label="Выбранное время">
          <Text size="sm" fw={600}>
            {formatDay(new Date(selected.startAt))}
          </Text>
          <Text size="sm">{formatRange(selected)}</Text>
        </Paper>
      )}
      <Text size="xs" c="dimmed">
        {timeZoneNote(owner?.timeZone)}
      </Text>
    </Stack>
  )
}
