import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export type Db = Database.Database

const phase1 = `
CREATE TABLE IF NOT EXISTS schema_migrations(
  id INTEGER PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  source_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  description TEXT,
  status TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  observed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(occurred_at DESC);
CREATE TABLE IF NOT EXISTS agent_snapshots(
  id INTEGER PRIMARY KEY,
  agent_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS system_samples(
  id INTEGER PRIMARY KEY,
  observed_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log(
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT
);
INSERT OR IGNORE INTO schema_migrations VALUES(1,'phase1-foundation',datetime('now'));
`

const phase2 = `
CREATE TABLE IF NOT EXISTS telemetry_events(
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_key TEXT NOT NULL,
  source_schema_version TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('agent_run','task','flow','health_finding')),
  entity_ref TEXT NOT NULL,
  agent_id TEXT,
  parent_agent_id TEXT,
  session_ref TEXT,
  status TEXT NOT NULL,
  runtime_kind TEXT,
  channel TEXT,
  model TEXT,
  action TEXT,
  occurred_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  duration_ms INTEGER,
  evidence_level TEXT NOT NULL,
  normalizer_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(source, source_event_key)
);
CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_events(occurred_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_time ON telemetry_events(agent_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_type_status ON telemetry_events(entity_type,status,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_entity ON telemetry_events(entity_ref,occurred_at);

CREATE TABLE IF NOT EXISTS agent_state_current(
  agent_id TEXT PRIMARY KEY,
  runtime_status TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  current_activity TEXT,
  active_runs INTEGER NOT NULL DEFAULT 0,
  active_tasks INTEGER NOT NULL DEFAULT 0,
  observed_model TEXT,
  last_seen_at TEXT,
  evidence_level TEXT NOT NULL,
  stale INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_state_current(
  task_ref TEXT PRIMARY KEY,
  agent_id TEXT,
  parent_agent_id TEXT,
  runtime_kind TEXT,
  stored_status TEXT NOT NULL,
  terminal_outcome TEXT,
  started_at TEXT,
  ended_at TEXT,
  updated_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_state_agent ON task_state_current(agent_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_state_status ON task_state_current(stored_status,updated_at DESC);

CREATE TABLE IF NOT EXISTS session_context_current(
  agent_id TEXT PRIMARY KEY,
  stored_count INTEGER NOT NULL,
  last_updated_at TEXT,
  observed_model TEXT,
  observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collector_state(
  source TEXT PRIMARY KEY,
  schema_fingerprint TEXT,
  state TEXT NOT NULL,
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_reconciled_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  coverage_start TEXT,
  coverage_end TEXT,
  error_code TEXT,
  backfill_complete INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS telemetry_gaps(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  reason_code TEXT NOT NULL,
  observed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_gaps_time ON telemetry_gaps(started_at DESC);

CREATE TABLE IF NOT EXISTS activity_hourly(
  bucket_start TEXT NOT NULL,
  agent_id TEXT,
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY(bucket_start,agent_id,entity_type,status)
);

CREATE TABLE IF NOT EXISTS system_samples_v2(
  observed_at TEXT PRIMARY KEY,
  service_uptime_seconds INTEGER NOT NULL,
  load_1 REAL NOT NULL,
  load_5 REAL NOT NULL,
  load_15 REAL NOT NULL,
  memory_total_bytes INTEGER NOT NULL,
  memory_free_bytes INTEGER NOT NULL,
  swap_total_bytes INTEGER,
  swap_free_bytes INTEGER,
  disk_total_bytes INTEGER,
  disk_free_bytes INTEGER,
  gateway_status TEXT NOT NULL,
  gateway_version TEXT
);

CREATE TABLE IF NOT EXISTS state_revisions(
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  revision INTEGER NOT NULL
);
INSERT OR IGNORE INTO state_revisions(singleton,revision) VALUES(1,0);
INSERT OR IGNORE INTO schema_migrations VALUES(2,'phase2-trustworthy-telemetry',datetime('now'));
`

export function openDatabase(file: string): Db {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.exec(phase1)
  db.transaction(() => db.exec(phase2))()
  return db
}

export function nextRevision(db: Db): number {
  db.prepare('UPDATE state_revisions SET revision=revision+1 WHERE singleton=1').run()
  return Number((db.prepare('SELECT revision FROM state_revisions WHERE singleton=1').get() as { revision: number }).revision)
}

export function currentRevision(db: Db): number {
  return Number((db.prepare('SELECT revision FROM state_revisions WHERE singleton=1').get() as { revision: number }).revision)
}
