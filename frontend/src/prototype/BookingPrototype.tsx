// PROTOTYPE — выбросить. Три структурно разных варианта страницы записи Гостя
// на существующем маршруте /book/:id, переключаются ?variant=A|B|C.
import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { findMeetingType, type MeetingType } from '../data/catalog'
import { formatDuration } from '../format'
import {
  browserTimeZone,
  buildSlots,
  createBooking,
  dayPart,
  fmtDayKey,
  fmtDayKeyShort,
  fmtRange,
  fmtTime,
  icsHref,
  localDayKey,
  owner,
  windowDays,
  type Booking,
  type Slot,
} from './mockSchedule'
import { PrototypeSwitcher } from './PrototypeSwitcher'

const VARIANTS = [
  { key: 'A', name: 'Две панели + календарь' },
  { key: 'B', name: 'Лента дней' },
  { key: 'C', name: 'Пошаговый мастер' },
]

const isWeekend = (key: string) => [0, 6].includes(new Date(`${key}T12:00:00`).getDay())
const emptyLabel = (key: string) => (isWeekend(key) ? 'выходной' : 'нет времени')
const initials = owner.name.split(' ').map((w) => w[0]).join('')
const tzNote = `Время показано в вашем часовом поясе (${browserTimeZone}). Владелец работает по времени Алматы, пн–пт 09:00–18:00.`

type Form = { guestName: string; guestEmail: string; comment: string }
type Errors = Partial<Record<keyof Form, string>>

// Общее состояние потока (данные и действия, не раскладка).
function useFlow(type: MeetingType, conflict: boolean) {
  const [version, setVersion] = useState(0)
  const slots = useMemo(() => buildSlots(type.durationMinutes), [type, version])
  const days = useMemo(() => windowDays(), [])
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>()
    for (const s of slots) m.set(localDayKey(s.startAt), [...(m.get(localDayKey(s.startAt)) ?? []), s])
    return m
  }, [slots])
  const firstFree = days.find((d) => byDay.get(d)?.some((s) => s.status === 'available'))
  const [day, setDay] = useState<string | undefined>(firstFree)
  const [slot, setSlot] = useState<Slot>()
  const [form, setForm] = useState<Form>({ guestName: '', guestEmail: '', comment: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [alert, setAlert] = useState<string>()
  const [booking, setBooking] = useState<Booking>()

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.guestName.trim()) e.guestName = 'Укажите имя'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guestEmail)) e.guestEmail = 'Проверьте email'
    if (form.comment.length > 500) e.comment = 'Не больше 500 символов'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const submit = (): 'ok' | 'invalid' | 'conflict' => {
    if (!slot || !validate()) return 'invalid'
    const r = createBooking(
      { meetingTypeId: type.id, startAt: slot.startAt, guestName: form.guestName, guestEmail: form.guestEmail, comment: form.comment || undefined },
      type.durationMinutes,
      conflict,
    )
    if (!r.ok) {
      setAlert(r.message)
      setSlot(undefined)
      setVersion((v) => v + 1)
      return 'conflict'
    }
    setAlert(undefined)
    setBooking(r.booking)
    return 'ok'
  }
  const reset = () => {
    setBooking(undefined)
    setSlot(undefined)
    setVersion((v) => v + 1)
  }
  return { slots, days, byDay, day, setDay, slot, setSlot, form, setForm, errors, alert, setAlert, booking, submit, reset }
}
type Flow = ReturnType<typeof useFlow>

function GuestForm({ flow, onSubmit, submitLabel = 'Записаться' }: { flow: Flow; onSubmit: () => void; submitLabel?: string }) {
  const { form, setForm, errors } = flow
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
    <Stack gap="sm">
      <TextInput label="Имя" required value={form.guestName} error={errors.guestName} onChange={(e) => setForm({ ...form, guestName: e.currentTarget.value })} />
      <TextInput label="Email" type="email" required value={form.guestEmail} error={errors.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.currentTarget.value })} />
      <Textarea label="Комментарий" description="Необязательно: о чём хотите поговорить" autosize minRows={2} value={form.comment} error={errors.comment} onChange={(e) => setForm({ ...form, comment: e.currentTarget.value })} />
      <Button type="submit" size="md">{submitLabel}</Button>
    </Stack>
    </form>
  )
}

function Confirmation({ flow, type }: { flow: Flow; type: MeetingType }) {
  const b = flow.booking!
  return (
    <Paper withBorder radius="lg" p="xl" maw={520} mx="auto">
      <Stack gap="md" align="center" ta="center">
        <Avatar color="teal" radius="xl" size="lg">✓</Avatar>
        <Title order={2}>Вы записаны</Title>
        <Text>
          {type.title} с {owner.name}
          <br />
          <b>{fmtDayKey(localDayKey(b.startAt))}, {fmtRange(b)}</b>
        </Text>
        <Text size="sm" c="dimmed">{tzNote}</Text>
        <Text size="sm">Подтверждение для {b.guestName} · {b.guestEmail}</Text>
        <Text size="xs" c="dimmed">Ссылка на эту страницу: /booking/{b.id.slice(0, 8)}… — переживает перезагрузку</Text>
        <Group>
          <Button component="a" href={icsHref(b, type.title)} download="meeting.ics" variant="light">Добавить в календарь</Button>
          <Button variant="default" onClick={flow.reset}>Записаться ещё</Button>
        </Group>
      </Stack>
    </Paper>
  )
}

function TypeSummary({ type, flow }: { type: MeetingType; flow: Flow }) {
  return (
    <Stack gap="xs">
      <Group gap="sm">
        <Avatar color="violet" radius="xl">{initials}</Avatar>
        <Text fw={500}>{owner.name}</Text>
      </Group>
      <Title order={2}>{type.title}</Title>
      <Badge variant="light" w="fit-content">{formatDuration(type.durationMinutes)}</Badge>
      <Text c="dimmed" size="sm">{type.description}</Text>
      {flow.slot && (
        <Paper bg="violet.0" p="sm" radius="md">
          <Text size="sm" fw={600}>{fmtDayKey(localDayKey(flow.slot.startAt))}</Text>
          <Text size="sm">{fmtRange(flow.slot)}</Text>
        </Paper>
      )}
      <Text size="xs" c="dimmed">{tzNote}</Text>
    </Stack>
  )
}

function SlotButton({ slot, selected, onClick, compact }: { slot: Slot; selected: boolean; onClick: () => void; compact?: boolean }) {
  const busy = slot.status === 'busy'
  return (
    <Button
      variant={selected ? 'filled' : busy ? 'default' : 'outline'}
      disabled={busy}
      onClick={onClick}
      aria-pressed={selected}
      size={compact ? 'xs' : 'sm'}
      fullWidth={!compact}
      styles={busy ? { label: { textDecoration: 'line-through' } } : undefined}
      title={busy ? 'Занято' : undefined}
    >
      {fmtTime(slot.startAt)}
      {busy && !compact && <Text span size="xs" ml={6}>занято</Text>}
    </Button>
  )
}

// ── A: две панели + календарная сетка (как Cal.com, но со сводкой и подсказкой о поясе)
function VariantA({ type, flow }: { type: MeetingType; flow: Flow }) {
  const [formOpen, setFormOpen] = useState(false)
  if (flow.booking) return <Confirmation flow={flow} type={type} />
  const first = new Date(`${flow.days[0]}T12:00:00`)
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = [...Array(lead).fill(null), ...flow.days]
  const daySlots = flow.day ? flow.byDay.get(flow.day) ?? [] : []
  return (
    <Paper withBorder radius="lg" p={0}>
      <SimpleGrid cols={{ base: 1, md: formOpen ? 2 : 3 }} spacing={0}>
        <Box p="lg" style={{ borderRight: '1px solid var(--mantine-color-gray-3)' }}>
          <TypeSummary type={type} flow={flow} />
        </Box>
        {formOpen ? (
          <Box p="lg">
            <Group justify="space-between" mb="sm">
              <Title order={3}>Ваши данные</Title>
              <Anchor component="button" size="sm" onClick={() => setFormOpen(false)}>← Другое время</Anchor>
            </Group>
            <GuestForm flow={flow} onSubmit={() => { if (flow.submit() === 'conflict') setFormOpen(false) }} />
          </Box>
        ) : (
          <>
            <Box p="lg">
              <Title order={4} mb="sm">Выберите день</Title>
              <SimpleGrid cols={7} spacing={4}>
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <Text key={d} size="xs" c="dimmed" ta="center">{d}</Text>)}
                {cells.map((key, i) => {
                  if (!key) return <span key={i} />
                  const free = flow.byDay.get(key)?.filter((s) => s.status === 'available').length ?? 0
                  const sel = key === flow.day
                  return (
                    <UnstyledButton
                      key={key}
                      disabled={!free}
                      onClick={() => { flow.setDay(key); flow.setSlot(undefined) }}
                      aria-pressed={sel}
                      title={free ? `Свободно: ${free}` : 'Нет свободного времени'}
                      style={{
                        aspectRatio: '1', borderRadius: 8, textAlign: 'center',
                        background: sel ? 'var(--mantine-color-violet-6)' : free ? 'var(--mantine-color-violet-0)' : 'transparent',
                        color: sel ? 'white' : free ? 'var(--mantine-color-violet-9)' : 'var(--mantine-color-gray-4)',
                        fontWeight: free ? 600 : 400, cursor: free ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {new Date(`${key}T12:00:00`).getDate()}
                    </UnstyledButton>
                  )
                })}
              </SimpleGrid>
              <Text size="xs" c="dimmed" mt="sm">Доступны ближайшие 14 дней. Серым — выходные и дни без свободного времени.</Text>
            </Box>
            <Box p="lg" style={{ borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
              {flow.alert && <Alert color="red" mb="sm" withCloseButton onClose={() => flow.setAlert(undefined)}>{flow.alert}</Alert>}
              <Title order={4} mb="sm">{flow.day ? fmtDayKey(flow.day) : 'Нет свободных дней'}</Title>
              <ScrollArea h={360}>
                <Stack gap={6}>
                  {daySlots.map((s) => (
                    <SlotButton key={s.startAt} slot={s} selected={flow.slot?.startAt === s.startAt} onClick={() => flow.setSlot(s)} />
                  ))}
                </Stack>
              </ScrollArea>
              <Button mt="md" fullWidth disabled={!flow.slot} onClick={() => setFormOpen(true)}>
                {flow.slot ? `Продолжить · ${fmtRange(flow.slot)}` : 'Выберите время'}
              </Button>
            </Box>
          </>
        )}
      </SimpleGrid>
    </Paper>
  )
}

// ── B: лента дней сверху вниз, время сгруппировано, липкая панель выбора + форма в выдвижной панели
function VariantB({ type, flow }: { type: MeetingType; flow: Flow }) {
  const [open, setOpen] = useState(false)
  if (flow.booking) return <Confirmation flow={flow} type={type} />
  return (
    <Stack gap="lg" pb={120}>
      <Group align="flex-start" justify="space-between">
        <Stack gap={4}>
          <Text c="dimmed" size="sm">{owner.name}</Text>
          <Title order={1}>{type.title} · {formatDuration(type.durationMinutes)}</Title>
          <Text c="dimmed">{type.description}</Text>
        </Stack>
      </Group>
      <Alert variant="light" color="gray">{tzNote}</Alert>
      {flow.alert && <Alert color="red" withCloseButton onClose={() => flow.setAlert(undefined)}>{flow.alert}</Alert>}
      {flow.days.map((key) => {
        const ds = flow.byDay.get(key)
        if (!ds) return (
          <Text key={key} c="dimmed" size="sm">{fmtDayKey(key)} — {emptyLabel(key)}</Text>
        )
        const free = ds.filter((s) => s.status === 'available').length
        const parts = ['Утро', 'День', 'Вечер'].map((p) => [p, ds.filter((s) => dayPart(s.startAt) === p)] as const).filter(([, l]) => l.length)
        return (
          <Box key={key}>
            <Group gap="xs" mb={6}>
              <Title order={4} tt="capitalize">{fmtDayKey(key)}</Title>
              <Badge variant="light" color={free ? 'violet' : 'gray'}>{free ? `свободно ${free}` : 'всё занято'}</Badge>
            </Group>
            <Stack gap={6}>
              {parts.map(([p, l]) => (
                <Group key={p} gap={6} align="center">
                  <Text size="xs" c="dimmed" w={48}>{p}</Text>
                  {l.map((s) => (
                    <SlotButton compact key={s.startAt} slot={s} selected={flow.slot?.startAt === s.startAt} onClick={() => flow.setSlot(s)} />
                  ))}
                </Group>
              ))}
            </Stack>
            <Divider mt="md" />
          </Box>
        )
      })}
      {flow.slot && (
        <Paper shadow="md" withBorder radius="lg" p="md" style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: 'min(640px, 92vw)', zIndex: 900 }}>
          <Group justify="space-between">
            <Text fw={600}>{fmtDayKeyShort(localDayKey(flow.slot.startAt))}, {fmtRange(flow.slot)}</Text>
            <Button onClick={() => setOpen(true)}>Продолжить</Button>
          </Group>
        </Paper>
      )}
      <Drawer opened={open} onClose={() => setOpen(false)} position="right" title={<Text fw={600}>Ваши данные</Text>}>
        {flow.slot && <TypeSummary type={type} flow={flow} />}
        <Divider my="md" />
        <GuestForm flow={flow} onSubmit={() => { if (flow.submit() !== 'invalid') setOpen(false) }} />
      </Drawer>
    </Stack>
  )
}

// ── C: пошаговый мастер — один вопрос на экран, удобно на телефоне
function VariantC({ type, flow }: { type: MeetingType; flow: Flow }) {
  const [step, setStep] = useState(0)
  const active = flow.booking ? 3 : step
  return (
    <Stack maw={640} mx="auto">
      <Text c="dimmed" ta="center">{owner.name} · {type.title} · {formatDuration(type.durationMinutes)}</Text>
      <Stepper active={active} onStepClick={(s) => s < active && !flow.booking && setStep(s)} size="sm">
        <Stepper.Step label="День">
          <ScrollArea type="auto" mt="md">
            <Group wrap="nowrap" gap="xs" pb="sm">
              {flow.days.map((key) => {
                const free = flow.byDay.get(key)?.filter((s) => s.status === 'available').length ?? 0
                const sel = key === flow.day
                return (
                  <Paper
                    key={key}
                    component="button"
                    withBorder
                    radius="md"
                    p="sm"
                    miw={92}
                    disabled={!free}
                    onClick={() => { flow.setDay(key); flow.setSlot(undefined); setStep(1) }}
                    bg={sel ? 'violet.6' : undefined}
                    c={sel ? 'white' : free ? undefined : 'gray.5'}
                    style={{ cursor: free ? 'pointer' : 'not-allowed' }}
                  >
                    <Text size="xs" tt="uppercase">{fmtDayKeyShort(key).split(',')[0]}</Text>
                    <Text fw={700} size="xl">{new Date(`${key}T12:00:00`).getDate()}</Text>
                    <Text size="xs">{flow.byDay.has(key) ? (free ? `${free} своб.` : 'занято') : emptyLabel(key)}</Text>
                  </Paper>
                )
              })}
            </Group>
          </ScrollArea>
          <Text size="xs" c="dimmed">{tzNote}</Text>
        </Stepper.Step>
        <Stepper.Step label="Время">
          {flow.alert && <Alert color="red" my="sm">{flow.alert}</Alert>}
          <Title order={3} my="sm">{flow.day && fmtDayKey(flow.day)}</Title>
          {['Утро', 'День', 'Вечер'].map((p) => {
            const l = (flow.day ? flow.byDay.get(flow.day) ?? [] : []).filter((s) => dayPart(s.startAt) === p)
            if (!l.length) return null
            return (
              <Box key={p} mb="sm">
                <Text size="sm" c="dimmed" mb={4}>{p}</Text>
                <SimpleGrid cols={{ base: 3, sm: 5 }} spacing={6}>
                  {l.map((s) => (
                    <SlotButton compact key={s.startAt} slot={s} selected={flow.slot?.startAt === s.startAt} onClick={() => { flow.setSlot(s); flow.setAlert(undefined); setStep(2) }} />
                  ))}
                </SimpleGrid>
              </Box>
            )
          })}
        </Stepper.Step>
        <Stepper.Step label="Данные">
          {flow.slot && (
            <Paper bg="violet.0" p="sm" radius="md" my="sm">
              <Text fw={600}>{fmtDayKey(localDayKey(flow.slot.startAt))}, {fmtRange(flow.slot)}</Text>
            </Paper>
          )}
          <GuestForm flow={flow} onSubmit={() => { if (flow.submit() === 'conflict') setStep(1) }} />
        </Stepper.Step>
        <Stepper.Completed>
          <Box mt="md"><Confirmation flow={flow} type={type} /></Box>
        </Stepper.Completed>
      </Stepper>
    </Stack>
  )
}

export function BookingPrototype() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  const [conflict, setConflict] = useState(false)
  const type = findMeetingType(id)
  if (!type) return <Container py="xl"><Title>Тип встречи не найден</Title></Container>
  return (
    <Container size="lg" py="xl">
      <Anchor component={Link} to="/" size="sm">← Все типы встреч</Anchor>
      <Box mt="md">
        <Flow key={`${variant}-${type.id}`} variant={variant} type={type} conflict={conflict} />
      </Box>
      <PrototypeSwitcher variants={VARIANTS} current={variant} conflict={conflict} onConflict={setConflict} />
    </Container>
  )
}

function Flow({ variant, type, conflict }: { variant: string; type: MeetingType; conflict: boolean }) {
  const flow = useFlow(type, conflict)
  if (variant === 'B') return <VariantB type={type} flow={flow} />
  if (variant === 'C') return <VariantC type={type} flow={flow} />
  return <VariantA type={type} flow={flow} />
}
