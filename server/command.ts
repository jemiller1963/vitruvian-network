import { spawn, type ChildProcess } from 'node:child_process'

export interface RunCommandOptions {
  timeoutMs: number
  maxBufferBytes: number
  env?: NodeJS.ProcessEnv
}

function signalProcessTree(child: ChildProcess, signal: NodeJS.Signals) {
  if (!child.pid) return

  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // Fall back to the direct process below.
    }
  }

  try {
    child.kill(signal)
  } catch {
    // The process may already have exited.
  }
}

export function runCommand(
  binary: string,
  args: string[],
  options: RunCommandOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })

    const stdout: Buffer[] = []
    let bufferedBytes = 0
    let terminationError: Error | null = null
    let settled = false
    let forceKillTimer: NodeJS.Timeout | null = null

    const cleanupTimers = () => {
      clearTimeout(timeoutTimer)
      if (forceKillTimer) clearTimeout(forceKillTimer)
    }

    const terminate = (code: string) => {
      if (terminationError || settled) return
      terminationError = new Error(code)
      signalProcessTree(child, 'SIGTERM')
      forceKillTimer = setTimeout(() => signalProcessTree(child, 'SIGKILL'), 250)
      forceKillTimer.unref()
    }

    const accountOutput = (chunk: Buffer, keep: boolean) => {
      bufferedBytes += chunk.length
      if (bufferedBytes > options.maxBufferBytes) {
        terminate('OPENCLAW_COMMAND_OUTPUT_LIMIT')
        return
      }
      if (keep) stdout.push(chunk)
    }

    child.stdout?.on('data', (chunk: Buffer) => accountOutput(chunk, true))
    child.stderr?.on('data', (chunk: Buffer) => accountOutput(chunk, false))

    const timeoutTimer = setTimeout(
      () => terminate('OPENCLAW_COMMAND_TIMEOUT'),
      options.timeoutMs,
    )
    timeoutTimer.unref()

    child.once('error', () => {
      if (settled) return
      settled = true
      cleanupTimers()
      reject(new Error('OPENCLAW_COMMAND_SPAWN_FAILED'))
    })

    child.once('close', (code) => {
      if (settled) return
      settled = true
      cleanupTimers()

      if (terminationError) {
        reject(terminationError)
        return
      }
      if (code !== 0) {
        reject(new Error('OPENCLAW_COMMAND_FAILED'))
        return
      }

      resolve(Buffer.concat(stdout).toString('utf8'))
    })
  })
}

export async function runJsonCommand(
  binary: string,
  args: string[],
  options: RunCommandOptions,
): Promise<unknown> {
  const stdout = await runCommand(binary, args, options)
  try {
    return JSON.parse(stdout) as unknown
  } catch {
    throw new Error('OPENCLAW_JSON_INVALID')
  }
}
