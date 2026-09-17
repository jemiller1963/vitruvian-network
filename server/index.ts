import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db.js'
import { startCollectorManager } from './runtime.js'

const config = loadConfig()
const db = openDatabase(config.databasePath)
const collectors = startCollectorManager(config, db)
const app = buildApp({ config, db })

let stopping = false
const stop = async () => {
  if (stopping) return
  stopping = true
  collectors?.stop()
  await app.close()
  db.close()
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())

await app.listen({ host: config.host, port: config.port })
process.stdout.write(`Vitruvian API listening on ${config.host}:${config.port}\n`)
