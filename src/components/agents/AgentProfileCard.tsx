import type { AgentActivityBucket, AgentSummary } from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { AgentActivityHeatmap } from './AgentActivityHeatmap'

const dot: Record<AgentSummary['runtimeStatus'], string> = {
  working: 'active', idle: 'idle', blocked: 'error', error: 'error', offline: 'offline', unknown: 'offline',
}
const duration = (value: number | null) => value === null
  ? 'Unavailable'
  : value < 60_000 ? `${(value / 1000).toFixed(1)}s` : `${(value / 60_000).toFixed(1)}m`

export function AgentProfileCard({
  agent,
  activity,
  onInspect,
}: {
  agent: AgentSummary
  activity: AgentActivityBucket[]
  onInspect: (id: string) => void
}) {
  return <article className="glass-card h-full p-5" aria-labelledby={`agent-${agent.id}`}>
    <div className="mb-5 flex items-start gap-4">
      <div aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 font-bold text-emerald-300">{agent.displayName.slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 id={`agent-${agent.id}`} className="text-lg font-semibold">{agent.displayName}</h2>
          <span aria-hidden="true" className={`status-dot ${dot[agent.runtimeStatus]}`}/>
        </div>
        <p className="font-mono text-sm text-dvn-text-secondary">{agent.id}</p>
      </div>
      <Badge variant="secondary" className="capitalize">{agent.runtimeStatus}</Badge>
    </div>
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <div className="col-span-2"><dt className="mb-1 text-xs text-dvn-text-secondary">Configured model</dt><dd className="break-all font-mono text-xs">{agent.configuredModel ?? 'Unavailable'}</dd></div>
      <div className="col-span-2"><dt className="mb-1 text-xs text-dvn-text-secondary">Observed model</dt><dd className="break-all font-mono text-xs">{agent.observedModel ?? 'Unavailable'}</dd></div>
      <div><dt className="text-xs text-dvn-text-secondary">Active runs</dt><dd className="font-mono">{agent.activeRuns}</dd></div>
      <div><dt className="text-xs text-dvn-text-secondary">Active tasks</dt><dd className="font-mono">{agent.activeTasks}</dd></div>
      <div><dt className="text-xs text-dvn-text-secondary">7d success</dt><dd>{agent.runSuccessRate7d === null ? 'Unavailable' : `${(agent.runSuccessRate7d * 100).toFixed(0)}%`}</dd></div>
      <div><dt className="text-xs text-dvn-text-secondary">Median duration</dt><dd>{duration(agent.medianRunDurationMs7d)}</dd></div>
      <div className="col-span-2"><dt className="mb-1 text-xs text-dvn-text-secondary">Current activity</dt><dd className="text-dvn-text-secondary">{agent.currentActivity ?? agent.statusReason.replace(/_/g, ' ').toLowerCase()}</dd></div>
      <div className="col-span-2"><dt className="mb-1 text-xs text-dvn-text-secondary">May delegate to</dt><dd className="flex flex-wrap gap-1.5">{agent.allowedSubagents.length ? agent.allowedSubagents.map((id) => <Badge key={id} variant="outline">{id}</Badge>) : <span className="text-dvn-text-secondary">No configured subagents</span>}</dd></div>
    </dl>
    <div className="mt-5 border-t border-white/5 pt-4"><AgentActivityHeatmap buckets={activity}/></div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-dvn-text-secondary">{agent.evidenceLevel} · {agent.stale ? 'stale' : 'fresh'}</p>
      <button type="button" onClick={() => onInspect(agent.id)} className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Inspect details</button>
    </div>
  </article>
}
