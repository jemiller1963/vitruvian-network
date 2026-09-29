import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  runCommand,
  runFlowListCommand,
  runJsonCommand,
  type RunFlowListOptions,
} from './command.js'

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const flowOptions = (
  overrides: Partial<RunFlowListOptions> = {},
): RunFlowListOptions => ({
  timeoutMs: 2_000,
  maxInputBytes: 8 * 1024 * 1024,
  maxStderrBytes: 256 * 1024,
  maxEnvelopeBytes: 256 * 1024,
  maxFlowBytes: 4 * 1024 * 1024,
  maxFlows: 10_000,
  maxProjectedBytes: 4 * 1024 * 1024,
  ...overrides,
})

const runFlowScript = (
  script: string,
  options: Partial<RunFlowListOptions> = {},
) =>
  runFlowListCommand(
    process.execPath,
    ['-e', script],
    flowOptions(options),
  )

describe('bounded command execution', () => {
  it('parses bounded JSON output', async () => {
    const result = await runJsonCommand(
      process.execPath,
      ['-e', 'process.stdout.write(JSON.stringify({ok:true}))'],
      { timeoutMs: 1_000, maxBufferBytes: 10_000 },
    )

    expect(result).toEqual({ ok: true })
  })

  it('rejects output that exceeds the configured generic bound', async () => {
    await expect(
      runCommand(
        process.execPath,
        ['-e', 'process.stdout.write("x".repeat(20000))'],
        { timeoutMs: 1_000, maxBufferBytes: 1_000 },
      ),
    ).rejects.toThrow('OPENCLAW_COMMAND_OUTPUT_LIMIT')
  })

  it('terminates the process group after a generic command timeout', async () => {
    if (process.platform === 'win32') return

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vitruvian-command-'))
    const pidPath = path.join(directory, 'child.pid')
    let grandchildPid: number | null = null

    try {
      const script = [
        "const {spawn}=require('node:child_process')",
        "const fs=require('node:fs')",
        "const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'})",
        "fs.writeFileSync(process.argv[1],String(child.pid))",
        "setInterval(()=>{},1000)",
      ].join(';')

      await expect(
        runCommand(
          process.execPath,
          ['-e', script, pidPath],
          { timeoutMs: 300, maxBufferBytes: 10_000 },
        ),
      ).rejects.toThrow('OPENCLAW_COMMAND_TIMEOUT')

      grandchildPid = Number(await fs.readFile(pidPath, 'utf8'))

      for (let attempt = 0; attempt < 20 && isAlive(grandchildPid); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }

      expect(isAlive(grandchildPid)).toBe(false)
    } finally {
      if (grandchildPid && isAlive(grandchildPid)) {
        try {
          process.kill(grandchildPid, 'SIGKILL')
        } catch {
          // Best-effort test cleanup only.
        }
      }

      await fs.rm(directory, { recursive: true, force: true })
    }
  })
})

describe('bounded flow-list streaming', () => {
  it('accepts source JSON larger than the generic 2 MB command limit', async () => {
    const result = await runFlowScript(`
      const large = 'x'.repeat(2_500_000)
      process.stdout.write(JSON.stringify({
        flows: [{
          flowId: 'flow-1',
          status: 'succeeded',
          createdAt: '2026-09-25T00:00:00.000Z',
          updatedAt: '2026-09-25T00:01:00.000Z',
          endedAt: '2026-09-25T00:01:00.000Z',
          taskSummary: large
        }]
      }))
    `)

    expect(result).toEqual([{
      flowId: 'flow-1',
      status: 'succeeded',
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:01:00.000Z',
      endedAt: '2026-09-25T00:01:00.000Z',
    }])
  })

  it('discards tasks, taskSummary, goal, and unrelated flow metadata', async () => {
    const result = await runFlowScript(`
      process.stdout.write(JSON.stringify({
        flows: [{
          flowId: 'flow-1',
          status: 'running',
          createdAt: '2026-09-25T00:00:00.000Z',
          tasks: [{ id: 'task-1', payload: 'secret-heavy-data' }],
          taskSummary: 'large-summary',
          goal: 'large-goal',
          revision: 42,
          syncMode: 'test',
          notifyPolicy: 'all'
        }]
      }))
    `)

    expect(result).toEqual([{
      flowId: 'flow-1',
      status: 'running',
      createdAt: '2026-09-25T00:00:00.000Z',
    }])

    expect(JSON.stringify(result)).not.toContain('secret-heavy-data')
    expect(JSON.stringify(result)).not.toContain('large-summary')
    expect(JSON.stringify(result)).not.toContain('large-goal')
  })

  it('preserves all flow-normalizer compatibility aliases', async () => {
    const result = await runFlowScript(`
      process.stdout.write(JSON.stringify({
        flows: [{
          flowId: 'flowId',
          flow_id: 'flow_id',
          id: 'id',
          ownerKey: 'ownerKey',
          status: 'succeeded',
          agentId: 'agentId',
          agent_id: 'agent_id',
          agent: 'agent',
          updatedAt: 'updatedAt',
          updated_at: 'updated_at',
          completedAt: 'completedAt',
          completed_at: 'completed_at',
          startedAt: 'startedAt',
          started_at: 'started_at',
          createdAt: 'createdAt',
          created_at: 'created_at',
          endedAt: 'endedAt',
          ended_at: 'ended_at',
          durationMs: 100,
          duration_ms: 200
        }]
      }))
    `)

    expect(result).toEqual([{
      flowId: 'flowId',
      flow_id: 'flow_id',
      id: 'id',
      ownerKey: 'ownerKey',
      status: 'succeeded',
      agentId: 'agentId',
      agent_id: 'agent_id',
      agent: 'agent',
      updatedAt: 'updatedAt',
      updated_at: 'updated_at',
      completedAt: 'completedAt',
      completed_at: 'completed_at',
      startedAt: 'startedAt',
      started_at: 'started_at',
      createdAt: 'createdAt',
      created_at: 'created_at',
      endedAt: 'endedAt',
      ended_at: 'ended_at',
      durationMs: 100,
      duration_ms: 200,
    }])
  })

  it('accepts a root flow array', async () => {
    const result = await runFlowScript(`
      process.stdout.write(JSON.stringify([
        { flowId: 'flow-1', status: 'succeeded' },
        { flowId: 'flow-2', status: 'failed' }
      ]))
    `)

    expect(result).toEqual([
      { flowId: 'flow-1', status: 'succeeded' },
      { flowId: 'flow-2', status: 'failed' },
    ])
  })

  it('accepts items and data envelope aliases', async () => {
    const items = await runFlowScript(`
      process.stdout.write(JSON.stringify({
        items: [{ flowId: 'items-flow', status: 'succeeded' }]
      }))
    `)

    const data = await runFlowScript(`
      process.stdout.write(JSON.stringify({
        data: [{ flowId: 'data-flow', status: 'failed' }]
      }))
    `)

    expect(items).toEqual([
      { flowId: 'items-flow', status: 'succeeded' },
    ])

    expect(data).toEqual([
      { flowId: 'data-flow', status: 'failed' },
    ])
  })

  it('handles JSON strings and escapes across streamed chunks', async () => {
    const result = await runFlowScript(`
      const payload = JSON.stringify({
        flows: [{
          flowId: 'flow-1',
          status: 'succeeded',
          taskSummary: 'quote:" slash:\\\\\\\\ nested:{[]} unicode:é'
        }]
      })

      for (const char of payload) {
        process.stdout.write(char)
      }
    `)

    expect(result).toEqual([
      { flowId: 'flow-1', status: 'succeeded' },
    ])
  })

  it('rejects malformed flow JSON', async () => {
    await expect(
      runFlowScript(`
        process.stdout.write('{"flows":[{"flowId":"flow-1",}]}')
      `),
    ).rejects.toThrow('FLOW_JSON_INVALID')
  })

  it('rejects truncated flow JSON', async () => {
    await expect(
      runFlowScript(`
        process.stdout.write('{"flows":[{"flowId":"flow-1"}')
      `),
    ).rejects.toThrow('FLOW_JSON_TRUNCATED')
  })

  it('rejects an invalid top-level envelope', async () => {
    await expect(
      runFlowScript(`
        process.stdout.write(JSON.stringify({
          unrelated: [{ flowId: 'flow-1' }]
        }))
      `),
    ).rejects.toThrow('FLOW_JSON_ENVELOPE_INVALID')
  })

  it('rejects an oversized individual flow record', async () => {
    await expect(
      runFlowScript(
        `
          process.stdout.write(JSON.stringify({
            flows: [{
              flowId: 'flow-1',
              taskSummary: 'x'.repeat(5000)
            }]
          }))
        `,
        { maxFlowBytes: 1_000 },
      ),
    ).rejects.toThrow('FLOW_RECORD_TOO_LARGE')
  })

  it('counts individual flow size in UTF-8 bytes', async () => {
    await expect(
      runFlowScript(
        `
          process.stdout.write(JSON.stringify({
            flows: [{
              flowId: 'flow-1',
              taskSummary: 'é'.repeat(600)
            }]
          }))
        `,
        { maxFlowBytes: 1_000 },
      ),
    ).rejects.toThrow('FLOW_RECORD_TOO_LARGE')
  })

  it('rejects excessive flow-record counts', async () => {
    await expect(
      runFlowScript(
        `
          process.stdout.write(JSON.stringify({
            flows: [
              { flowId: 'flow-1' },
              { flowId: 'flow-2' },
              { flowId: 'flow-3' }
            ]
          }))
        `,
        { maxFlows: 2 },
      ),
    ).rejects.toThrow('FLOW_RECORD_LIMIT')
  })

  it('rejects projected output beyond its retained-memory bound', async () => {
    await expect(
      runFlowScript(
        `
          process.stdout.write(JSON.stringify({
            flows: [
              { flowId: 'flow-' + 'x'.repeat(500), status: 'succeeded' },
              { flowId: 'flow-' + 'y'.repeat(500), status: 'succeeded' }
            ]
          }))
        `,
        { maxProjectedBytes: 600 },
      ),
    ).rejects.toThrow('FLOW_PROJECTED_OUTPUT_LIMIT')
  })

  it('rejects total streamed input beyond its bound', async () => {
    await expect(
      runFlowScript(
        `
          process.stdout.write(JSON.stringify({
            flows: [{
              flowId: 'flow-1',
              taskSummary: 'x'.repeat(5000)
            }]
          }))
        `,
        {
          maxInputBytes: 1_000,
          maxFlowBytes: 10_000,
        },
      ),
    ).rejects.toThrow('FLOW_STREAM_OUTPUT_LIMIT')
  })

  it('rejects stderr beyond its bound', async () => {
    await expect(
      runFlowScript(
        `
          process.stderr.write('x'.repeat(5000))
          process.stdout.write(JSON.stringify({ flows: [] }))
        `,
        { maxStderrBytes: 1_000 },
      ),
    ).rejects.toThrow('FLOW_STDERR_OUTPUT_LIMIT')
  })

  it('rejects a nonzero OpenClaw subprocess exit', async () => {
    await expect(
      runFlowScript(`
        process.stdout.write(JSON.stringify({ flows: [] }))
        process.exit(7)
      `),
    ).rejects.toThrow('OPENCLAW_COMMAND_FAILED')
  })

  it('terminates the flow subprocess group after timeout', async () => {
    if (process.platform === 'win32') return

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vitruvian-flow-command-'))
    const pidPath = path.join(directory, 'child.pid')
    let grandchildPid: number | null = null

    try {
      const script = [
        "const {spawn}=require('node:child_process')",
        "const fs=require('node:fs')",
        "const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'})",
        "fs.writeFileSync(process.argv[1],String(child.pid))",
        "process.stdout.write('{\"flows\":[')",
        "setInterval(()=>{},1000)",
      ].join(';')

      await expect(
        runFlowListCommand(
          process.execPath,
          ['-e', script, pidPath],
          flowOptions({ timeoutMs: 300 }),
        ),
      ).rejects.toThrow('OPENCLAW_COMMAND_TIMEOUT')

      grandchildPid = Number(await fs.readFile(pidPath, 'utf8'))

      for (let attempt = 0; attempt < 20 && isAlive(grandchildPid); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }

      expect(isAlive(grandchildPid)).toBe(false)
    } finally {
      if (grandchildPid && isAlive(grandchildPid)) {
        try {
          process.kill(grandchildPid, 'SIGKILL')
        } catch {
          // Best-effort test cleanup only.
        }
      }

      await fs.rm(directory, { recursive: true, force: true })
    }
  })
})
