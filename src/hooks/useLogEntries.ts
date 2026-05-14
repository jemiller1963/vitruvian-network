import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { LogEntry } from '@/data/mock'

export function useLogEntries() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLog() {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setLogEntries(data.map(row => ({
          id: row.id,
          agentEmoji: row.agent_emoji,
          agentName: row.agent_name,
          category: row.category,
          message: row.message,
          timestamp: row.timestamp,
        })))
      }
      setLoading(false)
    }

    fetchLog()
  }, [])

  return { logEntries, loading, error }
}
