import { type Static, Type } from '@sinclair/typebox'

export enum Role {
  Manager = 'manager',
  Executor = 'executor',
}

export enum Status {
  New = 'new',
  InProgress = 'in_progress',
  InReview = 'in_review',
  Rework = 'rework',
  Accepted = 'accepted',
}
export const Transition = Type.Object(
  {
    status: Type.Enum(Status),
    comment: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)
export type TransitionInput = Static<typeof Transition>
export const TaskParams = Type.Object({ id: Type.String({ format: 'uuid' }) })
export const ProfileResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  display_name: Type.String(),
  role: Type.Enum(Role),
})
export type Profile = Static<typeof ProfileResponse>
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
