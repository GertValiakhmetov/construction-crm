import type { EditTaskInput, Profile, SiteObject, Task } from '@crm/contracts'
import { Button, NativeSelect, Textarea, TextInput } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Api } from '../../shared/api'
import { formValues } from '../../shared/formValues'

export function TaskForm({
  api,
  objectId,
  task,
  onCreated,
}: {
  api: Api
  objectId: string
  task?: Task
  onCreated: () => void
}) {
  const cache = useQueryClient()

  const executors = useQuery({
    queryKey: ['executors'],
    queryFn: () => api<Pick<Profile, 'id' | 'display_name'>[]>('/executors'),
  })

  const sites = useQuery({
    queryKey: ['objects'],
    queryFn: () => api<SiteObject[]>('/objects'),
    enabled: !!task,
  })

  const create = useMutation({
    mutationFn: (input: EditTaskInput) => {
      if (task) return api(`/tasks/${task.id}`, input, 'PUT')
      return api(`/objects/${objectId}/tasks`, input)
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['object'] }),
        cache.invalidateQueries({ queryKey: ['task'] }),
        cache.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      onCreated()
    },
  })

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        const value = formValues(event)
        create.mutate({
          object_id: task ? value('object_id') : objectId,
          title: value('title'),
          description: value('description'),
          assignee_id: value('assignee_id'),
        })
      }}
    >
      <TextInput
        defaultValue={task?.title}
        name="title"
        label="Название задачи"
        required
        pattern=".*\S.*"
        data-autofocus
      />
      <Textarea defaultValue={task?.description ?? ''} name="description" label="Описание" />
      {task && (
        <NativeSelect
          name="object_id"
          label="Объект"
          required
          defaultValue={objectId}
          key={`objects-${sites.isSuccess}`}
        >
          {sites.data?.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {sites.error && <p role="alert">{sites.error.message}</p>}
      <NativeSelect
        key={`workers-${executors.isSuccess}`}
        name="assignee_id"
        label="Исполнитель"
        required
        defaultValue={task?.assignee_id ?? ''}
      >
        <option value="" disabled>
          Выберите исполнителя
        </option>
        {executors.data?.map((user) => (
          <option key={user.id} value={user.id}>
            {user.display_name}
          </option>
        ))}
      </NativeSelect>
      {executors.isPending && <p>Загружаем исполнителей…</p>}
      {executors.data?.length === 0 && <p>Нет доступных исполнителей</p>}
      {(executors.error || create.error) && (
        <p role="alert">{(executors.error || create.error)?.message}</p>
      )}
      <Button
        type="submit"
        loading={create.isPending}
        disabled={!executors.data?.length || (!!task && !sites.isSuccess)}
      >
        {task ? 'Сохранить' : 'Создать задачу'}
      </Button>
    </form>
  )
}
