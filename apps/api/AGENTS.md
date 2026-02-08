# apps/api

## Purpose
Cloud Run HTTP API for V1. Owns authentication, authorization (admin allowlist), and orchestration endpoints (runs, query, exports).

## What Lives Here / What Must Not
Lives here:
- Fastify server and HTTP routes
- Authn/authz middleware and request context
- Integration with Firestore DAL (`@accelerate-core/firestore`) and BigQuery helpers (`@accelerate-core/bq`)

Must not live here:
- Secrets committed to git
- Connector-specific implementations (use `packages/connectors/*`)

## How To Run / Test
- Dev: `pnpm --filter @accelerate-core/api run dev`
- Build: `pnpm --filter @accelerate-core/api run build`
- Typecheck: `pnpm --filter @accelerate-core/api run typecheck`
- Lint: `pnpm --filter @accelerate-core/api run lint`

## Key Files
- `apps/api/src/index.ts` (entrypoint)
- `apps/api/src/server.ts` (Fastify setup + routes)
- `apps/api/src/auth.ts` (Firebase ID token verification placeholder + allowlist enforcement)

## Interfaces / Contracts
HTTP endpoints (stubs in V1 scaffold):
- `POST /runs`
- `GET /runs/:id`
- `POST /query`
- `POST /exports`

Admin allowlist (V1 internal-only):
- Enforced server-side using `ALLOWED_ADMIN_EMAILS` (exact email match, comma-separated).

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets. Cloud Run should inject secrets via Secret Manager.
- Connector secrets (example) are consumed by the worker, not the API.

Authz:
- UI hiding is not sufficient. API must enforce admin allowlist on all privileged endpoints.

