# packages/connectors/joshuaproject

## Purpose
Joshua Project connector placeholder (V1 scaffolding only). Exports metadata and a fetch stub used by the worker.

## What Lives Here / What Must Not
Lives here:
- Connector metadata (`key`, `displayName`)
- Stubbed fetch method for future integration

Must not live here:
- Secrets (Joshua Project API key)
- Real API calls that could leak secrets or create unstable behavior in V1 scaffold

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/connector-joshuaproject run build`
- Typecheck: `pnpm --filter @accelerate-core/connector-joshuaproject run typecheck`
- Lint: `pnpm --filter @accelerate-core/connector-joshuaproject run lint`

## Key Files
- `packages/connectors/joshuaproject/src/index.ts`

## Interfaces / Contracts
- Exports a `connector` that conforms to `@accelerate-core/connectors`.
- Reads `JOSHUA_PROJECT_API_KEY` from env at runtime (provided via Secret Manager).

## Security Notes (Secrets, Authz)
Secrets:
- `JOSHUA_PROJECT_API_KEY` must be set at deploy time (Secret Manager); do not commit it.

