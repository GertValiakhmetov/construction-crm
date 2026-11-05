import type { Profile, Status, Task, TaskDetail } from '@crm/contracts'
import { Button, Modal, Textarea } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Api } from './api'
import { DeleteAction } from './DeleteAction'
import { TaskForm } from './Forms'

const labels: Record<Status, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  rework: 'На доработке',
  accepted: 'Принята',
}
const date = (s: string) =>
  new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
export function Badge({ status }: { status: Status }) {
  return <span className={`badge ${status}`}>{labels[status]}</span>
}
function person(name: string | undefined, id: string) {
  return name || `Сотрудник · ${id.slice(0, 8)}`
}
type Props = { api: Api; me: Profile }
export function Tasks({ api, me }: Props) {
  const list = useQuery({ queryKey: ['tasks'], queryFn: () => api<Task[]>('/tasks') })
  return (
    <section>
      <h1>{me.role === 'manager' ? 'Все задачи' : 'Мои задачи'}</h1>
      {list.isPending && <p>Загружаем задачи…</p>}
      {list.error && <p role="alert">{list.error.message}</p>}
      {list.data && (
        <div className="panel">
          <div className="listhead">
            <span>Задача / объект</span>
            <span>Статус</span>
          </div>
          {list.data.map((task) => (
            <Link className="row" key={task.id} to={`/tasks/${task.id}`}>
              <span>
                <strong>{task.title}</strong>
                <small>{task.object.name}</small>
              </span>
              <Badge status={task.status} />
            </Link>
          ))}
          {!list.data.length && <p className="pad">Пока нет задач</p>}
        </div>
      )}
    </section>
  )
}

type Action = { status: Status; title: string }
function actions(task: Task, me: Profile): Action[] {
  if (me.role === 'manager' && task.status === 'in_review')
    return [
      { status: 'accepted', title: 'Принять' },
      { status: 'rework', title: 'Вернуть на доработку' },
    ]
  if (me.role === 'executor' && me.id === task.assignee_id) {
    if (['new', 'rework'].includes(task.status))
      return [{ status: 'in_progress', title: 'Взять в работу' }]
    if (task.status === 'in_progress')
      return [{ status: 'in_review', title: 'Отправить на проверку' }]
  }
  return []
}

export function TaskCard({ api, me }: Props) {
  const { id } = useParams()
  const client = useQueryClient()
  const detail = useQuery({
    queryKey: ['task', id],
    queryFn: () => api<TaskDetail>(`/tasks/${id}`),
  })
  const [comment, setComment] = useState('')
  const [editing, setEditing] = useState(false)
  const mutation = useMutation({
    mutationFn: (status: Status) =>
      api(`/tasks/${id}/transitions`, { status, comment: comment.trim() || undefined }),
    onSuccess: () => setComment(''),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['tasks'] }),
        client.invalidateQueries({ queryKey: ['task', id] }),
        client.invalidateQueries({ queryKey: ['object'] }),
      ])
    },
  })
  if (!detail.data)
    return (
      <p role="status">
        {detail.error?.message ?? 'Загружаем задачу…'} <Link to="/">К списку</Link>
      </p>
    )
  const { task, history } = detail.data
  const available = actions(task, me)
  return (
    <section>
      <Link className="back" to="/">
        ← К списку задач
      </Link>
      <div className="titleline">
        <h1>{task.title}</h1>
        <Badge status={task.status} />
      </div>
      <div className="columns">
        <div className="panel pad">
          <h2>О задаче</h2>
          <dl>
            <dt>Объект</dt>
            <dd>
              {task.object.name}
              <small>{task.object.address}</small>
            </dd>
            <dt>Исполнитель</dt>
            <dd>{person(task.assignee?.display_name, task.assignee_id)}</dd>
            <dt>Постановщик</dt>
            <dd>{person(task.author?.display_name, task.created_by)}</dd>
            <dt>Создана</dt>
            <dd>{date(task.created_at)}</dd>
          </dl>
          {task.description && <p className="preserve">{task.description}</p>}
          {me.role === 'manager' && (
            <div className="buttons">
              <Button variant="light" onClick={() => setEditing(true)}>
                Редактировать задачу
              </Button>
              <DeleteAction api={api} table="tasks" id={task.id} name={task.title} />
              <Modal
                opened={editing}
                onClose={() => setEditing(false)}
                title="Редактировать задачу"
              >
                {editing && (
                  <TaskForm
                    api={api}
                    task={task}
                    objectId={task.object_id}
                    onCreated={() => setEditing(false)}
                  />
                )}
              </Modal>
            </div>
          )}
          {available.length > 0 && (
            <div className="actions">
              {available.some((a) => a.status === 'rework') && (
                <Textarea
                  label="Комментарий"
                  description="Обязателен при возврате на доработку"
                  value={comment}
                  onChange={(e) => setComment(e.currentTarget.value)}
                />
              )}
              <div className="buttons">
                {available.map((a) => (
                  <Button
                    key={a.status}
                    variant={a.status === 'rework' ? 'light' : 'filled'}
                    disabled={mutation.isPending || (a.status === 'rework' && !comment.trim())}
                    onClick={() => mutation.mutate(a.status)}
                  >
                    {a.title}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
        </div>
        <aside className="panel pad">
          <h2>История задачи</h2>
          <ol>
            {history.map((e) => (
              <li key={e.id}>
                <strong>
                  {e.from_status ? `${labels[e.from_status]} → ` : ''}
                  {labels[e.to_status]}
                </strong>
                <small>
                  {date(e.changed_at)} · {person(e.actor?.display_name, e.changed_by)}
                </small>
                {e.comment && <p className="preserve">{e.comment}</p>}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}
