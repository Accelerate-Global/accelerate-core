# packages/bq

## Purpose
BigQuery helper utilities and query guardrails for V1.

## What Lives Here / What Must Not
Lives here:
- Safe query builders and validation helpers
- BigQuery execution wrappers (ADC-based)

Must not live here:
- Hardcoded credentials or service account JSON
- Ad-hoc SQL string concatenation in callers (use guardrails)

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/bq run build`
- Typecheck: `pnpm --filter @accelerate-core/bq run typecheck`
- Lint: `pnpm --filter @accelerate-core/bq run lint`

## Key Files
- `packages/bq/src/index.ts`

## Interfaces / Contracts
- Exported helpers:
  - `previewRowsFromTable({ datasetId, tableId, limit })` (default `limit=100`)
  - `loadNdjsonFromGcsToTable({ datasetId, tableId, gcsUri })` (autodetect schema; replaces table)
- Defaults:
  - Dataset falls back to `BIGQUERY_DATASET` or `PROJECT_IDS.bigQueryDataset`.
  - Location falls back to `BIGQUERY_LOCATION` or `US`.

## Security Notes (Secrets, Authz)
- BigQuery access is via ADC in Cloud Run (no secrets committed).
- API is responsible for authn/authz; this package assumes caller is authorized.
