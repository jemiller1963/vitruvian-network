import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CouncilSession } from '@/data/mock'

export function useCouncil() {
  const [sessions, setSessions] = useState<CouncilSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from('council_sessions')
        .select(`
          id,
          question,
          status,
          council_participants (
            emoji,
            name,
            sent,
            limit_count,
            has_responded
          ),
          council_messages (
            agent_emoji,
            agent_name,
            message_number,
            text,
            timestamp
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setSessions(data.map(row => ({
          id: row.id,
          question: row.question,
          status: row.status,
          participants: row.council_participants.map((p: any) => ({
            emoji: p.emoji,
            name: p.name,
            sent: p.sent,
            limit: p.limit_count,
            hasResponded: p.has_responded,
          })),
          messages: row.council_messages
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((m: any) => ({
              agentEmoji: m.agent_emoji,
              agentName: m.agent_name,
              messageNumber: m.message_number,
              text: m.text,
              timestamp: m.timestamp,
            })),
        })))
      }
      setLoading(false)
    }

    fetchSessions()
  }, [])

  return { sessions, loading, error }
}
