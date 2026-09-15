import DOMPurify from 'dompurify'
import { CheckSquare, Globe, Sparkles, ExternalLink, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Meeting } from '@/data/mock'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface MeetingDetailProps {
  meeting: Meeting
}

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const [actionItems, setActionItems] = useState(meeting.action_items.map((a) => a.done))

  function toggleActionItem(index: number) {
    setActionItems((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const sanitizedSummary = DOMPurify.sanitize(meeting.summary)

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-4">
        {meeting.has_external_participants && meeting.external_domains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meeting.external_domains.map((domain) => (
              <span key={domain} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {domain}
              </span>
            ))}
          </div>
        )}

        {meeting.summary && (
          <div>
            <h4 className="text-xs font-semibold text-dvn-text-muted uppercase tracking-wider mb-2">Summary</h4>
            <div
              className="text-sm text-dvn-text-secondary leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedSummary }}
            />
          </div>
        )}

        {meeting.action_items.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-dvn-text-muted uppercase tracking-wider mb-2">Action Items</h4>
            <div className="space-y-2">
              {meeting.action_items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Toggle
                    pressed={actionItems[i]}
                    onPressedChange={() => toggleActionItem(i)}
                    size="sm"
                    className="data-[state=on]:text-emerald-400"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Toggle>
                  <span className={`text-sm ${actionItems[i] ? 'line-through text-dvn-text-muted' : 'text-dvn-text-primary'}`}>
                    {item.task}
                  </span>
                  <span className="text-xs text-dvn-text-muted ml-auto">— {item.assignee}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {meeting.ai_insights && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-dvn-text-secondary">{meeting.ai_insights}</p>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-dvn-text-muted uppercase tracking-wider mb-2">Attendees</h4>
          <div className="flex flex-wrap gap-2">
            {meeting.attendees.map((a) => (
              <div key={a.name} className="flex items-center gap-1.5 text-xs bg-white/5 rounded-full px-3 py-1">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  {a.initials}
                </div>
                <span className="text-dvn-text-secondary">{a.name}</span>
                {a.isExternal && <span className="text-dvn-text-muted">(External)</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a href={meeting.fathom_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open Recording
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={meeting.share_url} target="_blank" rel="noopener noreferrer">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share Link
            </a>
          </Button>
          <Select>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Send To..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actions">Action Items</SelectItem>
              <SelectItem value="proposals">Proposals</SelectItem>
              <SelectItem value="magnets">Lead Magnets</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  )
}
