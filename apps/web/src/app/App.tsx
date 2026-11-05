import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Login } from '../features/auth/Login'
import { Workspace } from './Workspace'

function SignedIn({ auth }: { auth: SupabaseClient }) {
  const [cache] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return (
    <QueryClientProvider client={cache}>
      <Workspace auth={auth} />
    </QueryClientProvider>
  )
}

export function App({ auth }: { auth: SupabaseClient }) {
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
