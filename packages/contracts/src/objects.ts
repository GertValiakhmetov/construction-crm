import { type Static, Type } from '@sinclair/typebox'
import type { Task } from './tasks.js'

const requiredText = Type.String({ pattern: '\\S' })
export const NewObject = Type.Object({ name: requiredText, address: requiredText })
export const NewTask = Type.Object({
  title: requiredText,
  description: Type.Optional(Type.String()),
  assignee_id: Type.String({ format: 'uuid' }),
})
export type NewObjectInput = Static<typeof NewObject>
export type NewTaskInput = Static<typeof NewTask>
export const EditTask = Type.Composite([
  NewTask,
  Type.Object({ object_id: Type.String({ format: 'uuid' }) }),
])
export type EditTaskInput = Static<typeof EditTask>
export type SiteObject = NewObjectInput & { id: string }
export type ObjectDetail = SiteObject & { tasks: Pick<Task, 'id' | 'title' | 'status'>[] }
