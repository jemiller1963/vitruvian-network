import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runCommand, runJsonCommand } from './command.js'

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('bounded command execution', () => {
  it('parses bounded JSON output', async () => {
    const result = await runJsonCommand(
      process.execPath,
      ['-e', 'process.stdout.write(JSON.stringify({ok:true}))'],
      { timeoutMs: 1_000, maxBufferBytes: 10_000 },
    )
    expect(result).toEqual({ ok: true })
  })

  it('rejects output that exceeds the configured bound', async () => {
    await expect(
      runCommand(
        process.execPath,
        ['-e', 'process.stdout.write("x".repeat(20000))'],
        { timeoutMs: 1_000, maxBufferBytes: 1_000 },
      ),
    ).rejects.toThrow('OPENCLAW_COMMAND_OUTPUT_LIMIT')
  })

  it('terminates the process group after a timeout', async () => {
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
