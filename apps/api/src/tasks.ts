import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  EditTask,
  type EditTaskInput,
  NewObject,
  type NewObjectInput,
  NewTask,
  type NewTaskInput,
  TaskParams,
  Transition,
  type TransitionInput,
} from '@crm/contracts'
import { createClient } from '@supabase/supabase-js'
import type { FastifyInstance, FastifyRequest } from 'fastify'

const localConfig = fileURLToPath(new URL('../.env.local', import.meta.url))
if (existsSync(localConfig)) process.loadEnvFile(localConfig)

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
if (!url || !key?.startsWith('sb_publishable_')) {
  throw new Error('Настройте SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY в apps/api/.env.local')
}

const config = { url, key }
function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode })
}

function caller(req: FastifyRequest) {
  const auth = req.headers.authorization
  if (!auth || !/^Bearer \S+$/i.test(auth)) fail(401, 'Войдите в аккаунт')
  return createClient(config.url, config.key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function check(error: { code: string } | null, status: number) {
  if (!error) return
  if (status === 401) fail(401, 'Сессия истекла. Войдите снова')
  if (error.code === '42501') fail(403, 'Недостаточно прав')
  if (error.code === '23503') fail(409, 'Объект или исполнитель больше недоступен')
  if (error.code === '22023') fail(409, 'Переход недоступен. Проверьте статус и комментарий')
  fail(502, 'Не удалось выполнить запрос к базе')
}

const fields =
  'id,title,description,status,created_at,assignee_id,created_by,object_id,object:objects(name,address),assignee:profiles!tasks_assignee_id_fkey(display_name),author:profiles!tasks_created_by_fkey(display_name)'

export function taskRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => config)
  app.put<{ Params: { id: string }; Body: NewObjectInput }>(
    '/api/objects/:id',
    {
      schema: { params: TaskParams, body: NewObject },
    },
    async (req) => {
      const { name, address } = req.body
      const result = await caller(req)
        .from('objects')
        .update({ name: name.trim(), address: address.trim() })
        .eq('id', req.params.id)
        .select('id')
        .maybeSingle()
      check(result.error, result.status)
      return result.data ?? fail(404, 'Объект недоступен')
    },
  )
  app.put<{ Params: { id: string }; Body: EditTaskInput }>(
    '/api/tasks/:id',
    {
      schema: { params: TaskParams, body: EditTask },
    },
    async (req) => {
      const { title, description, assignee_id, object_id } = req.body
      const result = await caller(req)
        .from('tasks')
        .update({
          title: title.trim(),
          description: description?.trim() || null,
          assignee_id,
          object_id,
        })
        .eq('id', req.params.id)
        .select('id')
        .maybeSingle()
      check(result.error, result.status)
      return result.data ?? fail(404, 'Задача недоступна')
    },
  )
  for (const table of ['tasks', 'objects'] as const) {
    app.delete<{ Params: { id: string } }>(
      `/api/${table}/:id`,
      { schema: { params: TaskParams } },
      async (req) => {
        const result = await caller(req)
          .from(table)
          .delete()
          .eq('id', req.params.id)
          .select('id')
          .maybeSingle()
        if (table === 'objects' && result.error?.code === '23503')
          fail(409, 'Сначала перенесите или удалите задачи объекта')
        check(result.error, result.status)
        return result.data ?? fail(404, 'Запись недоступна')
      },
    )
  }
  app.get('/api/objects', async (req) => {
    const result = await caller(req)
      .from('objects')
      .select('id,name,address')
      .order('name')
      .order('id')
    check(result.error, result.status)
    return result.data
  })
  app.get<{ Params: { id: string } }>(
    '/api/objects/:id',
    { schema: { params: TaskParams } },
    async (req) => {
      const result = await caller(req)
        .from('objects')
        .select('id,name,address,tasks(id,title,status)')
        .eq('id', req.params.id)
        .order('title', { referencedTable: 'tasks' })
        .maybeSingle()
      check(result.error, result.status)
      return result.data ?? fail(404, 'Объект недоступен')
    },
  )
  app.get('/api/executors', async (req) => {
    const result = await caller(req)
      .from('profiles')
      .select('id,display_name')
      .eq('role', 'executor')
      .order('display_name')
    check(result.error, result.status)
    return result.data
  })
  app.post<{ Body: NewObjectInput }>(
    '/api/objects',
    { schema: { body: NewObject } },
    async (req, reply) => {
      const { name, address } = req.body
      const result = await caller(req)
        .from('objects')
        .insert({ name: name.trim(), address: address.trim() })
        .select('id')
        .single()
      check(result.error, result.status)
      return reply.code(201).send(result.data)
    },
  )
  app.post<{ Params: { id: string }; Body: NewTaskInput }>(
    '/api/objects/:id/tasks',
    {
      schema: { params: TaskParams, body: NewTask },
    },
    async (req, reply) => {
      const { title, description, assignee_id } = req.body
      const result = await caller(req)
        .from('tasks')
        .insert({
          object_id: req.params.id,
          title: title.trim(),
          description: description?.trim() || null,
          assignee_id,
        })
        .select('id')
        .single()
      check(result.error, result.status)
      return reply.code(201).send(result.data)
    },
  )
  app.get('/api/me', async (req) => {
    const db = caller(req)
    const { data, error } = await db.auth.getUser(req.headers.authorization?.slice(7))
    if (error || !data.user) fail(401, 'Войдите в аккаунт')
    const profile = await db
      .from('profiles')
      .select('id,display_name,role')
      .eq('id', data.user.id)
      .maybeSingle()
    check(profile.error, profile.status)
    return profile.data ?? fail(403, 'Для аккаунта ещё не создан профиль')
  })
  app.get('/api/tasks', async (req) => {
    const result = await caller(req)
      .from('tasks')
      .select(fields)
      .order('created_at', { ascending: false })
    check(result.error, result.status)
    return result.data
  })
  app.get<{ Params: { id: string } }>(
    '/api/tasks/:id',
    { schema: { params: TaskParams } },
    async (req) => {
      const db = caller(req)
      const task = await db.from('tasks').select(fields).eq('id', req.params.id).maybeSingle()
      check(task.error, task.status)
      if (!task.data) fail(404, 'Задача недоступна')
      const history = await db
        .from('task_status_history')
        .select(
          'id,from_status,to_status,changed_at,changed_by,comment,actor:profiles(display_name)',
        )
        .eq('task_id', req.params.id)
        .order('id')
      check(history.error, history.status)
      return { task: task.data, history: history.data }
    },
  )
  app.post<{ Params: { id: string }; Body: TransitionInput }>(
    '/api/tasks/:id/transitions',
    {
      schema: { params: TaskParams, body: Transition },
    },
    async (req) => {
      const result = await caller(req).rpc('transition_task', {
        p_task_id: req.params.id,
        p_to_status: req.body.status,
        p_comment: req.body.comment ?? null,
      })
      check(result.error, result.status)
      return result.data
    },
  )
}
