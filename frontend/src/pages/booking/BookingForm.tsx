import { Alert, Anchor, Box, Button, Group, Stack, Textarea, TextInput, Title } from '@mantine/core'
import type { FormEvent } from 'react'
import type { GuestErrors, GuestValues } from './guest'

/**
 * Форма «Ваши данные» — заменяет календарь и время на странице записи.
 *
 * @param errors — ошибки под полями: из проверки в браузере или из `fieldErrors` ответа сервера.
 * @param failure — ошибка отправки, не относящаяся к полям (сбой сети или сервера).
 */
export function BookingForm({
  values,
  errors,
  submitting,
  failure,
  onChange,
  onSubmit,
  onBack,
}: {
  values: GuestValues
  errors: GuestErrors
  submitting: boolean
  failure?: string
  onChange: (values: GuestValues) => void
  onSubmit: () => void
  onBack: () => void
}) {
  const field = (name: keyof GuestValues) => ({
    value: values[name],
    error: errors[name],
    onChange: (event: { currentTarget: { value: string } }) =>
      onChange({ ...values, [name]: event.currentTarget.value }),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Box p="lg">
      <form noValidate aria-labelledby="guest-form-title" onSubmit={submit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={2} size="h4" id="guest-form-title">
              Ваши данные
            </Title>
            <Anchor component="button" type="button" size="sm" onClick={onBack}>
              ← Другое время
            </Anchor>
          </Group>
          <TextInput label="Имя" required autoComplete="name" {...field('guestName')} />
          <TextInput
            label="Email"
            type="email"
            required
            autoComplete="email"
            {...field('guestEmail')}
          />
          <Textarea
            label="Комментарий"
            description="Необязательно: о чём хотите поговорить"
            rows={3}
            {...field('comment')}
          />
          {failure && (
            <Alert color="red" role="alert">
              {failure}
            </Alert>
          )}
          <Button type="submit" size="md" loading={submitting}>
            Записаться
          </Button>
        </Stack>
      </form>
    </Box>
  )
}
