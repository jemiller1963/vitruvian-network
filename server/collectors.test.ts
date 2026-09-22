import { describe, expect, it, vi } from 'vitest'
import { CollectorManager, statusSnapshot } from './collectors.js'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import type { OpenClawAdapter } from './openclaw.js'
import type { TelemetryStore } from './telemetry.js'

const config = (): AppConfig => ({
  host: '127.0.0.1',
  port: 50_124,
  databasePath: '/tmp/collector-test.db',
  openclawConfigPath: '/tmp/openclaw.json',
  openclawBinary: 'openclaw',
  telemetryHmacSecret: 'a-secure-test-secret-with-32-characters',
  fixtureIsolation: false,
  collectorConcurrency: 1,
  collectorStartupStaggerMs: 0,
  staticDir: '/tmp/dist',
  allowedOrigins: ['https://preview.example'],
})

const fakeStore = () => ({
  markCollectorAttempt: vi.fn(),
  markCollectorFailure: vi.fn(),
  markCollectorSuccess: vi.fn(),
  refreshAgentState: vi.fn(),
  upsertTasks: vi.fn(),
  ingest: vi.fn(),
})

describe('OpenClaw status compatibility', () => {
  it('maps the installed status envelope to gateway health and runtime version', () => {
    expect(statusSnapshot({
      runtimeVersion: '2026.7.1-2',
      gateway: { reachable: true, misconfigured: false, error: null },
    })).toEqual({ status: 'healthy', version: '2026.7.1-2' })

    expect(statusSnapshot({
      runtimeVersion: '2026.7.1-2',
      gateway: { reachable: false, misconfigured: false, error: null },
    })).toEqual({ status: 'degraded', version: '2026.7.1-2' })

    expect(statusSnapshot({
      runtimeVersion: '2026.7.1-2',
      gateway: { reachable: true, misconfigured: true, error: null },
    })).toEqual({ status: 'degraded', version: '2026.7.1-2' })

    expect(statusSnapshot({
      runtimeVersion: '2026.7.1-2',
      gateway: { reachable: true, misconfigured: false, error: 'connection failed' },
    })).toEqual({ status: 'degraded', version: '2026.7.1-2' })

    expect(statusSnapshot({ gateway: {} })).toEqual({ status: 'unknown', version: null })
  })
})

describe('collector resource controls', () => {
  it('never exceeds the configured global concurrency limit', async () => {
    let releaseTasks!: () => void
    let markTasksStarted!: () => void
    const tasksStarted = new Promise<void>((resolve) => { markTasksStarted = resolve })
    const tasksGate = new Promise<void>((resolve) => { releaseTasks = resolve })
    let active = 0
    let maxActive = 0

    const enter = () => {
      active += 1
      maxActive = Math.max(maxActive, active)
    }
    const leave = () => { active -= 1 }

    const taskAudit = vi.fn(async () => {
      enter()
      leave()
      return []
    })
    const openclaw = {
      tasks: vi.fn(async () => {
        enter()
        markTasksStarted()
        await tasksGate
        leave()
        return []
      }),
      taskAudit,
      configuredAgents: vi.fn(async () => []),
    } as unknown as OpenClawAdapter

    const manager = new CollectorManager(
      config(),
      {} as Db,
      openclaw,
      fakeStore() as unknown as TelemetryStore,
    )

    const first = manager.collectOnce('tasks')
    await tasksStarted
    const second = manager.collectOnce('task_audit')
    await Promise.resolve()

    expect(maxActive).toBe(1)
    expect(taskAudit).not.toHaveBeenCalled()

    releaseTasks()
    await Promise.all([first, second])

    expect(taskAudit).toHaveBeenCalledOnce()
    expect(maxActive).toBe(1)
  })

  it('suppresses a source for the process after a hard output-limit failure', async () => {
    const store = fakeStore()
    const flows = vi.fn(async (): Promise<never> => {
      throw new Error('OPENCLAW_COMMAND_OUTPUT_LIMIT')
    })
    const taskAudit = vi.fn(async () => [])
    const openclaw = {
      flows,
      taskAudit,
      configuredAgents: vi.fn(async () => []),
    } as unknown as OpenClawAdapter

    const manager = new CollectorManager(
      config(),
      {} as Db,
      openclaw,
      store as unknown as TelemetryStore,
    )

    await manager.collectOnce('flows')
    await manager.collectOnce('flows')
    await manager.collectOnce('task_audit')

    expect(flows).toHaveBeenCalledOnce()
    expect(store.markCollectorFailure).toHaveBeenCalledWith(
      'flows',
      'OPENCLAW_COMMAND_OUTPUT_LIMIT',
    )
    expect(taskAudit).toHaveBeenCalledOnce()
  })


  it('waits for an active collector to drain before stop resolves', async () => {
    let releaseTasks!: () => void
    let markTasksStarted!: () => void
    const tasksStarted = new Promise<void>((resolve) => { markTasksStarted = resolve })
    const tasksGate = new Promise<void>((resolve) => { releaseTasks = resolve })
    const configuredAgents = vi.fn(async () => [])

    const openclaw = {
      tasks: vi.fn(async () => {
        markTasksStarted()
        await tasksGate
        return []
      }),
      configuredAgents,
    } as unknown as OpenClawAdapter

    const manager = new CollectorManager(
      config(),
      {} as Db,
      openclaw,
      fakeStore() as unknown as TelemetryStore,
    )

    const collection = manager.collectOnce('tasks')
    await tasksStarted

    let stopped = false
    const stopping = manager.stop().then(() => { stopped = true })
    await Promise.resolve()

    expect(stopped).toBe(false)

    releaseTasks()
    await Promise.all([collection, stopping])

    expect(stopped).toBe(true)
    expect(configuredAgents).not.toHaveBeenCalled()
  })

  it('waits for every active collector before stop resolves', async () => {
    let releaseTasks!: () => void
    let releaseTaskAudit!: () => void
    let markTasksStarted!: () => void
    let markTaskAuditStarted!: () => void
    const tasksStarted = new Promise<void>((resolve) => { markTasksStarted = resolve })
    const taskAuditStarted = new Promise<void>((resolve) => { markTaskAuditStarted = resolve })
    const tasksGate = new Promise<void>((resolve) => { releaseTasks = resolve })
    const taskAuditGate = new Promise<void>((resolve) => { releaseTaskAudit = resolve })

    const openclaw = {
      tasks: vi.fn(async () => {
        markTasksStarted()
        await tasksGate
        return []
      }),
      taskAudit: vi.fn(async () => {
        markTaskAuditStarted()
        await taskAuditGate
        return []
      }),
      configuredAgents: vi.fn(async () => []),
    } as unknown as OpenClawAdapter

    const manager = new CollectorManager(
      { ...config(), collectorConcurrency: 2 },
      {} as Db,
      openclaw,
      fakeStore() as unknown as TelemetryStore,
    )

    const tasks = manager.collectOnce('tasks')
    const taskAudit = manager.collectOnce('task_audit')
    await Promise.all([tasksStarted, taskAuditStarted])

    let stopped = false
    const stopping = manager.stop().then(() => { stopped = true })

    releaseTasks()
    await tasks
    await Promise.resolve()
    expect(stopped).toBe(false)

    releaseTaskAudit()
    await Promise.all([taskAudit, stopping])
    expect(stopped).toBe(true)
  })

  it('does not start another audit page after stop is requested', async () => {
    let releasePage!: () => void
    let markPageStarted!: () => void
    const pageStarted = new Promise<void>((resolve) => { markPageStarted = resolve })
    const pageGate = new Promise<void>((resolve) => { releasePage = resolve })
    const auditPage = vi.fn(async () => {
      markPageStarted()
      await pageGate
      return { records: [], nextCursor: 'next-page', schemaVersion: 'test' }
    })
    const configuredAgents = vi.fn(async () => [])
    const openclaw = { auditPage, configuredAgents } as unknown as OpenClawAdapter
    const db = {
      prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })),
    } as unknown as Db

    const manager = new CollectorManager(
      config(),
      db,
      openclaw,
      fakeStore() as unknown as TelemetryStore,
    )

    const collection = manager.collectOnce('audit')
    await pageStarted
    const stopping = manager.stop()
    releasePage()
    await Promise.all([collection, stopping])

    expect(auditPage).toHaveBeenCalledOnce()
    expect(configuredAgents).not.toHaveBeenCalled()
  })

  it('does not start queued collectors after stop', async () => {
    let releaseTasks!: () => void
    let markTasksStarted!: () => void
    const tasksStarted = new Promise<void>((resolve) => { markTasksStarted = resolve })
    const tasksGate = new Promise<void>((resolve) => { releaseTasks = resolve })
    const taskAudit = vi.fn(async () => [])

    const openclaw = {
      tasks: vi.fn(async () => {
        markTasksStarted()
        await tasksGate
        return []
      }),
      taskAudit,
      configuredAgents: vi.fn(async () => []),
    } as unknown as OpenClawAdapter

    const manager = new CollectorManager(
      config(),
      {} as Db,
      openclaw,
      fakeStore() as unknown as TelemetryStore,
    )

    const first = manager.collectOnce('tasks')
    await tasksStarted
    const second = manager.collectOnce('task_audit')

    const stopping = manager.stop()
    releaseTasks()
    await Promise.all([first, second, stopping])

    expect(taskAudit).not.toHaveBeenCalled()
  })
})
