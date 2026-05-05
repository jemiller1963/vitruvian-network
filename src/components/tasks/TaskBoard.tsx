import { useState } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { tasks as initialTasks, type Task } from '@/data/mock'

const columns = [
  { id: 'todo', title: 'To Do', accent: 'bg-emerald-500' },
  { id: 'doing', title: 'Doing', accent: 'bg-amber-500' },
  { id: 'needsInput', title: 'Needs Input', accent: 'bg-cyan-500' },
  { id: 'done', title: 'Done', accent: 'bg-gray-400' },
] as const

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/plain', taskId)
    setDraggedTaskId(taskId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, targetColumnId: string) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId as Task['columnId'] } : t
      )
    )
    setDraggedTaskId(null)
  }

  return (
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
  )
}
