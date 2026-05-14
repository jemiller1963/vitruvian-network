import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AgentProfile } from '@/data/mock'

export function useAgents() {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgents() {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name')

      if (error) {
        setError(error.message)
      } else {
        setAgents(data.map(row => ({
          emoji: row.emoji,
          name: row.name,
          subtitle: row.subtitle,
          role: row.role,
          type: row.type,
          accentColor: row.accent_color,
          status: row.status,
          tasksCompleted: row.tasks_completed,
          accuracy: row.accuracy,
          skills: row.skills,
          currentActivity: row.current_activity,
        })))
      }
      setLoading(false)
    }

    fetchAgents()
  }, [])

  return { agents, loading, error }
}
