import { Box, Button, SimpleGrid, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { type ReactNode, useState } from 'react'
import { type Day, formatDay, formatRange, formatTime, type Slot, windowDays } from './schedule'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Календарь Окна записи и время выбранного дня — две правые панели страницы записи.
 * Выбранный Слот хранит владелец компонента (его же показывает сводка); выбранный день — сам
 * компонент, поэтому после перезагрузки `slots` Гость остаётся на своём дне.
 *
 * @param notice — сообщение над списком времени (например, о конфликте после отправки формы).
 * @param initialDay — день (`YYYY-MM-DD`), открытый при монтировании, если в нём есть свободное
 *   время; иначе — первый день со свободным временем.
 */
export function SlotPicker({
  slots,
  selected,
  onSelect,
  onContinue,
  notice,
  initialDay,
}: {
  slots: Slot[]
  selected: Slot | undefined
  onSelect: (slot: Slot | undefined) => void
  onContinue: (slot: Slot) => void
  notice?: ReactNode
  initialDay?: string
}) {
  const days = windowDays(slots, new Date())
  const [pickedDay, setPickedDay] = useState(initialDay)
  const day =
    days.find((d) => d.key === pickedDay && d.free > 0) ?? days.find((d) => d.free > 0)

  return (
    <>
      <Box p="lg">
        <Calendar
          days={days}
          selected={day?.key}
          onPick={(key) => {
            setPickedDay(key)
            onSelect(undefined)
          }}
        />
      </Box>
      <Box p="lg" component="section" aria-label="Время">
        <Stack gap="sm">
          {notice}
          <Title order={2} size="h4">
            {day ? formatDay(day.date) : 'Нет свободного времени'}
          </Title>
          <Stack gap={6}>
            {day?.slots.map((slot) => (
              <TimeButton
                key={slot.startAt}
                slot={slot}
                selected={selected?.startAt === slot.startAt}
                onClick={() => onSelect(slot)}
              />
            ))}
          </Stack>
          <Button fullWidth disabled={!selected} onClick={() => selected && onContinue(selected)}>
            {selected ? `Продолжить · ${formatRange(selected)}` : 'Выберите время'}
          </Button>
        </Stack>
      </Box>
    </>
  )
}

function Calendar({
  days,
  selected,
  onPick,
}: {
  days: Day[]
  selected: string | undefined
  onPick: (key: string) => void
}) {
  // Сетка пн–вс: пустые клетки до первого дня Окна.
  const lead = days.length ? (days[0].date.getDay() + 6) % 7 : 0
  return (
    <Stack gap="sm">
      <Title order={2} size="h4" id="calendar-title">
        Выберите день
      </Title>
      <SimpleGrid cols={7} spacing={4} role="group" aria-labelledby="calendar-title">
        {WEEKDAYS.map((name) => (
          <Text key={name} size="xs" c="dimmed" ta="center" aria-hidden>
            {name}
          </Text>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((day) => {
          const active = day.key === selected
          const free = day.free > 0
          return (
            <UnstyledButton
              key={day.key}
              disabled={!free}
              aria-label={formatDay(day.date)}
              aria-pressed={active}
              onClick={() => onPick(day.key)}
              style={{
                aspectRatio: '1',
                borderRadius: 'var(--mantine-radius-md)',
                textAlign: 'center',
                fontWeight: free ? 600 : 400,
                cursor: free ? 'pointer' : 'not-allowed',
                background: active
                  ? 'var(--mantine-primary-color-filled)'
                  : free
                    ? 'var(--mantine-primary-color-light)'
                    : 'transparent',
                color: active
                  ? 'var(--mantine-color-white)'
                  : free
                    ? 'var(--mantine-primary-color-light-color)'
                    : 'var(--mantine-color-dimmed)',
              }}
            >
              {day.date.getDate()}
            </UnstyledButton>
          )
        })}
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        Доступны ближайшие 14 дней. Серым — выходные и дни без свободного времени.
      </Text>
    </Stack>
  )
}

function TimeButton({
  slot,
  selected,
  onClick,
}: {
  slot: Slot
  selected: boolean
  onClick: () => void
}) {
  const busy = slot.status === 'busy'
  const time = formatTime(slot.startAt)
  return (
    <Button
      fullWidth
      aria-label={busy ? `${time} занято` : undefined}
      variant={selected ? 'filled' : busy ? 'default' : 'outline'}
      disabled={busy}
      aria-pressed={selected}
      onClick={onClick}
      styles={busy ? { label: { textDecoration: 'line-through' } } : undefined}
    >
      {time}
      {busy && (
        <Text span size="xs" ml={6}>
          занято
        </Text>
      )}
    </Button>
  )
}
