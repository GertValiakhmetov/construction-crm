import type { NewObjectInput, Profile, SiteObject } from '@crm/contracts'
import { Role } from '@crm/contracts'
import { Button, Modal } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Api } from '../../shared/api'
import { ObjectForm } from './ObjectForm'

type Props = { api: Api; me: Profile }

export function ObjectList({ api, me }: Props) {
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
        {me.role === Role.Manager && (
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
