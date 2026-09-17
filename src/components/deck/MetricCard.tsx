import type { LucideIcon } from 'lucide-react'
import type { MetricValue } from '@shared/contracts'

export function MetricCard({
  icon: Icon,
  label,
  metric,
  detail,
  format = (value) => String(value),
}: {
  icon: LucideIcon
  label: string
  metric: MetricValue
  detail: string
  format?: (value: number) => string
}) {
  const display = metric.value === null ? 'Unavailable' : format(metric.value)
  const statusClass = metric.status === 'ready'
    ? 'text-emerald-300'
    : metric.status === 'unavailable'
      ? 'text-red-300'
      : 'text-amber-300'
  return <div className="glass-card p-5">
    <div className="mb-3 flex justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-dvn-text-secondary">{label}</span>
      <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Icon className="h-4 w-4"/></div>
    </div>
    <span className={`font-mono font-bold ${metric.value === null ? 'text-base' : 'text-3xl'}`}>{display}</span>
    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
      <span className="text-dvn-text-secondary">{detail}</span>
      <span className={`capitalize ${statusClass}`}>{metric.status}</span>
    </div>
  </div>
}
