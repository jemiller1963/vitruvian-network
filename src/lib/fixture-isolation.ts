import type { DashboardTab } from '@/lib/navigation'

export const fixtureDeferredSections = {
  tasks: {
    title: 'Task Board',
    description: 'Task data remains deferred until this screen is migrated to the local Vitruvian truth layer.',
  },
  log: {
    title: 'AI Log',
    description: 'Log data remains deferred until this screen is migrated to verified local telemetry.',
  },
  council: {
    title: 'Council',
    description: 'Council sessions remain deferred until this screen is connected to authoritative local executions.',
  },
  meetings: {
    title: 'Meetings',
    description: 'Meeting data remains deferred until this screen is migrated away from the legacy data source.',
  },
} as const

export type FixtureDeferredTab = keyof typeof fixtureDeferredSections

export const legacyScreensDisabled =
  import.meta.env.VITE_VITRUVIAN_LEGACY_SCREENS_DISABLED === 'true'

export function isFixtureDeferredTab(tab: DashboardTab): tab is FixtureDeferredTab {
  return tab in fixtureDeferredSections
}

export function shouldDeferLegacyTab(
  tab: DashboardTab,
  disabled = legacyScreensDisabled,
): tab is FixtureDeferredTab {
  return disabled && isFixtureDeferredTab(tab)
}
