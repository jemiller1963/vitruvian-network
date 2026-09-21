import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('TEST_PORT_UNAVAILABLE'))
        return
      }
      const port = address.port
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('TEST_WAIT_TIMEOUT')
}

describe('process shutdown', () => {
  it('drains an active collector before closing SQLite on SIGTERM', async () => {
    if (process.platform === 'win32') return

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vitruvian-shutdown-'))
    const databasePath = path.join(directory, 'vitruvian.db')
    const configPath = path.join(directory, 'openclaw.json')
    const markerPath = path.join(directory, 'collector-active')
    const fakeOpenClawPath = path.join(directory, 'openclaw-fake')
    const port = await availablePort()

    await fs.writeFile(configPath, JSON.stringify({ agents: { list: [] } }))
    await fs.writeFile(
      fakeOpenClawPath,
      [
        '#!/usr/bin/env node',
        "const fs = require('node:fs')",
        "const marker = process.env.VITRUVIAN_TEST_COLLECTOR_MARKER",
        "if (process.argv[2] === 'audit') {",
        "  fs.writeFileSync(marker, 'active')",
        "  setTimeout(() => process.stdout.write(JSON.stringify({ records: [], nextCursor: null, version: 'test' })), 1000)",
        "} else {",
        "  process.stdout.write(JSON.stringify({}))",
        "}",
      ].join('\n'),
      { mode: 0o755 },
    )

    let stdout = ''
    let stderr = ''
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'server/index.ts'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          VITRUVIAN_API_HOST: '127.0.0.1',
          VITRUVIAN_API_PORT: String(port),
          VITRUVIAN_DATABASE_PATH: databasePath,
          VITRUVIAN_OPENCLAW_CONFIG: configPath,
          VITRUVIAN_OPENCLAW_BINARY: fakeOpenClawPath,
          VITRUVIAN_TELEMETRY_HMAC_SECRET: 'shutdown-test-secret-with-32-characters',
          VITRUVIAN_FIXTURE_ISOLATION: 'false',
          VITRUVIAN_COLLECTOR_CONCURRENCY: '1',
          VITRUVIAN_COLLECTOR_STARTUP_STAGGER_MS: '60000',
          VITRUVIAN_STATIC_DIR: path.join(directory, 'dist'),
          VITRUVIAN_ALLOWED_ORIGINS: 'http://127.0.0.1',
          VITRUVIAN_TEST_COLLECTOR_MARKER: markerPath,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })

    try {
      await waitFor(async () => {
        const markerExists = await fs.access(markerPath).then(() => true, () => false)
        return markerExists && stdout.includes('Vitruvian API listening')
      }, 3000)

      const shutdownStarted = Date.now()
      child.kill('SIGTERM')

      const exit = await Promise.race([
        new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
          child.once('exit', (code, signal) => resolve({ code, signal }))
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('SHUTDOWN_TIMEOUT')), 4000)
        }),
      ])
      const shutdownDurationMs = Date.now() - shutdownStarted

      expect(exit).toEqual({ code: 0, signal: null })
      expect(shutdownDurationMs).toBeLessThan(4000)
      expect(stderr).not.toContain('database connection is not open')

      const db = new Database(databasePath, { readonly: true })
      try {
        const result = db.pragma('integrity_check', { simple: true })
        expect(result).toBe('ok')
      } finally {
        db.close()
      }
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
      await fs.rm(directory, { recursive: true, force: true })
    }
  })
})
