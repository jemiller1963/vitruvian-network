import path from 'node:path'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { z } from 'zod'
import { activityQuerySchema, eventQuerySchema } from '../shared/contracts.js'
import type { AppConfig } from './config.js'
import { currentRevision } from './db.js'
import type { Db } from './db.js'
import { OpenClawAdapter } from './openclaw.js'
import { TelemetryStore } from './telemetry.js'

const agentParams = z.object({ id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/) })

export function buildApp({
  config,
  db,
  openclaw = new OpenClawAdapter(config),
  telemetry = new TelemetryStore(db, config.databasePath),
}: {
  config: AppConfig
  db: Db
  openclaw?: OpenClawAdapter
  telemetry?: TelemetryStore
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

  app.setErrorHandler((error, request, reply) => {
    const code = error instanceof Error && error.message === 'INVALID_CURSOR'
      ? 'INVALID_CURSOR'
      : 'INVALID_REQUEST'
    return reply.code(400).send({
      error: { code, message: 'The request is invalid.', requestId: request.id },
    })
  })

  app.get('/api/v1/health', async () => ({
    data: { status: 'ready', version: '0.2.0', observedAt: new Date().toISOString() },
  }))

  app.get('/api/v1/agents', async () => {
    const roster = await openclaw.configuredAgents()
    return { data: telemetry.agents(roster) }
  })

  app.get('/api/v1/agents/:id', async (request, reply) => {
    const { id } = agentParams.parse(request.params)
    const found = telemetry.agentDetail(await openclaw.configuredAgents(), id)
    return found
      ? { data: found }
      : reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Agent not found.', requestId: request.id },
        })
  })

  app.get('/api/v1/agents/:id/activity', async (request) => {
    const { id } = agentParams.parse(request.params)
    const query = eventQuerySchema.parse({ ...request.query as object, agentId: id })
    return { data: telemetry.events(query) }
  })

  app.get('/api/v1/events', async (request) => ({
    data: telemetry.events(eventQuerySchema.parse(request.query)),
  }))

  app.get('/api/v1/metrics/summary', async () => ({
    data: telemetry.metrics((await openclaw.configuredAgents()).length),
  }))

  app.get('/api/v1/metrics/activity', async (request) => {
    const query = activityQuerySchema.parse(request.query)
    return {
      data: telemetry.activity(await openclaw.configuredAgents(), query.days, query.timezone),
    }
  })

  app.get('/api/v1/system/summary', async () => ({ data: telemetry.systemSummary() }))
  app.get('/api/v1/telemetry/health', async () => ({ data: telemetry.telemetryHealth() }))
  app.get('/api/v1/models', async () => ({ data: [] }))
  app.get('/api/v1/sessions', async () => ({
    data: { capability: 'context-only', observedAt: new Date().toISOString() },
  }))
  app.get('/api/v1/jobs', async () => ({
    data: { capability: 'read-only', observedAt: new Date().toISOString() },
  }))

  app.get('/api/v1/stream', async (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    let revision = currentRevision(db)
    const lastEventId = Number(request.headers['last-event-id'])
    if (Number.isFinite(lastEventId) && lastEventId > revision) {
      reply.raw.write(`event: resync.required\ndata: {"revision":${revision}}\n\n`)
    }
    reply.raw.write(`event: ready\nid: ${revision}\ndata: {"revision":${revision}}\n\n`)
    const timer = setInterval(() => {
      const next = currentRevision(db)
      if (next > revision) {
        revision = next
        const data = JSON.stringify({ revision, observedAt: new Date().toISOString() })
        for (const type of ['agents.changed', 'events.changed', 'metrics.changed', 'system.changed', 'telemetry.health']) {
          reply.raw.write(`event: ${type}\nid: ${revision}\ndata: ${data}\n\n`)
        }
      } else if (!reply.raw.writableNeedDrain) {
        reply.raw.write(`: heartbeat ${new Date().toISOString()}\n\n`)
      }
    }, 5_000)
    request.raw.on('close', () => clearInterval(timer))
  })

  app.register(fastifyStatic, {
    root: config.staticDir,
    prefix: '/',
    maxAge: '30d',
    immutable: true,
    setHeaders(response, filePath) {
      if (path.basename(filePath) === 'index.html') response.header('Cache-Control', 'no-store')
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
