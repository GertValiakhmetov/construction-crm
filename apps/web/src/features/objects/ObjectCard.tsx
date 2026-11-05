import type { NewObjectInput, ObjectDetail, Profile } from '@crm/contracts'
import { Role } from '@crm/contracts'
import { Button, Modal } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Api } from '../../shared/api'
import { DeleteAction } from '../../shared/DeleteAction'
import { TaskForm } from '../tasks/TaskForm'
import { TaskStatusBadge } from '../tasks/TaskStatusBadge'
import { ObjectForm } from './ObjectForm'

type Props = { api: Api; me: Profile }

export function ObjectCard({ api, me }: Props) {
  const { id } = useParams()
  const cache = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)

  const detail = useQuery({
    queryKey: ['object', id],
    queryFn: () => api<ObjectDetail>(`/objects/${id}`),
  })

  const update = useMutation({
    mutationFn: (input: NewObjectInput) => api(`/objects/${id}`, input, 'PUT'),
    onSuccess: async () => {
      await cache.invalidateQueries()
      setEditing(false)
    },
  })

  const site = detail.data

  return (
    <section>
      <Link className="back" to="/objects">
        ← К списку объектов
      </Link>
      {detail.isPending && <p>Загружаем объект…</p>}
      {detail.error && <p role="alert">{detail.error.message}</p>}
      {site && (
        <>
          <h1 className="site-title">{site.name}</h1>
          <p className="site-address">{site.address}</p>
          {me.role === Role.Manager && (
            <div className="buttons">
              <Button
                variant="light"
                onClick={() => {
                  update.reset()
                  setEditing(true)
                }}
              >
                Редактировать объект
              </Button>
              <DeleteAction api={api} table="objects" id={site.id} name={site.name} />
              <Modal
                title="Редактировать объект"
                opened={editing}
                onClose={() => setEditing(false)}
              >
                <ObjectForm
                  site={site}
                  save={update.mutate}
                  pending={update.isPending}
                  error={update.error}
                />
              </Modal>
            </div>
          )}
          <div className="section-title">
            <h2>Задачи объекта</h2>
            {me.role === Role.Manager && (
              <Button onClick={() => setOpen(true)}>Новая задача</Button>
            )}
          </div>
          <div className="panel">
            {site.tasks.map((task) => (
              <Link key={task.id} className="row" to={`/tasks/${task.id}`}>
                <strong>{task.title}</strong>
                <TaskStatusBadge status={task.status} />
              </Link>
            ))}
            {!site.tasks.length && <p className="pad">На объекте пока нет задач</p>}
          </div>
          <Modal opened={open} onClose={() => setOpen(false)} title="Новая задача">
            {open && <TaskForm api={api} objectId={site.id} onCreated={() => setOpen(false)} />}
          </Modal>
        </>
      )}
    </section>
  )
}
