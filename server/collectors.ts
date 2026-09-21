import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import { OpenClawAdapter } from './openclaw.js'
import {
  insertSystemSample,
  sanitizeErrorCode,
  TelemetryNormalizer,
  TelemetryStore,
} from './telemetry.js'

type Source = 'audit' | 'tasks' | 'flows' | 'task_audit' | 'sessions' | 'status' | 'system'

const intervals: Record<Source, number> = {
  audit: 10_000,
  tasks: 15_000,
  flows: 30_000,
  task_audit: 60_000,
  sessions: 60_000,
  status: 30_000,
  system: 30_000,
}

export function statusSnapshot(status: Record<string, unknown>): {
  status: 'healthy' | 'degraded' | 'unknown'
  version: string | null
} {
  const gateway = status.gateway
  const gatewayRecord = gateway && typeof gateway === 'object' && !Array.isArray(gateway)
    ? gateway as Record<string, unknown>
    : {}
  const hasError = gatewayRecord.error !== null
    && gatewayRecord.error !== undefined
    && gatewayRecord.error !== false
    && gatewayRecord.error !== ''

  const gatewayStatus = gatewayRecord.reachable === true
    && gatewayRecord.misconfigured !== true
    && !hasError
    ? 'healthy'
    : gatewayRecord.reachable === false
      || gatewayRecord.misconfigured === true
      || hasError
      ? 'degraded'
      : 'unknown'

  return {
    status: gatewayStatus,
    version: typeof status.runtimeVersion === 'string' ? status.runtimeVersion : null,
  }
}

export class CollectorManager {
  private timers: NodeJS.Timeout[] = []
  private running = new Set<Source>()
  private stopped = false
  private normalizer: TelemetryNormalizer | null
  private activeCollectors = 0
  private permitWaiters: Array<(granted: boolean) => void> = []
  private drainWaiters: Array<() => void> = []
  private suppressedSources = new Set<Source>()

  constructor(
    private config: AppConfig,
    private db: Db,
    private openclaw = new OpenClawAdapter(config),
    private store = new TelemetryStore(db, config.databasePath),
  ) {
    this.normalizer = config.telemetryHmacSecret
      ? new TelemetryNormalizer(config.telemetryHmacSecret)
      : null
  }

  start() {
    ;(Object.keys(intervals) as Source[]).forEach((source, index) => {
      const startupDelay = index * this.config.collectorStartupStaggerMs
      if (startupDelay === 0) {
        void this.run(source)
      } else {
        this.timers.push(setTimeout(() => void this.run(source), startupDelay))
      }

      this.timers.push(setInterval(() => void this.run(source), intervals[source]))
    })
  }

  async stop(): Promise<void> {
    this.stopped = true
    for (const timer of this.timers) clearTimeout(timer)
    this.timers = []

    for (const waiter of this.permitWaiters.splice(0)) waiter(false)
    if (this.activeCollectors === 0) return

    await new Promise<void>((resolve) => this.drainWaiters.push(resolve))
  }

  async collectOnce(source: Source) {
    await this.run(source)
  }

  private acquirePermit(): Promise<boolean> {
    if (this.stopped) return Promise.resolve(false)

    if (this.activeCollectors < this.config.collectorConcurrency) {
      this.activeCollectors += 1
      return Promise.resolve(true)
    }

    return new Promise((resolve) => this.permitWaiters.push(resolve))
  }

  private releasePermit() {
    const next = this.permitWaiters.shift()
    if (next) {
      next(true)
      return
    }
    this.activeCollectors = Math.max(0, this.activeCollectors - 1)
    if (this.stopped && this.activeCollectors === 0) {
      for (const waiter of this.drainWaiters.splice(0)) waiter()
    }
  }

  private async run(source: Source) {
    if (this.stopped || this.suppressedSources.has(source) || this.running.has(source)) return
    this.running.add(source)

    const granted = await this.acquirePermit()
    if (!granted || this.stopped) {
      if (granted) this.releasePermit()
      this.running.delete(source)
      return
    }

    this.store.markCollectorAttempt(source)
    try {
      if (!this.normalizer && ['audit', 'tasks', 'flows', 'sessions'].includes(source)) {
        throw new Error('HMAC_SECRET_MISSING')
      }
      if (source === 'audit') await this.collectAudit()
      if (source === 'tasks') await this.collectTasks()
      if (source === 'flows') await this.collectFlows()
      if (source === 'task_audit') await this.collectTaskAudit()
      if (source === 'sessions') await this.collectSessions()
      if (source === 'status') await this.collectStatus()
      if (source === 'system') await this.collectSystem()
      if (!this.stopped) {
        const roster = await this.openclaw.configuredAgents()
        this.store.refreshAgentState(roster)
      }
    } catch (error) {
      const errorCode = sanitizeErrorCode(error)
      if (errorCode === 'OPENCLAW_COMMAND_OUTPUT_LIMIT') this.suppressedSources.add(source)
      this.store.markCollectorFailure(source, errorCode)
    } finally {
      this.running.delete(source)
      this.releasePermit()
    }
  }

  private async collectAudit() {
    const normalizer = this.requireNormalizer()
    const state = this.db.prepare(
      "SELECT coverage_end coverageEnd,backfill_complete complete FROM collector_state WHERE source='audit'",
    ).get() as { coverageEnd: string | null; complete: number } | undefined
    const after = state?.coverageEnd
      ? new Date(new Date(state.coverageEnd).getTime() - 120_000).toISOString()
      : new Date(Date.now() - 7 * 86_400_000).toISOString()
    let cursor: string | undefined
    let schema = 'unknown'
    let pages = 0
    let newest = after
    do {
      const page = await this.openclaw.auditPage({ after, cursor, limit: 500 })
      schema = page.schemaVersion
      const normalized = page.records.flatMap((row) => {
        try {
          return [normalizer.audit(row, schema)]
        } catch (error) {
          if (error instanceof Error && error.message === 'AUDIT_KIND_IGNORED') return []
          throw error
        }
      })
      this.store.ingest(normalized)
      for (const event of normalized) if (event.occurredAt > newest) newest = event.occurredAt
      cursor = page.nextCursor ?? undefined
      pages += 1
    } while (!this.stopped && cursor && pages < 20)
    this.store.markCollectorSuccess('audit', {
      schema,
      coverageStart: after,
      coverageEnd: newest,
      backfillComplete: !cursor,
      state: cursor ? 'partial' : 'ready',
    })
  }

  private async collectTasks() {
    const normalizer = this.requireNormalizer()
    const now = new Date().toISOString()
    const events = (await this.openclaw.tasks()).map((row) => normalizer.task(row, now))
    this.store.upsertTasks(events)
    this.store.markCollectorSuccess('tasks', { coverageEnd: now })
  }

  private async collectFlows() {
    const normalizer = this.requireNormalizer()
    const now = new Date().toISOString()
    const events = (await this.openclaw.flows()).map((row) => normalizer.flow(row, now))
    this.store.ingest(events)
    this.store.markCollectorSuccess('flows', { coverageEnd: now })
  }

  private async collectTaskAudit() {
    await this.openclaw.taskAudit()
    this.store.markCollectorSuccess('task_audit', { coverageEnd: new Date().toISOString() })
  }

  private async collectSessions() {
    const now = new Date().toISOString()
    this.store.upsertSessions(await this.openclaw.sessions(), this.requireNormalizer(), now)
    this.store.markCollectorSuccess('sessions', { coverageEnd: now })
  }

  private async collectStatus() {
    insertSystemSample(this.db, statusSnapshot(await this.openclaw.status()))
    this.store.markCollectorSuccess('status', { coverageEnd: new Date().toISOString() })
  }

  private async collectSystem() {
    const previous = this.store.systemSummary().gateway
    insertSystemSample(this.db, { status: previous.status, version: previous.version })
    this.store.prune()
    this.store.markCollectorSuccess('system', { coverageEnd: new Date().toISOString() })
  }

  private requireNormalizer(): TelemetryNormalizer {
    if (!this.normalizer) throw new Error('HMAC_SECRET_MISSING')
    return this.normalizer
  }
}
