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
- `packages/firestore/src/runs.ts`
- `packages/firestore/src/leases.ts`

## Interfaces / Contracts
- Collections (V1 placeholder):
  - `runs/{runId}`
  - `datasets/{datasetSlug}`
  - `connectors/{connectorKey}`
  - `datasetVersions/{versionId}`
  - `runLeases/{runId}` (lease lock; worker should use this)

## Security Notes (Secrets, Authz)
- No secrets in repo. Cloud Run should use workload identity / ADC.
- Client-side Firestore access should remain locked down; API/Worker remain the enforcement point.

