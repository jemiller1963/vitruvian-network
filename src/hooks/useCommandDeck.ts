import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Metric, Activity, AgentStatus } from '@/data/mock'

export function useCommandDeck() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const [metricsRes, activitiesRes, statusesRes] = await Promise.all([
        supabase.from('metrics').select('*').order('sort_order'),
        supabase.from('activities').select('*').order('timestamp', { ascending: false }),
        supabase.from('agent_statuses').select('*').order('id'),
      ])

      if (metricsRes.error || activitiesRes.error || statusesRes.error) {
        setError(metricsRes.error?.message || activitiesRes.error?.message || statusesRes.error?.message || 'Unknown error')
      } else {
        setMetrics(metricsRes.data.map(row => ({
          label: row.label,
          value: row.value,
          icon: row.icon,
          trend: row.trend,
          trendUp: row.trend_up,
        })))
        setActivities(activitiesRes.data.map(row => ({
          agentEmoji: row.agent_emoji,
          agentName: row.agent_name,
          action: row.action,
          timestamp: row.timestamp,
        })))
        setAgentStatuses(statusesRes.data.map(row => ({
          emoji: row.emoji,
          name: row.name,
          status: row.status,
          currentActivity: row.current_activity,
          lastSeen: row.last_seen,
        })))
      }
      setLoading(false)
    }

    fetchAll()
  }, [])

  return { metrics, activities, agentStatuses, loading, error }
}
