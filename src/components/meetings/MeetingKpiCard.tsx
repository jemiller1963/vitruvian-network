import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

interface MeetingKpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  description: string
}

export function MeetingKpiCard({ icon: Icon, label, value, description }: MeetingKpiCardProps) {
  const isNumeric = typeof value === 'number'
  const { count, ref } = useCountUp(isNumeric ? (value as number) : 0, 1500)

  return (
    <div ref={ref} className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 glow-emerald">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-dvn-text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-dvn-text-primary tabular-nums mb-1">
        {isNumeric ? count : value}
      </div>
      <p className="text-xs text-dvn-text-muted">{description}</p>
    </div>
  )
}
