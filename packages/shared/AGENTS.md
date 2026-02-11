# packages/shared

## Purpose
Shared types, constants, and Zod schemas used across apps/services.

## What Lives Here / What Must Not
Lives here:
- TypeScript types and lightweight validation schemas
- Cross-service identifiers/constants

Must not live here:
- Service-specific runtime code (HTTP servers, database clients)
- Secrets or env var values

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/shared run build`
- Typecheck: `pnpm --filter @accelerate-core/shared run typecheck`
- Lint: `pnpm --filter @accelerate-core/shared run lint`

## Key Files
- `packages/shared/src/index.ts`
- `packages/shared/tsconfig.json`

## Interfaces / Contracts
- Exports are consumed as `@accelerate-core/shared`.
- Constants include project identifiers (GCP/Firebase/BigQuery) and stable `connectorId` / `datasetId` strings.
- Request contracts are defined with Zod (examples: `CreateRunRequestSchema`, `QueryRequestSchema`, `CreateResourceRequestSchema`).
- Resources contract includes:
  - `Resource` metadata (`slug`, `currentVersionId`, `nextVersionNumber`, audit fields)
  - `ResourceVersion` immutable snapshots (`source`, `columns`, `rowCount`, storage paths)
  - resource mutation schemas (`UploadResourceVersionRequestSchema`, `PatchResourceDataRequestSchema`, `PatchResourceCurrentVersionRequestSchema`)

## Security Notes (Secrets, Authz)
- Do not add any secret values here.
- Allowlist enforcement lives in API/Worker; web may only use public hints for UI.
