import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Globe, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MeetingDetail } from './MeetingDetail'
import type { Meeting } from '@/data/mock'

interface MeetingCardProps {
  meeting: Meeting
}

const typeBadgeVariant: Record<string, 'emerald' | 'amber' | 'cyan' | 'blue' | 'purple' | 'orange' | 'default'> = {
  standup: 'purple',
  sales: 'purple',
  '1-on-1': 'blue',
  interview: 'emerald',
  'all-hands': 'orange',
  planning: 'cyan',
  team: 'amber',
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const actionItemCount = meeting.action_items.filter((a) => !a.done).length
  const maxAvatars = 3
  const visibleAttendees = meeting.attendees.slice(0, maxAvatars)
  const overflow = meeting.attendees.length - maxAvatars

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between p-5 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={typeBadgeVariant[meeting.type] || 'default'} className="capitalize">
              {meeting.type}
            </Badge>
            {actionItemCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                <ListChecks className="w-3 h-3" />
                {actionItemCount}
              </span>
            )}
            {meeting.has_external_participants && (
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </div>
          <h3 className="font-heading font-semibold text-dvn-text-primary text-sm mb-1">{meeting.title}</h3>
          <div className="flex items-center gap-3 text-xs text-dvn-text-muted">
            <span>{formatDistanceToNow(new Date(meeting.date), { addSuffix: true })}</span>
            <span>{meeting.duration_display}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {visibleAttendees.map((a) => (
              <div
                key={a.name}
                className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-dvn-border"
                title={a.name}
              >
                {a.initials}
              </div>
            ))}
            {overflow > 0 && (
              <div className="w-6 h-6 rounded-full bg-white/10 text-dvn-text-muted flex items-center justify-center text-[10px] border border-dvn-border">
                +{overflow}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-dvn-text-muted transition-transform duration-200 flex-shrink-0 ml-3 mt-1 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && <MeetingDetail meeting={meeting} />}
      </AnimatePresence>
    </div>
  )
}
