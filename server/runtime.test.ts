import { describe, expect, it, vi } from 'vitest'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import { startCollectorManager } from './runtime.js'

const config = (fixtureIsolation: boolean): AppConfig => ({
  host: '127.0.0.1',
  port: 50_124,
  databasePath: '/tmp/fixture.db',
  openclawConfigPath: '/path/that/must/not/be/read.json',
  openclawBinary: 'must-not-run-openclaw',
  telemetryHmacSecret: null,
  fixtureIsolation,
  collectorConcurrency: 7,
  collectorStartupStaggerMs: 0,
  staticDir: '/tmp/dist',
  allowedOrigins: ['https://preview.example'],
})

describe('collector runtime isolation', () => {
  it('does not construct or start collectors in fixture isolation mode', () => {
    const create = vi.fn()

    expect(startCollectorManager(config(true), {} as Db, create)).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })

  it('starts collectors in normal runtime mode', () => {
    const lifecycle = { start: vi.fn(), stop: vi.fn() }
    const create = vi.fn(() => lifecycle)

    expect(startCollectorManager(config(false), {} as Db, create)).toBe(lifecycle)
    expect(create).toHaveBeenCalledOnce()
    expect(lifecycle.start).toHaveBeenCalledOnce()
  })
})
