import { ScrollArea } from '@/components/ui/scroll-area'
import type { Activity } from '@/data/mock'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="font-heading font-semibold text-dvn-text-primary mb-4">Recent Activity</h3>
      <ScrollArea className="max-h-[320px] pr-2">
        <div className="space-y-3">
          {activities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{activity.agentEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dvn-text-primary">
                  <span className="font-medium">{activity.agentName}</span>{' '}
                  {activity.action}
                </p>
                <p className="text-xs text-dvn-text-muted mt-0.5">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
