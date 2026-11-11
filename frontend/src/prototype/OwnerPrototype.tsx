// PROTOTYPE — выбросить. Три структурно разных варианта админки Владельца
// на маршруте /admin, переключаются ?variant=A|B|C. Данные в памяти.
import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Drawer,
  Group,
  Modal,
  NavLink,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Timeline,
  Title,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { meetingTypes, type MeetingType } from '../data/catalog'
import { formatDuration } from '../format'
import { bookings, fmtDayKey, fmtRange, localDayKey, owner, type Booking } from './mockSchedule'
import { PrototypeSwitcher } from './PrototypeSwitcher'

const VARIANTS = [
  { key: 'A', name: 'Боковое меню' },
  { key: 'B', name: 'Одна панель управления' },
  { key: 'C', name: 'Вкладки + таблица' },
]

const initials = owner.name.split(' ').map((w) => w[0]).join('')
const typeName = (id: string) => meetingTypes.find((t) => t.id === id)?.title ?? id
const translit: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' }
const slugify = (s: string) =>
  s.toLowerCase().split('').map((c) => translit[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

function useAdmin() {
  const [version, setVersion] = useState(0)
  const upcoming = useMemo(
    () => bookings.filter((b) => Date.parse(b.endAt) > Date.now()).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [version],
  )
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>()
    for (const b of upcoming) m.set(localDayKey(b.startAt), [...(m.get(localDayKey(b.startAt)) ?? []), b])
    return [...m.entries()]
  }, [upcoming])
  const types = useMemo(() => [...meetingTypes], [version])
  return { upcoming, byDay, types, refresh: () => setVersion((v) => v + 1) }
}
type Admin = ReturnType<typeof useAdmin>

// Общая форма создания Типа встречи (поля и проверки — из решения «Модель данных»).
function CreateTypeForm({ admin, onDone }: { admin: Admin; onDone: () => void }) {
  const [v, setV] = useState({ name: '', id: '', idTouched: false, description: '', duration: 30 as number | string })
  const [err, setErr] = useState<Record<string, string>>({})
  const id = v.idTouched ? v.id : slugify(v.name)
  const submit = () => {
    const e: Record<string, string> = {}
    if (!v.name.trim() || v.name.length > 100) e.name = 'Название: от 1 до 100 символов'
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length < 2 || id.length > 40) e.id = 'Латиница, цифры и дефис, 2–40 символов'
    else if (meetingTypes.some((t) => t.id === id)) e.id = 'Тип встречи с таким id уже есть'
    const d = Number(v.duration)
    if (!(d >= 15 && d <= 240 && d % 15 === 0)) e.duration = 'От 15 до 240 минут, кратно 15'
    if (v.description.length > 500) e.description = 'Не больше 500 символов'
    setErr(e)
    if (Object.keys(e).length) return
    meetingTypes.push({ id, title: v.name, description: v.description, durationMinutes: d } as MeetingType)
    admin.refresh()
    onDone()
  }
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Stack gap="sm">
        <TextInput label="Название" required value={v.name} error={err.name} onChange={(e) => setV({ ...v, name: e.currentTarget.value })} />
        <TextInput
          label="id (адрес страницы записи)"
          description={`Ссылка для Гостей: /book/${id || '…'} — изменить потом нельзя`}
          required
          value={id}
          error={err.id}
          onChange={(e) => setV({ ...v, id: e.currentTarget.value, idTouched: true })}
        />
        <NumberInput label="Длительность, минут" required min={15} max={240} step={15} value={v.duration} error={err.duration} onChange={(d) => setV({ ...v, duration: d })} />
        <Textarea label="Описание" description="Необязательно, до 500 символов" autosize minRows={2} value={v.description} error={err.description} onChange={(e) => setV({ ...v, description: e.currentTarget.value })} />
        <Button type="submit">Создать</Button>
      </Stack>
    </form>
  )
}

function CopyLink({ id }: { id: string }) {
  return (
    <CopyButton value={`${location.origin}/book/${id}`}>
      {({ copied, copy }) => (
        <Button size="xs" variant="subtle" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать ссылку'}</Button>
      )}
    </CopyButton>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <Paper withBorder radius="md" p="xl" ta="center" c="dimmed">{children}</Paper>
)

// ── A: боковое меню, два раздела; встречи — лента по дням; типы — список + модальное окно
function VariantA({ admin }: { admin: Admin }) {
  const [section, setSection] = useState<'meetings' | 'types'>('meetings')
  const [modal, setModal] = useState(false)
  return (
    <Group align="flex-start" gap="xl">
      <Stack w={220} gap={4}>
        <Group gap="sm" mb="md">
          <Avatar color="violet" radius="xl">{initials}</Avatar>
          <Box><Text fw={600} size="sm">{owner.name}</Text><Text size="xs" c="dimmed">Asia/Almaty</Text></Box>
        </Group>
        <NavLink label="Предстоящие встречи" active={section === 'meetings'} onClick={() => setSection('meetings')} rightSection={<Badge size="sm">{admin.upcoming.length}</Badge>} />
        <NavLink label="Типы встреч" active={section === 'types'} onClick={() => setSection('types')} rightSection={<Badge size="sm" variant="light">{admin.types.length}</Badge>} />
        <NavLink label="Открыть страницу для Гостей ↗" component={Link} to="/" />
      </Stack>
      <Box style={{ flex: 1 }}>
        {section === 'meetings' ? (
          <Stack>
            <Title order={2}>Предстоящие встречи</Title>
            {admin.byDay.length === 0 && <Empty>Пока никто не записался. Поделитесь ссылкой на Тип встречи.</Empty>}
            {admin.byDay.map(([day, list]) => (
              <Box key={day}>
                <Text fw={600} tt="capitalize" mb="xs">{fmtDayKey(day)}</Text>
                <Timeline bulletSize={12} lineWidth={2}>
                  {list.map((b) => (
                    <Timeline.Item key={b.id} title={<Group gap="xs"><Text fw={600}>{fmtRange(b)}</Text><Badge variant="light">{typeName(b.meetingTypeId)}</Badge></Group>}>
                      <Text size="sm">{b.guestName} · <Anchor href={`mailto:${b.guestEmail}`} size="sm">{b.guestEmail}</Anchor></Text>
                      {b.comment && <Text size="sm" c="dimmed">«{b.comment}»</Text>}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack>
            <Group justify="space-between"><Title order={2}>Типы встреч</Title><Button onClick={() => setModal(true)}>+ Новый тип</Button></Group>
            {admin.types.map((t) => (
              <Paper key={t.id} withBorder radius="md" p="md">
                <Group justify="space-between">
                  <Box>
                    <Group gap="xs"><Text fw={600}>{t.title}</Text><Badge variant="light">{formatDuration(t.durationMinutes)}</Badge></Group>
                    <Text size="sm" c="dimmed">/book/{t.id} · {t.description}</Text>
                  </Box>
                  <CopyLink id={t.id} />
                </Group>
              </Paper>
            ))}
            <Modal opened={modal} onClose={() => setModal(false)} title="Новый Тип встречи"><CreateTypeForm admin={admin} onDone={() => setModal(false)} /></Modal>
          </Stack>
        )}
      </Box>
    </Group>
  )
}

// ── B: одна панель управления — сводка сверху, встречи и типы рядом, форма создания всегда на виду
function VariantB({ admin }: { admin: Admin }) {
  const today = localDayKey(new Date().toISOString())
  const todayCount = admin.upcoming.filter((b) => localDayKey(b.startAt) === today).length
  const next = admin.upcoming[0]
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Здравствуйте, {owner.name.split(' ')[0]}</Title>
        <Anchor component={Link} to="/" size="sm">Страница для Гостей ↗</Anchor>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder radius="md"><Text size="sm" c="dimmed">Ближайшая встреча</Text><Text fw={700}>{next ? `${fmtDayKey(localDayKey(next.startAt))}, ${fmtRange(next)}` : '—'}</Text>{next && <Text size="sm">{next.guestName}</Text>}</Card>
        <Card withBorder radius="md"><Text size="sm" c="dimmed">Сегодня</Text><Text fw={700} size="xl">{todayCount}</Text></Card>
        <Card withBorder radius="md"><Text size="sm" c="dimmed">Всего впереди</Text><Text fw={700} size="xl">{admin.upcoming.length}</Text></Card>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="sm">Предстоящие встречи</Title>
          <Stack gap="xs" mah={520} style={{ overflow: 'auto' }}>
            {admin.upcoming.map((b) => (
              <Group key={b.id} justify="space-between" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }} pb={6}>
                <Box><Text size="sm" fw={600}>{fmtDayKey(localDayKey(b.startAt))}, {fmtRange(b)}</Text><Text size="sm">{b.guestName} · {b.guestEmail}</Text>{b.comment && <Text size="xs" c="dimmed">{b.comment}</Text>}</Box>
                <Badge variant="light">{typeName(b.meetingTypeId)}</Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
        <Stack>
          <Paper withBorder radius="md" p="md">
            <Title order={4} mb="sm">Типы встреч</Title>
            {admin.types.map((t) => (
              <Group key={t.id} justify="space-between" py={4}><Text size="sm">{t.title} · {formatDuration(t.durationMinutes)}</Text><CopyLink id={t.id} /></Group>
            ))}
          </Paper>
          <Paper withBorder radius="md" p="md"><Title order={4} mb="sm">Новый Тип встречи</Title><CreateTypeForm admin={admin} onDone={() => {}} /></Paper>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}

// ── C: вкладки сверху, встречи — плотная таблица, типы — карточки, создание в выдвижной панели
function VariantC({ admin }: { admin: Admin }) {
  const [drawer, setDrawer] = useState(false)
  return (
    <Stack>
      <Group justify="space-between"><Title order={2}>Админка</Title><Group gap="xs"><Avatar size="sm" color="violet" radius="xl">{initials}</Avatar><Text size="sm">{owner.name}</Text></Group></Group>
      <Tabs defaultValue="meetings">
        <Tabs.List>
          <Tabs.Tab value="meetings">Встречи ({admin.upcoming.length})</Tabs.Tab>
          <Tabs.Tab value="types">Типы встреч ({admin.types.length})</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="meetings" pt="md">
          <Table striped highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Дата</Table.Th><Table.Th>Время</Table.Th><Table.Th>Тип</Table.Th><Table.Th>Гость</Table.Th><Table.Th>Email</Table.Th><Table.Th>Комментарий</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {admin.upcoming.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{fmtDayKey(localDayKey(b.startAt))}</Table.Td><Table.Td>{fmtRange(b)}</Table.Td><Table.Td>{typeName(b.meetingTypeId)}</Table.Td>
                  <Table.Td>{b.guestName}</Table.Td><Table.Td>{b.guestEmail}</Table.Td><Table.Td c="dimmed">{b.comment ?? '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
        <Tabs.Panel value="types" pt="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {admin.types.map((t) => (
              <Card key={t.id} withBorder radius="md">
                <Text fw={600}>{t.title}</Text><Badge variant="light" my={4}>{formatDuration(t.durationMinutes)}</Badge>
                <Text size="sm" c="dimmed" lineClamp={2}>{t.description}</Text><CopyLink id={t.id} />
              </Card>
            ))}
            <Card withBorder radius="md" style={{ borderStyle: 'dashed', cursor: 'pointer' }} onClick={() => setDrawer(true)}>
              <Stack align="center" justify="center" h="100%"><ActionIcon size="xl" radius="xl" variant="light">+</ActionIcon><Text>Новый Тип встречи</Text></Stack>
            </Card>
          </SimpleGrid>
          <Drawer opened={drawer} onClose={() => setDrawer(false)} position="right" title="Новый Тип встречи"><CreateTypeForm admin={admin} onDone={() => setDrawer(false)} /></Drawer>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

export function OwnerPrototype() {
  const [params] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  const admin = useAdmin()
  return (
    <Container size="lg" py="xl">
      <Alert variant="light" color="gray" mb="md" p="xs">Прототип: админка без входа, Владелец задан конфигурацией.</Alert>
      {variant === 'B' ? <VariantB admin={admin} /> : variant === 'C' ? <VariantC admin={admin} /> : <VariantA admin={admin} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </Container>
  )
}
