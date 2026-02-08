# packages/connectors

## Purpose
Connector framework: interfaces, registry, and shared connector utilities used by `apps/worker` to execute data ingestion/export pipelines.

## What Lives Here / What Must Not
Lives here:
- Connector interface contracts (input/output shapes)
- Registry utilities (register/get/list connectors)
- Shared error/result types

Must not live here:
- Any connector-specific API keys or secrets
- Provider-specific connector implementations (those live in subpackages like `packages/connectors/joshuaproject`)

## How To Run / Test
- Build: `pnpm --filter @accelerate-core/connectors run build`
- Typecheck: `pnpm --filter @accelerate-core/connectors run typecheck`
- Lint: `pnpm --filter @accelerate-core/connectors run lint`

## Key Files
- `packages/connectors/src/index.ts`
- `packages/connectors/src/registry.ts`

## Interfaces / Contracts
- A connector is identified by a stable `key` string.
- Execution is modeled as an async `run()` function returning a structured result.
- Connectors must be pure with respect to secrets: they read secrets only from env vars at runtime.

## Security Notes (Secrets, Authz)
- Do not store secrets here.
- Connectors should assume API/Worker already authenticated+authorized the caller.

