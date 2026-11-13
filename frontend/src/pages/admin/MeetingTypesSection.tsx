import { Badge, Box, Button, CopyButton, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import type { components } from '../../api/client'
import { formatDuration } from '../../format'
import { bookingPath } from '../../routes'

export type MeetingType = components['schemas']['MeetingType']

function CopyLink({ path }: { path: string }) {
  return (
    <CopyButton value={`${globalThis.location?.origin ?? ''}${path}`}>
      {({ copied, copy }) => (
        <Button size="xs" variant="subtle" onClick={copy}>
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </Button>
      )}
    </CopyButton>
  )
}

/**
 * Раздел «Типы встреч» (spec §7). `actions` — место в заголовке под «+ Новый тип» (#21).
 */
export function MeetingTypesSection({
  meetingTypes,
  actions,
}: {
  meetingTypes: MeetingType[]
  actions?: ReactNode
}) {
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Типы встреч</Title>
        {actions}
      </Group>
      {meetingTypes.length === 0 && (
        <Paper withBorder p="xl" ta="center" c="dimmed">
          Типов встреч пока нет.
        </Paper>
      )}
      {meetingTypes.map((type) => (
        <Paper key={type.id} withBorder p="md" component="article">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Box>
              <Group gap="xs">
                <Text fw={600}>{type.name}</Text>
                <Badge variant="light">{formatDuration(type.durationMinutes)}</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {bookingPath(type.id)}
              </Text>
              {type.description && (
                <Text size="sm" mt={4}>
                  {type.description}
                </Text>
              )}
            </Box>
            <CopyLink path={bookingPath(type.id)} />
          </Group>
        </Paper>
      ))}
    </Stack>
  )
}
