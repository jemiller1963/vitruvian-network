import { buildApp } from './app.js'
import { CollectorManager } from './collectors.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db.js'

const config = loadConfig()
const db = openDatabase(config.databasePath)
const collectors = new CollectorManager(config, db)
const app = buildApp({ config, db })
collectors.start()

let stopping = false
const stop = async () => {
  if (stopping) return
  stopping = true
  collectors.stop()
  await app.close()
  db.close()
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())

await app.listen({ host: config.host, port: config.port })
process.stdout.write(`Vitruvian API listening on ${config.host}:${config.port}\n`)
