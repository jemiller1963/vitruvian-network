import type { CouncilMessage } from '@/data/mock'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface CouncilMessageProps {
  message: CouncilMessage
  index: number
}

export function CouncilMessageItem({ message, index }: CouncilMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="glass-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{message.agentEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-dvn-text-primary">{message.agentName}</span>
            <span className="text-xs text-dvn-text-muted font-mono">#{message.messageNumber}</span>
            <span className="text-xs text-dvn-text-muted ml-auto">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-dvn-text-secondary leading-relaxed">{message.text}</p>
        </div>
      </div>
    </motion.div>
  )
}
