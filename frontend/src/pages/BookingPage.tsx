import { Alert, Anchor, Box, Container, Loader, Paper, SimpleGrid, Stack, Title } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, type components } from '../api/client'
import { homePath } from '../routes'
import { BookingSummary } from './booking/BookingSummary'
import type { Slot } from './booking/schedule'
import { SlotPicker } from './booking/SlotPicker'

type MeetingType = components['schemas']['MeetingType']
type Owner = components['schemas']['Owner']

type Page =
  | { state: 'loading' }
  | { state: 'not-found' }
  | { state: 'error' }
  | { state: 'ready'; meetingType: MeetingType }

type Schedule = { state: 'loading' } | { state: 'error' } | { state: 'ready'; slots: Slot[] }

export function BookingPage() {
  const { id = '' } = useParams()
  const [page, setPage] = useState<Page>({ state: 'loading' })
  // Профиль Владельца — украшение сводки: без него страница всё равно работает.
  const [owner, setOwner] = useState<Owner | null>(null)
  const [schedule, setSchedule] = useState<Schedule>({ state: 'loading' })
  const [selected, setSelected] = useState<Slot>()

  useEffect(() => {
    let active = true
    api.GET('/api/owner').then(
      ({ data }) => active && data && setOwner(data),
      () => {},
    )
    return () => {
      active = false
    }
  }, [])

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

  /** Загружает актуальное расписание; #19 вызывает её же после конфликта при записи. */
  const loadSlots = useCallback(
    () =>
      api.GET('/api/meeting-types/{id}/slots', { params: { path: { id } } }).then(
        ({ data }) => (data ? { state: 'ready' as const, slots: data } : { state: 'error' as const }),
        () => ({ state: 'error' as const }),
      ),
    [id],
  )

  useEffect(() => {
    let active = true
    loadSlots().then((next) => active && setSchedule(next))
    return () => {
      active = false
    }
  }, [loadSlots])

  // Шов для #19: здесь откроется форма «Ваши данные» вместо календаря и списка времени.
  const continueWith = (slot: Slot) => setSelected(slot)

  return (
    <Container size="lg" py="xl">
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
          <Paper withBorder radius="lg">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing={0}>
              <BookingSummary meetingType={page.meetingType} owner={owner} selected={selected} />
              {schedule.state === 'loading' && (
                <Box p="lg">
                  <Loader aria-label="Загрузка расписания" />
                </Box>
              )}
              {schedule.state === 'error' && (
                <Box p="lg">
                  <Alert color="red" role="alert">
                    Не удалось загрузить расписание. Обновите страницу.
                  </Alert>
                </Box>
              )}
              {schedule.state === 'ready' && (
                <SlotPicker
                  slots={schedule.slots}
                  selected={selected}
                  onSelect={setSelected}
                  onContinue={continueWith}
                />
              )}
            </SimpleGrid>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
