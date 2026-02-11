# packages/firestore

## Purpose
Firestore data access layer (DAL) and typed repository functions used by `apps/api` and `apps/worker`.

## What Lives Here / What Must Not
Lives here:
- Repository functions for Runs/Datasets/Connectors/Resources/Versions
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
- `packages/firestore/src/resources.ts`
- `packages/firestore/src/resourceVersions.ts`
- `packages/firestore/src/connectors.ts`
- `packages/firestore/src/leases.ts`

## Interfaces / Contracts
- Collections (V1):
  - `connectors/{connectorId}`
  - `runs/{runId}`
  - `runs/{runId}/logs/{logId}` (append-only run log entries)
  - `datasets/{datasetId}`
  - `dataset_versions/{datasetId}/versions/{versionId}` (versionId is `v000001`, `v000002`, ...)
  - `resources/{resourceId}` (`slug` is unique and can be used as an identifier)
  - `resource_versions/{resourceId}/versions/{versionId}` (resource versions are immutable snapshots)
  - `runLeases/{runId}` (lease lock; worker should use this)

Dataset versioning contract:
- `datasets/{datasetId}.nextVersionNumber` is incremented to reserve the next version.
- `datasets/{datasetId}.latestVersionId` points to the latest `dataset_versions/.../versions/{versionId}` doc.
- `resources/{resourceId}.nextVersionNumber` is incremented to reserve the next resource version.
- `resources/{resourceId}.currentVersionId` points to the active resource snapshot in `resource_versions/.../versions/{versionId}`.
- DAL lookup supports both document id and `slug` (`getResourceByIdentifier`) to keep legacy data accessible.
- Resource creation enforces slug uniqueness (doc id and indexed `slug` query check).

## Security Notes (Secrets, Authz)
- No secrets in repo. Cloud Run should use workload identity / ADC.
- Client-side Firestore access should remain locked down; API/Worker remain the enforcement point.
