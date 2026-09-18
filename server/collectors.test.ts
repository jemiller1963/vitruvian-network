import { describe, expect, it, vi } from 'vitest'
import { CollectorManager } from './collectors.js'
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

    manager.stop()
    releaseTasks()
    await Promise.all([first, second])

    expect(taskAudit).not.toHaveBeenCalled()
  })
})
