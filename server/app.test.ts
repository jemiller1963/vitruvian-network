import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { buildApp } from './app.js'
import { openDatabase } from './db.js'
import type { AppConfig } from './config.js'

const cleanup: Array<() => Promise<void> | void> = []

afterEach(async () => {
  for (const action of cleanup.splice(0).reverse()) await action()
})

async function fixture(options: {
  fixtureIsolation?: boolean
  openclaw?: { configuredAgents(): Promise<never> }
} = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vitruvian-'))
  const configPath = path.join(directory, 'openclaw.json')
  const staticDir = path.join(directory, 'dist')
  await fs.mkdir(path.join(staticDir, 'assets'), { recursive: true })
  await fs.writeFile(
    configPath,
    JSON.stringify({
      auth: { token: 'must-not-leak' },
      agents: {
        defaults: { model: { primary: 'provider/default' } },
        list: [
          {
            id: 'main',
            name: 'Leo',
            model: { primary: 'provider/leo' },
            subagents: { allowAgents: ['researcher', 'raph'] },
          },
          { id: 'researcher', name: 'Researcher' },
        ],
      },
    }),
  )
  await fs.writeFile(path.join(staticDir, 'index.html'), '<main>Vitruvian shell</main>')
  await fs.writeFile(path.join(staticDir, 'assets', 'app.js'), 'window.VITRUVIAN = true')

  const config: AppConfig = {
    host: '127.0.0.1',
    port: 50_123,
    databasePath: path.join(directory, 'test.db'),
    openclawConfigPath: configPath,
    openclawBinary: 'definitely-not-openclaw',
    telemetryHmacSecret: 'a-secure-test-secret-with-32-characters',
    fixtureIsolation: options.fixtureIsolation ?? false,
    staticDir,
    allowedOrigins: ['http://127.0.0.1:5173'],
  }
  const db = openDatabase(config.databasePath)
  const app = buildApp({ config, db, openclaw: options.openclaw })
  cleanup.push(async () => {
    await app.close()
    db.close()
    await fs.rm(directory, { recursive: true, force: true })
  })
  return app
}

describe('API', () => {
  it('does not access OpenClaw while backend fixture isolation is enabled', async () => {
    const configuredAgents = vi.fn(async (): Promise<never> => {
      throw new Error('OPENCLAW_MUST_NOT_BE_ACCESSED')
    })
    const app = await fixture({ fixtureIsolation: true, openclaw: { configuredAgents } })

    const agents = await app.inject({ method: 'GET', url: '/api/v1/agents' })
    const agent = await app.inject({ method: 'GET', url: '/api/v1/agents/main' })
    const metrics = await app.inject({ method: 'GET', url: '/api/v1/metrics/summary' })
    const activity = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/activity?days=7&timezone=UTC',
    })

    expect(agents.statusCode).toBe(200)
    expect(agents.json().data).toEqual([])
    expect(agent.statusCode).toBe(404)
    expect(metrics.statusCode).toBe(200)
    expect(metrics.json().data.configuredAgents.value).toBe(0)
    expect(activity.statusCode).toBe(200)
    expect(configuredAgents).not.toHaveBeenCalled()

    const health = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(health.json().data).toMatchObject({
      status: 'ready',
      version: '0.2.0',
      mode: 'fixture-isolated',
      collectorsEnabled: false,
    })
  })

  it('returns a safe config-derived roster', async () => {
    const app = await fixture()
    const response = await app.inject({ method: 'GET', url: '/api/v1/agents' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.map((agent: any) => agent.id)).toEqual(['main', 'researcher'])
    expect(response.json().data[0]).toMatchObject({
      runtimeStatus: 'unknown',
      evidenceLevel: 'unavailable',
      activeRuns: 0,
      activeTasks: 0,
    })
    expect(response.body).not.toContain('must-not-leak')
    expect(response.body).not.toContain('/tmp/')
  })

  it('returns unavailable coverage instead of pretending empty telemetry is ready', async () => {
    const app = await fixture()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/activity?days=7&timezone=UTC',
    })
    expect(response.json().data.daily).toHaveLength(7)
    expect(response.json().data.byAgentHour).toHaveLength(336)
    expect(response.json().data.byAgentHour.every((item: any) => item.count === 0)).toBe(true)
    expect(response.json().data.status).toBe('unavailable')
    const metrics = await app.inject({ method: 'GET', url: '/api/v1/metrics/summary' })
    expect(metrics.json().data.workingNow).toMatchObject({
      value: null,
      status: 'unavailable',
    })
    const health = await app.inject({ method: 'GET', url: '/api/v1/telemetry/health' })
    expect(health.statusCode).toBe(200)
    expect(health.json().data.collectors).toEqual([])
  })

  it('rejects unapproved origins and malformed limits', async () => {
    const app = await fixture()
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/health',
          headers: { origin: 'https://evil.example' },
        })
      ).statusCode,
    ).toBe(403)
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/events?limit=999' })).statusCode,
    ).toBe(400)
  })

  it('serves the built dashboard and static assets', async () => {
    const app = await fixture()
    const shell = await app.inject({ method: 'GET', url: '/' })
    const asset = await app.inject({ method: 'GET', url: '/assets/app.js' })
    expect(shell.statusCode).toBe(200)
    expect(shell.body).toContain('Vitruvian shell')
    expect(shell.headers['cache-control']).toContain('no-store')
    expect(asset.statusCode).toBe(200)
    expect(asset.body).toContain('VITRUVIAN')
  })

  it('uses the SPA shell for browser routes but preserves API 404s', async () => {
    const app = await fixture()
    const browserRoute = await app.inject({ method: 'GET', url: '/agents' })
    const apiRoute = await app.inject({ method: 'GET', url: '/api/v1/missing' })
    expect(browserRoute.statusCode).toBe(200)
    expect(browserRoute.body).toContain('Vitruvian shell')
    expect(apiRoute.statusCode).toBe(404)
    expect(apiRoute.json().error.code).toBe('NOT_FOUND')
  })
})
