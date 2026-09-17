import type { AgentSummary } from '@shared/contracts'

const dot: Record<AgentSummary['runtimeStatus'], string> = {
  working: 'active',
  idle: 'idle',
  blocked: 'error',
  error: 'error',
  offline: 'offline',
  unknown: 'offline',
}

export function AgentStatusPanel({ agents }: { agents: AgentSummary[] }) {
  return <section className="glass-card p-5">
    <h2 className="mb-4 font-semibold">Agent Status</h2>
    <div className="space-y-3">{agents.map((agent) => <div key={agent.id} className="flex gap-3 rounded-lg p-3">
      <span aria-hidden="true" className={`status-dot ${dot[agent.runtimeStatus]} mt-1.5`}/>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 text-sm">
          <span>{agent.displayName}</span>
          <span className="capitalize text-dvn-text-secondary">{agent.runtimeStatus}</span>
        </div>
        <p className="text-xs text-dvn-text-secondary">{agent.currentActivity ?? agent.statusReason.replace(/_/g, ' ').toLowerCase()}</p>
        <p className="mt-1 text-xs text-dvn-text-secondary">{agent.activeRuns} runs · {agent.activeTasks} tasks · {agent.evidenceLevel}</p>
      </div>
    </div>)}</div>
  </section>
}
