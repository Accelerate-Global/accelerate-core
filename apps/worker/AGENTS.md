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

Deploy (Cloud Run):
- This repo ships a single Cloud Run image (root `Dockerfile`) and selects the service via `SERVICE_MODE`.
- For the worker service set `SERVICE_MODE=worker`.
- V1 sequential execution: deploy with `concurrency=1` and `max-instances=1`.

## Key Files
- `apps/worker/src/index.ts` (entrypoint)
- `apps/worker/src/server.ts` (Fastify setup + job route)
- `apps/worker/src/runner.ts` (sequential connector execution)
- `apps/worker/src/auth.ts` (worker auth mode + allowlist enforcement)

## Interfaces / Contracts
Authn:
- Default: `WORKER_AUTH_MODE=iam`
  - Cloud Run IAM is expected to authenticate the caller.
  - Worker requires `X-Accelerate-Actor-Email` header for allowlist enforcement/auditing.
- Optional: `WORKER_AUTH_MODE=firebase`
  - Requires `Authorization: Bearer <Firebase ID token>`.
  - Dev-only escape hatch: if `NODE_ENV != "production"` and `DEV_AUTH_EMAIL` is set, token verification is skipped.

HTTP endpoints (V1):
- `POST /run/:runId` triggers connector execution for a run.

Sequential execution contract:
- Cloud Run deploy should set `concurrency=1` for this service.
- A Firestore lease lock (`runLeases/{runId}`) provides defense-in-depth to prevent multi-processing.

Cancel contract (best-effort):
- API can cancel a run by marking it `failed` with `error.code=canceled`.
- Worker checks for cancellation at safe points (every ~2000 rows, before/after BigQuery load) and stops early when detected.

Artifacts / outputs (V1):
- Raw NDJSON is written to: `gs://$ARTIFACTS_BUCKET/raw/{connectorId}/{runId}/{datasetId}.ndjson`
- BigQuery uses "table per version" naming: `{datasetId}__v000001`, `{datasetId}__v000002`, ...
- Control plane updates:
  - `runs/{runId}` status + timestamps + `outputs`
  - `runs/{runId}/logs/{logId}` append-only log stream (for in-UI progress)
  - `dataset_versions/{datasetId}/versions/{versionId}` and dataset `latestVersionId`

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets. Cloud Run should inject secrets via Secret Manager.
- Connector secrets (example): `JOSHUA_PROJECT_API_KEY` (set via Secret Manager at deploy).

Authz:
- Worker enforces admin allowlist using `ALLOWED_ADMIN_EMAILS` (exact email match).
