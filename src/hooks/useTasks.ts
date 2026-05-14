import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/data/mock'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at')

      if (error) {
        setError(error.message)
      } else {
        setTasks(data.map(row => ({
          id: row.id,
          title: row.title,
          columnId: row.column_id,
          assignedAgent: row.assigned_agent,
          priority: row.priority,
          progress: row.progress,
          description: row.description,
        })))
      }
      setLoading(false)
    }

    fetchTasks()
  }, [])

  return { tasks, loading, error }
}
