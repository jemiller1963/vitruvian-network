import { describe, expect, it } from 'vitest'
import { pathForTab, tabFromPath } from './navigation'

describe('dashboard navigation', () => {
  it.each([
    ['/', 'deck'],
    ['/agents', 'agents'],
    ['/agents/', 'agents'],
    ['/tasks', 'tasks'],
    ['/log', 'log'],
    ['/council', 'council'],
    ['/meetings', 'meetings'],
  ] as const)('maps %s to %s', (path, tab) => {
    expect(tabFromPath(path)).toBe(tab)
  })

  it('falls back to the command deck for an unknown path', () => {
    expect(tabFromPath('/unknown')).toBe('deck')
  })

  it('provides a stable path for each tab', () => {
    expect(pathForTab('deck')).toBe('/')
    expect(pathForTab('agents')).toBe('/agents')
  })
})
