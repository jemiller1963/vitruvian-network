import { useRef, useState } from 'react'
import { useAgents } from '@/hooks/useAgents'
import { isFixturePreview } from '@/lib/api'
import { AgentDetailPanel } from './AgentDetailPanel'
import { AgentProfileCard } from './AgentProfileCard'

export function AgentProfiles() {
  const { agents, activity, loading, error, stale } = useAgents()
  const [selected, setSelected] = useState<string | null>(null)
  const inspectTrigger = useRef<HTMLButtonElement | null>(null)
  const inspectAgent = (agentId: string, trigger: HTMLButtonElement) => {
    inspectTrigger.current = trigger
    setSelected(agentId)
  }
  const closeDetail = () => {
    setSelected(null)
    window.requestAnimationFrame(() => inspectTrigger.current?.focus())
  }
  if (loading) return <div className="py-12 text-center" role="status">Loading configured agents…</div>
  if (error) return <div className="py-12 text-center text-red-300" role="alert">{error}</div>
  return <div className="space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div><h1 className="text-xl font-semibold">Configured Agents</h1><p className="mt-1 text-sm text-dvn-text-secondary">Roster, models, and sanitized live activity from OpenClaw.</p></div>
      <p className="text-sm">{agents.length} agents</p>
    </div>
    {isFixturePreview && <p role="status" className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">Isolated fixture preview — no connection to Leonardo.</p>}
    {stale && <p role="status" className="rounded-lg border border-amber-500/30 p-3 text-amber-200">Showing the last verified roster and activity state.</p>}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {agents.map((agent) => <AgentProfileCard
        key={agent.id}
        agent={agent}
        activity={activity?.byAgentHour.filter((item) => item.agentId === agent.id) ?? []}
        onInspect={inspectAgent}
      />)}
    </div>
    {selected && (
      <AgentDetailPanel agentId={selected} onClose={closeDetail}/>
    )}
  </div>
}
