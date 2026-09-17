import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ActivityMetrics,
  AgentSummary,
  EventPage,
  MetricSummary,
  SystemSummary,
  TelemetryHealth,
} from '@shared/contracts'
import { getApi } from '@/lib/api'
import { useLiveRefresh } from './useLiveRefresh'

interface DeckData {
  metrics: MetricSummary
  activity: ActivityMetrics
  agents: AgentSummary[]
  events: EventPage
  system: SystemSummary
  telemetry: TelemetryHealth
}

export function useCommandDeck() {
  const [data, setData] = useState<DeckData | null>(null)
  const ref = useRef<DeckData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const refresh = useCallback(async () => {
    try {
      const [metrics, activity, agents, events, system, telemetry] = await Promise.all([
        getApi<MetricSummary>('/metrics/summary'),
        getApi<ActivityMetrics>(`/metrics/activity?days=7&timezone=${encodeURIComponent(timezone)}`),
        getApi<AgentSummary[]>('/agents'),
        getApi<EventPage>('/events?limit=12'),
        getApi<SystemSummary>('/system/summary'),
        getApi<TelemetryHealth>('/telemetry/health'),
      ])
      const next = { metrics, activity, agents, events, system, telemetry }
      ref.current = next
      setData(next)
      setError(null)
      setStale(false)
    } catch {
      ref.current ? setStale(true) : setError('Vitruvian cannot reach the local observation service.')
    } finally {
      setLoading(false)
    }
  }, [timezone])
  useEffect(() => { void refresh() }, [refresh])
  useLiveRefresh(refresh)
  return { data, loading, error, stale }
}
