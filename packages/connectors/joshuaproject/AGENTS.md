# packages/connectors/joshuaproject

## Purpose
Joshua Project PGIC connector. Fetches people group records and exposes an async record stream for the worker to ingest.

## What Lives Here / What Must Not
Lives here:
- Connector metadata (`id`, `displayName`)
- Joshua Project API client + pagination
- `AsyncIterable` record stream intended for NDJSON ingestion

Must not live here:
- Secrets (Joshua Project API key)
- Firestore / BigQuery / GCS writes (worker owns persistence)

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/connector-joshuaproject run build`
- Typecheck: `pnpm --filter @accelerate-core/connector-joshuaproject run typecheck`
- Lint: `pnpm --filter @accelerate-core/connector-joshuaproject run lint`

## Key Files
- `packages/connectors/joshuaproject/src/index.ts`

## Interfaces / Contracts
- Exports a `connector` that conforms to `@accelerate-core/connectors`.
- Connector id: `joshuaproject_pgic`
- Intended dataset id: `pgic_people_groups`
- Env vars:
  - Required: `JOSHUA_PROJECT_API_KEY`
  - Optional: `JOSHUA_PROJECT_BASE_URL`, `JOSHUA_PROJECT_LIMIT`, `JOSHUA_PROJECT_MAX_PAGES`

## Security Notes (Secrets, Authz)
Secrets:
- `JOSHUA_PROJECT_API_KEY` must be set at deploy time (Secret Manager); do not commit it.
