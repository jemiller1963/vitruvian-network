import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle, Clock, XCircle } from 'lucide-react'
import { CouncilMessageItem } from './CouncilMessage'
import type { CouncilSession as CouncilSessionType } from '@/data/mock'

interface CouncilSessionProps {
  session: CouncilSessionType
}

export function CouncilSession({ session }: CouncilSessionProps) {
  const [expanded, setExpanded] = useState(true)

  function statusIcon(hasResponded: boolean, sent: number, limit: number) {
    if (hasResponded) return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
    if (sent >= limit) return <XCircle className="w-3.5 h-3.5 text-red-400" />
    return <Clock className="w-3.5 h-3.5 text-amber-400" />
  }

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-heading font-semibold text-dvn-text-primary">{session.question}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dvn-text-muted/10 text-dvn-text-muted'}`}>
              {session.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.participants.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs bg-white/5 rounded-full px-2.5 py-1">
                <span>{p.emoji}</span>
                <span className="text-dvn-text-secondary">{p.name}</span>
                <span className="text-dvn-text-muted">{p.sent}/{p.limit}</span>
                {statusIcon(p.hasResponded, p.sent, p.limit)}
              </div>
            ))}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-dvn-text-muted transition-transform duration-200 flex-shrink-0 ml-3 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
              {session.messages.map((msg, i) => (
                <CouncilMessageItem key={i} message={msg} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
