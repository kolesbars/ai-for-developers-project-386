import { Alert, Button, NumberInput, Stack, Textarea, TextInput } from '@mantine/core'
import { useState } from 'react'
import { api } from '../../api/client'
import { bookingPath } from '../../routes'
import type { MeetingType } from './MeetingTypesSection'
import { type FieldErrors, type MeetingTypeDraft, type MeetingTypeField, slugify, validate } from './meetingTypeForm'

const FIELDS: readonly string[] = ['id', 'name', 'description', 'durationMinutes'] satisfies MeetingTypeField[]

/** Форма создания Типа встречи (spec §7). id подставляется из названия, пока Владелец его не правил. */
export function CreateMeetingTypeForm({ onCreated }: { onCreated: (type: MeetingType) => void }) {
  const [draft, setDraft] = useState<MeetingTypeDraft>({ id: '', name: '', description: '', durationMinutes: 30 })
  const [idEdited, setIdEdited] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const id = idEdited ? draft.id : slugify(draft.name)
  const change = (patch: Partial<MeetingTypeDraft>, field: MeetingTypeField) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async () => {
    const values = { ...draft, id }
    const found = validate(values)
    setErrors(found)
    setFormError(undefined)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    const { data, error } = await api
      .POST('/api/meeting-types', {
        body: {
          id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          durationMinutes: Number(values.durationMinutes),
        },
      })
      .catch(() => ({ data: undefined, error: undefined }))
    setSubmitting(false)
    if (data) return onCreated(data)

    if (error?.code === 'meeting_type_exists') return setErrors({ id: error.message })
    if (error?.code === 'validation_failed') {
      const byField = Object.fromEntries(
        error.fieldErrors.filter(({ field }) => FIELDS.includes(field)).map(({ field, message }) => [field, message]),
      )
      setErrors(byField)
      if (Object.keys(byField).length > 0) return
    }
    setFormError(error?.message ?? 'Не удалось создать Тип встречи. Попробуйте ещё раз.')
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Stack gap="sm">
        <TextInput
          label="Название"
          required
          value={draft.name}
          error={errors.name}
          onChange={(event) => change({ name: event.currentTarget.value }, 'name')}
        />
        <TextInput
          label="id (адрес страницы записи)"
          description={`Ссылка для Гостей: ${bookingPath(id || '…')} — изменить потом нельзя`}
          required
          value={id}
          error={errors.id}
          onChange={(event) => {
            setIdEdited(true)
            change({ id: event.currentTarget.value }, 'id')
          }}
        />
        <NumberInput
          label="Длительность, минут"
          required
          min={15}
          max={240}
          step={15}
          allowDecimal={false}
          value={draft.durationMinutes}
          error={errors.durationMinutes}
          onChange={(value) => change({ durationMinutes: value }, 'durationMinutes')}
        />
        <Textarea
          label="Описание"
          description="Необязательно, до 500 символов"
          rows={3}
          value={draft.description}
          error={errors.description}
          onChange={(event) => change({ description: event.currentTarget.value }, 'description')}
        />
        {formError && (
          <Alert color="red" role="alert">
            {formError}
          </Alert>
        )}
        <Button type="submit" loading={submitting}>
          Создать
        </Button>
      </Stack>
    </form>
  )
}
