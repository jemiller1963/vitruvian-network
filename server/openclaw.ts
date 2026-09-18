import fs from 'node:fs/promises'
import type { AppConfig } from './config.js'
import { runJsonCommand } from './command.js'

export interface ConfiguredAgent {
  id: string
  displayName: string
  configuredModel: string | null
  allowedSubagents: string[]
}

export interface AuditPage {
  records: unknown[]
  nextCursor: string | null
  schemaVersion: string
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function arrayFrom(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value
  const source = record(value)
  for (const key of keys) if (Array.isArray(source[key])) return source[key] as unknown[]
  return []
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export class OpenClawAdapter {
  constructor(private config: AppConfig) {}

  async configuredAgents(): Promise<ConfiguredAgent[]> {
    const raw = record(JSON.parse(await fs.readFile(this.config.openclawConfigPath, 'utf8')))
    const agents = record(raw.agents)
    const defaults = record(agents.defaults)
    const defaultModel = record(defaults.model)
    return arrayFrom(agents.list, []).map((value) => {
      const agent = record(value)
      const model = record(agent.model)
      const subagents = record(agent.subagents)
      const id = string(agent.id) ?? 'unknown'
      return {
        id,
        displayName: string(agent.name) ?? id,
        configuredModel:
          string(model.primary) ?? string(agent.model) ?? string(defaultModel.primary),
        allowedSubagents: arrayFrom(subagents.allowAgents, []).flatMap((item) =>
          string(item) ? [String(item)] : [],
        ),
      }
    })
  }

  async status(): Promise<Record<string, unknown>> {
    return record(await this.json(['status', '--json']))
  }

  async auditPage(options: { after?: string; cursor?: string; limit?: number } = {}): Promise<AuditPage> {
    const args = ['audit']
    if (options.after) args.push('--after', options.after)
    if (options.cursor) args.push('--cursor', options.cursor)
    args.push('--limit', String(options.limit ?? 500), '--json')
    const payload = await this.json(args)
    const source = record(payload)
    return {
      records: arrayFrom(payload, ['records', 'items', 'activity', 'events', 'data']),
      nextCursor: string(source.nextCursor),
      schemaVersion: string(source.version) ?? string(source.schemaVersion) ?? 'unknown',
    }
  }

  async tasks(): Promise<unknown[]> {
    return arrayFrom(await this.json(['tasks', 'list', '--json']), ['tasks', 'items', 'data'])
  }

  async flows(): Promise<unknown[]> {
    return arrayFrom(await this.json(['tasks', 'flow', 'list', '--json']), ['flows', 'items', 'data'])
  }

  async taskAudit(): Promise<unknown[]> {
    return arrayFrom(await this.json(['tasks', 'audit', '--json']), ['findings', 'items', 'data'])
  }

  async sessions(): Promise<unknown[]> {
    return arrayFrom(
      await this.json(['sessions', '--all-agents', '--limit', '500', '--json']),
      ['sessions', 'items', 'data'],
    )
  }

  private async json(args: string[]): Promise<unknown> {
    return runJsonCommand(this.config.openclawBinary, args, {
      timeoutMs: 8_000,
      maxBufferBytes: 2_000_000,
      env: { ...process.env, NO_COLOR: '1' },
    })
  }
}
