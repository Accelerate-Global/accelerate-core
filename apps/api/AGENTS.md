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

Deploy (Cloud Run):
- This repo ships a single Cloud Run image (root `Dockerfile`) and selects the service via `SERVICE_MODE`.
- For the API service set `SERVICE_MODE=api`.

## Key Files
- `apps/api/src/index.ts` (entrypoint)
- `apps/api/src/server.ts` (Fastify setup + routes)
- `apps/api/src/auth.ts` (Firebase ID token verification + allowlist enforcement)
- `apps/api/src/workerClient.ts` (service-to-service kickoff to worker via Cloud Run IAM)

## Interfaces / Contracts
Authn:
- All non-health endpoints require `Authorization: Bearer <Firebase ID token>`.
- Dev-only escape hatch: if `NODE_ENV != "production"` and `DEV_AUTH_EMAIL` is set, token verification is skipped.

HTTP endpoints (V1):
- `GET /health` and `GET /healthz` (no auth)
- `POST /runs` (CreateRunRequest: `{ connectorId, datasetId }`) -> `{ id }`
- `GET /runs` -> `{ runs }` (recent runs for admin UI)
- `GET /runs/:id` -> `Run`
- `POST /query` (QueryRequest: `{ datasetId, versionId?, limit? }`) -> `{ rows }` (preview `LIMIT` 100 default)
- `POST /exports` -> `501` (stub)

Worker kickoff:
- `POST /runs` best-effort triggers worker via `WORKER_BASE_URL` using Cloud Run IAM.
- API sends `X-Accelerate-Actor-Email` for allowlist enforcement/auditing in worker.

Admin allowlist (V1 internal-only):
- Enforced server-side using `ALLOWED_ADMIN_EMAILS` (exact email match, comma-separated).

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets. Cloud Run should inject secrets via Secret Manager.
- Connector secrets (example) are consumed by the worker, not the API.

Authz:
- UI hiding is not sufficient. API must enforce admin allowlist on all privileged endpoints.
