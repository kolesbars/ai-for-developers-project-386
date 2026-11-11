import { Box, Button, Stack, Table, Text, Title, UnstyledButton } from '@mantine/core'
import { type ReactNode, useState } from 'react'
import { type Day, formatDay, formatRange, formatTime, type Month, monthGrids, type Slot, windowDays } from './schedule'

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
  return (
    <Stack gap="sm" role="group" aria-labelledby="calendar-title">
      <Title order={2} size="h4" id="calendar-title">
        Выберите день
      </Title>
      {monthGrids(days).map((month) => (
        <MonthGrid key={month.key} month={month} selected={selected} onPick={onPick} />
      ))}
      <Text size="xs" c="dimmed">
        Серым — выходные, дни без свободного времени и дни вне Окна записи.
      </Text>
    </Stack>
  )
}

/** Сетка одного месяца пн–вс (spec §7); кнопки — только у дней Окна записи. */
function MonthGrid({
  month,
  selected,
  onPick,
}: {
  month: Month
  selected: string | undefined
  onPick: (key: string) => void
}) {
  const titleId = `month-${month.key}`
  return (
    <Stack gap={4}>
      <Text fw={600} size="sm" tt="capitalize" id={titleId}>
        {month.title}
      </Text>
      <Table
        role="grid"
        aria-labelledby={titleId}
        withRowBorders={false}
        horizontalSpacing={2}
        verticalSpacing={2}
        layout="fixed"
      >
        <Table.Thead>
          <Table.Tr>
            {WEEKDAYS.map((name) => (
              <Table.Th key={name} scope="col" ta="center" fz="xs" fw={400} c="dimmed">
                {name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {month.weeks.map((week, i) => (
            <Table.Tr key={i}>
              {week.map((cell, j) => (
                <Table.Td key={j} role="gridcell" p={2}>
                  {cell?.day ? (
                    <DayButton day={cell.day} active={cell.day.key === selected} onPick={onPick} />
                  ) : (
                    cell && (
                      <Text size="sm" ta="center" c="dimmed" opacity={0.5}>
                        {cell.date.getDate()}
                      </Text>
                    )
                  )}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

function DayButton({
  day,
  active,
  onPick,
}: {
  day: Day
  active: boolean
  onPick: (key: string) => void
}) {
  const free = day.free > 0
  return (
    <UnstyledButton
      w="100%"
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
