import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from './db.js'
import {
  TelemetryNormalizer,
  TelemetryStore,
  insertSystemSample,
  sanitizeErrorCode,
} from './telemetry.js'

const cleanup: string[] = []
afterEach(() => {
  for (const directory of cleanup.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vitruvian-telemetry-'))
  cleanup.push(directory)
  const databasePath = path.join(directory, 'test.db')
  const db = openDatabase(databasePath)
  return { db, store: new TelemetryStore(db, databasePath) }
}

describe('telemetry normalization and storage', () => {
  it('pseudonymizes identifiers and never persists raw session or execution IDs', () => {
    const { db, store } = fixture()
    const normalizer = new TelemetryNormalizer('a-secure-test-secret-with-32-characters')
    const event = normalizer.audit({
      id: 'audit-1',
      kind: 'agent_run',
      status: 'succeeded',
      agentId: 'main',
      executionId: 'raw-execution-id',
      sessionKey: 'raw-session-key',
      occurredAt: '2026-09-16T18:00:00.000Z',
    }, 'audit-v1')
    expect(event.entityRef).not.toContain('raw-execution-id')
    expect(event.sessionRef).not.toContain('raw-session-key')
    store.ingest([event])
    const serialized = JSON.stringify(db.prepare('SELECT * FROM telemetry_events').all())
    expect(serialized).not.toContain('raw-execution-id')
    expect(serialized).not.toContain('raw-session-key')
    db.close()
  })

  it('deduplicates overlapping audit pages and separates runs from tasks', () => {
    const { db, store } = fixture()
    const normalizer = new TelemetryNormalizer('a-secure-test-secret-with-32-characters')
    const run = normalizer.audit({
      id: 'audit-1',
      kind: 'agent_run',
      status: 'succeeded',
      agentId: 'main',
      executionId: 'run-1',
      occurredAt: new Date().toISOString(),
    }, 'audit-v1')
    const task = normalizer.task({
      taskId: 'task-1',
      agentId: 'main',
      runtime: 'subagent',
      status: 'succeeded',
      terminalOutcome: 'succeeded',
      updatedAt: new Date().toISOString(),
    })
    expect(store.ingest([run, run])).toBe(1)
    store.upsertTasks([task])
    store.markCollectorSuccess('audit')
    store.markCollectorSuccess('tasks')
    const count = db.prepare('SELECT count(*) count FROM telemetry_events').get() as { count: number }
    expect(count.count).toBe(2)
    expect(store.metrics(1).tasksCompleted24h.value).toBe(1)
    expect(store.metrics(1).agentRuns24h.value).toBe(1)
    db.close()
  })

  it('paginates deterministically with opaque cursors', () => {
    const { db, store } = fixture()
    const normalizer = new TelemetryNormalizer('a-secure-test-secret-with-32-characters')
    const events = [1, 2, 3].map((id) => normalizer.audit({
      id: `audit-${id}`,
      kind: 'agent_run',
      status: 'succeeded',
      agentId: 'main',
      executionId: `run-${id}`,
      occurredAt: `2026-09-16T18:00:0${id}.000Z`,
    }, 'audit-v1'))
    store.ingest(events)
    const first = store.events({ limit: 2 })
    expect(first.items).toHaveLength(2)
    expect(first.nextCursor).toBeTruthy()
    const second = store.events({ limit: 2, cursor: first.nextCursor! })
    expect(second.items).toHaveLength(1)
    expect(new Set([...first.items, ...second.items].map((event) => event.id)).size).toBe(3)
    db.close()
  })

  it('uses safe collector error codes', () => {
    expect(sanitizeErrorCode(new SyntaxError('raw payload and path /private'))).toBe('MALFORMED_JSON')
    expect(sanitizeErrorCode(new Error('token=secret'))).toBe('SOURCE_UNAVAILABLE')
  })

  it('stores system samples and derives agent state only from fresh evidence', () => {
    const { db, store } = fixture()
    insertSystemSample(db, { status: 'healthy', version: 'test-version' })
    expect(store.systemSummary().gateway.status).toBe('healthy')
    store.refreshAgentState([{ id: 'main', displayName: 'Leo', configuredModel: 'model', allowedSubagents: [] }])
    expect(store.agents([{ id: 'main', displayName: 'Leo', configuredModel: 'model', allowedSubagents: [] }])[0].runtimeStatus).toBe('unknown')
    store.markCollectorSuccess('audit')
    store.markCollectorSuccess('tasks')
    store.refreshAgentState([{ id: 'main', displayName: 'Leo', configuredModel: 'model', allowedSubagents: [] }])
    expect(store.agents([{ id: 'main', displayName: 'Leo', configuredModel: 'model', allowedSubagents: [] }])[0].runtimeStatus).toBe('idle')
    db.close()
  })

  it('keeps incomplete source coverage partial instead of reporting ready', () => {
    const { db, store } = fixture()
    store.markCollectorSuccess('audit', { state: 'partial', backfillComplete: false })
    store.markCollectorSuccess('tasks')
    expect(store.activity([], 7, 'UTC').status).toBe('partial')
    expect(store.telemetryHealth().backfillComplete).toBe(false)
    db.close()
  })
})
