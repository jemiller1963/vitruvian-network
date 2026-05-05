import type { Task } from '@/data/mock'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  accent: string
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
}

export function KanbanColumn({ id, title, tasks, accent, onDragStart, onDragOver, onDrop }: KanbanColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
      className="glass-card p-4 min-h-[300px]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${accent} opacity-80`} />
          <h3 className="font-heading font-semibold text-sm text-dvn-text-primary">{title}</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-dvn-text-muted font-mono">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  )
}
