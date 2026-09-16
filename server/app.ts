import path from 'node:path'
import os from 'node:os'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import { OpenClawAdapter } from './openclaw.js'
import { activityQuerySchema, eventQuerySchema } from '../shared/contracts.js'

export function buildApp({
  config,
  db,
  openclaw = new OpenClawAdapter(config),
}: {
  config: AppConfig
  db: Db
  openclaw?: OpenClawAdapter
}) {
  const app = Fastify({ logger: false, bodyLimit: 65_536 })

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    if (origin && !config.allowedOrigins.includes(origin)) {
      return reply.code(403).send({
        error: {
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Request origin is not allowed.',
          requestId: request.id,
        },
      })
    }
    reply.headers({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    })
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store')
  })

  app.setErrorHandler((_error, request, reply) =>
    reply.code(400).send({
      error: {
        code: 'INVALID_REQUEST',
        message: 'The request is invalid.',
        requestId: request.id,
      },
    }),
  )

  app.get('/api/v1/health', async () => ({
    data: { status: 'ready', version: '0.1.0', observedAt: new Date().toISOString() },
  }))
  app.get('/api/v1/agents', async () => ({ data: await openclaw.agents() }))
  app.get('/api/v1/agents/:id', async (request: any, reply) => {
    const found = (await openclaw.agents()).find((agent) => agent.id === request.params.id)
    return found
      ? { data: found }
      : reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Agent not found', requestId: request.id },
        })
  })
  app.get('/api/v1/events', async (request) => {
    const query = eventQuerySchema.parse(request.query)
    const rows = db
      .prepare(
        `SELECT id,source_event_id sourceEventId,event_type eventType,agent_id agentId,description,status,occurred_at occurredAt,observed_at observedAt FROM events ${query.agentId ? 'WHERE agent_id = ?' : ''} ORDER BY occurred_at DESC,id DESC LIMIT ?`,
      )
      .all(...(query.agentId ? [query.agentId, query.limit] : [query.limit]))
    return { data: { items: rows, nextCursor: null } }
  })
  app.get('/api/v1/metrics/summary', async () => ({
    data: {
      activeAgents: 0,
      tasksCompleted: Number(
        (
          db
            .prepare(
              "SELECT count(*) n FROM events WHERE event_type='task.completed' AND occurred_at >= datetime('now','-1 day')",
            )
            .get() as any
        ).n,
      ),
      failedEvents: Number(
        (
          db
            .prepare(
              "SELECT count(*) n FROM events WHERE status='failed' AND occurred_at >= datetime('now','-1 day')",
            )
            .get() as any
        ).n,
      ),
      observedAt: new Date().toISOString(),
    },
  }))
  app.get('/api/v1/metrics/activity', async (request) => {
    const query = activityQuerySchema.parse(request.query)
    const agents = await openclaw.agents()
    const daily = Array.from({ length: query.days }, (_, index) => {
      const date = new Date()
      date.setUTCDate(date.getUTCDate() - query.days + 1 + index)
      date.setUTCHours(0, 0, 0, 0)
      return { start: date.toISOString(), total: 0, completed: 0 }
    })
    return {
      data: {
        timezone: query.timezone,
        days: query.days,
        daily,
        byAgentHour: agents.flatMap((agent) =>
          Array.from({ length: 24 }, (_, hour) => ({ agentId: agent.id, hour, count: 0 })),
        ),
        observedAt: new Date().toISOString(),
      },
    }
  })
  app.get('/api/v1/system/summary', async () => ({
    data: {
      gateway: await openclaw.gateway(),
      loadAverage: os.loadavg(),
      memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
      observedAt: new Date().toISOString(),
    },
  }))
  app.get('/api/v1/models', async () => ({ data: [] }))
  app.get('/api/v1/sessions', async () => ({
    data: { capability: 'unavailable', observedAt: new Date().toISOString() },
  }))
  app.get('/api/v1/jobs', async () => ({
    data: { capability: 'unavailable', observedAt: new Date().toISOString() },
  }))
  app.get('/api/v1/stream', async (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    })
    reply.raw.write('event: ready\ndata: {"type":"ready"}\n\n')
    const timer = setInterval(() => {
      if (!reply.raw.writableNeedDrain) reply.raw.write(': heartbeat\n\n')
    }, 15_000)
    request.raw.on('close', () => clearInterval(timer))
  })

  app.register(fastifyStatic, {
    root: config.staticDir,
    prefix: '/',
    maxAge: '30d',
    immutable: true,
    setHeaders(response, filePath) {
      if (path.basename(filePath) === 'index.html') {
        response.header('Cache-Control', 'no-store')
      }
    },
  })
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html', { maxAge: 0, immutable: false })
    }
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'Resource not found.', requestId: request.id },
    })
  })

  return app
}
