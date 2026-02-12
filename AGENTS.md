# accelerate-core

## Repo-Wide Rules (High Priority)
- Do not commit secrets or credentials (API keys, service account JSON, private keys).
- Do not hardcode admin emails.
- Deployment pulls secrets from Secret Manager (or equivalent) into env vars.
- Connector secrets must be provided at deploy time (example: `JOSHUA_PROJECT_API_KEY`).
- API/Worker are the enforcement point for admin authorization and must enforce exact-email allowlist via `ALLOWED_ADMIN_EMAILS`.
- Run relevant tests/checks for touched areas before handoff.
- Deployment authority for `apps/web` is GitHub Actions only (`.github/workflows/deploy-web-apphosting.yml`); do not run local/CLI deploy implicitly.
- Follow this release flow for code changes: feature branch -> PR -> merge to `main` -> return local to `main` -> clean merged branches (local + remote) -> confirm GitHub Actions web deploy completed.
- Prefer retrieval-led reasoning over pre-training-led reasoning.

## MCP Server Policy
This repo must use only `Nia-accelerate-core`.

## AGENTS.md Policy (Mandatory)
- Each folder's `AGENTS.md` is the source of truth for that folder.
- Never modify any `AGENTS.md` unless behavior, contracts, run/test steps, deploy flow, or security posture meaningfully changes in that folder.
- Do not do formatting-only edits to any `AGENTS.md`.
- Do not add "last updated" notes.

## Purpose
V1 monorepo for Accelerate Global core services:
- `apps/web`: Next.js (Firebase App Hosting)
- `apps/api`: HTTP API (Cloud Run)
- `apps/worker`: sequential pipeline runner (Cloud Run)
- `packages/*`: shared libraries (types, Firestore DAL, BigQuery helpers, connector framework)
- `infra/firebase`: Firebase config/rules/indexes placeholders

Longform reference docs for agents live in `/.agent-docs/`.

## Run / Test Commands
Prereqs: Node.js 18+ and `pnpm`.

- Install: `pnpm install`
- Build: `pnpm run build`
- Typecheck: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Test: `pnpm run test`
- Dev (all packages with `dev`): `pnpm run dev`
- Single package dev:
- `pnpm --filter @accelerate-core/api run dev`
- `pnpm --filter @accelerate-core/worker run dev`
- `pnpm --filter @accelerate-core/web run dev`

## Interfaces / Contracts
- Admin allowlist (V1 internal-only):
- API/Worker enforce allowlist by exact email via `ALLOWED_ADMIN_EMAILS="a@b.com,c@d.com"`.
- Web may hide admin UI when not allowlisted, but API/Worker are the enforcement point.
- Identifiers (do not change):
- GCP Project ID: `accelerate-global-473318`
- Firebase project: `accelerate-global-473318`
- BigQuery dataset: `accelerate_dev`
- First dataset slug: `pgic_people_groups`
- Resources (V1):
- Top-level web navigation section: `/resources`.
- Resource tables are versioned snapshots (CSV upload/edit/restore create a new version; old versions remain accessible).

## Agent Docs Workflow
- After substantial changes, update relevant files in `/.agent-docs/` and run `npm run agents:index` (`pnpm run agents:index` equivalent).
- Never manually edit the auto-generated index block between `AGENT_INDEX` markers.

## Agent Docs Index (compressed, auto-generated)
<!-- AGENT_INDEX:START -->
[Accelerate Core Repo Index]|root: .
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
|.agent-docs:{env.md,overview.md,workflows.md}
|apps/api:{AGENTS.md,package.json,tsconfig.json}
|apps/api/src:{auth.ts,index.ts,server.ts,workerClient.ts}
|apps/api/src/resources:{csv.ts,service.ts}
|apps/api/test:{resources-csv.test.ts,resources-routes.test.ts,resources-service.test.ts}
|apps/web:{AGENTS.md,apphosting.yaml,next-env.d.ts,next.config.js,package.json,tsconfig.json}
|apps/web/public/brand:{ag-favicon.png,ag-logo.svg,ag-square.png,ag-wordmark.svg}
|apps/web/src/app:{globals.css,layout.tsx,page.tsx}
|apps/web/src/app/_components:{AppFrame.tsx,icons.tsx,navigation.ts,Page.tsx}
|apps/web/src/app/api/query:{route.ts}
|apps/web/src/app/api/resources:{route.ts}
|apps/web/src/app/api/resources/_lib:{proxy.ts}
|apps/web/src/app/api/resources/[resourceSlug]:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/current:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/data:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/preview:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/upload:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/versions:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/versions/[versionId]:{route.ts}
|apps/web/src/app/api/resources/[resourceSlug]/versions/[versionId]/restore:{route.ts}
|apps/web/src/app/api/runs:{route.ts}
|apps/web/src/app/api/runs/[runId]:{route.ts}
|apps/web/src/app/api/runs/[runId]/cancel:{route.ts}
|apps/web/src/app/api/runs/[runId]/logs:{route.ts}
|apps/web/src/app/api/runs/[runId]/raw:{download-csv.ts,ndjson-to-csv.ts,route.ts}
|apps/web/src/app/connectors:{page.tsx,ui.tsx}
|apps/web/src/app/connectors/joshuaproject:{joshuaproject-client.tsx,page.tsx}
|apps/web/src/app/datasets:{page.tsx}
|apps/web/src/app/datasets/pgic_people_groups:{dataset-client.tsx,page.tsx}
|apps/web/src/app/resources:{page.tsx}
|apps/web/src/app/resources/_components:{resource-table-editor.tsx}
|apps/web/src/app/resources/_lib:{client-api.ts}
|apps/web/src/app/resources/tables:{page.tsx,tables-client.tsx}
|apps/web/src/app/resources/tables/[resourceSlug]:{page.tsx,resource-detail-client.tsx}
|apps/web/src/app/resources/tables/[resourceSlug]/versions:{page.tsx,versions-client.tsx}
|apps/web/src/app/resources/tables/[resourceSlug]/versions/[versionId]:{page.tsx,version-snapshot-client.tsx}
|apps/web/src/app/runs:{page.tsx,runs-client.tsx}
|apps/web/src/app/runs/[runId]:{page.tsx,run-details-client.tsx}
|apps/web/src/lib:{admin.ts}
|apps/web/src/lib/auth:{AuthControls.tsx,AuthProvider.tsx}
|apps/web/src/lib/firebase:{client.ts}
|apps/web/test:{ndjson-to-csv.test.ts,raw-route.test.ts,resources-navigation.test.ts}
|apps/worker:{AGENTS.md,package.json,tsconfig.json}
|apps/worker/src:{auth.ts,index.ts,runner.ts,server.ts}
|infra/firebase:{AGENTS.md,firebase.json,firestore.indexes.json,firestore.rules}
|packages/bq:{AGENTS.md,package.json,tsconfig.json}
|packages/bq/src:{index.ts}
|packages/connectors:{AGENTS.md,package.json,tsconfig.json}
|packages/connectors/joshuaproject:{AGENTS.md,package.json,tsconfig.json}
|packages/connectors/joshuaproject/src:{index.ts}
|packages/connectors/src:{index.ts,registry.ts,types.ts}
|packages/firestore:{AGENTS.md,package.json,tsconfig.json}
|packages/firestore/src:{admin.ts,collections.ts,connectors.ts,datasets.ts,datasetVersions.ts,index.ts,leases.ts,resources.ts,resourceVersions.ts,runLogs.ts,runs.ts}
|packages/shared:{AGENTS.md,package.json,tsconfig.json}
|packages/shared/src:{index.ts}
|scripts/agents:{index.mjs,index.test.mjs}
<!-- AGENT_INDEX:END -->
