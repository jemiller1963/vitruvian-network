import { useState, useEffect } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { useTasks } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/data/mock'

const columns = [
  { id: 'todo', title: 'To Do', accent: 'bg-emerald-500' },
  { id: 'doing', title: 'Doing', accent: 'bg-amber-500' },
  { id: 'needsInput', title: 'Needs Input', accent: 'bg-cyan-500' },
  { id: 'done', title: 'Done', accent: 'bg-gray-400' },
] as const

export function TaskBoard() {
  const { tasks: remoteTasks, loading, error } = useTasks()
  const [tasks, setTasks] = useState<Task[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (remoteTasks.length > 0) setTasks(remoteTasks)
  }, [remoteTasks])

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/plain', taskId)
    setDraggedTaskId(taskId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleDrop(e: React.DragEvent, targetColumnId: string) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.columnId === targetColumnId) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId as Task['columnId'] } : t
      )
    )
    setDraggedTaskId(null)
    setSaving(taskId)

    const { error } = await supabase
      .from('tasks')
      .update({ column_id: targetColumnId })
      .eq('id', taskId)

    if (error) {
      // Roll back on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, columnId: task.columnId } : t
        )
      )
      console.error('Failed to persist task move:', error.message)
    }

    setSaving(null)
  }

  if (loading) return <div className="text-center py-12">Loading tasks...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="space-y-2">
      {saving && (
        <p className="text-xs text-dvn-text-muted text-right animate-pulse">Saving...</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.columnId === col.id)}
            accent={col.accent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
