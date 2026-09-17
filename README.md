# Vitruvian Network

Vitruvian Network is a local-first operations dashboard for the OpenClaw installation on Leonardo.

## Development

```bash
npm ci
npm test
npm run lint
VITE_VITRUVIAN_FIXTURE_MODE=true npm run build
```

## Leonardo runtime

The production process binds only to `127.0.0.1`, serves the compiled React application and the read-only API from one origin, and stores operational state in SQLite.

```bash
npm ci
npm run build
npm run start:api
```

Runtime configuration is provided with the `VITRUVIAN_*` environment variables documented in `.env.example`. The checked-in systemd user-service template is `deploy/vitruvian-network.service`.

Phase 2 telemetry requires a Leonardo-local HMAC secret of at least 32 characters in
`VITRUVIAN_TELEMETRY_HMAC_SECRET`. It pseudonymizes OpenClaw correlation identifiers
before persistence and must not be exposed to the browser or committed.

The service must remain loopback-only. Remote access is provided separately by a tailnet-only Tailscale Serve route; do not enable Funnel for Vitruvian.

## Telemetry boundary

- OpenClaw configuration and roster discovery are read-only.
- OpenClaw audit, task, flow, session, and status surfaces are collected in the background.
- Browser requests read SQLite projections and never invoke the OpenClaw CLI.
- Prompts, responses, transcripts, task goals, raw correlation IDs, paths, and source payloads are not stored.
- Missing or stale evidence remains unavailable or unknown; it is not converted to zero or idle.
- The SQLite schema is owned locally by Vitruvian.
- Task mutation, chat, model changes, and other write operations remain outside Phase 2.
- Supabase is not the authority for the OpenClaw control plane.
