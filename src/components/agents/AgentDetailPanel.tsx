import { useEffect, useState } from 'react'
import type { AgentDetail } from '@shared/contracts'
import { getApi } from '@/lib/api'

export function AgentDetailPanel({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AgentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getApi<AgentDetail>(`/agents/${encodeURIComponent(agentId)}`, controller.signal)
      .then(setDetail)
      .catch(() => setError('Agent detail is unavailable.'))
    return () => controller.abort()
  }, [agentId])
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="agent-detail-title">
    <section className="glass-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="agent-detail-title" className="text-xl font-semibold">{detail?.displayName ?? agentId}</h2><p className="text-sm text-dvn-text-secondary">Sanitized operational metadata only</p></div>
        <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Close</button>
      </div>
      {error && <p className="mt-6 text-red-300" role="alert">{error}</p>}
      {!detail && !error && <p className="mt-6" role="status">Loading verified agent detail…</p>}
      {detail && <div className="mt-6 space-y-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-dvn-text-secondary">State</dt><dd className="capitalize">{detail.runtimeStatus}</dd></div>
          <div><dt className="text-xs text-dvn-text-secondary">Active work</dt><dd>{detail.activeRuns} runs · {detail.activeTasks} tasks</dd></div>
          <div><dt className="text-xs text-dvn-text-secondary">Evidence</dt><dd className="capitalize">{detail.evidenceLevel}</dd></div>
          <div><dt className="text-xs text-dvn-text-secondary">Stored sessions</dt><dd>{detail.storedSessions} <span className="text-xs text-dvn-text-secondary">not liveness</span></dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-dvn-text-secondary">Status reason</dt><dd>{detail.statusReason}</dd></div>
        </dl>
        <div><h3 className="mb-3 font-semibold">Recent lifecycle</h3>{detail.recentEvents.length ? <div className="space-y-2">{detail.recentEvents.map((event) => <div key={event.id} className="rounded-lg bg-white/5 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{event.eventType}</span><span className="capitalize">{event.status}</span></div><p className="mt-1 text-xs text-dvn-text-secondary">{event.runtimeKind ?? event.entityType} · {new Date(event.occurredAt).toLocaleString()}</p></div>)}</div> : <p className="text-sm text-dvn-text-secondary">No lifecycle events are available for this agent.</p>}</div>
      </div>}
    </section>
  </div>
}
