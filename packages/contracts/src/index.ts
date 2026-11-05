import { Type, type Static } from '@sinclair/typebox'

export const HealthResponse = Type.Object({ status: Type.Literal('ok') })
export type Health = Static<typeof HealthResponse>
