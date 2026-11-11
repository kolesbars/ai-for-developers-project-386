import { Alert, Anchor, Box, Container, Loader, Paper, SimpleGrid, Stack, Title } from '@mantine/core'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api/client'
import { useLoad, useOwner } from '../api/useLoad'
import { confirmationPath, homePath } from '../routes'
import { BookingForm } from './booking/BookingForm'
import { BookingSummary } from './booking/BookingSummary'
import { emptyGuest, type GuestErrors, type GuestValues, validateGuest } from './booking/guest'
import { dayKey, type Slot } from './booking/schedule'
import { SlotPicker } from './booking/SlotPicker'

const SUBMIT_FAILED = 'Не удалось записаться. Попробуйте ещё раз.'

/** Сообщения над списком времени после конфликта при записи (spec §7). */
const CONFLICTS: Record<string, string> = {
  slot_taken: 'Это время только что заняли. Выберите другое — ниже актуальное расписание',
  slot_unavailable: 'Это время больше недоступно',
}

type Schedule = { state: 'loading' } | { state: 'error' } | { state: 'ready'; slots: Slot[] }

export function BookingPage() {
  const { id = '' } = useParams()
  const [page] = useLoad(() => api.GET('/api/meeting-types/{id}', { params: { path: { id } } }), [id])
  // Профиль Владельца — украшение сводки: без него страница всё равно работает.
  const owner = useOwner()
  const [schedule, setSchedule] = useState<Schedule>({ state: 'loading' })
  const [selected, setSelected] = useState<Slot>()
  // Выбор времени или форма «Ваши данные»; данные формы живут здесь и переживают смену шага.
  const [step, setStep] = useState<'pick' | 'details'>('pick')
  const [guest, setGuest] = useState<GuestValues>(emptyGuest)
  const [errors, setErrors] = useState<GuestErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<string>()
  // День, на который Гость вернётся к выбору времени (SlotPicker при смене шага монтируется заново).
  const [day, setDay] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const navigate = useNavigate()

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

  const continueWith = (slot: Slot) => {
    setSelected(slot)
    setDay(dayKey(slot.startAt))
    setNotice(undefined)
    setStep('details')
  }

  const submit = () => {
    const found = validateGuest(guest)
    setErrors(found)
    setFailure(undefined)
    if (Object.keys(found).length || !selected) return
    const comment = guest.comment.trim()
    setSubmitting(true)
    api
      .POST('/api/bookings', {
        body: {
          meetingTypeId: id,
          startAt: selected.startAt,
          guestName: guest.guestName.trim(),
          guestEmail: guest.guestEmail.trim(),
          ...(comment && { comment }),
        },
      })
      .then(
        ({ data, error }) => {
          if (data) return navigate(confirmationPath(data.id))
          const conflict = error && CONFLICTS[error.code]
          if (conflict) {
            // Время заняли или оно ушло из Окна: обратно к выбору, с актуальным расписанием.
            setNotice(conflict)
            setSelected(undefined)
            setStep('pick')
            setSchedule({ state: 'loading' })
            loadSlots().then(setSchedule)
          } else if (error && 'fieldErrors' in error && error.fieldErrors?.length) {
            setErrors(Object.fromEntries(error.fieldErrors.map((e) => [e.field, e.message])))
          } else setFailure(SUBMIT_FAILED)
        },
        () => setFailure(SUBMIT_FAILED),
      )
      .finally(() => setSubmitting(false))
  }

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
            <SimpleGrid cols={{ base: 1, md: step === 'details' ? 2 : 3 }} spacing={0}>
              <BookingSummary meetingType={page.data} owner={owner} selected={selected} />
              {step === 'pick' && schedule.state === 'loading' && (
                <Box p="lg">
                  <Loader aria-label="Загрузка расписания" />
                </Box>
              )}
              {step === 'pick' && schedule.state === 'error' && (
                <Box p="lg">
                  <Alert color="red" role="alert">
                    Не удалось загрузить расписание. Обновите страницу.
                  </Alert>
                </Box>
              )}
              {step === 'details' && (
                <BookingForm
                  values={guest}
                  errors={errors}
                  submitting={submitting}
                  failure={failure}
                  onChange={setGuest}
                  onSubmit={submit}
                  onBack={() => setStep('pick')}
                />
              )}
              {step === 'pick' && schedule.state === 'ready' && (
                <SlotPicker
                  slots={schedule.slots}
                  selected={selected}
                  onSelect={setSelected}
                  onContinue={continueWith}
                  initialDay={day}
                  notice={
                    notice && (
                      <Alert color="orange" role="alert">
                        {notice}
                      </Alert>
                    )
                  }
                />
              )}
            </SimpleGrid>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}
