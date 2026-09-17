import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import type {
  ActivityMetrics,
  AgentActivityBucket,
  AgentDetail,
  AgentSummary,
  CanonicalEvent,
  CollectorHealth,
  CoverageStatus,
  EventPage,
  MetricSummary,
  MetricValue,
  RuntimeStatus,
  SystemSummary,
  TelemetryHealth,
} from '../shared/contracts.js'
import type { Db } from './db.js'
import { nextRevision } from './db.js'
import type { ConfiguredAgent } from './openclaw.js'

type EntityType = CanonicalEvent['entityType']

export interface NormalizedEvent {
  source: string
  sourceEventKey: string
  sourceSchemaVersion: string
  eventType: string
  entityType: EntityType
  entityRef: string
  agentId: string | null
  parentAgentId: string | null
  sessionRef: string | null
  status: string
  runtimeKind: string | null
  channel: string | null
  model: string | null
  action: string | null
  occurredAt: string
  observedAt: string
  startedAt: string | null
  endedAt: string | null
  durationMs: number | null
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function iso(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return null
}

function finite(...values: unknown[]): number | null {
  for (const value of values) {
    const number = typeof value === 'number' ? value : Number.NaN
    if (Number.isFinite(number)) return number
  }
  return null
}

function safeToken(value: string | null, fallback: string): string {
  if (!value) return fallback
  const normalized = value.toLowerCase().replace(/[^a-z0-9_.:/-]/g, '_').slice(0, 100)
  return normalized || fallback
}

function duration(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null
  const value = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return value >= 0 ? value : null
}

export class TelemetryNormalizer {
  constructor(private secret: string) {}

  private hash(namespace: string, value: string): string {
    return crypto.createHmac('sha256', this.secret).update(namespace).update('\0').update(value).digest('hex')
  }

  audit(value: unknown, schemaVersion: string, observedAt = new Date().toISOString()): NormalizedEvent {
    const row = object(value)
    const kind = safeToken(text(row.kind, row.type), 'agent_run')
    if (kind !== 'agent_run') throw new Error('AUDIT_KIND_IGNORED')
    const entityType: EntityType = 'agent_run'
    const status = safeToken(text(row.status, row.outcome), 'unknown')
    const rawEntity = text(row.executionId, row.execution_id, row.runId, row.run_id, row.id, row.sequence)
    if (!rawEntity) throw new Error('AUDIT_ID_MISSING')
    const occurredAt = iso(row.occurredAt, row.occurred_at, row.timestamp, row.time, row.startedAt) ?? observedAt
    const startedAt = iso(row.startedAt, row.started_at) ?? (status === 'started' ? occurredAt : null)
    const endedAt = iso(row.endedAt, row.ended_at, row.completedAt, row.completed_at) ??
      (['succeeded', 'failed', 'cancelled', 'timed_out', 'blocked'].includes(status) ? occurredAt : null)
    const session = text(row.sessionKey, row.session_key, row.sessionId, row.session_id)
    const sourceIdentity = text(row.id, row.sequence) ?? `${rawEntity}:${status}:${occurredAt}`
    return {
      source: 'openclaw_audit',
      sourceEventKey: this.hash('audit-event', sourceIdentity),
      sourceSchemaVersion: schemaVersion,
      eventType: `${kind}.${status}`,
      entityType,
      entityRef: this.hash('audit-entity', rawEntity),
      agentId: text(row.agentId, row.agent_id, row.agent),
      parentAgentId: text(row.parentAgentId, row.parent_agent_id),
      sessionRef: session ? this.hash('session', session) : null,
      status,
      runtimeKind: safeToken(text(row.runtime, row.runtimeKind, row.runtime_kind), '') || null,
      channel: safeToken(text(row.channel), '') || null,
      model: text(row.model),
      action: safeToken(text(row.action, row.toolName, row.tool_name), '') || null,
      occurredAt,
      observedAt,
      startedAt,
      endedAt,
      durationMs: finite(row.durationMs, row.duration_ms) ?? duration(startedAt, endedAt),
    }
  }

  task(value: unknown, observedAt = new Date().toISOString()): NormalizedEvent {
    const row = object(value)
    const rawEntity = text(row.taskId, row.task_id, row.id, row.runId, row.run_id, row.sessionKey)
    if (!rawEntity) throw new Error('TASK_ID_MISSING')
    const status = safeToken(text(row.status), 'unknown')
    const terminalOutcome = safeToken(text(row.terminalOutcome, row.terminal_outcome), '')
    const occurredAt = iso(row.updatedAt, row.updated_at, row.completedAt, row.startedAt, row.createdAt) ?? observedAt
    const startedAt = iso(row.startedAt, row.started_at, row.createdAt, row.created_at)
    const endedAt = iso(row.endedAt, row.ended_at, row.completedAt, row.completed_at)
    const session = text(row.sessionKey, row.session_key)
    return {
      source: 'openclaw_task',
      sourceEventKey: this.hash('task-event', `${rawEntity}:${status}:${terminalOutcome}:${occurredAt}`),
      sourceSchemaVersion: 'tasks-v1',
      eventType: `task.${terminalOutcome || status}`,
      entityType: 'task',
      entityRef: this.hash('task', rawEntity),
      agentId: text(row.agentId, row.agent_id, row.agent),
      parentAgentId: text(row.parentAgentId, row.parent_agent_id),
      sessionRef: session ? this.hash('session', session) : null,
      status,
      runtimeKind: safeToken(text(row.runtime, row.runtimeKind, row.runtime_kind), '') || null,
      channel: safeToken(text(row.channel), '') || null,
      model: text(row.model),
      action: null,
      occurredAt,
      observedAt,
      startedAt,
      endedAt,
      durationMs: finite(row.durationMs, row.duration_ms) ?? duration(startedAt, endedAt),
    }
  }

  flow(value: unknown, observedAt = new Date().toISOString()): NormalizedEvent {
    const row = object(value)
    const rawEntity = text(row.flowId, row.flow_id, row.id, row.ownerKey)
    if (!rawEntity) throw new Error('FLOW_ID_MISSING')
    const status = safeToken(text(row.status), 'unknown')
    const occurredAt = iso(row.updatedAt, row.updated_at, row.completedAt, row.startedAt, row.createdAt) ?? observedAt
    return {
      source: 'openclaw_flow',
      sourceEventKey: this.hash('flow-event', `${rawEntity}:${status}:${occurredAt}`),
      sourceSchemaVersion: 'flows-v1',
      eventType: `flow.${status}`,
      entityType: 'flow',
      entityRef: this.hash('flow', rawEntity),
      agentId: text(row.agentId, row.agent_id, row.agent),
      parentAgentId: null,
      sessionRef: null,
      status,
      runtimeKind: null,
      channel: null,
      model: null,
      action: null,
      occurredAt,
      observedAt,
      startedAt: iso(row.startedAt, row.started_at, row.createdAt, row.created_at),
      endedAt: iso(row.endedAt, row.ended_at, row.completedAt, row.completed_at),
      durationMs: finite(row.durationMs, row.duration_ms),
    }
  }

  sessionReference(value: string): string {
    return this.hash('session', value)
  }
}

function eventId(event: NormalizedEvent): string {
  return crypto.createHash('sha256').update(event.source).update(event.sourceEventKey).digest('hex').slice(0, 32)
}

function rowToEvent(row: Record<string, unknown>): CanonicalEvent {
  return {
    id: String(row.id),
    eventType: String(row.eventType),
    entityType: row.entityType as EntityType,
    agentId: text(row.agentId),
    parentAgentId: text(row.parentAgentId),
    status: String(row.status),
    runtimeKind: text(row.runtimeKind),
    channel: text(row.channel),
    model: text(row.model),
    action: text(row.action),
    occurredAt: String(row.occurredAt),
    startedAt: text(row.startedAt),
    endedAt: text(row.endedAt),
    durationMs: row.durationMs === null ? null : Number(row.durationMs),
    observedAt: String(row.observedAt),
    evidenceLevel: row.evidenceLevel as CanonicalEvent['evidenceLevel'],
  }
}

export class TelemetryStore {
  constructor(private db: Db, private databasePath: string) {}

  ingest(events: NormalizedEvent[]): number {
    const statement = this.db.prepare(`
      INSERT OR IGNORE INTO telemetry_events(
        id,source,source_event_key,source_schema_version,event_type,entity_type,entity_ref,
        agent_id,parent_agent_id,session_ref,status,runtime_kind,channel,model,action,
        occurred_at,observed_at,started_at,ended_at,duration_ms,evidence_level,normalizer_version
      ) VALUES(
        @id,@source,@sourceEventKey,@sourceSchemaVersion,@eventType,@entityType,@entityRef,
        @agentId,@parentAgentId,@sessionRef,@status,@runtimeKind,@channel,@model,@action,
        @occurredAt,@observedAt,@startedAt,@endedAt,@durationMs,'authoritative',1
      )
    `)
    let inserted = 0
    this.db.transaction(() => {
      for (const event of events) inserted += Number(statement.run({ id: eventId(event), ...event }).changes)
      if (inserted) nextRevision(this.db)
    })()
    return inserted
  }

  upsertTasks(events: NormalizedEvent[]): number {
    const statement = this.db.prepare(`
      INSERT INTO task_state_current(
        task_ref,agent_id,parent_agent_id,runtime_kind,stored_status,terminal_outcome,
        started_at,ended_at,updated_at,observed_at,revision
      ) VALUES(@entityRef,@agentId,@parentAgentId,@runtimeKind,@status,@terminalOutcome,
        @startedAt,@endedAt,@occurredAt,@observedAt,1)
      ON CONFLICT(task_ref) DO UPDATE SET
        agent_id=excluded.agent_id,parent_agent_id=excluded.parent_agent_id,
        runtime_kind=excluded.runtime_kind,stored_status=excluded.stored_status,
        terminal_outcome=excluded.terminal_outcome,started_at=COALESCE(excluded.started_at,started_at),
        ended_at=excluded.ended_at,updated_at=excluded.updated_at,observed_at=excluded.observed_at,
        revision=revision+1
    `)
    this.db.transaction(() => {
      for (const event of events) statement.run({
        ...event,
        terminalOutcome: event.eventType.slice('task.'.length) === event.status
          ? null
          : event.eventType.slice('task.'.length),
      })
    })()
    return this.ingest(events)
  }

  upsertSessions(rows: unknown[], normalizer: TelemetryNormalizer, observedAt: string) {
    const aggregate = new Map<string, { count: number; last: string | null; model: string | null }>()
    for (const value of rows) {
      const row = object(value)
      const agentId = text(row.agentId, row.agent_id, row.agent)
      const key = text(row.key, row.sessionKey, row.session_key)
      if (!agentId || !key) continue
      normalizer.sessionReference(key)
      const current = aggregate.get(agentId) ?? { count: 0, last: null, model: null }
      const updated = iso(row.updatedAt, row.updated_at, row.lastSeenAt, row.last_seen_at)
      current.count += 1
      if (updated && (!current.last || updated > current.last)) current.last = updated
      current.model = text(row.model) ?? current.model
      aggregate.set(agentId, current)
    }
    const statement = this.db.prepare(`
      INSERT INTO session_context_current(agent_id,stored_count,last_updated_at,observed_model,observed_at)
      VALUES(?,?,?,?,?)
      ON CONFLICT(agent_id) DO UPDATE SET stored_count=excluded.stored_count,
        last_updated_at=excluded.last_updated_at,observed_model=excluded.observed_model,
        observed_at=excluded.observed_at
    `)
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM session_context_current').run()
      for (const [agentId, value] of aggregate) statement.run(agentId, value.count, value.last, value.model, observedAt)
      nextRevision(this.db)
    })()
  }

  markCollectorAttempt(source: string) {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO collector_state(source,state,last_attempt_at,consecutive_failures)
      VALUES(?,'unavailable',?,0)
      ON CONFLICT(source) DO UPDATE SET last_attempt_at=excluded.last_attempt_at
    `).run(source, now)
  }

  markCollectorSuccess(source: string, options: { schema?: string; coverageStart?: string; coverageEnd?: string; backfillComplete?: boolean; state?: CoverageStatus } = {}) {
    const now = new Date().toISOString()
    this.db.transaction(() => {
      this.db.prepare(`
      INSERT INTO collector_state(
        source,schema_fingerprint,state,last_attempt_at,last_success_at,last_reconciled_at,
        consecutive_failures,coverage_start,coverage_end,error_code,backfill_complete
      ) VALUES(@source,@schema,@state,@now,@now,@now,0,@coverageStart,@coverageEnd,NULL,@backfillComplete)
      ON CONFLICT(source) DO UPDATE SET
        schema_fingerprint=COALESCE(excluded.schema_fingerprint,schema_fingerprint),state=excluded.state,
        last_attempt_at=excluded.last_attempt_at,last_success_at=excluded.last_success_at,
        last_reconciled_at=excluded.last_reconciled_at,consecutive_failures=0,
        coverage_start=COALESCE(excluded.coverage_start,coverage_start),
        coverage_end=COALESCE(excluded.coverage_end,coverage_end),error_code=NULL,
        backfill_complete=MAX(backfill_complete,excluded.backfill_complete)
      `).run({
        source,
        schema: options.schema ?? null,
        state: options.state ?? 'ready',
        now,
        coverageStart: options.coverageStart ?? null,
        coverageEnd: options.coverageEnd ?? now,
        backfillComplete: options.backfillComplete ? 1 : 0,
      })
      nextRevision(this.db)
    })()
  }

  markCollectorFailure(source: string, errorCode: string) {
    const now = new Date().toISOString()
    this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO collector_state(source,state,last_attempt_at,consecutive_failures,error_code)
        VALUES(?,'unavailable',?,1,?)
        ON CONFLICT(source) DO UPDATE SET state='unavailable',last_attempt_at=excluded.last_attempt_at,
          consecutive_failures=consecutive_failures+1,error_code=excluded.error_code
      `).run(source, now, safeToken(errorCode, 'COLLECTOR_FAILED').toUpperCase())
      this.db.prepare(`
        INSERT INTO telemetry_gaps(source,started_at,reason_code,observed_at) VALUES(?,?,?,?)
      `).run(source, now, safeToken(errorCode, 'COLLECTOR_FAILED').toUpperCase(), now)
      nextRevision(this.db)
    })()
  }

  refreshAgentState(roster: ConfiguredAgent[]) {
    const audit = this.collector('audit')
    const tasks = this.collector('tasks')
    const fresh = audit.state === 'ready' && tasks.state === 'ready'
    const statement = this.db.prepare(`
      INSERT INTO agent_state_current(
        agent_id,runtime_status,reason_code,current_activity,active_runs,active_tasks,
        observed_model,last_seen_at,evidence_level,stale,revision,observed_at
      ) VALUES(@agentId,@runtimeStatus,@reasonCode,@currentActivity,@activeRuns,@activeTasks,
        @observedModel,@lastSeenAt,@evidenceLevel,@stale,1,@observedAt)
      ON CONFLICT(agent_id) DO UPDATE SET runtime_status=excluded.runtime_status,
        reason_code=excluded.reason_code,current_activity=excluded.current_activity,
        active_runs=excluded.active_runs,active_tasks=excluded.active_tasks,
        observed_model=excluded.observed_model,last_seen_at=excluded.last_seen_at,
        evidence_level=excluded.evidence_level,stale=excluded.stale,
        revision=revision+1,observed_at=excluded.observed_at
      WHERE runtime_status IS NOT excluded.runtime_status
        OR reason_code IS NOT excluded.reason_code
        OR current_activity IS NOT excluded.current_activity
        OR active_runs IS NOT excluded.active_runs
        OR active_tasks IS NOT excluded.active_tasks
        OR observed_model IS NOT excluded.observed_model
        OR last_seen_at IS NOT excluded.last_seen_at
        OR evidence_level IS NOT excluded.evidence_level
        OR stale IS NOT excluded.stale
    `)
    const activeRuns = this.db.prepare(`
      SELECT agent_id agentId,count(*) count FROM (
        SELECT agent_id,entity_ref,status,row_number() OVER(PARTITION BY entity_ref ORDER BY occurred_at DESC,id DESC) rank
        FROM telemetry_events WHERE entity_type='agent_run'
      ) WHERE rank=1 AND status='started' AND agent_id IS NOT NULL GROUP BY agent_id
    `).all() as Array<{ agentId: string; count: number }>
    const activeTasks = this.db.prepare(`
      SELECT agent_id agentId,count(*) count FROM task_state_current
      WHERE stored_status IN ('queued','running') AND agent_id IS NOT NULL GROUP BY agent_id
    `).all() as Array<{ agentId: string; count: number }>
    const blockedTasks = this.db.prepare(`
      SELECT agent_id agentId,count(*) count FROM task_state_current
      WHERE terminal_outcome='blocked' AND agent_id IS NOT NULL GROUP BY agent_id
    `).all() as Array<{ agentId: string; count: number }>
    const recentFailures = this.db.prepare(`
      SELECT DISTINCT agent_id agentId FROM telemetry_events
      WHERE agent_id IS NOT NULL AND status IN ('failed','timed_out','lost')
        AND occurred_at>=?
    `).all(new Date(Date.now() - 300_000).toISOString()) as Array<{ agentId: string }>
    const runMap = new Map(activeRuns.map((row) => [row.agentId, Number(row.count)]))
    const taskMap = new Map(activeTasks.map((row) => [row.agentId, Number(row.count)]))
    const blockedMap = new Map(blockedTasks.map((row) => [row.agentId, Number(row.count)]))
    const failureSet = new Set(recentFailures.map((row) => row.agentId))
    const now = new Date().toISOString()
    let changes = 0
    this.db.transaction(() => {
      for (const agent of roster) {
        const runs = runMap.get(agent.id) ?? 0
        const taskCount = taskMap.get(agent.id) ?? 0
        const runtimeStatus: RuntimeStatus = !fresh
          ? 'unknown'
          : runs + taskCount > 0
            ? 'working'
            : (blockedMap.get(agent.id) ?? 0) > 0
              ? 'blocked'
              : failureSet.has(agent.id)
                ? 'error'
                : 'idle'
        const session = this.db.prepare(
          'SELECT observed_model observedModel,last_updated_at lastUpdatedAt FROM session_context_current WHERE agent_id=?',
        ).get(agent.id) as { observedModel: string | null; lastUpdatedAt: string | null } | undefined
        changes += Number(statement.run({
          agentId: agent.id,
          runtimeStatus,
          reasonCode: !fresh
            ? 'TELEMETRY_UNAVAILABLE'
            : runtimeStatus === 'working'
              ? 'ACTIVE_EXECUTION'
              : runtimeStatus === 'blocked'
                ? 'BLOCKED_DELIVERY'
                : runtimeStatus === 'error'
                  ? 'RECENT_FAILED_EXECUTION'
                  : 'NO_ACTIVE_EXECUTION',
          currentActivity: runtimeStatus === 'working'
            ? taskCount > 0 ? 'Background task in progress' : 'Agent run in progress'
            : null,
          activeRuns: runs,
          activeTasks: taskCount,
          observedModel: session?.observedModel ?? null,
          lastSeenAt: session?.lastUpdatedAt ?? null,
          evidenceLevel: fresh ? 'authoritative' : 'unavailable',
          stale: fresh ? 0 : 1,
          observedAt: now,
        }).changes)
      }
      if (changes) nextRevision(this.db)
    })()
  }

  agents(roster: ConfiguredAgent[]): AgentSummary[] {
    return roster.map((agent) => {
      const state = this.db.prepare(`
        SELECT runtime_status runtimeStatus,reason_code statusReason,current_activity currentActivity,
          active_runs activeRuns,active_tasks activeTasks,observed_model observedModel,
          last_seen_at lastSeenAt,evidence_level evidenceLevel,stale,observed_at observedAt
        FROM agent_state_current WHERE agent_id=?
      `).get(agent.id) as Record<string, unknown> | undefined
      const stats = this.agentStats(agent.id)
      return {
        ...agent,
        observedModel: text(state?.observedModel),
        runtimeStatus: (state?.runtimeStatus as RuntimeStatus | undefined) ?? 'unknown',
        statusReason: text(state?.statusReason) ?? 'TELEMETRY_NOT_COLLECTED',
        currentActivity: text(state?.currentActivity),
        activeRuns: Number(state?.activeRuns ?? 0),
        activeTasks: Number(state?.activeTasks ?? 0),
        lastSeenAt: text(state?.lastSeenAt),
        observedAt: text(state?.observedAt) ?? new Date().toISOString(),
        evidenceLevel: (state?.evidenceLevel as AgentSummary['evidenceLevel'] | undefined) ?? 'unavailable',
        stale: state ? Boolean(state.stale) : true,
        runSuccessRate7d: stats.successRate,
        medianRunDurationMs7d: stats.medianDuration,
      }
    })
  }

  agentDetail(roster: ConfiguredAgent[], id: string): AgentDetail | null {
    const agent = this.agents(roster).find((item) => item.id === id)
    if (!agent) return null
    const session = this.db.prepare(
      'SELECT stored_count storedCount,last_updated_at lastUpdatedAt FROM session_context_current WHERE agent_id=?',
    ).get(id) as { storedCount: number; lastUpdatedAt: string | null } | undefined
    return {
      ...agent,
      recentEvents: this.events({ limit: 25, agentId: id }).items,
      storedSessions: Number(session?.storedCount ?? 0),
      sessionsUpdatedAt: session?.lastUpdatedAt ?? null,
    }
  }

  events(query: {
    limit: number
    cursor?: string
    agentId?: string
    entityType?: EntityType
    status?: string
    from?: string
    to?: string
  }): EventPage {
    const conditions: string[] = []
    const values: unknown[] = []
    if (query.agentId) { conditions.push('agent_id=?'); values.push(query.agentId) }
    if (query.entityType) { conditions.push('entity_type=?'); values.push(query.entityType) }
    if (query.status) { conditions.push('status=?'); values.push(query.status) }
    if (query.from) { conditions.push('occurred_at>=?'); values.push(query.from) }
    if (query.to) { conditions.push('occurred_at<=?'); values.push(query.to) }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor)
      conditions.push('(occurred_at<? OR (occurred_at=? AND id<?))')
      values.push(cursor.occurredAt, cursor.occurredAt, cursor.id)
    }
    const rows = this.db.prepare(`
      SELECT id,event_type eventType,entity_type entityType,agent_id agentId,
        parent_agent_id parentAgentId,status,runtime_kind runtimeKind,channel,model,action,
        occurred_at occurredAt,started_at startedAt,ended_at endedAt,duration_ms durationMs,
        observed_at observedAt,evidence_level evidenceLevel
      FROM telemetry_events
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY occurred_at DESC,id DESC LIMIT ?
    `).all(...values, query.limit + 1) as Record<string, unknown>[]
    const hasMore = rows.length > query.limit
    const items = rows.slice(0, query.limit).map(rowToEvent)
    const last = items.at(-1)
    return { items, nextCursor: hasMore && last ? encodeCursor(last.occurredAt, last.id) : null }
  }

  metrics(configuredAgents: number): MetricSummary {
    const now = new Date()
    const day = new Date(now.getTime() - 86_400_000).toISOString()
    const week = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const end = now.toISOString()
    const auditStatus = this.coverage('audit', 30, 120)
    const taskStatus = this.coverage('tasks', 45, 120)
    const metric = (value: number | null, status: CoverageStatus, start: string): MetricValue => ({
      value: status === 'unavailable' ? null : value,
      status,
      coverage: status === 'ready' ? 1 : status === 'partial' ? 0.5 : 0,
      windowStart: start,
      windowEnd: end,
    })
    const working = Number((this.db.prepare(
      "SELECT count(*) count FROM agent_state_current WHERE runtime_status='working' AND stale=0",
    ).get() as { count: number }).count)
    const activeTasks = Number((this.db.prepare(
      "SELECT count(*) count FROM task_state_current WHERE stored_status IN ('queued','running')",
    ).get() as { count: number }).count)
    const taskCompleted = this.countEvents('task', ['succeeded'], day)
    const taskFailures = this.countEvents('task', ['failed', 'timed_out', 'cancelled', 'lost'], day)
    const runTotals = this.runTotals(week)
    const runs24 = this.countEvents('agent_run', ['succeeded', 'failed', 'cancelled', 'timed_out'], day)
    const successRate = runTotals.total ? runTotals.succeeded / runTotals.total : null
    const median = this.medianDuration(null, week)
    return {
      configuredAgents: metric(configuredAgents, 'ready', end),
      workingNow: metric(working, combineCoverage(auditStatus, taskStatus), end),
      activeTasks: metric(activeTasks, taskStatus, end),
      tasksCompleted24h: metric(taskCompleted, taskStatus, day),
      taskFailures24h: metric(taskFailures, taskStatus, day),
      agentRuns24h: metric(runs24, auditStatus, day),
      runSuccessRate7d: metric(successRate, successRate === null ? 'unavailable' : auditStatus, week),
      medianRunDurationMs7d: metric(median, median === null ? 'unavailable' : auditStatus, week),
      observedAt: end,
    }
  }

  activity(roster: ConfiguredAgent[], days: number, timezone: string): ActivityMetrics {
    const auditStatus = this.coverage('audit', 30, 120)
    const taskStatus = this.coverage('tasks', 45, 120)
    const status = combineCoverage(auditStatus, taskStatus)
    const start = new Date(Date.now() - days * 86_400_000)
    const rows = this.db.prepare(`
      SELECT entity_type entityType,status,agent_id agentId,occurred_at occurredAt
      FROM telemetry_events WHERE occurred_at>=? AND entity_type IN ('agent_run','task')
    `).all(start.toISOString()) as Array<{ entityType: EntityType; status: string; agentId: string | null; occurredAt: string }>
    const dayKeys = Array.from({ length: days }, (_, index) =>
      localParts(new Date(Date.now() - (days - 1 - index) * 86_400_000).toISOString(), timezone).day,
    )
    const daily = dayKeys.map((key) => {
      const matches = rows.filter((row) => localParts(row.occurredAt, timezone).day === key)
      return {
        start: `${key}T12:00:00.000Z`,
        successfulRuns: matches.filter((row) => row.entityType === 'agent_run' && row.status === 'succeeded').length,
        failedRuns: matches.filter((row) => row.entityType === 'agent_run' && failureStatuses.has(row.status)).length,
        successfulTasks: matches.filter((row) => row.entityType === 'task' && row.status === 'succeeded').length,
        failedTasks: matches.filter((row) => row.entityType === 'task' && failureStatuses.has(row.status)).length,
        coverage: status,
      }
    })
    const counts = new Map<string, number>()
    for (const row of rows) {
      if (!row.agentId) continue
      const parts = localParts(row.occurredAt, timezone)
      const key = `${row.agentId}|${parts.day}|${parts.hour}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const daysList = dayKeys
    const byAgentHour: AgentActivityBucket[] = roster.flatMap((agent) =>
      daysList.flatMap((day) => Array.from({ length: 24 }, (_, hour) => ({
        agentId: agent.id,
        day,
        hour,
        count: counts.get(`${agent.id}|${day}|${hour}`) ?? 0,
      }))),
    )
    return { timezone, days, daily, byAgentHour, status, observedAt: new Date().toISOString() }
  }

  telemetryHealth(): TelemetryHealth {
    const collectors = (this.db.prepare(`
      SELECT source,state,last_attempt_at lastAttemptAt,last_success_at lastSuccessAt,
        coverage_start coverageStart,coverage_end coverageEnd,
        consecutive_failures consecutiveFailures,error_code errorCode
      FROM collector_state ORDER BY source
    `).all() as Array<Record<string, unknown>>).map((row): CollectorHealth => ({
      source: String(row.source),
      state: this.coverage(String(row.source), sourceFreshSeconds(String(row.source)), 120),
      lastAttemptAt: text(row.lastAttemptAt),
      lastSuccessAt: text(row.lastSuccessAt),
      coverageStart: text(row.coverageStart),
      coverageEnd: text(row.coverageEnd),
      consecutiveFailures: Number(row.consecutiveFailures),
      errorCode: text(row.errorCode),
    }))
    const gaps = Number((this.db.prepare('SELECT count(*) count FROM telemetry_gaps').get() as { count: number }).count)
    const backfill = this.db.prepare(
      "SELECT backfill_complete complete FROM collector_state WHERE source='audit'",
    ).get() as { complete: number } | undefined
    let databaseBytes = 0
    try { databaseBytes = fs.statSync(this.databasePath).size } catch { /* database can be in-memory */ }
    return {
      collectors,
      gaps,
      databaseBytes,
      backfillComplete: Boolean(backfill?.complete),
      observedAt: new Date().toISOString(),
    }
  }

  systemSummary(): SystemSummary {
    const sample = this.db.prepare(`
      SELECT service_uptime_seconds serviceUptimeSeconds,load_1 load1,load_5 load5,load_15 load15,
        memory_total_bytes memoryTotal,memory_free_bytes memoryFree,swap_total_bytes swapTotal,
        swap_free_bytes swapFree,disk_total_bytes diskTotal,disk_free_bytes diskFree,
        gateway_status gatewayStatus,gateway_version gatewayVersion,observed_at observedAt
      FROM system_samples_v2 ORDER BY observed_at DESC LIMIT 1
    `).get() as Record<string, unknown> | undefined
    const now = new Date().toISOString()
    return {
      gateway: {
        status: (sample?.gatewayStatus as SystemSummary['gateway']['status'] | undefined) ?? 'unknown',
        version: text(sample?.gatewayVersion),
        observedAt: text(sample?.observedAt) ?? now,
        ...(!sample ? { reason: 'System telemetry has not been collected.' } : {}),
      },
      serviceUptimeSeconds: Number(sample?.serviceUptimeSeconds ?? process.uptime()),
      loadAverage: sample ? [Number(sample.load1), Number(sample.load5), Number(sample.load15)] : os.loadavg(),
      memory: { totalBytes: Number(sample?.memoryTotal ?? os.totalmem()), freeBytes: Number(sample?.memoryFree ?? os.freemem()) },
      swap: { totalBytes: nullableNumber(sample?.swapTotal), freeBytes: nullableNumber(sample?.swapFree) },
      disk: { totalBytes: nullableNumber(sample?.diskTotal), freeBytes: nullableNumber(sample?.diskFree) },
      observedAt: text(sample?.observedAt) ?? now,
    }
  }

  prune() {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM telemetry_events WHERE occurred_at<datetime('now','-30 days')").run()
      this.db.prepare("DELETE FROM system_samples_v2 WHERE observed_at<datetime('now','-14 days')").run()
      this.db.prepare("DELETE FROM telemetry_gaps WHERE started_at<datetime('now','-90 days')").run()
      this.db.prepare(`
        DELETE FROM task_state_current
        WHERE updated_at<datetime('now','-30 days')
          AND stored_status NOT IN ('queued','running')
      `).run()
    })()
  }

  private collector(source: string): { state: CoverageStatus; lastSuccessAt: string | null } {
    const row = this.db.prepare('SELECT state,last_success_at lastSuccessAt FROM collector_state WHERE source=?').get(source) as
      { state: CoverageStatus; lastSuccessAt: string | null } | undefined
    return row ?? { state: 'unavailable', lastSuccessAt: null }
  }

  private coverage(source: string, freshSeconds: number, unavailableSeconds: number): CoverageStatus {
    const row = this.collector(source)
    if (!row.lastSuccessAt) return 'unavailable'
    const age = (Date.now() - new Date(row.lastSuccessAt).getTime()) / 1000
    if (age <= unavailableSeconds && row.state === 'partial') return 'partial'
    if (age <= freshSeconds && row.state === 'ready') return 'ready'
    if (age <= unavailableSeconds) return 'stale'
    return 'unavailable'
  }

  private countEvents(entityType: EntityType, statuses: string[], after: string): number {
    const placeholders = statuses.map(() => '?').join(',')
    return Number((this.db.prepare(`
      SELECT count(DISTINCT entity_ref) count FROM telemetry_events
      WHERE entity_type=? AND status IN (${placeholders}) AND occurred_at>=?
    `).get(entityType, ...statuses, after) as { count: number }).count)
  }

  private runTotals(after: string): { succeeded: number; total: number } {
    const row = this.db.prepare(`
      SELECT sum(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) succeeded,count(*) total FROM (
        SELECT entity_ref,status,row_number() OVER(PARTITION BY entity_ref ORDER BY occurred_at DESC,id DESC) rank
        FROM telemetry_events WHERE entity_type='agent_run' AND occurred_at>=?
      ) WHERE rank=1 AND status IN ('succeeded','failed','cancelled','timed_out')
    `).get(after) as { succeeded: number | null; total: number }
    return { succeeded: Number(row.succeeded ?? 0), total: Number(row.total) }
  }

  private agentStats(agentId: string): { successRate: number | null; medianDuration: number | null } {
    const after = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const row = this.db.prepare(`
      SELECT sum(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) succeeded,count(*) total FROM (
        SELECT entity_ref,status,row_number() OVER(PARTITION BY entity_ref ORDER BY occurred_at DESC,id DESC) rank
        FROM telemetry_events WHERE entity_type='agent_run' AND agent_id=? AND occurred_at>=?
      ) WHERE rank=1 AND status IN ('succeeded','failed','cancelled','timed_out')
    `).get(agentId, after) as { succeeded: number | null; total: number }
    return {
      successRate: row.total ? Number(row.succeeded ?? 0) / Number(row.total) : null,
      medianDuration: this.medianDuration(agentId, after),
    }
  }

  private medianDuration(agentId: string | null, after: string): number | null {
    const rows = this.db.prepare(`
      SELECT duration_ms duration FROM telemetry_events
      WHERE entity_type='agent_run' AND duration_ms IS NOT NULL AND occurred_at>=?
      ${agentId ? 'AND agent_id=?' : ''} ORDER BY duration_ms
    `).all(...(agentId ? [after, agentId] : [after])) as Array<{ duration: number }>
    if (!rows.length) return null
    const middle = Math.floor(rows.length / 2)
    return rows.length % 2
      ? Number(rows[middle].duration)
      : (Number(rows[middle - 1].duration) + Number(rows[middle].duration)) / 2
  }
}

const failureStatuses = new Set(['failed', 'timed_out', 'cancelled', 'lost'])

function combineCoverage(left: CoverageStatus, right: CoverageStatus): CoverageStatus {
  if (left === 'unavailable' || right === 'unavailable') return 'unavailable'
  if (left === 'stale' || right === 'stale') return 'stale'
  if (left === 'partial' || right === 'partial') return 'partial'
  return 'ready'
}

function sourceFreshSeconds(source: string): number {
  if (source === 'audit') return 30
  if (source === 'tasks') return 45
  if (source === 'sessions') return 120
  return 60
}

function encodeCursor(occurredAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ occurredAt, id }), 'utf8').toString('base64url')
}

function decodeCursor(value: string): { occurredAt: string; id: string } {
  try {
    const parsed = object(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
    const occurredAt = iso(parsed.occurredAt)
    const id = text(parsed.id)
    if (!occurredAt || !id) throw new Error('invalid')
    return { occurredAt, id }
  } catch {
    throw new Error('INVALID_CURSOR')
  }
}

function localParts(value: string, timezone: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00'
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function sanitizeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'COLLECTOR_FAILED'
  if (error.message.startsWith('AUDIT_') || error.message.startsWith('TASK_') || error.message.startsWith('FLOW_') || error.message === 'HMAC_SECRET_MISSING') {
    return error.message
  }
  const candidate = error.name === 'SyntaxError' ? 'MALFORMED_JSON' : 'SOURCE_UNAVAILABLE'
  return candidate
}

export function insertSystemSample(
  db: Db,
  gateway: { status: 'healthy' | 'degraded' | 'unknown'; version: string | null },
) {
  const [load1, load5, load15] = os.loadavg()
  const now = new Date().toISOString()
  let diskTotal: number | null = null
  let diskFree: number | null = null
  try {
    const disk = fs.statfsSync('/')
    diskTotal = Number(disk.blocks) * Number(disk.bsize)
    diskFree = Number(disk.bavail) * Number(disk.bsize)
  } catch { /* platform does not expose statfs */ }
  let swapTotal: number | null = null
  let swapFree: number | null = null
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8')
    const total = /^SwapTotal:\s+(\d+)/m.exec(meminfo)
    const free = /^SwapFree:\s+(\d+)/m.exec(meminfo)
    swapTotal = total ? Number(total[1]) * 1024 : null
    swapFree = free ? Number(free[1]) * 1024 : null
  } catch { /* non-Linux fixture environment */ }
  db.prepare(`
    INSERT OR REPLACE INTO system_samples_v2 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    now, Math.floor(process.uptime()), load1, load5, load15, os.totalmem(), os.freemem(),
    swapTotal, swapFree, diskTotal, diskFree, gateway.status, gateway.version,
  )
}
