import { fileURLToPath } from 'node:url'
import { type Health, HealthResponse } from '@crm/contracts'
import fastifyStatic from '@fastify/static'
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

if (process.env.NODE_ENV === 'production') {
  await app.register(fastifyStatic, { root: fileURLToPath(new URL('../public/', import.meta.url)) })
  // Direct visits to client routes need the same HTML entry point as the home page.
  for (const route of ['/objects', '/objects/:id', '/tasks/:id']) {
    app.get(route, (_request, reply) => reply.sendFile('index.html'))
  }
}

await app.listen({
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 3001),
})
