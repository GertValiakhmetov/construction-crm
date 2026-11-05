import type { NewObjectInput, SiteObject } from '@crm/contracts'
import { Button, TextInput } from '@mantine/core'
import { formValues } from '../../shared/formValues'

export function ObjectForm({
  site,
  save,
  pending,
  error,
}: {
  site?: SiteObject
  save: (value: NewObjectInput) => void
  pending: boolean
  error: Error | null
}) {
  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        const value = formValues(event)
        save({ name: value('name'), address: value('address') })
      }}
    >
      <TextInput
        label="Название"
        name="name"
        defaultValue={site?.name}
        required
        pattern=".*\S.*"
        data-autofocus
      />
      <TextInput
        label="Адрес"
        name="address"
        defaultValue={site?.address}
        required
        pattern=".*\S.*"
      />
      {error && <p role="alert">{error.message}</p>}
      <Button type="submit" loading={pending}>
        {site ? 'Сохранить' : 'Создать объект'}
      </Button>
    </form>
  )
}
