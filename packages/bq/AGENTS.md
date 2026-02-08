# packages/bq

## Purpose
BigQuery helper utilities and query guardrails (V1 scaffolding).

## What Lives Here / What Must Not
Lives here:
- Safe query builders and validation helpers
- BigQuery execution wrappers (ADC-based) as services mature

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
- Guardrails are intended to prevent unsafe SQL patterns (multi-statement, DDL/DML, comments).
- Default dataset is `accelerate_dev` (see `@accelerate-core/shared`).

## Security Notes (Secrets, Authz)
- BigQuery access is via ADC in Cloud Run (no secrets committed).
- API is responsible for authn/authz; this package assumes caller is authorized.

