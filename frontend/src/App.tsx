import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { api } from './api/client'

type BackendStatus = 'loading' | 'ok' | 'unavailable'

const statusView: Record<BackendStatus, { color: string; label: string }> = {
  loading: { color: 'gray', label: 'проверяем…' },
  ok: { color: 'green', label: 'работает' },
  unavailable: { color: 'red', label: 'недоступен' },
}

export function App() {
  const [status, setStatus] = useState<BackendStatus>('loading')

  useEffect(() => {
    api
      .GET('/api/health')
      .then(({ data }) => setStatus(data?.status === 'ok' ? 'ok' : 'unavailable'))
      .catch(() => setStatus('unavailable'))
  }, [])

  const view = statusView[status]

  return (
    <Container size="sm" py="xl">
      <Stack>
        <Title order={1}>Календарь звонков</Title>
        <Group gap="xs">
          <Text>Backend:</Text>
          <Badge color={view.color}>{view.label}</Badge>
        </Group>
      </Stack>
    </Container>
  )
}
