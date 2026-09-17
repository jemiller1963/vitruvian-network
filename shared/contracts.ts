import { z } from 'zod'

export const runtimeStatuses = ['working', 'idle', 'blocked', 'error', 'offline', 'unknown'] as const
export type RuntimeStatus = (typeof runtimeStatuses)[number]
export const evidenceLevels = ['authoritative', 'reconciled', 'contextual', 'unavailable'] as const
export type EvidenceLevel = (typeof evidenceLevels)[number]
export const coverageStatuses = ['ready', 'partial', 'stale', 'unavailable'] as const
export type CoverageStatus = (typeof coverageStatuses)[number]

export interface AgentSummary {
  id: string
  displayName: string
  configuredModel: string | null
  observedModel: string | null
  allowedSubagents: string[]
  runtimeStatus: RuntimeStatus
  statusReason: string
  currentActivity: string | null
  activeRuns: number
  activeTasks: number
  lastSeenAt: string | null
  observedAt: string
  evidenceLevel: EvidenceLevel
  stale: boolean
  runSuccessRate7d: number | null
  medianRunDurationMs7d: number | null
}

export interface CanonicalEvent {
  id: string
  eventType: string
  entityType: 'agent_run' | 'task' | 'flow' | 'health_finding'
  agentId: string | null
  parentAgentId: string | null
  status: string
  runtimeKind: string | null
  channel: string | null
  model: string | null
  action: string | null
  occurredAt: string
  startedAt: string | null
  endedAt: string | null
  durationMs: number | null
  observedAt: string
  evidenceLevel: EvidenceLevel
}

export interface EventPage { items: CanonicalEvent[]; nextCursor: string | null }

export interface MetricValue {
  value: number | null
  status: CoverageStatus
  coverage: number
  windowStart: string
  windowEnd: string
}

export interface MetricSummary {
  configuredAgents: MetricValue
  workingNow: MetricValue
  activeTasks: MetricValue
  tasksCompleted24h: MetricValue
  taskFailures24h: MetricValue
  agentRuns24h: MetricValue
  runSuccessRate7d: MetricValue
  medianRunDurationMs7d: MetricValue
  observedAt: string
}

export interface ActivityBucket {
  start: string
  successfulRuns: number
  failedRuns: number
  successfulTasks: number
  failedTasks: number
  coverage: CoverageStatus
}

export interface AgentActivityBucket { agentId: string; day: string; hour: number; count: number }

export interface ActivityMetrics {
  timezone: string
  days: number
  daily: ActivityBucket[]
  byAgentHour: AgentActivityBucket[]
  status: CoverageStatus
  observedAt: string
}

export interface CollectorHealth {
  source: string
  state: CoverageStatus
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  coverageStart: string | null
  coverageEnd: string | null
  consecutiveFailures: number
  errorCode: string | null
}

export interface TelemetryHealth {
  collectors: CollectorHealth[]
  gaps: number
  databaseBytes: number
  backfillComplete: boolean
  observedAt: string
}

export interface SystemSummary {
  gateway: {
    status: 'healthy' | 'degraded' | 'unknown'
    version: string | null
    observedAt: string
    reason?: string
  }
  serviceUptimeSeconds: number
  loadAverage: number[]
  memory: { totalBytes: number; freeBytes: number }
  swap: { totalBytes: number | null; freeBytes: number | null }
  disk: { totalBytes: number | null; freeBytes: number | null }
  observedAt: string
}

export interface AgentDetail extends AgentSummary {
  recentEvents: CanonicalEvent[]
  storedSessions: number
  sessionsUpdatedAt: string | null
}

export interface ApiResponse<T> { data: T }

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const activityQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30, 'days must be 7 or 30').default(7),
  timezone: z.string().max(100).refine(validTimezone, 'timezone must be an IANA identifier').default('UTC'),
})

export const eventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(512).optional(),
  agentId: z.string().max(100).optional(),
  entityType: z.enum(['agent_run', 'task', 'flow', 'health_finding']).optional(),
  status: z.string().max(50).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
})
