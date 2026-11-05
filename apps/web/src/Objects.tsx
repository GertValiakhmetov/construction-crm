import type { NewObjectInput, ObjectDetail, Profile, SiteObject } from '@crm/contracts'
import { Button, Modal } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Api } from './api'
import { DeleteAction } from './DeleteAction'
import { ObjectForm, TaskForm } from './Forms'
import { Badge } from './Tasks'

type Props = { api: Api; me: Profile }

export function Objects({ api, me }: Props) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [open, setOpen] = useState(false)
  const list = useQuery({ queryKey: ['objects'], queryFn: () => api<SiteObject[]>('/objects') })
  const create = useMutation({
    mutationFn: (input: NewObjectInput) => api<{ id: string }>('/objects', input),
    onSuccess: async ({ id }) => {
      await cache.invalidateQueries({ queryKey: ['objects'] })
      navigate(`/objects/${id}`)
    },
  })
  return (
    <section>
      <div className="section-title">
        <h1>Объекты</h1>
        {me.role === 'manager' && (
          <Button
            onClick={() => {
              create.reset()
              setOpen(true)
            }}
          >
            Новый объект
          </Button>
        )}
      </div>
      {list.isPending && <p>Загружаем объекты…</p>}
      {list.error && <p role="alert">{list.error.message}</p>}
      {list.data && (
        <div className="panel">
          {list.data.map((site) => (
            <Link key={site.id} className="row site-row" to={`/objects/${site.id}`}>
              <span>
                <strong>{site.name}</strong>
                <small>{site.address}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {!list.data.length && <p className="pad">Пока нет доступных объектов</p>}
        </div>
      )}
      <Modal
        opened={open}
        onClose={() => {
          if (!create.isPending) setOpen(false)
        }}
        title="Новый объект"
      >
        <ObjectForm save={create.mutate} pending={create.isPending} error={create.error} />
      </Modal>
    </section>
  )
}

export function ObjectCard({ api, me }: Props) {
  const { id } = useParams()
  const [open, setOpen] = useState(false)
  const detail = useQuery({
    queryKey: ['object', id],
    queryFn: () => api<ObjectDetail>(`/objects/${id}`),
  })
  const cache = useQueryClient()
  const [editing, setEditing] = useState(false)
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
          {me.role === 'manager' && (
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
            {me.role === 'manager' && <Button onClick={() => setOpen(true)}>Новая задача</Button>}
          </div>
          <div className="panel">
            {site.tasks.map((task) => (
              <Link key={task.id} className="row" to={`/tasks/${task.id}`}>
                <strong>{task.title}</strong>
                <Badge status={task.status} />
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
