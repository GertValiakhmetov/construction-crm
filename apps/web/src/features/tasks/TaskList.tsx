import type { Profile, Task } from '@crm/contracts'
import { Role } from '@crm/contracts'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { Api } from '../../shared/api'
import { TaskStatusBadge } from './TaskStatusBadge'

type Props = { api: Api; me: Profile }

export function TaskList({ api, me }: Props) {
  const list = useQuery({ queryKey: ['tasks'], queryFn: () => api<Task[]>('/tasks') })
  return (
    <section>
      <h1>{me.role === Role.Manager ? 'Все задачи' : 'Мои задачи'}</h1>
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
              <TaskStatusBadge status={task.status} />
            </Link>
          ))}
          {!list.data.length && <p className="pad">Пока нет задач</p>}
        </div>
      )}
    </section>
  )
}
