import { Activity, Bot, CheckSquare, Clock3, ShieldAlert, Target, Timer, Workflow } from 'lucide-react'
import { useCommandDeck } from '@/hooks/useCommandDeck'
import { isFixturePreview } from '@/lib/api'
import { ActivityChart } from './ActivityChart'
import { ActivityFeed } from './ActivityFeed'
import { AgentStatusPanel } from './AgentStatusPanel'
import { MetricCard } from './MetricCard'
import { SystemPanel } from './SystemPanel'
import { TelemetryHealthPanel } from './TelemetryHealthPanel'

const percentage = (value: number) => `${(value * 100).toFixed(0)}%`
const duration = (value: number) => value < 60_000
  ? `${(value / 1000).toFixed(1)}s`
  : `${(value / 60_000).toFixed(1)}m`

export function CommandDeck() {
  const { data, loading, error, stale } = useCommandDeck()
  if (loading) return <div className="py-12 text-center" role="status">Loading command deck…</div>
  if (error || !data) return <div className="py-12 text-center text-red-300" role="alert">{error ?? 'Observation unavailable'}</div>
  const metrics = data.metrics
  return <div className="space-y-6">
    {isFixturePreview && <p role="status" className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">Isolated fixture preview — no connection to Leonardo.</p>}
    {stale && <p role="status" className="rounded-lg border border-amber-500/30 p-3 text-amber-200">Live refresh interrupted. Showing the last verified data with its recorded coverage.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon={Bot} label="Configured Agents" metric={metrics.configuredAgents} detail="OpenClaw roster"/>
      <MetricCard icon={Target} label="Working Now" metric={metrics.workingNow} detail="Authoritative active work"/>
      <MetricCard icon={Workflow} label="Active Tasks" metric={metrics.activeTasks} detail="Queued or running"/>
      <MetricCard icon={CheckSquare} label="Tasks Completed" metric={metrics.tasksCompleted24h} detail="Last 24 hours"/>
      <MetricCard icon={ShieldAlert} label="Task Failures" metric={metrics.taskFailures24h} detail="Last 24 hours"/>
      <MetricCard icon={Activity} label="Agent Runs" metric={metrics.agentRuns24h} detail="Terminal runs · 24h"/>
      <MetricCard icon={Clock3} label="Run Success Rate" metric={metrics.runSuccessRate7d} detail="Last 7 days" format={percentage}/>
      <MetricCard icon={Timer} label="Median Run Duration" metric={metrics.medianRunDurationMs7d} detail="Last 7 days" format={duration}/>
    </div>
    <ActivityChart activity={data.activity}/>
    <TelemetryHealthPanel telemetry={data.telemetry}/>
    <SystemPanel system={data.system}/>
    <div className="grid gap-4 lg:grid-cols-2">
      <ActivityFeed events={data.events.items}/>
      <AgentStatusPanel agents={data.agents}/>
    </div>
  </div>
}
