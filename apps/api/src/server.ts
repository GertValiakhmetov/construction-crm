import { type Health, HealthResponse } from '@crm/contracts'
import Fastify from 'fastify'
import { taskRoutes } from './tasks.js'

const app = Fastify({ logger: true })
taskRoutes(app)

app.get<{ Reply: Health }>(
  '/api/health',
  {
    schema: { response: { 200: HealthResponse } },
  },
  async () => ({ status: 'ok' }),
)

await app.listen({ host: '127.0.0.1', port: 3001 })
