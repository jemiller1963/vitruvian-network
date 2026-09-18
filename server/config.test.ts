import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('runtime configuration', () => {
  it('defaults backend fixture isolation off', () => {
    expect(loadConfig({}).fixtureIsolation).toBe(false)
  })

  it('requires an explicit valid value to enable fixture isolation', () => {
    expect(loadConfig({ VITRUVIAN_FIXTURE_ISOLATION: 'true' }).fixtureIsolation).toBe(true)
    expect(() => loadConfig({ VITRUVIAN_FIXTURE_ISOLATION: 'yes' })).toThrow()
  })

  it('preserves current collector startup behavior unless explicitly constrained', () => {
    const config = loadConfig({})
    expect(config.collectorConcurrency).toBe(7)
    expect(config.collectorStartupStaggerMs).toBe(0)
  })

  it('accepts bounded preview collector controls and rejects unsafe values', () => {
    const config = loadConfig({
      VITRUVIAN_COLLECTOR_CONCURRENCY: '1',
      VITRUVIAN_COLLECTOR_STARTUP_STAGGER_MS: '750',
    })
    expect(config.collectorConcurrency).toBe(1)
    expect(config.collectorStartupStaggerMs).toBe(750)
    expect(() => loadConfig({ VITRUVIAN_COLLECTOR_CONCURRENCY: '0' })).toThrow()
    expect(() => loadConfig({ VITRUVIAN_COLLECTOR_CONCURRENCY: '8' })).toThrow()
    expect(() => loadConfig({ VITRUVIAN_COLLECTOR_STARTUP_STAGGER_MS: '-1' })).toThrow()
  })
})
