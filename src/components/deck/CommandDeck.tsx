import { Bot, CheckSquare, Target, MessagesSquare, type LucideIcon } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { ActivityFeed } from './ActivityFeed'
import { AgentStatusPanel } from './AgentStatusPanel'
import { useCommandDeck } from '@/hooks/useCommandDeck'
import { AgentHealthPanel } from '../agents/AgentHealthPanel/AgentHealthPanel'

const iconMap: Record<string, LucideIcon> = {
  Bot, CheckSquare, Target, MessagesSquare
}

export function CommandDeck() {
  const { metrics, activities, agentStatuses, loading, error } = useCommandDeck()

  if (loading) return <div className="text-center py-12">Loading command deck...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            icon={iconMap[m.icon]}
            label={m.label}
            value={m.value}
            trend={m.trend}
            trendUp={m.trendUp}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
        <AgentHealthPanel />
        <ActivityFeed activities={activities} />
        <AgentStatusPanel statuses={agentStatuses} />
      </div>
    </div>
  )
}
