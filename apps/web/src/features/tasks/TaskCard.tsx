import type { Profile, Task, TaskDetail } from '@crm/contracts'
import { Role, Status } from '@crm/contracts'
import { Button, Modal, Textarea } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Api } from '../../shared/api'
import { DeleteAction } from '../../shared/DeleteAction'
import { statusLabels } from './statusLabels'
import { TaskForm } from './TaskForm'
import { TaskStatusBadge } from './TaskStatusBadge'

const date = (s: string) =>
  new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
function person(name: string | undefined, id: string) {
  return name || `Сотрудник · ${id.slice(0, 8)}`
}
type Props = { api: Api; me: Profile }

type Action = { status: Status; title: string }

function actions(task: Task, me: Profile): Action[] {
  if (me.role === Role.Manager && task.status === Status.InReview)
    return [
      { status: Status.Accepted, title: 'Принять' },
      { status: Status.Rework, title: 'Вернуть на доработку' },
    ]
  if (me.role === Role.Executor && me.id === task.assignee_id) {
    if (task.status === Status.New || task.status === Status.Rework)
      return [{ status: Status.InProgress, title: 'Взять в работу' }]
    if (task.status === Status.InProgress)
      return [{ status: Status.InReview, title: 'Отправить на проверку' }]
  }
  return []
}

export function TaskCard({ api, me }: Props) {
  const { id } = useParams()
  const client = useQueryClient()
  const [comment, setComment] = useState('')
  const [editing, setEditing] = useState(false)

  const detail = useQuery({
    queryKey: ['task', id],
    queryFn: () => api<TaskDetail>(`/tasks/${id}`),
  })

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
        <TaskStatusBadge status={task.status} />
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
          {me.role === Role.Manager && (
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
              {available.some((a) => a.status === Status.Rework) && (
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
                    variant={a.status === Status.Rework ? 'light' : 'filled'}
                    disabled={mutation.isPending || (a.status === Status.Rework && !comment.trim())}
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
                  {e.from_status ? `${statusLabels[e.from_status]} → ` : ''}
                  {statusLabels[e.to_status]}
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
