import type { AgentStatus } from '@/data/mock'
import { motion } from 'framer-motion'

interface AgentStatusPanelProps {
  statuses: AgentStatus[]
}

export function AgentStatusPanel({ statuses }: AgentStatusPanelProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="font-heading font-semibold text-dvn-text-primary mb-4">Agent Status</h3>
      <div className="space-y-3">
        {statuses.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-xl flex-shrink-0">{agent.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dvn-text-primary">{agent.name}</span>
                <span className={`status-dot ${agent.status}`} />
                <span className={`text-xs capitalize ${agent.status === 'active' ? 'text-emerald-400' : agent.status === 'idle' ? 'text-amber-400' : agent.status === 'error' ? 'text-red-400' : 'text-dvn-text-muted'}`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-dvn-text-muted truncate mt-0.5">{agent.currentActivity}</p>
              <p className="text-xs text-dvn-text-muted/60">Last seen: {agent.lastSeen}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
