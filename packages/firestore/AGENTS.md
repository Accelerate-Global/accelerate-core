# packages/firestore

## Purpose
Firestore data access layer (DAL) and typed repository functions used by `apps/api` and `apps/worker`.

## What Lives Here / What Must Not
Lives here:
- Repository functions for Runs/Datasets/Connectors/Versions
- Lease/lock primitives (used for sequential worker execution)

Must not live here:
- HTTP servers / Cloud Run wiring
- Secrets (service account JSON, API keys). Uses ADC at runtime.

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/firestore run build`
- Typecheck: `pnpm --filter @accelerate-core/firestore run typecheck`
- Lint: `pnpm --filter @accelerate-core/firestore run lint`

## Key Files
- `packages/firestore/src/admin.ts` (Firebase Admin initialization via ADC)
- `packages/firestore/src/collections.ts` (collection/subcollection names)
- `packages/firestore/src/runs.ts`
- `packages/firestore/src/runLogs.ts`
- `packages/firestore/src/datasets.ts`
- `packages/firestore/src/datasetVersions.ts`
- `packages/firestore/src/connectors.ts`
- `packages/firestore/src/leases.ts`

## Interfaces / Contracts
- Collections (V1):
  - `connectors/{connectorId}`
  - `runs/{runId}`
  - `runs/{runId}/logs/{logId}` (append-only run log entries)
  - `datasets/{datasetId}`
  - `dataset_versions/{datasetId}/versions/{versionId}` (versionId is `v000001`, `v000002`, ...)
  - `runLeases/{runId}` (lease lock; worker should use this)

Dataset versioning contract:
- `datasets/{datasetId}.nextVersionNumber` is incremented to reserve the next version.
- `datasets/{datasetId}.latestVersionId` points to the latest `dataset_versions/.../versions/{versionId}` doc.

## Security Notes (Secrets, Authz)
- No secrets in repo. Cloud Run should use workload identity / ADC.
- Client-side Firestore access should remain locked down; API/Worker remain the enforcement point.
