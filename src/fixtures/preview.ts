import type {
  ActivityMetrics,
  AgentDetail,
  AgentSummary,
  EventPage,
  MetricSummary,
  MetricValue,
  SystemSummary,
  TelemetryHealth,
} from '@shared/contracts'

const observedAt = new Date().toISOString()
const roster = [
  ['main', 'Leo', 'provider/leo', ['researcher', 'raph']],
  ['researcher', 'Researcher', 'provider/default', []],
  ['raph', 'Raph', 'provider/default', ['analyst', 'backend', 'frontend', 'qa', 'deployment', 'researcher', 'designer']],
  ['designer', 'Designer', 'provider/default', []],
  ['analyst', 'Analyst', 'provider/default', []],
  ['backend', 'Backend', 'provider/default', []],
  ['frontend', 'Frontend', 'provider/default', []],
  ['qa', 'QA', 'provider/default', []],
  ['deployment', 'Deployment', 'provider/default', []],
] as const

export const previewAgents: AgentSummary[] = roster.map(
  ([id, displayName, configuredModel, allowedSubagents]) => ({
    id,
    displayName,
    configuredModel,
    observedModel: null,
    allowedSubagents: [...allowedSubagents],
    runtimeStatus: 'unknown',
    statusReason: 'FIXTURE_PREVIEW',
    currentActivity: null,
    activeRuns: 0,
    activeTasks: 0,
    lastSeenAt: null,
    observedAt,
    evidenceLevel: 'unavailable',
    stale: true,
    runSuccessRate7d: null,
    medianRunDurationMs7d: null,
  }),
)

const metric = (): MetricValue => ({
  value: null,
  status: 'unavailable',
  coverage: 0,
  windowStart: observedAt,
  windowEnd: observedAt,
})

const daily = Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 6 + index)
  date.setUTCHours(0, 0, 0, 0)
  return {
    start: date.toISOString(),
    successfulRuns: 0,
    failedRuns: 0,
    successfulTasks: 0,
    failedTasks: 0,
    coverage: 'unavailable' as const,
  }
})
const days = daily.map((item) => item.start.slice(0, 10))

export const previewActivity: ActivityMetrics = {
  timezone: 'UTC',
  days: 7,
  daily,
  byAgentHour: previewAgents.flatMap((agent) =>
    days.flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => ({ agentId: agent.id, day, hour, count: 0 })),
    ),
  ),
  status: 'unavailable',
  observedAt,
}

export const previewMetrics: MetricSummary = {
  configuredAgents: { ...metric(), value: previewAgents.length, status: 'ready', coverage: 1 },
  workingNow: metric(),
  activeTasks: metric(),
  tasksCompleted24h: metric(),
  taskFailures24h: metric(),
  agentRuns24h: metric(),
  runSuccessRate7d: metric(),
  medianRunDurationMs7d: metric(),
  observedAt,
}
export const previewEvents: EventPage = { items: [], nextCursor: null }
export const previewSystem: SystemSummary = {
  gateway: { status: 'unknown', version: null, observedAt, reason: 'Fixture preview does not connect to Leonardo.' },
  serviceUptimeSeconds: 0,
  loadAverage: [0, 0, 0],
  memory: { totalBytes: 0, freeBytes: 0 },
  swap: { totalBytes: null, freeBytes: null },
  disk: { totalBytes: null, freeBytes: null },
  observedAt,
}
export const previewTelemetry: TelemetryHealth = {
  collectors: [],
  gaps: 0,
  databaseBytes: 0,
  backfillComplete: false,
  observedAt,
}

export function previewResponse(path: string): unknown {
  if (/^\/agents\/[^/]+$/.test(path)) {
    const id = path.split('/')[2]
    const agent = previewAgents.find((item) => item.id === id)
    if (!agent) throw new Error('Preview agent unavailable')
    return { ...agent, recentEvents: [], storedSessions: 0, sessionsUpdatedAt: null } satisfies AgentDetail
  }
  if (path.startsWith('/agents')) return previewAgents
  if (path.startsWith('/metrics/activity')) return previewActivity
  if (path.startsWith('/metrics/summary')) return previewMetrics
  if (path.startsWith('/events')) return previewEvents
  if (path.startsWith('/system/summary')) return previewSystem
  if (path.startsWith('/telemetry/health')) return previewTelemetry
  throw new Error('Preview capability unavailable')
}
