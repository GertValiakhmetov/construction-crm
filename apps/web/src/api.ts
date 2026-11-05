import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export async function connect() {
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error('Не удалось подключиться к API')
  const { url, key } = await res.json()
  return createClient(url, key)
}

export function apiFor(auth: SupabaseClient) {
  return async function request<T>(
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ): Promise<T> {
    const { data } = await auth.auth.getSession()
    if (!data.session) throw new Error('Войдите в аккаунт')
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.message ?? 'Сервис временно недоступен')
    }
    return res.json()
  }
}
export type Api = ReturnType<typeof apiFor>
