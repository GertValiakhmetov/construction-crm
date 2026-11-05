import type { Profile } from '@crm/contracts'
import { Button } from '@mantine/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { ObjectCard } from '../features/objects/ObjectCard'
import { ObjectList } from '../features/objects/ObjectList'
import { TaskCard } from '../features/tasks/TaskCard'
import { TaskList } from '../features/tasks/TaskList'
import { apiFor } from '../shared/api'

export function Workspace({ auth }: { auth: SupabaseClient }) {
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
            <Route path="/" element={<TaskList api={api} me={me.data} />} />
            <Route path="/tasks/:id" element={<TaskCard api={api} me={me.data} />} />
            <Route path="/objects" element={<ObjectList api={api} me={me.data} />} />
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
