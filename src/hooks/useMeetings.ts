import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Meeting } from '@/data/mock'

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMeetings() {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setMeetings(data.map(row => ({
          id: row.id,
          type: row.type,
          title: row.title,
          date: row.date,
          duration_minutes: row.duration_minutes,
          duration_display: row.duration_display,
          attendees: row.attendees,
          summary: row.summary,
          action_items: row.action_items,
          ai_insights: row.ai_insights,
          meeting_type: row.meeting_type,
          sentiment: row.sentiment,
          has_external_participants: row.has_external_participants,
          external_domains: row.external_domains,
          fathom_url: row.fathom_url,
          share_url: row.share_url,
        })))
      }
      setLoading(false)
    }

    fetchMeetings()
  }, [])

  return { meetings, loading, error }
}
