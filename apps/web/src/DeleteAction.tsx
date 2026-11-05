import { Button, Modal } from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Api } from './api'

export function DeleteAction({
  api,
  table,
  id,
  name,
}: {
  api: Api
  table: 'objects' | 'tasks'
  id: string
  name: string
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const cache = useQueryClient()
  const title = table === 'objects' ? 'Удалить объект' : 'Удалить задачу'
  const remove = useMutation({
    mutationFn: () => api(`/${table}/${id}`, undefined, 'DELETE'),
    onSuccess: async () => {
      navigate(table === 'objects' ? '/objects' : '/', { replace: true })
      await cache.invalidateQueries()
    },
  })
  return (
    <>
      <Button
        variant="subtle"
        color="red"
        onClick={() => {
          remove.reset()
          setOpen(true)
        }}
      >
        {title}
      </Button>
      <Modal
        opened={open}
        onClose={() => {
          if (!remove.isPending) setOpen(false)
        }}
        title={title}
      >
        <p>
          Удалить «{name}»? {table === 'tasks' && 'История задачи тоже будет удалена.'}
        </p>
        {remove.error && <p role="alert">{remove.error.message}</p>}
        <div className="buttons">
          <Button variant="default" disabled={remove.isPending} onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button color="red" loading={remove.isPending} onClick={() => remove.mutate()}>
            Удалить
          </Button>
        </div>
      </Modal>
    </>
  )
}
