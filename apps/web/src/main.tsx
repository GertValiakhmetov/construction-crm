import '@mantine/core/styles.css'
import './style.css'
import type { Profile } from '@crm/contracts'
import { Button, MantineProvider, PasswordInput, TextInput } from '@mantine/core'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router'
import { apiFor, connect } from './api'
import { ObjectCard, Objects } from './Objects'
import { TaskCard, Tasks } from './Tasks'

function Login({ auth }: { auth: SupabaseClient }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
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

function Workspace({ auth }: { auth: SupabaseClient }) {
  const api = useMemo(() => apiFor(auth), [auth])
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Profile>('/me') })
  return (
    <>
      <header className="app-header">
        <b>Объекты и задачи</b>
        <div>
          {me.data?.display_name}{' '}
          <Button
            variant="subtle"
            c="#ccf5e6"
            onClick={() => auth.auth.signOut({ scope: 'local' })}
          >
            Выйти
          </Button>
        </div>
      </header>
      <main>
        {me.data && (
          <nav className="sections" aria-label="Разделы CRM">
            <NavLink to="/" end>
              Задачи
            </NavLink>
            <NavLink to="/objects">Объекты</NavLink>
          </nav>
        )}
        {me.data ? (
          <Routes>
            <Route path="/" element={<Tasks api={api} me={me.data} />} />
            <Route path="/tasks/:id" element={<TaskCard api={api} me={me.data} />} />
            <Route path="/objects" element={<Objects api={api} me={me.data} />} />
            <Route path="/objects/:id" element={<ObjectCard api={api} me={me.data} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <p role="status">{me.error?.message ?? 'Загрузка профиля…'}</p>
        )}
      </main>
    </>
  )
}

function SignedIn({ auth }: { auth: SupabaseClient }) {
  const [cache] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return (
    <QueryClientProvider client={cache}>
      <Workspace auth={auth} />
    </QueryClientProvider>
  )
}
function App({ auth }: { auth: SupabaseClient }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    const { data } = auth.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => data.subscription.unsubscribe()
  }, [auth])
  if (session === undefined) return <main>Загружаем сессию…</main>
  return session ? (
    <SignedIn key={session.user.id} auth={auth} />
  ) : (
    <>
      <header className="app-header">
        <b>Объекты и задачи</b>
      </header>
      <main>
        <Login auth={auth} />
      </main>
    </>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент приложения')
const root = createRoot(container)
connect()
  .then((auth) =>
    root.render(
      <MantineProvider theme={{ primaryColor: 'teal' }}>
        <BrowserRouter>
          <App auth={auth} />
        </BrowserRouter>
      </MantineProvider>,
    ),
  )
  .catch(() =>
    root.render(
      <main role="alert">
        API недоступен. Проверьте, что Fastify запущен, и обновите страницу.
      </main>,
    ),
  )
