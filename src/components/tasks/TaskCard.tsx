import { useState } from 'react'
import type { Task } from '@/data/mock'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface TaskCardProps {
  task: Task
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

const priorityConfig = {
  low: { color: 'bg-gray-500', border: 'hover:border-gray-500/30', variant: 'default' as const },
  medium: { color: 'bg-emerald-500', border: 'hover:border-emerald-500/30', variant: 'emerald' as const },
  high: { color: 'bg-amber-500', border: 'hover:border-amber-500/30', variant: 'amber' as const },
  urgent: { color: 'bg-red-500', border: 'hover:border-red-500/30', variant: 'orange' as const },
}

const columnLabels: Record<string, string> = {
  todo: 'To Do',
  doing: 'Doing',
  needsInput: 'Needs Input',
  done: 'Done',
}

export function TaskCard({ task, onDragStart }: TaskCardProps) {
  const [open, setOpen] = useState(false)
  const config = priorityConfig[task.priority]

  function handleDragStart(e: React.DragEvent) {
    onDragStart(e, task.id)
  }

  function handleClick(e: React.MouseEvent) {
    if (e.defaultPrevented) return
    setOpen(true)
  }

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        className={`glass-card p-4 cursor-pointer hover:scale-[1.02] transition-all duration-200 ${config.border}`}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-dvn-bg border border-dvn-border text-dvn-text-primary max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pr-6">
              <span className="text-2xl flex-shrink-0">{task.assignedAgent}</span>
              <h2 className="font-heading font-semibold text-lg leading-snug">{task.title}</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant} className="capitalize">{task.priority}</Badge>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-dvn-text-secondary">
                {columnLabels[task.columnId]}
              </span>
              <span className="text-xs text-dvn-text-muted font-mono">#{task.id}</span>
            </div>

            {task.description && (
              <div>
                <p className="text-xs font-medium text-dvn-text-muted uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-dvn-text-secondary leading-relaxed">{task.description}</p>
              </div>
            )}

            {task.progress > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-dvn-text-muted font-medium uppercase tracking-wider">Progress</span>
                  <span className="font-mono text-dvn-text-primary">{task.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
