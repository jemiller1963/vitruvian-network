# Phase 2 OpenClaw telemetry source map

This document records the supported read-only surfaces used by Phase 2. It contains no Leonardo identifiers, prompts, responses, transcripts, paths, credentials, or raw production output.

## Capability gate on Leonardo

Before a preview deployment, run the exact installed binary and preserve only sanitized schema fixtures:

1. `openclaw --version`
2. `openclaw audit --help`
3. `openclaw tasks --help`
4. `openclaw tasks flow --help`
5. `openclaw sessions --help`
6. `openclaw status --help`
7. bounded JSON reads for audit, task, flow, session, and status projections

The preview gate must compare observed shapes with the allowlisted mappings below. Unknown fields are ignored. A missing required identity, lifecycle status, or timestamp makes the affected collector unavailable; it does not create an inferred event.

## Sources

| Source | Required normalized fields | Optional fields | Excluded data |
|---|---|---|---|
| Audit activity | kind, status, event identity, execution/run identity, occurrence time | agent, parent agent, session, channel, model, action, start/end/duration | message content, raw IDs, tool arguments/results |
| Tasks | task/run identity, stored status, update time | terminal outcome, agent, parent, runtime kind, session, start/end/duration | task goal, result content, raw error |
| Task Flow | flow/owner identity, status, update time | agent, start/end/duration | flow payloads and goals |
| Sessions | agent, session key | updated time, model | key, paths, transcript content |
| Status | gateway state | version | credentials, paths, raw configuration |

## Sanitized fixtures

- `server/fixtures/openclaw/audit-page.json`
- `server/fixtures/openclaw/tasks.json`
- `server/fixtures/openclaw/sessions.json`

Fixture identifiers are synthetic. Tests verify that even those values are HMAC-pseudonymized before persistence.

## Authority rules

- Audit `agent_run` records decide turn lifecycle.
- Tool-action and message audit records are ignored for KPI counting.
- The task ledger alone decides durable task metrics.
- Session recency never makes an agent working.
- Configuration decides roster, configured model, and delegation policy only.
- Missing or rejected data is unavailable, never zero or idle.

## References

- https://docs.openclaw.ai/cli/audit
- https://docs.openclaw.ai/cli/tasks
- https://docs.openclaw.ai/cli/sessions
- https://docs.openclaw.ai/cli/status
