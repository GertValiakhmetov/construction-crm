import { type Static, Type } from '@sinclair/typebox'

export const statuses = ['new', 'in_progress', 'in_review', 'rework', 'accepted'] as const
export type Status = (typeof statuses)[number]
export const Transition = Type.Object(
  {
    status: Type.Union(statuses.map((status) => Type.Literal(status))),
    comment: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)
export type TransitionInput = Static<typeof Transition>
export const TaskParams = Type.Object({ id: Type.String({ format: 'uuid' }) })
export type Profile = { id: string; display_name: string; role: 'manager' | 'executor' }
export type Person = { display_name: string } | null
export type Task = {
  id: string
  title: string
  description: string | null
  status: Status
  created_at: string
  assignee_id: string
  object_id: string
  created_by: string
  object: { name: string; address: string }
  assignee: Person
  author: Person
}
export type HistoryEvent = {
  id: number
  from_status: Status | null
  to_status: Status
  changed_at: string
  changed_by: string
  actor: Person
  comment: string | null
}
export type TaskDetail = { task: Task; history: HistoryEvent[] }
