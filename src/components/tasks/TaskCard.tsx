import type { Task } from '@/data/mock'

interface TaskCardProps {
  task: Task
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

const priorityConfig = {
  low: { color: 'bg-gray-500', border: 'hover:border-gray-500/30' },
  medium: { color: 'bg-emerald-500', border: 'hover:border-emerald-500/30' },
  high: { color: 'bg-amber-500', border: 'hover:border-amber-500/30' },
  urgent: { color: 'bg-red-500', border: 'hover:border-red-500/30' },
}

export function TaskCard({ task, onDragStart }: TaskCardProps) {
  const config = priorityConfig[task.priority]

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`glass-card p-4 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all duration-200 ${config.border}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-dvn-text-primary leading-snug">{task.title}</h4>
        <span className="flex-shrink-0 text-base">{task.assignedAgent}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-xs text-dvn-text-muted capitalize">{task.priority}</span>
      </div>
      {task.columnId === 'doing' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-dvn-text-muted">Progress</span>
            <span className="font-mono text-dvn-text-primary">{task.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
      {task.description && (
        <p className="text-xs text-dvn-text-muted mt-2 line-clamp-2">{task.description}</p>
      )}
    </div>
  )
}
