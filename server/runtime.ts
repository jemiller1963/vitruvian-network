import { CollectorManager } from './collectors.js'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'

export interface CollectorLifecycle {
  start(): void
  stop(): void
}

export function startCollectorManager(
  config: AppConfig,
  db: Db,
  create: (config: AppConfig, db: Db) => CollectorLifecycle = (runtimeConfig, runtimeDb) =>
    new CollectorManager(runtimeConfig, runtimeDb),
): CollectorLifecycle | null {
  if (config.fixtureIsolation) return null

  const collectors = create(config, db)
  collectors.start()
  return collectors
}
