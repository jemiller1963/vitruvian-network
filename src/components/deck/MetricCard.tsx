import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  trend: string
  trendUp: boolean
}

export function MetricCard({ icon: Icon, label, value, trend, trendUp }: MetricCardProps) {
  const { count, ref } = useCountUp(value)

  return (
    <div ref={ref} className="glass-card p-5 hover:translateY--2px group cursor-default">
      <div className="flex items-start justify-between mb-3">
        <span className="text-dvn-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 glow-emerald">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold text-dvn-text-primary tabular-nums">
          {count}
        </span>
        <span className={`text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend}
        </span>
      </div>
    </div>
  )
}
