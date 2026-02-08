# apps/worker

## Purpose
Cloud Run worker service for V1. Executes connector runs **sequentially** and writes results/status to Firestore.

## What Lives Here / What Must Not
Lives here:
- Fastify server and job trigger route(s)
- Connector execution orchestration
- Lease/lock usage to ensure a run is processed by only one worker

Must not live here:
- Secrets committed to git
- Direct connector implementations (use `packages/connectors/*`)

## How To Run / Test
- Dev: `pnpm --filter @accelerate-core/worker run dev`
- Build: `pnpm --filter @accelerate-core/worker run build`
- Typecheck: `pnpm --filter @accelerate-core/worker run typecheck`
- Lint: `pnpm --filter @accelerate-core/worker run lint`

## Key Files
- `apps/worker/src/index.ts` (entrypoint)
- `apps/worker/src/server.ts` (Fastify setup + job route)
- `apps/worker/src/runner.ts` (sequential connector execution)

## Interfaces / Contracts
HTTP endpoints (stub in V1 scaffold):
- `POST /run/:runId` triggers connector execution for a run.

Sequential execution contract:
- Cloud Run deploy should set `concurrency=1` for this service.
- A Firestore lease lock (`runLeases/{runId}`) provides defense-in-depth to prevent multi-processing.

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets. Cloud Run should inject secrets via Secret Manager.
- Connector secrets (example): `JOSHUA_PROJECT_API_KEY` (set via Secret Manager at deploy).

Authz:
- Worker enforces admin allowlist using `ALLOWED_ADMIN_EMAILS` (exact email match).

