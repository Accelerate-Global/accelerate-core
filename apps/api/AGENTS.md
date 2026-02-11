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
- Test: `pnpm --filter @accelerate-core/api run test`

Deploy (Cloud Run):
- This repo ships a single Cloud Run image (root `Dockerfile`) and selects the service via `SERVICE_MODE`.
- For the API service set `SERVICE_MODE=api`.

## Key Files
- `apps/api/src/index.ts` (entrypoint)
- `apps/api/src/server.ts` (Fastify setup + routes)
- `apps/api/src/auth.ts` (Firebase ID token verification + allowlist enforcement)
- `apps/api/src/workerClient.ts` (service-to-service kickoff to worker via Cloud Run IAM)
- `apps/api/src/resources/service.ts` (resource CRUD/version orchestration)
- `apps/api/src/resources/csv.ts` (CSV validation + parse/serialize helpers)

## Interfaces / Contracts
Authn:
- All non-health endpoints require `Authorization: Bearer <Firebase ID token>`.
- Dev-only escape hatch: if `NODE_ENV != "production"` and `DEV_AUTH_EMAIL` is set, token verification is skipped.

HTTP endpoints (V1):
- `GET /health` and `GET /healthz` (no auth)
- `POST /runs` (CreateRunRequest: `{ connectorId, datasetId }`) -> `{ id }`
- `GET /runs` -> `{ runs }` (recent runs for admin UI)
- `GET /runs/:id` -> `Run`
- `GET /runs/:id/logs?afterTsMs&limit` -> `{ logs }` (run log stream; `RunLogEntry[]`)
- `POST /runs/:id/cancel` -> `{ ok: true }` (best-effort cancel: marks the run `failed` with `error.code=canceled`)
- `GET /runs/:id/raw` (streams the raw NDJSON artifact as a download if available)
- `POST /query` (QueryRequest: `{ datasetId, versionId?, limit? }`) -> `{ rows }` (preview `LIMIT` 100 default)
- `POST /exports` -> `501` (stub)
- `GET /resources` -> `{ resources }`
- `POST /resources` (CreateResourceRequest: `{ slug, name, description? }`) -> `{ resource }`
- `GET /resources/:resourceId` -> `{ resource, currentVersion, table }` (`resourceId` can be doc id or slug)
- `POST /resources/:resourceId/upload` (UploadResourceVersionRequest: `{ csvText, fileName? }`) -> `{ resource, version }`
- `GET /resources/:resourceId/preview?limit&offset&versionId` -> `{ resource, version, columns, rows, rowCount, limit, offset }`
- `GET /resources/:resourceId/versions` -> `{ resource, versions }`
- `GET /resources/:resourceId/versions/:versionId` -> `{ resource, version, table }`
- `POST /resources/:resourceId/versions/:versionId/restore` -> `{ resource, version }` (restore as new version)
- `PATCH /resources/:resourceId/current` (PatchResourceCurrentVersionRequest: `{ versionId }`) -> `{ resource }`
- `PATCH /resources/:resourceId/data` (PatchResourceDataRequest: `{ columns, rows, basedOnVersionId? }`) -> `{ resource, version }` (edits saved as new version)
- `POST /resources/:resourceId/versions` remains as an upload alias for backward compatibility

Resource upload/preview behavior:
- Upload validates CSV and enforces max upload size (`RESOURCE_CSV_MAX_BYTES`, default `5_000_000`).
- Preview reads canonical table JSON from GCS with in-memory TTL cache (`RESOURCE_TABLE_CACHE_*`) and supports `limit/offset` pagination.

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
