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

The service must remain loopback-only. Remote access is provided separately by a tailnet-only Tailscale Serve route; do not enable Funnel for Vitruvian.

## Current boundary

- OpenClaw configuration and roster discovery are read-only.
- The SQLite schema is owned locally by Vitruvian.
- Tasks, chat, model changes, and other write operations remain outside Phase 1.
- Supabase is not the authority for the OpenClaw control plane.
