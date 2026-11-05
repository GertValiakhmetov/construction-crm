import { Button, PasswordInput, TextInput } from '@mantine/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type SubmitEvent, useState } from 'react'

export function Login({ auth }: { auth: SupabaseClient }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    setBusy(true)
    setError('')

    try {
      const result = await auth.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      })
      if (result.error)
        setError(
          result.error.code === 'invalid_credentials'
            ? 'Проверьте почту и пароль'
            : 'Не удалось выполнить вход',
        )
    } catch {
      setError('Сервис входа недоступен')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="panel login" onSubmit={submit}>
      <h1>Вход в CRM</h1>
      <TextInput
        label="Электронная почта"
        type="email"
        name="email"
        autoComplete="username"
        required
      />
      <PasswordInput label="Пароль" name="password" autoComplete="current-password" required />
      {error && <p role="alert">{error}</p>}
      <Button type="submit" loading={busy}>
        Войти
      </Button>
    </form>
  )
}
