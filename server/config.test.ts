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
})
