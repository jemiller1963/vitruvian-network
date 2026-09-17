import { describe, expect, it } from 'vitest'
import { fixtureDeferredSections, isFixtureDeferredTab } from './fixture-isolation'
import type { DashboardTab } from './navigation'

describe('fixture isolation', () => {
  it('keeps the Phase 2 live screens enabled', () => {
    expect(isFixtureDeferredTab('deck')).toBe(false)
    expect(isFixtureDeferredTab('agents')).toBe(false)
  })

  it('defers every legacy Supabase-backed screen', () => {
    const tabs: DashboardTab[] = ['tasks', 'log', 'council', 'meetings']

    expect(tabs.every(isFixtureDeferredTab)).toBe(true)
    expect(Object.keys(fixtureDeferredSections)).toEqual(tabs)
  })
})
