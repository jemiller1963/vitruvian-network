import { describe, expect, it } from 'vitest'
import {
  fixtureDeferredSections,
  isFixtureDeferredTab,
  shouldDeferLegacyTab,
} from './fixture-isolation'
import type { DashboardTab } from './navigation'

describe('legacy screen isolation', () => {
  it('keeps the Phase 2 telemetry screens enabled', () => {
    expect(isFixtureDeferredTab('deck')).toBe(false)
    expect(isFixtureDeferredTab('agents')).toBe(false)
    expect(shouldDeferLegacyTab('deck', true)).toBe(false)
    expect(shouldDeferLegacyTab('agents', true)).toBe(false)
  })

  it('defers every legacy Supabase-backed screen when explicitly disabled', () => {
    const tabs: DashboardTab[] = ['tasks', 'log', 'council', 'meetings']

    expect(tabs.every(isFixtureDeferredTab)).toBe(true)
    expect(tabs.every((tab) => shouldDeferLegacyTab(tab, true))).toBe(true)
    expect(Object.keys(fixtureDeferredSections)).toEqual(tabs)
  })

  it('does not couple legacy deferral to fixture data mode', () => {
    const tabs: DashboardTab[] = ['tasks', 'log', 'council', 'meetings']

    expect(tabs.every((tab) => shouldDeferLegacyTab(tab, false))).toBe(false)
  })
})
