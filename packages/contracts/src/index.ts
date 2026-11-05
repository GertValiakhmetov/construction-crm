import { type Static, Type } from '@sinclair/typebox'

export * from './objects.js'
export * from './tasks.js'

export const HealthResponse = Type.Object({ status: Type.Literal('ok') })
export type Health = Static<typeof HealthResponse>
