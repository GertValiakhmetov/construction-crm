import Fastify from 'fastify'
import { HealthResponse, type Health } from '@crm/contracts'

const app = Fastify({ logger: true })

app.get<{ Reply: Health }>('/api/health', {
  schema: { response: { 200: HealthResponse } },
}, async () => ({ status: 'ok' }))

await app.listen({ host: '127.0.0.1', port: 3001 })
