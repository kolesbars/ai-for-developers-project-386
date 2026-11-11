import { Alert, Anchor, Container, Loader, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, type components } from '../api/client'
import { homePath } from '../routes'

type MeetingType = components['schemas']['MeetingType']

type Page =
  | { state: 'loading' }
  | { state: 'not-found' }
  | { state: 'error' }
  | { state: 'ready'; meetingType: MeetingType }

export function BookingPage() {
  const { id = '' } = useParams()
  const [page, setPage] = useState<Page>({ state: 'loading' })

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types/{id}', { params: { path: { id } } }).then(
      ({ data, response }) => {
        if (!active) return
        if (data) setPage({ state: 'ready', meetingType: data })
        else setPage({ state: response.status === 404 ? 'not-found' : 'error' })
      },
      () => active && setPage({ state: 'error' }),
    )
    return () => {
      active = false
    }
  }, [id])

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Anchor component={Link} to={homePath}>
          ← Назад
        </Anchor>
        {page.state === 'loading' && <Loader aria-label="Загрузка" />}
        {page.state === 'not-found' && <Title order={1}>Тип встречи не найден</Title>}
        {page.state === 'error' && (
          <Alert color="red" role="alert">
            Не удалось загрузить тип встречи. Обновите страницу.
          </Alert>
        )}
        {page.state === 'ready' && (
          <>
            <Title order={1}>Запись на «{page.meetingType.name}»</Title>
            <Text>Скоро здесь появится выбор времени.</Text>
          </>
        )}
      </Stack>
    </Container>
  )
}
