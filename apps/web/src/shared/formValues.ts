import type { SubmitEvent } from 'react'

export function formValues(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault()
  const values = new FormData(event.currentTarget)
  return (name: string) => String(values.get(name) ?? '').trim()
}
