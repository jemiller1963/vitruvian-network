import { spawn, type ChildProcess } from 'node:child_process'
import { StringDecoder } from 'node:string_decoder'

export interface RunCommandOptions {
  timeoutMs: number
  maxBufferBytes: number
  env?: NodeJS.ProcessEnv
}

export interface RunFlowListOptions {
  timeoutMs: number
  maxInputBytes: number
  maxStderrBytes: number
  maxEnvelopeBytes: number
  maxFlowBytes: number
  maxFlows: number
  maxProjectedBytes: number
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

class FlowListStreamParser {
  private mode: 'detect' | 'array' | 'suffix' = 'detect'
  private topKind: 'root-array' | 'object' | null = null

  private envelopePrefix = ''
  private envelopeSuffix = ''
  private envelopeBytes = 0

  private objectDepth = 0
  private detectInString = false
  private detectEscape = false
  private collectingKey = false
  private keyLiteral = ''
  private currentKey: string | null = null
  private topState: 'key-or-end' | 'colon' | 'value' | 'skip-value' =
    'key-or-end'

  private selectedKey: string | null = null

  private element: string | null = null
  private elementBytes = 0
  private elementDepth = 0
  private elementInString = false
  private elementEscape = false
  private arrayMayEnd = true

  private flowCount = 0
  private projectedBytes = 0
  private readonly flows: unknown[] = []

  constructor(private options: RunFlowListOptions) {}

  feed(text: string) {
    for (const char of text) {
      if (this.mode === 'detect') {
        this.consumeDetect(char)
      } else if (this.mode === 'array') {
        this.consumeArray(char)
      } else {
        this.consumeSuffix(char)
      }
    }
  }

  finish(): unknown[] {
    if (this.mode === 'detect' || this.mode === 'array') {
      throw new Error('FLOW_JSON_TRUNCATED')
    }

    if (this.topKind === 'root-array') {
      if (this.envelopeSuffix.trim()) {
        throw new Error('FLOW_JSON_INVALID')
      }
      return this.flows
    }

    if (!this.selectedKey) {
      throw new Error('FLOW_JSON_ENVELOPE_INVALID')
    }

    try {
      const parsed = JSON.parse(
        `${this.envelopePrefix}[]${this.envelopeSuffix}`,
      ) as unknown

      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid')
      }

      const source = parsed as Record<string, unknown>
      if (!Array.isArray(source[this.selectedKey])) {
        throw new Error('invalid')
      }
    } catch {
      throw new Error('FLOW_JSON_INVALID')
    }

    return this.flows
  }

  private consumeDetect(char: string) {
    if (this.topKind === null) {
      if (/\s/.test(char)) {
        this.appendEnvelope('prefix', char)
        return
      }

      if (char === '[') {
        this.topKind = 'root-array'
        this.mode = 'array'
        return
      }

      if (char === '{') {
        this.topKind = 'object'
        this.objectDepth = 1
        this.appendEnvelope('prefix', char)
        return
      }

      throw new Error('FLOW_JSON_ENVELOPE_INVALID')
    }

    if (this.topKind !== 'object') {
      throw new Error('FLOW_JSON_ENVELOPE_INVALID')
    }

    if (this.detectInString) {
      this.appendEnvelope('prefix', char)

      if (this.collectingKey) {
        this.keyLiteral += char
      }

      if (this.detectEscape) {
        this.detectEscape = false
        return
      }

      if (char === '\\') {
        this.detectEscape = true
        return
      }

      if (char === '"') {
        this.detectInString = false

        if (this.collectingKey) {
          this.collectingKey = false
          try {
            const key = JSON.parse(this.keyLiteral) as unknown
            if (typeof key !== 'string') {
              throw new Error('invalid')
            }
            this.currentKey = key
            this.topState = 'colon'
          } catch {
            throw new Error('FLOW_JSON_INVALID')
          }
        }
      }

      return
    }

    if (
      this.objectDepth === 1
      && this.topState === 'value'
      && !/\s/.test(char)
    ) {
      if (
        char === '['
        && this.currentKey !== null
        && ['flows', 'items', 'data'].includes(this.currentKey)
      ) {
        this.selectedKey = this.currentKey
        this.mode = 'array'
        this.arrayMayEnd = true
        return
      }

      this.topState = 'skip-value'
    }

    this.appendEnvelope('prefix', char)

    if (char === '"') {
      this.detectInString = true
      this.detectEscape = false

      if (this.objectDepth === 1 && this.topState === 'key-or-end') {
        this.collectingKey = true
        this.keyLiteral = '"'
      } else {
        this.collectingKey = false
      }

      return
    }

    if (char === '{' || char === '[') {
      this.objectDepth += 1
      return
    }

    if (char === '}' || char === ']') {
      this.objectDepth -= 1

      if (this.objectDepth <= 0) {
        throw new Error('FLOW_JSON_ENVELOPE_INVALID')
      }

      return
    }

    if (this.objectDepth !== 1) return

    if (char === ':' && this.topState === 'colon') {
      this.topState = 'value'
      return
    }

    if (char === ',') {
      this.currentKey = null
      this.topState = 'key-or-end'
    }
  }

  private consumeArray(char: string) {
    if (this.element === null) {
      if (/\s/.test(char)) return

      if (char === ']') {
        if (!this.arrayMayEnd) {
          throw new Error('FLOW_JSON_INVALID')
        }

        this.mode = 'suffix'
        return
      }

      if (char === ',') {
        throw new Error('FLOW_JSON_INVALID')
      }

      this.element = char
      this.elementBytes = Buffer.byteLength(char, 'utf8')

      if (this.elementBytes > this.options.maxFlowBytes) {
        throw new Error('FLOW_RECORD_TOO_LARGE')
      }

      this.arrayMayEnd = false
      this.elementDepth = char === '{' || char === '[' ? 1 : 0
      this.elementInString = char === '"'
      this.elementEscape = false
      return
    }

    if (this.elementInString) {
      this.elementBytes += Buffer.byteLength(char, 'utf8')

      if (this.elementBytes > this.options.maxFlowBytes) {
        throw new Error('FLOW_RECORD_TOO_LARGE')
      }

      this.element += char

      if (this.elementEscape) {
        this.elementEscape = false
        return
      }

      if (char === '\\') {
        this.elementEscape = true
        return
      }

      if (char === '"') {
        this.elementInString = false
      }

      return
    }

    if (
      this.elementDepth === 0
      && (char === ',' || char === ']')
    ) {
      this.finalizeElement()

      if (char === ',') {
        this.arrayMayEnd = false
        return
      }

      this.mode = 'suffix'
      return
    }

    this.elementBytes += Buffer.byteLength(char, 'utf8')

    if (this.elementBytes > this.options.maxFlowBytes) {
      throw new Error('FLOW_RECORD_TOO_LARGE')
    }

    this.element += char

    if (char === '"') {
      this.elementInString = true
      this.elementEscape = false
      return
    }

    if (char === '{' || char === '[') {
      this.elementDepth += 1
      return
    }

    if (char === '}' || char === ']') {
      if (this.elementDepth === 0) {
        throw new Error('FLOW_JSON_INVALID')
      }

      this.elementDepth -= 1
    }
  }

  private consumeSuffix(char: string) {
    this.appendEnvelope('suffix', char)
  }

  private finalizeElement() {
    if (this.element === null) {
      throw new Error('FLOW_JSON_INVALID')
    }

    const raw = this.element.trim()
    this.element = null
    this.elementBytes = 0

    if (!raw) {
      throw new Error('FLOW_JSON_INVALID')
    }

    if (Buffer.byteLength(raw, 'utf8') > this.options.maxFlowBytes) {
      throw new Error('FLOW_RECORD_TOO_LARGE')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      throw new Error('FLOW_JSON_INVALID')
    }

    this.flowCount += 1
    if (this.flowCount > this.options.maxFlows) {
      throw new Error('FLOW_RECORD_LIMIT')
    }

    const projected = projectFlow(parsed)
    this.projectedBytes += Buffer.byteLength(
      JSON.stringify(projected),
      'utf8',
    )

    if (this.projectedBytes > this.options.maxProjectedBytes) {
      throw new Error('FLOW_PROJECTED_OUTPUT_LIMIT')
    }

    this.flows.push(projected)
  }

  private appendEnvelope(part: 'prefix' | 'suffix', char: string) {
    this.envelopeBytes += Buffer.byteLength(char, 'utf8')

    if (this.envelopeBytes > this.options.maxEnvelopeBytes) {
      throw new Error('FLOW_ENVELOPE_TOO_LARGE')
    }

    if (part === 'prefix') {
      this.envelopePrefix += char
    } else {
      this.envelopeSuffix += char
    }
  }
}

function projectFlow(value: unknown): Record<string, unknown> {
  const row =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}

  const projected: Record<string, unknown> = {}

  for (const key of [
    'flowId',
    'flow_id',
    'id',
    'ownerKey',
    'status',
    'agentId',
    'agent_id',
    'agent',
    'updatedAt',
    'updated_at',
    'completedAt',
    'completed_at',
    'startedAt',
    'started_at',
    'createdAt',
    'created_at',
    'endedAt',
    'ended_at',
    'durationMs',
    'duration_ms',
  ]) {
    if (row[key] !== undefined) {
      projected[key] = row[key]
    }
  }

  return projected
}

export function runFlowListCommand(
  binary: string,
  args: string[],
  options: RunFlowListOptions,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })

    const decoder = new StringDecoder('utf8')
    const parser = new FlowListStreamParser(options)

    let inputBytes = 0
    let stderrBytes = 0
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

      forceKillTimer = setTimeout(
        () => signalProcessTree(child, 'SIGKILL'),
        250,
      )
      forceKillTimer.unref()
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      if (terminationError || settled) return

      inputBytes += chunk.length

      if (inputBytes > options.maxInputBytes) {
        terminate('FLOW_STREAM_OUTPUT_LIMIT')
        return
      }

      try {
        parser.feed(decoder.write(chunk))
      } catch (error) {
        terminate(
          error instanceof Error
            ? error.message
            : 'FLOW_JSON_INVALID',
        )
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      if (terminationError || settled) return

      stderrBytes += chunk.length

      if (stderrBytes > options.maxStderrBytes) {
        terminate('FLOW_STDERR_OUTPUT_LIMIT')
      }
    })

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

      try {
        parser.feed(decoder.end())
        resolve(parser.finish())
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('FLOW_JSON_INVALID'),
        )
      }
    })
  })
}
