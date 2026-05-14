import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogEntryItem } from './LogEntry'
import { useLogEntries } from '@/hooks/useLogEntries'
import type { LogEntry } from '@/data/mock'

type CategoryFilter = 'all' | LogEntry['category']

export function AiLog() {
  const { logEntries, loading, error } = useLogEntries()
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return logEntries
    return logEntries.filter((e) => e.category === filter)
  }, [filter, logEntries])

  if (loading) return <div className="text-center py-12">Loading log...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-dvn-text-secondary font-medium">Filter:</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as CategoryFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="observation">Observation</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="fyi">FYI</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-dvn-text-muted">{filtered.length} entries</span>
      </div>
      <div className="glass-card">
        <ScrollArea className="max-h-[600px] p-2">
          <div className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <p className="text-sm text-dvn-text-muted text-center py-8">No log entries match this category.</p>
            ) : (
              filtered.map((entry, i) => (
                <LogEntryItem key={entry.id} entry={entry} index={i} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
