// PROTOTYPE — выбросить. Плавающая панель переключения вариантов (?variant=).
import { ActionIcon, Checkbox, Group, Paper, Text } from '@mantine/core'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

export function PrototypeSwitcher({
  variants,
  current,
  conflict,
  onConflict,
}: {
  variants: { key: string; name: string }[]
  current: string
  conflict: boolean
  onConflict: (v: boolean) => void
}) {
  const [params, setParams] = useSearchParams()
  const idx = Math.max(0, variants.findIndex((v) => v.key === current))
  const go = (d: number) => {
    const next = variants[(idx + d + variants.length) % variants.length]!
    params.set('variant', next.key)
    setParams(params, { replace: true })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  if (import.meta.env.PROD) return null
  return (
    <Paper
      shadow="xl"
      radius="xl"
      px="md"
      py={6}
      bg="dark.8"
      c="white"
      style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}
    >
      <Group gap="sm" wrap="nowrap">
        <ActionIcon variant="subtle" color="gray.0" onClick={() => go(-1)} aria-label="Предыдущий вариант">←</ActionIcon>
        <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
          {variants[idx]!.key} ({variants[idx]!.name})
        </Text>
        <ActionIcon variant="subtle" color="gray.0" onClick={() => go(1)} aria-label="Следующий вариант">→</ActionIcon>
        <Checkbox
          size="xs"
          color="red"
          label={<Text size="xs" c="white">конфликт при отправке</Text>}
          checked={conflict}
          onChange={(e) => onConflict(e.currentTarget.checked)}
        />
      </Group>
    </Paper>
  )
}
