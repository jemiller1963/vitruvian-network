import { Badge } from '@/components/ui/badge'
import type { LogEntry } from '@/data/mock'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface LogEntryProps {
  entry: LogEntry
  index: number
}

export function LogEntryItem({ entry, index }: LogEntryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-start gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors"
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{entry.agentEmoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-dvn-text-primary">{entry.agentName}</span>
          <Badge variant={entry.category as 'observation' | 'general' | 'reminder' | 'fyi'}>
            {entry.category}
          </Badge>
          <span className="text-xs text-dvn-text-muted ml-auto">
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-dvn-text-secondary leading-relaxed">{entry.message}</p>
      </div>
    </motion.div>
  )
}
